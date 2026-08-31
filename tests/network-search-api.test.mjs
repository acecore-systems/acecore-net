import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  onRequestOptions,
  onRequestPost,
} from '../functions/api/network-search.ts'

const queryVector = Array.from({ length: 1024 }, () => 0.01)
let activeEmbedding = queryVector
let activeEmbeddingRequest = () => {}

test('許可済み公式originだけが自サイトを除く横断Vectorize結果を取得できる', async () => {
  const queriedSources = []
  const env = createEnv({
    matchesBySource: {
      acecore: [match({ id: 'acecore', score: 0.91, url: '/services/' })],
      schools: [
        match({
          id: 'schools',
          score: 0.82,
          url: '/learning-support/',
          title: '学習支援',
        }),
      ],
      aceserverWiki: [
        match({
          id: 'wiki',
          score: 0.73,
          url: 'https://asv-wiki.acecore.net/article/rules/',
          title: 'ルール',
        }),
      ],
    },
    onQuery(source) {
      queriedSources.push(source)
    },
  })

  const response = await withWorkersAiEmbedding(() =>
    onRequestPost({
      request: networkRequest('https://systems.acecore.net'),
      env,
    }),
  )
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://systems.acecore.net',
  )
  assert.equal(response.headers.get('Vary'), 'Origin')
  assert.equal(
    response.headers.get('Cross-Origin-Resource-Policy'),
    'cross-origin',
  )
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.deepEqual(queriedSources, [
    'acecore',
    'schools',
    'aceserverWiki',
    'aceserverPortal',
    'worldFoundation',
  ])
  assert.equal(body.results.length, 3)
  assert.deepEqual(
    body.results.map((result) => result.source),
    ['acecore', 'schools', 'wiki'],
  )
  assert.equal(body.results[0].url, 'https://acecore.net/services/')
  assert.equal(
    body.results[1].url,
    'https://schools.acecore.net/learning-support/',
  )
  assert.equal(
    body.results[2].url,
    'https://asv-wiki.acecore.net/article/rules/',
  )
  assert.deepEqual(
    body.results.map((result) => result.rank),
    [1, 2, 3],
  )
  assert.ok(
    body.results.every((result) => typeof result.sourceLabel === 'string'),
  )
})

test('不許可originは埋め込みやVectorizeを呼ばずに拒否する', async () => {
  let workersAiCalled = false
  const response = await withWorkersAiEmbedding(
    () =>
      onRequestPost({
        request: networkRequest('https://example.invalid'),
        env: createEnv(),
      }),
    {
      onRequest() {
        workersAiCalled = true
      },
    },
  )

  assert.equal(response.status, 403)
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null)
  assert.equal(workersAiCalled, false)
})

test('OPTIONSは許可originだけへ限定CORS応答を返す', async () => {
  const allowed = await onRequestOptions({
    request: new Request('https://acecore.net/api/network-search', {
      method: 'OPTIONS',
      headers: { Origin: 'https://schools.acecore.net' },
    }),
    env: createEnv(),
  })
  const denied = await onRequestOptions({
    request: new Request('https://acecore.net/api/network-search', {
      method: 'OPTIONS',
      headers: { Origin: 'https://example.invalid' },
    }),
    env: createEnv(),
  })

  assert.equal(allowed.status, 204)
  assert.equal(
    allowed.headers.get('Access-Control-Allow-Origin'),
    'https://schools.acecore.net',
  )
  assert.equal(allowed.headers.get('Access-Control-Allow-Credentials'), null)
  assert.equal(denied.status, 403)
  assert.equal(denied.headers.get('Access-Control-Allow-Origin'), null)
})

test('不正または上限超過requestはD1 rate limitを消費しない', async () => {
  const rateLimitStatements = []
  const env = createEnv({
    onRateLimit(query) {
      rateLimitStatements.push(query)
    },
  })
  const invalidJson = await onRequestPost({
    request: new Request('https://acecore.net/api/network-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://schools.acecore.net',
      },
      body: '{',
    }),
    env,
  })
  const invalidPayload = await onRequestPost({
    request: networkRequest('https://schools.acecore.net', {}),
    env,
  })
  const tooLarge = await onRequestPost({
    request: new Request('https://acecore.net/api/network-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://schools.acecore.net',
      },
      body: 'x'.repeat(2049),
    }),
    env,
  })

  assert.equal(invalidJson.status, 400)
  assert.equal(invalidPayload.status, 400)
  assert.equal(tooLarge.status, 413)
  assert.deepEqual(rateLimitStatements, [])
})

test('encoded・NFKC後に管理pathとなるmetadata URLは横断結果として返さない', async () => {
  const response = await withWorkersAiEmbedding(() =>
    onRequestPost({
      request: networkRequest('https://schools.acecore.net'),
      env: createEnv({
        matchesBySource: {
          systems: [
            match({
              id: 'bad-system-url',
              score: 0.99,
              url: 'https://example.invalid/phishing',
            }),
          ],
          aceserverWiki: [
            match({
              id: 'bad-wiki-path',
              score: 0.98,
              url: 'https://asv-wiki.acecore.net/admin/',
            }),
          ],
          systems: [
            match({
              id: 'encoded-admin',
              score: 0.97,
              url: '/%61dmin/',
            }),
            match({
              id: 'encoded-api',
              score: 0.96,
              url: '/%61pi/search/',
            }),
            match({
              id: 'double-encoded-admin',
              score: 0.95,
              url: '/%2561dmin/',
            }),
            match({
              id: 'double-encoded-api',
              score: 0.94,
              url: '/%2561pi/search/',
            }),
            match({
              id: 'encoded-control',
              score: 0.93,
              url: '/%00public/',
            }),
            match({
              id: 'nfkc-encoded-admin',
              score: 0.92,
              url: '/%EF%BC%85%36%31dmin/',
            }),
            match({
              id: 'double-encoded-parent',
              score: 0.91,
              url: '/%252e%252e/admin/',
            }),
            match({
              id: 'raw-parent',
              score: 0.9,
              url: '/safe/../public/',
            }),
            match({
              id: 'raw-backslash',
              score: 0.89,
              url: '/safe\\private/',
            }),
            match({
              id: 'raw-control',
              score: 0.88,
              url: '/safe\tpublic/',
            }),
          ],
        },
      }),
    }),
  )
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(body.results, [])
})

function networkRequest(
  origin,
  body = { query: 'サイト制作の相談', locale: 'ja' },
) {
  return new Request('https://acecore.net/api/network-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: origin,
      'X-Acecore-Search-Client': '018f7e5a-7b4d-7c6a-8e9f-0123456789ab',
    },
    body: JSON.stringify(body),
  })
}

function match({
  id,
  score,
  url,
  title = '公式情報',
  section = '案内',
  excerpt = '公開済みの公式情報です。',
  contentType = 'page',
  locale = 'ja',
}) {
  return {
    id,
    score,
    metadata: { url, title, section, excerpt, contentType, locale },
  }
}

function createEnv({
  matchesBySource = {},
  onQuery = () => {},
  onRateLimit = () => {},
} = {}) {
  return {
    SEARCH_EMBEDDING_MODEL: '@cf/baai/bge-m3',
    SEARCH_EMBEDDING_DIMENSIONS: '1024',
    AI: {
      async run(model, input) {
        assert.equal(model, '@cf/baai/bge-m3')
        assert.deepEqual(input, {
          text: input.text,
          truncate_inputs: false,
        })
        activeEmbeddingRequest(input)
        return {
          data: [activeEmbedding],
          shape: [1, 1024],
          pooling: 'cls',
        }
      },
    },
    SEARCH_ENABLED: 'true',
    SEARCH_MIN_SCORE: '0.50',
    SYSTEMS_SEARCH_ENABLED: 'true',
    SYSTEMS_SEARCH_MIN_SCORE: '0.50',
    SCHOOLS_SEARCH_ENABLED: 'true',
    SCHOOLS_SEARCH_MIN_SCORE: '0.50',
    ACESERVER_WIKI_SEARCH_ENABLED: 'true',
    ACESERVER_WIKI_SEARCH_MIN_SCORE: '0.40',
    ACESERVER_PORTAL_SEARCH_ENABLED: 'true',
    ACESERVER_PORTAL_SEARCH_MIN_SCORE: '0.50',
    WORLD_FOUNDATION_SEARCH_ENABLED: 'true',
    WORLD_FOUNDATION_SEARCH_MIN_SCORE: '0.40',
    SEARCH_RATE_LIMIT_DB: createRateLimitDatabase(onRateLimit),
    SEARCH_INDEX: createIndex('acecore', matchesBySource, onQuery),
    SYSTEMS_SEARCH_INDEX: createIndex('systems', matchesBySource, onQuery),
    SCHOOLS_SEARCH_INDEX: createIndex('schools', matchesBySource, onQuery),
    ACESERVER_WIKI_SEARCH_INDEX: createIndex(
      'aceserverWiki',
      matchesBySource,
      onQuery,
    ),
    ACESERVER_PORTAL_SEARCH_INDEX: createIndex(
      'aceserverPortal',
      matchesBySource,
      onQuery,
    ),
    WORLD_FOUNDATION_SEARCH_INDEX: createIndex(
      'worldFoundation',
      matchesBySource,
      onQuery,
    ),
  }
}

function createIndex(source, matchesBySource, onQuery) {
  return {
    async query(values, options) {
      assert.equal(values.length, 1024)
      assert.deepEqual(options, {
        namespace: 'ja',
        topK: 15,
        returnMetadata: 'all',
        returnValues: false,
      })
      onQuery(source)
      const matches = matchesBySource[source] ?? []
      return { count: matches.length, matches }
    },
  }
}

async function withWorkersAiEmbedding(
  callback,
  { embedding = queryVector, onRequest = () => {} } = {},
) {
  const previousEmbedding = activeEmbedding
  const previousRequest = activeEmbeddingRequest
  activeEmbedding = embedding
  activeEmbeddingRequest = onRequest

  try {
    return await callback()
  } finally {
    activeEmbedding = previousEmbedding
    activeEmbeddingRequest = previousRequest
  }
}

function createRateLimitDatabase(onPrepare) {
  return {
    prepare(query) {
      onPrepare(query)
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
        bind() {
          return {
            async first() {
              return { request_count: 1 }
            },
          }
        },
      }
    },
  }
}
