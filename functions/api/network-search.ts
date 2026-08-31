import {
  createSearchEmbedding,
  getSearchEmbeddingErrorCode,
  type SearchEmbeddingEnv,
} from '../lib/search-embedding.ts'
import {
  retrieveFederatedRelatedSearch,
  type FederatedSearchEnv,
  type GroundingSource,
} from './ai-contact-search.ts'

const MAX_REQUEST_BYTES = 2048
const MIN_QUERY_LENGTH = 2
const MAX_QUERY_LENGTH = 160
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

const CALLER_SOURCES = new Map<string, GroundingSource>([
  ['https://acecore.net', 'acecore'],
  ['https://www.acecore.net', 'acecore'],
  ['https://systems.acecore.net', 'systems'],
  ['https://schools.acecore.net', 'schools'],
  ['https://asv-wiki.acecore.net', 'aceserverWiki'],
  ['https://asv.acecore.net', 'aceserverPortal'],
  ['https://world-foundation.acecore.net', 'worldFoundation'],
])

const NETWORK_SOURCE_DETAILS: Readonly<
  Record<GroundingSource, { source: string; sourceLabel: string }>
> = {
  acecore: { source: 'acecore', sourceLabel: 'Acecore' },
  systems: { source: 'systems', sourceLabel: 'Acecore Systems' },
  schools: { source: 'schools', sourceLabel: 'Acecore Schools' },
  aceserverWiki: { source: 'wiki', sourceLabel: 'Aceserver WIKI' },
  aceserverPortal: { source: 'portal', sourceLabel: 'Aceserver Portal' },
  worldFoundation: {
    source: 'world-foundation',
    sourceLabel: 'World Foundation',
  },
}

type NetworkSearchPayload = {
  query?: unknown
  locale?: unknown
}

type NetworkSearchEnv = CloudflareEnv & SearchEmbeddingEnv & FederatedSearchEnv

type Caller = {
  origin: string
  source: GroundingSource
}

export const onRequestOptions: PagesFunction<NetworkSearchEnv> = async ({
  request,
}) => {
  const caller = getCaller(request)
  if (!caller) return new Response(null, { status: 403 })

  return new Response(null, {
    status: 204,
    headers: corsHeaders(caller.origin),
  })
}

export const onRequestPost: PagesFunction<NetworkSearchEnv> = async ({
  request,
  env,
  waitUntil,
}) => {
  const startedAt = performance.now()
  const requestId = crypto.randomUUID()
  const caller = getCaller(request)

  try {
    if (!caller) return errorResponse('forbidden', 403, requestId, startedAt)

    if (
      !request.headers
        .get('Content-Type')
        ?.toLowerCase()
        .startsWith('application/json')
    ) {
      return errorResponse(
        'unsupported_media_type',
        415,
        requestId,
        startedAt,
        caller.origin,
      )
    }

    if (!env.AI || !env.SEARCH_RATE_LIMIT_DB) {
      return errorResponse(
        'unavailable',
        503,
        requestId,
        startedAt,
        caller.origin,
      )
    }

    const requestText = await readBoundedRequestText(request, MAX_REQUEST_BYTES)
    if (requestText === null) {
      return errorResponse(
        'request_too_large',
        413,
        requestId,
        startedAt,
        caller.origin,
      )
    }

    let parsedPayload: unknown
    try {
      parsedPayload = JSON.parse(requestText)
    } catch {
      return errorResponse(
        'invalid_json',
        400,
        requestId,
        startedAt,
        caller.origin,
      )
    }
    if (!isJsonObject(parsedPayload)) {
      return errorResponse(
        'invalid_request',
        400,
        requestId,
        startedAt,
        caller.origin,
      )
    }

    const payload = parsedPayload as NetworkSearchPayload
    const query = normalizeQuery(payload.query)
    const locale = normalizeLocale(payload.locale)
    if (!query || !locale) {
      return errorResponse(
        'invalid_request',
        400,
        requestId,
        startedAt,
        caller.origin,
      )
    }

    let clientAllowed = false
    let globalAllowed = false
    try {
      const clientKey = await createClientRateLimitKey(request)
      clientAllowed = await consumeRateLimit(
        env.SEARCH_RATE_LIMIT_DB,
        `network-search:${caller.source}:client:${clientKey}`,
        CLIENT_RATE_LIMIT,
      )
      if (clientAllowed) {
        globalAllowed = await consumeRateLimit(
          env.SEARCH_RATE_LIMIT_DB,
          'network-search:global',
          GLOBAL_RATE_LIMIT,
        )
      }
    } catch (error) {
      logNetworkSearchError(
        requestId,
        caller.source,
        locale,
        'rate_limit',
        getErrorCode(error, 'storage_error'),
      )
      return errorResponse(
        'unavailable',
        503,
        requestId,
        startedAt,
        caller.origin,
      )
    }
    if (!clientAllowed || !globalAllowed) {
      return errorResponse(
        'rate_limited',
        429,
        requestId,
        startedAt,
        caller.origin,
        { 'Retry-After': '60' },
      )
    }
    if (requestId.endsWith('00')) {
      waitUntil?.(
        deleteExpiredRateLimits(env.SEARCH_RATE_LIMIT_DB).catch((error) => {
          logNetworkSearchError(
            requestId,
            caller.source,
            locale,
            'rate_limit_cleanup',
            getErrorCode(error, 'storage_error'),
          )
        }),
      )
    }

    const result = await retrieveFederatedRelatedSearch(
      query,
      caller.source,
      locale,
      {
        env,
        runEmbedding: (input) => createSearchEmbedding(env, input),
      },
    )
    const results = result.entries.map((entry, index) => ({
      title: entry.title,
      section: entry.section,
      excerpt: entry.excerpt,
      url: entry.url,
      ...NETWORK_SOURCE_DETAILS[entry.source],
      rank: index + 1,
    }))

    return jsonResponse(
      { ok: true, requestId, results },
      200,
      requestId,
      startedAt,
      caller.origin,
    )
  } catch (error) {
    logNetworkSearchError(
      requestId,
      caller?.source || 'acecore',
      'unknown',
      'request',
      getSearchEmbeddingErrorCode(error, 'internal_error'),
    )
    return errorResponse(
      'internal_error',
      500,
      requestId,
      startedAt,
      caller?.origin,
    )
  }
}

function getCaller(request: Request): Caller | null {
  const origin = request.headers.get('Origin')
  if (!origin) return null

  try {
    const normalizedOrigin = new URL(origin).origin
    const source = CALLER_SOURCES.get(normalizedOrigin)
    return source ? { origin: normalizedOrigin, source } : null
  } catch {
    return null
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

function normalizeClientId(value: string | null): string {
  const clientId = String(value || '').trim()
  return CLIENT_ID_PATTERN.test(clientId) ? clientId : 'anonymous'
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

function corsHeaders(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Headers': 'Content-Type, X-Acecore-Search-Client',
    'Access-Control-Allow-Methods': 'OPTIONS, POST',
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
}

function errorResponse(
  code: string,
  status: number,
  requestId: string,
  startedAt: number,
  origin?: string,
  extraHeaders: Record<string, string> = {},
): Response {
  return jsonResponse(
    { ok: false, error: { code }, requestId },
    status,
    requestId,
    startedAt,
    origin,
    extraHeaders,
  )
}

function jsonResponse(
  body: unknown,
  status: number,
  requestId: string,
  startedAt: number,
  origin?: string,
  extraHeaders: Record<string, string> = {},
): Response {
  const duration = Math.max(0, performance.now() - startedAt).toFixed(1)
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Referrer-Policy': 'no-referrer',
      'Server-Timing': `network-search;dur=${duration}`,
      'X-Content-Type-Options': 'nosniff',
      'X-Search-Request-Id': requestId,
      ...(origin ? corsHeaders(origin) : {}),
      ...extraHeaders,
    },
  })
}

function getErrorCode(error: unknown, fallback: string): string {
  return error instanceof Error && error.name ? error.name : fallback
}

function logNetworkSearchError(
  requestId: string,
  callerSource: GroundingSource,
  locale: string,
  stage: string,
  errorCode: string,
) {
  console.error(
    JSON.stringify({
      event: 'network_search_error',
      requestId,
      callerSource,
      locale,
      stage,
      errorCode,
    }),
  )
}
