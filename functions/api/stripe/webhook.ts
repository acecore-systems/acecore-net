import {
  getDb,
  hmacSha256Hex,
  jsonResponse,
  type PagesContext,
} from '../schools/_shared'

type StripeEvent = {
  id?: string
  type?: string
  created?: number
  data?: {
    object?: {
      id?: string
      customer?: string
      subscription?: string
      metadata?: Record<string, string>
    }
  }
}

const SIGNATURE_TOLERANCE_SECONDS = 300

export const onRequestPost = async ({
  request,
  env,
}: PagesContext): Promise<Response> => {
  const db = getDb(env)
  const webhookSecret = String(env.STRIPE_WEBHOOK_SECRET || '').trim()
  if (!db || !webhookSecret) {
    return jsonResponse(
      { ok: false, message: 'Webhook is not configured.' },
      503,
    )
  }

  const rawBody = await request.text()
  const signature = request.headers.get('Stripe-Signature') || ''
  const verified = await verifyStripeSignature(
    rawBody,
    signature,
    webhookSecret,
  )
  if (!verified) {
    return jsonResponse({ ok: false, message: 'Invalid signature.' }, 400)
  }

  const event = JSON.parse(rawBody) as StripeEvent
  if (!event.id || !event.type) {
    return jsonResponse({ ok: false, message: 'Invalid event.' }, 400)
  }

  const now = new Date().toISOString()
  const duplicate = await db
    .prepare('SELECT id FROM school_stripe_events WHERE id = ? LIMIT 1')
    .bind(event.id)
    .first<{ id: string }>()
  if (duplicate) return jsonResponse({ ok: true, duplicate: true })

  await db
    .prepare(
      `INSERT INTO school_stripe_events (id, type, created_at, processed_at)
       VALUES (?, ?, ?, ?)`,
    )
    .bind(
      event.id,
      event.type,
      event.created ? new Date(event.created * 1000).toISOString() : now,
      now,
    )
    .run()

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object
    const bookingId = session?.metadata?.booking_id
    if (bookingId) {
      await db
        .prepare(
          `UPDATE school_bookings
           SET status = 'active',
               stripe_checkout_session_id = COALESCE(?, stripe_checkout_session_id),
               stripe_customer_id = COALESCE(?, stripe_customer_id),
               stripe_subscription_id = COALESCE(?, stripe_subscription_id),
               updated_at = ?
           WHERE id = ?`,
        )
        .bind(
          session?.id || null,
          session?.customer || null,
          session?.subscription || null,
          now,
          bookingId,
        )
        .run()
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data?.object
    if (subscription?.id) {
      await db
        .prepare(
          `UPDATE school_bookings
           SET status = 'cancelled', updated_at = ?
           WHERE stripe_subscription_id = ?`,
        )
        .bind(now, subscription.id)
        .run()
    }
  }

  return jsonResponse({ ok: true })
}

async function verifyStripeSignature(
  rawBody: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const parts = Object.fromEntries(
    signature
      .split(',')
      .map((part) => part.split('='))
      .filter((part) => part.length === 2),
  )
  const timestamp = Number(parts.t)
  const expected = parts.v1
  if (!timestamp || !expected) return false

  const drift = Math.abs(Date.now() / 1000 - timestamp)
  if (drift > SIGNATURE_TOLERANCE_SECONDS) return false

  const actual = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`)
  return timingSafeEqual(actual, expected)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}
