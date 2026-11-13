import { fileURLToPath } from 'node:url'
import path from 'node:path'
import {
  loadTranslationRoute,
  validateTranslationRoute,
  type TranslationRoute,
} from './translation-model-policy.ts'

export async function checkTranslationProvider(
  route: TranslationRoute,
  apiKey: string,
  fetchImpl = fetch,
): Promise<void> {
  const valid = validateTranslationRoute(route)
  if (!apiKey) throw new Error('OPENAI_TRANSLATION_API_KEY is required')
  const response = await fetchImpl(
    `https://api.openai.com/v1/models/${encodeURIComponent(valid.model)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}` },
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    },
  )
  if (!response.ok) {
    await response.body?.cancel()
    throw new Error(`openai_translation_preflight_${response.status}`)
  }
  const model = (await response.json()) as { id?: unknown }
  if (model.id !== valid.model)
    throw new Error('openai_translation_preflight_model_mismatch')
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const route = await loadTranslationRoute()
    await checkTranslationProvider(
      route,
      process.env.OPENAI_TRANSLATION_API_KEY ?? '',
    )
    console.log(JSON.stringify({ preflight: 'passed', route }))
    console.log(
      'GET-only preflight passed. No translation, file, Batch, or journal was created. Batch generation remains a separate check.',
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'preflight_failed')
    process.exitCode = 1
  }
}
