import { mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import {
  createOpenAiSubmissionStore,
  submitOpenAiTranslations,
  type SubmissionStore,
} from './openai-batch-submission.ts'
import { DIRECT_TRANSLATION_ROUTE } from './translation-model-policy.ts'
import {
  createMetaTranslationProbeInput,
  decodeMetadata,
  validateMetaTranslationProbeOutput,
} from './openai-translation-batch.ts'

type ProbeResult = {
  state: 'submitted' | 'pending' | 'completed'
  batchId: string
}
const fileIdPattern = /^file[-_][A-Za-z0-9_-]{1,128}$/
const batchIdPattern = /^batch_[A-Za-z0-9_-]{1,128}$/

/** The synthetic batch uses a separate metadata tag; the regular collector ignores it. */
export async function runOpenAiTranslationProbe(
  action: 'submit' | 'collect',
  apiKey: string,
  store: SubmissionStore | undefined,
  batchId: string | undefined,
  fetchImpl = fetch,
  runId = 'test',
): Promise<ProbeResult> {
  if (!apiKey) throw new Error('OPENAI_TRANSLATION_API_KEY is required')
  if (action === 'submit') {
    if (!runId) throw new Error('probe_run_id_required')
    if (!store || batchId) throw new Error('invalid_probe_submission')
    const submitted = await submitOpenAiTranslations(
      [
        createMetaTranslationProbeInput(
          createHash('sha256').update(runId).digest('hex'),
        ),
      ],
      DIRECT_TRANSLATION_ROUTE,
      store,
      apiKey,
      fetchImpl,
      'probe',
    )
    if (!submitted) throw new Error('probe_request_already_reserved')
    return { state: 'submitted', batchId: submitted }
  }
  if (action !== 'collect' || !batchId || !batchIdPattern.test(batchId))
    throw new Error('invalid_probe_batch_id')
  const get = async (endpoint: string) => {
    const response = await fetchImpl(`https://api.openai.com/v1/${endpoint}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) throw new Error(`openai_probe_get_${response.status}`)
    return response
  }
  const batch = (await (await get(`batches/${batchId}`)).json()) as Record<
    string,
    any
  >
  if (
    batch.id !== batchId ||
    batch.endpoint !== '/v1/responses' ||
    batch.metadata?.translation_system !== 'acecore-net-probe-v1' ||
    batch.metadata?.ai_model !== DIRECT_TRANSLATION_ROUTE.model ||
    batch.metadata?.ai_reasoning_effort !==
      DIRECT_TRANSLATION_ROUTE.reasoningEffort
  )
    throw new Error('probe_batch_identity_mismatch')
  if (['validating', 'in_progress', 'finalizing'].includes(batch.status))
    return { state: 'pending', batchId }
  if (batch.status !== 'completed') throw new Error('probe_batch_not_completed')
  if (
    typeof batch.output_file_id !== 'string' ||
    !fileIdPattern.test(batch.output_file_id)
  )
    throw new Error('probe_output_file_missing')
  const output = await (
    await get(`files/${batch.output_file_id}/content`)
  ).text()
  if (Buffer.byteLength(output) > 1_000_000)
    throw new Error('probe_output_too_large')
  const lines = output.trim().split(/\r?\n/)
  if (lines.length !== 1) throw new Error('probe_output_count_mismatch')
  const result = JSON.parse(lines[0]) as Record<string, any>
  if (
    typeof result.custom_id !== 'string' ||
    createHash('sha256').update(result.custom_id).digest('hex') !==
      batch.metadata?.ai_probe_request_hash ||
    result.error ||
    result.response?.status_code !== 200 ||
    result.response?.body?.status !== 'completed' ||
    result.response?.body?.model !== DIRECT_TRANSLATION_ROUTE.model
  )
    throw new Error('probe_output_identity_mismatch')
  const metadata = decodeMetadata(result.custom_id)
  if (
    metadata.kind !== 'site' ||
    metadata.locale !== 'en' ||
    metadata.sourcePath !== 'synthetic-probe'
  )
    throw new Error('probe_output_identity_mismatch')
  validateMetaTranslationProbeOutput(result.response.body)
  return { state: 'completed', batchId }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() ===
    fileURLToPath(import.meta.url).toLowerCase()
) {
  const action = process.argv[2]
  if (action !== 'submit' && action !== 'collect')
    throw new Error('probe_action_required')
  const temp = process.env.RUNNER_TEMP
  if (!temp) throw new Error('RUNNER_TEMP is required')
  mkdirSync(temp, { recursive: true })
  const store =
    action === 'submit'
      ? createOpenAiSubmissionStore(
          process.env.GITHUB_REPOSITORY ?? '',
          process.env.GITHUB_TOKEN ?? '',
          execFileSync('git', ['rev-parse', 'HEAD'], {
            encoding: 'utf8',
          }).trim(),
        )
      : undefined
  const result = await runOpenAiTranslationProbe(
    action,
    process.env.OPENAI_TRANSLATION_API_KEY ?? '',
    store,
    process.env.PROBE_BATCH_ID || undefined,
    fetch,
    process.env.GITHUB_RUN_ID ?? '',
  )
  writeFileSync(
    path.join(temp, 'openai-translation-probe.json'),
    JSON.stringify(result),
  )
  console.log(`Synthetic OpenAI Batch probe: ${result.state}.`)
}
