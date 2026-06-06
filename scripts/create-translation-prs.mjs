import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

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
]
const TAG_BASE_KEYS = ['name']
const ZERO_SHA = '0000000000000000000000000000000000000000'
const COPILOT_API_BASE = 'https://api.githubcopilot.com'
const COPILOT_API_VERSION = '2026-01-09'
const COPILOT_INTEGRATION_ID = 'acecore-net-translation-prs'
const PAGE_TRANSLATION_KEYS = {
  'about.json': 'about',
  'acestudio.json': 'acestudio',
  'contact.json': 'contact',
  'home.json': 'home',
  'not-found.json': 'notFound',
  'privacy.json': 'privacy',
  'schools.json': 'schools',
  'services.json': 'services',
}

function parseArgs(argv) {
  const options = {
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

function getDiffTargets(includeNonBlog) {
  const targets = ['src/content/blog', SITE_TRANSLATION_SOURCE_DIR]

  if (includeNonBlog) {
    targets.push('src/content/authors', 'src/content/tags')
  }

  return targets
}

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function safeRunGit(args) {
  try {
    return runGit(args)
  } catch {
    return ''
  }
}

function normalizeSha(value) {
  return value && value !== ZERO_SHA ? value : null
}

function getBaseSha(args) {
  return (
    normalizeSha(args.baseSha) ?? normalizeSha(process.env.GITHUB_EVENT_BEFORE)
  )
}

function getHeadSha(args) {
  return (
    normalizeSha(args.headSha) ?? normalizeSha(process.env.GITHUB_SHA) ?? 'HEAD'
  )
}

function parseNameStatusLine(line) {
  const [statusText, ...rest] = line.split('\t')
  if (!statusText || rest.length === 0) return null

  const status = statusText[0]
  if (status === 'R' || status === 'C') {
    return {
      status,
      previousPath: rest[0],
      path: rest[1],
    }
  }

  return {
    status,
    previousPath: null,
    path: rest[0],
  }
}

function isCmsCommitSubject(subject) {
  return /^cms: (create|update|delete) /.test(subject || '')
}

function listCommitSubjects(baseSha, headSha) {
  const output = baseSha
    ? safeRunGit(['log', '--format=%H%x00%s', `${baseSha}..${headSha}`])
    : safeRunGit(['log', '--format=%H%x00%s', '-n', '1', headSha])

  if (!output) return []

  return output.split(/\r?\n/).map((line) => {
    const [sha, subject] = line.split('\0')
    return { sha, subject: subject || '' }
  })
}

function ensureCmsOnlyChangeSet(baseSha, headSha) {
  const commits = listCommitSubjects(baseSha, headSha)
  if (commits.length === 0) return false

  const cmsCommits = commits.filter((commit) =>
    isCmsCommitSubject(commit.subject),
  )

  if (cmsCommits.length === 0) {
    console.log('No CMS commits detected. Skipping translation PR tasks.')
    return false
  }

  if (cmsCommits.length !== commits.length) {
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
}) {
  if (changedFiles) {
    return changedFiles.map((path) => ({
      status: 'M',
      path,
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

  return output.split(/\r?\n/).map(parseNameStatusLine).filter(Boolean)
}

function isJapaneseBlogPostPath(path) {
  return /^src\/content\/blog\/[^/]+\.md$/.test(path)
}

function isAuthorProfilePath(path) {
  return /^src\/content\/authors\/[^/]+\.json$/.test(path)
}

function isTagDefinitionPath(path) {
  return /^src\/content\/tags\/[^/]+\.json$/.test(path)
}

function isSiteTranslationSourcePath(path) {
  return (
    path.startsWith(`${SITE_TRANSLATION_SOURCE_DIR}/`) && path.endsWith('.json')
  )
}

function loadTargetLocales() {
  const configPath = 'src/i18n/config.ts'
  const source = readFileSync(configPath, 'utf8')
  const match = source.match(/locales\s*=\s*\[([^\]]+)\]\s*as const/s)
  if (!match) {
    throw new Error(`Could not parse locales from ${configPath}`)
  }

  return [...match[1].matchAll(/'([^']+)'/g)]
    .map((entry) => entry[1])
    .filter((locale) => locale !== DEFAULT_SOURCE_LOCALE)
}

function readTextAtRef(ref, filePath) {
  if (!ref || ref === 'WORKTREE') {
    if (!existsSync(filePath)) return null
    return readFileSync(filePath, 'utf8')
  }

  const source = safeRunGit(['show', `${ref}:${filePath}`])
  return source || null
}

function splitMarkdownDocument(source) {
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

function truncateForPrompt(value, maxLength = 12000) {
  if (!value || value.length <= maxLength) return value || ''
  return `${value.slice(0, maxLength)}\n\n[diff truncated: ${value.length - maxLength} characters omitted]`
}

function getSourceDiff(filePath, baseSha, headSha) {
  if (!baseSha) {
    return safeRunGit([
      'show',
      '--format=',
      '--unified=8',
      headSha,
      '--',
      filePath,
    ])
  }

  return safeRunGit(['diff', '--unified=8', baseSha, headSha, '--', filePath])
}

function getChangedBlogPost(entry, baseSha, headSha) {
  if (entry.status === 'A' || entry.status === 'D') {
    return entry
  }

  if (!baseSha || entry.status !== 'M') {
    return entry
  }

  const before = splitMarkdownDocument(readTextAtRef(baseSha, entry.path))
  const after = splitMarkdownDocument(
    readTextAtRef(headSha === 'HEAD' ? 'WORKTREE' : headSha, entry.path),
  )

  return before.body !== after.body ? entry : null
}

function getChangedBlogPostTask(entry, baseSha, headSha) {
  const changedEntry = getChangedBlogPost(entry, baseSha, headSha)
  if (!changedEntry) return null

  return {
    ...changedEntry,
    sourceDiff: truncateForPrompt(getSourceDiff(entry.path, baseSha, headSha)),
  }
}

function flattenJsonPaths(value, prefix = '') {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return new Map([[prefix, value]])
  }

  const entries = new Map()
  for (const [key, child] of Object.entries(value)) {
    const childPrefix = prefix ? `${prefix}.${key}` : key
    for (const [path, childValue] of flattenJsonPaths(child, childPrefix)) {
      entries.set(path, childValue)
    }
  }
  return entries
}

function getSourceTranslationKeyPrefix(filePath) {
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

function buildTranslationKeyPath(filePath, sourceKeyPath) {
  const prefix = getSourceTranslationKeyPrefix(filePath)
  return [prefix, sourceKeyPath].filter(Boolean).join('.')
}

function getChangedJsonKeyPaths(before, after, filePath) {
  const beforePaths = before ? flattenJsonPaths(before) : new Map()
  const afterPaths = after ? flattenJsonPaths(after) : new Map()
  const allPaths = new Set([...beforePaths.keys(), ...afterPaths.keys()])
  const changes = []

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
  entry,
  baseSha,
  headSha,
  forceChanged = false,
) {
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

function readJsonAtRef(ref, filePath) {
  if (!ref || ref === 'WORKTREE') {
    if (!existsSync(filePath)) return null
    return JSON.parse(readFileSync(filePath, 'utf8'))
  }

  const source = safeRunGit(['show', `${ref}:${filePath}`])
  if (!source) return null
  return JSON.parse(source)
}

function normalizeAuthor(author) {
  return Object.fromEntries(
    AUTHOR_BASE_KEYS.map((key) => [key, author?.[key] ?? null]),
  )
}

function getChangedAuthorProfile(
  filePath,
  baseSha,
  headSha,
  forceChanged = false,
) {
  const before = readJsonAtRef(baseSha, filePath)
  const after = readJsonAtRef(
    headSha === 'HEAD' ? 'WORKTREE' : headSha,
    filePath,
  )

  if (!before && !after) return null

  const id =
    after?.id ??
    before?.id ??
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

function normalizeTag(tag) {
  return Object.fromEntries(
    TAG_BASE_KEYS.map((key) => [key, tag?.[key] ?? null]),
  )
}

function getChangedTagDefinition(
  filePath,
  baseSha,
  headSha,
  forceChanged = false,
) {
  const before = readJsonAtRef(baseSha, filePath)
  const after = readJsonAtRef(
    headSha === 'HEAD' ? 'WORKTREE' : headSha,
    filePath,
  )

  if (!before && !after) return null

  const id =
    after?.id ??
    before?.id ??
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

function getRepositoryInfo() {
  const repository =
    process.env.GITHUB_REPOSITORY || inferRepositoryFromGitRemote()
  if (!repository) {
    throw new Error('GITHUB_REPOSITORY is required')
  }

  const [owner, repo] = repository.split('/')
  return { owner, repo, repository }
}

function inferRepositoryFromGitRemote() {
  const remoteUrl = safeRunGit(['remote', 'get-url', 'origin'])
  if (!remoteUrl) return null

  const sshMatch = remoteUrl.match(/github\.com:([^/]+\/[^/.]+)(?:\.git)?$/)
  if (sshMatch) return sshMatch[1]

  const httpsMatch = remoteUrl.match(/github\.com\/([^/]+\/[^/.]+)(?:\.git)?$/)
  if (httpsMatch) return httpsMatch[1]

  return null
}

async function requestGitHub(
  path,
  { method = 'GET', body, token, headers } = {},
) {
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
  return response.json()
}

async function listOpenPullRequests(owner, repo) {
  const pullRequests = []

  for (let page = 1; ; page += 1) {
    const batch = await requestGitHub(
      `/repos/${owner}/${repo}/pulls?state=open&per_page=100&page=${page}`,
    )
    pullRequests.push(...batch)

    if (batch.length < 100) {
      return pullRequests
    }
  }
}

function isMatchingTranslationPullRequest(pullRequest, payload) {
  return (
    pullRequest?.title === payload.title ||
    pullRequest?.body?.includes(payload.marker)
  )
}

async function findOpenPullRequestForPayload(owner, repo, payload) {
  const pullRequests = await listOpenPullRequests(owner, repo)
  return pullRequests.find((pullRequest) =>
    isMatchingTranslationPullRequest(pullRequest, payload),
  )
}

function getCopilotAgentToken() {
  const token = process.env.COPILOT_AGENT_TOKEN?.trim()
  return token || null
}

async function requestCopilotAgentJob({
  owner,
  repo,
  title,
  problemStatement,
}) {
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

  if (!responseText) return {}

  try {
    return JSON.parse(responseText)
  } catch {
    return { raw: responseText }
  }
}

function buildCopilotInstructions(taskKind) {
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
    ]
  }

  return [
    'Translate the Japanese source article described below into all requested locales.',
    'Update src/content/blog/{locale}/ files, keep frontmatter aligned with the source, and preserve links and image references.',
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
}) {
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

function buildBlogTaskPayload({
  sourcePath,
  changeType,
  sourceDiff,
  locales,
  headSha,
  repository,
}) {
  const marker = `translation-source:${sourcePath}`
  const slug = sourcePath.split('/').at(-1)
  const titlePrefix =
    changeType === 'D' ? 'Remove' : changeType === 'M' ? 'Update' : 'Translate'
  const title = `[translation] ${titlePrefix} ${slug}`
  const instructions = [
    ...buildCopilotInstructions('blog-post'),
    changeType === 'D'
      ? '- Remove or close out the corresponding translated files under `src/content/blog/{locale}/`.'
      : changeType === 'A'
        ? '- Create translated files under `src/content/blog/{locale}/` using the Japanese source as the canonical version.'
        : '- Update only the translated passages affected by the Markdown body diff shown below; do not rewrite unchanged translated content.',
    changeType === 'M'
      ? '- Ignore frontmatter-only changes and keep existing translated frontmatter unless the changed body requires a title or description adjustment.'
      : '- Keep frontmatter aligned with the source article, including `title`, `description`, `date`, `tags`, `image`, `uploadedImage`, and `author`.',
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
        `Source locale: ${DEFAULT_SOURCE_LOCALE}`,
        `Change type: ${changeType}`,
        `Source commit: ${headSha}`,
      ],
      targetLocales: locales,
      instructions,
      sourceDiff: changeType === 'M' ? sourceDiff : null,
    }),
  }
}

function buildAuthorTaskPayload({
  sourcePath,
  change,
  locales,
  headSha,
  repository,
}) {
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
}) {
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

function buildSiteTextTaskPayload({ changes, locales, headSha, repository }) {
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

async function createTranslationPullRequestTask(payload) {
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
  const jobId = job.id ?? job.job_id ?? 'unknown'
  console.log(`Started Copilot translation PR task ${jobId}: ${payload.title}`)
  return job
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const baseSha = getBaseSha(args)
  const headSha = getHeadSha(args)
  const forceChanged = Boolean(args.changedFiles)
  const { repository } = getRepositoryInfo()
  const locales = loadTargetLocales()
  const changedEntries = getChangedEntries({
    baseSha,
    headSha,
    changedFiles: args.changedFiles,
    includeNonBlog: args.includeNonBlog,
    cmsOnly: args.cmsOnly,
  })

  const blogChanges = changedEntries
    .filter((entry) => isJapaneseBlogPostPath(entry.path))
    .map((entry) => getChangedBlogPostTask(entry, baseSha, headSha))
    .filter(Boolean)

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
        .filter(Boolean)
    : []
  const tagChanges = args.includeNonBlog
    ? changedEntries
        .filter((entry) => isTagDefinitionPath(entry.path))
        .map((entry) =>
          getChangedTagDefinition(entry.path, baseSha, headSha, forceChanged),
        )
        .filter(Boolean)
    : []
  const siteTextChanges = changedEntries
    .filter((entry) => isSiteTranslationSourcePath(entry.path))
    .map((entry) =>
      getChangedSiteTranslationFile(entry, baseSha, headSha, forceChanged),
    )
    .filter(Boolean)

  const payloads = [
    ...blogChanges.map((entry) =>
      buildBlogTaskPayload({
        sourcePath: entry.path,
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

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
