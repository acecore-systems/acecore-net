import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import {
  createOpenAiSubmissionStore,
  excludePendingMetaTranslations,
  routeTranslationInputs,
  submitOpenAiTranslations,
  validateSubmissionJournal,
  type SubmissionJournal,
  type SubmissionStore,
  type TranslationInput,
} from '../scripts/openai-batch-submission.ts'
import {
  DIRECT_TRANSLATION_ROUTE,
  validateTranslationRoute,
  type TranslationRoute,
} from '../scripts/translation-model-policy.ts'
import type {
  JournalStore,
  MetaJournal,
} from '../scripts/meta-translation-background.ts'

const route: TranslationRoute = { ...DIRECT_TRANSLATION_ROUTE }
const input = (id: string): TranslationInput => ({
  custom_id: `synthetic-${id}`,
  method: 'POST',
  url: '/v1/responses',
  body: {
    input: `private synthetic source ${id}`,
    max_output_tokens: 32768,
    text: { format: { type: 'json_schema', name: 'translation' } },
  },
})

function githubSubmissionJournal() {
  const commits = new Map<
    string,
    { journal: SubmissionJournal; blob: string }
  >()
  const first = '1'.padStart(40, '0')
  let head = first
  let next = 2
  let visibleRef: string | undefined
  let comparisonStatus: string | undefined
  let beforePut: (() => void) | undefined
  const save = (
    journal: SubmissionJournal,
    commit = String(next++).padStart(40, '0'),
  ) => {
    const blob = createHash('sha1')
      .update(JSON.stringify(journal))
      .digest('hex')
    commits.set(commit, { journal: structuredClone(journal), blob })
    head = commit
    return commit
  }
  save({ version: 1, submissions: {} }, first)
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/git/ref/heads/translation/openai-journal'))
      return Response.json({ object: { sha: visibleRef ?? head } })
    if (url.pathname.includes('/compare/')) {
      const [base, target] = url.pathname.split('/compare/')[1].split('...')
      return Response.json({
        status:
          comparisonStatus ??
          (base === target
            ? 'identical'
            : Number(base) > Number(target)
              ? 'behind'
              : 'ahead'),
      })
    }
    assert.ok(
      url.pathname.endsWith('/contents/.translation-openai/journal.json'),
    )
    if (init?.method === 'PUT') {
      beforePut?.()
      beforePut = undefined
      const body = JSON.parse(String(init.body))
      if (body.sha !== commits.get(head)!.blob)
        return Response.json({}, { status: 409 })
      const journal = JSON.parse(
        Buffer.from(body.content, 'base64').toString('utf8'),
      )
      return Response.json({ commit: { sha: save(journal) } })
    }
    const ref = url.searchParams.get('ref')!
    assert.match(ref, /^[a-f0-9]{40}$/)
    const saved = commits.get(ref)!
    return Response.json({
      sha: saved.blob,
      content: Buffer.from(JSON.stringify(saved.journal)).toString('base64'),
    })
  }
  const addOtherSubmission = () => {
    const journal = structuredClone(commits.get(head)!.journal)
    const key = 'a'.repeat(64)
    journal.submissions[key] = {
      key,
      state: 'prepared',
      createdAt: '2026-11-13T00:00:00Z',
      route,
      requestHashes: ['b'.repeat(64)],
      customIdHashes: ['d'.repeat(64)],
      inputSha256: 'c'.repeat(64),
    }
    save(journal)
  }
  return {
    first,
    fetchImpl,
    journal: () => structuredClone(commits.get(head)!.journal),
    lagRef: () => {
      visibleRef = first
    },
    diverge: () => {
      visibleRef = first
      comparisonStatus = 'diverged'
    },
    conflictOnce: () => {
      beforePut = addOtherSubmission
    },
  }
}

function memoryStore(): SubmissionStore {
  let current: SubmissionJournal = { version: 1, submissions: {} }
  return {
    async read() {
      return structuredClone(current)
    },
    async mutate(change) {
      const copy = structuredClone(current)
      change(copy)
      validateSubmissionJournal(copy)
      current = copy
      return structuredClone(current)
    },
  }
}

function acceptingProvider() {
  const uploads: TranslationInput[][] = []
  const batches: Record<string, unknown>[] = []
  const fetchImpl: typeof fetch = async (url, init) => {
    assert.equal(init?.redirect, 'error')
    assert.equal(
      new Headers(init?.headers).get('authorization'),
      'Bearer test-key',
    )
    if (String(url).endsWith('/files')) {
      const form = init?.body as FormData
      assert.equal(form.get('purpose'), 'batch')
      const file = form.get('file') as Blob
      uploads.push(
        (await file.text())
          .trim()
          .split('\n')
          .map((line) => JSON.parse(line)),
      )
      return Response.json({ id: `file-${uploads.length}` })
    }
    assert.equal(String(url), 'https://api.openai.com/v1/batches')
    batches.push(JSON.parse(String(init?.body)))
    return Response.json({ id: `batch_${batches.length}` })
  }
  return { uploads, batches, fetchImpl }
}

test('branch参照が遅延しても受付IDを記録し、fileとBatchを二重作成しない', async () => {
  const server = githubSubmissionJournal()
  server.lagRef()
  const store = createOpenAiSubmissionStore(
    'example/site',
    'test-token',
    server.first,
    server.fetchImpl,
  )
  const provider = acceptingProvider()
  for (let attempt = 0; attempt < 2; attempt++)
    assert.equal(
      await submitOpenAiTranslations(
        [input('a')],
        route,
        store,
        'test-key',
        provider.fetchImpl,
      ),
      'batch_1',
    )
  assert.equal(provider.uploads.length, 1)
  assert.equal(provider.batches.length, 1)
  assert.equal(
    Object.values(server.journal().submissions)[0].state,
    'submitted',
  )
})

test('最新journalの並行受付を維持し、CAS競合だけを読み直す', async () => {
  const server = githubSubmissionJournal()
  const store = createOpenAiSubmissionStore(
    'example/site',
    'test-token',
    server.first,
    server.fetchImpl,
  )
  await store.mutate(() => {})
  server.conflictOnce()
  let callbacks = 0
  await store.mutate(() => {
    callbacks++
  })
  assert.equal(callbacks, 2)
  assert.equal(Object.keys(server.journal().submissions).length, 1)
  assert.equal(Object.keys((await store.read()).submissions).length, 1)
})

test('OpenAI journalの履歴分岐は変更前に停止する', async () => {
  const server = githubSubmissionJournal()
  const store = createOpenAiSubmissionStore(
    'example/site',
    'test-token',
    server.first,
    server.fetchImpl,
  )
  await store.mutate(() => {})
  server.diverge()
  let changed = false
  await assert.rejects(
    store.mutate(() => {
      changed = true
    }),
    /openai_journal_history_diverged/,
  )
  assert.equal(changed, false)
})

test('指定モデルとeffortを実際のBatch JSONLとmetadataへ適用する', async () => {
  const provider = acceptingProvider()
  const store = memoryStore()
  assert.equal(
    await submitOpenAiTranslations(
      [input('a')],
      route,
      store,
      'test-key',
      provider.fetchImpl,
    ),
    'batch_1',
  )
  assert.equal(provider.uploads[0][0].body.model, 'gpt-6.1-terra')
  assert.deepEqual(provider.uploads[0][0].body.reasoning, { effort: 'medium' })
  assert.deepEqual(provider.uploads[0][0].body.text, input('a').body.text)
  assert.equal(provider.batches[0].endpoint, '/v1/responses')
  assert.equal(provider.batches[0].completion_window, '24h')
  assert.equal(
    (provider.batches[0].metadata as Record<string, string>).ai_policy_revision,
    route.policyRevision,
  )
  const journal = await store.read()
  assert.equal(Object.values(journal.submissions)[0].state, 'submitted')
  assert.doesNotMatch(
    JSON.stringify(journal),
    /private synthetic source|test-key|source_ids/,
  )
})

test('同一入力を再実行してもfileとBatchを再作成しない', async () => {
  const provider = acceptingProvider()
  const store = memoryStore()
  await submitOpenAiTranslations(
    [input('a')],
    route,
    store,
    'test-key',
    provider.fetchImpl,
  )
  assert.equal(
    await submitOpenAiTranslations(
      [input('a')],
      route,
      store,
      'test-key',
      provider.fetchImpl,
    ),
    'batch_1',
  )
  assert.equal(provider.uploads.length, 1)
  assert.equal(provider.batches.length, 1)
})

test('別groupにまたがる同一要求を除外し、新しい要求だけをBatchへ送る', async () => {
  const provider = acceptingProvider()
  const store = memoryStore()
  await submitOpenAiTranslations(
    [input('a'), input('b')],
    route,
    store,
    'test-key',
    provider.fetchImpl,
  )
  await submitOpenAiTranslations(
    [input('b'), input('c')],
    route,
    store,
    'test-key',
    provider.fetchImpl,
  )
  assert.deepEqual(
    provider.uploads[1].map((row) => row.custom_id),
    ['synthetic-c'],
  )
  assert.equal(
    await submitOpenAiTranslations(
      [input('b')],
      route,
      store,
      'test-key',
      provider.fetchImpl,
    ),
    null,
  )
  assert.equal(provider.uploads.length, 2)
})

test('Batch POSTの応答消失はdispatchingに残し、再実行でも自動再送しない', async () => {
  const provider = acceptingProvider()
  const store = memoryStore()
  let creates = 0
  const lost: typeof fetch = async (url, init) => {
    if (String(url).endsWith('/batches')) {
      creates++
      throw new Error('lost response')
    }
    return provider.fetchImpl(url, init)
  }
  await assert.rejects(
    submitOpenAiTranslations([input('a')], route, store, 'test-key', lost),
    /outcome_unknown/,
  )
  const changed = route
  await assert.rejects(
    submitOpenAiTranslations([input('a')], changed, store, 'test-key', lost),
    /in_progress_or_unknown/,
  )
  assert.equal(creates, 1)
  assert.equal(
    Object.values((await store.read()).submissions)[0].route.model,
    route.model,
  )
})

test('file uploadの応答消失も自動再送せず、未確定の受付を保持する', async () => {
  const store = memoryStore()
  let calls = 0
  const lost: typeof fetch = async () => {
    calls++
    throw new Error('lost upload response')
  }
  await assert.rejects(
    submitOpenAiTranslations([input('a')], route, store, 'test-key', lost),
    /outcome_unknown/,
  )
  await assert.rejects(
    submitOpenAiTranslations([input('a')], route, store, 'test-key', lost),
    /in_progress_or_unknown/,
  )
  assert.equal(calls, 1)
  assert.equal(
    Object.values((await store.read()).submissions)[0].state,
    'uploading',
  )
})

test('明示429からの再試行は受付時のモデル・設定版を保ちfileを再送しない', async () => {
  const provider = acceptingProvider()
  const store = memoryStore()
  let attempts = 0
  const rateLimited: typeof fetch = async (url, init) => {
    if (String(url).endsWith('/batches') && attempts++ === 0)
      return new Response(null, { status: 429 })
    return provider.fetchImpl(url, init)
  }
  await assert.rejects(
    submitOpenAiTranslations(
      [input('a')],
      route,
      store,
      'test-key',
      rateLimited,
    ),
    /429/,
  )
  const changed = route
  await submitOpenAiTranslations(
    [input('a')],
    changed,
    store,
    'test-key',
    rateLimited,
  )
  assert.equal(provider.uploads.length, 1)
  assert.equal(
    (provider.batches[0].metadata as Record<string, string>).ai_model,
    route.model,
  )
  assert.equal(
    (provider.batches[0].metadata as Record<string, string>).ai_policy_revision,
    route.policyRevision,
  )
})

test('受理後journal保存失敗でも次回POSTを繰り返さない', async () => {
  const provider = acceptingProvider()
  const base = memoryStore()
  const failing: SubmissionStore = {
    read: () => base.read(),
    mutate: (change) =>
      base.mutate((journal) => {
        change(journal)
        if (
          Object.values(journal.submissions).some(
            (entry) => entry.state === 'submitted',
          )
        )
          throw new Error('journal write failed')
      }),
  }
  await assert.rejects(
    submitOpenAiTranslations(
      [input('a')],
      route,
      failing,
      'test-key',
      provider.fetchImpl,
    ),
    /journal write failed/,
  )
  await assert.rejects(
    submitOpenAiTranslations(
      [input('a')],
      route,
      failing,
      'test-key',
      provider.fetchImpl,
    ),
    /in_progress_or_unknown/,
  )
  assert.equal(provider.batches.length, 1)
})

test('別API契約・即時実行・不正な受付状態は送信前に拒否する', () => {
  assert.throws(
    () => validateTranslationRoute({ ...route, provider: 'meta' }),
    /unsupported_translation_route/,
  )
  assert.throws(
    () => validateTranslationRoute({ ...route, executionMode: 'realtime' }),
    /unsupported_translation_route/,
  )
  assert.throws(
    () =>
      validateSubmissionJournal({
        version: 1,
        submissions: { ['a'.repeat(64)]: { state: 'submitted' } },
      }),
    /invalid_openai_journal_entry/,
  )
  assert.equal(
    routeTranslationInputs([input('a')], route)[0].body.model,
    route.model,
  )
})

test('不正なURL・重複custom_id・資格情報不足ではAPIへ通信しない', async () => {
  const never: typeof fetch = async () => {
    throw new Error('unexpected network')
  }
  await assert.rejects(
    submitOpenAiTranslations(
      [input('a'), input('a')],
      route,
      memoryStore(),
      'test-key',
      never,
    ),
    /invalid_translation_batch_inputs/,
  )
  await assert.rejects(
    submitOpenAiTranslations([input('a')], route, memoryStore(), '', never),
    /OPENAI_TRANSLATION_API_KEY/,
  )
  assert.throws(
    () => createOpenAiSubmissionStore('invalid-repo', 'token', 'a'.repeat(40)),
    /invalid_openai_journal_configuration/,
  )
})

test('移行前Metaの未処理要求を新providerへ二重投入しない', async () => {
  const journal: MetaJournal = {
    version: 1,
    groups: {
      legacy: {
        id: 'legacy',
        createdAt: new Date().toISOString(),
        entries: ['queued', 'dispatching', 'submitted', 'failed'].map(
          (state) => ({
            customId: `synthetic-${state}`,
            state: state as 'queued' | 'dispatching' | 'submitted' | 'failed',
            requestKey: state,
          }),
        ),
      },
    },
  }
  const store: JournalStore = {
    read: async () => journal,
    mutate: async () => {
      throw new Error('read only')
    },
  }
  const all = ['queued', 'dispatching', 'submitted', 'failed', 'new'].map(input)
  assert.deepEqual(
    (await excludePendingMetaTranslations(all, store)).map(
      (row) => row.custom_id,
    ),
    ['synthetic-new'],
  )
  journal.groups.legacy.processedAt = new Date().toISOString()
  assert.equal((await excludePendingMetaTranslations(all, store)).length, 5)
})

test('既存Meta journalが読めなければ新規Batchを許可しない', async () => {
  const unavailable: JournalStore = {
    read: async () => {
      throw new Error('journal unavailable')
    },
    mutate: async () => {
      throw new Error('unexpected write')
    },
  }
  await assert.rejects(
    excludePendingMetaTranslations([input('a')], unavailable),
    /journal unavailable/,
  )
})

test('旧routerの未確定high受付を保全し、新たなfileやBatchを送らない', async () => {
  const provider = acceptingProvider()
  const store = memoryStore()
  const rateLimited: typeof fetch = async (url, init) =>
    String(url).endsWith('/batches')
      ? new Response(null, { status: 429 })
      : provider.fetchImpl(url, init)
  await assert.rejects(
    submitOpenAiTranslations(
      [input('legacy')],
      route,
      store,
      'test-key',
      rateLimited,
    ),
    /429/,
  )
  const old = {
    ...route,
    coreCommit: '62bc0fbea21392e20417c2412e72a5ac15fba853',
    policyRevision: '2026-11-13.1',
    reasoningEffort: 'high',
  }
  await store.mutate((journal) => {
    const entry = Object.values(journal.submissions)[0]
    entry.route = old
    entry.inputSha256 = createHash('sha256')
      .update(
        JSON.stringify(routeTranslationInputs([input('legacy')], old)[0]) +
          '\n',
      )
      .digest('hex')
  })
  await assert.rejects(
    submitOpenAiTranslations(
      [input('legacy')],
      route,
      store,
      'test-key',
      provider.fetchImpl,
    ),
    /legacy_translation_route_requires_reconciliation/,
  )
  assert.equal(provider.uploads.length, 1)
  assert.equal(provider.batches.length, 0)
  assert.equal(
    Object.values((await store.read()).submissions)[0].state,
    'file_ready',
  )
})

test('新規送信のrouteをmedium以外へ変更できない', async () => {
  let calls = 0
  await assert.rejects(
    submitOpenAiTranslations(
      [input('a')],
      { ...route, reasoningEffort: 'high' },
      memoryStore(),
      'test-key',
      async () => {
        calls++
        return new Response()
      },
    ),
    /unsupported_new_translation_route/,
  )
  assert.equal(calls, 0)
})

test('同じ原稿の周辺入力が変わっても予約済みなら再送しない', async () => {
  const store = memoryStore()
  const provider = acceptingProvider()
  assert.equal(
    await submitOpenAiTranslations(
      [input('same')],
      route,
      store,
      'test-key',
      provider.fetchImpl,
    ),
    'batch_1',
  )
  const changed = input('same')
  changed.body.input = 'changed surrounding current translation'
  assert.equal(
    await submitOpenAiTranslations(
      [changed],
      route,
      store,
      'test-key',
      provider.fetchImpl,
    ),
    null,
  )
  assert.equal(provider.uploads.length, 1)
  assert.equal(provider.batches.length, 1)
})

test('原稿識別子を持たない旧台帳は異なる入力を照合せず新規送信しない', async () => {
  const store = memoryStore()
  const provider = acceptingProvider()
  await submitOpenAiTranslations(
    [input('old')],
    route,
    store,
    'test-key',
    provider.fetchImpl,
  )
  await store.mutate((journal) => {
    delete Object.values(journal.submissions)[0].customIdHashes
  })
  await assert.rejects(
    submitOpenAiTranslations(
      [input('new')],
      route,
      store,
      'test-key',
      provider.fetchImpl,
    ),
    /legacy_openai_journal_requires_reconciliation/,
  )
  assert.equal(provider.uploads.length, 1)
})
