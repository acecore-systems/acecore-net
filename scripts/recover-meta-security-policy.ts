import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  cleanupProcessedMetaResponses,
  createGitHubJournalStore,
  reconcileMetaReceipt,
  type JournalStore,
  type MetaJournalGroup,
} from './meta-translation-background.ts'

// One reviewed incident only. No provider POST or translation-content write is
// permitted: PR #337 already supplied this source and all eight translations.
export const RECOVERY_GROUP = 'meta-b01257981f8143b2013652711f0567bd'
export const MERGED_COMMIT = 'a12f6846eac8f243ea6848d07ebc1075a69e4800'
export const SOURCE_PATH = 'src/i18n/source/ja/pages/security-policy.json'
export const SOURCE_HASH =
  '75007e9144d5017720b392ab2398d048cb9c66c67a7b48df518b4420955b7959'
export const RECOVERY_LOCALES = [
  'en',
  'zh-cn',
  'es',
  'pt',
  'fr',
  'ko',
  'de',
  'ru',
] as const
const TERMINAL_STATUSES = ['completed', 'failed', 'cancelled', 'incomplete']
type Evidence = {
  source: string
  translations: Record<string, unknown>
}
type Receipt = { groupId: string; customId: string; responseId: string }
type Proof = Omit<
  NonNullable<MetaJournalGroup['superseded']>,
  'acceptedResponseStatus'
>

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
function digest(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(value).replace(/\r\n/g, '\n'))
    .digest('hex')
}
function fragment(value: unknown): Record<string, unknown> {
  if (
    !record(value) ||
    !record(value.pages) ||
    !record(value.pages.securityPolicy)
  )
    throw new Error('meta_recovery_target_path_missing')
  return value.pages.securityPolicy
}
export function validateSupersessionEvidence(
  current: Evidence,
  merged: Evidence,
  validatedCommit: string,
): Proof {
  if (!/^[a-f0-9]{40}$/.test(validatedCommit))
    throw new Error('meta_recovery_invalid_commit')
  const source: unknown = JSON.parse(current.source)
  const baseline: unknown = JSON.parse(merged.source)
  if (
    !record(source) ||
    digest(source) !== SOURCE_HASH ||
    digest(baseline) !== SOURCE_HASH
  )
    throw new Error('meta_recovery_source_changed')
  const keys = Object.keys(source).sort()
  const targetHashes: Record<string, string> = {}
  for (const locale of RECOVERY_LOCALES) {
    const currentTarget = fragment(current.translations[locale])
    const mergedTarget = fragment(merged.translations[locale])
    if (
      JSON.stringify(Object.keys(currentTarget).sort()) !==
        JSON.stringify(keys) ||
      !Object.values(currentTarget).every(
        (value) => typeof value === 'string' && value.trim().length > 0,
      ) ||
      digest(currentTarget) !== digest(mergedTarget)
    )
      throw new Error(`meta_recovery_target_changed_${locale}`)
    targetHashes[locale] = digest(currentTarget)
  }
  return {
    reason: 'translations_already_merged',
    pullRequest: 337,
    mergedCommit: MERGED_COMMIT,
    validatedCommit,
    sourcePath: SOURCE_PATH,
    sourceHash: SOURCE_HASH,
    targetPath: ['pages', 'securityPolicy'],
    targetHashes,
  }
}

function localeOf(customId: string): string {
  if (!customId.startsWith('acecore-net:'))
    throw new Error('meta_recovery_custom_id_mismatch')
  const metadata = JSON.parse(
    Buffer.from(customId.slice('acecore-net:'.length), 'base64url').toString(
      'utf8',
    ),
  )
  const expected = {
    version: 1,
    kind: 'site',
    locale: metadata.locale,
    sourcePath: SOURCE_PATH,
    sourceHash: SOURCE_HASH,
  }
  if (
    !RECOVERY_LOCALES.includes(metadata.locale) ||
    customId !==
      `acecore-net:${Buffer.from(JSON.stringify(expected)).toString('base64url')}`
  )
    throw new Error('meta_recovery_custom_id_mismatch')
  return metadata.locale
}

function validateGroup(
  group: MetaJournalGroup | undefined,
  receipt: Receipt,
  done: boolean,
): void {
  if (
    !group ||
    group.id !== RECOVERY_GROUP ||
    group.entries.length !== RECOVERY_LOCALES.length
  )
    throw new Error('meta_recovery_group_mismatch')
  const locales = new Set<string>()
  for (const entry of group.entries) {
    const locale = localeOf(entry.customId)
    if (locales.has(locale) || !/^[a-f0-9]{64}$/.test(entry.requestKey))
      throw new Error('meta_recovery_entry_mismatch')
    locales.add(locale)
    if (locale === 'en') {
      if (
        entry.customId !== receipt.customId ||
        entry.ownerGroupId !== RECOVERY_GROUP ||
        (entry.state !== 'dispatching' && entry.state !== 'submitted') ||
        (done && entry.state !== 'submitted') ||
        (entry.state === 'submitted' &&
          entry.responseId !== receipt.responseId) ||
        (entry.state === 'dispatching' && entry.responseId !== undefined) ||
        (!done && (entry.deletingAt || entry.deletedAt))
      )
        throw new Error('meta_recovery_receipt_state_mismatch')
    } else if (
      entry.state !== (done ? 'superseded' : 'queued') ||
      entry.responseId !== undefined ||
      entry.ownerGroupId !== undefined ||
      entry.deletingAt !== undefined ||
      entry.deletedAt !== undefined
    )
      throw new Error('meta_recovery_unexpected_submission')
  }
}

export async function recoverSecurityPolicyGroup(
  proof: Proof,
  receipt: Receipt,
  store: JournalStore,
  apiKey: string,
  fetchImpl = fetch,
): Promise<void> {
  if (
    !apiKey ||
    receipt.groupId !== RECOVERY_GROUP ||
    localeOf(receipt.customId) !== 'en' ||
    !/^resp_[A-Za-z0-9_-]+$/.test(receipt.responseId) ||
    proof.mergedCommit !== MERGED_COMMIT ||
    proof.sourceHash !== SOURCE_HASH ||
    proof.sourcePath !== SOURCE_PATH ||
    proof.pullRequest !== 337 ||
    proof.reason !== 'translations_already_merged' ||
    JSON.stringify(proof.targetPath) !==
      JSON.stringify(['pages', 'securityPolicy']) ||
    !/^[a-f0-9]{40}$/.test(proof.validatedCommit) ||
    Object.keys(proof.targetHashes).length !== RECOVERY_LOCALES.length ||
    RECOVERY_LOCALES.some(
      (locale) => !/^[a-f0-9]{64}$/.test(proof.targetHashes[locale] ?? ''),
    )
  )
    throw new Error('meta_recovery_invalid_evidence')
  const group = (await store.read()).groups[RECOVERY_GROUP]
  const alreadyDone = !!group?.processedAt
  validateGroup(group, receipt, alreadyDone)
  if (!alreadyDone && group.superseded)
    throw new Error('meta_recovery_incomplete_resolution')
  if (alreadyDone) {
    const previous = group.superseded
    if (
      !previous ||
      previous.reason !== proof.reason ||
      previous.mergedCommit !== MERGED_COMMIT ||
      previous.sourceHash !== SOURCE_HASH ||
      previous.sourcePath !== SOURCE_PATH ||
      previous.pullRequest !== 337 ||
      JSON.stringify(previous.targetPath) !==
        JSON.stringify(proof.targetPath) ||
      JSON.stringify(previous.targetHashes) !==
        JSON.stringify(proof.targetHashes) ||
      !TERMINAL_STATUSES.includes(previous.acceptedResponseStatus)
    )
      throw new Error('meta_recovery_existing_resolution_mismatch')
  } else {
    let status: unknown
    // Reconcile the accepted ID first, even if the response is still running.
    // A later retry can poll it again without creating another response.
    await reconcileMetaReceipt(receipt, store, apiKey, async (url, init) => {
      if (init?.method && init.method !== 'GET')
        throw new Error('meta_recovery_post_forbidden')
      const response = await fetchImpl(url, { ...init, redirect: 'error' })
      if (response.ok)
        status = ((await response.clone().json()) as { status?: unknown })
          .status
      return response
    })
    if (typeof status !== 'string' || !TERMINAL_STATUSES.includes(status))
      throw new Error('meta_recovery_response_not_terminal')
    const acceptedResponseStatus = status
    await store.mutate((journal) => {
      const latest = journal.groups[RECOVERY_GROUP]
      if (latest?.processedAt)
        throw new Error('meta_recovery_concurrent_resolution')
      validateGroup(latest, receipt, false)
      if (
        latest.entries.find((entry) => localeOf(entry.customId) === 'en')
          ?.state !== 'submitted'
      )
        throw new Error('meta_recovery_receipt_not_reconciled')
      for (const entry of latest.entries)
        if (entry.state === 'queued') entry.state = 'superseded'
      latest.superseded = { ...structuredClone(proof), acceptedResponseStatus }
      latest.processedAt = new Date().toISOString()
    })
  }
  // Limit cleanup to this incident, while the shared helper still checks every
  // journal reference before deleting the one accepted provider response.
  await cleanupProcessedMetaResponses(
    store,
    apiKey,
    async (url, init) => {
      if (init?.method !== 'DELETE')
        throw new Error('meta_recovery_post_forbidden')
      return fetchImpl(url, { ...init, redirect: 'error' })
    },
    new Set([RECOVERY_GROUP]),
  )
  const resolved = (await store.read()).groups[RECOVERY_GROUP]
  validateGroup(resolved, receipt, true)
  if (
    !resolved.entries.find((entry) => localeOf(entry.customId) === 'en')
      ?.deletedAt
  )
    throw new Error('meta_recovery_cleanup_deferred')
}

async function main(): Promise<void> {
  const repository = process.env.GITHUB_REPOSITORY
  const commit =
    process.env.RECOVERY_CHECKOUT_SHA ?? process.env.GITHUB_SHA ?? ''
  const token = process.env.GITHUB_TOKEN ?? ''
  const apiKey = process.env.META_TRANSLATION_API_KEY ?? ''
  if (
    repository !== 'acecore-systems/acecore-net' ||
    process.env.GITHUB_REF !== 'refs/heads/main' ||
    !token ||
    !apiKey ||
    !/^[a-f0-9]{40}$/.test(commit)
  )
    throw new Error('meta_recovery_environment_mismatch')
  const git = (args: string[]) =>
    execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  if (git(['rev-parse', 'HEAD']).trim() !== commit)
    throw new Error('meta_recovery_checkout_mismatch')
  git(['merge-base', '--is-ancestor', MERGED_COMMIT, commit])
  const at = (ref: string): Evidence => ({
    source: git(['show', `${ref}:${SOURCE_PATH}`]),
    translations: Object.fromEntries(
      RECOVERY_LOCALES.map((locale) => [
        locale,
        JSON.parse(
          git(['show', `${ref}:src/i18n/translations/${locale}.json`]),
        ),
      ]),
    ),
  })
  const proof = validateSupersessionEvidence(
    at(commit),
    at(MERGED_COMMIT),
    commit,
  )
  const filename = process.argv[2]
  if (!filename) throw new Error('meta_recovery_receipt_file_required')
  const lines = readFileSync(filename, 'utf8').trim().split('\n')
  if (lines.length !== 1)
    throw new Error('meta_recovery_receipt_count_mismatch')
  const receipt = JSON.parse(lines[0]) as Receipt
  const rawStore = createGitHubJournalStore(repository, token, commit)
  const store: JournalStore = {
    read: () => rawStore.read(),
    async mutate(change) {
      const response = await fetch(
        `https://api.github.com/repos/${repository}/git/ref/heads/main`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
          },
          redirect: 'error',
          signal: AbortSignal.timeout(30_000),
        },
      )
      if (!response.ok) throw new Error('meta_recovery_main_read_failed')
      const latest = (await response.json()) as { object?: { sha?: unknown } }
      if (latest.object?.sha !== commit)
        throw new Error('meta_recovery_main_advanced')
      return rawStore.mutate(change)
    },
  }
  await recoverSecurityPolicyGroup(proof, receipt, store, apiKey)
  const summary =
    'PR #337 の日本語sourceと8言語の pages.securityPolicy を照合し、受理済み1件を復旧・削除、未送信7件を superseded として記録しました。追加の翻訳リクエストは送信していません。'
  console.log(summary)
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `${summary}\n\n検証commit: \`${commit}\`\n`,
    )
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
)
  main().catch((error: unknown) => {
    // Never expose receipt IDs, source contents, provider bodies, or secrets.
    const message =
      error instanceof Error &&
      /^(meta_recovery|meta_receipt|meta_delete|journal)_[a-z0-9_-]+$/.test(
        error.message,
      )
        ? error.message
        : 'meta_recovery_failed'
    console.error(message)
    process.exitCode = 1
  })
