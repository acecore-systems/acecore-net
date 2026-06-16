type EmailAddress = {
  address: string
  name?: string
}

type EmailApiMessage = {
  to: string | EmailAddress | (string | EmailAddress)[]
  from: string | EmailAddress
  subject: string
  text?: string
  html?: string
  reply_to?: string | EmailAddress
  headers?: Record<string, string>
}

type EmailApiResponse = {
  success?: boolean
  errors?: Array<{
    code?: number
    message?: string
  }>
  result?: {
    delivered?: string[]
    permanent_bounces?: string[]
    queued?: string[]
  } | null
}

type Env = {
  CLOUDFLARE_ACCOUNT_ID?: string
  CLOUDFLARE_EMAIL_API_TOKEN?: string
  CONTACT_FROM_EMAIL?: string
  CONTACT_TO_EMAIL?: string
  CONTACT_ALLOWED_HOSTNAMES?: string
  TURNSTILE_SECRET_KEY?: string
}

type PagesContext = {
  request: Request
  env: Env
}

type ContactPayload = {
  locale?: unknown
  category?: unknown
  name?: unknown
  email?: unknown
  subject?: unknown
  message?: unknown
  turnstileToken?: unknown
  companyWebsite?: unknown
}

type TurnstileResponse = {
  success?: boolean
  hostname?: string
  'error-codes'?: string[]
}

type ApiMessageKey =
  | 'unavailable'
  | 'invalid'
  | 'rateLimited'
  | 'turnstile'
  | 'failed'

const SUPPORTED_LOCALES = [
  'ja',
  'en',
  'zh-cn',
  'es',
  'pt',
  'fr',
  'ko',
  'de',
  'ru',
] as const

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

const API_MESSAGES: Record<SupportedLocale, Record<ApiMessageKey, string>> = {
  ja: {
    unavailable: 'お問い合わせフォームを一時的に利用できません。',
    invalid: '入力内容を確認してください。',
    rateLimited:
      '短時間に送信できる回数を超えました。少し待ってからお試しください。',
    turnstile: '送信前の確認に失敗しました。もう一度お試しください。',
    failed: 'お問い合わせを送信できませんでした。',
  },
  en: {
    unavailable: 'The contact form is temporarily unavailable.',
    invalid: 'Please check the entered details.',
    rateLimited: 'Too many submissions. Please wait and try again.',
    turnstile: 'Verification failed. Please try again.',
    failed: 'Could not send the contact request.',
  },
  'zh-cn': {
    unavailable: '咨询表单暂时无法使用。',
    invalid: '请检查输入内容。',
    rateLimited: '提交次数过多。请稍后再试。',
    turnstile: '验证失败。请重试。',
    failed: '无法发送咨询内容。',
  },
  es: {
    unavailable: 'El formulario de contacto no está disponible temporalmente.',
    invalid: 'Revisa los datos ingresados.',
    rateLimited: 'Demasiados envíos. Espera e inténtalo de nuevo.',
    turnstile: 'La verificación falló. Inténtalo de nuevo.',
    failed: 'No se pudo enviar la consulta.',
  },
  pt: {
    unavailable: 'O formulário de contato está temporariamente indisponível.',
    invalid: 'Verifique os dados inseridos.',
    rateLimited: 'Muitos envios. Aguarde e tente novamente.',
    turnstile: 'A verificação falhou. Tente novamente.',
    failed: 'Não foi possível enviar a mensagem.',
  },
  fr: {
    unavailable: 'Le formulaire de contact est temporairement indisponible.',
    invalid: 'Veuillez vérifier les informations saisies.',
    rateLimited: 'Trop d’envois. Veuillez patienter puis réessayer.',
    turnstile: 'La vérification a échoué. Veuillez réessayer.',
    failed: "Impossible d'envoyer la demande.",
  },
  ko: {
    unavailable: '문의 양식을 일시적으로 사용할 수 없습니다.',
    invalid: '입력 내용을 확인해 주세요.',
    rateLimited: '너무 많이 전송했습니다. 잠시 후 다시 시도해 주세요.',
    turnstile: '확인에 실패했습니다. 다시 시도해 주세요.',
    failed: '문의를 전송할 수 없습니다.',
  },
  de: {
    unavailable: 'Das Kontaktformular ist vorübergehend nicht verfügbar.',
    invalid: 'Bitte prüfen Sie die eingegebenen Daten.',
    rateLimited: 'Zu viele Einsendungen. Bitte warten Sie kurz.',
    turnstile:
      'Die Überprüfung ist fehlgeschlagen. Bitte versuchen Sie es erneut.',
    failed: 'Die Anfrage konnte nicht gesendet werden.',
  },
  ru: {
    unavailable: 'Форма обратной связи временно недоступна.',
    invalid: 'Проверьте введенные данные.',
    rateLimited: 'Слишком много отправок. Попробуйте позже.',
    turnstile: 'Проверка не пройдена. Попробуйте еще раз.',
    failed: 'Не удалось отправить запрос.',
  },
}

const SITEVERIFY_ENDPOINT =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const EMAIL_API_BASE = 'https://api.cloudflare.com/client/v4'
const DEFAULT_FROM_EMAIL = 'noreply@acecore.net'
const DEFAULT_TO_EMAIL = 'info@acecore.net'
const MAX_CATEGORY_LENGTH = 80
const MAX_NAME_LENGTH = 80
const MAX_EMAIL_LENGTH = 254
const MAX_SUBJECT_LENGTH = 160
const MAX_MESSAGE_LENGTH = 4000
const MAX_REQUEST_BODY_BYTES = 64 * 1024
const MIN_MESSAGE_MEANINGFUL_LENGTH = 10
const POST_RATE_WINDOW_MS = 15 * 60 * 1000
const POST_RATE_MAX_REQUESTS = 4
const RATE_LIMIT_MAX_BUCKETS = 3000
const DEFAULT_ALLOWED_HOSTNAMES = [
  'acecore.net',
  'www.acecore.net',
  'acecore-net.pages.dev',
  'localhost',
  '127.0.0.1',
]

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const HTML_TAG_PATTERN = /<[^>]{2,}>/
const REPEATED_CHARACTER_PATTERN = /(.)\1{20,}/u
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()

export const onRequestPost = async ({
  request,
  env,
}: PagesContext): Promise<Response> => {
  if (!isAllowedRequestOrigin(request, env)) {
    return errorResponse(request, 'ja', 'invalid', 403)
  }

  if (isRequestBodyTooLarge(request)) {
    return errorResponse(request, 'ja', 'invalid', 413)
  }

  const payload = await readContactPayload(request)
  const locale = normalizeLocale(payload?.locale)

  if (
    !env.CLOUDFLARE_ACCOUNT_ID ||
    !env.CLOUDFLARE_EMAIL_API_TOKEN ||
    !env.TURNSTILE_SECRET_KEY
  ) {
    return errorResponse(request, locale, 'unavailable', 503)
  }

  const validation = validatePayload(payload)

  if (!validation.ok) {
    return errorResponse(request, locale, validation.messageKey, 400)
  }

  const rateLimit = checkMemoryRateLimit(
    getClientFingerprint(request),
    POST_RATE_MAX_REQUESTS,
    POST_RATE_WINDOW_MS,
  )

  if (!rateLimit.allowed) {
    return errorResponse(request, validation.locale, 'rateLimited', 429, {
      'Retry-After': String(rateLimit.retryAfterSeconds || 60),
    })
  }

  const turnstileValid = await verifyTurnstile(
    env,
    validation.turnstileToken,
    getClientIp(request),
  )

  if (!turnstileValid) {
    return errorResponse(request, validation.locale, 'turnstile', 403)
  }

  try {
    const email = buildContactEmail(request, env, validation)
    const result = await sendContactEmail(env, email)

    if (wantsHtmlRedirect(request)) {
      return Response.redirect(
        new URL(
          localizedPath('/contact/thanks/', validation.locale),
          request.url,
        ).toString(),
        303,
      )
    }

    return jsonResponse(
      {
        ok: true,
        result: result.result || null,
      },
      201,
    )
  } catch (error) {
    console.error('Failed to send contact email:', getEmailErrorLog(error))
    const status = getEmailErrorStatus(error)
    return errorResponse(request, validation.locale, 'failed', status)
  }
}

export const onRequestOptions = ({ request, env }: PagesContext): Response =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': getCorsOrigin(request, env),
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept, Content-Type',
    },
  })

async function readContactPayload(
  request: Request,
): Promise<ContactPayload | null> {
  const contentType = request.headers.get('Content-Type') || ''

  if (contentType.includes('application/json')) {
    const body = (await request.json().catch(() => null)) as Record<
      string,
      unknown
    > | null
    if (!body || typeof body !== 'object') return null
    return {
      locale: body.locale,
      category: body.category,
      name: body.name,
      email: body.email,
      subject: body.subject,
      message: body.message,
      turnstileToken:
        body.turnstileToken || body['cf-turnstile-response'] || '',
      companyWebsite: body.companyWebsite || body.company_website || '',
    }
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) return null

  return {
    locale: formData.get('locale'),
    category: formData.get('お問い合わせ種別'),
    name: formData.get('お名前'),
    email: formData.get('メールアドレス'),
    subject: formData.get('件名'),
    message: formData.get('お問い合わせ内容'),
    turnstileToken: formData.get('cf-turnstile-response'),
    companyWebsite: formData.get('company_website'),
  }
}

function validatePayload(payload: ContactPayload | null):
  | {
      ok: true
      locale: SupportedLocale
      category: string
      name: string
      email: string
      subject: string
      message: string
      turnstileToken: string
    }
  | { ok: false; messageKey: ApiMessageKey } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, messageKey: 'invalid' }
  }

  if (normalizeSingleLine(payload.companyWebsite, 200)) {
    return { ok: false, messageKey: 'invalid' }
  }

  const locale = normalizeLocale(payload.locale)
  const category = normalizeSingleLine(payload.category, MAX_CATEGORY_LENGTH)
  const name = normalizeSingleLine(payload.name, MAX_NAME_LENGTH)
  const email = normalizeEmail(payload.email)
  const subject = normalizeSingleLine(payload.subject, MAX_SUBJECT_LENGTH)
  const message = normalizeMessage(payload.message)
  const turnstileToken = String(payload.turnstileToken || '').trim()

  if (!category || !name || !email || !message || !turnstileToken) {
    return { ok: false, messageKey: 'invalid' }
  }

  if (
    category.length > MAX_CATEGORY_LENGTH ||
    name.length > MAX_NAME_LENGTH ||
    email.length > MAX_EMAIL_LENGTH ||
    subject.length > MAX_SUBJECT_LENGTH ||
    message.length > MAX_MESSAGE_LENGTH ||
    turnstileToken.length > 2048
  ) {
    return { ok: false, messageKey: 'invalid' }
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, messageKey: 'invalid' }
  }

  if (countMeaningfulCharacters(message) < MIN_MESSAGE_MEANINGFUL_LENGTH) {
    return { ok: false, messageKey: 'invalid' }
  }

  if (isBlockedText(`${category}\n${name}\n${subject}\n${message}`)) {
    return { ok: false, messageKey: 'invalid' }
  }

  return {
    ok: true,
    locale,
    category,
    name,
    email,
    subject,
    message,
    turnstileToken,
  }
}

function buildContactEmail(
  request: Request,
  env: Env,
  contact: {
    locale: SupportedLocale
    category: string
    name: string
    email: string
    subject: string
    message: string
  },
): EmailApiMessage {
  const fromEmail = getConfigEmail(env.CONTACT_FROM_EMAIL, DEFAULT_FROM_EMAIL)
  const toEmail = getConfigEmail(env.CONTACT_TO_EMAIL, DEFAULT_TO_EMAIL)
  const submittedAt = new Date().toISOString()
  const referer = normalizeSingleLine(request.headers.get('Referer'), 300)
  const userAgent = normalizeSingleLine(request.headers.get('User-Agent'), 300)
  const subjectSource = contact.subject || contact.category
  const subject = normalizeSingleLine(
    `Acecore お問い合わせ: ${subjectSource}`,
    200,
  )
  const text = [
    'Acecore公式サイトからお問い合わせが届きました。',
    '',
    `お問い合わせ種別: ${contact.category}`,
    `お名前: ${contact.name}`,
    `メールアドレス: ${contact.email}`,
    `件名: ${contact.subject || '未入力'}`,
    `言語: ${contact.locale}`,
    `送信日時: ${submittedAt}`,
    referer ? `送信元ページ: ${referer}` : '',
    userAgent ? `User-Agent: ${userAgent}` : '',
    '',
    'お問い合わせ内容:',
    contact.message,
  ]
    .filter((line) => line !== '')
    .join('\n')

  const htmlRows = [
    ['お問い合わせ種別', contact.category],
    ['お名前', contact.name],
    ['メールアドレス', contact.email],
    ['件名', contact.subject || '未入力'],
    ['言語', contact.locale],
    ['送信日時', submittedAt],
    referer ? ['送信元ページ', referer] : null,
    userAgent ? ['User-Agent', userAgent] : null,
  ].filter((row): row is [string, string] => Boolean(row))

  const html = `<!doctype html>
<html lang="ja">
  <body style="font-family: sans-serif; line-height: 1.7; color: #0f172a;">
    <h1 style="font-size: 18px;">Acecore公式サイトからお問い合わせが届きました。</h1>
    <table style="border-collapse: collapse; width: 100%; max-width: 720px;">
      <tbody>
        ${htmlRows
          .map(
            ([label, value]) => `<tr>
          <th style="width: 160px; border: 1px solid #cbd5e1; background: #f8fafc; padding: 8px; text-align: left;">${escapeHtml(label)}</th>
          <td style="border: 1px solid #cbd5e1; padding: 8px;">${escapeHtml(value)}</td>
        </tr>`,
          )
          .join('\n')}
      </tbody>
    </table>
    <h2 style="font-size: 16px; margin-top: 24px;">お問い合わせ内容</h2>
    <pre style="white-space: pre-wrap; background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px;">${escapeHtml(contact.message)}</pre>
  </body>
</html>`

  return {
    to: toEmail,
    from: {
      address: fromEmail,
      name: 'Acecore Contact',
    },
    reply_to: contact.email,
    subject,
    text,
    html,
    headers: {
      'X-Acecore-Contact-Locale': contact.locale,
    },
  }
}

async function sendContactEmail(
  env: Env,
  email: EmailApiMessage,
): Promise<EmailApiResponse> {
  const accountId = String(env.CLOUDFLARE_ACCOUNT_ID || '').trim()
  const token = String(env.CLOUDFLARE_EMAIL_API_TOKEN || '').trim()
  const response = await fetch(
    `${EMAIL_API_BASE}/accounts/${encodeURIComponent(accountId)}/email/sending/send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(email),
    },
  )
  const result = (await response
    .json()
    .catch(() => null)) as EmailApiResponse | null

  if (!response.ok || !result?.success) {
    const error = new Error(
      'Cloudflare Email Service request failed',
    ) as Error & {
      status?: number
      apiErrors?: EmailApiResponse['errors']
    }
    error.status = response.status
    error.apiErrors = result?.errors
    throw error
  }

  return result
}

async function verifyTurnstile(
  env: Env,
  token: string,
  remoteIp: string | null,
): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return false

  const formData = new FormData()
  formData.append('secret', env.TURNSTILE_SECRET_KEY)
  formData.append('response', token)
  if (remoteIp) formData.append('remoteip', remoteIp)

  try {
    const response = await fetch(SITEVERIFY_ENDPOINT, {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) return false

    const result = (await response.json()) as TurnstileResponse
    return Boolean(
      result.success &&
      (!result.hostname || isAllowedVerifiedHostname(result.hostname, env)),
    )
  } catch (error) {
    console.error('Turnstile validation failed:', error)
    return false
  }
}

function normalizeLocale(value: unknown): SupportedLocale {
  const locale = String(value || 'ja')
    .trim()
    .toLowerCase()
    .slice(0, 16)

  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
    ? (locale as SupportedLocale)
    : 'ja'
}

function normalizeSingleLine(value: unknown, maxLength: number): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength + 1)
}

function normalizeEmail(value: unknown): string {
  return normalizeSingleLine(value, MAX_EMAIL_LENGTH).toLowerCase()
}

function getConfigEmail(value: unknown, fallback: string): string {
  const email = normalizeEmail(value)
  return EMAIL_PATTERN.test(email) ? email : fallback
}

function normalizeMessage(value: unknown): string {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, MAX_MESSAGE_LENGTH + 1)
}

function countMeaningfulCharacters(value: string): number {
  return Array.from(value.replace(/[^\p{L}\p{N}]/gu, '')).length
}

function isBlockedText(value: string): boolean {
  return HTML_TAG_PATTERN.test(value) || REPEATED_CHARACTER_PATTERN.test(value)
}

function isRequestBodyTooLarge(request: Request): boolean {
  const contentLength = Number(request.headers.get('Content-Length') || 0)
  return (
    Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES
  )
}

function checkMemoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now()

  if (rateLimitBuckets.size > RATE_LIMIT_MAX_BUCKETS) {
    for (const [bucketKey, bucket] of rateLimitBuckets) {
      if (bucket.resetAt <= now) rateLimitBuckets.delete(bucketKey)
    }
  }

  const bucket = rateLimitBuckets.get(key)
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true }
  }

  bucket.count += 1

  if (bucket.count > maxRequests) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    }
  }

  return { allowed: true }
}

function isAllowedRequestOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin')
  if (!origin) return true

  try {
    const originUrl = new URL(origin)
    const requestUrl = new URL(request.url)

    if (originUrl.hostname === requestUrl.hostname) return true
    return isAllowedVerifiedHostname(originUrl.hostname, env)
  } catch {
    return false
  }
}

function getCorsOrigin(request: Request, env: Env): string {
  const origin = request.headers.get('Origin')
  if (!origin) return 'https://acecore.net'

  try {
    const hostname = new URL(origin).hostname
    if (
      isAllowedRequestOrigin(request, env) ||
      isAllowedVerifiedHostname(hostname, env)
    ) {
      return origin
    }
  } catch {
    // Fall through to the production origin.
  }

  return 'https://acecore.net'
}

function isAllowedVerifiedHostname(hostname: string, env: Env): boolean {
  const normalized = hostname.toLowerCase()
  return getAllowedHostnames(env).some((allowedHostname) =>
    matchesAllowedHostname(normalized, allowedHostname),
  )
}

function matchesAllowedHostname(
  hostname: string,
  allowedHostname: string,
): boolean {
  if (hostname === allowedHostname) return true
  if (allowedHostname === 'localhost' || allowedHostname === '127.0.0.1') {
    return false
  }
  return hostname.endsWith(`.${allowedHostname}`)
}

function getAllowedHostnames(env: Env): string[] {
  const configured = String(env.CONTACT_ALLOWED_HOSTNAMES || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)

  return configured.length > 0 ? configured : DEFAULT_ALLOWED_HOSTNAMES
}

function getClientIp(request: Request): string | null {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    null
  )
}

function getClientFingerprint(request: Request): string {
  return `${getClientIp(request) || 'unknown'}:${request.headers
    .get('User-Agent')
    ?.slice(0, 96)}`
}

function localizedPath(path: string, locale: SupportedLocale): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return locale === 'ja' ? normalizedPath : `/${locale}${normalizedPath}`
}

function wantsHtmlRedirect(request: Request): boolean {
  const accept = request.headers.get('Accept') || ''
  return accept.includes('text/html') && !accept.includes('application/json')
}

function errorResponse(
  request: Request,
  locale: SupportedLocale,
  key: ApiMessageKey,
  status: number,
  headers: Record<string, string> = {},
): Response {
  if (wantsHtmlRedirect(request)) {
    const url = new URL(localizedPath('/contact/', locale), request.url)
    url.searchParams.set('contact', 'error')
    url.hash = 'contact-form'
    return Response.redirect(url.toString(), 303)
  }

  return jsonResponse(
    { ok: false, message: getApiMessage(locale, key) },
    status,
    headers,
  )
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

function getApiMessage(locale: SupportedLocale, key: ApiMessageKey): string {
  return API_MESSAGES[locale][key]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getEmailErrorStatus(error: unknown): number {
  const status =
    error && typeof error === 'object' && 'status' in error
      ? Number(error.status)
      : 0

  if (status === 429) return 429
  if (status >= 400 && status < 500) {
    return 503
  }

  return 500
}

function getEmailErrorLog(error: unknown): Record<string, string> {
  if (!error || typeof error !== 'object') {
    return { message: String(error) }
  }

  const status = 'status' in error ? String(error.status) : ''
  const message = 'message' in error ? String(error.message) : ''
  const apiErrors =
    'apiErrors' in error ? JSON.stringify(error.apiErrors || []) : ''
  return { status, message, apiErrors }
}
