import selection from '../config/ai-models.generated.json' with { type: 'json' }

export interface TranslationRoute {
  /** Present only on receipts written by the historical shared-router draft. */
  coreCommit?: string
  policyRevision: string
  featureId: 'acecore-net.translation.batch'
  profile: 'text.batch'
  provider: 'openai'
  apiKind: 'responses'
  executionMode: 'provider_batch'
  model: string
  reasoningEffort: string
}

// Resolve only when selecting a route for a new OpenAI request.
export function getDirectTranslationRoute(): TranslationRoute {
  if (selection?.schema_version !== 1)
    throw new Error('unsupported_translation_model_selection')
  const selected = selection.features?.['acecore-net.translation.batch']
  return validateTranslationRoute({
    policyRevision: selection.policy_revision,
    featureId: 'acecore-net.translation.batch',
    profile: selected?.profile,
    provider: selected?.provider,
    apiKind: 'responses',
    executionMode: selected?.execution_mode,
    model: selected?.api_model_id,
    reasoningEffort: selected?.reasoning_effort,
  })
}

/** Parse both direct receipts and the existing shared-router receipt format. */
export function validateTranslationRoute(value: unknown): TranslationRoute {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('invalid_translation_route')
  const route = value as TranslationRoute
  const keys = [
    'policyRevision',
    'featureId',
    'profile',
    'provider',
    'apiKind',
    'executionMode',
    'model',
    'reasoningEffort',
  ]
  if (
    !keys.every((key) => Object.hasOwn(route, key)) ||
    Object.keys(route).some(
      (key) => !keys.includes(key) && key !== 'coreCommit',
    ) ||
    (route.coreCommit !== undefined &&
      !/^[a-f0-9]{40}$/.test(route.coreCommit)) ||
    typeof route.policyRevision !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}\.[1-9]\d*$/.test(route.policyRevision) ||
    route.featureId !== 'acecore-net.translation.batch' ||
    route.profile !== 'text.batch' ||
    route.provider !== 'openai' ||
    route.apiKind !== 'responses' ||
    route.executionMode !== 'provider_batch' ||
    typeof route.model !== 'string' ||
    !/^[A-Za-z0-9_.-]{1,128}$/.test(route.model) ||
    !['none', 'low', 'medium', 'high', 'xhigh', 'max'].includes(
      route.reasoningEffort,
    )
  )
    throw new Error('unsupported_translation_route')
  return structuredClone(route)
}
