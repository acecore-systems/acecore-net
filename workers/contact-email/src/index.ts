import {
  buildContactAcknowledgementEmail,
  buildContactEmail,
  readLimitedJson,
  validatePayload,
  type EmailApiMessage,
} from '../../../shared/contact.ts'

function reply(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  })
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

async function sendEmail(
  env: ContactEmailConfig,
  email: EmailApiMessage,
): Promise<{ id: string }> {
  const address = (value: string | { address: string; name?: string }) =>
    typeof value === 'string'
      ? value
      : value.name
        ? { email: value.address, name: value.name }
        : value.address
  const sent = await env.EMAIL.send({
    to: Array.isArray(email.to) ? email.to.map(address) : address(email.to),
    from: address(email.from),
    subject: email.subject,
    text: email.text,
    replyTo: email.reply_to ? address(email.reply_to) : undefined,
    headers: email.headers,
  })
  return { id: sent.messageId }
}

export default {
  async fetch(request: Request, env: ContactEmailConfig): Promise<Response> {
    // This service has no route, workers.dev endpoint, or public preview URL.
    // Only the configured Pages Service Binding can invoke the delivery contract.
    if (new URL(request.url).pathname !== '/deliver')
      return reply({ ok: false }, 404)
    if (request.method !== 'POST') return reply({ ok: false }, 405)
    if (
      !(request.headers.get('Content-Type') || '').includes('application/json')
    ) {
      return reply({ ok: false }, 415)
    }
    let body: Record<string, unknown> | null
    try {
      body = record(await readLimitedJson(request, 64 * 1024))
    } catch {
      return reply({ ok: false }, 400)
    }
    const contact = record(body?.contact)
    if (!body || !contact) return reply({ ok: false }, 400)
    // Pages verifies Turnstile before invoking this internal service. Revalidate
    // the contact fields here; never accept arbitrary sender/recipient/messages.
    const validation = validatePayload({
      locale: contact.locale,
      category: contact.category,
      name: contact.name,
      email: contact.email,
      subject: contact.subject,
      message: contact.message,
      turnstileToken: 'verified-by-pages',
    })
    if (
      !validation.ok ||
      typeof body.submittedAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(body.submittedAt) ||
      !Number.isFinite(Date.parse(body.submittedAt)) ||
      typeof body.referer !== 'string' ||
      body.referer.length > 300 ||
      typeof body.userAgent !== 'string' ||
      body.userAgent.length > 300
    ) {
      return reply({ ok: false }, 400)
    }
    try {
      const source = new Request('https://contact-email.internal/', {
        headers: { Referer: body.referer, 'User-Agent': body.userAgent },
      })
      const result = await sendEmail(
        env,
        buildContactEmail(source, env, validation, body.submittedAt),
      )
      await sendEmail(
        env,
        buildContactAcknowledgementEmail(env, validation, body.submittedAt),
      )
      return reply({ success: true, result }, 201)
    } catch (error) {
      // A first delivery may have succeeded. Never automatically repeat it or
      // expose provider errors, contact content, addresses, or credentials.
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String(error.code)
          : ''
      const status = [
        'E_RATE_LIMIT_EXCEEDED',
        'E_DAILY_LIMIT_EXCEEDED',
      ].includes(code)
        ? 429
        : [
              'E_SENDER_NOT_VERIFIED',
              'E_SENDER_DOMAIN_NOT_AVAILABLE',
              'E_RECIPIENT_NOT_ALLOWED',
            ].includes(code)
          ? 503
          : 500
      return reply({ ok: false }, status)
    }
  },
} satisfies ExportedHandler<ContactEmailConfig>
