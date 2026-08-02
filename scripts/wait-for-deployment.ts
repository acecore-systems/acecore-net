import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const COMMIT_PATTERN = /^[0-9a-f]{40}$/i
const CORPUS_VERSION_PATTERN = /^[0-9a-f]{20}$/i
const MAX_MARKER_BYTES = 4096
const DEFAULT_FETCH_TIMEOUT_MS = 10_000
const DEFAULT_WAIT_TIMEOUT_MS = 600_000
const DEFAULT_POLL_MS = 15_000
const MAX_TIMER_DELAY_MS = 2_147_483_647

type FetchImplementation = typeof globalThis.fetch
type JsonRecord = Record<string, unknown>

export interface BuildMetadata {
  commit: string
  searchCorpusVersion: string
}

export interface Logger {
  log(message: string): void
}

export interface ReadDeployedBuildOptions {
  fetchImpl?: FetchImplementation
  fetchTimeoutMs?: number
}

export interface AssertDeployedBuildOptions extends ReadDeployedBuildOptions {
  logger?: Logger
}

export interface WaitForDeploymentOptions extends ReadDeployedBuildOptions {
  logger?: Logger
  pollMs?: number
  timeoutMs?: number
}

export type DeploymentCommand =
  | {
      kind: 'wait'
      targetUrl: string
      expectedCommit: string
    }
  | {
      kind: 'print-current'
      targetUrl: string
    }
  | {
      kind: 'assert-current'
      targetUrl: string
      expectedCommit: string
      corpusFile: string
    }

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getPositiveSafeInteger(value: number, label: string): number {
  if (
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > MAX_TIMER_DELAY_MS
  ) {
    throw new Error(
      `${label} must be a positive safe integer no greater than ${MAX_TIMER_DELAY_MS}.`,
    )
  }

  return value
}

function getConfiguredPositiveSafeInteger(
  variable: string,
  fallback: number,
): number {
  const value = process.env[variable]
  if (value === undefined || value === '') return fallback

  return getPositiveSafeInteger(
    Number(value),
    `Environment variable ${variable}`,
  )
}

function resolvePositiveSafeInteger(
  value: number | undefined,
  label: string,
  variable: string,
  fallback: number,
): number {
  if (value === undefined) {
    return getConfiguredPositiveSafeInteger(variable, fallback)
  }

  return getPositiveSafeInteger(value, label)
}

function normalizeCommit(value: unknown, message: string): string {
  if (typeof value !== 'string' || !COMMIT_PATTERN.test(value)) {
    throw new Error(message)
  }

  return value.toLowerCase()
}

function normalizeCorpusVersion(value: unknown, message: string): string {
  if (typeof value !== 'string' || !CORPUS_VERSION_PATTERN.test(value)) {
    throw new Error(message)
  }

  return value.toLowerCase()
}

function resolveFetchTimeoutMs(value: number | undefined): number {
  return resolvePositiveSafeInteger(
    value,
    'fetchTimeoutMs',
    'DEPLOYMENT_FETCH_TIMEOUT_MS',
    DEFAULT_FETCH_TIMEOUT_MS,
  )
}

export function parseBuildMetadata(text: string): BuildMetadata {
  if (Buffer.byteLength(text, 'utf8') > MAX_MARKER_BYTES) {
    throw new Error('Pages build marker is unexpectedly large.')
  }

  const payload: unknown = JSON.parse(text)
  if (!isJsonRecord(payload)) {
    throw new Error('Pages build marker must be a JSON object.')
  }

  return {
    commit: normalizeCommit(
      payload.commit,
      'Pages build marker must contain a full 40-character SHA.',
    ),
    searchCorpusVersion: normalizeCorpusVersion(
      payload.searchCorpusVersion,
      'Pages build marker must contain a 20-character search corpus version.',
    ),
  }
}

export function parseBuildMarker(text: string): string {
  return parseBuildMetadata(text).commit
}

export function parseSearchCorpusVersion(value: unknown): string {
  if (!isJsonRecord(value)) {
    throw new Error('Search corpus must be a JSON object.')
  }

  return normalizeCorpusVersion(
    value.version,
    'Search corpus must contain a 20-character version.',
  )
}

export async function readDeployedBuild(
  targetUrl: string,
  {
    fetchImpl = globalThis.fetch,
    fetchTimeoutMs,
  }: ReadDeployedBuildOptions = {},
): Promise<BuildMetadata> {
  const url = new URL(targetUrl)
  if (url.protocol !== 'https:') {
    throw new Error('Pages build marker URL must use HTTPS.')
  }

  const response = await fetchImpl(url, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache, no-store',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(resolveFetchTimeoutMs(fetchTimeoutMs)),
  })
  if (!response.ok) {
    throw new Error(`Pages build marker returned HTTP ${response.status}.`)
  }

  return parseBuildMetadata(await response.text())
}

export async function readDeployedCommit(
  targetUrl: string,
  options: ReadDeployedBuildOptions = {},
): Promise<string> {
  return (await readDeployedBuild(targetUrl, options)).commit
}

export async function assertDeployedBuild(
  targetUrl: string,
  expectedCommit: string,
  expectedCorpusVersion: string,
  {
    fetchImpl = globalThis.fetch,
    fetchTimeoutMs,
    logger = console,
  }: AssertDeployedBuildOptions = {},
): Promise<BuildMetadata> {
  const expected = {
    commit: normalizeCommit(
      expectedCommit,
      'Expected commit must be a full 40-character Git SHA.',
    ),
    searchCorpusVersion: normalizeCorpusVersion(
      expectedCorpusVersion,
      'Expected search corpus version must contain 20 hexadecimal characters.',
    ),
  }
  const deployed = await readDeployedBuild(targetUrl, {
    fetchImpl,
    fetchTimeoutMs: resolveFetchTimeoutMs(fetchTimeoutMs),
  })
  if (
    deployed.commit !== expected.commit ||
    deployed.searchCorpusVersion !== expected.searchCorpusVersion
  ) {
    throw new Error(
      'Production changed or its search corpus differs from the corpus built by this workflow.',
    )
  }

  logger.log(JSON.stringify({ event: 'pages_build_confirmed', ...expected }))
  return deployed
}

export async function waitForDeployment(
  targetUrl: string,
  expectedCommit: string,
  {
    timeoutMs,
    pollMs,
    fetchImpl = globalThis.fetch,
    fetchTimeoutMs,
    logger = console,
  }: WaitForDeploymentOptions = {},
): Promise<string> {
  const normalizedExpectedCommit = normalizeCommit(
    expectedCommit,
    'Expected commit must be a full 40-character Git SHA.',
  )
  const resolvedTimeoutMs = resolvePositiveSafeInteger(
    timeoutMs,
    'timeoutMs',
    'DEPLOYMENT_WAIT_TIMEOUT_MS',
    DEFAULT_WAIT_TIMEOUT_MS,
  )
  const resolvedPollMs = resolvePositiveSafeInteger(
    pollMs,
    'pollMs',
    'DEPLOYMENT_WAIT_POLL_MS',
    DEFAULT_POLL_MS,
  )
  const resolvedFetchTimeoutMs = resolveFetchTimeoutMs(fetchTimeoutMs)
  const deadline = Date.now() + resolvedTimeoutMs

  while (Date.now() < deadline) {
    try {
      const deployedCommit = await readDeployedCommit(targetUrl, {
        fetchImpl,
        fetchTimeoutMs: resolvedFetchTimeoutMs,
      })
      if (deployedCommit === normalizedExpectedCommit) {
        logger.log(
          JSON.stringify({
            event: 'pages_deployment_ready',
            commit: normalizedExpectedCommit,
          }),
        )
        return normalizedExpectedCommit
      }
    } catch {
      // A deployment can be temporarily unreachable while Cloudflare promotes it.
    }

    await new Promise<void>((resolvePromise) => {
      setTimeout(resolvePromise, resolvedPollMs)
    })
  }

  throw new Error(
    `Timed out waiting for Pages deployment ${normalizedExpectedCommit}.`,
  )
}

export function parseArguments(argv: readonly string[]): DeploymentCommand {
  const [targetUrl, command, ...remaining] = argv
  if (!targetUrl || !command) {
    throw new Error(
      'Usage: node --experimental-strip-types scripts/wait-for-deployment.ts <build-meta-url> <commit-sha|--print-current|--assert-current> [commit-sha corpus-file]',
    )
  }

  if (command === '--print-current') {
    if (remaining.length > 0) {
      throw new Error('--print-current does not accept additional arguments.')
    }

    return { kind: 'print-current', targetUrl }
  }

  if (command === '--assert-current') {
    const [expectedCommit, corpusFile] = remaining
    if (!expectedCommit || !corpusFile || remaining.length !== 2) {
      throw new Error(
        '--assert-current requires an expected commit and corpus JSON file.',
      )
    }

    return {
      kind: 'assert-current',
      targetUrl,
      expectedCommit,
      corpusFile,
    }
  }

  if (command.startsWith('--')) {
    throw new Error(`Unknown command: ${command}`)
  }
  if (remaining.length > 0) {
    throw new Error('A deployment wait accepts only one expected commit.')
  }

  return { kind: 'wait', targetUrl, expectedCommit: command }
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) return false
  return (
    resolve(process.argv[1]).toLowerCase() ===
    fileURLToPath(import.meta.url).toLowerCase()
  )
}

if (isDirectExecution()) {
  const command = parseArguments(process.argv.slice(2))

  if (command.kind === 'print-current') {
    console.log(await readDeployedCommit(command.targetUrl))
  } else if (command.kind === 'assert-current') {
    const corpus = JSON.parse(
      await readFile(resolve(command.corpusFile), 'utf8'),
    ) as unknown
    await assertDeployedBuild(
      command.targetUrl,
      command.expectedCommit,
      parseSearchCorpusVersion(corpus),
    )
  } else {
    await waitForDeployment(command.targetUrl, command.expectedCommit)
  }
}
