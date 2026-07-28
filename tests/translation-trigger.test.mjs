import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  classifyCmsCommitSet,
  isCmsCommitSubject,
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
