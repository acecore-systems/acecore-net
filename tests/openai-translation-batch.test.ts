import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import {
  areOpenAiTranslationMarkersCurrent,
  decodeMetadata,
  findCompletedPendingBatch,
  getSiteFragment,
  hashSource,
  parseJsonResponse,
} from '../scripts/openai-translation-batch.ts'

test('sourceHashは改行コード差を同じ版として扱う', () => {
  assert.equal(hashSource('本文\r\n'), hashSource('本文\n'))
})

test('Batch custom_idは記事・locale・版IDを復元できる', () => {
  const metadata = {
    version: 1,
    kind: 'blog',
    locale: 'en',
    sourcePath: 'src/content/blog/website-renewal.md',
    previousPath: null,
    sourceHash: 'a'.repeat(64),
  }
  const customId = `acecore-net:${Buffer.from(JSON.stringify(metadata)).toString('base64url')}`

  assert.deepEqual(decodeMetadata(customId), metadata)
})

test('ページsourceは対応する翻訳JSONのpages配下だけを更新する', () => {
  assert.deepEqual(
    getSiteFragment('src/i18n/source/ja/pages/home.json').targetPath,
    ['pages', 'home'],
  )
})

test('queuedの新しいBatchを飛ばして完了済みBatchを回収する', async () => {
  const requested: string[] = []
  const completed = await findCompletedPendingBatch(
    ['new-queued', 'old-completed', 'already-processed'],
    new Set(['already-processed']),
    async (body) => {
      const requestId = String(body.request_id)
      requested.push(requestId)
      return requestId === 'old-completed'
        ? { responses: [], status: 'complete' }
        : { status: 'queued' }
    },
  )

  assert.deepEqual(requested, ['new-queued', 'old-completed'])
  assert.equal(completed?.batchId, 'old-completed')
})

test('Batchの部分完了・refusal・複数choiceを翻訳へ適用しない', () => {
  assert.deepEqual(
    parseJsonResponse({
      choices: [
        {
          index: 0,
          finish_reason: 'stop',
          message: { content: '{"translated":true}', refusal: null },
        },
      ],
    }),
    { translated: true },
  )
  for (const response of [
    {
      choices: [
        {
          index: 0,
          finish_reason: 'length',
          message: { content: '{"partial":true}' },
        },
      ],
    },
    {
      choices: [
        {
          index: 0,
          finish_reason: 'stop',
          message: { content: '{}', refusal: 'blocked' },
        },
      ],
    },
    { choices: [] },
  ]) {
    assert.throws(() => parseJsonResponse(response))
  }
})

test('PRはsource markerを必須とし、sourceHashが異なる場合は古い版として扱う', () => {
  const sourcePath = 'src/content/blog/website-renewal.md'
  const source = readFileSync(sourcePath, 'utf8')
  const marker = Buffer.from(
    JSON.stringify({
      kind: 'blog',
      sourcePath,
      sourceHash: hashSource(source),
    }),
  ).toString('base64url')
  const staleMarker = Buffer.from(
    JSON.stringify({
      kind: 'blog',
      sourcePath,
      sourceHash: '0'.repeat(64),
    }),
  ).toString('base64url')

  assert.equal(
    areOpenAiTranslationMarkersCurrent(
      `<!-- openai-translation-source:${marker} -->`,
    ),
    true,
  )
  assert.equal(
    areOpenAiTranslationMarkersCurrent(
      `<!-- openai-translation-source:${staleMarker} -->`,
    ),
    false,
  )
  assert.equal(areOpenAiTranslationMarkersCurrent(null), false)
  assert.equal(areOpenAiTranslationMarkersCurrent('markerなし'), false)
})

test('WorkflowはGLM 5.3 Flash/highをWorkers AI Batchへ投入し、回収後にBot PRを作る', async () => {
  const submitWorkflow = await readFile(
    '.github/workflows/submit-openai-translation-batch.yml',
    'utf8',
  )
  const collectWorkflow = await readFile(
    '.github/workflows/collect-openai-translation-batch.yml',
    'utf8',
  )

  assert.match(submitWorkflow, /CLOUDFLARE_WORKERS_AI_API_TOKEN/u)
  assert.match(submitWorkflow, /workers-ai-translation-pending-/u)
  assert.match(submitWorkflow, /sleep 900/u)
  assert.doesNotMatch(submitWorkflow, /cms_only|cms-only/u)
  assert.match(collectWorkflow, /translation\/workers-ai\//u)
  assert.match(
    collectWorkflow,
    /client-id:\s+\$\{\{ secrets\.TRANSLATION_BOT_CLIENT_ID \}\}/u,
  )
  assert.doesNotMatch(collectWorkflow, /TRANSLATION_BOT_APP_ID/u)
  assert.doesNotMatch(collectWorkflow, /^\s+app-id:/mu)
  assert.match(collectWorkflow, /workers-ai-translation-processed-/u)
  assert.match(collectWorkflow, /Format collected translation files/u)
  assert.match(collectWorkflow, /git diff --name-only --diff-filter=ACMRT -z/u)
  assert.match(collectWorkflow, /npx prettier --write --/u)
  assert.match(
    collectWorkflow,
    /GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/u,
  )
  const batchScript = readFileSync(
    'scripts/openai-translation-batch.ts',
    'utf8',
  )
  assert.match(batchScript, /closeStaleOpenAiTranslationPullRequests/u)
  assert.match(batchScript, /@cf\/zai-org\/glm-5\.3-flash/u)
  assert.match(batchScript, /BATCH_REASONING_EFFORT = 'high'/u)
  assert.match(batchScript, /queueRequest=true/u)
  assert.doesNotMatch(batchScript, /api\.openai\.com\/v1/u)
  assert.match(batchScript, /between 50 and 160 Unicode characters/u)
})
