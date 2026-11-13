import { createHash } from 'node:crypto'
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import type { JournalStore } from './meta-translation-background.ts'
import {
  validateTranslationRoute,
  type TranslationRoute,
} from './translation-model-policy.ts'

export interface TranslationInput {
  custom_id: string
  method: 'POST'
  url: '/v1/responses'
  body: Record<string, unknown>
}

type SubmissionState =
  | 'prepared'
  | 'uploading'
  | 'file_ready'
  | 'dispatching'
  | 'submitted'
  | 'failed'

export interface SubmissionReceipt {
  key: string
  createdAt: string
  state: SubmissionState
  route: TranslationRoute
  requestHashes: string[]
  inputSha256: string
  fileId?: string
  batchId?: string
}

export interface SubmissionJournal {
  version: 1
  submissions: Record<string, SubmissionReceipt>
}

export interface SubmissionStore {
  read(): Promise<SubmissionJournal>
  mutate(
    change: (journal: SubmissionJournal) => void,
  ): Promise<SubmissionJournal>
}

const BRANCH = 'translation/openai-journal'
const JOURNAL_PATH = '.translation-openai/journal.json'
const HASH = /^[a-f0-9]{64}$/
const FILE_ID = /^file[-_][A-Za-z0-9_-]{1,128}$/
const BATCH_ID = /^batch_[A-Za-z0-9_-]{1,128}$/
const sha = (text: string): string =>
  createHash('sha256').update(text).digest('hex')

export function validateSubmissionJournal(value: unknown): SubmissionJournal {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('invalid_openai_journal')
  const journal = value as SubmissionJournal
  if (
    journal.version !== 1 ||
    !journal.submissions ||
    typeof journal.submissions !== 'object' ||
    Array.isArray(journal.submissions) ||
    Object.keys(journal).some(
      (key) => !['version', 'submissions'].includes(key),
    )
  )
    throw new Error('invalid_openai_journal')
  for (const [key, entry] of Object.entries(journal.submissions)) {
    if (
      !HASH.test(key) ||
      !entry ||
      entry.key !== key ||
      !HASH.test(entry.inputSha256) ||
      typeof entry.createdAt !== 'string' ||
      !Number.isFinite(Date.parse(entry.createdAt)) ||
      ![
        'prepared',
        'uploading',
        'file_ready',
        'dispatching',
        'submitted',
        'failed',
      ].includes(entry.state) ||
      !Array.isArray(entry.requestHashes) ||
      entry.requestHashes.length === 0 ||
      !entry.requestHashes.every(
        (hash) => typeof hash === 'string' && HASH.test(hash),
      ) ||
      new Set(entry.requestHashes).size !== entry.requestHashes.length ||
      (entry.fileId !== undefined && !FILE_ID.test(entry.fileId)) ||
      (entry.batchId !== undefined && !BATCH_ID.test(entry.batchId)) ||
      (['file_ready', 'dispatching', 'submitted'].includes(entry.state) &&
        !entry.fileId) ||
      (entry.state === 'submitted' && !entry.batchId) ||
      (entry.state !== 'submitted' && entry.batchId !== undefined) ||
      Object.keys(entry).some(
        (field) =>
          ![
            'key',
            'createdAt',
            'state',
            'route',
            'requestHashes',
            'inputSha256',
            'fileId',
            'batchId',
          ].includes(field),
      )
    )
      throw new Error('invalid_openai_journal_entry')
    validateTranslationRoute(entry.route)
  }
  return journal
}

function recordLocal(name: string, value: unknown, append = false): void {
  const dir = process.env.RUNNER_TEMP
  if (!dir) return
  mkdirSync(dir, { recursive: true })
  const filename = path.join(dir, name)
  const content = JSON.stringify(value) + '\n'
  if (append) appendFileSync(filename, content)
  else writeFileSync(filename, content)
}

export function createOpenAiSubmissionStore(
  repo: string,
  token: string,
  baseSha: string,
  fetchImpl = fetch,
): SubmissionStore {
  if (
    !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) ||
    !token ||
    !/^[a-f0-9]{40}$/.test(baseSha)
  )
    throw new Error('invalid_openai_journal_configuration')
  const root = `https://api.github.com/repos/${repo}`
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const request = (url: string, init: RequestInit = {}) =>
    fetchImpl(url, {
      ...init,
      headers: { ...headers, ...init.headers },
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    })
  const readState = async () => {
    let ref = await request(`${root}/git/ref/heads/${BRANCH}`)
    if (ref.status === 404) {
      const created = await request(`${root}/git/refs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: baseSha }),
      })
      if (!created.ok && created.status !== 422)
        throw new Error(`openai_journal_ref_create_${created.status}`)
      ref = await request(`${root}/git/ref/heads/${BRANCH}`)
    }
    if (!ref.ok) throw new Error(`openai_journal_ref_read_${ref.status}`)
    const response = await request(
      `${root}/contents/${JOURNAL_PATH}?ref=${encodeURIComponent(BRANCH)}`,
    )
    if (response.status === 404)
      return { journal: { version: 1, submissions: {} } as SubmissionJournal }
    if (!response.ok) throw new Error(`openai_journal_read_${response.status}`)
    const data = (await response.json()) as { content?: string; sha?: string }
    if (
      typeof data.content !== 'string' ||
      typeof data.sha !== 'string' ||
      data.content.length > 1_400_000
    )
      throw new Error('openai_journal_invalid_response')
    return {
      journal: validateSubmissionJournal(
        JSON.parse(
          Buffer.from(data.content.replace(/\s/g, ''), 'base64').toString(
            'utf8',
          ),
        ),
      ),
      sha: data.sha,
    }
  }
  return {
    async read() {
      const { journal } = await readState()
      recordLocal('openai-translation-journal.json', journal)
      return journal
    },
    async mutate(change) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const { journal, sha: contentSha } = await readState()
        change(journal)
        validateSubmissionJournal(journal)
        const content = JSON.stringify(journal)
        if (Buffer.byteLength(content) > 900_000)
          throw new Error('openai_journal_capacity_exceeded')
        const response = await request(`${root}/contents/${JOURNAL_PATH}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'OpenAI翻訳Batchの受付状態を記録',
            branch: BRANCH,
            content: Buffer.from(content).toString('base64'),
            ...(contentSha ? { sha: contentSha } : {}),
          }),
        })
        if (response.ok) {
          recordLocal('openai-translation-journal.json', journal)
          return journal
        }
        if (![409, 422].includes(response.status))
          throw new Error(`openai_journal_write_${response.status}`)
      }
      throw new Error('openai_journal_conflict')
    },
  }
}

export function routeTranslationInputs(
  inputs: readonly TranslationInput[],
  route: TranslationRoute,
): TranslationInput[] {
  const valid = validateTranslationRoute(route)
  return inputs.map((input) => ({
    ...input,
    body: {
      ...input.body,
      model: valid.model,
      reasoning: { effort: valid.reasoningEffort },
    },
  }))
}

export async function excludePendingMetaTranslations(
  inputs: readonly TranslationInput[],
  store: JournalStore,
): Promise<TranslationInput[]> {
  // A failed read must stop new submissions; an unknown legacy job may already
  // be billed. Its collector can finish independently of the new provider.
  const journal = await store.read()
  const pending = new Set<string>()
  for (const group of Object.values(journal.groups)) {
    if (group.processedAt) continue
    if (!Array.isArray(group.entries))
      throw new Error('invalid_legacy_meta_journal')
    for (const entry of group.entries) {
      if (typeof entry.customId !== 'string')
        throw new Error('invalid_legacy_meta_journal')
      pending.add(entry.customId)
    }
  }
  return inputs.filter((input) => !pending.has(input.custom_id))
}

export async function submitOpenAiTranslations(
  inputs: readonly TranslationInput[],
  route: TranslationRoute,
  store: SubmissionStore,
  apiKey: string,
  fetchImpl = fetch,
): Promise<string | null> {
  validateTranslationRoute(route)
  if (!apiKey) throw new Error('OPENAI_TRANSLATION_API_KEY is required')
  if (
    inputs.length === 0 ||
    inputs.length > 50_000 ||
    inputs.some(
      (input) =>
        input.method !== 'POST' ||
        input.url !== '/v1/responses' ||
        typeof input.custom_id !== 'string' ||
        !input.custom_id ||
        !input.body ||
        typeof input.body !== 'object' ||
        Array.isArray(input.body),
    ) ||
    new Set(inputs.map((input) => input.custom_id)).size !== inputs.length
  )
    throw new Error('invalid_translation_batch_inputs')

  // Request identity deliberately excludes the current model policy. Re-runs retain
  // the first accepted route, even when the central catalog has changed meanwhile.
  const neutral = inputs.map((input) => {
    const body = { ...input.body }
    delete body.model
    delete body.reasoning
    return { ...input, body }
  })
  const requestHashes = neutral.map((input) => sha(JSON.stringify(input)))
  const key = sha(JSON.stringify(requestHashes))
  const encode = (
    receipt: Pick<SubmissionReceipt, 'requestHashes' | 'route'>,
  ) => {
    const selected = new Set(receipt.requestHashes)
    return (
      routeTranslationInputs(
        neutral.filter((_, index) => selected.has(requestHashes[index])),
        receipt.route,
      )
        .map((input) => JSON.stringify(input))
        .join('\n') + '\n'
    )
  }
  let journal = await store.mutate((current) => {
    if (current.submissions[key]) return
    const reserved = new Set(
      Object.values(current.submissions).flatMap(
        (entry) => entry.requestHashes,
      ),
    )
    const selected = requestHashes.filter((hash) => !reserved.has(hash))
    if (selected.length === 0) return
    const initial = { route, requestHashes: selected }
    const inputText = encode(initial)
    if (Buffer.byteLength(inputText) > 200 * 1024 * 1024)
      throw new Error('translation_batch_too_large')
    current.submissions[key] = {
      key,
      state: 'prepared',
      createdAt: new Date().toISOString(),
      route: structuredClone(route),
      requestHashes: selected,
      inputSha256: sha(inputText),
    }
  })
  let entry = journal.submissions[key]
  if (!entry) return null
  const text = encode(entry)
  if (sha(text) !== entry.inputSha256)
    throw new Error('translation_batch_input_mismatch')
  if (entry.state === 'submitted') return entry.batchId!

  const post = async (endpoint: string, init: RequestInit) => {
    try {
      return await fetchImpl(`https://api.openai.com/v1/${endpoint}`, {
        ...init,
        headers: { Authorization: `Bearer ${apiKey}`, ...init.headers },
        redirect: 'error',
        signal: AbortSignal.timeout(120_000),
      })
    } catch {
      throw new Error(`openai_${endpoint}_outcome_unknown`)
    }
  }
  const reject = async (response: Response, retryState: SubmissionState) => {
    await response.body?.cancel()
    if ([400, 401, 403, 404, 413, 422, 429].includes(response.status)) {
      await store.mutate((current) => {
        current.submissions[key].state =
          response.status === 429 ? retryState : 'failed'
      })
    }
    throw new Error(`openai_batch_submit_${response.status}`)
  }

  if (entry.state === 'prepared') {
    let owner = false
    journal = await store.mutate((current) => {
      owner = false
      if (current.submissions[key].state === 'prepared') {
        current.submissions[key].state = 'uploading'
        owner = true
      }
    })
    if (!owner) throw new Error('translation_batch_in_progress_or_unknown')
    const form = new FormData()
    form.append('purpose', 'batch')
    form.append(
      'file',
      new Blob([text], { type: 'application/jsonl' }),
      `translation-${key}.jsonl`,
    )
    const uploaded = await post('files', { method: 'POST', body: form })
    if (!uploaded.ok) await reject(uploaded, 'prepared')
    const result = (await uploaded.json()) as { id?: unknown }
    if (typeof result.id !== 'string' || !FILE_ID.test(result.id))
      throw new Error('openai_file_id_unknown')
    const fileId = result.id
    recordLocal('openai-translation-receipts.jsonl', { key, fileId }, true)
    journal = await store.mutate((current) => {
      current.submissions[key].fileId = fileId
      current.submissions[key].state = 'file_ready'
    })
    entry = journal.submissions[key]
  }

  let owner = false
  journal = await store.mutate((current) => {
    owner = false
    if (current.submissions[key].state === 'file_ready') {
      current.submissions[key].state = 'dispatching'
      owner = true
    }
  })
  entry = journal.submissions[key]
  if (!owner) {
    if (entry.state === 'submitted') return entry.batchId!
    throw new Error('translation_batch_in_progress_or_unknown')
  }
  const accepted = await post('batches', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input_file_id: entry.fileId,
      endpoint: '/v1/responses',
      completion_window: '24h',
      metadata: {
        translation_system: 'acecore-net-v1',
        submission_key: key,
        ai_policy_revision: entry.route.policyRevision,
        ai_policy_commit: entry.route.coreCommit,
        ai_profile: entry.route.profile,
        ai_model: entry.route.model,
        ai_reasoning_effort: entry.route.reasoningEffort,
      },
    }),
  })
  if (!accepted.ok) await reject(accepted, 'file_ready')
  const result = (await accepted.json()) as { id?: unknown }
  if (typeof result.id !== 'string' || !BATCH_ID.test(result.id))
    throw new Error('openai_batch_id_unknown')
  const batchId = result.id
  recordLocal(
    'openai-translation-receipts.jsonl',
    { key, fileId: entry.fileId, batchId },
    true,
  )
  await store.mutate((current) => {
    current.submissions[key].batchId = batchId
    current.submissions[key].state = 'submitted'
  })
  return batchId
}
