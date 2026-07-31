import {
  createOpenAiEmbedding,
  getOpenAiErrorCode,
  type OpenAiEnv,
} from '../lib/openai.ts'

const DEFAULT_MIN_SCORE = 0.5
const MAX_REQUEST_BYTES = 2048
const MIN_QUERY_LENGTH = 2
const MAX_QUERY_LENGTH = 160
const QUERY_TOP_K = 15
const RESULT_LIMIT = 5
const MAX_PATH_DECODE_PASSES = 4
const RATE_LIMIT_WINDOW_SECONDS = 60
const RATE_LIMIT_RETENTION_SECONDS = 600
const CLIENT_RATE_LIMIT = 20
const GLOBAL_RATE_LIMIT = 300
const CLIENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const SUPPORTED_LOCALES = new Set([
  'ja',
  'en',
  'zh-cn',
  'es',
  'pt',
  'fr',
  'ko',
  'de',
  'ru',
])

type SearchPayload = {
  query?: unknown
  locale?: unknown
}

type SearchMetadata = {
  url: string
  title: string
  section: string
  excerpt: string
  contentType: string
  locale: string
}

type SearchResult = {
  id: string
  url: string
  title: string
  section: string
  excerpt: string
  contentType: string
  rank: number
}

type SearchEnv = CloudflareEnv & OpenAiEnv

export const onRequestPost: PagesFunction<SearchEnv> = async ({
  request,
  env,
  waitUntil,
}) => {
  const startedAt = performance.now()
  const requestId = crypto.randomUUID()

  try {
    if (!isSameOriginRequest(request)) {
      return errorResponse('forbidden', 403, requestId, startedAt)
    }

    if (
      !request.headers
        .get('Content-Type')
        ?.toLowerCase()
        .startsWith('application/json')
    ) {
      return errorResponse('unsupported_media_type', 415, requestId, startedAt)
    }

    if (
      String(env.SEARCH_ENABLED) !== 'true' ||
      !env.OPENAI_API_KEY?.trim() ||
      !env.SEARCH_INDEX ||
      !env.SEARCH_RATE_LIMIT_DB
    ) {
      return errorResponse('unavailable', 503, requestId, startedAt)
    }

    let clientAllowed = false
    let globalAllowed = false
    try {
      const clientKey = await createClientRateLimitKey(request)
      clientAllowed = await consumeRateLimit(
        env.SEARCH_RATE_LIMIT_DB,
        `client:${clientKey}`,
        CLIENT_RATE_LIMIT,
      )
      if (clientAllowed) {
        globalAllowed = await consumeRateLimit(
          env.SEARCH_RATE_LIMIT_DB,
          'global',
          GLOBAL_RATE_LIMIT,
        )
      }
    } catch (error) {
      logSearchError(
        requestId,
        'unknown',
        'rate_limit',
        getErrorCode(error, 'storage_error'),
      )
      return errorResponse('unavailable', 503, requestId, startedAt)
    }
    if (!clientAllowed || !globalAllowed) {
      return errorResponse('rate_limited', 429, requestId, startedAt, {
        'Retry-After': '60',
      })
    }
    if (requestId.endsWith('00')) {
      waitUntil?.(
        deleteExpiredRateLimits(env.SEARCH_RATE_LIMIT_DB).catch((error) => {
          logSearchError(
            requestId,
            'unknown',
            'rate_limit_cleanup',
            getErrorCode(error, 'storage_error'),
          )
        }),
      )
    }

    const requestText = await readBoundedRequestText(request, MAX_REQUEST_BYTES)
    if (requestText === null) {
      return errorResponse('request_too_large', 413, requestId, startedAt)
    }

    let parsedPayload: unknown
    try {
      parsedPayload = JSON.parse(requestText)
    } catch {
      return errorResponse('invalid_json', 400, requestId, startedAt)
    }
    if (!isJsonObject(parsedPayload)) {
      return errorResponse('invalid_request', 400, requestId, startedAt)
    }
    const payload = parsedPayload as SearchPayload

    const query = normalizeQuery(payload.query)
    const locale = normalizeLocale(payload.locale)
    if (!query || !locale) {
      return errorResponse('invalid_request', 400, requestId, startedAt)
    }

    let embedding: number[]
    try {
      embedding = await createOpenAiEmbedding(env, query)
    } catch (error) {
      logSearchError(requestId, locale, 'embedding', getOpenAiErrorCode(error))
      return errorResponse('provider_error', 502, requestId, startedAt)
    }

    let matches: VectorizeMatches
    try {
      matches = await env.SEARCH_INDEX.query(embedding, {
        namespace: locale,
        topK: QUERY_TOP_K,
        returnMetadata: 'all',
        returnValues: false,
      })
    } catch (error) {
      logSearchError(
        requestId,
        locale,
        'vectorize',
        getErrorCode(error, 'provider_error'),
      )
      return errorResponse('provider_error', 502, requestId, startedAt)
    }
    const minScore = normalizeMinScore(env.SEARCH_MIN_SCORE)
    const results = normalizeMatches(matches, minScore, request.url, locale)

    return jsonResponse(
      {
        ok: true,
        requestId,
        results,
      },
      200,
      requestId,
      startedAt,
    )
  } catch (error) {
    logSearchError(
      requestId,
      'unknown',
      'request',
      error instanceof Error ? error.name : 'unknown_error',
    )
    return errorResponse('internal_error', 500, requestId, startedAt)
  }
}

function normalizeQuery(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const query = value.normalize('NFKC').replace(/\s+/gu, ' ').trim()
  const length = [...query].length
  return length >= MIN_QUERY_LENGTH && length <= MAX_QUERY_LENGTH ? query : null
}

function normalizeLocale(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const locale = value.trim().toLowerCase()
  return SUPPORTED_LOCALES.has(locale) ? locale : null
}

function normalizeClientId(value: string | null): string {
  const clientId = String(value || '').trim()
  return CLIENT_ID_PATTERN.test(clientId) ? clientId : 'anonymous'
}

async function readBoundedRequestText(
  request: Request,
  maxBytes: number,
): Promise<string | null> {
  const declaredLength = request.headers.get('Content-Length')
  if (declaredLength !== null) {
    const length = Number(declaredLength)
    if (!Number.isSafeInteger(length) || length < 0 || length > maxBytes) {
      return null
    }
  }

  if (!request.body) return ''

  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let byteLength = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      byteLength += value.byteLength
      if (byteLength > maxBytes) {
        await reader.cancel('request body too large').catch(() => undefined)
        return null
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(byteLength)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(body)
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

async function createClientRateLimitKey(request: Request): Promise<string> {
  const connectingIp = String(
    request.headers.get('CF-Connecting-IP') || '',
  ).trim()
  const source =
    connectingIp && connectingIp.length <= 64
      ? `ip:${connectingIp}`
      : `session:${normalizeClientId(
          request.headers.get('X-Acecore-Search-Client'),
        )}`
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(source),
  )
  return Array.from(new Uint8Array(digest), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('')
}

async function consumeRateLimit(
  database: D1Database,
  limiterKey: string,
  limit: number,
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000)
  const windowStart =
    Math.floor(now / RATE_LIMIT_WINDOW_SECONDS) * RATE_LIMIT_WINDOW_SECONDS
  const result = await database
    .prepare(
      `INSERT INTO semantic_search_rate_limits
        (limiter_key, window_start, request_count, expires_at)
       VALUES (?, ?, 1, ?)
       ON CONFLICT (limiter_key, window_start) DO UPDATE SET
         request_count = semantic_search_rate_limits.request_count + 1,
         expires_at = excluded.expires_at
       WHERE semantic_search_rate_limits.request_count < ?
       RETURNING request_count`,
    )
    .bind(limiterKey, windowStart, now + RATE_LIMIT_RETENTION_SECONDS, limit)
    .first<{ request_count: number }>()

  return Boolean(
    result &&
    Number.isInteger(result.request_count) &&
    result.request_count <= limit,
  )
}

async function deleteExpiredRateLimits(database: D1Database): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  await database
    .prepare('DELETE FROM semantic_search_rate_limits WHERE expires_at < ?')
    .bind(now)
    .run()
}

function normalizeMinScore(value: string | undefined): number {
  const score = Number(value)
  return Number.isFinite(score) && score >= 0 && score <= 1
    ? score
    : DEFAULT_MIN_SCORE
}

function normalizeMatches(
  queryResult: VectorizeMatches,
  minScore: number,
  requestUrl: string,
  locale: string,
): SearchResult[] {
  const results = []
  const seenUrls = new Set<string>()

  for (const match of queryResult.matches || []) {
    if (match.score < minScore) continue
    const metadata = normalizeMetadata(match.metadata, requestUrl, locale)
    if (!metadata || seenUrls.has(metadata.url)) continue

    seenUrls.add(metadata.url)
    results.push({
      id: match.id,
      url: metadata.url,
      title: metadata.title,
      section: metadata.section,
      excerpt: metadata.excerpt,
      contentType: metadata.contentType,
      rank: results.length + 1,
    })
    if (results.length >= RESULT_LIMIT) break
  }

  return results
}

function normalizeMetadata(
  value: unknown,
  requestUrl: string,
  expectedLocale: string,
): SearchMetadata | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const metadata = value as Record<string, unknown>

  const rawUrl = readRawUrl(metadata.url, 500)
  const title = readString(metadata.title, 240)
  const section = readString(metadata.section, 240) || title
  const excerpt = readString(metadata.excerpt, 500)
  const contentType = readString(metadata.contentType, 40) || 'page'
  const locale = readString(metadata.locale, 16)
  if (
    !rawUrl ||
    !title ||
    locale !== expectedLocale ||
    !rawUrl.startsWith('/') ||
    rawUrl.startsWith('//')
  ) {
    return null
  }

  const pathname = decodePublicPathname(rawUrl)
  if (!pathname || isPrivateRootPath(pathname)) return null

  try {
    const requestOrigin = new URL(requestUrl).origin
    const resolved = new URL(pathname, requestUrl)
    if (
      resolved.origin !== requestOrigin ||
      resolved.search ||
      resolved.hash ||
      !resolved.pathname.startsWith('/')
    ) {
      return null
    }

    return { url: pathname, title, section, excerpt, contentType, locale }
  } catch {
    return null
  }
}

function decodePublicPathname(pathname: string): string | null {
  let decoded = pathname

  for (let attempt = 0; attempt < MAX_PATH_DECODE_PASSES; attempt += 1) {
    decoded = decoded.normalize('NFKC')
    if (/%(?:2f|5c)/iu.test(decoded)) return null

    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) {
        return isSafeDecodedPathname(decoded) ? decoded : null
      }
      decoded = next
    } catch {
      return null
    }
  }

  const normalized = decoded.normalize('NFKC')
  return isSafeDecodedPathname(normalized) ? normalized : null
}

function isSafeDecodedPathname(pathname: string): boolean {
  return (
    pathname.startsWith('/') &&
    !pathname.includes('%') &&
    !pathname.includes('?') &&
    !pathname.includes('#') &&
    !pathname.includes('//') &&
    !/\s/u.test(pathname) &&
    !/[\\\u0000-\u001f\u007f]/u.test(pathname) &&
    !pathname.split('/').some((segment) => segment === '.' || segment === '..')
  )
}

function isPrivateRootPath(pathname: string): boolean {
  const firstPathSegment = pathname.split('/').find(Boolean)?.toLowerCase()
  return (
    firstPathSegment !== undefined &&
    ['admin', 'api'].includes(firstPathSegment)
  )
}

function getErrorCode(error: unknown, fallback: string) {
  return error instanceof Error && error.name ? error.name : fallback
}

function readString(value: unknown, maxLength: number): string {
  return typeof value === 'string'
    ? value.normalize('NFKC').trim().slice(0, maxLength)
    : ''
}

function readRawUrl(value: unknown, maxLength: number): string | null {
  return typeof value === 'string' && [...value].length <= maxLength
    ? value
    : null
}

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('Origin')
  if (!origin) return false

  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

function errorResponse(
  code: string,
  status: number,
  requestId: string,
  startedAt: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return jsonResponse(
    { ok: false, error: { code }, requestId },
    status,
    requestId,
    startedAt,
    extraHeaders,
  )
}

function jsonResponse(
  body: unknown,
  status: number,
  requestId: string,
  startedAt: number,
  extraHeaders: Record<string, string> = {},
): Response {
  const duration = Math.max(0, performance.now() - startedAt).toFixed(1)
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Server-Timing': `search;dur=${duration}`,
      'X-Content-Type-Options': 'nosniff',
      'X-Search-Request-Id': requestId,
      ...extraHeaders,
    },
  })
}

function logSearchError(
  requestId: string,
  locale: string,
  stage: string,
  errorCode: string,
) {
  console.error(
    JSON.stringify({
      event: 'semantic_search_error',
      requestId,
      locale,
      stage,
      errorCode,
    }),
  )
}
