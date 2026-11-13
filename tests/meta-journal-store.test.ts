import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import {
  createGitHubJournalStore,
  submitMetaTranslations,
  type MetaJournal,
} from '../scripts/meta-translation-background.ts'

function githubJournal() {
  const commits = new Map<string, { journal: MetaJournal; blob: string }>()
  const first = '1'.padStart(40, '0')
  let head = first
  let next = 2
  let visibleRef: string | undefined
  let comparisonStatus: string | undefined
  let beforePut: (() => void) | undefined
  const contentRefs: string[] = []
  const save = (
    journal: MetaJournal,
    commit = String(next++).padStart(40, '0'),
  ) => {
    const blob = createHash('sha1')
      .update(JSON.stringify(journal))
      .digest('hex')
    commits.set(commit, { journal: structuredClone(journal), blob })
    head = commit
    return commit
  }
  save({ version: 1, groups: {} }, first)
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = new URL(String(input))
    if (url.pathname.endsWith('/git/ref/heads/translation/meta-journal'))
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
    assert.ok(url.pathname.endsWith('/contents/.translation-meta/journal.json'))
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
    contentRefs.push(ref)
    assert.match(
      ref,
      /^[a-f0-9]{40}$/,
      'content reads must use immutable commits',
    )
    const saved = commits.get(ref)!
    return Response.json({
      sha: saved.blob,
      content: Buffer.from(JSON.stringify(saved.journal)).toString('base64'),
    })
  }
  const addOtherGroup = () => {
    const journal = structuredClone(commits.get(head)!.journal)
    journal.groups.other = {
      id: 'other',
      createdAt: '2026-11-13T00:00:00Z',
      entries: [],
    }
    save(journal)
  }
  return {
    first,
    fetchImpl,
    contentRefs,
    journal: () => structuredClone(commits.get(head)!.journal),
    lagRef: () => {
      visibleRef = first
    },
    diverge: () => {
      visibleRef = first
      comparisonStatus = 'diverged'
    },
    addOtherGroup,
    conflictOnce: () => {
      beforePut = addOtherGroup
    },
  }
}

test('受付直後にbranch参照が古くても受理済みIDを保存し、POSTを繰り返さない', async () => {
  const server = githubJournal()
  server.lagRef()
  const store = createGitHubJournalStore(
    'example/site',
    'test-token',
    server.first,
    server.fetchImpl,
  )
  let posts = 0
  const provider: typeof fetch = async (_url, init) => {
    assert.equal(init?.method, 'POST')
    posts++
    return Response.json({ id: 'resp_test' })
  }
  const inputs = [{ custom_id: 'synthetic', body: { input: 'synthetic' } }]
  const group = await submitMetaTranslations(
    inputs,
    store,
    'test-key',
    provider,
  )
  await submitMetaTranslations(inputs, store, 'test-key', provider)
  assert.equal(posts, 1)
  assert.equal(server.journal().groups[group].entries[0].state, 'submitted')
  assert.equal(
    server.journal().groups[group].entries[0].responseId,
    'resp_test',
  )
  assert.ok(new Set(server.contentRefs).size > 1)
})

test('自分の保存より新しいbranchの内容を読み、並行処理のgroupを維持する', async () => {
  const server = githubJournal()
  const store = createGitHubJournalStore(
    'example/site',
    'test-token',
    server.first,
    server.fetchImpl,
  )
  await store.mutate((journal) => {
    journal.groups.own = {
      id: 'own',
      createdAt: '2026-11-13T00:00:00Z',
      entries: [],
    }
  })
  server.addOtherGroup()
  await store.mutate((journal) => {
    journal.groups.own.processedAt = '2026-11-13T01:00:00Z'
  })
  assert.deepEqual(Object.keys(server.journal().groups), ['own', 'other'])
})

test('CAS競合時だけ最新commitで変更をやり直し、他の記録を失わない', async () => {
  const server = githubJournal()
  const store = createGitHubJournalStore(
    'example/site',
    'test-token',
    server.first,
    server.fetchImpl,
  )
  server.conflictOnce()
  let callbacks = 0
  await store.mutate((journal) => {
    callbacks++
    journal.groups.own = {
      id: 'own',
      createdAt: '2026-11-13T00:00:00Z',
      entries: [],
    }
  })
  assert.equal(callbacks, 2)
  assert.deepEqual(Object.keys(server.journal().groups), ['other', 'own'])
})

test('journal branchの履歴が分岐した場合は変更前に停止する', async () => {
  const server = githubJournal()
  const store = createGitHubJournalStore(
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
    /journal_history_diverged/,
  )
  assert.equal(changed, false)
})
