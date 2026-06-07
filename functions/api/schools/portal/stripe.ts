import {
  getDb,
  getPortalSession,
  getSiteUrl,
  isAllowedRequestOrigin,
  jsonResponse,
  optionsResponse,
  type PagesContext,
} from '../_shared'

type PortalResponse = {
  url?: string
  error?: { message?: string }
}

export const onRequestPost = async ({
  request,
  env,
}: PagesContext): Promise<Response> => {
  if (!isAllowedRequestOrigin(request, env)) {
    return jsonResponse({ ok: false, message: 'Invalid request origin.' }, 403)
  }

  const db = getDb(env)
  const secretKey = String(env.STRIPE_SECRET_KEY || '').trim()
  if (!db || !secretKey) {
    return jsonResponse(
      { ok: false, message: '請求ポータルを利用できません。' },
      503,
    )
  }

  const session = await getPortalSession(db, request)
  if (!session) {
    return jsonResponse({ ok: false, message: 'ログインしてください。' }, 401)
  }

  const account = await db
    .prepare(
      `SELECT stripe_customer_id
       FROM school_guardian_accounts
       WHERE id = ?`,
    )
    .bind(session.guardianId)
    .first<{ stripe_customer_id: string | null }>()

  if (!account?.stripe_customer_id) {
    return jsonResponse(
      { ok: false, message: 'Stripe顧客情報がありません。' },
      404,
    )
  }

  const body = new URLSearchParams()
  body.set('customer', account.stripe_customer_id)
  body.set(
    'return_url',
    String(env.STRIPE_CUSTOMER_PORTAL_RETURN_URL || '') ||
      `${getSiteUrl(request, env)}/schools/portal/`,
  )

  const response = await fetch(
    'https://api.stripe.com/v1/billing_portal/sessions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2026-02-25.clover',
      },
      body,
    },
  )
  const result = (await response.json()) as PortalResponse
  if (!response.ok || !result.url) {
    return jsonResponse(
      {
        ok: false,
        message: result.error?.message || 'Stripeポータルを開けません。',
      },
      502,
    )
  }

  return jsonResponse({ ok: true, url: result.url })
}

export const onRequestOptions = ({ request, env }: PagesContext): Response =>
  optionsResponse(request, env)
