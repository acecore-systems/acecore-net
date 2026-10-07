import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  applyBlogTranslation,
  closeStaleOpenAiTranslationPullRequests,
  hashSource,
  makePrBody,
  needsTranslationReview,
  type BlogReviewEntry,
} from '../scripts/openai-translation-batch.ts'
import { type TranslationReview } from '../scripts/blog-translation-review.ts'

const source = `---
articleId: '11111111-1111-4111-8111-111111111111'
title: '管理者の {status}'
description: '条件を確認して公開します。'
author: acecore-team
date: '2026-10-01'
image: '/images/example.webp'
---
公開前に https://example.com/guide を確認します。
`
const metadata = {
  version: 1 as const,
  kind: 'blog' as const,
  locale: 'en',
  sourcePath: 'src/content/blog/example.md',
  previousPath: null,
  sourceHash: hashSource(source),
}
const response = {
  title: 'Administrator {status}',
  description: 'Check the conditions before publishing.',
  body: 'Check https://example.com/guide before publishing.\n',
}
const targetPath = 'src/content/blog/en/example.md'

test('記事の構造とidentityを保持し、生成結果を書いてからtitle・description・本文だけを審査する', async () => {
  const files = new Map<string, string>()
  const actual = await applyBlogTranslation(metadata, response, {
    readSource: () => source,
    writeTranslation: (filePath, content) => {
      files.set(filePath, content)
      return true
    },
    reviewTranslation: async ({ source: evidence, translation, locale }) => {
      assert.equal(files.size, 1)
      assert.equal(locale, 'en')
      assert.match(String(evidence), /管理者の \{status\}/)
      assert.match(String(translation), /Administrator \{status\}/)
      assert.match(
        String(translation),
        /Check the conditions before publishing/,
      )
      assert.match(
        String(translation),
        /Check https:\/\/example.com\/guide before publishing/,
      )
      assert.doesNotMatch(
        String(evidence) + String(translation),
        /articleId:|author:|date:|image:/,
      )
      return { status: 'pass', reason: 'faithful' }
    },
  })
  assert.deepEqual(actual, {
    changed: true,
    review: {
      path: targetPath,
      locale: 'en',
      status: 'pass',
      reason: 'faithful',
    },
  })
  const content = files.get(targetPath)
  assert.ok(content)
  for (const field of [
    "articleId: '11111111-1111-4111-8111-111111111111'",
    'author: acecore-team',
    "date: '2026-10-01'",
    "image: '/images/example.webp'",
  ])
    assert.ok(content.includes(field))
})

test('要確認・API障害でも生成済み訳文とsource markerを保持してPR全体をDraftへ渡す', async () => {
  const outcomes: TranslationReview[] = [
    { status: 'review', reason: 'meaning_review' },
    { status: 'unavailable', reason: 'api_unavailable' },
  ]
  for (const review of outcomes) {
    const files = new Map<string, string>()
    const actual = await applyBlogTranslation(metadata, response, {
      readSource: () => source,
      writeTranslation: (filePath, content) => {
        files.set(filePath, content)
        return true
      },
      reviewTranslation: async () => review,
    })
    assert.equal(actual.changed, true)
    assert.ok(actual.review)
    assert.ok(files.get(targetPath)?.includes(response.body))
    assert.equal(needsTranslationReview([actual.review]), true)
    const body = makePrBody('batch_fixture', [metadata], [actual.review])
    assert.match(body, /openai-translation-source:/)
    assert.match(body, /Draft PR/)
    assert.ok(body.includes(targetPath))
    assert.ok(body.includes(review.reason))
  }
})

test('無変更の訳文では意味審査の呼出しを追加しない', async () => {
  const actual = await applyBlogTranslation(metadata, response, {
    readSource: () => source,
    writeTranslation: () => false,
    reviewTranslation: async () => {
      throw new Error('Must not review unchanged translation')
    },
  })
  assert.deepEqual(actual, { changed: false, review: null })
})

test('source hash・placeholder・URL・code fence検査は書き込みと意味審査より先に停止する', async () => {
  const cases = [
    {
      metadata: { ...metadata, sourceHash: '0'.repeat(64) },
      response,
      error: /Stale source/,
    },
    {
      metadata,
      response: { ...response, title: 'Administrator' },
      error: /must preserve \{status\}/,
    },
    {
      metadata,
      response: { ...response, body: 'Check the guide before publishing.' },
      error: /must preserve https:/,
    },
    {
      metadata,
      response: { ...response, body: '```\nhttps://example.com/guide\n```\n' },
      error: /fenced code block/,
    },
  ]
  for (const candidate of cases) {
    await assert.rejects(
      applyBlogTranslation(candidate.metadata, candidate.response, {
        readSource: () => source,
        writeTranslation: () => {
          throw new Error('Must not write invalid translation')
        },
        reviewTranslation: async () => {
          throw new Error('Must not review invalid translation')
        },
      }),
      candidate.error,
    )
  }
})

test('slug変更でもidentityを保持し、旧翻訳の除去を含めた変更を保留できる', async () => {
  const removed: string[] = []
  const written = new Map<string, string>()
  const actual = await applyBlogTranslation(
    { ...metadata, previousPath: 'src/content/blog/old.md' },
    response,
    {
      readSource: () => source,
      writeTranslation: (filePath, content) => {
        written.set(filePath, content)
        return true
      },
      removePrevious: (filePath) => {
        removed.push(filePath)
        return true
      },
      reviewTranslation: async () => ({
        status: 'review',
        reason: 'meaning_review',
      }),
    },
  )
  assert.deepEqual(removed, ['src/content/blog/en/old.md'])
  assert.ok(
    written
      .get(targetPath)
      ?.includes("articleId: '11111111-1111-4111-8111-111111111111'"),
  )
  assert.ok(actual.review)
  assert.equal(needsTranslationReview([actual.review]), true)
})

test('記事と固定ページが混在してもsource markerを残し、1件の保留でBatch PR全体を保留する', () => {
  const pass: BlogReviewEntry = {
    path: targetPath,
    locale: 'en',
    status: 'pass',
    reason: 'faithful',
  }
  const hold: BlogReviewEntry = {
    path: 'src/content/blog/de/example.md',
    locale: 'de',
    status: 'unavailable',
    reason: 'api_unavailable',
  }
  const site = {
    ...metadata,
    kind: 'site' as const,
    sourcePath: 'src/i18n/source/ja/pages/home.json',
  }
  assert.equal(needsTranslationReview([]), false)
  assert.equal(needsTranslationReview([pass]), false)
  assert.equal(needsTranslationReview([pass, hold]), true)
  const body = makePrBody('batch_mixed', [metadata, site], [pass, hold])
  assert.equal((body.match(/openai-translation-source:/g) ?? []).length, 2)
  assert.match(body, /Draft PR/)
  assert.ok(body.includes(hold.path))
  assert.doesNotMatch(makePrBody('batch_pass', [metadata], [pass]), /Draft PR/)
})

test('投入・回収の古いPR整理はDraftと状態不明を保持し、通常の古いPRだけを閉じる', async () => {
  const staleMarker = Buffer.from(
    JSON.stringify({
      kind: 'blog',
      sourcePath: 'src/content/blog/website-renewal.md',
      sourceHash: '0'.repeat(64),
    }),
  ).toString('base64url')
  const body = `<!-- openai-translation-source:${staleMarker} -->`
  const calls: Array<{ pathName: string; method?: string }> = []
  const pulls = [
    { number: 1, body, draft: true, head: { ref: 'translation/openai/held' } },
    {
      number: 2,
      body,
      draft: false,
      head: { ref: 'translation/openai/stale' },
    },
    { number: 3, body, head: { ref: 'translation/openai/unknown' } },
  ]
  await closeStaleOpenAiTranslationPullRequests({
    environment: {
      GITHUB_TOKEN: 'fixture-token',
      GITHUB_REPOSITORY: 'acecore-systems/acecore-net',
    },
    request: async <T>(pathName: string, options?: RequestInit): Promise<T> => {
      calls.push({ pathName, method: options?.method })
      return (options?.method ? {} : pulls) as T
    },
  })
  assert.deepEqual(calls, [
    { pathName: '/pulls?state=open&per_page=100', method: undefined },
    { pathName: '/pulls/2', method: 'PATCH' },
  ])
})
