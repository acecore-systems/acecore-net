import { runMetaTranslationProbe } from '../scripts/meta-translation-probe.ts'
import {
  cleanupProcessedMetaResponses,
  createGitHubJournalStore,
  collectMetaGroup,
  finalizeMetaGroup,
  metaGroupId,
  metaInputHash,
  metaRequestHash,
  reconcileMetaReceipt,
  submitMetaTranslations,
  type MetaJournal,
  type JournalStore,
} from '../scripts/meta-translation-background.ts'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import {
  areOpenAiTranslationMarkersCurrent,
  createMetaTranslationProbeInput,
  createSiteBatchRequest,
  decodeMetadata,
  getSiteFragment,
  hashSource,
  removeSiteTarget,
  selectCompletedBatch,
  selectCurrentTranslationOutputs,
  translateSiteFragment,
} from '../scripts/openai-translation-batch.ts'
import {
  CORPORATE_MOTTO_SOURCE,
  CORPORATE_MOTTO_TOKEN,
  createSiteTranslationTerms,
  protectSiteTranslationTerms,
  restoreSiteTranslationTerms,
} from '../scripts/site-translation-terms.ts'

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

test('出力保存期限が過ぎたBatchを回収対象から除外する', () => {
  const now = 100 * 24 * 60 * 60
  const batch = {
    id: 'batch_expired',
    status: 'completed' as const,
    output_file_id: 'file_expired',
    metadata: { translation_system: 'acecore-net-v1' },
    created_at: now - 32 * 24 * 60 * 60,
    completed_at: now - 31 * 24 * 60 * 60,
  }
  const current = {
    ...batch,
    id: 'batch_current',
    output_file_id: 'file_current',
    created_at: now - 2 * 24 * 60 * 60,
    completed_at: now - 24 * 60 * 60,
  }

  assert.equal(
    selectCompletedBatch([batch, current], new Set(), now)?.id,
    current.id,
  )
  assert.equal(selectCompletedBatch([batch], new Set(), now), null)
  assert.equal(
    selectCompletedBatch([current], new Set([current.id]), now),
    null,
  )
})

test('ページsourceは対応する翻訳JSONのpages配下だけを更新する', () => {
  assert.deepEqual(
    getSiteFragment('src/i18n/source/ja/pages/home.json').targetPath,
    ['pages', 'home'],
  )
})

test('ハイフンを含むページsourceは実際のcamelCaseキーを更新・削除する', () => {
  for (const [sourceName, pageKey] of [
    ['security-policy', 'securityPolicy'],
    ['not-found', 'notFound'],
  ] as const) {
    const sourcePath = `src/i18n/source/ja/pages/${sourceName}.json`
    const fragment = getSiteFragment(sourcePath)
    assert.deepEqual(fragment.targetPath, ['pages', pageKey])
    const current = {
      pages: { [pageKey]: { title: 'old' }, home: { title: 'untouched' } },
    }
    const input = createSiteBatchRequest(
      {
        version: 1,
        kind: 'site',
        locale: 'en',
        sourcePath,
        sourceHash: 'a'.repeat(64),
      },
      fragment,
      current,
    )
    const entries = JSON.parse(String(input.body.input)).entries as Array<{
      id: string
      source: string
    }>
    const next = translateSiteFragment(fragment, current, {
      translations: entries.map(({ id, source }) => ({
        id,
        text: `translated ${source}`,
      })),
    })
    const pages = next.pages as Record<string, unknown>
    assert.equal(Object.hasOwn(pages, sourceName!), false)
    assert.deepEqual(pages.home, { title: 'untouched' })
    assert.match((pages[pageKey!] as { title: string }).title, /^translated /)
    removeSiteTarget(next, sourcePath)
    assert.equal(Object.hasOwn(pages, pageKey!), false)
    assert.deepEqual(pages.home, { title: 'untouched' })
  }
  assert.throws(
    () => getSiteFragment('src/i18n/source/ja/pages/unknown-page.json'),
    /Unsupported Japanese translation source/,
  )
  assert.throws(
    () => getSiteFragment('src/i18n/source/ja/pages/__proto__.json'),
    /Unsupported Japanese translation source/,
  )
  assert.deepEqual(
    removeSiteTarget(
      { pages: { designs: {}, home: {} } },
      'src/i18n/source/ja/pages/designs.json',
    ),
    { pages: { home: {} } },
  )
})

test('固定の企業モットーをページ別requestから保護し回収後も同じ表現に揃える', () => {
  const current = JSON.parse(
    readFileSync('src/i18n/translations/en.json', 'utf8'),
  )
  const canonicalMotto = current.pages.home.heroTitle
  for (const sourceName of ['pages/home', 'pages/about', 'common']) {
    const sourcePath = `src/i18n/source/ja/${sourceName}.json`
    const fragment = getSiteFragment(sourcePath)
    const request = createSiteBatchRequest(
      {
        version: 1,
        kind: 'site',
        locale: 'en',
        sourcePath,
        sourceHash: 'a'.repeat(64),
      },
      fragment,
      current,
    )
    const input = JSON.parse(String(request.body.input))
    assert.equal(input.protectedTerms[0].text, canonicalMotto)
    assert.ok(
      input.entries.some((entry: { source: string }) =>
        entry.source.includes(CORPORATE_MOTTO_TOKEN),
      ),
    )
    assert.ok(
      input.entries.every(
        (entry: { source: string }) =>
          !entry.source.includes(CORPORATE_MOTTO_SOURCE),
      ),
    )
    translateSiteFragment(fragment, current, {
      translations: input.entries.map(
        (entry: { id: string; source: string; current: string | null }) => ({
          id: entry.id,
          text:
            entry.id === '/meta/defaultDescription'
              ? `${CORPORATE_MOTTO_TOKEN}. Newly translated surrounding content remains.`
              : entry.source === CORPORATE_MOTTO_TOKEN
                ? 'A different generated motto'
                : (entry.current ?? entry.source),
        }),
      ),
    })
  }
  assert.equal(current.pages.home.heroTitle, canonicalMotto)
  assert.equal(current.pages.about.philosophyMotto, canonicalMotto)
  assert.equal(current.footer.tagline, canonicalMotto)
  assert.equal(
    current.meta.defaultDescription,
    `${canonicalMotto}. Newly translated surrounding content remains.`,
  )
  assert.equal(JSON.stringify(current).includes(CORPORATE_MOTTO_TOKEN), false)
})

test('旧出力でモットーが欠けた説明文と未知の保護tokenは採用せず原文の変更は翻訳対象にする', () => {
  const terms = createSiteTranslationTerms(
    CORPORATE_MOTTO_SOURCE,
    'Approved motto',
  )
  const entries = [
    {
      id: '/description',
      source: `${CORPORATE_MOTTO_SOURCE}。新しい説明`,
      current: null,
    },
  ]
  assert.throws(
    () =>
      restoreSiteTranslationTerms(
        new Map([['/description', 'A different motto. New content.']]),
        entries,
        terms,
      ),
    /must preserve the corporate motto/,
  )
  assert.throws(
    () =>
      restoreSiteTranslationTerms(
        new Map([['/description', CORPORATE_MOTTO_TOKEN]]),
        entries,
        [],
      ),
    /Unresolved corporate motto token/,
  )
  const changedSource = '世界の新しい未来へ'
  const changedTerms = createSiteTranslationTerms(
    changedSource,
    'Approved motto',
  )
  const changedEntries = [
    { id: '/heroTitle', source: changedSource, current: 'Approved motto' },
  ]
  assert.deepEqual(changedTerms, [])
  assert.deepEqual(
    protectSiteTranslationTerms(changedEntries, changedTerms),
    changedEntries,
  )
  assert.equal(
    restoreSiteTranslationTerms(
      new Map([['/heroTitle', 'A newly translated motto']]),
      changedEntries,
      changedTerms,
    ).get('/heroTitle'),
    'A newly translated motto',
  )
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

test('WorkflowはOpenAI Batchへ投入し旧MetaとBatchを回収しBot PRを作る', async () => {
  const submitWorkflow = await readFile(
    '.github/workflows/submit-openai-translation-batch.yml',
    'utf8',
  )
  const collectWorkflow = await readFile(
    '.github/workflows/collect-openai-translation-batch.yml',
    'utf8',
  )

  assert.match(submitWorkflow, /OPENAI_TRANSLATION_API_KEY/u)
  assert.match(submitWorkflow, /probe_only/u)
  assert.match(submitWorkflow, /openai-translation-probe\.ts/u)
  assert.match(submitWorkflow, /inputs\.probe_only && github\.sha/u)
  assert.match(submitWorkflow, /INPUT_BASE_SHA: \$\{\{ inputs\.base_sha \}\}/u)
  assert.doesNotMatch(submitWorkflow, /args\+=\([^\n]*\$\{\{ inputs\./u)
  assert.doesNotMatch(submitWorkflow, /META_TRANSLATION_API_KEY/u)
  assert.match(collectWorkflow, /OPENAI_TRANSLATION_API_KEY/u)
  assert.match(submitWorkflow, /sleep 900/u)
  assert.doesNotMatch(submitWorkflow, /cms_only|cms-only/u)
  assert.match(collectWorkflow, /translation\/openai\//u)
  assert.match(
    collectWorkflow,
    /client-id:\s+\$\{\{ secrets\.TRANSLATION_BOT_CLIENT_ID \}\}/u,
  )
  assert.doesNotMatch(collectWorkflow, /TRANSLATION_BOT_APP_ID/u)
  assert.doesNotMatch(collectWorkflow, /^\s+app-id:/mu)
  assert.match(collectWorkflow, /openai-translation-processed-/u)
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
  assert.match(batchScript, /between 50 and 160 Unicode characters/u)
})

function memoryJournal(): JournalStore {
  let journal: MetaJournal = { version: 1, groups: {} }
  return {
    async read() {
      return structuredClone(journal)
    },
    async mutate(change) {
      const copy = structuredClone(journal)
      change(copy)
      journal = copy
      return structuredClone(journal)
    },
  }
}
const metaInputs = [
  {
    custom_id: 'synthetic:ja:hash',
    body: {
      input: 'synthetic',
      max_output_tokens: 32768,
      text: { format: { type: 'json_schema' } },
    },
  },
]

test('Meta background送信はmedium・明示保存で実IDをjournalに記録し重複送信しない', async () => {
  const store = memoryJournal()
  let posts = 0
  const fetchMock: typeof fetch = async (_url, init) => {
    posts++
    const request = JSON.parse(String(init?.body))
    assert.equal(request.model, 'muse-ember-1.0')
    assert.deepEqual(request.reasoning, { effort: 'medium' })
    assert.equal(request.background, true)
    assert.equal(request.store, true)
    assert.equal(request.max_output_tokens, 32768)
    return Response.json({ id: 'resp_synthetic', status: 'queued' })
  }
  const id = await submitMetaTranslations(
    metaInputs,
    store,
    'test-key',
    fetchMock,
  )
  assert.equal(id, metaGroupId(metaInputs))
  assert.deepEqual((await store.read()).groups[id].entries, [
    {
      customId: 'synthetic:ja:hash',
      requestKey: metaInputHash(metaInputs[0]),
      ownerGroupId: id,
      state: 'submitted',
      responseId: 'resp_synthetic',
    },
  ])
  await submitMetaTranslations(metaInputs, store, 'test-key', fetchMock)
  assert.equal(posts, 1)
})

test('POST応答消失は不明状態に残り、再実行しても自動再送しない', async () => {
  const store = memoryJournal()
  let posts = 0
  const failed: typeof fetch = async () => {
    posts++
    throw new Error('synthetic timeout')
  }
  await assert.rejects(
    submitMetaTranslations(metaInputs, store, 'test-key', failed),
  )
  const id = metaGroupId(metaInputs)
  assert.equal((await store.read()).groups[id].entries[0].state, 'dispatching')
  await assert.rejects(
    submitMetaTranslations(metaInputs, store, 'test-key', failed),
    /meta_unknown_submission/,
  )
  assert.equal(posts, 1)
  assert.equal(
    await collectMetaGroup(await store.read(), new Set(), 'test-key', failed),
    null,
  )
})

test('background完了のみ既存collector互換形式に戻し、pendingとID不一致は適用しない', async () => {
  const store = memoryJournal()
  await submitMetaTranslations(metaInputs, store, 'test-key', async () =>
    Response.json({ id: 'resp_synthetic', status: 'queued' }),
  )
  const journal = await store.read()
  const id = metaGroupId(metaInputs)
  assert.equal(
    await collectMetaGroup(journal, new Set(), 'test-key', async () =>
      Response.json({
        id: 'resp_synthetic',
        model: 'muse-ember-1.0',
        status: 'in_progress',
        metadata: {
          translation_group: id,
          request_hash: metaRequestHash(metaInputs[0].custom_id),
        },
      }),
    ),
    null,
  )
  const result = await collectMetaGroup(
    journal,
    new Set(),
    'test-key',
    async () =>
      Response.json({
        id: 'resp_synthetic',
        model: 'muse-ember-1.0',
        status: 'completed',
        metadata: {
          translation_group: id,
          request_hash: metaRequestHash(metaInputs[0].custom_id),
        },
        output: [],
      }),
  )
  assert.equal(result?.id, id)
  assert.equal(result?.outputs[0].response?.status_code, 200)
  assert.equal(
    await collectMetaGroup(journal, new Set([id]), 'test-key', async () => {
      throw new Error('must not poll')
    }),
    null,
  )
  await assert.rejects(
    collectMetaGroup(journal, new Set(), 'test-key', async () =>
      Response.json({
        id: 'resp_other',
        model: 'muse-ember-1.0',
        status: 'completed',
      }),
    ),
  )
})

test('処理済みのMeta groupは永続状態を保存して再収集しない', async () => {
  const store = memoryJournal()
  const id = await submitMetaTranslations(
    metaInputs,
    store,
    'test-key',
    async () => Response.json({ id: 'resp_synthetic', status: 'queued' }),
  )
  await finalizeMetaGroup(id, store)
  assert.ok((await store.read()).groups[id].processedAt)
  assert.equal(
    await collectMetaGroup(
      await store.read(),
      new Set(),
      'test-key',
      async () => {
        throw new Error('must not poll')
      },
    ),
    null,
  )
})

test('CAS競合で他runnerが予約した要求は再送しない', async () => {
  let stored: MetaJournal = { version: 1, groups: {} }
  let sha = 0
  let conflict = true
  let posts = 0
  const fakeFetch: typeof fetch = async (url, init) => {
    const target = String(url)
    if (target.includes('api.meta.ai')) {
      posts++
      throw new Error('must not send')
    }
    if (target.includes('/git/ref/heads/'))
      return Response.json({ object: { sha: 'a'.repeat(40) } })
    if (
      target.includes('/contents/') &&
      (!init?.method || init.method === 'GET')
    )
      return sha === 0
        ? new Response(null, { status: 404 })
        : Response.json({
            sha: String(sha),
            content: Buffer.from(JSON.stringify(stored)).toString('base64'),
          })
    if (target.includes('/contents/') && init?.method === 'PUT') {
      const body = JSON.parse(String(init.body))
      const proposed: MetaJournal = JSON.parse(
        Buffer.from(body.content, 'base64').toString('utf8'),
      )
      const group = Object.values(proposed.groups)[0]
      if (conflict && group?.entries[0]?.state === 'dispatching') {
        conflict = false
        stored = proposed
        sha++
        return new Response(null, { status: 409 })
      }
      stored = proposed
      sha++
      return Response.json({ commit: { sha: 'a'.repeat(40) } })
    }
    throw new Error('unexpected request')
  }
  const store = createGitHubJournalStore(
    'owner/repo',
    'test-token',
    'a'.repeat(40),
    fakeFetch,
  )
  await assert.rejects(
    submitMetaTranslations(metaInputs, store, 'test-key', fakeFetch),
    /meta_unknown_submission/,
  )
  assert.equal(posts, 0)
})

test('Meta出力は処理済み記録後だけ削除し、削除失敗はIDを残して再試行できる', async () => {
  const store = memoryJournal()
  let deletes = 0
  const id = await submitMetaTranslations(
    metaInputs,
    store,
    'test-key',
    async () => Response.json({ id: 'resp_synthetic', status: 'queued' }),
  )
  await cleanupProcessedMetaResponses(store, 'test-key', async () => {
    deletes++
    return new Response(null, { status: 200 })
  })
  assert.equal(deletes, 0)
  await finalizeMetaGroup(id, store)
  await assert.rejects(
    cleanupProcessedMetaResponses(store, 'test-key', async () => {
      deletes++
      return new Response(null, { status: 503 })
    }),
  )
  assert.equal((await store.read()).groups[id].entries[0].deletedAt, undefined)
  await cleanupProcessedMetaResponses(store, 'test-key', async () => {
    deletes++
    return new Response(null, { status: 200 })
  })
  assert.ok((await store.read()).groups[id].entries[0].deletedAt)
  await cleanupProcessedMetaResponses(store, 'test-key', async () => {
    deletes++
    throw new Error('already deleted')
  })
  assert.equal(deletes, 2)
})

test('明示的な429のみ再試行し、5xxは不明状態で再送しない', async () => {
  const rateStore = memoryJournal()
  let rateCalls = 0
  const id = await submitMetaTranslations(
    metaInputs,
    rateStore,
    'test-key',
    async () => {
      rateCalls++
      return rateCalls < 3
        ? new Response(null, { status: 429, headers: { 'retry-after': '0' } })
        : Response.json({ id: 'resp_rate', status: 'queued' })
    },
  )
  assert.equal(rateCalls, 3)
  assert.equal(
    (await rateStore.read()).groups[id].entries[0].responseId,
    'resp_rate',
  )
  const errorStore = memoryJournal()
  let errorCalls = 0
  await assert.rejects(
    submitMetaTranslations(metaInputs, errorStore, 'test-key', async () => {
      errorCalls++
      return new Response(null, { status: 503 })
    }),
  )
  assert.equal(errorCalls, 1)
  assert.equal(
    (await errorStore.read()).groups[metaGroupId(metaInputs)].entries[0].state,
    'dispatching',
  )
})

test('Meta完了結果は既存collectorでsourceHashを照合し、古い版は適用しない', () => {
  const metadata = {
    version: 1,
    kind: 'blog',
    locale: 'en',
    sourcePath: 'src/content/blog/example.md',
    sourceHash: 'a'.repeat(64),
  }
  const custom_id = `acecore-net:${Buffer.from(JSON.stringify(metadata)).toString('base64url')}`
  const outputs = [
    {
      custom_id,
      response: {
        status_code: 200,
        body: {
          output: [
            {
              type: 'message',
              content: [
                {
                  type: 'output_text',
                  text: JSON.stringify({
                    title: 'Hello',
                    description: 'Example',
                    body: 'Text',
                  }),
                },
              ],
            },
          ],
        },
      },
      error: null,
    },
  ]
  assert.deepEqual(
    selectCurrentTranslationOutputs(outputs, () => metadata.sourceHash)[0]
      .response,
    { title: 'Hello', description: 'Example', body: 'Text' },
  )
  assert.equal(
    selectCurrentTranslationOutputs(outputs, () => 'b'.repeat(64)).length,
    0,
  )
  assert.throws(() =>
    selectCurrentTranslationOutputs(
      [
        {
          ...outputs[0],
          response: { status_code: 200, body: { output_text: '{' } },
        },
      ],
      () => metadata.sourceHash,
    ),
  )
})

test('probe専用経路は通常schemaで合成1件をPOST、GET、DELETEしてreceiptを残す', async () => {
  const calls: string[] = []
  const states: string[] = []
  await runMetaTranslationProbe('test-key', {
    fetchImpl: async (url, init) => {
      const method = init?.method ?? 'GET'
      calls.push(`${method} ${String(url)}`)
      if (method === 'POST') {
        const body = JSON.parse(String(init?.body))
        assert.equal(body.model, 'muse-ember-1.0')
        assert.equal(body.background, true)
        assert.equal(body.store, true)
        assert.deepEqual(body.metadata, {
          translation_group: 'meta-probe',
          request_hash: metaRequestHash(
            createMetaTranslationProbeInput().custom_id,
          ),
        })
        assert.equal(body.max_output_tokens, 1024)
        assert.equal(body.text.format.name, 'site_translation')
        return Response.json({ id: 'resp_probe', status: 'queued' })
      }
      if (method === 'DELETE') return new Response(null, { status: 200 })
      return Response.json({
        id: 'resp_probe',
        model: 'muse-ember-1.0',
        status: 'completed',
        metadata: {
          translation_group: 'meta-probe',
          request_hash: metaRequestHash(
            createMetaTranslationProbeInput().custom_id,
          ),
        },
        output_text: JSON.stringify({
          translations: [{ id: '/greeting', text: 'Hello' }],
        }),
      })
    },
    wait: async () => {},
    record: (receipt) => states.push(receipt.state),
  })
  assert.deepEqual(
    calls.map((call) => call.split(' ')[0]),
    ['POST', 'GET', 'DELETE'],
  )
  assert.deepEqual(states, [
    'dispatching',
    'submitted',
    'completed',
    'delete_dispatching',
    'deleted',
  ])
})

test('probeのGET失敗はIDを保持し、不明な実行を削除・再送しない', async () => {
  const calls: string[] = []
  const receipts: Array<{ state: string; responseId?: string }> = []
  await assert.rejects(
    runMetaTranslationProbe('test-key', {
      fetchImpl: async (_url, init) => {
        const method = init?.method ?? 'GET'
        calls.push(method)
        return method === 'POST'
          ? Response.json({ id: 'resp_probe', status: 'queued' })
          : new Response(null, { status: 503 })
      },
      wait: async () => {},
      record: (receipt) => receipts.push(receipt),
    }),
  )
  assert.deepEqual(calls, ['POST', 'GET'])
  assert.deepEqual(receipts.at(-1), {
    state: 'submitted',
    responseId: 'resp_probe',
  })
})

test('receipt復旧はMeta GETのmetadataと元journalを照合しPOSTを再送しない', async () => {
  const store = memoryJournal()
  await assert.rejects(
    submitMetaTranslations(metaInputs, store, 'test-key', async () => {
      throw new Error('lost')
    }),
  )
  const receipt = {
    groupId: metaGroupId(metaInputs),
    customId: metaInputs[0].custom_id,
    responseId: 'resp_recovered',
  }
  let calls = 0
  const verify: typeof fetch = async (_url, init) => {
    calls++
    assert.equal(init?.method, undefined)
    return Response.json({
      id: receipt.responseId,
      model: 'muse-ember-1.0',
      metadata: {
        translation_group: receipt.groupId,
        request_hash: metaRequestHash(receipt.customId),
      },
    })
  }
  await reconcileMetaReceipt(receipt, store, 'test-key', verify)
  assert.equal(calls, 1)
  assert.equal(
    (await store.read()).groups[receipt.groupId].entries[0].responseId,
    receipt.responseId,
  )
  await assert.rejects(
    reconcileMetaReceipt(
      { ...receipt, responseId: 'resp_other' },
      store,
      'test-key',
      verify,
    ),
  )
})

test('曖昧なHTTP 408はfailed扱いせず送信不明のまま保持する', async () => {
  const store = memoryJournal()
  await assert.rejects(
    submitMetaTranslations(
      metaInputs,
      store,
      'test-key',
      async () => new Response(null, { status: 408 }),
    ),
  )
  assert.equal(
    (await store.read()).groups[metaGroupId(metaInputs)].entries[0].state,
    'dispatching',
  )
})

test('別groupの同一要求は共有し、全groupの処理完了まで出力を削除しない', async () => {
  const store = memoryJournal()
  const second = { custom_id: 'synthetic:en:hash', body: { input: 'other' } }
  let posts = 0
  const submit: typeof fetch = async () =>
    Response.json({ id: `resp_${++posts}` })
  const firstId = await submitMetaTranslations(metaInputs, store, 'key', submit)
  const secondId = await submitMetaTranslations(
    [...metaInputs, second],
    store,
    'key',
    submit,
  )
  assert.equal(posts, 2)
  const shared = (await store.read()).groups[secondId].entries[0]
  assert.equal(shared.responseId, 'resp_1')
  assert.equal(shared.ownerGroupId, firstId)
  await finalizeMetaGroup(firstId, store)
  const deleted: string[] = []
  const remove: typeof fetch = async (url) => {
    deleted.push(String(url))
    return new Response(null, { status: 204 })
  }
  await cleanupProcessedMetaResponses(store, 'key', remove)
  assert.equal(deleted.length, 0)
  await finalizeMetaGroup(secondId, store)
  await cleanupProcessedMetaResponses(store, 'key', remove)
  assert.equal(deleted.length, 2)
  assert.equal(new Set(deleted).size, 2)
})

test('別groupも不明な送信を再送せずreceipt復旧を共有する', async () => {
  const store = memoryJournal()
  let posts = 0
  const lost: typeof fetch = async () => {
    posts++
    throw new Error('lost')
  }
  await assert.rejects(submitMetaTranslations(metaInputs, store, 'key', lost))
  const other = [...metaInputs, { custom_id: 'other', body: {} }]
  await assert.rejects(
    submitMetaTranslations(other, store, 'key', async () => {
      posts++
      return Response.json({ id: 'resp_other' })
    }),
    /meta_unknown_submission/,
  )
  assert.equal(posts, 2)
  const groupId = metaGroupId(metaInputs)
  await reconcileMetaReceipt(
    {
      groupId,
      customId: metaInputs[0].custom_id,
      responseId: 'resp_recovered',
    },
    store,
    'key',
    async () =>
      Response.json({
        id: 'resp_recovered',
        model: 'muse-ember-1.0',
        metadata: {
          translation_group: groupId,
          request_hash: metaRequestHash(metaInputs[0].custom_id),
        },
      }),
  )
  assert.equal(
    (await store.read()).groups[metaGroupId(other)].entries[0].responseId,
    'resp_recovered',
  )
})

test('削除失敗中の同一要求は待機し、削除再試行後のみ新規送信する', async () => {
  const store = memoryJournal()
  let posts = 0
  const send: typeof fetch = async () =>
    Response.json({ id: `resp_${++posts}` })
  const first = await submitMetaTranslations(metaInputs, store, 'key', send)
  await finalizeMetaGroup(first, store)
  await assert.rejects(
    cleanupProcessedMetaResponses(
      store,
      'key',
      async () => new Response(null, { status: 500 }),
    ),
  )
  const other = [...metaInputs, { custom_id: 'other', body: {} }]
  await assert.rejects(
    submitMetaTranslations(other, store, 'key', send),
    /meta_cleanup_pending/,
  )
  assert.equal(posts, 2)
  await cleanupProcessedMetaResponses(
    store,
    'key',
    async () => new Response(null, { status: 204 }),
  )
  await submitMetaTranslations(other, store, 'key', send)
  assert.equal(posts, 3)
})
