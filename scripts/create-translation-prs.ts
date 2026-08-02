import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_SOURCE_LOCALE = 'ja'
const SITE_TRANSLATION_SOURCE_DIR = 'src/i18n/source/ja'
const AUTHOR_BASE_KEYS = [
  'name',
  'avatar',
  'avatarImage',
  'bio',
  'url',
  'github',
  'twitter',
  'skills',
] as const
const TAG_BASE_KEYS = ['name'] as const
const ZERO_SHA = '0000000000000000000000000000000000000000'
const ARTICLE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const COPILOT_API_BASE = 'https://api.githubcopilot.com'
const COPILOT_API_VERSION = '2026-01-09'
const COPILOT_INTEGRATION_ID = 'acecore-net-translation-prs'
const SCHOOLS_TRANSLATION_POLICY =
  'Acecore Schools uses the single website URL https://schools.acecore.net/ for every locale. Preserve factual Schools descriptions and this URL, do not hide Schools content based on the target locale, and never invent locale-specific Schools routes.'
const PAGE_TRANSLATION_KEYS: Readonly<Record<string, string>> = {
  'about.json': 'about',
  'acestudio.json': 'acestudio',
  'contact.json': 'contact',
  'home.json': 'home',
  'not-found.json': 'notFound',
  'privacy.json': 'privacy',
  'schools.json': 'schools',
  'services.json': 'services',
}

type GitChangeStatus = string
type CmsCommitClassification = 'empty' | 'none' | 'mixed' | 'cms-only'
type EntityChangeType = 'added' | 'updated'
type TaskKind = 'blog-post' | 'author-profile' | 'tag-definition' | 'site-text'
type AuthorBaseKey = (typeof AUTHOR_BASE_KEYS)[number]
type TagBaseKey = (typeof TAG_BASE_KEYS)[number]

type JsonPrimitive = boolean | number | string | null
type JsonValue = JsonPrimitive | JsonRecord | JsonValue[]
type JsonRecord = { [key: string]: JsonValue }

interface ParsedArgs {
  dryRun: boolean
  changedFiles: string[] | null
  baseSha: string | null
  headSha: string | null
  includeNonBlog: boolean
  cmsOnly: boolean
  maxBlogTasks: number
}

interface ChangedEntry {
  status: GitChangeStatus
  previousPath: string | null
  path: string
}

interface GitCommit {
  sha: string
  subject: string
  parentShas: string[]
}

interface GetChangedEntriesOptions {
  baseSha: string | null
  headSha: string
  changedFiles: string[] | null
  includeNonBlog: boolean
  cmsOnly: boolean
}

interface MarkdownDocument {
  frontmatter: string | null
  body: string | null
}

type ReadSource = (ref: string | null, filePath: string) => string | null

interface PairJapaneseBlogRenamesOptions {
  baseSha: string | null
  headSha: string
  readSource?: ReadSource
}

interface ChangedBlogPostTask extends ChangedEntry {
  sourceDiff: string
}

interface TranslationKeyChange {
  sourceKeyPath: string
  translationKeyPath: string
  changeType: 'added' | 'deleted' | 'updated'
}

interface ChangedSiteTranslationFile extends ChangedEntry {
  keyChanges: TranslationKeyChange[]
}

interface EntityChange<Key extends string> {
  id: string
  sourcePath: string
  changeType: EntityChangeType
  fields: Key[]
}

interface TranslationTaskPayload {
  title: string
  marker: string
  taskKind: TaskKind
  problemStatement: string
}

interface BuildProblemStatementOptions {
  title: string
  marker: string
  summary: string[]
  targetLocales: string[]
  instructions: string[]
  sourceDiff?: string | null
  changedKeys?: TranslationKeyChange[]
}

interface BuildBlogTaskPayloadOptions {
  sourcePath: string
  previousPath: string | null
  changeType: GitChangeStatus
  sourceDiff: string
  locales: string[]
  headSha: string
  repository: string
}

interface BuildEntityTaskPayloadOptions<Key extends string> {
  sourcePath: string
  change: EntityChange<Key>
  locales: string[]
  headSha: string
  repository: string
}

interface BuildSiteTextTaskPayloadOptions {
  changes: ChangedSiteTranslationFile[]
  locales: string[]
  headSha: string
  repository: string
}

interface GitHubRequestOptions {
  method?: string
  body?: JsonRecord
  token?: string
  headers?: Record<string, string>
}

interface RepositoryInfo {
  owner: string
  repo: string
  repository: string
}

export interface OpenPullRequest {
  number: number | null
  title: string | null
  body: string | null
}

interface CopilotAgentJob {
  id?: string | number
  jobId?: string | number
  raw?: string
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function parseJsonRecord(source: string, filePath: string): JsonRecord {
  const value: unknown = JSON.parse(source)
  if (!isJsonRecord(value)) {
    throw new Error(`Expected a JSON object in ${filePath}`)
  }

  return value
}

function getStringField(record: JsonRecord | null, key: string): string | null {
  const value = record?.[key]
  return typeof value === 'string' ? value : null
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const options: ParsedArgs = {
    dryRun: false,
    changedFiles: null,
    baseSha: null,
    headSha: null,
    includeNonBlog: false,
    cmsOnly: false,
    maxBlogTasks: 3,
  }

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true
      continue
    }

    if (arg.startsWith('--changed-files=')) {
      options.changedFiles = arg
        .slice('--changed-files='.length)
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
      continue
    }

    if (arg.startsWith('--base=')) {
      options.baseSha = arg.slice('--base='.length).trim() || null
      continue
    }

    if (arg.startsWith('--head=')) {
      options.headSha = arg.slice('--head='.length).trim() || null
      continue
    }

    if (arg === '--include-non-blog') {
      options.includeNonBlog = true
      continue
    }

    if (arg === '--cms-only') {
      options.cmsOnly = true
      continue
    }

    if (arg.startsWith('--max-blog-tasks=')) {
      const value = Number(arg.slice('--max-blog-tasks='.length).trim())
      if (!Number.isInteger(value) || value < 0) {
        throw new Error('--max-blog-tasks must be a non-negative integer')
      }
      options.maxBlogTasks = value
    }
  }

  return options
}

function getDiffTargets(includeNonBlog: boolean): string[] {
  const targets = ['src/content/blog', SITE_TRANSLATION_SOURCE_DIR]

  if (includeNonBlog) {
    targets.push('src/content/authors', 'src/content/tags')
  }

  return targets
}

function runGit(args: readonly string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function safeRunGit(args: readonly string[]): string {
  try {
    return runGit(args)
  } catch {
    return ''
  }
}

function normalizeSha(value: string | null | undefined): string | null {
  return value && value !== ZERO_SHA ? value : null
}

function getBaseSha(args: ParsedArgs): string | null {
  return (
    normalizeSha(args.baseSha) ?? normalizeSha(process.env.GITHUB_EVENT_BEFORE)
  )
}

function getHeadSha(args: ParsedArgs): string {
  return (
    normalizeSha(args.headSha) ?? normalizeSha(process.env.GITHUB_SHA) ?? 'HEAD'
  )
}

function parseNameStatusLine(line: string): ChangedEntry | null {
  const [statusText, ...rest] = line.split('\t')
  if (!statusText || rest.length === 0) return null

  const status = statusText[0]
  if (!status) return null

  if ((status === 'R' || status === 'C') && rest[0] && rest[1]) {
    return {
      status,
      previousPath: rest[0],
      path: rest[1],
    }
  }

  if (!rest[0]) return null

  return {
    status,
    previousPath: null,
    path: rest[0],
  }
}

export function isCmsCommitSubject(
  subject: string | null | undefined,
): boolean {
  return /^cms: (create|update|delete|upload) /.test(subject || '')
}

function listCommitSubjects(
  baseSha: string | null,
  headSha: string,
): GitCommit[] {
  const output = baseSha
    ? safeRunGit(['log', '--format=%H%x00%P%x00%s', `${baseSha}..${headSha}`])
    : safeRunGit(['log', '--format=%H%x00%P%x00%s', '-n', '1', headSha])

  if (!output) return []

  return output.split(/\r?\n/).map((line) => {
    const [sha, parents, subject] = line.split('\0')

    return {
      sha: sha || '',
      subject: subject || '',
      parentShas: parents ? parents.split(' ').filter(Boolean) : [],
    }
  })
}

function isMergeCommit(commit: GitCommit): boolean {
  return commit.parentShas.length > 1
}

export function classifyCmsCommitSet(
  commits: readonly GitCommit[],
): CmsCommitClassification {
  const contentCommits = commits.filter((commit) => !isMergeCommit(commit))
  if (contentCommits.length === 0) return 'empty'

  const cmsCommits = contentCommits.filter((commit) =>
    isCmsCommitSubject(commit.subject),
  )

  if (cmsCommits.length === 0) return 'none'
  if (cmsCommits.length !== contentCommits.length) return 'mixed'

  return 'cms-only'
}

function ensureCmsOnlyChangeSet(
  baseSha: string | null,
  headSha: string,
): boolean {
  const classification = classifyCmsCommitSet(
    listCommitSubjects(baseSha, headSha),
  )

  if (classification === 'empty') return false

  if (classification === 'none') {
    console.log('No CMS commits detected. Skipping translation PR tasks.')
    return false
  }

  if (classification === 'mixed') {
    throw new Error(
      'CMS and non-CMS commits are mixed in this push. Skipping automatic translation PR tasks; re-run manually after reviewing the source diff.',
    )
  }

  return true
}

function getChangedEntries({
  baseSha,
  headSha,
  changedFiles,
  includeNonBlog,
  cmsOnly,
}: GetChangedEntriesOptions): ChangedEntry[] {
  if (changedFiles) {
    return changedFiles.map((filePath): ChangedEntry => ({
      status: 'M',
      path: filePath,
      previousPath: null,
    }))
  }

  if (cmsOnly && !ensureCmsOnlyChangeSet(baseSha, headSha)) {
    return []
  }

  const targets = getDiffTargets(includeNonBlog)

  const diffArgs = baseSha
    ? [
        'diff',
        '--name-status',
        '--find-renames',
        baseSha,
        headSha,
        '--',
        ...targets,
      ]
    : [
        'diff-tree',
        '--no-commit-id',
        '--name-status',
        '--find-renames',
        '-r',
        headSha,
        '--',
        ...targets,
      ]

  const output = safeRunGit(diffArgs)
  if (!output) return []

  return output.split(/\r?\n/).map(parseNameStatusLine).filter(isDefined)
}

function isJapaneseBlogPostPath(filePath: string): boolean {
  return /^src\/content\/blog\/[^/]+\.md$/.test(filePath)
}

function isAuthorProfilePath(filePath: string): boolean {
  return /^src\/content\/authors\/[^/]+\.json$/.test(filePath)
}

function isTagDefinitionPath(filePath: string): boolean {
  return /^src\/content\/tags\/[^/]+\.json$/.test(filePath)
}

function isSiteTranslationSourcePath(filePath: string): boolean {
  return (
    filePath.startsWith(`${SITE_TRANSLATION_SOURCE_DIR}/`) &&
    filePath.endsWith('.json')
  )
}

function loadTargetLocales(): string[] {
  const configPath = 'src/i18n/config.ts'
  const source = readFileSync(configPath, 'utf8')
  const match = source.match(/locales\s*=\s*\[([^\]]+)\]\s*as const/s)
  if (!match) {
    throw new Error(`Could not parse locales from ${configPath}`)
  }

  const localeSource = match[1]
  if (!localeSource) {
    throw new Error(`Could not parse locales from ${configPath}`)
  }

  return [...localeSource.matchAll(/'([^']+)'/g)]
    .map((entry) => entry[1])
    .filter((locale) => locale !== DEFAULT_SOURCE_LOCALE)
}

function readTextAtRef(ref: string | null, filePath: string): string | null {
  if (!ref || ref === 'WORKTREE') {
    if (!existsSync(filePath)) return null
    return readFileSync(filePath, 'utf8')
  }

  const source = safeRunGit(['show', `${ref}:${filePath}`])
  return source || null
}

function splitMarkdownDocument(
  source: string | null | undefined,
): MarkdownDocument {
  if (typeof source !== 'string') {
    return { frontmatter: null, body: null }
  }

  const normalized = source.replace(/\r\n/g, '\n')
  if (!normalized.startsWith('---\n')) {
    return { frontmatter: '', body: normalized }
  }

  const endIndex = normalized.indexOf('\n---\n', 4)
  if (endIndex === -1) {
    return { frontmatter: '', body: normalized }
  }

  return {
    frontmatter: normalized.slice(4, endIndex),
    body: normalized.slice(endIndex + 5),
  }
}

function getBlogArticleId(source: string | null | undefined): string | null {
  const { frontmatter } = splitMarkdownDocument(source)
  if (typeof frontmatter !== 'string') return null

  const articleId = frontmatter
    .match(/^articleId:\s*['"]?([^'"\s#]+)['"]?\s*(?:#.*)?$/m)?.[1]
    ?.trim()

  return articleId && ARTICLE_ID_PATTERN.test(articleId)
    ? articleId.toLowerCase()
    : null
}

export function pairJapaneseBlogRenamesByArticleId(
  entries: readonly ChangedEntry[],
  {
    baseSha,
    headSha,
    readSource = readTextAtRef,
  }: PairJapaneseBlogRenamesOptions,
): ChangedEntry[] {
  if (!baseSha) return [...entries]

  const deletionsByArticleId = new Map<string, ChangedEntry[]>()
  const additionsByArticleId = new Map<string, ChangedEntry[]>()

  for (const entry of entries) {
    if (
      (entry.status !== 'A' && entry.status !== 'D') ||
      !isJapaneseBlogPostPath(entry.path)
    ) {
      continue
    }

    const ref = entry.status === 'D' ? baseSha : headSha
    const source = readSource(ref, entry.path)
    const articleId = getBlogArticleId(source)
    if (!articleId) continue

    const groups =
      entry.status === 'D' ? deletionsByArticleId : additionsByArticleId
    const matches = groups.get(articleId) ?? []
    matches.push(entry)
    groups.set(articleId, matches)
  }

  const previousPathByAddition = new Map<string, string>()
  const matchedDeletionPaths = new Set<string>()

  for (const [articleId, additions] of additionsByArticleId) {
    const deletions = deletionsByArticleId.get(articleId)
    if (additions.length !== 1 || deletions?.length !== 1) continue

    previousPathByAddition.set(additions[0].path, deletions[0].path)
    matchedDeletionPaths.add(deletions[0].path)
  }

  return entries.flatMap((entry) => {
    if (entry.status === 'D' && matchedDeletionPaths.has(entry.path)) {
      return []
    }

    if (entry.status !== 'A') return [entry]

    const previousPath = previousPathByAddition.get(entry.path)
    return previousPath ? [{ ...entry, status: 'R', previousPath }] : [entry]
  })
}

function isBlogTranslationDisabled(source: string | null | undefined): boolean {
  const { frontmatter } = splitMarkdownDocument(source)
  return (
    typeof frontmatter === 'string' &&
    /^translation:\s*false\s*(?:#.*)?$/imu.test(frontmatter)
  )
}

function truncateForPrompt(value: string | null, maxLength = 12000): string {
  if (!value || value.length <= maxLength) return value || ''
  return `${value.slice(0, maxLength)}\n\n[diff truncated: ${value.length - maxLength} characters omitted]`
}

function getSourceDiff(
  filePath: string,
  baseSha: string | null,
  headSha: string,
  previousPath: string | null = null,
): string {
  const paths = previousPath ? [previousPath, filePath] : [filePath]

  if (!baseSha) {
    return safeRunGit([
      'show',
      '--format=',
      '--unified=8',
      headSha,
      '--',
      ...paths,
    ])
  }

  return safeRunGit(['diff', '--unified=8', baseSha, headSha, '--', ...paths])
}

function getChangedBlogPost(
  entry: ChangedEntry,
  baseSha: string | null,
  headSha: string,
): ChangedEntry | null {
  if (entry.status === 'A' || entry.status === 'D') {
    return entry
  }

  if (!baseSha || entry.status !== 'M') {
    return entry
  }

  const beforeSource = readTextAtRef(baseSha, entry.path)
  const afterSource = readTextAtRef(
    headSha === 'HEAD' ? 'WORKTREE' : headSha,
    entry.path,
  )
  const before = splitMarkdownDocument(beforeSource)
  const after = splitMarkdownDocument(afterSource)

  return before.body !== after.body ||
    (isBlogTranslationDisabled(beforeSource) &&
      !isBlogTranslationDisabled(afterSource))
    ? entry
    : null
}

function getChangedBlogPostTask(
  entry: ChangedEntry,
  baseSha: string | null,
  headSha: string,
): ChangedBlogPostTask | null {
  if (entry.status !== 'D') {
    const currentSource = readTextAtRef(
      headSha === 'HEAD' ? 'WORKTREE' : headSha,
      entry.path,
    )
    if (isBlogTranslationDisabled(currentSource)) return null
  }

  const changedEntry = getChangedBlogPost(entry, baseSha, headSha)
  if (!changedEntry) return null

  return {
    ...changedEntry,
    sourceDiff: truncateForPrompt(
      getSourceDiff(entry.path, baseSha, headSha, entry.previousPath),
    ),
  }
}

function flattenJsonPaths(
  value: JsonValue,
  prefix = '',
): Map<string, JsonValue> {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return new Map([[prefix, value]])
  }

  const entries = new Map<string, JsonValue>()
  for (const [key, child] of Object.entries(value)) {
    const childPrefix = prefix ? `${prefix}.${key}` : key
    for (const [path, childValue] of flattenJsonPaths(child, childPrefix)) {
      entries.set(path, childValue)
    }
  }
  return entries
}

function getSourceTranslationKeyPrefix(filePath: string): string {
  const relativePath = filePath
    .slice(`${SITE_TRANSLATION_SOURCE_DIR}/`.length)
    .replace(/\\/g, '/')

  if (relativePath === 'common.json') {
    return ''
  }

  if (relativePath === 'blog.json') {
    return 'blog'
  }

  if (relativePath === 'legacy-tags.json') {
    return 'tags'
  }

  if (relativePath.startsWith('pages/')) {
    const fileName = relativePath.slice('pages/'.length)
    return `pages.${PAGE_TRANSLATION_KEYS[fileName] ?? fileName.replace(/\.json$/, '')}`
  }

  return relativePath.replace(/\.json$/, '').replace(/\//g, '.')
}

function buildTranslationKeyPath(
  filePath: string,
  sourceKeyPath: string,
): string {
  const prefix = getSourceTranslationKeyPrefix(filePath)
  return [prefix, sourceKeyPath].filter(Boolean).join('.')
}

function getChangedJsonKeyPaths(
  before: JsonRecord | null,
  after: JsonRecord | null,
  filePath: string,
): TranslationKeyChange[] {
  const beforePaths = before
    ? flattenJsonPaths(before)
    : new Map<string, JsonValue>()
  const afterPaths = after
    ? flattenJsonPaths(after)
    : new Map<string, JsonValue>()
  const allPaths = new Set([...beforePaths.keys(), ...afterPaths.keys()])
  const changes: TranslationKeyChange[] = []

  for (const sourceKeyPath of [...allPaths].sort()) {
    const beforeValue = beforePaths.get(sourceKeyPath)
    const afterValue = afterPaths.get(sourceKeyPath)
    if (JSON.stringify(beforeValue) === JSON.stringify(afterValue)) continue

    changes.push({
      sourceKeyPath,
      translationKeyPath: buildTranslationKeyPath(filePath, sourceKeyPath),
      changeType: beforePaths.has(sourceKeyPath)
        ? afterPaths.has(sourceKeyPath)
          ? 'updated'
          : 'deleted'
        : 'added',
    })
  }

  return changes
}

function getChangedSiteTranslationFile(
  entry: ChangedEntry,
  baseSha: string | null,
  headSha: string,
  forceChanged = false,
): ChangedSiteTranslationFile | null {
  if (entry.status === 'D') return null

  const before =
    forceChanged || entry.status === 'A' || !baseSha
      ? null
      : readJsonAtRef(baseSha, entry.path)
  const after = readJsonAtRef(
    headSha === 'HEAD' ? 'WORKTREE' : headSha,
    entry.path,
  )
  const keyChanges = getChangedJsonKeyPaths(before, after, entry.path)
  if (keyChanges.length === 0) return null

  return {
    ...entry,
    keyChanges,
  }
}

function readJsonAtRef(
  ref: string | null,
  filePath: string,
): JsonRecord | null {
  if (!ref || ref === 'WORKTREE') {
    if (!existsSync(filePath)) return null
    return parseJsonRecord(readFileSync(filePath, 'utf8'), filePath)
  }

  const source = safeRunGit(['show', `${ref}:${filePath}`])
  if (!source) return null
  return parseJsonRecord(source, filePath)
}

function normalizeAuthor(
  author: JsonRecord | null,
): Record<AuthorBaseKey, JsonValue | null> {
  return Object.fromEntries(
    AUTHOR_BASE_KEYS.map((key) => [key, author?.[key] ?? null]),
  ) as Record<AuthorBaseKey, JsonValue | null>
}

function getChangedAuthorProfile(
  filePath: string,
  baseSha: string | null,
  headSha: string,
  forceChanged = false,
): EntityChange<AuthorBaseKey> | null {
  const before = readJsonAtRef(baseSha, filePath)
  const after = readJsonAtRef(
    headSha === 'HEAD' ? 'WORKTREE' : headSha,
    filePath,
  )

  if (!before && !after) return null

  const id =
    getStringField(after, 'id') ??
    getStringField(before, 'id') ??
    filePath
      .split('/')
      .at(-1)
      ?.replace(/\.json$/, '') ??
    'unknown'

  if (!before && after) {
    return {
      id,
      sourcePath: filePath,
      changeType: 'added',
      fields: [...AUTHOR_BASE_KEYS],
    }
  }

  if (before && !after) {
    return null
  }

  if (forceChanged && after) {
    return {
      id,
      sourcePath: filePath,
      changeType: 'updated',
      fields: [...AUTHOR_BASE_KEYS],
    }
  }

  const beforeBase = normalizeAuthor(before)
  const afterBase = normalizeAuthor(after)
  const changedFields = AUTHOR_BASE_KEYS.filter(
    (key) => JSON.stringify(beforeBase[key]) !== JSON.stringify(afterBase[key]),
  )

  if (changedFields.length === 0) return null

  return {
    id,
    sourcePath: filePath,
    changeType: 'updated',
    fields: changedFields,
  }
}

function normalizeTag(
  tag: JsonRecord | null,
): Record<TagBaseKey, JsonValue | null> {
  return Object.fromEntries(
    TAG_BASE_KEYS.map((key) => [key, tag?.[key] ?? null]),
  ) as Record<TagBaseKey, JsonValue | null>
}

function getChangedTagDefinition(
  filePath: string,
  baseSha: string | null,
  headSha: string,
  forceChanged = false,
): EntityChange<TagBaseKey> | null {
  const before = readJsonAtRef(baseSha, filePath)
  const after = readJsonAtRef(
    headSha === 'HEAD' ? 'WORKTREE' : headSha,
    filePath,
  )

  if (!before && !after) return null

  const id =
    getStringField(after, 'id') ??
    getStringField(before, 'id') ??
    filePath
      .split('/')
      .at(-1)
      ?.replace(/\.json$/, '') ??
    'unknown'

  if (!before && after) {
    return {
      id,
      sourcePath: filePath,
      changeType: 'added',
      fields: [...TAG_BASE_KEYS],
    }
  }

  if (before && !after) {
    return null
  }

  if (forceChanged && after) {
    return {
      id,
      sourcePath: filePath,
      changeType: 'updated',
      fields: [...TAG_BASE_KEYS],
    }
  }

  const beforeBase = normalizeTag(before)
  const afterBase = normalizeTag(after)
  const changedFields = TAG_BASE_KEYS.filter(
    (key) => JSON.stringify(beforeBase[key]) !== JSON.stringify(afterBase[key]),
  )

  if (changedFields.length === 0) return null

  return {
    id,
    sourcePath: filePath,
    changeType: 'updated',
    fields: changedFields,
  }
}

function getRepositoryInfo(): RepositoryInfo {
  const repository =
    process.env.GITHUB_REPOSITORY || inferRepositoryFromGitRemote()
  if (!repository) {
    throw new Error('GITHUB_REPOSITORY is required')
  }

  const [owner, repo] = repository.split('/')
  if (!owner || !repo || repository.split('/').length !== 2) {
    throw new Error('GITHUB_REPOSITORY must use the owner/repository format')
  }

  return { owner, repo, repository }
}

function inferRepositoryFromGitRemote(): string | null {
  const remoteUrl = safeRunGit(['remote', 'get-url', 'origin'])
  if (!remoteUrl) return null

  const sshMatch = remoteUrl.match(/github\.com:([^/]+\/[^/.]+)(?:\.git)?$/)
  if (sshMatch) return sshMatch[1]

  const httpsMatch = remoteUrl.match(/github\.com\/([^/]+\/[^/.]+)(?:\.git)?$/)
  if (httpsMatch) return httpsMatch[1]

  return null
}

async function requestGitHub(
  path: string,
  { method = 'GET', body, token, headers }: GitHubRequestOptions = {},
): Promise<unknown | null> {
  const authToken = token ?? process.env.GITHUB_TOKEN
  if (!authToken) {
    throw new Error('GITHUB_TOKEN is required')
  }

  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'User-Agent': COPILOT_INTEGRATION_ID,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `GitHub API ${method} ${path} failed: ${response.status} ${errorText}`,
    )
  }

  if (response.status === 204) return null
  return response.json() as Promise<unknown>
}

export function parseOpenPullRequests(value: unknown): OpenPullRequest[] {
  if (!Array.isArray(value)) {
    throw new Error('GitHub API returned an invalid pull request list')
  }

  return value.map((pullRequest) => {
    if (!isJsonRecord(pullRequest)) {
      throw new Error('GitHub API returned an invalid pull request')
    }

    const number = pullRequest.number
    return {
      number: typeof number === 'number' ? number : null,
      title: getStringField(pullRequest, 'title'),
      body: getStringField(pullRequest, 'body'),
    }
  })
}

async function listOpenPullRequests(
  owner: string,
  repo: string,
): Promise<OpenPullRequest[]> {
  const pullRequests: OpenPullRequest[] = []

  for (let page = 1; ; page += 1) {
    const response = await requestGitHub(
      `/repos/${owner}/${repo}/pulls?state=open&per_page=100&page=${page}`,
    )
    const batch = parseOpenPullRequests(response)
    pullRequests.push(...batch)

    if (batch.length < 100) {
      return pullRequests
    }
  }
}

function isMatchingTranslationPullRequest(
  pullRequest: OpenPullRequest,
  payload: TranslationTaskPayload,
): boolean {
  return (
    pullRequest?.title === payload.title ||
    pullRequest.body?.includes(payload.marker) === true
  )
}

async function findOpenPullRequestForPayload(
  owner: string,
  repo: string,
  payload: TranslationTaskPayload,
): Promise<OpenPullRequest | undefined> {
  const pullRequests = await listOpenPullRequests(owner, repo)
  return pullRequests.find((pullRequest) =>
    isMatchingTranslationPullRequest(pullRequest, payload),
  )
}

function getCopilotAgentToken(): string | null {
  const token = process.env.COPILOT_AGENT_TOKEN?.trim()
  return token || null
}

function getCopilotJobIdentifier(value: unknown): string | number | undefined {
  return typeof value === 'string' || typeof value === 'number'
    ? value
    : undefined
}

function parseCopilotAgentJob(responseText: string): CopilotAgentJob {
  if (!responseText) return {}

  try {
    const response: unknown = JSON.parse(responseText)
    if (!isJsonRecord(response)) return { raw: responseText }

    const id = getCopilotJobIdentifier(response.id)
    const jobId = getCopilotJobIdentifier(response.job_id)
    return {
      ...(id !== undefined ? { id } : {}),
      ...(jobId !== undefined ? { jobId } : {}),
    }
  } catch {
    return { raw: responseText }
  }
}

async function requestCopilotAgentJob({
  owner,
  repo,
  title,
  problemStatement,
}: {
  owner: string
  repo: string
  title: string
  problemStatement: string
}): Promise<CopilotAgentJob> {
  const token = getCopilotAgentToken()
  if (!token) {
    throw new Error(
      'COPILOT_AGENT_TOKEN is required to create translation PRs directly.',
    )
  }

  const endpoint = `${COPILOT_API_BASE}/agents/swe/v1/jobs/${encodeURIComponent(
    owner,
  )}/${encodeURIComponent(repo)}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Copilot-Integration-Id': COPILOT_INTEGRATION_ID,
      'X-Github-Api-Version': COPILOT_API_VERSION,
      'User-Agent': COPILOT_INTEGRATION_ID,
    },
    body: JSON.stringify({
      title,
      problem_statement: problemStatement,
      event_type: 'translation-pr',
    }),
  })

  const responseText = await response.text()
  if (!response.ok) {
    throw new Error(
      `Copilot agent API failed: ${response.status} ${response.statusText}: ${responseText}`,
    )
  }

  return parseCopilotAgentJob(responseText)
}

function buildCopilotInstructions(taskKind: TaskKind): string[] {
  if (taskKind === 'author-profile') {
    return [
      'Update the author profile translations described below.',
      'Modify only the i18n entries in the affected src/content/authors/{author-id}.json files unless explicitly required otherwise.',
      'Keep Japanese source fields unchanged.',
    ]
  }

  if (taskKind === 'tag-definition') {
    return [
      'Update the tag definition translations described below.',
      'Modify only the i18n.name entries in the affected src/content/tags/{tag-id}.json files unless explicitly required otherwise.',
      'Keep Japanese source fields unchanged.',
    ]
  }

  if (taskKind === 'site-text') {
    return [
      'Update the site text translations described below.',
      `Use all JSON files under ${SITE_TRANSLATION_SOURCE_DIR}/, including nested page files, as the canonical Japanese source.`,
      'Modify only src/i18n/translations/{locale}.json files for the requested target locales.',
      'Keep Japanese source fields unchanged.',
      SCHOOLS_TRANSLATION_POLICY,
    ]
  }

  return [
    'Translate the Japanese source article described below into all requested locales.',
    'Update src/content/blog/{locale}/ files, keep frontmatter aligned with the source, and preserve links and image references.',
    'Preserve the source articleId exactly in every locale; never regenerate or edit it.',
    SCHOOLS_TRANSLATION_POLICY,
  ]
}

function buildProblemStatement({
  title,
  marker,
  summary,
  targetLocales,
  instructions,
  sourceDiff,
  changedKeys,
}: BuildProblemStatementOptions): string {
  const sections = [
    `<!-- ${marker} -->`,
    'You are handling an automated translation task for acecore-net.',
    'Do not create or update GitHub Issues. Create or update the translation pull request only.',
    '',
    '## Summary',
    ...summary.map((line) => `- ${line}`),
    '',
    '## Target Locales',
    ...targetLocales.map((locale) => `- ${locale}`),
    '',
    '## Instructions',
    ...instructions.map((instruction) =>
      instruction.startsWith('- ') ? instruction : `- ${instruction}`,
    ),
  ]

  if (changedKeys?.length) {
    sections.push(
      '',
      '## Changed Translation Keys',
      ...changedKeys.map(
        (change) =>
          `- ${change.translationKeyPath} (${change.changeType}; source: ${change.sourceKeyPath})`,
      ),
    )
  }

  if (sourceDiff) {
    sections.push('', '## Source Diff', '```diff', sourceDiff, '```')
  }

  sections.push(
    '',
    '## Pull Request Requirements',
    '- Use `main` as the base branch.',
    `- Use this pull request title: ${title}`,
    `- Include this exact marker in the pull request body: \`<!-- ${marker} -->\`.`,
    '- Keep the pull request body concise and mention the translated source path.',
    '- Run `npm run build` after the translation changes.',
    '- Mark the pull request ready for review when the work is complete.',
  )

  return sections.join('\n')
}

export function buildBlogTaskPayload({
  sourcePath,
  previousPath,
  changeType,
  sourceDiff,
  locales,
  headSha,
  repository,
}: BuildBlogTaskPayloadOptions): TranslationTaskPayload {
  const marker = `translation-source:${sourcePath}`
  const slug = sourcePath.split('/').at(-1)
  const previousSlug = previousPath?.split('/').at(-1)

  if (changeType === 'R' && !previousSlug) {
    throw new Error('A renamed blog translation task requires previousPath.')
  }

  const titlePrefix =
    changeType === 'D'
      ? 'Remove'
      : changeType === 'M'
        ? 'Update'
        : changeType === 'R'
          ? 'Rename'
          : 'Translate'
  const title = `[translation] ${titlePrefix} ${slug}`
  const instructions = [
    ...buildCopilotInstructions('blog-post'),
    changeType === 'D'
      ? '- Remove or close out the corresponding translated files under `src/content/blog/{locale}/`.'
      : changeType === 'R'
        ? `- In every target locale, rename \`src/content/blog/{locale}/${previousSlug}\` to \`src/content/blog/{locale}/${slug}\`; do not leave the old translated path behind.`
        : changeType === 'A'
          ? '- Create translated files under `src/content/blog/{locale}/` using the Japanese source as the canonical version.'
          : '- Update only the translated passages affected by the Markdown body diff shown below; do not rewrite unchanged translated content.',
    changeType === 'M'
      ? '- Set translated `lastUpdated` to the source article value; otherwise keep existing translated frontmatter unless the changed body requires a title or description adjustment.'
      : '- Keep frontmatter aligned with the source article, including `articleId`, `title`, `description`, `date`, `lastUpdated`, `tags`, `image`, `uploadedImage`, and `author`.',
    '- Preserve internal links, image references, and structured content blocks.',
  ]

  return {
    title,
    marker,
    taskKind: 'blog-post',
    problemStatement: buildProblemStatement({
      title,
      marker,
      summary: [
        `Repository: ${repository}`,
        `Source path: ${sourcePath}`,
        ...(previousPath ? [`Previous source path: ${previousPath}`] : []),
        `Source locale: ${DEFAULT_SOURCE_LOCALE}`,
        `Change type: ${changeType}`,
        `Source commit: ${headSha}`,
      ],
      targetLocales: locales,
      instructions,
      sourceDiff: changeType === 'M' || changeType === 'R' ? sourceDiff : null,
    }),
  }
}

function buildAuthorTaskPayload({
  sourcePath,
  change,
  locales,
  headSha,
  repository,
}: BuildEntityTaskPayloadOptions<AuthorBaseKey>): TranslationTaskPayload {
  const marker = `translation-source:${sourcePath}`
  const title = `[translation] Update author profile ${change.id}`
  const instructions = [
    ...buildCopilotInstructions('author-profile'),
    `- Update only the \`i18n\` translations in \`${sourcePath}\` for the affected author.`,
    '- Keep `name`, `bio`, and `skills` aligned with the updated Japanese source.',
  ]

  return {
    title,
    marker,
    taskKind: 'author-profile',
    problemStatement: buildProblemStatement({
      title,
      marker,
      summary: [
        `Repository: ${repository}`,
        `Source path: ${sourcePath}`,
        `Source locale: ${DEFAULT_SOURCE_LOCALE}`,
        `Source commit: ${headSha}`,
        `Changed author: ${change.id}`,
        `Change type: ${change.changeType}`,
        `Changed fields: ${change.fields.join(', ')}`,
      ],
      targetLocales: locales,
      instructions,
    }),
  }
}

function buildTagTaskPayload({
  sourcePath,
  change,
  locales,
  headSha,
  repository,
}: BuildEntityTaskPayloadOptions<TagBaseKey>): TranslationTaskPayload {
  const marker = `translation-source:${sourcePath}`
  const title = `[translation] Update tag definition ${change.id}`
  const instructions = [
    ...buildCopilotInstructions('tag-definition'),
    `- Update only the \`i18n.name\` translations in \`${sourcePath}\` for the affected tag.`,
    '- Keep localized tag names aligned with the updated Japanese source tag name.',
  ]

  return {
    title,
    marker,
    taskKind: 'tag-definition',
    problemStatement: buildProblemStatement({
      title,
      marker,
      summary: [
        `Repository: ${repository}`,
        `Source path: ${sourcePath}`,
        `Source locale: ${DEFAULT_SOURCE_LOCALE}`,
        `Source commit: ${headSha}`,
        `Changed tag: ${change.id}`,
        `Change type: ${change.changeType}`,
        `Changed fields: ${change.fields.join(', ')}`,
      ],
      targetLocales: locales,
      instructions,
    }),
  }
}

function buildSiteTextTaskPayload({
  changes,
  locales,
  headSha,
  repository,
}: BuildSiteTextTaskPayloadOptions): TranslationTaskPayload {
  const marker = `translation-source:${SITE_TRANSLATION_SOURCE_DIR}`
  const title = '[translation] Update site text translations'
  const instructions = [
    ...buildCopilotInstructions('site-text'),
    '- Update only the changed translation keys listed below.',
    '- Do not rewrite unchanged translation keys.',
    '- Preserve placeholders such as `{count}`, `{title}`, URLs, route paths, product names, and code-like tokens exactly.',
    '- If a listed key was deleted from the Japanese source, remove only the matching translated key when it exists.',
    '- Do not edit blog Markdown, author JSON, or tag JSON files for this task.',
  ]
  const sourcePaths = [...new Set(changes.map((change) => change.path))]
  const changedKeys = changes.flatMap((change) => change.keyChanges)

  return {
    title,
    marker,
    taskKind: 'site-text',
    problemStatement: buildProblemStatement({
      title,
      marker,
      summary: [
        `Repository: ${repository}`,
        `Source path: ${SITE_TRANSLATION_SOURCE_DIR}`,
        `Changed source files: ${sourcePaths.join(', ')}`,
        `Changed key count: ${changedKeys.length}`,
        `Source locale: ${DEFAULT_SOURCE_LOCALE}`,
        `Source commit: ${headSha}`,
      ],
      targetLocales: locales,
      instructions,
      changedKeys,
    }),
  }
}

async function createTranslationPullRequestTask(
  payload: TranslationTaskPayload,
): Promise<OpenPullRequest | CopilotAgentJob> {
  const { owner, repo } = getRepositoryInfo()
  const existingPullRequest = await findOpenPullRequestForPayload(
    owner,
    repo,
    payload,
  )

  if (existingPullRequest) {
    console.log(
      `Open translation PR already exists #${existingPullRequest.number}: ${existingPullRequest.title}`,
    )
    return existingPullRequest
  }

  const job = await requestCopilotAgentJob({
    owner,
    repo,
    title: payload.title,
    problemStatement: payload.problemStatement,
  })
  const jobId = job.id ?? job.jobId ?? 'unknown'
  console.log(`Started Copilot translation PR task ${jobId}: ${payload.title}`)
  return job
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))
  const baseSha = getBaseSha(args)
  const headSha = getHeadSha(args)
  const forceChanged = Boolean(args.changedFiles)
  const { repository } = getRepositoryInfo()
  const locales = loadTargetLocales()
  const rawChangedEntries = getChangedEntries({
    baseSha,
    headSha,
    changedFiles: args.changedFiles,
    includeNonBlog: args.includeNonBlog,
    cmsOnly: args.cmsOnly,
  })
  const changedEntries = pairJapaneseBlogRenamesByArticleId(rawChangedEntries, {
    baseSha,
    headSha,
  })

  const blogChanges = changedEntries
    .filter((entry) => isJapaneseBlogPostPath(entry.path))
    .map((entry) => getChangedBlogPostTask(entry, baseSha, headSha))
    .filter(isDefined)

  if (blogChanges.length > args.maxBlogTasks) {
    throw new Error(
      `Detected ${blogChanges.length} blog translation tasks, but maxBlogTasks is ${args.maxBlogTasks}. Re-run manually with a higher limit after reviewing the source list.`,
    )
  }

  const authorChanges = args.includeNonBlog
    ? changedEntries
        .filter((entry) => isAuthorProfilePath(entry.path))
        .map((entry) =>
          getChangedAuthorProfile(entry.path, baseSha, headSha, forceChanged),
        )
        .filter(isDefined)
    : []
  const tagChanges = args.includeNonBlog
    ? changedEntries
        .filter((entry) => isTagDefinitionPath(entry.path))
        .map((entry) =>
          getChangedTagDefinition(entry.path, baseSha, headSha, forceChanged),
        )
        .filter(isDefined)
    : []
  const siteTextChanges = changedEntries
    .filter((entry) => isSiteTranslationSourcePath(entry.path))
    .map((entry) =>
      getChangedSiteTranslationFile(entry, baseSha, headSha, forceChanged),
    )
    .filter(isDefined)

  const payloads = [
    ...blogChanges.map((entry) =>
      buildBlogTaskPayload({
        sourcePath: entry.path,
        previousPath: entry.previousPath,
        changeType: entry.status,
        sourceDiff: entry.sourceDiff,
        locales,
        headSha,
        repository,
      }),
    ),
    ...(siteTextChanges.length > 0
      ? [
          buildSiteTextTaskPayload({
            changes: siteTextChanges,
            locales,
            headSha,
            repository,
          }),
        ]
      : []),
    ...authorChanges.map((change) =>
      buildAuthorTaskPayload({
        sourcePath: change.sourcePath,
        change,
        locales,
        headSha,
        repository,
      }),
    ),
    ...tagChanges.map((change) =>
      buildTagTaskPayload({
        sourcePath: change.sourcePath,
        change,
        locales,
        headSha,
        repository,
      }),
    ),
  ]

  if (payloads.length === 0) {
    console.log(
      'No Japanese source changes requiring translation PRs were detected.',
    )
    return
  }

  if (args.dryRun) {
    console.log(JSON.stringify(payloads, null, 2))
    return
  }

  for (const payload of payloads) {
    await createTranslationPullRequestTask(payload)
  }
}

function isMainModule(): boolean {
  if (!process.argv[1]) return false

  const current = fileURLToPath(import.meta.url)
  const entry = path.resolve(process.argv[1])

  return process.platform === 'win32'
    ? current.toLowerCase() === entry.toLowerCase()
    : current === entry
}

if (isMainModule()) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
