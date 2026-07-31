import assert from 'node:assert/strict'
import { test } from 'node:test'

import { validateCmsBlogFreshness } from '../functions/admin/api/_cms-blog-freshness-validator.ts'
import { validateCmsAdditionContents } from '../functions/admin/api/_cms-content-validator.ts'
import { isValidContentDateValue } from '../src/utils/content-date.ts'

const ARTICLE_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_ARTICLE_ID = '22222222-2222-4222-8222-222222222222'

function article({
  articleId = ARTICLE_ID,
  author = 'gui',
  body = 'Original body.',
  date = '2026-07-28T12:00',
  description = 'CMS freshness validation test',
  image,
  lastUpdated,
  title = 'Freshness test',
} = {}) {
  return `---
title: ${title}
description: ${description}
articleId: ${articleId}
date: ${date}
${lastUpdated ? `lastUpdated: ${lastUpdated}\n` : ''}author: ${author}
${image ? `image: ${image}\n` : ''}---

${body}
`
}

function addition(path, source) {
  const bytes = Buffer.from(source)

  return {
    path,
    contents: bytes.toString('base64'),
    byteSize: bytes.byteLength,
  }
}

test('新規記事はlastUpdatedを省略でき、指定時は公開日以降を要求する', () => {
  const path = 'src/content/blog/new-article.md'

  assert.doesNotThrow(() =>
    validateCmsBlogFreshness({
      additions: [addition(path, article())],
      currentState: [],
    }),
  )

  const invalid = addition(path, article({ lastUpdated: '2026-07-27T12:00' }))

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [invalid],
        currentState: [],
      }),
    /lastUpdatedは公開日date以降/,
  )
  assert.throws(
    () => validateCmsAdditionContents([invalid]),
    /CMS保存内容が不正/,
  )
})

test('articleIdはCMS保存とschemaで同じUUID制約を使う', () => {
  const path = 'src/content/blog/invalid-article-id.md'
  const invalid = addition(
    path,
    article({ articleId: '00000000-0000-0000-0000-000000000000' }),
  )

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [invalid],
        currentState: [],
      }),
    /articleIdが不正/,
  )
  assert.throws(
    () => validateCmsAdditionContents([invalid]),
    /CMS保存内容が不正/,
  )
})

test('存在しない暦日のdateとlastUpdatedを拒否する', () => {
  const path = 'src/content/blog/invalid-calendar-date.md'

  for (const source of [
    article({ date: '2026-02-30T12:00' }),
    article({ lastUpdated: '2026-02-30T12:00' }),
  ]) {
    const invalid = addition(path, source)

    assert.throws(
      () => validateCmsAdditionContents([invalid]),
      /CMS保存内容が不正/,
    )
  }

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [
          addition(path, article({ lastUpdated: '2026-02-30T12:00' })),
        ],
        currentState: [],
      }),
    /lastUpdatedが不正/,
  )
})

test('日時検証は閏日と時刻・timezone境界を厳密に扱う', () => {
  assert.equal(isValidContentDateValue('2024-02-29T23:59:59+09:00'), true)
  assert.equal(isValidContentDateValue('2026-02-29T12:00'), false)
  assert.equal(isValidContentDateValue('2026-01-01T24:00'), false)
  assert.equal(isValidContentDateValue('2026-01-01T12:60'), false)
  assert.equal(isValidContentDateValue('2026-01-01T12:00+24:00'), false)
})

test('lastUpdated未設定の既存記事でも公開日より前の更新日を拒否する', () => {
  const path = 'src/content/blog/existing.md'

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [
          addition(
            path,
            article({
              body: 'Revised body.',
              lastUpdated: '2026-07-27T12:00',
            }),
          ),
        ],
        currentState: [{ path, contents: article() }],
      }),
    /lastUpdatedは公開日date以降/,
  )
})

test('同一articleIdのslug変更では更新日の前進を要求する', () => {
  const basePath = 'src/content/blog/old-slug.md'
  const headPath = 'src/content/blog/new-slug.md'
  const image = '/uploads/example.png'

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [
          addition(
            headPath,
            article({ body: 'Completely rewritten body.', image }),
          ),
        ],
        currentState: [
          {
            path: basePath,
            contents: article({ image }),
          },
        ],
        deletions: [{ path: basePath }],
      }),
    /lastUpdatedを設定/,
  )
})

test('内容が同一でもslug変更ではlastUpdatedの前進を要求する', () => {
  const basePath = 'src/content/blog/old-slug.md'
  const headPath = 'src/content/blog/new-slug.md'
  const source = article({
    image: '/uploads/example.png',
    lastUpdated: '2026-07-29T12:00',
  })

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [addition(headPath, source)],
        currentState: [{ path: basePath, contents: source }],
        deletions: [{ path: basePath }],
      }),
    /lastUpdatedは以前より後の日時/,
  )
})

test('同一articleIdならslugと識別用frontmatterを同時変更できる', () => {
  const basePath = 'src/content/blog/old-slug.md'
  const headPath = 'src/content/blog/new-slug.md'

  assert.doesNotThrow(() =>
    validateCmsBlogFreshness({
      additions: [
        addition(
          headPath,
          article({
            author: 'new-author',
            date: '2026-07-29T12:00',
            image: '/uploads/new-image.png',
            lastUpdated: '2026-07-31T12:00',
            title: 'Renamed article',
          }),
        ),
      ],
      currentState: [
        {
          path: basePath,
          contents: article({
            image: '/uploads/old-image.png',
            lastUpdated: '2026-07-30T12:00',
          }),
        },
      ],
      deletions: [{ path: basePath }],
    }),
  )
})

test('同一articleIdの記事を旧pathを残して別pathへ追加できない', () => {
  const basePath = 'src/content/blog/old-slug.md'
  const headPath = 'src/content/blog/new-slug.md'

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [addition(headPath, article())],
        currentState: [{ path: basePath, contents: article() }],
      }),
    /articleIdは既に使用されています/,
  )
})

test('既存pathのarticleIdを変更できない', () => {
  const path = 'src/content/blog/existing.md'

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [
          addition(
            path,
            article({
              articleId: OTHER_ARTICLE_ID,
              lastUpdated: '2026-07-30T12:00',
            }),
          ),
        ],
        currentState: [{ path, contents: article() }],
      }),
    /既存記事のarticleIdを変更できません/,
  )
})

test('slugが異なるlocale群も同一articleIdならlastUpdated日を揃える', () => {
  const jaPath = 'src/content/blog/post.md'
  const enPath = 'src/content/blog/en/translated-post.md'

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [
          addition(
            jaPath,
            article({
              body: 'Japanese revision.',
              lastUpdated: '2026-07-30T09:00',
            }),
          ),
          addition(
            enPath,
            article({
              body: 'English revision.',
              lastUpdated: '2026-07-31T09:00',
            }),
          ),
        ],
        currentState: [
          {
            path: jaPath,
            contents: article({ lastUpdated: '2026-07-29T12:00' }),
          },
          {
            path: enPath,
            contents: article({ lastUpdated: '2026-07-29T12:00' }),
          },
        ],
      }),
    /同一記事として同時に変更する多言語記事のlastUpdated日を揃えて/,
  )
})

test('articleIdが異なる削除と新規作成は対応関係不明として拒否する', () => {
  const basePath = 'src/content/blog/retired-article.md'
  const headPath = 'src/content/blog/brand-new-article.md'

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [
          addition(
            headPath,
            article({
              articleId: OTHER_ARTICLE_ID,
              body: 'Brand new body.',
              date: '2026-07-30T12:00',
              image: '/uploads/new-image.png',
              title: 'Brand new article',
            }),
          ),
        ],
        currentState: [
          {
            path: basePath,
            contents: article({ image: '/uploads/old-image.png' }),
          },
        ],
        deletions: [{ path: basePath }],
      }),
    /対応関係を判定できない/,
  )
})

test('既存記事のlastUpdatedだけを削除または巻き戻せない', () => {
  const path = 'src/content/blog/existing.md'
  const base = article({ lastUpdated: '2026-07-30T12:00' })

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [addition(path, article())],
        currentState: [{ path, contents: base }],
      }),
    /lastUpdatedを削除できません/,
  )

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [
          addition(path, article({ lastUpdated: '2026-07-29T12:00' })),
        ],
        currentState: [{ path, contents: base }],
      }),
    /以前より前の日時にできません/,
  )
})
