import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createMetaTranslationProbeInput,
  validateMetaTranslationProbeOutput,
} from './openai-translation-batch.ts'
import {
  metaBackgroundBody,
  metaRequestHash,
} from './meta-translation-background.ts'

interface ProbeReceipt {
  state: string
  responseId?: string
}
export async function runMetaTranslationProbe(
  apiKey: string,
  options: {
    fetchImpl?: typeof fetch
    wait?: () => Promise<void>
    record?: (receipt: ProbeReceipt) => void
    maxPolls?: number
  } = {},
): Promise<void> {
  if (!apiKey) throw new Error('META_TRANSLATION_API_KEY is required')
  const fetchImpl = options.fetchImpl ?? fetch
  const record = options.record ?? (() => {})
  const wait =
    options.wait ??
    (() => new Promise<void>((resolve) => setTimeout(resolve, 2000)))
  let id: string | undefined
  let terminal = false
  const input = createMetaTranslationProbeInput()
  const probeMetadata = {
    translation_group: 'meta-probe',
    request_hash: metaRequestHash(input.custom_id),
  }
  record({ state: 'dispatching' })
  try {
    const response = await fetchImpl('https://api.meta.ai/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...metaBackgroundBody(input.body),
        metadata: probeMetadata,
      }),
      signal: AbortSignal.timeout(120_000),
    })
    if (!response.ok) throw new Error(`meta_probe_submit_${response.status}`)
    const accepted = (await response.json()) as { id?: unknown }
    if (
      typeof accepted.id !== 'string' ||
      !/^resp_[A-Za-z0-9_-]+$/.test(accepted.id)
    )
      throw new Error('meta_probe_missing_id')
    id = accepted.id
    record({ state: 'submitted', responseId: id })
    for (let attempt = 0; attempt < (options.maxPolls ?? 60); attempt++) {
      const poll = await fetchImpl(`https://api.meta.ai/v1/responses/${id}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(30_000),
      })
      if (!poll.ok) throw new Error(`meta_probe_poll_${poll.status}`)
      const value = (await poll.json()) as Record<string, unknown>
      const metadata = value.metadata as
        { translation_group?: unknown; request_hash?: unknown } | undefined
      if (
        value.id !== id ||
        value.model !== 'muse-ember-1.0' ||
        metadata?.translation_group !== probeMetadata.translation_group ||
        metadata?.request_hash !== probeMetadata.request_hash
      )
        throw new Error('meta_probe_response_mismatch')
      if (value.status === 'completed') {
        terminal = true
        validateMetaTranslationProbeOutput(
          value as Parameters<typeof validateMetaTranslationProbeOutput>[0],
        )
        record({ state: 'completed', responseId: id })
        return
      }
      if (value.status !== 'queued' && value.status !== 'in_progress') {
        terminal = true
        throw new Error('meta_probe_terminal_failure')
      }
      await wait()
    }
    throw new Error('meta_probe_timeout')
  } finally {
    if (id && terminal) {
      record({ state: 'delete_dispatching', responseId: id })
      const deleted = await fetchImpl(
        `https://api.meta.ai/v1/responses/${id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(30_000),
        },
      )
      if (!deleted.ok && deleted.status !== 404)
        throw new Error(`meta_probe_delete_${deleted.status}`)
      record({ state: 'deleted', responseId: id })
    }
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() ===
    fileURLToPath(import.meta.url).toLowerCase()
) {
  const temp = process.env.RUNNER_TEMP
  if (!temp) throw new Error('RUNNER_TEMP is required')
  mkdirSync(temp, { recursive: true })
  await runMetaTranslationProbe(process.env.META_TRANSLATION_API_KEY ?? '', {
    record: (receipt) =>
      writeFileSync(
        path.join(temp, 'meta-translation-probe.json'),
        JSON.stringify(receipt),
      ),
  })
  console.log(
    'Synthetic Meta translation probe completed and its response was deleted.',
  )
}
