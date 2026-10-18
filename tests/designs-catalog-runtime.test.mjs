import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'
import { Miniflare, convertV4MiniflareOptions } from 'miniflare'

test('Workers実ランタイムで取得オプションを受理し、リダイレクトは追跡しない', async () => {
  const source = stripTypeScriptTypes(
    readFileSync(
      new URL('../functions/lib/designs-catalog.ts', import.meta.url),
      'utf8',
    ),
  )
  const script = `${source}
    export default { async fetch() {
      const result = { sourceIntent: 'acecore', queriedSources: [], entries: [] }
      const catalog = { schemaVersion: 1, sourceUrl: 'https://designs.acecore.net/', locales: { ja: { conditionsBody: '税込開始料金', groups: [{ services: [{ id: 'voice-recording', title: 'ナレーション・朗読収録', price: 5000, description: '1000字以内' }] }] } } }
      const valid = await refreshDesignsEvidence(result, 'Acecore Designs', 'ja', async (url, init) => {
        // Node accepts redirect:error, but workerd rejects it at Request construction.
        const request = new Request(url, init)
        if (request.redirect !== 'manual') throw new Error('Redirect may leave the fixed official origin')
        return Response.json(catalog)
      })
      const redirected = await refreshDesignsEvidence(result, 'Acecore Designs', 'ja', async (url, init) => {
        new Request(url, init)
        return new Response(null, { status: 302, headers: { Location: 'https://untrusted.example/' } })
      })
      return Response.json({ valid, redirected })
    } }
  `
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      compatibilityDate: '2026-07-27',
      script,
    }),
  )
  try {
    const response = await mf.dispatchFetch('http://localhost/')
    const { valid, redirected } = await response.json()
    assert.equal(
      JSON.parse(valid.entries[0].excerpt).services[0]
        .startingPriceJPYTaxIncluded,
      5000,
    )
    assert.match(redirected.entries[0].excerpt, /could not be verified/u)
  } finally {
    await mf.dispose()
  }
})
