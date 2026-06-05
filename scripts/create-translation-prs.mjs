import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

const DEFAULT_SOURCE_LOCALE = 'ja'
const SITE_TRANSLATION_SOURCE_PATH = 'src/i18n/translations/ja.json'
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

function parseArgs(argv) {
  const options = {
    dryRun: false,
    changedFiles: null,
    baseSha: null,
    headSha: null,
    includeNonBlog: false,
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
    }
  }

  return options
}

function getDiffTargets(includeNonBlog) {
  const targets = ['src/content/blog', SITE_TRANSLATION_SOURCE_PATH]

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

function getChangedEntries({ baseSha, headSha, changedFiles, includeNonBlog }) {
  if (changedFiles) {
    return changedFiles.map((path) => ({
      status: 'M',
      path,
      previousPath: null,
    }))
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
  return path === SITE_TRANSLATION_SOURCE_PATH
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

function getChangedSiteTranslationFile(
  entry,
  baseSha,
  headSha,
  forceChanged = false,
) {
  if (entry.status === 'D') return null

  if (forceChanged || entry.status === 'A' || !baseSha) {
    return entry
  }

  const before = readTextAtRef(baseSha, entry.path)
  const after = readTextAtRef(
    headSha === 'HEAD' ? 'WORKTREE' : headSha,
    entry.path,
  )

  return before !== after ? entry : null
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
      `Use ${SITE_TRANSLATION_SOURCE_PATH} as the canonical Japanese source.`,
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
}) {
  return [
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
    '',
    '## Pull Request Requirements',
    '- Use `main` as the base branch.',
    `- Use this pull request title: ${title}`,
    `- Include this exact marker in the pull request body: \`<!-- ${marker} -->\`.`,
    '- Keep the pull request body concise and mention the translated source path.',
    '- Run `npm run build` after the translation changes.',
    '- Mark the pull request ready for review when the work is complete.',
  ].join('\n')
}

function buildBlogTaskPayload({
  sourcePath,
  changeType,
  locales,
  headSha,
  repository,
}) {
  const marker = `translation-source:${sourcePath}`
  const slug = sourcePath.split('/').at(-1)
  const titlePrefix = changeType === 'D' ? 'Remove' : 'Translate'
  const title = `[translation] ${titlePrefix} ${slug}`
  const instructions = [
    ...buildCopilotInstructions('blog-post'),
    changeType === 'D'
      ? '- Remove or close out the corresponding translated files under `src/content/blog/{locale}/`.'
      : '- Create or update translated files under `src/content/blog/{locale}/` using the Japanese source as the canonical version.',
    '- Keep frontmatter aligned with the source article, including `title`, `description`, `date`, `tags`, `image`, `uploadedImage`, and `author`.',
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

function buildSiteTextTaskPayload({
  sourcePath,
  locales,
  headSha,
  repository,
}) {
  const marker = `translation-source:${sourcePath}`
  const title = '[translation] Update site text translations'
  const instructions = [
    ...buildCopilotInstructions('site-text'),
    '- Keep the JSON key structure aligned with the Japanese source.',
    '- Preserve placeholders such as `{count}`, `{title}`, URLs, route paths, product names, and code-like tokens exactly.',
    '- Keep `tags` translations aligned if the top-level `tags` object changes, but tag source definitions remain under `src/content/tags`.',
    '- Do not edit blog Markdown, author JSON, or tag JSON files for this task.',
  ]

  return {
    title,
    marker,
    taskKind: 'site-text',
    problemStatement: buildProblemStatement({
      title,
      marker,
      summary: [
        `Repository: ${repository}`,
        `Source path: ${sourcePath}`,
        `Source locale: ${DEFAULT_SOURCE_LOCALE}`,
        `Source commit: ${headSha}`,
      ],
      targetLocales: locales,
      instructions,
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
  })

  const blogChanges = changedEntries
    .filter((entry) => isJapaneseBlogPostPath(entry.path))
    .map((entry) => getChangedBlogPost(entry, baseSha, headSha))
    .filter(Boolean)
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
        locales,
        headSha,
        repository,
      }),
    ),
    ...siteTextChanges.map((entry) =>
      buildSiteTextTaskPayload({
        sourcePath: entry.path,
        locales,
        headSha,
        repository,
      }),
    ),
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
