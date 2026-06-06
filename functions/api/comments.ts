type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>
  run(): Promise<unknown>
}

type D1Database = {
  prepare(query: string): D1PreparedStatement
}

type Env = {
  COMMENTS_DB?: D1Database
  TURNSTILE_SECRET_KEY?: string
  COMMENT_HASH_SALT?: string
  COMMENT_ALLOWED_HOSTNAMES?: string
}

type PagesContext = {
  request: Request
  env: Env
}

type CommentPayload = {
  slug?: unknown
  locale?: unknown
  authorName?: unknown
  body?: unknown
  turnstileToken?: unknown
  website?: unknown
}

type CommentRow = {
  id: string
  post_slug: string
  locale: string
  author_name: string
  body: string
  created_at: string
}

type PublicComment = {
  id: string
  authorName: string
  body: string
  locale: SupportedLocale
  createdAt: string
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
    unavailable: 'コメント機能を一時的に利用できません。',
    invalid: 'コメントを投稿できませんでした。内容を確認してください。',
    rateLimited:
      '短時間に投稿できる回数を超えました。少し待ってからお試しください。',
    turnstile: '送信前の確認に失敗しました。もう一度お試しください。',
    failed: 'コメントを投稿できませんでした。',
  },
  en: {
    unavailable: 'Comments are temporarily unavailable.',
    invalid: 'Could not post the comment. Please check the content.',
    rateLimited:
      'Too many comments in a short time. Please wait and try again.',
    turnstile: 'Verification failed. Please try again.',
    failed: 'Could not post the comment.',
  },
  'zh-cn': {
    unavailable: '评论功能暂时不可用。',
    invalid: '无法发表评论。请检查内容。',
    rateLimited: '短时间内提交次数过多。请稍后再试。',
    turnstile: '验证失败。请重试。',
    failed: '无法发表评论。',
  },
  es: {
    unavailable: 'Los comentarios no están disponibles temporalmente.',
    invalid: 'No se pudo publicar el comentario. Revisa el contenido.',
    rateLimited:
      'Demasiados comentarios en poco tiempo. Espera e inténtalo de nuevo.',
    turnstile: 'La verificación falló. Inténtalo de nuevo.',
    failed: 'No se pudo publicar el comentario.',
  },
  pt: {
    unavailable: 'Os comentários estão temporariamente indisponíveis.',
    invalid: 'Não foi possível publicar o comentário. Verifique o conteúdo.',
    rateLimited:
      'Muitos comentários em pouco tempo. Aguarde e tente novamente.',
    turnstile: 'A verificação falhou. Tente novamente.',
    failed: 'Não foi possível publicar o comentário.',
  },
  fr: {
    unavailable: 'Les commentaires sont temporairement indisponibles.',
    invalid: 'Impossible de publier le commentaire. Vérifiez le contenu.',
    rateLimited: 'Trop de commentaires en peu de temps. Veuillez patienter.',
    turnstile: 'La vérification a échoué. Veuillez réessayer.',
    failed: 'Impossible de publier le commentaire.',
  },
  ko: {
    unavailable: '댓글 기능을 일시적으로 사용할 수 없습니다.',
    invalid: '댓글을 게시할 수 없습니다. 내용을 확인해 주세요.',
    rateLimited:
      '짧은 시간에 너무 많이 게시했습니다. 잠시 후 다시 시도해 주세요.',
    turnstile: '확인에 실패했습니다. 다시 시도해 주세요.',
    failed: '댓글을 게시할 수 없습니다.',
  },
  de: {
    unavailable: 'Kommentare sind vorübergehend nicht verfügbar.',
    invalid:
      'Der Kommentar konnte nicht veröffentlicht werden. Bitte prüfen Sie den Inhalt.',
    rateLimited: 'Zu viele Kommentare in kurzer Zeit. Bitte warten Sie kurz.',
    turnstile:
      'Die Überprüfung ist fehlgeschlagen. Bitte versuchen Sie es erneut.',
    failed: 'Der Kommentar konnte nicht veröffentlicht werden.',
  },
  ru: {
    unavailable: 'Комментарии временно недоступны.',
    invalid: 'Не удалось опубликовать комментарий. Проверьте содержимое.',
    rateLimited:
      'Слишком много комментариев за короткое время. Попробуйте позже.',
    turnstile: 'Проверка не пройдена. Попробуйте еще раз.',
    failed: 'Не удалось опубликовать комментарий.',
  },
}

const SITEVERIFY_ENDPOINT =
  'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const MAX_AUTHOR_LENGTH = 24
const MAX_BODY_LENGTH = 600
const MIN_BODY_MEANINGFUL_LENGTH = 8
const MAX_GET_LIMIT = 100
const POST_RATE_WINDOW_MS = 15 * 60 * 1000
const POST_RATE_MAX_REQUESTS = 3
const READ_RATE_WINDOW_MS = 60 * 1000
const READ_RATE_MAX_REQUESTS = 60
const RATE_LIMIT_MAX_BUCKETS = 3000
const PERSISTENT_CLIENT_WINDOW_MS = 15 * 60 * 1000
const PERSISTENT_POST_WINDOW_MS = 30 * 60 * 1000
const DUPLICATE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const DEFAULT_ALLOWED_HOSTNAMES = [
  'acecore.net',
  'www.acecore.net',
  'localhost',
  '127.0.0.1',
]

const URL_PATTERN =
  /\b(?:https?:\/\/|www\.|[a-z0-9][a-z0-9.-]*\.(?:com|net|org|info|biz|xyz|top|site|online|shop|click|link|ru|cn|jp)\b)/i
const EMAIL_PATTERN = /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/i
const HTML_TAG_PATTERN = /<[^>]{2,}>/
const MARKDOWN_LINK_PATTERN = /\[[^\]]+\]\([^)]+\)/
const REPEATED_CHARACTER_PATTERN = /(.)\1{12,}/u
const SPAM_WORD_PATTERN =
  /(casino|viagra|porn|payday|loan|forex|crypto|bitcoin|gambling|slot|바카라|카지노|도박|博彩|赌博|カジノ|アダルト|出会い系|副業|稼げ|借金|投資|仮想通貨|ビットコイン|無料登録)/i

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()

export const onRequestGet = async ({
  request,
  env,
}: PagesContext): Promise<Response> => {
  const locale = normalizeLocale(
    new URL(request.url).searchParams.get('locale'),
  )

  if (!isAllowedRequestOrigin(request, env)) {
    return jsonResponse(
      { ok: false, message: getApiMessage(locale, 'invalid'), comments: [] },
      403,
    )
  }

  if (!env.COMMENTS_DB) {
    return jsonResponse(
      {
        ok: false,
        message: getApiMessage(locale, 'unavailable'),
        comments: [],
      },
      503,
    )
  }

  const readLimit = checkMemoryRateLimit(
    `read:${getClientFingerprint(request)}`,
    READ_RATE_MAX_REQUESTS,
    READ_RATE_WINDOW_MS,
  )

  if (!readLimit.allowed) {
    return jsonResponse(
      {
        ok: false,
        message: getApiMessage(locale, 'rateLimited'),
        comments: [],
      },
      429,
      { 'Retry-After': String(readLimit.retryAfterSeconds || 60) },
    )
  }

  const url = new URL(request.url)
  const slug = normalizeSlug(url.searchParams.get('slug'))
  const limit = normalizeLimit(url.searchParams.get('limit'))

  if (!slug) {
    return jsonResponse(
      { ok: false, message: getApiMessage(locale, 'invalid'), comments: [] },
      400,
    )
  }

  try {
    const rows = await env.COMMENTS_DB.prepare(
      `SELECT id, post_slug, locale, author_name, body, created_at
       FROM blog_comments
       WHERE post_slug = ? AND deleted_at IS NULL
       ORDER BY created_at ASC
       LIMIT ?`,
    )
      .bind(slug, limit)
      .all<CommentRow>()

    return jsonResponse({
      ok: true,
      comments: (rows.results ?? []).map(toPublicComment),
    })
  } catch (error) {
    console.error('Failed to load comments:', error)
    return jsonResponse(
      {
        ok: false,
        message: getApiMessage(locale, 'unavailable'),
        comments: [],
      },
      503,
    )
  }
}

export const onRequestPost = async ({
  request,
  env,
}: PagesContext): Promise<Response> => {
  if (!isAllowedRequestOrigin(request, env)) {
    return jsonResponse(
      { ok: false, message: getApiMessage('ja', 'invalid') },
      403,
    )
  }

  const payload = (await request
    .json()
    .catch(() => null)) as CommentPayload | null
  const locale = normalizeLocale(payload?.locale)

  if (!env.COMMENTS_DB || !env.TURNSTILE_SECRET_KEY) {
    return jsonResponse(
      { ok: false, message: getApiMessage(locale, 'unavailable') },
      503,
    )
  }

  const validation = validatePayload(payload)

  if (!validation.ok) {
    return jsonResponse(
      { ok: false, message: getApiMessage(locale, validation.messageKey) },
      400,
    )
  }

  const memoryLimit = checkMemoryRateLimit(
    `post:${getClientFingerprint(request)}`,
    POST_RATE_MAX_REQUESTS,
    POST_RATE_WINDOW_MS,
  )

  if (!memoryLimit.allowed) {
    return jsonResponse(
      { ok: false, message: getApiMessage(validation.locale, 'rateLimited') },
      429,
      { 'Retry-After': String(memoryLimit.retryAfterSeconds || 60) },
    )
  }

  const clientIp = getClientIp(request)
  const turnstileValid = await verifyTurnstile(
    env,
    validation.turnstileToken,
    clientIp,
  )

  if (!turnstileValid) {
    return jsonResponse(
      { ok: false, message: getApiMessage(validation.locale, 'turnstile') },
      403,
    )
  }

  const now = new Date()
  const salt = env.COMMENT_HASH_SALT || 'acecore-comments'
  const userAgent = request.headers.get('User-Agent') || ''
  const clientHash = await sha256Hex(
    `${salt}:client:${clientIp || 'unknown'}:${userAgent.slice(0, 96)}`,
  )
  const userAgentHash = await sha256Hex(`${salt}:ua:${userAgent}`)
  const bodyHash = await sha256Hex(normalizeForDuplicate(validation.body))

  try {
    const persistentLimit = await checkPersistentRateLimit(
      env.COMMENTS_DB,
      clientHash,
      validation.slug,
      now,
    )

    if (!persistentLimit.allowed) {
      return jsonResponse(
        {
          ok: false,
          message: getApiMessage(validation.locale, 'rateLimited'),
        },
        429,
        { 'Retry-After': String(persistentLimit.retryAfterSeconds || 60) },
      )
    }

    const duplicate = await env.COMMENTS_DB.prepare(
      `SELECT id
       FROM blog_comments
       WHERE post_slug = ? AND body_hash = ? AND created_at >= ? AND deleted_at IS NULL
       LIMIT 1`,
    )
      .bind(
        validation.slug,
        bodyHash,
        new Date(now.getTime() - DUPLICATE_WINDOW_MS).toISOString(),
      )
      .first<{ id: string }>()

    if (duplicate) {
      return jsonResponse(
        { ok: false, message: getApiMessage(validation.locale, 'invalid') },
        400,
      )
    }

    const row = {
      id: crypto.randomUUID(),
      post_slug: validation.slug,
      locale: validation.locale,
      author_name: validation.authorName,
      body: validation.body,
      body_hash: bodyHash,
      client_hash: clientHash,
      user_agent_hash: userAgentHash,
      risk_score: 0,
      created_at: now.toISOString(),
    }

    await env.COMMENTS_DB.prepare(
      `INSERT INTO blog_comments (
         id, post_slug, locale, author_name, body, body_hash,
         client_hash, user_agent_hash, risk_score, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        row.id,
        row.post_slug,
        row.locale,
        row.author_name,
        row.body,
        row.body_hash,
        row.client_hash,
        row.user_agent_hash,
        row.risk_score,
        row.created_at,
      )
      .run()

    return jsonResponse(
      {
        ok: true,
        comment: toPublicComment(row),
      },
      201,
    )
  } catch (error) {
    console.error('Failed to post comment:', error)
    return jsonResponse(
      { ok: false, message: getApiMessage(validation.locale, 'failed') },
      500,
    )
  }
}

export const onRequestOptions = ({ request, env }: PagesContext): Response =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': getCorsOrigin(request, env),
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept, Content-Type',
    },
  })

function validatePayload(payload: CommentPayload | null):
  | {
      ok: true
      slug: string
      locale: SupportedLocale
      authorName: string
      body: string
      turnstileToken: string
    }
  | { ok: false; messageKey: ApiMessageKey } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, messageKey: 'invalid' }
  }

  if (String(payload.website || '').trim()) {
    return { ok: false, messageKey: 'invalid' }
  }

  const slug = normalizeSlug(payload.slug)
  const locale = normalizeLocale(payload.locale)
  const authorName = normalizeAuthorName(payload.authorName)
  const body = normalizeBody(payload.body)
  const turnstileToken = String(payload.turnstileToken || '').trim()

  if (!slug || !authorName || !body || !turnstileToken) {
    return { ok: false, messageKey: 'invalid' }
  }

  if (
    authorName.length > MAX_AUTHOR_LENGTH ||
    body.length > MAX_BODY_LENGTH ||
    turnstileToken.length > 2048
  ) {
    return { ok: false, messageKey: 'invalid' }
  }

  if (countMeaningfulCharacters(body) < MIN_BODY_MEANINGFUL_LENGTH) {
    return { ok: false, messageKey: 'invalid' }
  }

  if (isBlockedText(`${authorName}\n${body}`)) {
    return { ok: false, messageKey: 'invalid' }
  }

  return { ok: true, slug, locale, authorName, body, turnstileToken }
}

function normalizeSlug(value: unknown): string | null {
  const slug = String(value || '')
    .trim()
    .toLowerCase()

  return /^[a-z0-9][a-z0-9-]{0,120}$/.test(slug) ? slug : null
}

function normalizeLocale(value: unknown): SupportedLocale {
  const locale = String(value || 'ja')
    .trim()
    .toLowerCase()
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
    ? (locale as SupportedLocale)
    : 'ja'
}

function normalizeLimit(value: unknown): number {
  const limit = Number(value || 50)
  return Number.isFinite(limit)
    ? Math.min(Math.max(Math.floor(limit), 1), MAX_GET_LIMIT)
    : 50
}

function normalizeAuthorName(value: unknown): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeBody(value: unknown): string {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function normalizeForDuplicate(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function countMeaningfulCharacters(value: string): number {
  return Array.from(value.replace(/[^\p{L}\p{N}]/gu, '')).length
}

function isBlockedText(value: string): boolean {
  return (
    URL_PATTERN.test(value) ||
    EMAIL_PATTERN.test(value) ||
    HTML_TAG_PATTERN.test(value) ||
    MARKDOWN_LINK_PATTERN.test(value) ||
    REPEATED_CHARACTER_PATTERN.test(value) ||
    SPAM_WORD_PATTERN.test(value)
  )
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

async function checkPersistentRateLimit(
  db: D1Database,
  clientHash: string,
  postSlug: string,
  now: Date,
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const clientSince = new Date(
    now.getTime() - PERSISTENT_CLIENT_WINDOW_MS,
  ).toISOString()
  const clientRecent = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM blog_comments
       WHERE client_hash = ? AND created_at >= ? AND deleted_at IS NULL`,
    )
    .bind(clientHash, clientSince)
    .first<{ count: number }>()

  if (getCount(clientRecent) >= POST_RATE_MAX_REQUESTS) {
    return { allowed: false, retryAfterSeconds: 15 * 60 }
  }

  const postSince = new Date(
    now.getTime() - PERSISTENT_POST_WINDOW_MS,
  ).toISOString()
  const postRecent = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM blog_comments
       WHERE client_hash = ? AND post_slug = ? AND created_at >= ? AND deleted_at IS NULL`,
    )
    .bind(clientHash, postSlug, postSince)
    .first<{ count: number }>()

  if (getCount(postRecent) >= 2) {
    return { allowed: false, retryAfterSeconds: 30 * 60 }
  }

  return { allowed: true }
}

function getCount(row: { count?: number } | null): number {
  return Number(row?.count || 0)
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
  if (normalized.endsWith('.pages.dev')) return true
  return getAllowedHostnames(env).includes(normalized)
}

function getAllowedHostnames(env: Env): string[] {
  const configured = String(env.COMMENT_ALLOWED_HOSTNAMES || '')
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

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  )

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function toPublicComment(row: CommentRow): PublicComment {
  return {
    id: row.id,
    authorName: row.author_name,
    body: row.body,
    locale: normalizeLocale(row.locale),
    createdAt: row.created_at,
  }
}

function getApiMessage(locale: SupportedLocale, key: ApiMessageKey): string {
  return API_MESSAGES[locale][key]
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}
