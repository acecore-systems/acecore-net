type EmailAddress = string | { email: string; name?: string }

type EmailMessage = {
  to: EmailAddress | EmailAddress[]
  from: EmailAddress
  bcc?: EmailAddress | EmailAddress[]
  replyTo?: EmailAddress
  subject: string
  text: string
  html: string
  headers?: Record<string, string>
}

type SendEmailBinding = {
  send(message: EmailMessage): Promise<{ messageId?: string }>
}

type Env = {
  SEND_EMAIL?: SendEmailBinding
  TURNSTILE_SECRET_KEY?: string
  CONTACT_TO_EMAIL?: string
  CONTACT_FROM_EMAIL?: string
  CONTACT_BCC_EMAIL?: string
  CONTACT_SEND_CONFIRMATION?: string
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_EMAIL_API_TOKEN?: string
}

type PagesContext = {
  request: Request
  env: Env
}

type ContactForm = {
  category: string
  name: string
  email: string
  subject: string
  message: string
  token: string
  locale: string
  redirectTo: string
  successRedirectTo: string
  errorRedirectTo: string
}

type TurnstileResult = {
  success: boolean
  'error-codes'?: string[]
  hostname?: string
}

const SITEVERIFY_ENDPOINT =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const DEFAULT_TO_EMAIL = 'info@acecore.net'
const DEFAULT_FROM_EMAIL = 'info@acecore.net'
const MAX_MESSAGE_LENGTH = 4000

export const onRequestPost = async ({
  request,
  env,
}: PagesContext): Promise<Response> => {
  if (!isAllowedRequestOrigin(request)) {
    return contactResponse(
      request,
      '/contact/',
      false,
      403,
      'Invalid request origin.',
    )
  }

  let form: ContactForm

  try {
    form = await parseContactForm(request)
  } catch (error) {
    return contactResponse(request, '/contact/', false, 400, String(error))
  }

  const validationError = validateContactForm(form)
  if (validationError) {
    return contactResponse(
      request,
      form.errorRedirectTo,
      false,
      400,
      validationError,
    )
  }

  if (!env.TURNSTILE_SECRET_KEY) {
    return contactResponse(
      request,
      form.errorRedirectTo,
      false,
      500,
      'TURNSTILE_SECRET_KEY is not configured.',
    )
  }

  const turnstile = await validateTurnstile(
    env.TURNSTILE_SECRET_KEY,
    form.token,
    getClientIp(request),
  )

  if (!turnstile.success) {
    return contactResponse(
      request,
      form.errorRedirectTo,
      false,
      400,
      'Turnstile verification failed.',
    )
  }

  try {
    await sendContactEmails(env, form)
  } catch (error) {
    console.error('Contact email sending failed:', error)
    return contactResponse(
      request,
      form.errorRedirectTo,
      false,
      500,
      'Email sending failed.',
    )
  }

  return contactResponse(request, form.successRedirectTo, true, 200, 'sent')
}

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://acecore.net',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept',
    },
  })

function getField(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

async function parseContactForm(request: Request): Promise<ContactForm> {
  const formData = await request.formData()
  return {
    category: getField(formData, 'お問い合わせ種別').slice(0, 80),
    name: getField(formData, 'お名前').slice(0, 120),
    email: getField(formData, 'メールアドレス').slice(0, 254),
    subject: getField(formData, '件名').slice(0, 160),
    message: getField(formData, 'お問い合わせ内容').slice(
      0,
      MAX_MESSAGE_LENGTH,
    ),
    token: getField(formData, 'cf-turnstile-response').slice(0, 2048),
    locale: getField(formData, 'locale').slice(0, 16),
    redirectTo: normalizeRedirect(getField(formData, '_redirect'), request.url),
    successRedirectTo: normalizeRedirect(
      getField(formData, '_success_redirect') ||
        getField(formData, '_redirect'),
      request.url,
    ),
    errorRedirectTo: normalizeRedirect(
      getField(formData, '_error_redirect') || getField(formData, '_redirect'),
      request.url,
    ),
  }
}

function validateContactForm(form: ContactForm): string {
  if (!form.category) return 'Category is required.'
  if (!form.name) return 'Name is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    return 'Valid email is required.'
  }
  if (!form.message) return 'Message is required.'
  if (!form.token) return 'Turnstile token is required.'
  return ''
}

async function validateTurnstile(
  secret: string,
  token: string,
  remoteip: string,
): Promise<TurnstileResult> {
  try {
    const response = await fetch(SITEVERIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip,
      }),
    })
    return (await response.json()) as TurnstileResult
  } catch (error) {
    console.error('Turnstile validation failed:', error)
    return { success: false, 'error-codes': ['internal-error'] }
  }
}

async function sendContactEmails(env: Env, form: ContactForm): Promise<void> {
  const toEmail = env.CONTACT_TO_EMAIL || DEFAULT_TO_EMAIL
  const fromEmail = env.CONTACT_FROM_EMAIL || DEFAULT_FROM_EMAIL
  const notification = buildNotificationEmail(
    form,
    toEmail,
    fromEmail,
    env.CONTACT_BCC_EMAIL,
  )
  const messages = [notification]

  if (env.CONTACT_SEND_CONFIRMATION !== 'false') {
    messages.push(buildConfirmationEmail(form, fromEmail, toEmail))
  }

  await Promise.all(messages.map((message) => sendEmail(env, message)))
}

async function sendEmail(env: Env, message: EmailMessage): Promise<void> {
  if (env.SEND_EMAIL?.send) {
    await env.SEND_EMAIL.send(message)
    return
  }

  if (env.CLOUDFLARE_ACCOUNT_ID && env.CLOUDFLARE_EMAIL_API_TOKEN) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/email/sending/send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.CLOUDFLARE_EMAIL_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      },
    )

    if (!response.ok) {
      throw new Error(`Cloudflare Email Sending returned ${response.status}`)
    }
    return
  }

  throw new Error('SEND_EMAIL binding is not configured.')
}

function buildNotificationEmail(
  form: ContactForm,
  toEmail: string,
  fromEmail: string,
  bccEmail: string | undefined,
): EmailMessage {
  const subject = form.subject
    ? `【Acecoreお問い合わせ】${form.subject}`
    : `【Acecoreお問い合わせ】${form.category}`
  const rows = [
    ['お問い合わせ種別', form.category],
    ['お名前', form.name],
    ['メールアドレス', form.email],
    ['件名', form.subject || '(未入力)'],
    ['ロケール', form.locale || 'ja'],
    ['お問い合わせ内容', form.message],
  ]

  const email: EmailMessage = {
    to: toEmail,
    from: { email: fromEmail, name: 'Acecore Contact' },
    replyTo: { email: form.email, name: form.name },
    subject,
    text: rows.map(([label, value]) => `${label}: ${value}`).join('\n\n'),
    html: `<h1>Acecore お問い合わせ</h1>${rows
      .map(
        ([label, value]) =>
          `<p><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value).replaceAll('\n', '<br>')}</p>`,
      )
      .join('')}`,
  }

  if (bccEmail) {
    email.bcc = bccEmail
  }

  return email
}

function buildConfirmationEmail(
  form: ContactForm,
  fromEmail: string,
  replyToEmail: string,
): EmailMessage {
  const text = `${form.name} 様

Acecoreへお問い合わせいただきありがとうございます。
内容を確認し、通常1〜2営業日以内に担当者よりご返信いたします。

お問い合わせ種別: ${form.category}
件名: ${form.subject || '(未入力)'}

お問い合わせ内容:
${form.message}

--
Acecore
https://acecore.net/`

  return {
    to: { email: form.email, name: form.name },
    from: { email: fromEmail, name: 'Acecore' },
    replyTo: replyToEmail,
    subject: 'お問い合わせを受け付けました | Acecore',
    text,
    html: escapeHtml(text).replaceAll('\n', '<br>'),
  }
}

function contactResponse(
  request: Request,
  redirectTo: string,
  ok: boolean,
  status: number,
  message: string,
): Response {
  if (expectsJson(request)) {
    return Response.json({ ok, message }, { status })
  }

  const url = new URL(redirectTo, request.url)
  url.searchParams.set('contact', ok ? 'sent' : 'error')
  return Response.redirect(url.toString(), 303)
}

function expectsJson(request: Request): boolean {
  return request.headers.get('Accept')?.includes('application/json') === true
}

function isAllowedRequestOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin')
  if (!origin) return true

  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

function normalizeRedirect(value: string, requestUrl: string): string {
  try {
    const url = new URL(value || '/contact/', requestUrl)
    return url.origin === new URL(requestUrl).origin
      ? url.pathname
      : '/contact/'
  } catch {
    return '/contact/'
  }
}

function getClientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    ''
  )
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
