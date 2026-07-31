import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  buildBlogTaskPayload,
  classifyCmsCommitSet,
  isCmsCommitSubject,
  pairJapaneseBlogRenamesByArticleId,
} from '../scripts/create-translation-prs.mjs'

const parentSha = 'a'.repeat(40)
const directCmsCommit = {
  sha: 'b'.repeat(40),
  parentShas: [parentSha],
  subject: 'cms: update src/i18n/source/ja/pages/home.json',
}

test('mainへのdirect CMS commitを翻訳対象として検出する', () => {
  assert.equal(isCmsCommitSubject(directCmsCommit.subject), true)
  assert.equal(classifyCmsCommitSet([directCmsCommit]), 'cms-only')
})

test('旧PRのmerge commitが混在してもCMS commitを検出する', () => {
  const mergeCommit = {
    sha: 'c'.repeat(40),
    parentShas: [parentSha, directCmsCommit.sha],
    subject: 'Merge pull request #123 from cms/acecore/example',
  }

  assert.equal(classifyCmsCommitSet([mergeCommit, directCmsCommit]), 'cms-only')
})

test('通常commitだけのpushは翻訳対象にしない', () => {
  assert.equal(
    classifyCmsCommitSet([
      {
        ...directCmsCommit,
        subject: 'サイト文言を更新',
      },
    ]),
    'none',
  )
})

test('CMS commitと通常commitが同じpushに混在した場合は停止対象にする', () => {
  assert.equal(
    classifyCmsCommitSet([
      directCmsCommit,
      {
        sha: 'd'.repeat(40),
        parentShas: [directCmsCommit.sha],
        subject: 'コードを更新',
      },
    ]),
    'mixed',
  )
})

test('日本語記事のslug変更を全localeの単一rename taskとして案内する', () => {
  const payload = buildBlogTaskPayload({
    sourcePath: 'src/content/blog/new-slug.md',
    previousPath: 'src/content/blog/old-slug.md',
    changeType: 'R',
    sourceDiff: 'rename diff',
    locales: ['en', 'de'],
    headSha: 'b'.repeat(40),
    repository: 'acecore-systems/acecore-net',
  })

  assert.equal(payload.title, '[translation] Rename new-slug.md')
  assert.match(
    payload.problemStatement,
    /Previous source path: src\/content\/blog\/old-slug\.md/,
  )
  assert.match(
    payload.problemStatement,
    /src\/content\/blog\/\{locale\}\/old-slug\.md.*src\/content\/blog\/\{locale\}\/new-slug\.md/s,
  )
  assert.match(
    payload.problemStatement,
    /Preserve the source articleId exactly/,
  )
  assert.match(payload.problemStatement, /including `articleId`.*`lastUpdated`/)
  assert.match(payload.problemStatement, /rename diff/)
})

test('低類似度の追加・削除も同一articleIdなら1件のrenameへ統合する', () => {
  const articleId = '11111111-1111-4111-8111-111111111111'
  const sources = new Map([
    [
      'base:src/content/blog/old-slug.md',
      `---
articleId: ${articleId}
---

Old body.`,
    ],
    [
      'head:src/content/blog/new-slug.md',
      `---
articleId: ${articleId}
---

Completely rewritten body.`,
    ],
  ])
  const paired = pairJapaneseBlogRenamesByArticleId(
    [
      {
        status: 'D',
        previousPath: null,
        path: 'src/content/blog/old-slug.md',
      },
      {
        status: 'A',
        previousPath: null,
        path: 'src/content/blog/new-slug.md',
      },
    ],
    {
      baseSha: 'base',
      headSha: 'head',
      readSource: (ref, filePath) => sources.get(`${ref}:${filePath}`) ?? null,
    },
  )

  assert.deepEqual(paired, [
    {
      status: 'R',
      previousPath: 'src/content/blog/old-slug.md',
      path: 'src/content/blog/new-slug.md',
    },
  ])
})
