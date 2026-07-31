import assert from 'node:assert/strict'
import { test } from 'node:test'

import { onRequestPost } from '../functions/api/search.ts'

const queryVector = Array.from({ length: 1536 }, () => 0.01)

test('同一originの検索だけを埋め込み、locale namespaceで問い合わせる', async () => {
  let embeddingInput
  let queryOptions
  const env = createEnv({
    matches: [
      {
        id: 'one',
        score: 0.81,
        metadata: {
          url: '/services/',
          title: 'サービス',
          section: 'Web制作',
          excerpt: 'Web制作と運用',
          contentType: 'page',
          locale: 'ja',
        },
      },
      {
        id: 'duplicate-url',
        score: 0.79,
        metadata: {
          url: '/services/',
          title: 'サービス',
          section: 'サーバー',
          excerpt: 'サーバー運用',
          contentType: 'page',
          locale: 'ja',
        },
      },
      {
        id: 'too-low',
        score: 0.49,
        metadata: {
          url: '/about/',
          title: 'Acecoreについて',
          section: '概要',
          excerpt: '概要',
          contentType: 'page',
          locale: 'ja',
        },
      },
    ],
    onQuery(_values, options) {
      queryOptions = options
    },
  })

  const response = await withOpenAiEmbedding(
    () =>
      onRequestPost({
        request: searchRequest({ query: 'Webサイトを作りたい', locale: 'ja' }),
        env,
      }),
    {
      onRequest(body) {
        embeddingInput = body.input
      },
    },
  )
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff')
  assert.match(response.headers.get('Server-Timing'), /^search;dur=/)
  assert.equal(body.results.length, 1)
  assert.equal(body.results[0].url, '/services/')
  assert.equal(body.results[0].rank, 1)
  assert.equal(embeddingInput, 'Webサイトを作りたい')
  assert.deepEqual(queryOptions, {
    namespace: 'ja',
    topK: 15,
    returnMetadata: 'all',
    returnValues: false,
  })
})

test('local Vectorize metadataの管理path・多重エンコード・query/hashを返さない', async () => {
  const env = createEnv({
    matches: [
      {
        id: 'admin',
        score: 0.99,
        metadata: {
          url: '/admin/',
          title: 'ADMIN',
          locale: 'ja',
        },
      },
      {
        id: 'encoded-admin',
        score: 0.98,
        metadata: {
          url: '/%EF%BC%85%36%31dmin/',
          title: 'ENCODED_ADMIN',
          locale: 'ja',
        },
      },
      {
        id: 'encoded-query',
        score: 0.97,
        metadata: {
          url: '/public/%253Fprivate/',
          title: 'ENCODED_QUERY',
          locale: 'ja',
        },
      },
      {
        id: 'raw-parent',
        score: 0.96,
        metadata: {
          url: '/safe/../services/',
          title: 'RAW_PARENT',
          locale: 'ja',
        },
      },
      {
        id: 'raw-backslash',
        score: 0.95,
        metadata: {
          url: '/safe\\private/',
          title: 'RAW_BACKSLASH',
          locale: 'ja',
        },
      },
      {
        id: 'raw-control',
        score: 0.94,
        metadata: {
          url: '/safe\tpublic/',
          title: 'RAW_CONTROL',
          locale: 'ja',
        },
      },
      {
        id: 'safe',
        score: 0.93,
        metadata: {
          url: '/services/',
          title: 'SAFE',
          locale: 'ja',
        },
      },
    ],
  })

  const response = await withOpenAiEmbedding(() =>
    onRequestPost({
      request: searchRequest({ query: 'Webサイトを作りたい', locale: 'ja' }),
      env,
    }),
  )

  assert.equal(response.status, 200)
  assert.deepEqual((await response.json()).results, [
    {
      id: 'safe',
      url: '/services/',
      title: 'SAFE',
      section: 'SAFE',
      excerpt: '',
      contentType: 'page',
      rank: 1,
    },
  ])
})

test('OriginがないrequestはOpenAIを呼ばずに拒否する', async () => {
  let openAiCalled = false
  const env = createEnv()
  const request = new Request('https://acecore.net/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '検索', locale: 'ja' }),
  })

  const response = await withOpenAiEmbedding(
    () => onRequestPost({ request, env }),
    {
      onRequest() {
        openAiCalled = true
      },
    },
  )

  assert.equal(response.status, 403)
  assert.equal(openAiCalled, false)
})

test('短すぎるqueryと未対応localeを拒否する', async () => {
  const env = createEnv()
  const shortResponse = await onRequestPost({
    request: searchRequest({ query: 'a', locale: 'ja' }),
    env,
  })
  const localeResponse = await onRequestPost({
    request: searchRequest({ query: 'search', locale: 'invalid' }),
    env,
  })

  assert.equal(shortResponse.status, 400)
  assert.equal(localeResponse.status, 400)
})

test('JSON nullとprimitiveを400で拒否する', async () => {
  const env = createEnv()
  const nullResponse = await onRequestPost({
    request: searchRequest(null),
    env,
  })
  const primitiveResponse = await onRequestPost({
    request: searchRequest('search'),
    env,
  })

  assert.equal(nullResponse.status, 400)
  assert.equal(primitiveResponse.status, 400)
})

test('Content-Lengthが上限を超えるbodyを読み込まず413にする', async () => {
  const env = createEnv()
  const request = new Request('https://acecore.net/api/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': '4096',
      Origin: 'https://acecore.net',
    },
    body: JSON.stringify({ query: '検索', locale: 'ja' }),
  })

  const response = await withOpenAiEmbedding(() =>
    onRequestPost({ request, env }),
  )

  assert.equal(response.status, 413)
  assert.equal(request.bodyUsed, false)
})

test('Content-Lengthがなくても上限までしかbodyを読み込まない', async () => {
  let pulls = 0
  const chunk = new Uint8Array(1024)
  const body = new ReadableStream({
    pull(controller) {
      pulls += 1
      controller.enqueue(chunk)
      if (pulls >= 10) controller.close()
    },
  })
  const request = new Request('https://acecore.net/api/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://acecore.net',
    },
    body,
    duplex: 'half',
  })

  const response = await onRequestPost({ request, env: createEnv() })

  assert.equal(response.status, 413)
  assert.ok(pulls <= 4)
})

test('client rate limitの拒否後はglobal枠を消費せず429を返す', async () => {
  const consumedKeys = []
  const env = createEnv({
    clientRateLimitSuccess: false,
    onRateLimit(key) {
      consumedKeys.push(key)
    },
  })
  const response = await onRequestPost({
    request: searchRequest({ query: 'サイト制作', locale: 'ja' }),
    env,
  })

  assert.equal(response.status, 429)
  assert.equal(response.headers.get('Retry-After'), '60')
  assert.equal(consumedKeys.length, 1)
  assert.match(consumedKeys[0], /^client:[0-9a-f]{64}$/)
})

test('Cloudflare接続IPをhashしたclient keyを自己申告UUIDより優先する', async () => {
  const consumedKeys = []
  const env = createEnv({
    onRateLimit(key) {
      consumedKeys.push(key)
    },
  })
  const request = searchRequest({ query: 'サイト制作', locale: 'ja' })
  request.headers.set('CF-Connecting-IP', '203.0.113.9')

  const response = await withOpenAiEmbedding(() =>
    onRequestPost({ request, env }),
  )

  assert.equal(response.status, 200)
  assert.equal(consumedKeys.length, 2)
  assert.match(consumedKeys[0], /^client:[0-9a-f]{64}$/)
  assert.equal(consumedKeys[1], 'global')
})

test('不正なembeddingを502にし、logへquery本文を残さない', async () => {
  const originalError = console.error
  const logs = []
  console.error = (value) => logs.push(String(value))

  try {
    const env = createEnv()
    const response = await withOpenAiEmbedding(
      () =>
        onRequestPost({
          request: searchRequest({
            query: '秘密を含む検索テキスト',
            locale: 'ja',
          }),
          env,
        }),
      { embedding: [0.1] },
    )

    assert.equal(response.status, 502)
    assert.equal(logs.length, 1)
    assert.doesNotMatch(logs[0], /秘密を含む検索テキスト/)
    assert.match(logs[0], /invalid_embedding/)
  } finally {
    console.error = originalError
  }
})

function searchRequest(body) {
  return new Request('https://acecore.net/api/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://acecore.net',
      'X-Acecore-Search-Client': '018f7e5a-7b4d-7c6a-8e9f-0123456789ab',
    },
    body: JSON.stringify(body),
  })
}

function createEnv({
  matches = [],
  clientRateLimitSuccess = true,
  globalRateLimitSuccess = true,
  onQuery = () => {},
  onRateLimit = () => {},
} = {}) {
  return {
    SEARCH_ENABLED: 'true',
    SEARCH_MIN_SCORE: '0.50',
    OPENAI_API_KEY: 'test-openai-key',
    OPENAI_EMBEDDING_MODEL: 'text-embedding-3-large',
    OPENAI_EMBEDDING_DIMENSIONS: '1536',
    SEARCH_RATE_LIMIT_DB: createRateLimitDatabase({
      clientRateLimitSuccess,
      globalRateLimitSuccess,
      onRateLimit,
    }),
    SEARCH_INDEX: {
      async query(values, options) {
        assert.equal(values.length, 1536)
        onQuery(values, options)
        return { count: matches.length, matches }
      },
    },
  }
}

async function withOpenAiEmbedding(
  callback,
  { embedding = queryVector, onRequest = () => {} } = {},
) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input)
    assert.equal(url, 'https://api.openai.com/v1/embeddings')
    assert.equal(init.method, 'POST')
    assert.equal(init.headers.Authorization, 'Bearer test-openai-key')

    const body = JSON.parse(init.body)
    onRequest(body)
    assert.deepEqual(body, {
      model: 'text-embedding-3-large',
      input: body.input,
      dimensions: 1536,
      encoding_format: 'float',
    })

    return Response.json({
      object: 'list',
      data: [{ object: 'embedding', index: 0, embedding }],
      model: 'text-embedding-3-large',
    })
  }

  try {
    return await callback()
  } finally {
    globalThis.fetch = originalFetch
  }
}

function createRateLimitDatabase({
  clientRateLimitSuccess,
  globalRateLimitSuccess,
  onRateLimit,
}) {
  return {
    prepare(query) {
      if (query.startsWith('DELETE')) {
        return {
          bind() {
            return {
              async run() {
                return { success: true }
              },
            }
          },
        }
      }

      assert.match(query, /INSERT INTO semantic_search_rate_limits/)
      return {
        bind(key) {
          return {
            async first() {
              onRateLimit(key)
              const success =
                key === 'global'
                  ? globalRateLimitSuccess
                  : clientRateLimitSuccess
              return success ? { request_count: 1 } : null
            },
          }
        },
      }
    },
  }
}
