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
  authorLogin: string
  draft: boolean
  mergeableState: string
  autoMergeEnabled: boolean
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

interface ReadyForReviewResult {
  number: number
  isDraft: boolean
}

interface AutoMergeResult {
  number: number
  merged: boolean
  autoMergeEnabled: boolean
}

interface MergeAutomationOptions {
  client?: GitHubClient
  environment?: NodeJS.ProcessEnv
  logger?: Logger
  repository?: RepositoryInfo
}

const GITHUB_API_URL = 'https://api.github.com'
const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i
const TRANSLATION_TITLE_PREFIXES = [
  '[translation] Workers AI Batch ',
  '[translation] OpenAI Batch ',
] as const
const TRANSLATION_BRANCH_PREFIXES = [
  'translation/workers-ai/',
  'translation/openai/',
] as const
const OPENAI_TRANSLATION_BOT_LOGIN = 'acecore-translation-bot[bot]'
const TRANSLATION_CONTENT_PATH_PATTERN =
  /^src\/content\/blog\/(?:en|zh-cn|es|pt|fr|ko|de|ru)\/.+\.md$/u
const TRANSLATION_JSON_PATH_PATTERN =
  /^src\/i18n\/translations\/(?:en|zh-cn|es|pt|fr|ko|de|ru)\.json$/u

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
  const author = getRequiredRecord(pullRequest.user, 'GitHub pull request.user')

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
    authorLogin: getRequiredString(author, 'login', 'GitHub pull request.user'),
    draft: getRequiredBoolean(pullRequest, 'draft', 'GitHub pull request'),
    mergeableState: getRequiredString(
      pullRequest,
      'mergeable_state',
      'GitHub pull request',
    ),
    autoMergeEnabled: isJsonRecord(pullRequest.auto_merge),
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

async function getPullRequestFiles(
  prNumber: number,
  repository: RepositoryInfo,
  client: GitHubClient,
): Promise<string[]> {
  const filenames: string[] = []

  for (let page = 1; page <= 30; page += 1) {
    const response = await client.request(
      `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/pulls/${prNumber}/files?per_page=100&page=${page}`,
    )
    if (!Array.isArray(response)) {
      throw new Error('GitHub pull request files response must be an array.')
    }

    response.forEach((entry, index) => {
      const file = getRequiredRecord(
        entry,
        `GitHub pull request files response[${index}]`,
      )
      filenames.push(
        getRequiredString(
          file,
          'filename',
          `GitHub pull request files response[${index}]`,
        ),
      )
    })

    if (response.length < 100) return filenames
  }

  throw new Error('Translation pull request exceeds the 3000-file API limit.')
}

function isAllowedTranslationFile(filename: string): boolean {
  return (
    TRANSLATION_CONTENT_PATH_PATTERN.test(filename) ||
    TRANSLATION_JSON_PATH_PATTERN.test(filename)
  )
}

export function hasOnlyAllowedTranslationFiles(
  filenames: readonly string[],
): boolean {
  return filenames.length > 0 && filenames.every(isAllowedTranslationFile)
}

export function isEligibleTranslationPullRequest(
  pullRequest: TranslationPullRequest,
  repository: RepositoryInfo,
): boolean {
  return (
    pullRequest.state === 'open' &&
    pullRequest.baseRef === 'main' &&
    pullRequest.authorLogin === OPENAI_TRANSLATION_BOT_LOGIN &&
    pullRequest.headRepositoryFullName?.toLowerCase() ===
      repository.repository.toLowerCase() &&
    TRANSLATION_BRANCH_PREFIXES.some((prefix) =>
      pullRequest.headRef?.startsWith(prefix),
    ) &&
    TRANSLATION_TITLE_PREFIXES.some((prefix) =>
      pullRequest.title.startsWith(prefix),
    )
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
  logger.log(`Closed stale translation PR #${pullRequest.number}.`)
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

function parseAutoMergeResult(value: JsonRecord): AutoMergeResult {
  const mutation = getRequiredRecord(
    value.enablePullRequestAutoMerge,
    'GitHub GraphQL enablePullRequestAutoMerge response',
  )
  const pullRequest = getRequiredRecord(
    mutation.pullRequest,
    'GitHub GraphQL enablePullRequestAutoMerge response.pullRequest',
  )

  return {
    number: getPositiveInteger(
      pullRequest,
      'number',
      'GitHub GraphQL enablePullRequestAutoMerge response.pullRequest',
    ),
    merged: getRequiredBoolean(
      pullRequest,
      'merged',
      'GitHub GraphQL enablePullRequestAutoMerge response.pullRequest',
    ),
    autoMergeEnabled: isJsonRecord(pullRequest.autoMergeRequest),
  }
}

export async function enablePullRequestAutoMerge(
  pullRequest: TranslationPullRequest,
  {
    client,
    logger = console,
  }: {
    client: GitHubClient
    logger?: Logger
  },
): Promise<boolean> {
  if (pullRequest.autoMergeEnabled) {
    logger.log(`Auto-merge is already enabled for PR #${pullRequest.number}.`)
    return true
  }
  if (!pullRequest.nodeId) {
    logger.warn(
      `Pull request #${pullRequest.number} has no node_id. Cannot enable auto-merge.`,
    )
    return false
  }

  let result: AutoMergeResult

  try {
    const data = await client.graphql(
      `mutation EnablePullRequestAutoMerge(
        $pullRequestId: ID!
        $expectedHeadOid: GitObjectID!
        $commitHeadline: String!
      ) {
        enablePullRequestAutoMerge(
          input: {
            pullRequestId: $pullRequestId
            expectedHeadOid: $expectedHeadOid
            mergeMethod: SQUASH
            commitHeadline: $commitHeadline
          }
        ) {
          pullRequest {
            number
            merged
            autoMergeRequest {
              mergeMethod
            }
          }
        }
      }`,
      {
        pullRequestId: pullRequest.nodeId,
        expectedHeadOid: pullRequest.headSha,
        commitHeadline: pullRequest.title,
      },
    )
    result = parseAutoMergeResult(data)
  } catch (error) {
    logger.warn(
      `Could not enable auto-merge for PR #${pullRequest.number}: ${error instanceof Error ? error.message : String(error)}`,
    )
    return false
  }

  if (
    result.number !== pullRequest.number ||
    (!result.merged && !result.autoMergeEnabled)
  ) {
    logger.warn(
      `GitHub did not enable auto-merge for PR #${pullRequest.number}.`,
    )
    return false
  }

  logger.log(
    result.merged
      ? `PR #${pullRequest.number} merged immediately when auto-merge was enabled.`
      : `Enabled squash auto-merge for PR #${pullRequest.number}.`,
  )

  return true
}

export async function updatePullRequestBranch(
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
  let response: unknown | null

  try {
    response = await client.request(
      `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/pulls/${pullRequest.number}/update-branch`,
      {
        method: 'PUT',
        body: { expected_head_sha: pullRequest.headSha },
      },
    )
  } catch (error) {
    logger.warn(
      `Could not update PR #${pullRequest.number} with current main: ${error instanceof Error ? error.message : String(error)}`,
    )
    return false
  }

  if (!isJsonRecord(response) || typeof response.message !== 'string') {
    logger.warn(
      `GitHub did not confirm the branch update for PR #${pullRequest.number}.`,
    )
    return false
  }

  logger.log(
    `Updating PR #${pullRequest.number} with current main before enabling auto-merge.`,
  )
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

  if (!isEligibleTranslationPullRequest(pullRequest, currentRepository)) {
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

  const changedFiles = await getPullRequestFiles(
    pullRequest.number,
    currentRepository,
    currentClient,
  )
  if (!hasOnlyAllowedTranslationFiles(changedFiles)) {
    const unexpectedFiles = changedFiles.filter(
      (filename) => !isAllowedTranslationFile(filename),
    )
    throw new Error(
      `Translation PR #${pullRequest.number} contains unexpected files: ${unexpectedFiles.join(', ') || '(none)'}`,
    )
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

  if (pullRequest.mergeableState === 'behind') {
    const updated = await updatePullRequestBranch(pullRequest, {
      client: currentClient,
      logger,
      repository: currentRepository,
    })
    if (!updated) {
      throw new Error(
        `Could not update translation PR #${pullRequest.number} with current main.`,
      )
    }
    return
  }

  if (pullRequest.draft) {
    const markedReady = await markPullRequestReadyForReview(pullRequest, {
      client: currentClient,
      logger,
    })
    if (!markedReady) {
      throw new Error(
        `Could not mark translation PR #${pullRequest.number} ready for review.`,
      )
    }
  }

  const autoMergeEnabled = await enablePullRequestAutoMerge(pullRequest, {
    client: currentClient,
    logger,
  })
  if (!autoMergeEnabled) {
    throw new Error(
      `Could not enable auto-merge for translation PR #${pullRequest.number}.`,
    )
  }
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
