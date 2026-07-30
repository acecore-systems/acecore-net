import assert from 'node:assert/strict'
import { test } from 'node:test'

import { getSpecialistUrl } from '../src/utils/specialist-url.ts'

const translatedLocales = ['en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru']

test('日本語の専門サイトリンクは既存の非prefixルートを保つ', () => {
  assert.equal(
    getSpecialistUrl('https://systems.acecore.net', 'ja', '/services/'),
    'https://systems.acecore.net/services/',
  )
  assert.equal(
    getSpecialistUrl('https://asv.acecore.net', 'ja'),
    'https://asv.acecore.net',
  )
})

test('翻訳ページの専門サイトリンクは同じlocaleを引き継ぐ', () => {
  for (const locale of translatedLocales) {
    assert.equal(
      getSpecialistUrl('https://systems.acecore.net/', locale, '/pricing/'),
      `https://systems.acecore.net/${locale}/pricing/`,
    )
    assert.equal(
      getSpecialistUrl('https://asv.acecore.net/', locale),
      `https://asv.acecore.net/${locale}/`,
    )
  }
})
