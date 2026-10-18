import assert from 'node:assert/strict'
import test from 'node:test'
import { refreshDesignsEvidence } from '../functions/lib/designs-catalog.ts'

const result = {
  sourceIntent: 'acecore',
  queriedSources: ['acecore'],
  entries: [
    {
      source: 'acecore',
      url: 'https://acecore.net/en/designs/',
      excerpt: 'Obsolete price: 12345',
    },
  ],
}
const catalog = {
  schemaVersion: 1,
  sourceUrl: 'https://designs.acecore.net/',
  locales: {
    en: {
      conditionsBody: 'Tax included. Final estimate by project.',
      groups: [
        {
          services: [
            {
              id: 'voice',
              title: 'Voice recording',
              description: 'Up to 1000 characters',
              price: 5000,
            },
          ],
        },
      ],
    },
  },
}

test('公開カタログの現在価格と言語URLを使い、更新後もコードの旧価格を残さない', async () => {
  for (const price of [5000, 6000]) {
    const copy = structuredClone(catalog)
    copy.locales.en.groups[0].services[0].price = price
    const actual = await refreshDesignsEvidence(
      result,
      'Acecore Designs',
      'en',
      async () => Response.json(copy),
    )
    assert.equal(actual.entries.length, 1)
    assert.equal(actual.entries[0].url, 'https://designs.acecore.net/en/')
    assert.equal(
      JSON.parse(actual.entries[0].excerpt).services[0]
        .startingPriceJPYTaxIncluded,
      price,
    )
    assert.ok(!actual.entries[0].excerpt.includes('12345'))
  }
})

test('取得不能・不正・過大カタログは旧価格へ戻さず公式導線を残す', async () => {
  for (const fetcher of [
    async () => {
      throw new Error('network')
    },
    async () => new Response('unavailable', { status: 503 }),
    async () =>
      Response.json({ ...catalog, sourceUrl: 'https://untrusted.example/' }),
    async () => Response.json({ ...catalog, schemaVersion: 2 }),
    async () => Response.json({ ...catalog, locales: {} }),
    async () =>
      new Response('x'.repeat(512 * 1024 + 1), {
        headers: { 'content-type': 'application/json' },
      }),
  ]) {
    const actual = await refreshDesignsEvidence(
      result,
      'Acecore Designs',
      'en',
      fetcher,
    )
    assert.equal(actual.entries.length, 1)
    assert.equal(actual.entries[0].url, 'https://designs.acecore.net/en/')
    assert.match(actual.entries[0].excerpt, /could not be verified/u)
    assert.ok(!actual.entries[0].excerpt.includes('12345'))
  }
})

test('他事業と会社概要の質問ではDesigns価格を取得しない', async () => {
  const fetcher = async () => {
    assert.fail('unexpected catalog request')
  }
  const other = { ...result, sourceIntent: 'schools' }
  assert.equal(
    await refreshDesignsEvidence(other, 'Acecore Designs', 'ja', fetcher),
    other,
  )
  const corporate = { ...result, entries: [] }
  assert.equal(
    await refreshDesignsEvidence(corporate, '会社概要', 'ja', fetcher),
    corporate,
  )
})
