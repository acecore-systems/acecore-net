import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, test } from 'node:test'

import {
  extractEmbeddingData,
  parseArguments,
  syncVectorize,
  validateCorpus,
} from '../scripts/sync-vectorize.mjs'

const CURRENT_PRODUCTION_INDEX = 'acecore-net-search-openai-1536-production-v2'
const CANONICAL_PRODUCTION_INDEX = 'acecore-net-search-openai-1536-production'
const PRODUCTION_INDEX = CURRENT_PRODUCTION_INDEX
const LOCALES = ['ja', 'en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru']
const temporaryRoots = []
const embedding = Array.from({ length: 1536 }, () => 0.01)

after(async () => {
  await Promise.all(
    temporaryRoots.map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  )
})

test('embeddingのindex・件数・1536次元を検証する', () => {
  assert.deepEqual(
    extractEmbeddingData({ data: [{ index: 0, embedding }] }, 1),
    [embedding],
  )
  assert.throws(
    () => extractEmbeddingData({ data: [{ index: 0, embedding: [0.1] }] }, 1),
    /1536/,
  )
  assert.throws(
    () =>
      extractEmbeddingData(
        {
          data: [
            { index: 0, embedding },
            { index: 0, embedding },
          ],
        },
        2,
      ),
    /unique indexes/,
  )
})

test('live Production同期は正確なindex名の明示確認を要求する', () => {
  for (const indexName of [
    CURRENT_PRODUCTION_INDEX,
    CANONICAL_PRODUCTION_INDEX,
  ]) {
    const environment = { VECTORIZE_INDEX_NAME: indexName }

    assert.throws(
      () => parseArguments([], environment),
      new RegExp(`--confirm-production ${indexName}`, 'u'),
    )
    assert.doesNotThrow(() =>
      parseArguments(['--confirm-production', indexName], environment),
    )
    assert.throws(
      () =>
        parseArguments(['--confirm-production', CURRENT_PRODUCTION_INDEX], {
          VECTORIZE_INDEX_NAME: CANONICAL_PRODUCTION_INDEX,
        }),
      new RegExp(`--confirm-production ${CANONICAL_PRODUCTION_INDEX}`, 'u'),
    )
    assert.doesNotThrow(() => parseArguments(['--dry-run'], environment))
    assert.doesNotThrow(() => parseArguments(['--plan'], environment))
  }
})

test('corpusと既存indexの差分だけをupsert・deleteする', async () => {
  const corpus = createCorpus()
  const corpusFile = await writeCorpus(corpus)
  const newChunk = corpus.chunks.at(-1)
  const staleId = managedId(corpus.vectorCount)
  const remoteIds = new Set([
    ...corpus.chunks.slice(0, -1).map(({ id }) => id),
    staleId,
  ])
  const calls = []

  const fetchImpl = async (input, init = {}) => {
    const url = String(input)
    calls.push({ url, method: init.method || 'GET' })

    if (url.endsWith(`/vectorize/v2/indexes/${PRODUCTION_INDEX}`)) {
      return indexResponse()
    }
    if (url.includes('/list?')) {
      return cloudflareResponse({
        vectors: [...remoteIds].map((id) => ({ id })),
        isTruncated: false,
      })
    }
    if (url.endsWith('/v1/embeddings')) {
      const body = JSON.parse(init.body)
      assert.deepEqual(body, {
        model: 'text-embedding-3-large',
        input: [newChunk.text],
        dimensions: 1536,
        encoding_format: 'float',
      })
      assert.equal(init.headers.get('Authorization'), 'Bearer openai-key')
      return openAiEmbeddingResponse([embedding])
    }
    if (url.endsWith('/upsert')) {
      assert.equal(init.body.has('body'), false)
      const body = await init.body.get('vectors').text()
      const vector = JSON.parse(body.trim())
      assert.equal(vector.id, newChunk.id)
      assert.equal(vector.values.length, 1536)
      remoteIds.add(vector.id)
      return cloudflareResponse({ mutationId: 'mutation-upsert' })
    }
    if (url.endsWith('/delete_by_ids')) {
      assert.deepEqual(JSON.parse(init.body), { ids: [staleId] })
      remoteIds.delete(staleId)
      return cloudflareResponse({ mutationId: 'mutation-delete' })
    }
    if (url.endsWith('/info')) {
      return cloudflareResponse({
        processedUpToMutation: 'mutation-delete',
      })
    }
    if (url.endsWith('/query')) {
      assert.deepEqual(JSON.parse(init.body), {
        vector: embedding,
        topK: 10,
        returnMetadata: 'none',
        returnValues: false,
      })
      return cloudflareResponse({
        count: 1,
        matches: [{ id: newChunk.id }],
      })
    }

    throw new Error(`Unexpected request: ${url}`)
  }

  const result = await syncVectorize({
    accountId: 'account',
    apiToken: 'token',
    openAiApiKey: 'openai-key',
    indexName: PRODUCTION_INDEX,
    corpusFile,
    fetchImpl,
    logger: silentLogger,
  })

  assert.equal(result.existing, corpus.vectorCount)
  assert.equal(result.upserted, 1)
  assert.equal(result.deleted, 1)
  assert.equal(result.mutationId, 'mutation-delete')
  assert.equal(result.verified, true)
  assert.equal(result.queryVerified, true)
  assert.equal(
    calls.filter(({ url }) => url.endsWith('/v1/embeddings')).length,
    1,
  )
  assert.equal(calls.filter(({ url }) => url.endsWith('/query')).length, 1)
})

test('newly upserted vectorがquery結果に含まれなければ同期を失敗させる', async () => {
  const corpus = createCorpus()
  const corpusFile = await writeCorpus(corpus)
  const canaryChunk = corpus.chunks.at(-1)
  const remoteIds = new Set(corpus.chunks.slice(0, -1).map(({ id }) => id))

  const fetchImpl = async (input, init = {}) => {
    const url = String(input)
    if (url.endsWith(`/vectorize/v2/indexes/${PRODUCTION_INDEX}`)) {
      return indexResponse()
    }
    if (url.includes('/list?')) {
      return cloudflareResponse({
        vectors: [...remoteIds].map((id) => ({ id })),
        isTruncated: false,
      })
    }
    if (url.endsWith('/v1/embeddings')) {
      return openAiEmbeddingResponse([embedding])
    }
    if (url.endsWith('/upsert')) {
      remoteIds.add(canaryChunk.id)
      return cloudflareResponse({ mutationId: 'mutation-upsert' })
    }
    if (url.endsWith('/info')) {
      return cloudflareResponse({
        processedUpToMutation: 'mutation-upsert',
      })
    }
    if (url.endsWith('/query')) {
      return cloudflareResponse({
        count: 1,
        matches: [{ id: managedId(999_999) }],
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  await assert.rejects(
    syncVectorize({
      accountId: 'account',
      apiToken: 'token',
      openAiApiKey: 'openai-key',
      indexName: PRODUCTION_INDEX,
      corpusFile,
      fetchImpl,
      logger: silentLogger,
    }),
    /query canary did not return newly upserted vector/,
  )
})

test('mutationIdがない成功応答をfail closedする', async () => {
  const corpus = createCorpus()
  const corpusFile = await writeCorpus(corpus)
  const existingIds = corpus.chunks.slice(0, -1).map(({ id }) => id)

  const fetchImpl = async (input) => {
    const url = String(input)
    if (url.endsWith(`/vectorize/v2/indexes/${PRODUCTION_INDEX}`)) {
      return indexResponse()
    }
    if (url.includes('/list?')) {
      return cloudflareResponse({
        vectors: existingIds.map((id) => ({ id })),
        isTruncated: false,
      })
    }
    if (url.endsWith('/v1/embeddings')) {
      return openAiEmbeddingResponse([embedding])
    }
    if (url.endsWith('/upsert')) {
      return cloudflareResponse({})
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  await assert.rejects(
    syncVectorize({
      accountId: 'account',
      apiToken: 'token',
      openAiApiKey: 'openai-key',
      indexName: PRODUCTION_INDEX,
      corpusFile,
      fetchImpl,
      logger: silentLogger,
    }),
    /valid mutationId/,
  )
})

test('dry-runはcredentialもnetworkも要求しない', async () => {
  const corpusFile = await writeCorpus(createCorpus())

  const result = await syncVectorize({
    corpusFile,
    dryRun: true,
    fetchImpl() {
      throw new Error('network must not be called')
    },
    logger: silentLogger,
  })

  assert.equal(result.dryRun, true)
  assert.equal(result.vectors, 1000)
})

test('planは不存在indexを作成せずfail closedする', async () => {
  const corpusFile = await writeCorpus(createCorpus())
  let createRequests = 0

  const fetchImpl = async (input, init = {}) => {
    const url = String(input)
    if (url.endsWith(`/vectorize/v2/indexes/${PRODUCTION_INDEX}`)) {
      return cloudflareResponse(null, 404)
    }
    if (
      url.endsWith('/vectorize/v2/indexes') &&
      (init.method || 'GET') === 'POST'
    ) {
      createRequests += 1
      return indexResponse()
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  await assert.rejects(
    syncVectorize({
      accountId: 'account',
      apiToken: 'token',
      indexName: PRODUCTION_INDEX,
      corpusFile,
      planOnly: true,
      fetchImpl,
      logger: silentLogger,
    }),
    /plan mode is read-only/,
  )
  assert.equal(createRequests, 0)
})

test('同期先indexをproductionだけに制限する', async () => {
  const corpusFile = await writeCorpus(createCorpus())

  await assert.rejects(
    syncVectorize({
      corpusFile,
      dryRun: true,
      indexName: 'untrusted-index',
      logger: silentLogger,
    }),
    /must be one of/,
  )

  await assert.doesNotReject(
    syncVectorize({
      corpusFile,
      dryRun: true,
      indexName: CURRENT_PRODUCTION_INDEX,
      logger: silentLogger,
    }),
  )
  await assert.doesNotReject(
    syncVectorize({
      corpusFile,
      dryRun: true,
      indexName: CANONICAL_PRODUCTION_INDEX,
      logger: silentLogger,
    }),
  )
})

test('source・vector・9 localeの最低件数を検証する', () => {
  const tooFewSources = createCorpus({ sourceCount: 89 })
  assert.throws(() => validateCorpus(tooFewSources), /at least 90/)

  const mismatchedSourceCount = createCorpus()
  mismatchedSourceCount.sourceCount += 1
  assert.throws(
    () => validateCorpus(mismatchedSourceCount),
    /unique source URLs/,
  )

  const tooFewVectors = createCorpus({ vectorCount: 149 })
  assert.throws(() => validateCorpus(tooFewVectors), /between 150/)

  const tooFewInLocale = createCorpus()
  let retainedRuVectors = 0
  tooFewInLocale.chunks = tooFewInLocale.chunks.filter((chunk) => {
    if (chunk.namespace !== 'ru') return true
    retainedRuVectors += 1
    return retainedRuVectors <= 17
  })
  tooFewInLocale.vectorCount = tooFewInLocale.chunks.length
  tooFewInLocale.localeCounts = countLocales(tooFewInLocale.chunks)
  assert.throws(() => validateCorpus(tooFewInLocale), /locale ru/)
})

test('namespaceと公開URLのlocaleが一致しないcorpusを拒否する', () => {
  const wrongEnglishPath = createCorpus()
  wrongEnglishPath.chunks.find(
    ({ namespace }) => namespace === 'en',
  ).metadata.url = '/fr/search-0/'
  assert.throws(() => validateCorpus(wrongEnglishPath), /invalid chunk/)

  const prefixedJapanesePath = createCorpus()
  prefixedJapanesePath.chunks.find(
    ({ namespace }) => namespace === 'ja',
  ).metadata.url = '/en/search-0/'
  assert.throws(() => validateCorpus(prefixedJapanesePath), /invalid chunk/)
})

test('非管理形式の現存IDがあればmutation前にfail closedする', async () => {
  const corpus = createCorpus()
  const corpusFile = await writeCorpus(corpus)
  let mutationRequested = false
  const fetchImpl = async (input) => {
    const url = String(input)
    if (url.endsWith(`/vectorize/v2/indexes/${PRODUCTION_INDEX}`)) {
      return indexResponse()
    }
    if (url.includes('/list?')) {
      return cloudflareResponse({
        vectors: [
          ...corpus.chunks.map(({ id }) => ({ id })),
          { id: 'legacy-vector' },
        ],
        isTruncated: false,
      })
    }
    mutationRequested = true
    throw new Error(`Unexpected request: ${url}`)
  }

  await assert.rejects(
    syncVectorize({
      accountId: 'account',
      apiToken: 'token',
      indexName: PRODUCTION_INDEX,
      corpusFile,
      fetchImpl,
      logger: silentLogger,
    }),
    /unmanaged vector id/,
  )
  assert.equal(mutationRequested, false)
})

test('20%を超えるdeleteを既定で拒否し明示override時だけ許可する', async () => {
  const corpus = createCorpus()
  const corpusFile = await writeCorpus(corpus)
  const staleIds = Array.from({ length: 251 }, (_, index) =>
    managedId(100_000 + index),
  )
  const remoteIds = new Set([...corpus.chunks.map(({ id }) => id), ...staleIds])
  let deleteRequests = 0
  const deletedIds = []

  const fetchImpl = async (input, init = {}) => {
    const url = String(input)
    if (url.endsWith(`/vectorize/v2/indexes/${PRODUCTION_INDEX}`)) {
      return indexResponse()
    }
    if (url.includes('/list?')) {
      return cloudflareResponse({
        vectors: [...remoteIds].map((id) => ({ id })),
        isTruncated: false,
      })
    }
    if (url.endsWith('/delete_by_ids')) {
      deleteRequests += 1
      const payload = JSON.parse(init.body)
      assert.ok(payload.ids.length <= 100)
      deletedIds.push(...payload.ids)
      for (const id of payload.ids) remoteIds.delete(id)
      return cloudflareResponse({ mutationId: 'mutation-delete' })
    }
    if (url.endsWith('/info')) {
      return cloudflareResponse({
        processedUpToMutation: 'mutation-delete',
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  const plan = await syncVectorize({
    accountId: 'account',
    apiToken: 'token',
    indexName: PRODUCTION_INDEX,
    corpusFile,
    planOnly: true,
    fetchImpl,
    logger: silentLogger,
  })
  assert.equal(plan.requiresLargeDeleteApproval, true)
  assert.equal(plan.delete, staleIds.length)
  assert.match(plan.planId, /^[0-9a-f]{64}$/)
  assert.equal(deleteRequests, 0)

  await assert.rejects(
    syncVectorize({
      accountId: 'account',
      apiToken: 'token',
      indexName: PRODUCTION_INDEX,
      corpusFile,
      fetchImpl,
      logger: silentLogger,
    }),
    /--allow-large-delete/,
  )
  assert.equal(deleteRequests, 0)

  await assert.rejects(
    syncVectorize({
      accountId: 'account',
      apiToken: 'token',
      indexName: PRODUCTION_INDEX,
      corpusFile,
      allowLargeDelete: true,
      expectedDeleteCount: staleIds.length - 1,
      expectedPlanId: plan.planId,
      fetchImpl,
      logger: silentLogger,
    }),
    /delete count changed after approval/,
  )
  await assert.rejects(
    syncVectorize({
      accountId: 'account',
      apiToken: 'token',
      indexName: PRODUCTION_INDEX,
      corpusFile,
      allowLargeDelete: true,
      expectedDeleteCount: plan.delete,
      expectedPlanId: '0'.repeat(64),
      fetchImpl,
      logger: silentLogger,
    }),
    /plan changed after approval/,
  )
  assert.equal(deleteRequests, 0)

  const result = await syncVectorize({
    accountId: 'account',
    apiToken: 'token',
    indexName: PRODUCTION_INDEX,
    corpusFile,
    allowLargeDelete: true,
    expectedDeleteCount: plan.delete,
    expectedPlanId: plan.planId,
    fetchImpl,
    logger: silentLogger,
  })
  assert.equal(result.deleted, staleIds.length)
  assert.equal(deleteRequests, 3)
  assert.deepEqual(deletedIds, staleIds)
})

test('mutation直後の壊れたlist cursorは先頭から再取得して収束する', async () => {
  const corpus = createCorpus()
  const corpusFile = await writeCorpus(corpus)
  let firstPageRequests = 0
  let cursorRequests = 0
  const sleepDelays = []

  const fetchImpl = async (input) => {
    const url = String(input)
    if (url.endsWith(`/vectorize/v2/indexes/${PRODUCTION_INDEX}`)) {
      return indexResponse()
    }
    if (url.includes('cursor=')) {
      cursorRequests += 1
      return new Response(
        JSON.stringify({
          success: false,
          result: null,
          errors: [{ message: 'List vectors cursor appears to be corrupted' }],
          messages: [],
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
    if (url.includes('/list?')) {
      firstPageRequests += 1
      return cloudflareResponse({
        vectors: corpus.chunks.map(({ id }) => ({ id })),
        isTruncated: firstPageRequests === 1,
        nextCursor: firstPageRequests === 1 ? 'stale-cursor' : undefined,
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  const result = await syncVectorize({
    accountId: 'account',
    apiToken: 'token',
    indexName: PRODUCTION_INDEX,
    corpusFile,
    fetchImpl,
    retryBaseDelayMs: 10,
    sleepImpl: async (delay) => sleepDelays.push(delay),
    logger: silentLogger,
  })

  assert.equal(firstPageRequests, 3)
  assert.equal(cursorRequests, 1)
  assert.deepEqual(sleepDelays, [10])
  assert.equal(result.upserted, 0)
  assert.equal(result.deleted, 0)
})

test('truncated listにnextCursorがなければ完全一致と誤認しない', async () => {
  const corpus = createCorpus()
  const corpusFile = await writeCorpus(corpus)
  let listRequests = 0

  const fetchImpl = async (input) => {
    const url = String(input)
    if (url.endsWith(`/vectorize/v2/indexes/${PRODUCTION_INDEX}`)) {
      return indexResponse()
    }
    if (url.includes('/list?')) {
      listRequests += 1
      return cloudflareResponse({
        vectors: corpus.chunks.map(({ id }) => ({ id })),
        isTruncated: true,
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  await assert.rejects(
    syncVectorize({
      accountId: 'account',
      apiToken: 'token',
      indexName: PRODUCTION_INDEX,
      corpusFile,
      fetchImpl,
      logger: silentLogger,
    }),
    /truncated page without a valid nextCursor/,
  )
  assert.equal(listRequests, 1)
})

test('list cursorが循環したら完全一致と誤認しない', async () => {
  const corpus = createCorpus()
  const corpusFile = await writeCorpus(corpus)
  const midpoint = Math.floor(corpus.chunks.length / 2)
  let listRequests = 0

  const fetchImpl = async (input) => {
    const url = String(input)
    if (url.endsWith(`/vectorize/v2/indexes/${PRODUCTION_INDEX}`)) {
      return indexResponse()
    }
    if (url.includes('/list?')) {
      listRequests += 1
      return cloudflareResponse({
        vectors: corpus.chunks
          .slice(
            listRequests === 1 ? 0 : midpoint,
            listRequests === 1 ? midpoint : undefined,
          )
          .map(({ id }) => ({ id })),
        isTruncated: true,
        nextCursor: 'repeated-cursor',
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  await assert.rejects(
    syncVectorize({
      accountId: 'account',
      apiToken: 'token',
      indexName: PRODUCTION_INDEX,
      corpusFile,
      fetchImpl,
      logger: silentLogger,
    }),
    /repeated a list cursor/,
  )
  assert.equal(listRequests, 2)
})

test('mutation完了後のID集合がcorpusへ収束しなければ失敗する', async () => {
  const corpus = createCorpus()
  const corpusFile = await writeCorpus(corpus)
  const missingChunk = corpus.chunks.at(-1)
  const remoteIds = new Set(corpus.chunks.slice(0, -1).map(({ id }) => id))

  const fetchImpl = async (input) => {
    const url = String(input)
    if (url.endsWith(`/vectorize/v2/indexes/${PRODUCTION_INDEX}`)) {
      return indexResponse()
    }
    if (url.includes('/list?')) {
      return cloudflareResponse({
        vectors: [...remoteIds].map((id) => ({ id })),
        isTruncated: false,
      })
    }
    if (url.endsWith('/v1/embeddings')) {
      return openAiEmbeddingResponse([embedding])
    }
    if (url.endsWith('/upsert')) {
      return cloudflareResponse({ mutationId: 'mutation-upsert' })
    }
    if (url.endsWith('/info')) {
      return cloudflareResponse({
        processedUpToMutation: 'mutation-upsert',
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  await assert.rejects(
    syncVectorize({
      accountId: 'account',
      apiToken: 'token',
      openAiApiKey: 'openai-key',
      indexName: PRODUCTION_INDEX,
      corpusFile,
      fetchImpl,
      sleepImpl: async () => {},
      logger: silentLogger,
    }),
    /did not converge: 1 missing/,
  )
  assert.equal(remoteIds.has(missingChunk.id), false)
})

test('mutation完了直後にlistが古くてもbounded retryで収束を確認する', async () => {
  const corpus = createCorpus()
  const corpusFile = await writeCorpus(corpus)
  const missingChunk = corpus.chunks.at(-1)
  const remoteIds = new Set(corpus.chunks.slice(0, -1).map(({ id }) => id))
  const sleepDelays = []
  let listRequests = 0

  const fetchImpl = async (input) => {
    const url = String(input)
    if (url.endsWith(`/vectorize/v2/indexes/${PRODUCTION_INDEX}`)) {
      return indexResponse()
    }
    if (url.includes('/list?')) {
      listRequests += 1
      if (listRequests >= 3) remoteIds.add(missingChunk.id)
      return cloudflareResponse({
        vectors: [...remoteIds].map((id) => ({ id })),
        isTruncated: false,
      })
    }
    if (url.endsWith('/v1/embeddings')) {
      return openAiEmbeddingResponse([embedding])
    }
    if (url.endsWith('/upsert')) {
      return cloudflareResponse({ mutationId: 'mutation-upsert' })
    }
    if (url.endsWith('/info')) {
      return cloudflareResponse({
        processedUpToMutation: 'mutation-upsert',
      })
    }
    if (url.endsWith('/query')) {
      return cloudflareResponse({
        count: 1,
        matches: [{ id: missingChunk.id }],
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  const result = await syncVectorize({
    accountId: 'account',
    apiToken: 'token',
    openAiApiKey: 'openai-key',
    indexName: PRODUCTION_INDEX,
    corpusFile,
    fetchImpl,
    sleepImpl: async (delay) => sleepDelays.push(delay),
    logger: silentLogger,
  })

  assert.equal(result.verified, true)
  assert.equal(result.queryVerified, true)
  assert.equal(listRequests, 3)
  assert.deepEqual(sleepDelays, [5000])
})

test('network・429・5xxをRetry-Afterと指数backoff付きで再試行する', async () => {
  const corpus = createCorpus()
  const corpusFile = await writeCorpus(corpus)
  const sleepDelays = []
  let indexAttempts = 0

  const fetchImpl = async (input) => {
    const url = String(input)
    if (url.endsWith(`/vectorize/v2/indexes/${PRODUCTION_INDEX}`)) {
      indexAttempts += 1
      if (indexAttempts === 1) throw new TypeError('connection reset')
      if (indexAttempts === 2) {
        return cloudflareResponse(null, 429, { 'Retry-After': '2' })
      }
      if (indexAttempts === 3) return cloudflareResponse(null, 503)
      return indexResponse()
    }
    if (url.includes('/list?')) {
      return cloudflareResponse({
        vectors: corpus.chunks.map(({ id }) => ({ id })),
        isTruncated: false,
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  await syncVectorize({
    accountId: 'account',
    apiToken: 'token',
    indexName: PRODUCTION_INDEX,
    corpusFile,
    fetchImpl,
    retryBaseDelayMs: 10,
    randomImpl: () => 0,
    sleepImpl: async (milliseconds) => sleepDelays.push(milliseconds),
    logger: silentLogger,
  })

  assert.equal(indexAttempts, 4)
  assert.deepEqual(sleepDelays, [10, 2000, 40])
})

test('再試行は最大5回で停止する', async () => {
  const corpusFile = await writeCorpus(createCorpus())
  let requests = 0

  await assert.rejects(
    syncVectorize({
      accountId: 'account',
      apiToken: 'token',
      indexName: PRODUCTION_INDEX,
      corpusFile,
      fetchImpl: async () => {
        requests += 1
        return cloudflareResponse(null, 503)
      },
      retryBaseDelayMs: 0,
      randomImpl: () => 0,
      sleepImpl: async () => {},
      logger: silentLogger,
    }),
    /503/,
  )
  assert.equal(requests, 6)
})

test('Cloudflare REST requestを30秒timeout対象にして再試行する', async () => {
  const corpus = createCorpus()
  const corpusFile = await writeCorpus(corpus)
  let indexAttempts = 0

  const fetchImpl = async (input, init = {}) => {
    const url = String(input)
    assert.ok(init.signal instanceof AbortSignal)
    if (url.endsWith(`/vectorize/v2/indexes/${PRODUCTION_INDEX}`)) {
      indexAttempts += 1
      if (indexAttempts === 1) {
        return new Promise((_resolve, reject) => {
          init.signal.addEventListener(
            'abort',
            () => reject(init.signal.reason),
            { once: true },
          )
        })
      }
      return indexResponse()
    }
    if (url.includes('/list?')) {
      return cloudflareResponse({
        vectors: corpus.chunks.map(({ id }) => ({ id })),
        isTruncated: false,
      })
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  await syncVectorize({
    accountId: 'account',
    apiToken: 'token',
    indexName: PRODUCTION_INDEX,
    corpusFile,
    fetchImpl,
    requestTimeoutMs: 5,
    retryBaseDelayMs: 0,
    randomImpl: () => 0,
    sleepImpl: async () => {},
    logger: silentLogger,
  })
  assert.equal(indexAttempts, 2)
})

test('応答消失後の再実行でも既存upsertを再計算せず収束する', async () => {
  const corpus = createCorpus()
  const corpusFile = await writeCorpus(corpus)
  const remoteIds = new Set(corpus.chunks.slice(0, -1).map(({ id }) => id))
  let upsertRequests = 0

  const fetchImpl = async (input, init = {}) => {
    const url = String(input)
    if (url.endsWith(`/vectorize/v2/indexes/${PRODUCTION_INDEX}`)) {
      return indexResponse()
    }
    if (url.includes('/list?')) {
      return cloudflareResponse({
        vectors: [...remoteIds].map((id) => ({ id })),
        isTruncated: false,
      })
    }
    if (url.endsWith('/v1/embeddings')) {
      return openAiEmbeddingResponse([embedding])
    }
    if (url.endsWith('/upsert')) {
      upsertRequests += 1
      const body = await init.body.get('vectors').text()
      remoteIds.add(JSON.parse(body.trim()).id)
      throw new TypeError('response lost after applied upsert')
    }
    throw new Error(`Unexpected request: ${url}`)
  }

  await assert.rejects(
    syncVectorize({
      accountId: 'account',
      apiToken: 'token',
      openAiApiKey: 'openai-key',
      indexName: PRODUCTION_INDEX,
      corpusFile,
      fetchImpl,
      retryBaseDelayMs: 0,
      randomImpl: () => 0,
      sleepImpl: async () => {},
      logger: silentLogger,
    }),
    /response lost/,
  )
  assert.equal(upsertRequests, 6)

  const converged = await syncVectorize({
    accountId: 'account',
    apiToken: 'token',
    indexName: PRODUCTION_INDEX,
    corpusFile,
    fetchImpl,
    retryBaseDelayMs: 0,
    randomImpl: () => 0,
    sleepImpl: async () => {},
    logger: silentLogger,
  })
  assert.equal(converged.upserted, 0)
  assert.equal(converged.deleted, 0)
  assert.equal(upsertRequests, 6)
})

test('embedding設定が異なるcorpusを拒否する', () => {
  const corpus = createCorpus()
  corpus.embedding.dimensions = 768
  assert.throws(() => validateCorpus(corpus), /1536/)
})

function createCorpus({ vectorCount = 1000, sourceCount = 90 } = {}) {
  const sourceCounts = distributeSourceCounts(sourceCount)
  const localeChunkIndexes = Object.fromEntries(
    LOCALES.map((locale) => [locale, 0]),
  )
  const chunks = Array.from({ length: vectorCount }, (_, index) => {
    const locale = LOCALES[index % LOCALES.length]
    const sourceIndex =
      localeChunkIndexes[locale] % Math.max(sourceCounts[locale], 1)
    localeChunkIndexes[locale] += 1
    const localePrefix = locale === 'ja' ? '' : `/${locale}`
    return {
      id: managedId(index),
      namespace: locale,
      text: `vector text ${index}`,
      metadata: {
        url: `${localePrefix}/search-${sourceIndex}/`,
        title: `Title ${index}`,
        section: `Section ${index}`,
        excerpt: `Excerpt ${index}`,
        contentType: 'page',
        locale,
      },
    }
  })

  return {
    schemaVersion: 1,
    version: 'test',
    embedding: {
      model: 'text-embedding-3-large',
      dimensions: 1536,
      metric: 'cosine',
    },
    sourceCount,
    vectorCount: chunks.length,
    localeCounts: countLocales(chunks),
    chunks,
  }
}

function distributeSourceCounts(sourceCount) {
  const minimumPerLocale = Math.floor(sourceCount / LOCALES.length)
  const remainder = sourceCount % LOCALES.length
  return Object.fromEntries(
    LOCALES.map((locale, index) => [
      locale,
      minimumPerLocale + (index < remainder ? 1 : 0),
    ]),
  )
}

function countLocales(chunks) {
  return Object.fromEntries(
    LOCALES.map((locale) => [
      locale,
      chunks.filter(({ namespace }) => namespace === locale).length,
    ]),
  )
}

function managedId(value) {
  return `v1-${value.toString(16).padStart(48, '0')}`
}

async function writeCorpus(corpus) {
  const root = await mkdtemp(join(tmpdir(), 'acecore-vectorize-sync-'))
  temporaryRoots.push(root)
  const corpusFile = join(root, 'corpus.json')
  await writeFile(corpusFile, JSON.stringify(corpus), 'utf8')
  return corpusFile
}

function indexResponse() {
  return cloudflareResponse({
    name: PRODUCTION_INDEX,
    config: { dimensions: 1536, metric: 'cosine' },
  })
}

function cloudflareResponse(result, status = 200, headers = {}) {
  return new Response(
    JSON.stringify({
      success: status >= 200 && status < 300,
      result,
      errors: [],
      messages: [],
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    },
  )
}

function openAiEmbeddingResponse(embeddings, status = 200, headers = {}) {
  return new Response(
    JSON.stringify({
      object: 'list',
      data: embeddings.map((values, index) => ({
        object: 'embedding',
        index,
        embedding: values,
      })),
      model: 'text-embedding-3-large',
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json', ...headers },
    },
  )
}

const silentLogger = { log() {} }
