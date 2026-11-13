import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export interface TranslationRoute {
  coreCommit: string
  policyRevision: string
  featureId: string
  profile: string
  provider: 'openai'
  apiKind: 'responses'
  executionMode: 'provider_batch'
  model: string
  reasoningEffort: string
}

const configPath = fileURLToPath(
  new URL('../config/ai-model-router.json', import.meta.url),
)

export function validateTranslationRoute(value: unknown): TranslationRoute {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('invalid_translation_route')
  const route = value as TranslationRoute
  const keys = [
    'coreCommit',
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
    Object.keys(route).length !== keys.length ||
    !keys.every((key) => Object.hasOwn(route, key)) ||
    typeof route.coreCommit !== 'string' ||
    !/^[a-f0-9]{40}$/.test(route.coreCommit) ||
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

export function verifyRouterCheckout(
  root: string,
  commit: string,
  revision: string,
): void {
  const run = (args: string[]) =>
    execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  if (run(['rev-parse', 'HEAD']).trim() !== commit)
    throw new Error('ai_model_router_commit_mismatch')
  const files = [
    'clients/javascript/index.mjs',
    'dist/stable.json',
    `dist/policy-${revision}.json`,
  ]
  try {
    for (const file of files) run(['cat-file', '-e', `HEAD:${file}`])
    run(['diff', '--quiet', 'HEAD', '--', ...files])
  } catch {
    throw new Error('ai_model_router_checkout_modified')
  }
}

export async function loadTranslationRoute(): Promise<TranslationRoute> {
  const directory = process.env.AI_MODEL_ROUTER_PATH
  if (!directory) throw new Error('AI_MODEL_ROUTER_PATH is required')
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  if (
    config.repository !== 'acecore-systems/ai-model-router' ||
    typeof config.commit !== 'string' ||
    !/^[a-f0-9]{40}$/.test(config.commit) ||
    typeof config.policy_revision !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}\.[1-9]\d*$/.test(config.policy_revision)
  )
    throw new Error('invalid_ai_model_router_configuration')
  const root = path.resolve(directory)
  verifyRouterCheckout(root, config.commit, config.policy_revision)

  // Load only trusted code from the explicitly pinned private checkout.
  const client = await import(
    pathToFileURL(path.join(root, 'clients/javascript/index.mjs')).href
  )
  const channel = JSON.parse(
    await readFile(path.join(root, 'dist/stable.json'), 'utf8'),
  )
  if (
    channel.schema_version !== 1 ||
    channel.revision !== config.policy_revision ||
    channel.artifact !== `policy-${config.policy_revision}.json` ||
    typeof channel.sha256 !== 'string' ||
    !/^[a-f0-9]{64}$/.test(channel.sha256)
  )
    throw new Error('ai_model_router_channel_mismatch')
  const bytes = await readFile(path.join(root, 'dist', channel.artifact))
  if (createHash('sha256').update(bytes).digest('hex') !== channel.sha256)
    throw new Error('ai_model_router_digest_mismatch')
  const catalog = client.parseCatalog(bytes.toString('utf8'))
  if (catalog.revision !== config.policy_revision)
    throw new Error('ai_model_router_revision_mismatch')
  const plan = client.requireExecutable(
    client.resolveFeature(catalog, config.feature),
  )
  // Public receipts contain execution identifiers, never the private catalog or sources.
  return validateTranslationRoute({
    coreCommit: config.commit,
    policyRevision: plan.policy_revision,
    featureId: plan.feature_id,
    profile: plan.profile,
    provider: plan.provider,
    apiKind: plan.api_kind,
    executionMode: plan.execution_mode,
    model: plan.api_model_id,
    reasoningEffort: plan.reasoning_effort,
  })
}
