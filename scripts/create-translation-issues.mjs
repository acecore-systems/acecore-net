import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'

const DEFAULT_SOURCE_LOCALE = 'ja'
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
  return includeNonBlog
    ? ['src/content/blog', 'src/content/authors', 'src/content/tags']
    : ['src/content/blog']
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
  return normalizeSha(args.baseSha) ?? normalizeSha(process.env.GITHUB_EVENT_BEFORE)
}

function getHeadSha(args) {
  return normalizeSha(args.headSha) ?? normalizeSha(process.env.GITHUB_SHA) ?? 'HEAD'
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
    return changedFiles.map((path) => ({ status: 'M', path, previousPath: null }))
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

  return output
    .split(/\r?\n/)
    .map(parseNameStatusLine)
    .filter(Boolean)
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

function getChangedAuthorProfile(filePath, baseSha, headSha, forceChanged = false) {
  const before = readJsonAtRef(baseSha, filePath)
  const after = readJsonAtRef(headSha === 'HEAD' ? 'WORKTREE' : headSha, filePath)

  if (!before && !after) return null

  const id =
    after?.id ??
    before?.id ??
    filePath.split('/').at(-1)?.replace(/\.json$/, '') ??
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
  return Object.fromEntries(TAG_BASE_KEYS.map((key) => [key, tag?.[key] ?? null]))
}

function getChangedTagDefinition(filePath, baseSha, headSha, forceChanged = false) {
  const before = readJsonAtRef(baseSha, filePath)
  const after = readJsonAtRef(headSha === 'HEAD' ? 'WORKTREE' : headSha, filePath)

  if (!before && !after) return null

  const id =
    after?.id ??
    before?.id ??
    filePath.split('/').at(-1)?.replace(/\.json$/, '') ??
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
  const repository = process.env.GITHUB_REPOSITORY || inferRepositoryFromGitRemote()
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

async function requestGitHub(path, { method = 'GET', body, token, headers } = {}) {
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
      'User-Agent': 'acecore-net-translation-issue-bot',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GitHub API ${method} ${path} failed: ${response.status} ${errorText}`)
  }

  if (response.status === 204) return null
  return response.json()
}

async function findOpenIssueByMarker(repository, marker) {
  const query = encodeURIComponent(`repo:${repository} is:issue is:open in:body ${marker}`)
  const response = await requestGitHub(`/search/issues?q=${query}`)
  return response.items?.[0] ?? null
}

function getCopilotAgentToken() {
  const token = process.env.COPILOT_AGENT_TOKEN?.trim()
  return token || null
}

function buildCopilotInstructions(issueKind) {
  if (issueKind === 'author-profile') {
    return [
      'Update the author profile translations described in the issue.',
      'Modify only the i18n entries in the affected src/content/authors/{author-id}.json files unless explicitly required otherwise.',
      'Keep Japanese source fields unchanged and run npm run build before finishing.',
    ].join(' ')
  }

  if (issueKind === 'tag-definition') {
    return [
      'Update the tag definition translations described in the issue.',
      'Modify only the i18n.name entries in the affected src/content/tags/{tag-id}.json files unless explicitly required otherwise.',
      'Keep Japanese source fields unchanged and run npm run build before finishing.',
    ].join(' ')
  }

  return [
    'Translate the Japanese source article described in the issue into all requested locales.',
    'Update src/content/blog/{locale}/ files, keep frontmatter aligned with the source, and preserve links and image references.',
    'Run npm run build before finishing.',
  ].join(' ')
}

async function assignIssueToCopilot({ owner, repo, repository, issueNumber, issueKind }) {
  const copilotToken = getCopilotAgentToken()
  if (!copilotToken) {
    console.log('COPILOT_AGENT_TOKEN is not set; skipping Copilot assignment.')
    return
  }

  try {
    await requestGitHub(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
      method: 'PATCH',
      token: copilotToken,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: {
        assignees: ['copilot-swe-agent[bot]'],
        agent_assignment: {
          target_repo: repository,
          base_branch: 'main',
          custom_instructions: buildCopilotInstructions(issueKind),
          custom_agent: '',
          model: '',
        },
      },
    })
    console.log(`Assigned issue #${issueNumber} to copilot-swe-agent[bot]`)
  } catch (error) {
    console.warn(`Could not assign issue #${issueNumber} to Copilot: ${error.message}`)
  }
}

function buildBlogIssuePayload({ sourcePath, changeType, locales, headSha, repository }) {
  const marker = `translation-source:${sourcePath}`
  const slug = sourcePath.split('/').at(-1)
  const titlePrefix = changeType === 'D' ? 'Remove' : 'Translate'
  const body = [
    `<!-- ${marker} -->`,
    '<!-- translation-kind:blog-post -->',
    '',
    '## Summary',
    `- Source path: ${sourcePath}`,
    `- Source locale: ${DEFAULT_SOURCE_LOCALE}`,
    `- Change type: ${changeType}`,
    `- Source commit: ${headSha}`,
    '',
    '## Target Locales',
    ...locales.map((locale) => `- ${locale}`),
    '',
    '## Instructions',
    changeType === 'D'
      ? '- Remove or close out the corresponding translated files under `src/content/blog/{locale}/`.'
      : '- Create or update translated files under `src/content/blog/{locale}/` using the Japanese source as the canonical version.',
    '- Keep frontmatter aligned with the source article, including `title`, `description`, `date`, `tags`, `image`, `uploadedImage`, and `author`.',
    '- Preserve internal links, image references, and structured content blocks.',
    '- Run `npm run build` after the translation changes.',
    '',
    '## References',
    `- Repository: ${repository}`,
    `- Source file: ${sourcePath}`,
    `- Suggested issue template: .github/ISSUE_TEMPLATE/translation-request.yml`,
  ].join('\n')

  return {
    title: `[translation] ${titlePrefix} ${slug}`,
    body,
    marker,
    issueKind: 'blog-post',
  }
}

function buildAuthorIssuePayload({ sourcePath, change, locales, headSha, repository }) {
  const marker = `translation-source:${sourcePath}`
  const body = [
    `<!-- ${marker} -->`,
    '<!-- translation-kind:author-profile -->',
    '',
    '## Summary',
    `- Source path: ${sourcePath}`,
    `- Source locale: ${DEFAULT_SOURCE_LOCALE}`,
    `- Source commit: ${headSha}`,
    '',
    '## Changed Author',
    `- ${change.id}: ${change.changeType} (${change.fields.join(', ')})`,
    '',
    '## Target Locales',
    ...locales.map((locale) => `- ${locale}`),
    '',
    '## Instructions',
    `- Update only the \`i18n\` translations in \`${sourcePath}\` for the affected author.`,
    '- Do not change the Japanese source fields unless the issue explicitly requires it.',
    '- Keep `name`, `bio`, and `skills` aligned with the updated Japanese source.',
    '- Run `npm run build` after the translation changes.',
    '',
    '## References',
    `- Repository: ${repository}`,
    `- Source file: ${sourcePath}`,
    `- Suggested issue template: .github/ISSUE_TEMPLATE/translation-request.yml`,
  ].join('\n')

  return {
    title: `[translation] Update author profile ${change.id}`,
    body,
    marker,
    issueKind: 'author-profile',
  }
}

function buildTagIssuePayload({ sourcePath, change, locales, headSha, repository }) {
  const marker = `translation-source:${sourcePath}`
  const body = [
    `<!-- ${marker} -->`,
    '<!-- translation-kind:tag-definition -->',
    '',
    '## Summary',
    `- Source path: ${sourcePath}`,
    `- Source locale: ${DEFAULT_SOURCE_LOCALE}`,
    `- Source commit: ${headSha}`,
    '',
    '## Changed Tag',
    `- ${change.id}: ${change.changeType} (${change.fields.join(', ')})`,
    '',
    '## Target Locales',
    ...locales.map((locale) => `- ${locale}`),
    '',
    '## Instructions',
    `- Update only the \`i18n.name\` translations in \`${sourcePath}\` for the affected tag.`,
    '- Do not change the Japanese source fields unless the issue explicitly requires it.',
    '- Keep localized tag names aligned with the updated Japanese source tag name.',
    '- Run `npm run build` after the translation changes.',
    '',
    '## References',
    `- Repository: ${repository}`,
    `- Source file: ${sourcePath}`,
    `- Suggested issue template: .github/ISSUE_TEMPLATE/translation-request.yml`,
  ].join('\n')

  return {
    title: `[translation] Update tag definition ${change.id}`,
    body,
    marker,
    issueKind: 'tag-definition',
  }
}

async function createOrUpdateIssue(payload) {
  const { owner, repo, repository } = getRepositoryInfo()
  const existingIssue = await findOpenIssueByMarker(repository, payload.marker)

  if (existingIssue) {
    const issue = await requestGitHub(`/repos/${owner}/${repo}/issues/${existingIssue.number}`, {
      method: 'PATCH',
      body: { title: payload.title, body: payload.body },
    })
    console.log(`Updated translation issue #${issue.number}: ${issue.title}`)
    await assignIssueToCopilot({
      owner,
      repo,
      repository,
      issueNumber: issue.number,
      issueKind: payload.issueKind,
    })
    return issue
  }

  const issue = await requestGitHub(`/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    body: { title: payload.title, body: payload.body },
  })
  console.log(`Created translation issue #${issue.number}: ${issue.title}`)
  await assignIssueToCopilot({
    owner,
    repo,
    repository,
    issueNumber: issue.number,
    issueKind: payload.issueKind,
  })
  return issue
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

  const payloads = [
    ...blogChanges.map((entry) =>
      buildBlogIssuePayload({
        sourcePath: entry.path,
        changeType: entry.status,
        locales,
        headSha,
        repository,
      }),
    ),
    ...authorChanges.map((change) =>
      buildAuthorIssuePayload({
        sourcePath: change.sourcePath,
        change,
        locales,
        headSha,
        repository,
      }),
    ),
    ...tagChanges.map((change) =>
      buildTagIssuePayload({
        sourcePath: change.sourcePath,
        change,
        locales,
        headSha,
        repository,
      }),
    ),
  ]

  if (payloads.length === 0) {
    console.log('No Japanese source changes requiring translation issues were detected.')
    return
  }

  if (args.dryRun) {
    console.log(JSON.stringify(payloads, null, 2))
    return
  }

  for (const payload of payloads) {
    await createOrUpdateIssue(payload)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
