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

type JsonRecord = Record<string, unknown>
type Locale = (typeof SUPPORTED_LOCALES)[number]
type LocaleCounts = Record<Locale, number>
type FetchImplementation = typeof globalThis.fetch
type SleepImplementation = (milliseconds: number) => Promise<void>
type RandomImplementation = () => number

interface Logger {
  log(message: string): void
}

interface EmbeddingConfiguration {
  model: string
  dimensions: number
  metric: string
}

type VectorMetadata = JsonRecord & {
  url: string
  locale: Locale
}

interface CorpusChunk {
  id: string
  namespace: Locale
  text: string
  metadata: VectorMetadata
}

interface SearchCorpus {
  version: string
  embedding: EmbeddingConfiguration
  chunks: CorpusChunk[]
  sourceCount: number
  vectorCount: number
  localeCounts: LocaleCounts
}

interface VectorizeVector {
  id: string
  values: number[]
  namespace: Locale
  metadata: VectorMetadata
}

interface QueryCanary {
  id: string
  vector: number[]
}

interface ApiClient {
  request(path: string, init?: RequestInit): Promise<JsonRecord>
}

interface SyncVectorizeOptions {
  accountId?: string
  apiToken?: string
  openAiApiKey?: string
  indexName?: string
  corpusFile?: string
  dryRun?: boolean
  planOnly?: boolean
  waitForMutations?: boolean
  verifyAfterMutation?: boolean
  allowLargeDelete?: boolean
  expectedDeleteCount?: number
  expectedPlanId?: string
  fetchImpl?: FetchImplementation
  requestTimeoutMs?: number
  retryBaseDelayMs?: number
  sleepImpl?: SleepImplementation
  randomImpl?: RandomImplementation
  logger?: Logger
}

interface DryRunResult {
  dryRun: true
  indexName: string | null
  corpusVersion: string
  vectors: number
  locales: LocaleCounts
}

interface PlanResult {
  dryRun: false
  planOnly: true
  indexName: string
  corpusVersion: string
  current: number
  expected: number
  upsert: number
  delete: number
  deleteRatio: number
  requiresLargeDeleteApproval: boolean
  planId: string
}

interface CompleteResult {
  dryRun: false
  indexName: string
  corpusVersion: string
  existing: number
  upserted: number
  deleted: number
  mutationId: string | null
  verified: boolean
  queryVerified: boolean
}

type SyncVectorizeResult = DryRunResult | PlanResult | CompleteResult

interface ParsedArguments {
  dryRun: boolean
  planOnly: boolean
  waitForMutations: boolean
  allowLargeDelete: boolean
  expectedDeleteCount?: number
  expectedPlanId?: string
  indexName?: string
  corpusFile: string
}

const API_BASE_URL = 'https://api.cloudflare.com/client/v4'
const OPENAI_API_BASE_URL = 'https://api.openai.com/v1'
const DEFAULT_CORPUS_FILE = resolve('.vectorize/corpus.json')
const EMBEDDING_BATCH_SIZE = 32
const UPSERT_BATCH_SIZE = 200
const DELETE_BATCH_SIZE = 100
const LIST_BATCH_SIZE = 1000
const MUTATION_WAIT_TIMEOUT_MS = 180_000
const MUTATION_POLL_INTERVAL_MS = 5_000
const RECONCILIATION_MAX_ATTEMPTS = 13
const RECONCILIATION_POLL_INTERVAL_MS = 5_000
const REQUEST_TIMEOUT_MS = 30_000
const MAX_API_RESPONSE_BYTES = 8 * 1024 * 1024
const MAX_REQUEST_RETRIES = 5
const RETRY_BASE_DELAY_MS = 500
const MAX_LIST_CURSOR_RESTARTS = 3
const MAX_DELETE_RATIO = 0.2
const MIN_SOURCE_COUNT = 90
const MIN_VECTOR_COUNT = 150
const MIN_LOCALE_SOURCE_COUNT = 10
const MIN_LOCALE_VECTOR_COUNTS: Readonly<LocaleCounts> = Object.freeze({
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
const PRODUCTION_INDEX_NAME = 'acecore-net-search-openai-1536-production-v3'
const ALLOWED_INDEX_NAMES = new Set<string>([PRODUCTION_INDEX_NAME])
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

class CloudflareApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'CloudflareApiError'
    this.status = status
  }
}

class OpenAiApiError extends Error {
  readonly status: number

  constructor(status: number) {
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
}: SyncVectorizeOptions = {}): Promise<SyncVectorizeResult> {
  const parsedCorpus: unknown = JSON.parse(await readFile(corpusFile, 'utf8'))
  validateCorpus(parsedCorpus)
  const corpus = parsedCorpus

  if (dryRun) {
    validateIndexName(indexName, { required: false })
    const result: DryRunResult = {
      dryRun: true,
      indexName: indexName || null,
      corpusVersion: corpus.version,
      vectors: corpus.vectorCount,
      locales: corpus.localeCounts,
    }
    logger.log(JSON.stringify({ event: 'vectorize_sync_dry_run', ...result }))
    return result
  }

  const credentials = requireSyncCredentials({
    accountId,
    apiToken,
    indexName,
  })
  validateIndexName(credentials.indexName, { required: true })

  const client = createCloudflareClient({
    accountId: credentials.accountId,
    apiToken: credentials.apiToken,
    fetchImpl,
    requestTimeoutMs,
    retryBaseDelayMs,
    sleepImpl,
    randomImpl,
  })
  const index = await ensureIndex(client, credentials.indexName, {
    createIfMissing: !planOnly,
  })
  validateIndexConfiguration(index, credentials.indexName)

  const currentIds = await listVectorIds(client, credentials.indexName, {
    logger,
    sleepImpl,
    retryBaseDelayMs,
  })
  validateExistingVectorIds(currentIds, credentials.indexName)
  const expectedIds = new Set(corpus.chunks.map(({ id }) => id))
  const chunksToUpsert = corpus.chunks.filter(({ id }) => !currentIds.has(id))
  const idsToDelete = [...currentIds].filter((id) => !expectedIds.has(id))
  const deleteRatio =
    currentIds.size === 0 ? 0 : idsToDelete.length / currentIds.size
  const requiresLargeDeleteApproval =
    idsToDelete.length > 0 && deleteRatio > MAX_DELETE_RATIO
  const planId = createPlanId({
    indexName: credentials.indexName,
    corpusVersion: corpus.version,
    currentIds,
    expectedIds,
  })

  logger.log(
    JSON.stringify({
      event: 'vectorize_sync_plan',
      indexName: credentials.indexName,
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
      indexName: credentials.indexName,
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

  const mutationIds: string[] = []
  let queryCanary: QueryCanary | null = null
  if (chunksToUpsert.length > 0) {
    if (!openAiApiKey) {
      throw new Error('OPENAI_API_KEY is required to create embeddings.')
    }
    const openAiClient = createOpenAiClient({
      apiKey: openAiApiKey,
      fetchImpl,
      requestTimeoutMs,
      retryBaseDelayMs,
      sleepImpl,
      randomImpl,
    })

    for (const chunkBatch of batches(chunksToUpsert, EMBEDDING_BATCH_SIZE)) {
      const embeddings = await createEmbeddings(openAiClient, chunkBatch)

      if (!queryCanary) {
        const canaryChunk = chunkBatch[0]
        const canaryEmbedding = embeddings[0]
        if (!canaryChunk || !canaryEmbedding) {
          throw new Error(
            'Vectorize upsert batch did not contain a query canary.',
          )
        }
        queryCanary = {
          id: canaryChunk.id,
          vector: canaryEmbedding,
        }
      }

      const vectors: VectorizeVector[] = chunkBatch.map((chunk, index) => {
        const values = embeddings[index]
        if (!values) {
          throw new Error(
            'OpenAI embedding response did not match its input batch.',
          )
        }
        return {
          id: chunk.id,
          values,
          namespace: chunk.namespace,
          metadata: chunk.metadata,
        }
      })
      for (const vectorBatch of batches(vectors, UPSERT_BATCH_SIZE)) {
        const mutationId = await upsertVectors(
          client,
          credentials.indexName,
          vectorBatch,
        )
        mutationIds.push(mutationId)
      }
    }
  }

  for (const idBatch of batches(idsToDelete, DELETE_BATCH_SIZE)) {
    const mutationId = await deleteVectors(
      client,
      credentials.indexName,
      idBatch,
    )
    mutationIds.push(mutationId)
  }

  const lastMutationId = mutationIds.at(-1)
  let verified = false
  let queryVerified = false
  if (waitForMutations && lastMutationId) {
    await waitForMutation(client, credentials.indexName, lastMutationId)
  }
  if (waitForMutations && verifyAfterMutation) {
    await waitForReconciliation(client, credentials.indexName, expectedIds, {
      logger,
      sleepImpl,
      retryBaseDelayMs,
      maxAttempts: lastMutationId ? RECONCILIATION_MAX_ATTEMPTS : 1,
    })
    verified = true
    if (queryCanary) {
      await verifyQueryCanary(client, credentials.indexName, queryCanary)
      queryVerified = true
    }
  }

  const result: CompleteResult = {
    dryRun: false,
    indexName: credentials.indexName,
    corpusVersion: corpus.version,
    existing: currentIds.size,
    upserted: chunksToUpsert.length,
    deleted: idsToDelete.length,
    mutationId: lastMutationId || null,
    verified,
    queryVerified,
  }
  logger.log(JSON.stringify({ event: 'vectorize_sync_complete', ...result }))
  return result
}

export function validateCorpus(
  corpus: unknown,
): asserts corpus is SearchCorpus {
  if (!isRecord(corpus)) {
    throw new Error('Corpus must be a JSON object.')
  }
  if (!isEmbeddingConfiguration(corpus.embedding)) {
    throw new Error(
      `Corpus embedding configuration must be ${SEARCH_EMBEDDING_MODEL}, ${SEARCH_EMBEDDING_DIMENSIONS} dimensions, ${SEARCH_DISTANCE_METRIC}.`,
    )
  }
  if (typeof corpus.version !== 'string' || !corpus.version.trim()) {
    throw new Error('Corpus version must be a non-empty string.')
  }

  const chunks = corpus.chunks
  if (!Array.isArray(chunks)) {
    throw new Error('Corpus chunks must be an array.')
  }
  const sourceCount = corpus.sourceCount
  if (!isInteger(sourceCount) || sourceCount < MIN_SOURCE_COUNT) {
    throw new Error(
      `Corpus must contain at least ${MIN_SOURCE_COUNT} source documents.`,
    )
  }
  const vectorCount = corpus.vectorCount
  if (
    !isInteger(vectorCount) ||
    chunks.length !== vectorCount ||
    chunks.length < MIN_VECTOR_COUNT ||
    chunks.length > SEARCH_VECTOR_LIMIT
  ) {
    throw new Error(
      `Corpus vector count must be between ${MIN_VECTOR_COUNT} and ${SEARCH_VECTOR_LIMIT}.`,
    )
  }
  const localeCounts = corpus.localeCounts
  if (!isRecord(localeCounts)) {
    throw new Error('Corpus localeCounts must be an object.')
  }

  const ids = new Set<string>()
  const actualLocaleCounts: LocaleCounts = {
    ja: 0,
    en: 0,
    'zh-cn': 0,
    es: 0,
    pt: 0,
    fr: 0,
    ko: 0,
    de: 0,
    ru: 0,
  }
  const actualLocaleSources: Record<Locale, Set<string>> = {
    ja: new Set(),
    en: new Set(),
    'zh-cn': new Set(),
    es: new Set(),
    pt: new Set(),
    fr: new Set(),
    ko: new Set(),
    de: new Set(),
    ru: new Set(),
  }
  for (const chunk of chunks) {
    if (
      !isCorpusChunk(chunk) ||
      !MANAGED_VECTOR_ID_PATTERN.test(chunk.id) ||
      !chunk.metadata.url.startsWith('/') ||
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
  if (sourceCount !== actualSourceCount) {
    throw new Error(
      `Corpus sourceCount must match ${actualSourceCount} unique source URLs.`,
    )
  }

  for (const locale of SUPPORTED_LOCALES) {
    const declaredCount = localeCounts[locale]
    const actualCount = actualLocaleCounts[locale]
    const actualSourceCountForLocale = actualLocaleSources[locale].size
    const minimumVectorCount = MIN_LOCALE_VECTOR_COUNTS[locale]
    if (
      !isInteger(declaredCount) ||
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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value)
}

function isLocale(value: unknown): value is Locale {
  return (
    typeof value === 'string' &&
    SUPPORTED_LOCALES.some((locale) => locale === value)
  )
}

function isEmbeddingConfiguration(
  value: unknown,
): value is EmbeddingConfiguration {
  return (
    isRecord(value) &&
    value.model === SEARCH_EMBEDDING_MODEL &&
    value.dimensions === SEARCH_EMBEDDING_DIMENSIONS &&
    value.metric === SEARCH_DISTANCE_METRIC
  )
}

function isVectorMetadata(
  value: unknown,
  namespace: Locale,
): value is VectorMetadata {
  return (
    isRecord(value) &&
    typeof value.url === 'string' &&
    value.locale === namespace
  )
}

function isCorpusChunk(value: unknown): value is CorpusChunk {
  if (!isRecord(value)) return false

  return (
    typeof value.id === 'string' &&
    isLocale(value.namespace) &&
    typeof value.text === 'string' &&
    isVectorMetadata(value.metadata, value.namespace)
  )
}

function getRequiredResponseResult(
  payload: JsonRecord,
  provider: string,
): JsonRecord {
  if (!isRecord(payload.result)) {
    throw new Error(
      `${provider} API response did not include a valid result object.`,
    )
  }
  return payload.result
}

function isFiniteNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === 'number' && Number.isFinite(item))
  )
}

function urlMatchesLocale(url: string, locale: Locale): boolean {
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

function createPlanId({
  indexName,
  corpusVersion,
  currentIds,
  expectedIds,
}: {
  indexName: string
  corpusVersion: string
  currentIds: ReadonlySet<string>
  expectedIds: ReadonlySet<string>
}): string {
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
}: {
  actualDeleteCount: number
  actualPlanId: string
  expectedDeleteCount?: number
  expectedPlanId?: string
}): void {
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

function validateIndexName(
  indexName: string | undefined,
  { required }: { required: boolean },
): void {
  if (!indexName) {
    if (!required) return
    throw new Error(
      `VECTORIZE_INDEX_NAME must be one of: ${[...ALLOWED_INDEX_NAMES].join(', ')}.`,
    )
  }
  if (!ALLOWED_INDEX_NAMES.has(indexName)) {
    throw new Error(
      `VECTORIZE_INDEX_NAME must be one of: ${[...ALLOWED_INDEX_NAMES].join(', ')}.`,
    )
  }
}

function requireSyncCredentials({
  accountId,
  apiToken,
  indexName,
}: {
  accountId?: string
  apiToken?: string
  indexName?: string
}): { accountId: string; apiToken: string; indexName: string } {
  if (!accountId || !apiToken || !indexName) {
    throw new Error(
      'CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, and VECTORIZE_INDEX_NAME are required.',
    )
  }

  return { accountId, apiToken, indexName }
}

function validateExistingVectorIds(
  ids: ReadonlySet<string>,
  indexName: string,
): void {
  const unmanagedIds = [...ids].filter(
    (id) => !MANAGED_VECTOR_ID_PATTERN.test(id),
  )
  if (unmanagedIds.length === 0) return

  throw new Error(
    `Vectorize index ${indexName} contains ${unmanagedIds.length} unmanaged vector id(s); refusing to mutate it.`,
  )
}

function validateDeletePlan({
  currentCount,
  deleteCount,
  allowLargeDelete,
}: {
  currentCount: number
  deleteCount: number
  allowLargeDelete: boolean
}): void {
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

function validateReconciliation(
  actualIds: ReadonlySet<string>,
  expectedIds: ReadonlySet<string>,
  indexName: string,
): void {
  const missingIds = [...expectedIds].filter((id) => !actualIds.has(id))
  const unexpectedIds = [...actualIds].filter((id) => !expectedIds.has(id))

  if (missingIds.length === 0 && unexpectedIds.length === 0) return

  throw new Error(
    `Vectorize index ${indexName} did not converge: ${missingIds.length} missing and ${unexpectedIds.length} unexpected vector(s).`,
  )
}

async function waitForReconciliation(
  client: ApiClient,
  indexName: string,
  expectedIds: ReadonlySet<string>,
  {
    logger,
    sleepImpl,
    retryBaseDelayMs,
    maxAttempts,
  }: {
    logger: Logger
    sleepImpl: SleepImplementation
    retryBaseDelayMs: number
    maxAttempts: number
  },
): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const reconciledIds = await listVectorIds(client, indexName, {
      logger,
      sleepImpl,
      retryBaseDelayMs,
    })
    validateExistingVectorIds(reconciledIds, indexName)

    try {
      validateReconciliation(reconciledIds, expectedIds, indexName)
      return
    } catch (error) {
      if (attempt >= maxAttempts) throw error

      logger.log(
        JSON.stringify({
          event: 'vectorize_reconciliation_retry',
          indexName,
          attempt,
        }),
      )
      await sleepImpl(RECONCILIATION_POLL_INTERVAL_MS)
    }
  }
}

async function verifyQueryCanary(
  client: ApiClient,
  indexName: string,
  { id, vector }: QueryCanary,
): Promise<void> {
  const payload = await client.request(
    `/vectorize/v2/indexes/${encodeURIComponent(indexName)}/query`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector,
        topK: 10,
        returnMetadata: 'none',
        returnValues: false,
      }),
    },
  )
  const matches = getRequiredResponseResult(payload, 'Vectorize query').matches
  if (
    !Array.isArray(matches) ||
    !matches.some((match) => isRecord(match) && match.id === id)
  ) {
    throw new Error(
      `Vectorize index ${indexName} query canary did not return newly upserted vector ${id}.`,
    )
  }
}

export function extractEmbeddingData(
  payload: unknown,
  expectedCount: number,
): number[][] {
  const data = isRecord(payload) ? payload.data : undefined

  if (!Array.isArray(data) || data.length !== expectedCount) {
    throw new Error(
      `OpenAI returned ${Array.isArray(data) ? data.length : 0} embeddings; expected ${expectedCount}.`,
    )
  }

  const embeddings: Array<number[] | undefined> = Array(expectedCount)
  const indexes = new Set<number>()
  for (const item of data) {
    const index = isRecord(item) ? item.index : undefined
    const values = isRecord(item) ? item.embedding : undefined
    if (
      !isInteger(index) ||
      index < 0 ||
      index >= expectedCount ||
      indexes.has(index) ||
      !isFiniteNumberArray(values) ||
      values.length !== SEARCH_EMBEDDING_DIMENSIONS
    ) {
      throw new Error(
        `OpenAI embedding response must contain unique indexes and ${SEARCH_EMBEDDING_DIMENSIONS} finite values.`,
      )
    }
    indexes.add(index)
    embeddings[index] = values
  }

  return embeddings.map((embedding) => {
    if (!embedding) {
      throw new Error(
        'OpenAI embedding response was missing an expected index.',
      )
    }
    return embedding
  })
}

function createCloudflareClient({
  accountId,
  apiToken,
  fetchImpl,
  requestTimeoutMs,
  retryBaseDelayMs,
  sleepImpl,
  randomImpl,
}: {
  accountId: string
  apiToken: string
  fetchImpl: FetchImplementation
  requestTimeoutMs: number
  retryBaseDelayMs: number
  sleepImpl: SleepImplementation
  randomImpl: RandomImplementation
}): ApiClient {
  const accountBase = `${API_BASE_URL}/accounts/${encodeURIComponent(accountId)}`

  return {
    async request(path: string, init: RequestInit = {}): Promise<JsonRecord> {
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
            await cancelResponseBody(response)
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

          if (!response.ok || payload.success === false) {
            const message = getCloudflareErrorMessage(payload, response.status)
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
}: {
  apiKey: string
  fetchImpl: FetchImplementation
  requestTimeoutMs: number
  retryBaseDelayMs: number
  sleepImpl: SleepImplementation
  randomImpl: RandomImplementation
}): ApiClient {
  return {
    async request(path: string, init: RequestInit = {}): Promise<JsonRecord> {
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
            await cancelResponseBody(response)
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
            await cancelResponseBody(response)
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

function getCloudflareErrorMessage(
  payload: JsonRecord,
  status: number,
): string {
  const errors = payload.errors
  const messages = Array.isArray(errors)
    ? errors.flatMap((error) => {
        if (!isRecord(error) || typeof error.message !== 'string') return []
        return [error.message]
      })
    : []
  return messages.join('; ') || `Cloudflare API request failed with ${status}.`
}

async function cancelResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel()
  } catch {
    // Releasing a failed response body is best-effort before a retry.
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500
}

function isRetryableNetworkError(error: unknown, timedOut: boolean): boolean {
  return (
    timedOut ||
    error instanceof TypeError ||
    (error instanceof Error &&
      (error.name === 'AbortError' || error.name === 'TimeoutError'))
  )
}

function getRetryDelay({
  attempt,
  retryAfter,
  retryBaseDelayMs,
  randomImpl,
}: {
  attempt: number
  retryAfter?: string | null
  retryBaseDelayMs: number
  randomImpl: RandomImplementation
}): number {
  const exponentialDelay = retryBaseDelayMs * 2 ** attempt
  const jitter = randomImpl() * retryBaseDelayMs
  const retryAfterDelay = parseRetryAfter(retryAfter)
  return Math.max(exponentialDelay + jitter, retryAfterDelay)
}

function parseRetryAfter(value: string | null | undefined): number {
  if (!value) return 0

  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000
  }

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : 0
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

async function ensureIndex(
  client: ApiClient,
  indexName: string,
  { createIfMissing = true }: { createIfMissing?: boolean } = {},
): Promise<JsonRecord> {
  const encodedName = encodeURIComponent(indexName)
  try {
    const payload = await client.request(`/vectorize/v2/indexes/${encodedName}`)
    return getRequiredResponseResult(payload, 'Vectorize index')
  } catch (error) {
    // Cloudflare returns 410 for a deleted Vectorize name that can be reused.
    if (
      !(error instanceof CloudflareApiError) ||
      (error.status !== 404 && error.status !== 410)
    ) {
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
  return getRequiredResponseResult(payload, 'Vectorize index creation')
}

function validateIndexConfiguration(
  index: JsonRecord,
  indexName: string,
): void {
  const config = index.config
  if (
    !isRecord(config) ||
    config.dimensions !== SEARCH_EMBEDDING_DIMENSIONS ||
    config.metric !== SEARCH_DISTANCE_METRIC
  ) {
    throw new Error(
      `Vectorize index ${indexName} must use ${SEARCH_EMBEDDING_DIMENSIONS} dimensions and ${SEARCH_DISTANCE_METRIC}.`,
    )
  }
}

async function listVectorIds(
  client: ApiClient,
  indexName: string,
  {
    logger,
    sleepImpl,
    retryBaseDelayMs,
  }: {
    logger: Logger
    sleepImpl: SleepImplementation
    retryBaseDelayMs: number
  },
): Promise<Set<string>> {
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

async function listVectorIdsOnce(
  client: ApiClient,
  indexName: string,
): Promise<Set<string>> {
  const ids = new Set<string>()
  const seenCursors = new Set<string>()
  let cursor = ''

  do {
    const query = new URLSearchParams({ count: String(LIST_BATCH_SIZE) })
    if (cursor) query.set('cursor', cursor)
    const payload = await client.request(
      `/vectorize/v2/indexes/${encodeURIComponent(indexName)}/list?${query}`,
    )
    const result = getRequiredResponseResult(payload, 'Vectorize vector list')
    const vectors = result.vectors
    if (!Array.isArray(vectors)) {
      throw new Error(
        `Vectorize index ${indexName} returned an invalid vector list; refusing to mutate it.`,
      )
    }

    for (const vector of vectors) {
      if (!isRecord(vector) || typeof vector.id !== 'string') {
        throw new Error(
          `Vectorize index ${indexName} returned a vector without a valid id; refusing to mutate it.`,
        )
      }
      ids.add(vector.id)
    }

    if (result.isTruncated === false) {
      cursor = ''
      continue
    }
    if (result.isTruncated !== true) {
      throw new Error(
        `Vectorize index ${indexName} returned an invalid truncation state; refusing to treat the list as complete.`,
      )
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

async function createEmbeddings(
  client: ApiClient,
  chunks: readonly CorpusChunk[],
): Promise<number[][]> {
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
  if (payload.model !== SEARCH_EMBEDDING_MODEL) {
    throw new Error(`OpenAI response model must be ${SEARCH_EMBEDDING_MODEL}.`)
  }
  return extractEmbeddingData(payload, chunks.length)
}

async function upsertVectors(
  client: ApiClient,
  indexName: string,
  vectors: readonly VectorizeVector[],
): Promise<string> {
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

async function deleteVectors(
  client: ApiClient,
  indexName: string,
  ids: readonly string[],
): Promise<string> {
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

function getMutationId(payload: JsonRecord): string {
  const result = isRecord(payload.result) ? payload.result : undefined
  const value = result?.mutationId ?? payload.mutationId
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(
      'Cloudflare Vectorize mutation response did not include a valid mutationId.',
    )
  }
  return value
}

async function waitForMutation(
  client: ApiClient,
  indexName: string,
  mutationId: string,
): Promise<void> {
  const deadline = Date.now() + MUTATION_WAIT_TIMEOUT_MS

  while (Date.now() < deadline) {
    const payload = await client.request(
      `/vectorize/v2/indexes/${encodeURIComponent(indexName)}/info`,
    )
    const result = isRecord(payload.result) ? payload.result : undefined
    if (result?.processedUpToMutation === mutationId) return
    await new Promise<void>((resolve) =>
      setTimeout(resolve, MUTATION_POLL_INTERVAL_MS),
    )
  }

  throw new Error(`Vectorize mutation ${mutationId} was not queryable in time.`)
}

async function readJsonResponse(
  response: Response,
  provider = 'Cloudflare',
): Promise<JsonRecord> {
  const declaredLength = Number(response.headers.get('Content-Length'))
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_API_RESPONSE_BYTES
  ) {
    await cancelResponseBody(response)
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
      if (!value) {
        throw new Error(`${provider} API returned an unreadable response body.`)
      }
      bytesRead += value.byteLength
      if (bytesRead > MAX_API_RESPONSE_BYTES) {
        try {
          await reader.cancel()
        } catch {
          // The size limit is still enforced if cancellation itself fails.
        }
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

  if (!text) {
    throw new Error(
      `${provider} API returned an empty response with ${response.status}.`,
    )
  }

  let payload: unknown
  try {
    payload = JSON.parse(text)
  } catch {
    throw new Error(
      `${provider} API returned a non-JSON response with ${response.status}.`,
    )
  }
  if (!isRecord(payload)) {
    throw new Error(
      `${provider} API returned a non-object JSON response with ${response.status}.`,
    )
  }
  return payload
}

function batches<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size))
  }
  return result
}

export function parseArguments(
  argv: readonly string[],
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ParsedArguments {
  const options: ParsedArguments = {
    dryRun: false,
    planOnly: false,
    waitForMutations: true,
    allowLargeDelete: false,
    corpusFile: DEFAULT_CORPUS_FILE,
  }
  const environmentIndexName = environment.VECTORIZE_INDEX_NAME
  if (environmentIndexName !== undefined) {
    options.indexName = environmentIndexName
  }
  let confirmProduction = environment.VECTORIZE_CONFIRM_PRODUCTION

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === undefined) continue
    if (argument === '--dry-run') options.dryRun = true
    else if (argument === '--plan') options.planOnly = true
    else if (argument === '--no-wait') options.waitForMutations = false
    else if (argument === '--allow-large-delete') {
      options.allowLargeDelete = true
    } else if (argument === '--expected-delete-count') {
      const value = readArgumentValue(argv, ++index, argument)
      if (!/^(0|[1-9][0-9]*)$/.test(value)) {
        throw new Error(
          '--expected-delete-count must be a non-negative integer.',
        )
      }
      options.expectedDeleteCount = Number(value)
    } else if (argument === '--expected-plan-id') {
      const value = readArgumentValue(argv, ++index, argument)
      if (!/^[0-9a-f]{64}$/.test(value)) {
        throw new Error('--expected-plan-id must be a SHA-256 hex value.')
      }
      options.expectedPlanId = value
    } else if (argument === '--confirm-production') {
      confirmProduction = readArgumentValue(argv, ++index, argument)
    } else if (argument === '--index') {
      options.indexName = readArgumentValue(argv, ++index, argument)
    } else if (argument === '--corpus') {
      options.corpusFile = resolve(readArgumentValue(argv, ++index, argument))
    } else {
      throw new Error(`Unknown argument: ${argument}`)
    }
  }

  if (
    !options.dryRun &&
    !options.planOnly &&
    confirmProduction !== PRODUCTION_INDEX_NAME
  ) {
    throw new Error(
      `Production sync requires --confirm-production ${PRODUCTION_INDEX_NAME}.`,
    )
  }
  return options
}

function readArgumentValue(
  argv: readonly string[],
  index: number,
  argument: string,
): string {
  const value = argv[index]
  if (value === undefined) {
    throw new Error(`${argument} requires a value.`)
  }
  return value
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) return false
  return (
    resolve(process.argv[1]).toLowerCase() ===
    fileURLToPath(import.meta.url).toLowerCase()
  )
}

if (isDirectExecution()) {
  await syncVectorize(parseArguments(process.argv.slice(2)))
}
