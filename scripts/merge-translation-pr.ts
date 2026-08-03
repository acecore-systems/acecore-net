import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { areOpenAiTranslationMarkersCurrent } from './openai-translation-batch.ts'

type JsonRecord = Record<string, unknown>
type FetchImplementation = typeof globalThis.fetch

interface Logger {
  log(message: string): void
  warn(message: string): void
}

export interface ParsedArguments {
  prNumber: number | null
}

export interface RepositoryInfo {
  owner: string
  repo: string
  repository: string
}

export interface TranslationPullRequest {
  number: number
  state: string
  baseRef: string
  headRef: string | null
  headSha: string
  headRepositoryFullName: string | null
  title: string
  body: string | null
  draft: boolean
  nodeId: string | null
}

export interface CheckRun {
  name: string
  status: string
  conclusion: string | null
}

export interface GitHubRequestOptions {
  method?: string
  body?: JsonRecord
}

export interface GitHubClient {
  request(path: string, options?: GitHubRequestOptions): Promise<unknown | null>
  graphql(query: string, variables?: JsonRecord): Promise<JsonRecord>
}

interface MergeResult {
  merged: boolean
  sha: string | null
  message: string
}

interface ReadyForReviewResult {
  number: number
  isDraft: boolean
}

interface MergeAutomationOptions {
  client?: GitHubClient
  environment?: NodeJS.ProcessEnv
  logger?: Logger
  repository?: RepositoryInfo
}

const GITHUB_API_URL = 'https://api.github.com'
const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i
const OPENAI_TRANSLATION_TITLE_PREFIX = '[translation] OpenAI Batch '

export function parseArguments(argv: readonly string[]): ParsedArguments {
  const options: ParsedArguments = { prNumber: null }

  for (const argument of argv) {
    if (argument.startsWith('--pr=')) {
      if (options.prNumber !== null) {
        throw new Error('--pr may only be provided once.')
      }

      const value = argument.slice('--pr='.length)
      if (!/^[1-9][0-9]*$/u.test(value)) {
        throw new Error('--pr must be a positive pull request number.')
      }

      const prNumber = Number(value)
      if (!Number.isSafeInteger(prNumber)) {
        throw new Error('--pr must be a safe integer.')
      }

      options.prNumber = prNumber
      continue
    }

    throw new Error(`Unknown argument: ${argument}`)
  }

  return options
}

function inferRepositoryFromGitRemote(): string | null {
  try {
    const remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf8',
    }).trim()

    const sshMatch = remoteUrl.match(/github\.com:([^/]+\/[^/.]+)(?:\.git)?$/u)
    if (sshMatch?.[1]) return sshMatch[1]

    const httpsMatch = remoteUrl.match(
      /github\.com\/([^/]+\/[^/.]+)(?:\.git)?$/u,
    )
    if (httpsMatch?.[1]) return httpsMatch[1]
  } catch {
    return null
  }

  return null
}

export function parseRepositoryInfo(value: unknown): RepositoryInfo {
  if (typeof value !== 'string') {
    throw new Error('GITHUB_REPOSITORY is required.')
  }

  const match = value.match(/^([^/\s]+)\/([^/\s]+)$/u)
  if (!match?.[1] || !match[2]) {
    throw new Error('GITHUB_REPOSITORY must be owner/repository.')
  }

  const [, owner, repo] = match
  return { owner, repo, repository: `${owner}/${repo}` }
}

function getRepositoryInfo(
  environment: NodeJS.ProcessEnv = process.env,
): RepositoryInfo {
  return parseRepositoryInfo(
    environment.GITHUB_REPOSITORY || inferRepositoryFromGitRemote(),
  )
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getRequiredRecord(value: unknown, label: string): JsonRecord {
  if (!isJsonRecord(value)) {
    throw new Error(`${label} must be an object.`)
  }
  return value
}

function getRequiredString(
  record: JsonRecord,
  key: string,
  label: string,
): string {
  const value = record[key]
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label}.${key} must be a non-empty string.`)
  }
  return value
}

function getOptionalString(record: JsonRecord, key: string): string | null {
  const value = record[key]
  return typeof value === 'string' && value.trim() ? value : null
}

function getRequiredBoolean(
  record: JsonRecord,
  key: string,
  label: string,
): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') {
    throw new Error(`${label}.${key} must be a boolean.`)
  }
  return value
}

function getPositiveInteger(
  record: JsonRecord,
  key: string,
  label: string,
): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label}.${key} must be a positive safe integer.`)
  }
  return value
}

export function parsePullRequest(value: unknown): TranslationPullRequest {
  const pullRequest = getRequiredRecord(value, 'GitHub pull request')
  const base = getRequiredRecord(pullRequest.base, 'GitHub pull request.base')
  const head = getRequiredRecord(pullRequest.head, 'GitHub pull request.head')
  const headRepository = isJsonRecord(head.repo) ? head.repo : null
  const headSha = getRequiredString(head, 'sha', 'GitHub pull request.head')

  if (!FULL_SHA_PATTERN.test(headSha)) {
    throw new Error('GitHub pull request.head.sha must be a full Git SHA.')
  }

  return {
    number: getPositiveInteger(pullRequest, 'number', 'GitHub pull request'),
    state: getRequiredString(pullRequest, 'state', 'GitHub pull request'),
    baseRef: getRequiredString(base, 'ref', 'GitHub pull request.base'),
    headRef: getOptionalString(head, 'ref'),
    headSha,
    headRepositoryFullName: headRepository
      ? getOptionalString(headRepository, 'full_name')
      : null,
    title: getRequiredString(pullRequest, 'title', 'GitHub pull request'),
    body: getOptionalString(pullRequest, 'body'),
    draft: getRequiredBoolean(pullRequest, 'draft', 'GitHub pull request'),
    nodeId: getOptionalString(pullRequest, 'node_id'),
  }
}

export function parseCheckRuns(value: unknown): CheckRun[] {
  const response = getRequiredRecord(value, 'GitHub check runs response')
  const checkRuns = response.check_runs
  if (!Array.isArray(checkRuns)) {
    throw new Error('GitHub check runs response.check_runs must be an array.')
  }

  return checkRuns.map((entry, index) => {
    const checkRun = getRequiredRecord(
      entry,
      `GitHub check runs response.check_runs[${index}]`,
    )
    const conclusion = checkRun.conclusion
    if (conclusion !== null && typeof conclusion !== 'string') {
      throw new Error(
        `GitHub check runs response.check_runs[${index}].conclusion must be a string or null.`,
      )
    }

    return {
      name: getRequiredString(
        checkRun,
        'name',
        `GitHub check runs response.check_runs[${index}]`,
      ),
      status: getRequiredString(
        checkRun,
        'status',
        `GitHub check runs response.check_runs[${index}]`,
      ),
      conclusion,
    }
  })
}

function formatGitHubError(value: unknown): string {
  if (isJsonRecord(value) && typeof value.message === 'string') {
    return value.message
  }

  return JSON.stringify(value)
}

async function readGitHubJson(
  response: Response,
  label: string,
): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new Error(
      `${label} returned a non-JSON response with ${response.status}.`,
    )
  }
}

export function createGitHubClient({
  token = process.env.GITHUB_TOKEN,
  fetchImpl = globalThis.fetch,
}: {
  token?: string
  fetchImpl?: FetchImplementation
} = {}): GitHubClient {
  if (!token) {
    throw new Error('GITHUB_TOKEN is required.')
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'acecore-net-translation-pr-merge-bot',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  return {
    async request(
      path: string,
      { method = 'GET', body }: GitHubRequestOptions = {},
    ): Promise<unknown | null> {
      const response = await fetchImpl(`${GITHUB_API_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      })

      if (response.status === 404 || response.status === 204) return null

      const payload = await readGitHubJson(
        response,
        `GitHub API ${method} ${path}`,
      )
      if (!response.ok) {
        throw new Error(
          `GitHub API ${method} ${path} failed: ${response.status} ${formatGitHubError(payload)}`,
        )
      }

      return payload
    },

    async graphql(
      query: string,
      variables: JsonRecord = {},
    ): Promise<JsonRecord> {
      const response = await fetchImpl(`${GITHUB_API_URL}/graphql`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables }),
      })
      const payload = await readGitHubJson(response, 'GitHub GraphQL request')
      const result = getRequiredRecord(payload, 'GitHub GraphQL response')

      if (
        !response.ok ||
        (Array.isArray(result.errors) && result.errors.length > 0)
      ) {
        throw new Error(
          `GitHub GraphQL request failed: ${response.status} ${formatGitHubError(result.errors ?? result)}`,
        )
      }

      return getRequiredRecord(result.data, 'GitHub GraphQL response.data')
    },
  }
}

async function getPullRequest(
  prNumber: number,
  repository: RepositoryInfo,
  client: GitHubClient,
): Promise<TranslationPullRequest | null> {
  const response = await client.request(
    `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/pulls/${prNumber}`,
  )
  return response === null ? null : parsePullRequest(response)
}

async function getCheckRuns(
  headSha: string,
  repository: RepositoryInfo,
  client: GitHubClient,
): Promise<CheckRun[]> {
  const response = await client.request(
    `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/commits/${headSha}/check-runs?per_page=100`,
  )
  if (response === null) {
    throw new Error('GitHub check runs response was unexpectedly empty.')
  }
  return parseCheckRuns(response)
}

export function isEligibleTranslationPullRequest(
  pullRequest: TranslationPullRequest,
): boolean {
  return (
    pullRequest.state === 'open' &&
    pullRequest.baseRef === 'main' &&
    pullRequest.headRef?.startsWith('translation/openai/') === true &&
    pullRequest.title.startsWith(OPENAI_TRANSLATION_TITLE_PREFIX)
  )
}

async function closePullRequest(
  pullRequest: TranslationPullRequest,
  repository: RepositoryInfo,
  client: GitHubClient,
  logger: Logger,
): Promise<void> {
  await client.request(
    `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/pulls/${pullRequest.number}`,
    { method: 'PATCH', body: { state: 'closed' } },
  )
  logger.log(`Closed stale OpenAI translation PR #${pullRequest.number}.`)
}

export function hasSuccessfulTranslationBuild(
  checkRuns: readonly CheckRun[],
): boolean {
  return checkRuns.some(
    (checkRun) =>
      checkRun.name === 'Translation PR Build' &&
      checkRun.status === 'completed' &&
      checkRun.conclusion === 'success',
  )
}

function parseMergeResult(value: unknown): MergeResult {
  const result = getRequiredRecord(value, 'GitHub merge response')
  const merged = getRequiredBoolean(result, 'merged', 'GitHub merge response')
  const sha = result.sha

  if (sha !== null && typeof sha !== 'string') {
    throw new Error('GitHub merge response.sha must be a string or null.')
  }
  if (merged && (!sha || !FULL_SHA_PATTERN.test(sha))) {
    throw new Error(
      'A successful GitHub merge response must include a full Git SHA.',
    )
  }

  return {
    merged,
    sha,
    message:
      typeof result.message === 'string'
        ? result.message
        : 'GitHub did not provide a merge message.',
  }
}

function encodeGitReference(reference: string): string {
  return reference.split('/').map(encodeURIComponent).join('/')
}

export async function mergePullRequest(
  pullRequest: TranslationPullRequest,
  {
    client,
    logger = console,
    repository,
  }: {
    client: GitHubClient
    logger?: Logger
    repository: RepositoryInfo
  },
): Promise<boolean> {
  let mergeResult: MergeResult

  try {
    const response = await client.request(
      `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/pulls/${pullRequest.number}/merge`,
      {
        method: 'PUT',
        body: {
          merge_method: 'squash',
          commit_title: pullRequest.title,
          sha: pullRequest.headSha,
        },
      },
    )
    mergeResult = parseMergeResult(response)
  } catch (error) {
    logger.warn(
      `Could not merge PR #${pullRequest.number}: ${error instanceof Error ? error.message : String(error)}`,
    )
    return false
  }

  if (!mergeResult.merged || !mergeResult.sha) {
    logger.warn(
      `GitHub did not merge PR #${pullRequest.number}: ${mergeResult.message}`,
    )
    return false
  }

  logger.log(`Merged PR #${pullRequest.number}: ${mergeResult.sha}`)

  if (
    pullRequest.headRef &&
    pullRequest.headRepositoryFullName === repository.repository
  ) {
    try {
      await client.request(
        `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/git/refs/heads/${encodeGitReference(pullRequest.headRef)}`,
        { method: 'DELETE' },
      )
      logger.log(`Deleted branch ${pullRequest.headRef}`)
    } catch (error) {
      logger.warn(
        `Could not delete branch ${pullRequest.headRef}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  return true
}

function parseReadyForReviewResult(value: JsonRecord): ReadyForReviewResult {
  const mutation = getRequiredRecord(
    value.markPullRequestReadyForReview,
    'GitHub GraphQL markPullRequestReadyForReview response',
  )
  const pullRequest = getRequiredRecord(
    mutation.pullRequest,
    'GitHub GraphQL markPullRequestReadyForReview response.pullRequest',
  )

  return {
    number: getPositiveInteger(
      pullRequest,
      'number',
      'GitHub GraphQL markPullRequestReadyForReview response.pullRequest',
    ),
    isDraft: getRequiredBoolean(
      pullRequest,
      'isDraft',
      'GitHub GraphQL markPullRequestReadyForReview response.pullRequest',
    ),
  }
}

export async function markPullRequestReadyForReview(
  pullRequest: TranslationPullRequest,
  {
    client,
    logger = console,
  }: {
    client: GitHubClient
    logger?: Logger
  },
): Promise<boolean> {
  if (!pullRequest.draft) return true
  if (!pullRequest.nodeId) {
    logger.warn(
      `Pull request #${pullRequest.number} has no node_id. Skipping draft conversion.`,
    )
    return false
  }

  const data = await client.graphql(
    `mutation MarkPullRequestReadyForReview($pullRequestId: ID!) {
      markPullRequestReadyForReview(input: { pullRequestId: $pullRequestId }) {
        pullRequest {
          number
          isDraft
        }
      }
    }`,
    { pullRequestId: pullRequest.nodeId },
  )
  const result = parseReadyForReviewResult(data)
  if (result.number !== pullRequest.number || result.isDraft) {
    logger.warn(
      `GitHub did not mark PR #${pullRequest.number} ready for review. Skipping merge.`,
    )
    return false
  }

  logger.log(
    `Marked PR #${pullRequest.number} ready for review before auto-merge.`,
  )
  return true
}

export async function runMergeAutomation(
  argv: readonly string[],
  {
    client,
    environment = process.env,
    logger = console,
    repository,
  }: MergeAutomationOptions = {},
): Promise<void> {
  const args = parseArguments(argv)
  if (!args.prNumber) {
    logger.log('No pull request number provided. Skipping merge automation.')
    return
  }

  const currentRepository = repository ?? getRepositoryInfo(environment)
  const currentClient =
    client ?? createGitHubClient({ token: environment.GITHUB_TOKEN })
  const pullRequest = await getPullRequest(
    args.prNumber,
    currentRepository,
    currentClient,
  )
  if (!pullRequest) {
    logger.log(`Pull request #${args.prNumber} was not found. Skipping.`)
    return
  }

  if (!isEligibleTranslationPullRequest(pullRequest)) {
    logger.log(
      `Pull request #${pullRequest.number} is not an eligible translation PR. Skipping.`,
    )
    return
  }

  if (!areOpenAiTranslationMarkersCurrent(pullRequest.body)) {
    await closePullRequest(
      pullRequest,
      currentRepository,
      currentClient,
      logger,
    )
    return
  }

  const checkRuns = await getCheckRuns(
    pullRequest.headSha,
    currentRepository,
    currentClient,
  )
  if (!hasSuccessfulTranslationBuild(checkRuns)) {
    logger.log(
      `Pull request #${pullRequest.number} does not have a successful Translation PR Build check yet.`,
    )
    return
  }

  if (pullRequest.draft) {
    const markedReady = await markPullRequestReadyForReview(pullRequest, {
      client: currentClient,
      logger,
    })
    if (!markedReady) return
  }

  await mergePullRequest(pullRequest, {
    client: currentClient,
    logger,
    repository: currentRepository,
  })
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) return false
  return (
    resolve(process.argv[1]).toLowerCase() ===
    fileURLToPath(import.meta.url).toLowerCase()
  )
}

if (isDirectExecution()) {
  await runMergeAutomation(process.argv.slice(2))
}
