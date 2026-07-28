import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test } from 'node:test'

import {
  getGitChanges,
  isFullCommitSha,
  parseNameStatus,
  validateBlogFreshnessChanges,
} from '../scripts/validate-blog-freshness.mjs'

function git(repositoryRoot, args) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

function article({
  title = 'Title',
  description = 'Description',
  date = '2026-01-01T00:00',
  lastUpdated,
  image = '/image.webp',
  body = 'Original body.',
} = {}) {
  const updatedLine = lastUpdated ? `lastUpdated: ${lastUpdated}\n` : ''
  return `---
title: ${title}
description: ${description}
date: ${date}
${updatedLine}author: gui
image: ${image}
---

${body}
`
}

function modifiedChange(
  baseContent,
  headContent,
  headPath = 'src/content/blog/post.md',
) {
  return {
    status: 'M',
    basePath: headPath,
    headPath,
    baseContent,
    headContent,
  }
}

test('新規記事はdateだけでlastUpdatedなしを許可する', () => {
  const result = validateBlogFreshnessChanges([
    {
      status: 'A',
      basePath: null,
      headPath: 'src/content/blog/new-post.md',
      baseContent: null,
      headContent: article({ body: 'New article.' }),
    },
  ])

  assert.deepEqual(result, { errors: [], meaningfulChangeCount: 0 })
})

test('本文変更時にlastUpdatedの追加または前進を要求する', () => {
  const base = article()
  const missing = validateBlogFreshnessChanges([
    modifiedChange(base, article({ body: 'Revised body.' })),
  ])
  assert.match(missing.errors[0], /changed without lastUpdated/)

  const added = validateBlogFreshnessChanges([
    modifiedChange(
      base,
      article({
        body: 'Revised body.',
        lastUpdated: '2026-07-29T12:00',
      }),
    ),
  ])
  assert.deepEqual(added.errors, [])

  const unchanged = validateBlogFreshnessChanges([
    modifiedChange(
      article({ lastUpdated: '2026-07-29T12:00' }),
      article({
        body: 'Revised body.',
        lastUpdated: '2026-07-29T12:00',
      }),
    ),
  ])
  assert.match(unchanged.errors[0], /must be later than the previous value/)
})

test('lastUpdated以外のfrontmatter変更を実質変更として扱う', () => {
  const base = article({ lastUpdated: '2026-07-28T12:00' })
  const changedFields = [
    article({
      title: 'Updated title',
      lastUpdated: '2026-07-28T12:00',
    }),
    article({
      description: 'Updated description',
      lastUpdated: '2026-07-28T12:00',
    }),
    article({
      image: '/new-image.webp',
      lastUpdated: '2026-07-28T12:00',
    }),
    article({ lastUpdated: '2026-07-28T12:00' }).replace(
      'date: 2026-01-01T00:00',
      'date: 2026-01-02T00:00',
    ),
    article({ lastUpdated: '2026-07-28T12:00' }).replace(
      'author: gui',
      `author: editor
tags: [News]
uploadedImage: /uploaded.webp
callout:
  type: info
  text: Updated`,
    ),
  ]

  for (const head of changedFields) {
    const result = validateBlogFreshnessChanges([modifiedChange(base, head)])
    assert.match(result.errors[0], /must be later than the previous value/)
  }
})

test('本文内の画像参照やリンク変更も実質変更として扱う', () => {
  const base = article({
    lastUpdated: '2026-07-28T12:00',
    body: '![Alt](/old.webp)\n\n[Link](/old/)',
  })
  const head = article({
    lastUpdated: '2026-07-28T12:00',
    body: '![Alt](/new.webp)\n\n[Link](/new/)',
  })
  const result = validateBlogFreshnessChanges([modifiedChange(base, head)])

  assert.match(result.errors[0], /must be later than the previous value/)
})

test('lastUpdated自身と意味を変えない書式差だけなら更新対象にしない', () => {
  const base = article({ lastUpdated: '2026-07-28T12:00' })
  const head = article({ lastUpdated: '2026-07-29T12:00' })
    .replace('title: Title', 'title:   Title')
    .replace(/\n/g, '\r\n')

  const result = validateBlogFreshnessChanges([modifiedChange(base, head)])

  assert.deepEqual(result, { errors: [], meaningfulChangeCount: 0 })
})

test('同一PRで変更する同一slugのlocale群はlastUpdated日を揃える', () => {
  const base = article({ lastUpdated: '2026-07-28T12:00' })
  const changes = [
    modifiedChange(
      base,
      article({
        body: 'Japanese revision.',
        lastUpdated: '2026-07-29T09:00',
      }),
    ),
    modifiedChange(
      base,
      article({
        body: 'English revision.',
        lastUpdated: '2026-07-30T09:00',
      }),
      'src/content/blog/en/post.md',
    ),
  ]

  const result = validateBlogFreshnessChanges(changes)
  assert.match(
    result.errors.at(-1),
    /changed locale variants must use the same lastUpdated calendar date/,
  )

  changes[1].headContent = article({
    body: 'English revision.',
    lastUpdated: '2026-07-29T18:00',
  })
  assert.deepEqual(validateBlogFreshnessChanges(changes).errors, [])
})

test('timezone付きlastUpdatedはUTC変換後でなくfrontmatter記載日で揃える', () => {
  const base = article({ lastUpdated: '2026-07-28T00:00+09:00' })
  const changes = [
    modifiedChange(
      base,
      article({
        body: 'Japanese revision.',
        lastUpdated: '2026-07-29T00:28+09:00',
      }),
    ),
    modifiedChange(
      base,
      article({
        body: 'English revision.',
        lastUpdated: '2026-07-29T23:58+09:00',
      }),
      'src/content/blog/en/post.md',
    ),
  ]

  assert.deepEqual(validateBlogFreshnessChanges(changes).errors, [])

  changes[1].headContent = article({
    body: 'English revision.',
    lastUpdated: '2026-07-28T15:28Z',
  })
  assert.match(
    validateBlogFreshnessChanges(changes).errors.at(-1),
    /changed locale variants must use the same lastUpdated calendar date/,
  )
})

test('Git入力は完全SHAだけを許可しname-statusのrenameを安全に解釈する', () => {
  assert.equal(isFullCommitSha('a'.repeat(40)), true)
  assert.equal(isFullCommitSha('b'.repeat(64)), true)
  assert.equal(isFullCommitSha('HEAD'), false)
  assert.equal(isFullCommitSha(`a`.repeat(40) + ';echo unsafe'), false)

  assert.deepEqual(
    parseNameStatus(
      Buffer.from(
        'M\0src/content/blog/post.md\0R100\0src/content/blog/old.md\0src/content/blog/new.md\0D\0src/content/blog/deleted.md\0',
      ),
    ),
    [
      {
        status: 'M',
        basePath: 'src/content/blog/post.md',
        headPath: 'src/content/blog/post.md',
      },
      {
        status: 'R',
        basePath: 'src/content/blog/old.md',
        headPath: 'src/content/blog/new.md',
      },
      {
        status: 'D',
        basePath: 'src/content/blog/deleted.md',
        headPath: null,
      },
    ],
  )
})

test('低類似度renameを追跡しつつ無関係な新規記事は誤認しない', async (t) => {
  const repositoryRoot = await mkdtemp(
    path.join(tmpdir(), 'acecore-blog-freshness-'),
  )
  t.after(() => rm(repositoryRoot, { force: true, recursive: true }))

  git(repositoryRoot, ['init', '--initial-branch=main'])
  git(repositoryRoot, ['config', 'user.name', 'Freshness Test'])
  git(repositoryRoot, ['config', 'user.email', 'freshness@example.invalid'])

  const blogDirectory = path.join(repositoryRoot, 'src/content/blog')
  const originalPath = path.join(blogDirectory, 'old-slug.md')
  const movedDirectory = path.join(blogDirectory, 'en')
  const movedPath = path.join(movedDirectory, 'new-slug.md')
  await mkdir(movedDirectory, { recursive: true })

  const originalBody = Array.from(
    { length: 200 },
    (_, index) => `Original line ${index}.`,
  ).join('\n')
  const rewrittenBody = Array.from(
    { length: 200 },
    (_, index) => `Completely rewritten line ${index}.`,
  ).join('\n')

  await writeFile(
    originalPath,
    article({ title: 'Original title', body: originalBody }),
  )
  git(repositoryRoot, ['add', '.'])
  git(repositoryRoot, ['commit', '-m', 'Add original article'])
  const baseSha = git(repositoryRoot, ['rev-parse', 'HEAD'])

  await rename(originalPath, movedPath)
  await writeFile(
    movedPath,
    article({ title: 'Rewritten title', body: rewrittenBody }),
  )
  git(repositoryRoot, ['add', '--all'])
  git(repositoryRoot, ['commit', '-m', 'Move and rewrite article'])
  const headSha = git(repositoryRoot, ['rev-parse', 'HEAD'])

  const { changes } = getGitChanges(baseSha, headSha, repositoryRoot)
  assert.equal(changes.length, 1)
  assert.equal(changes[0].status, 'R')
  assert.equal(changes[0].basePath, 'src/content/blog/old-slug.md')
  assert.equal(changes[0].headPath, 'src/content/blog/en/new-slug.md')

  const result = validateBlogFreshnessChanges(changes)
  assert.match(result.errors[0], /changed without lastUpdated/)

  await rm(movedPath)
  const newPath = path.join(blogDirectory, 'brand-new.md')
  const newBody = Array.from(
    { length: 200 },
    (_, index) => `Brand new article line ${index}.`,
  ).join('\n')
  await writeFile(
    newPath,
    article({
      title: 'Brand new article',
      date: '2026-02-02T00:00',
      image: '/brand-new.webp',
      body: newBody,
    }),
  )
  git(repositoryRoot, ['add', '--all'])
  git(repositoryRoot, ['commit', '-m', 'Replace with unrelated article'])
  const replacementHeadSha = git(repositoryRoot, ['rev-parse', 'HEAD'])

  const { changes: replacementChanges } = getGitChanges(
    headSha,
    replacementHeadSha,
    repositoryRoot,
  )
  assert.equal(replacementChanges.length, 1)
  assert.equal(replacementChanges[0].status, 'A')
  assert.equal(replacementChanges[0].headPath, 'src/content/blog/brand-new.md')
  assert.deepEqual(validateBlogFreshnessChanges(replacementChanges).errors, [])
})
