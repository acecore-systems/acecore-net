import { createHash } from 'node:crypto'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

export interface MetaTranslationInput {
  custom_id: string
  body: Record<string, unknown>
}
export interface MetaJournalEntry {
  customId: string
  state: 'queued' | 'dispatching' | 'submitted' | 'failed'
  responseId?: string
  deletedAt?: string
}
export interface MetaJournalGroup {
  id: string
  createdAt: string
  processedAt?: string
  entries: MetaJournalEntry[]
}
export interface MetaJournal {
  version: 1
  groups: Record<string, MetaJournalGroup>
}
export interface JournalStore {
  read(): Promise<MetaJournal>
  mutate(change: (journal: MetaJournal) => void): Promise<MetaJournal>
}
const BRANCH = 'translation/meta-journal'
const JOURNAL_PATH = '.translation-meta/journal.json'
const BASE_URL = 'https://api.meta.ai/v1'
const empty = (): MetaJournal => ({ version: 1, groups: {} })

function snapshot(journal: MetaJournal): void {
  const dir = process.env.RUNNER_TEMP
  if (!dir) return
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    path.join(dir, 'meta-translation-journal.json'),
    JSON.stringify(journal, null, 2),
  )
}
function validJournal(value: unknown): value is MetaJournal {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as MetaJournal).version === 1 &&
    typeof (value as MetaJournal).groups === 'object' &&
    (value as MetaJournal).groups !== null &&
    !Array.isArray((value as MetaJournal).groups)
  )
}
export function createGitHubJournalStore(
  repo: string,
  token: string,
  baseSha: string,
  fetchImpl = fetch,
): JournalStore {
  if (
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) ||
    !token ||
    !/^[a-f0-9]{40}$/.test(baseSha)
  )
    throw new Error('invalid_journal_configuration')
  const root = `https://api.github.com/repos/${repo}`
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const readState = async (): Promise<{
    journal: MetaJournal
    sha?: string
  }> => {
    let ref = await fetchImpl(`${root}/git/ref/heads/${BRANCH}`, { headers })
    if (ref.status === 404) {
      const created = await fetchImpl(`${root}/git/refs`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: baseSha }),
      })
      if (!created.ok && created.status !== 422)
        throw new Error(`journal_ref_create_${created.status}`)
      ref = await fetchImpl(`${root}/git/ref/heads/${BRANCH}`, { headers })
    }
    if (!ref.ok) throw new Error(`journal_ref_read_${ref.status}`)
    const response = await fetchImpl(
      `${root}/contents/${JOURNAL_PATH}?ref=${encodeURIComponent(BRANCH)}`,
      { headers },
    )
    if (response.status === 404) return { journal: empty() }
    if (!response.ok) throw new Error(`journal_read_${response.status}`)
    const data = (await response.json()) as { content?: string; sha?: string }
    if (!data.content || !data.sha) throw new Error('journal_invalid_response')
    const journal: unknown = JSON.parse(
      Buffer.from(data.content.replace(/\s/g, ''), 'base64').toString('utf8'),
    )
    if (!validJournal(journal)) throw new Error('journal_invalid_content')
    return { journal, sha: data.sha }
  }
  return {
    async read() {
      const { journal } = await readState()
      snapshot(journal)
      return journal
    },
    async mutate(change) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const { journal, sha } = await readState()
        change(journal)
        const response = await fetchImpl(`${root}/contents/${JOURNAL_PATH}`, {
          method: 'PUT',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '翻訳処理の進行状態を記録',
            branch: BRANCH,
            content: Buffer.from(JSON.stringify(journal)).toString('base64'),
            ...(sha ? { sha } : {}),
          }),
        })
        if (response.ok) {
          snapshot(journal)
          return journal
        }
        if (![409, 422].includes(response.status))
          throw new Error(`journal_write_${response.status}`)
      }
      throw new Error('journal_conflict')
    },
  }
}
export function metaBackgroundBody(
  body: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...body,
    model: 'muse-ember-1.0',
    reasoning: { effort: 'medium' },
    background: true,
    store: true,
  }
}
export function metaRequestHash(customId: string): string {
  return createHash('sha256').update(customId).digest('hex')
}
export function metaGroupId(inputs: readonly MetaTranslationInput[]): string {
  return (
    'meta-' +
    createHash('sha256')
      .update(JSON.stringify(inputs))
      .digest('hex')
      .slice(0, 32)
  )
}
export async function submitMetaTranslations(
  inputs: readonly MetaTranslationInput[],
  store: JournalStore,
  apiKey: string,
  fetchImpl = fetch,
): Promise<string> {
  if (!apiKey) throw new Error('META_TRANSLATION_API_KEY is required')
  const id = metaGroupId(inputs)
  await store.mutate((journal) => {
    if (!journal.groups[id])
      journal.groups[id] = {
        id,
        createdAt: new Date().toISOString(),
        entries: inputs.map((input) => ({
          customId: input.custom_id,
          state: 'queued',
        })),
      }
  })
  for (let index = 0; index < inputs.length; index++) {
    let reserved = false
    await store.mutate((journal) => {
      reserved = false
      const entry = journal.groups[id]?.entries[index]
      if (!entry || entry.customId !== inputs[index].custom_id)
        throw new Error('journal_input_mismatch')
      if (entry.state === 'queued') {
        entry.state = 'dispatching'
        reserved = true
      }
    })
    if (!reserved) continue
    // Once marked dispatching, a lost response is unknown and must never be resent automatically.
    let response: Response | undefined
    for (let attempt = 0; attempt < 3; attempt++) {
      response = await fetchImpl(`${BASE_URL}/responses`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...metaBackgroundBody(inputs[index].body),
          metadata: {
            translation_group: id,
            request_hash: metaRequestHash(inputs[index].custom_id),
          },
        }),
        signal: AbortSignal.timeout(120_000),
      })
      // A 429 explicitly rejects the request; an unknown network/5xx outcome is never retried.
      if (response.status !== 429 || attempt === 2) break
      const retryAfter = response.headers.get('retry-after')
      const seconds = retryAfter === null ? NaN : Number(retryAfter)
      const delay =
        Number.isFinite(seconds) && seconds >= 0
          ? Math.min(seconds * 1000, 30_000)
          : (attempt + 1) * 1000
      await response.body?.cancel()
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
    if (!response) throw new Error('meta_submit_missing_response')
    if (!response.ok) {
      if (
        response.status === 429 ||
        [400, 401, 403, 404, 413, 422].includes(response.status)
      ) {
        const state = response.status === 429 ? 'queued' : 'failed'
        await store.mutate((journal) => {
          journal.groups[id].entries[index].state = state
        })
      }
      throw new Error(`meta_submit_${response.status}`)
    }
    const result: unknown = await response.json()
    const responseId = (result as { id?: unknown })?.id
    if (
      typeof responseId !== 'string' ||
      !/^resp_[A-Za-z0-9_-]+$/.test(responseId)
    )
      throw new Error('meta_submit_missing_id')
    // Retain the accepted ID in an artifact even if the journal write fails.
    if (process.env.RUNNER_TEMP) {
      try {
        mkdirSync(process.env.RUNNER_TEMP, { recursive: true })
        appendFileSync(
          path.join(process.env.RUNNER_TEMP, 'meta-translation-receipts.jsonl'),
          JSON.stringify({
            groupId: id,
            customId: inputs[index].custom_id,
            responseId,
          }) + '\n',
        )
      } catch {
        console.error(
          'Meta receipt artifact write failed; persisting the ID to the journal.',
        )
      }
    }
    await store.mutate((journal) => {
      const entry = journal.groups[id].entries[index]
      if (entry.state !== 'dispatching')
        throw new Error('journal_state_changed')
      entry.responseId = responseId
      entry.state = 'submitted'
    })
  }
  const final = await store.read()
  if (final.groups[id].entries.some((entry) => entry.state === 'dispatching'))
    throw new Error('meta_unknown_submission')
  return id
}
export async function finalizeMetaGroup(
  id: string,
  store: JournalStore,
): Promise<void> {
  if (!/^meta-[a-f0-9]{32}$/.test(id)) throw new Error('invalid_meta_group_id')
  await store.mutate((journal) => {
    const group = journal.groups[id]
    if (
      !group ||
      group.entries.some(
        (entry) => entry.state === 'queued' || entry.state === 'dispatching',
      )
    )
      throw new Error('meta_group_not_finalizable')
    group.processedAt ??= new Date().toISOString()
  })
}
export async function reconcileMetaReceipt(
  receipt: { groupId: string; customId: string; responseId: string },
  store: JournalStore,
  apiKey: string,
  fetchImpl = fetch,
): Promise<void> {
  if (
    !apiKey ||
    !/^meta-[a-f0-9]{32}$/.test(receipt.groupId) ||
    !/^resp_[A-Za-z0-9_-]+$/.test(receipt.responseId)
  )
    throw new Error('invalid_meta_receipt')
  const response = await fetchImpl(
    `${BASE_URL}/responses/${receipt.responseId}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(30_000),
    },
  )
  if (!response.ok) throw new Error(`meta_receipt_poll_${response.status}`)
  const value = (await response.json()) as {
    id?: unknown
    model?: unknown
    metadata?: { translation_group?: unknown; request_hash?: unknown }
  }
  if (
    value.id !== receipt.responseId ||
    value.model !== 'muse-ember-1.0' ||
    value.metadata?.translation_group !== receipt.groupId ||
    value.metadata?.request_hash !== metaRequestHash(receipt.customId)
  )
    throw new Error('meta_receipt_mismatch')
  await store.mutate((journal) => {
    const group = journal.groups[receipt.groupId]
    const entry = group?.entries.find(
      (item) => item.customId === receipt.customId,
    )
    if (
      !entry ||
      group.processedAt ||
      (entry.state !== 'dispatching' &&
        !(
          entry.state === 'submitted' && entry.responseId === receipt.responseId
        ))
    )
      throw new Error('meta_receipt_state_mismatch')
    entry.responseId = receipt.responseId
    entry.state = 'submitted'
  })
}

// Only processed groups are eligible: the PR/processed artifact already exists.
export async function cleanupProcessedMetaResponses(
  store: JournalStore,
  apiKey: string,
  fetchImpl = fetch,
): Promise<void> {
  if (!apiKey) throw new Error('META_TRANSLATION_API_KEY is required')
  const journal = await store.read()
  for (const group of Object.values(journal.groups)) {
    if (!group.processedAt) continue
    for (let index = 0; index < group.entries.length; index++) {
      const entry = group.entries[index]
      if (!entry.responseId || entry.deletedAt) continue
      if (!/^resp_[A-Za-z0-9_-]+$/.test(entry.responseId))
        throw new Error('journal_invalid_response_id')
      const response = await fetchImpl(
        `${BASE_URL}/responses/${entry.responseId}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(30_000),
        },
      )
      if (!response.ok && response.status !== 404)
        throw new Error(`meta_delete_${response.status}`)
      await store.mutate((latest) => {
        const current = latest.groups[group.id]
        const target = current?.entries[index]
        if (!current?.processedAt || target?.responseId !== entry.responseId)
          throw new Error('journal_state_changed')
        target.deletedAt ??= new Date().toISOString()
      })
    }
  }
}
export interface MetaOutput {
  custom_id: string
  response: { status_code: number; body: Record<string, unknown> } | null
  error: { code: string } | null
}
export async function collectMetaGroup(
  journal: MetaJournal,
  processed: ReadonlySet<string>,
  apiKey: string,
  fetchImpl = fetch,
): Promise<{ id: string; outputs: MetaOutput[] } | null> {
  if (!apiKey) throw new Error('META_TRANSLATION_API_KEY is required')
  const groups = Object.values(journal.groups)
    .filter((group) => !group.processedAt && !processed.has(group.id))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const group of groups) {
    if (
      group.entries.some(
        (entry) => entry.state === 'queued' || entry.state === 'dispatching',
      )
    )
      continue
    const outputs: MetaOutput[] = []
    let pending = false
    for (const entry of group.entries) {
      if (entry.state === 'failed') {
        outputs.push({
          custom_id: entry.customId,
          response: null,
          error: { code: 'submit_rejected' },
        })
        continue
      }
      if (!entry.responseId || !/^resp_[A-Za-z0-9_-]+$/.test(entry.responseId))
        throw new Error('journal_invalid_response_id')
      const response = await fetchImpl(
        `${BASE_URL}/responses/${entry.responseId}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(30_000),
        },
      )
      if (!response.ok) throw new Error(`meta_poll_${response.status}`)
      const body = (await response.json()) as Record<string, unknown>
      const metadata = body.metadata as
        { translation_group?: unknown; request_hash?: unknown } | undefined
      if (
        body.id !== entry.responseId ||
        body.model !== 'muse-ember-1.0' ||
        metadata?.translation_group !== group.id ||
        metadata?.request_hash !== metaRequestHash(entry.customId)
      )
        throw new Error('meta_poll_mismatch')
      if (body.status === 'queued' || body.status === 'in_progress') {
        pending = true
        break
      }
      if (body.status === 'completed')
        outputs.push({
          custom_id: entry.customId,
          response: { status_code: 200, body },
          error: null,
        })
      else if (
        body.status === 'failed' ||
        body.status === 'cancelled' ||
        body.status === 'incomplete'
      )
        outputs.push({
          custom_id: entry.customId,
          response: null,
          error: { code: String(body.status) },
        })
      else throw new Error('meta_poll_invalid_status')
    }
    if (!pending) return { id: group.id, outputs }
  }
  return null
}
