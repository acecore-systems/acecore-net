import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  SEARCH_DISTANCE_METRIC,
  SEARCH_EMBEDDING_DIMENSIONS,
  SEARCH_EMBEDDING_MODEL,
  SEARCH_VECTOR_LIMIT,
} from './build-search-corpus.mjs'

const API_BASE_URL = 'https://api.cloudflare.com/client/v4'
const OPENAI_API_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_CORPUS_FILE = resolve('.vectorize/corpus.json')
const EMBEDDING_BATCH_SIZE = 32
const UPSERT_BATCH_SIZE = 200
const DELETE_BATCH_SIZE = 100
const LIST_BATCH_SIZE = 1000
const MUTATION_WAIT_TIMEOUT_MS = 180_000
const MUTATION_POLL_INTERVAL_MS = 5_000
const REQUEST_TIMEOUT_MS = 30_000
const MAX_API_RESPONSE_BYTES = 8 * 1024 * 1024
const MAX_REQUEST_RETRIES = 5
const RETRY_BASE_DELAY_MS = 500
const MAX_LIST_CURSOR_RESTARTS = 3
const MAX_DELETE_RATIO = 0.2
const MIN_SOURCE_COUNT = 90
const MIN_VECTOR_COUNT = 150
const MIN_LOCALE_SOURCE_COUNT = 10
const MIN_LOCALE_VECTOR_COUNTS = Object.freeze({
  ja: 10,
  en: 19,
  'zh-cn': 9,
  es: 18,
  pt: 19,
  fr: 20,
  ko: 11,
  de: 19,
  ru: 18,
})
const MANAGED_VECTOR_ID_PATTERN = /^v1-[0-9a-f]{48}$/
const ALLOWED_INDEX_NAMES = new Set([
  'acecore-net-search-openai-1536-preview',
  'acecore-net-search-openai-1536-production',
])
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
]

class CloudflareApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'CloudflareApiError'
    this.status = status
  }
}

class OpenAiApiError extends Error {
  constructor(status) {
    super(`OpenAI API request failed with ${status}.`)
    this.name = 'OpenAiApiError'
    this.status = status
  }
}

export async function syncVectorize({
  accountId = process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken = process.env.CLOUDFLARE_API_TOKEN,
  openAiApiKey = process.env.OPENAI_API_KEY,
  indexName = process.env.VECTORIZE_INDEX_NAME,
  corpusFile = DEFAULT_CORPUS_FILE,
  dryRun = false,
  planOnly = false,
  waitForMutations = true,
  verifyAfterMutation = true,
  allowLargeDelete = false,
  expectedDeleteCount,
  expectedPlanId,
  fetchImpl = globalThis.fetch,
  requestTimeoutMs = REQUEST_TIMEOUT_MS,
  retryBaseDelayMs = RETRY_BASE_DELAY_MS,
  sleepImpl = sleep,
  randomImpl = Math.random,
  logger = console,
} = {}) {
  const corpus = JSON.parse(await readFile(corpusFile, 'utf8'))
  validateCorpus(corpus)
  if (!dryRun && (!accountId || !apiToken || !indexName)) {
    throw new Error(
      'CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and VECTORIZE_INDEX_NAME are required.',
    )
  }
  validateIndexName(indexName, { required: !dryRun })

  if (dryRun) {
    const result = {
      dryRun: true,
      indexName: indexName || null,
      corpusVersion: corpus.version,
      vectors: corpus.vectorCount,
      locales: corpus.localeCounts,
    }
    logger.log(JSON.stringify({ event: 'vectorize_sync_dry_run', ...result }))
    return result
  }

  const client = createCloudflareClient({
    accountId,
    apiToken,
    fetchImpl,
    requestTimeoutMs,
    retryBaseDelayMs,
    sleepImpl,
    randomImpl,
  })
  const index = await ensureIndex(client, indexName, {
    createIfMissing: !planOnly,
  })
  validateIndexConfiguration(index, indexName)

  const currentIds = await listVectorIds(client, indexName, {
    logger,
    sleepImpl,
    retryBaseDelayMs,
  })
  validateExistingVectorIds(currentIds, indexName)
  const expectedIds = new Set(corpus.chunks.map(({ id }) => id))
  const chunksToUpsert = corpus.chunks.filter(({ id }) => !currentIds.has(id))
  const idsToDelete = [...currentIds].filter((id) => !expectedIds.has(id))
  const deleteRatio =
    currentIds.size === 0 ? 0 : idsToDelete.length / currentIds.size
  const requiresLargeDeleteApproval =
    idsToDelete.length > 0 && deleteRatio > MAX_DELETE_RATIO
  const planId = createPlanId({
    indexName,
    corpusVersion: corpus.version,
    currentIds,
    expectedIds,
  })

  logger.log(
    JSON.stringify({
      event: 'vectorize_sync_plan',
      indexName,
      corpusVersion: corpus.version,
      current: currentIds.size,
      expected: expectedIds.size,
      upsert: chunksToUpsert.length,
      delete: idsToDelete.length,
      deleteRatio,
      requiresLargeDeleteApproval,
      planId,
    }),
  )

  if (planOnly) {
    return {
      dryRun: false,
      planOnly: true,
      indexName,
      corpusVersion: corpus.version,
      current: currentIds.size,
      expected: expectedIds.size,
      upsert: chunksToUpsert.length,
      delete: idsToDelete.length,
      deleteRatio,
      requiresLargeDeleteApproval,
      planId,
    }
  }

  validateExpectedPlan({
    actualDeleteCount: idsToDelete.length,
    actualPlanId: planId,
    expectedDeleteCount,
    expectedPlanId,
  })
  validateDeletePlan({
    currentCount: currentIds.size,
    deleteCount: idsToDelete.length,
    allowLargeDelete,
  })

  if (chunksToUpsert.length > 0 && !openAiApiKey) {
    throw new Error('OPENAI_API_KEY is required to create embeddings.')
  }
  const openAiClient =
    chunksToUpsert.length > 0
      ? createOpenAiClient({
          apiKey: openAiApiKey,
          fetchImpl,
          requestTimeoutMs,
          retryBaseDelayMs,
          sleepImpl,
          randomImpl,
        })
      : null

  const mutationIds = []
  for (const chunkBatch of batches(chunksToUpsert, EMBEDDING_BATCH_SIZE)) {
    const embeddings = await createEmbeddings(openAiClient, chunkBatch)

    for (const vectorBatch of batches(
      chunkBatch.map((chunk, index) => ({
        id: chunk.id,
        values: embeddings[index],
        namespace: chunk.namespace,
        metadata: chunk.metadata,
      })),
      UPSERT_BATCH_SIZE,
    )) {
      const mutationId = await upsertVectors(client, indexName, vectorBatch)
      mutationIds.push(mutationId)
    }
  }

  for (const idBatch of batches(idsToDelete, DELETE_BATCH_SIZE)) {
    const mutationId = await deleteVectors(client, indexName, idBatch)
    mutationIds.push(mutationId)
  }

  const lastMutationId = mutationIds.at(-1)
  let verified = false
  if (waitForMutations && lastMutationId) {
    await waitForMutation(client, indexName, lastMutationId)
  }
  if (waitForMutations && verifyAfterMutation) {
    const reconciledIds = await listVectorIds(client, indexName, {
      logger,
      sleepImpl,
      retryBaseDelayMs,
    })
    validateExistingVectorIds(reconciledIds, indexName)
    validateReconciliation(reconciledIds, expectedIds, indexName)
    verified = true
  }

  const result = {
    dryRun: false,
    indexName,
    corpusVersion: corpus.version,
    existing: currentIds.size,
    upserted: chunksToUpsert.length,
    deleted: idsToDelete.length,
    mutationId: lastMutationId || null,
    verified,
  }
  logger.log(JSON.stringify({ event: 'vectorize_sync_complete', ...result }))
  return result
}

export function validateCorpus(corpus) {
  if (
    corpus?.embedding?.model !== SEARCH_EMBEDDING_MODEL ||
    corpus?.embedding?.dimensions !== SEARCH_EMBEDDING_DIMENSIONS ||
    corpus?.embedding?.metric !== SEARCH_DISTANCE_METRIC
  ) {
    throw new Error(
      `Corpus embedding configuration must be ${SEARCH_EMBEDDING_MODEL}, ${SEARCH_EMBEDDING_DIMENSIONS} dimensions, ${SEARCH_DISTANCE_METRIC}.`,
    )
  }
  if (!Array.isArray(corpus.chunks)) {
    throw new Error('Corpus chunks must be an array.')
  }
  if (
    !Number.isInteger(corpus.sourceCount) ||
    corpus.sourceCount < MIN_SOURCE_COUNT
  ) {
    throw new Error(
      `Corpus must contain at least ${MIN_SOURCE_COUNT} source documents.`,
    )
  }
  if (
    !Number.isInteger(corpus.vectorCount) ||
    corpus.chunks.length !== corpus.vectorCount ||
    corpus.chunks.length < MIN_VECTOR_COUNT ||
    corpus.chunks.length > SEARCH_VECTOR_LIMIT
  ) {
    throw new Error(
      `Corpus vector count must be between ${MIN_VECTOR_COUNT} and ${SEARCH_VECTOR_LIMIT}.`,
    )
  }

  const ids = new Set()
  const actualLocaleCounts = Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, 0]),
  )
  const actualLocaleSources = Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, new Set()]),
  )
  for (const chunk of corpus.chunks) {
    if (
      typeof chunk?.id !== 'string' ||
      !MANAGED_VECTOR_ID_PATTERN.test(chunk.id) ||
      !SUPPORTED_LOCALES.includes(chunk?.namespace) ||
      typeof chunk?.text !== 'string' ||
      !chunk.metadata ||
      typeof chunk.metadata.url !== 'string' ||
      !chunk.metadata.url.startsWith('/') ||
      chunk.metadata.locale !== chunk.namespace ||
      !urlMatchesLocale(chunk.metadata.url, chunk.namespace)
    ) {
      throw new Error('Corpus contains an invalid chunk.')
    }
    if (ids.has(chunk.id)) throw new Error(`Duplicate vector id: ${chunk.id}`)
    ids.add(chunk.id)
    actualLocaleCounts[chunk.namespace] += 1
    actualLocaleSources[chunk.namespace].add(chunk.metadata.url)
  }

  const actualSourceCount = Object.values(actualLocaleSources).reduce(
    (total, urls) => total + urls.size,
    0,
  )
  if (corpus.sourceCount !== actualSourceCount) {
    throw new Error(
      `Corpus sourceCount must match ${actualSourceCount} unique source URLs.`,
    )
  }

  for (const locale of SUPPORTED_LOCALES) {
    const declaredCount = corpus?.localeCounts?.[locale]
    const actualCount = actualLocaleCounts[locale]
    const actualSourceCountForLocale = actualLocaleSources[locale].size
    const minimumVectorCount = MIN_LOCALE_VECTOR_COUNTS[locale]
    if (
      !Number.isInteger(declaredCount) ||
      declaredCount !== actualCount ||
      actualCount < minimumVectorCount
    ) {
      throw new Error(
        `Corpus locale ${locale} must contain at least ${minimumVectorCount} vectors and match localeCounts.`,
      )
    }
    if (actualSourceCountForLocale < MIN_LOCALE_SOURCE_COUNT) {
      throw new Error(
        `Corpus locale ${locale} must contain at least ${MIN_LOCALE_SOURCE_COUNT} unique source URLs.`,
      )
    }
  }
}

function urlMatchesLocale(url, locale) {
  const pathname = url.split(/[?#]/, 1)[0]
  const localizedPrefixes = SUPPORTED_LOCALES.filter(
    (candidate) => candidate !== 'ja',
  ).map((candidate) => `/${candidate}/`)

  if (locale === 'ja') {
    return !localizedPrefixes.some(
      (prefix) =>
        pathname === prefix.slice(0, -1) || pathname.startsWith(prefix),
    )
  }

  const expectedPrefix = `/${locale}/`
  return (
    pathname === expectedPrefix.slice(0, -1) ||
    pathname.startsWith(expectedPrefix)
  )
}

function createPlanId({ indexName, corpusVersion, currentIds, expectedIds }) {
  return createHash('sha256')
    .update(
      JSON.stringify({
        schema: 'acecore-vectorize-plan-v1',
        indexName,
        corpusVersion,
        currentIds: [...currentIds].sort(),
        expectedIds: [...expectedIds].sort(),
      }),
    )
    .digest('hex')
}

function validateExpectedPlan({
  actualDeleteCount,
  actualPlanId,
  expectedDeleteCount,
  expectedPlanId,
}) {
  if (
    expectedDeleteCount !== undefined &&
    actualDeleteCount !== expectedDeleteCount
  ) {
    throw new Error(
      `Vectorize delete count changed after approval: expected ${expectedDeleteCount}, got ${actualDeleteCount}.`,
    )
  }

  if (expectedPlanId !== undefined && actualPlanId !== expectedPlanId) {
    throw new Error(
      `Vectorize plan changed after approval: expected ${expectedPlanId}, got ${actualPlanId}.`,
    )
  }
}

function validateIndexName(indexName, { required }) {
  if (!indexName && !required) return
  if (!ALLOWED_INDEX_NAMES.has(indexName)) {
    throw new Error(
      `VECTORIZE_INDEX_NAME must be one of: ${[...ALLOWED_INDEX_NAMES].join(', ')}.`,
    )
  }
}

function validateExistingVectorIds(ids, indexName) {
  const unmanagedIds = [...ids].filter(
    (id) => !MANAGED_VECTOR_ID_PATTERN.test(id),
  )
  if (unmanagedIds.length === 0) return

  throw new Error(
    `Vectorize index ${indexName} contains ${unmanagedIds.length} unmanaged vector id(s); refusing to mutate it.`,
  )
}

function validateDeletePlan({ currentCount, deleteCount, allowLargeDelete }) {
  if (
    deleteCount === 0 ||
    currentCount === 0 ||
    deleteCount / currentCount <= MAX_DELETE_RATIO ||
    allowLargeDelete
  ) {
    return
  }

  const percentage = ((deleteCount / currentCount) * 100).toFixed(1)
  throw new Error(
    `Refusing to delete ${deleteCount}/${currentCount} vectors (${percentage}%); pass --allow-large-delete to override the ${MAX_DELETE_RATIO * 100}% safety limit.`,
  )
}

function validateReconciliation(actualIds, expectedIds, indexName) {
  const missingIds = [...expectedIds].filter((id) => !actualIds.has(id))
  const unexpectedIds = [...actualIds].filter((id) => !expectedIds.has(id))

  if (missingIds.length === 0 && unexpectedIds.length === 0) return

  throw new Error(
    `Vectorize index ${indexName} did not converge: ${missingIds.length} missing and ${unexpectedIds.length} unexpected vector(s).`,
  )
}

export function extractEmbeddingData(payload, expectedCount) {
  const data = payload?.data

  if (!Array.isArray(data) || data.length !== expectedCount) {
    throw new Error(
      `OpenAI returned ${Array.isArray(data) ? data.length : 0} embeddings; expected ${expectedCount}.`,
    )
  }

  const embeddings = Array(expectedCount)
  const indexes = new Set()
  for (const item of data) {
    const index = item?.index
    const values = item?.embedding
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= expectedCount ||
      indexes.has(index) ||
      !Array.isArray(values) ||
      values.length !== SEARCH_EMBEDDING_DIMENSIONS ||
      values.some((value) => !Number.isFinite(value))
    ) {
      throw new Error(
        `OpenAI embedding response must contain unique indexes and ${SEARCH_EMBEDDING_DIMENSIONS} finite values.`,
      )
    }
    indexes.add(index)
    embeddings[index] = values
  }

  return embeddings
}

function createCloudflareClient({
  accountId,
  apiToken,
  fetchImpl,
  requestTimeoutMs,
  retryBaseDelayMs,
  sleepImpl,
  randomImpl,
}) {
  const accountBase = `${API_BASE_URL}/accounts/${encodeURIComponent(accountId)}`

  return {
    async request(path, init = {}) {
      const headers = new Headers(init.headers)
      headers.set('Authorization', `Bearer ${apiToken}`)
      headers.set('Accept', 'application/json')

      for (let attempt = 0; attempt <= MAX_REQUEST_RETRIES; attempt += 1) {
        const timeoutController = new AbortController()
        const timeout = setTimeout(
          () => timeoutController.abort(new Error('Request timed out.')),
          requestTimeoutMs,
        )
        try {
          const response = await fetchImpl(`${accountBase}${path}`, {
            ...init,
            headers,
            signal: timeoutController.signal,
          })

          if (
            isRetryableStatus(response.status) &&
            attempt < MAX_REQUEST_RETRIES
          ) {
            await response.body?.cancel().catch(() => {})
            clearTimeout(timeout)
            await sleepImpl(
              getRetryDelay({
                attempt,
                retryAfter: response.headers.get('Retry-After'),
                retryBaseDelayMs,
                randomImpl,
              }),
            )
            continue
          }

          const payload = await readJsonResponse(response)

          if (!response.ok || payload?.success === false) {
            const message =
              payload?.errors
                ?.map((error) => error?.message)
                .filter(Boolean)
                .join('; ') ||
              `Cloudflare API request failed with ${response.status}.`
            throw new CloudflareApiError(message, response.status)
          }

          return payload
        } catch (error) {
          if (
            attempt >= MAX_REQUEST_RETRIES ||
            !isRetryableNetworkError(error, timeoutController.signal.aborted)
          ) {
            throw error
          }

          clearTimeout(timeout)
          await sleepImpl(
            getRetryDelay({
              attempt,
              retryBaseDelayMs,
              randomImpl,
            }),
          )
        } finally {
          clearTimeout(timeout)
        }
      }

      throw new Error('Cloudflare API request exhausted all retries.')
    },
  }
}

function createOpenAiClient({
  apiKey,
  fetchImpl,
  requestTimeoutMs,
  retryBaseDelayMs,
  sleepImpl,
  randomImpl,
}) {
  return {
    async request(path, init = {}) {
      const headers = new Headers(init.headers)
      headers.set('Authorization', `Bearer ${apiKey}`)
      headers.set('Accept', 'application/json')

      for (let attempt = 0; attempt <= MAX_REQUEST_RETRIES; attempt += 1) {
        const timeoutController = new AbortController()
        const timeout = setTimeout(
          () => timeoutController.abort(new Error('Request timed out.')),
          requestTimeoutMs,
        )

        try {
          const response = await fetchImpl(`${OPENAI_API_BASE_URL}${path}`, {
            ...init,
            headers,
            signal: timeoutController.signal,
          })

          if (
            isRetryableStatus(response.status) &&
            attempt < MAX_REQUEST_RETRIES
          ) {
            await response.body?.cancel().catch(() => {})
            clearTimeout(timeout)
            await sleepImpl(
              getRetryDelay({
                attempt,
                retryAfter: response.headers.get('Retry-After'),
                retryBaseDelayMs,
                randomImpl,
              }),
            )
            continue
          }

          if (!response.ok) {
            await response.body?.cancel().catch(() => {})
            throw new OpenAiApiError(response.status)
          }

          return await readJsonResponse(response, 'OpenAI')
        } catch (error) {
          if (
            attempt >= MAX_REQUEST_RETRIES ||
            error instanceof OpenAiApiError ||
            !isRetryableNetworkError(error, timeoutController.signal.aborted)
          ) {
            throw error
          }

          clearTimeout(timeout)
          await sleepImpl(
            getRetryDelay({
              attempt,
              retryBaseDelayMs,
              randomImpl,
            }),
          )
        } finally {
          clearTimeout(timeout)
        }
      }

      throw new Error('OpenAI API request exhausted all retries.')
    },
  }
}

function isRetryableStatus(status) {
  return status === 429 || status >= 500
}

function isRetryableNetworkError(error, timedOut) {
  return (
    timedOut ||
    error instanceof TypeError ||
    error?.name === 'AbortError' ||
    error?.name === 'TimeoutError'
  )
}

function getRetryDelay({ attempt, retryAfter, retryBaseDelayMs, randomImpl }) {
  const exponentialDelay = retryBaseDelayMs * 2 ** attempt
  const jitter = randomImpl() * retryBaseDelayMs
  const retryAfterDelay = parseRetryAfter(retryAfter)
  return Math.max(exponentialDelay + jitter, retryAfterDelay)
}

function parseRetryAfter(value) {
  if (!value) return 0

  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000
  }

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : 0
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

async function ensureIndex(client, indexName, { createIfMissing = true } = {}) {
  const encodedName = encodeURIComponent(indexName)
  try {
    const payload = await client.request(`/vectorize/v2/indexes/${encodedName}`)
    return payload.result
  } catch (error) {
    if (!(error instanceof CloudflareApiError) || error.status !== 404) {
      throw error
    }
  }

  if (!createIfMissing) {
    throw new Error(
      `Vectorize index ${indexName} does not exist; plan mode is read-only and will not create it.`,
    )
  }

  const payload = await client.request('/vectorize/v2/indexes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: indexName,
      description:
        'Acecore site semantic search (OpenAI text-embedding-3-large, 1536 dimensions)',
      config: {
        dimensions: SEARCH_EMBEDDING_DIMENSIONS,
        metric: SEARCH_DISTANCE_METRIC,
      },
    }),
  })
  return payload.result
}

function validateIndexConfiguration(index, indexName) {
  const config = index?.config
  if (
    config?.dimensions !== SEARCH_EMBEDDING_DIMENSIONS ||
    config?.metric !== SEARCH_DISTANCE_METRIC
  ) {
    throw new Error(
      `Vectorize index ${indexName} must use ${SEARCH_EMBEDDING_DIMENSIONS} dimensions and ${SEARCH_DISTANCE_METRIC}.`,
    )
  }
}

async function listVectorIds(
  client,
  indexName,
  { logger, sleepImpl, retryBaseDelayMs },
) {
  for (let restart = 0; restart <= MAX_LIST_CURSOR_RESTARTS; restart += 1) {
    try {
      return await listVectorIdsOnce(client, indexName)
    } catch (error) {
      if (
        restart >= MAX_LIST_CURSOR_RESTARTS ||
        !(error instanceof CloudflareApiError) ||
        error.status !== 400 ||
        !/cursor/i.test(error.message)
      ) {
        throw error
      }

      logger.log(
        JSON.stringify({
          event: 'vectorize_list_cursor_restart',
          indexName,
          restart: restart + 1,
        }),
      )
      await sleepImpl(retryBaseDelayMs * 2 ** restart)
    }
  }

  throw new Error('Vectorize list pagination exhausted all cursor restarts.')
}

async function listVectorIdsOnce(client, indexName) {
  const ids = new Set()
  const seenCursors = new Set()
  let cursor = ''

  do {
    const query = new URLSearchParams({ count: String(LIST_BATCH_SIZE) })
    if (cursor) query.set('cursor', cursor)
    const payload = await client.request(
      `/vectorize/v2/indexes/${encodeURIComponent(indexName)}/list?${query}`,
    )
    const result = payload.result || {}

    for (const vector of result.vectors || []) {
      if (typeof vector?.id !== 'string') {
        throw new Error(
          `Vectorize index ${indexName} returned a vector without a valid id; refusing to mutate it.`,
        )
      }
      ids.add(vector.id)
    }

    if (!result.isTruncated) {
      cursor = ''
      continue
    }

    const nextCursor = result.nextCursor
    if (typeof nextCursor !== 'string' || nextCursor.trim() === '') {
      throw new Error(
        `Vectorize index ${indexName} returned a truncated page without a valid nextCursor; refusing to treat the list as complete.`,
      )
    }
    if (seenCursors.has(nextCursor)) {
      throw new Error(
        `Vectorize index ${indexName} repeated a list cursor; refusing to treat the list as complete.`,
      )
    }

    seenCursors.add(nextCursor)
    cursor = nextCursor
  } while (cursor)

  return ids
}

async function createEmbeddings(client, chunks) {
  const payload = await client.request('/embeddings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: SEARCH_EMBEDDING_MODEL,
      input: chunks.map(({ text }) => text),
      dimensions: SEARCH_EMBEDDING_DIMENSIONS,
      encoding_format: 'float',
    }),
  })
  if (payload?.model !== SEARCH_EMBEDDING_MODEL) {
    throw new Error(`OpenAI response model must be ${SEARCH_EMBEDDING_MODEL}.`)
  }
  return extractEmbeddingData(payload, chunks.length)
}

async function upsertVectors(client, indexName, vectors) {
  const ndjson = vectors.map((vector) => JSON.stringify(vector)).join('\n')
  const form = new FormData()
  form.set(
    'vectors',
    new Blob([`${ndjson}\n`], { type: 'application/x-ndjson' }),
    'vectors.ndjson',
  )
  const payload = await client.request(
    `/vectorize/v2/indexes/${encodeURIComponent(indexName)}/upsert`,
    {
      method: 'POST',
      body: form,
    },
  )
  return getMutationId(payload)
}

async function deleteVectors(client, indexName, ids) {
  const payload = await client.request(
    `/vectorize/v2/indexes/${encodeURIComponent(indexName)}/delete_by_ids`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    },
  )
  return getMutationId(payload)
}

function getMutationId(payload) {
  const value = payload?.result?.mutationId ?? payload?.mutationId
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(
      'Cloudflare Vectorize mutation response did not include a valid mutationId.',
    )
  }
  return value
}

async function waitForMutation(client, indexName, mutationId) {
  const deadline = Date.now() + MUTATION_WAIT_TIMEOUT_MS

  while (Date.now() < deadline) {
    const payload = await client.request(
      `/vectorize/v2/indexes/${encodeURIComponent(indexName)}/info`,
    )
    if (payload?.result?.processedUpToMutation === mutationId) return
    await new Promise((resolve) =>
      setTimeout(resolve, MUTATION_POLL_INTERVAL_MS),
    )
  }

  throw new Error(`Vectorize mutation ${mutationId} was not queryable in time.`)
}

async function readJsonResponse(response, provider = 'Cloudflare') {
  const declaredLength = Number(response.headers.get('Content-Length'))
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_API_RESPONSE_BYTES
  ) {
    await response.body?.cancel().catch(() => {})
    throw new Error(
      `${provider} API response exceeded ${MAX_API_RESPONSE_BYTES} bytes.`,
    )
  }

  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error(`${provider} API returned an unreadable response body.`)
  }

  const decoder = new TextDecoder()
  let bytesRead = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytesRead += value.byteLength
      if (bytesRead > MAX_API_RESPONSE_BYTES) {
        await reader.cancel().catch(() => {})
        throw new Error(
          `${provider} API response exceeded ${MAX_API_RESPONSE_BYTES} bytes.`,
        )
      }
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
  } finally {
    reader.releaseLock()
  }

  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(
      `${provider} API returned a non-JSON response with ${response.status}.`,
    )
  }
}

function batches(items, size) {
  const result = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

function parseArguments(argv) {
  const options = {
    dryRun: false,
    planOnly: false,
    waitForMutations: true,
    allowLargeDelete: false,
    expectedDeleteCount: undefined,
    expectedPlanId: undefined,
    indexName: process.env.VECTORIZE_INDEX_NAME,
    corpusFile: DEFAULT_CORPUS_FILE,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--dry-run') options.dryRun = true
    else if (argument === '--plan') options.planOnly = true
    else if (argument === '--no-wait') options.waitForMutations = false
    else if (argument === '--allow-large-delete') {
      options.allowLargeDelete = true
    } else if (argument === '--expected-delete-count') {
      const value = argv[++index]
      if (!/^(0|[1-9][0-9]*)$/.test(value || '')) {
        throw new Error(
          '--expected-delete-count must be a non-negative integer.',
        )
      }
      options.expectedDeleteCount = Number(value)
    } else if (argument === '--expected-plan-id') {
      const value = argv[++index]
      if (!/^[0-9a-f]{64}$/.test(value || '')) {
        throw new Error('--expected-plan-id must be a SHA-256 hex value.')
      }
      options.expectedPlanId = value
    } else if (argument === '--index') options.indexName = argv[++index]
    else if (argument === '--corpus') {
      options.corpusFile = resolve(argv[++index])
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }

  return options
}

function isDirectExecution() {
  if (!process.argv[1]) return false
  return (
    resolve(process.argv[1]).toLowerCase() ===
    fileURLToPath(import.meta.url).toLowerCase()
  )
}

if (isDirectExecution()) {
  await syncVectorize(parseArguments(process.argv.slice(2)))
}
