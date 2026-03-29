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
const ZERO_SHA = '0000000000000000000000000000000000000000'

function parseArgs(argv) {
  const options = {
    dryRun: false,
    changedFiles: null,
    baseSha: null,
    headSha: null,
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
    }
  }

  return options
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

function getChangedEntries({ baseSha, headSha, changedFiles }) {
  if (changedFiles) {
    return changedFiles.map((path) => ({ status: 'M', path, previousPath: null }))
  }

  const diffArgs = baseSha
    ? [
        'diff',
        '--name-status',
        '--find-renames',
        baseSha,
        headSha,
        '--',
        'src/content/blog',
        'src/data/authors.json',
      ]
    : [
        'diff-tree',
        '--no-commit-id',
        '--name-status',
        '--find-renames',
        '-r',
        headSha,
        '--',
        'src/content/blog',
        'src/data/authors.json',
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

function getChangedAuthors(baseSha, headSha) {
  const filePath = 'src/data/authors.json'
  const beforeAuthors = readJsonAtRef(baseSha, filePath) ?? []
  const afterAuthors = readJsonAtRef(headSha === 'HEAD' ? 'WORKTREE' : headSha, filePath) ?? []
  const beforeMap = new Map(beforeAuthors.map((author) => [author.id, author]))
  const afterMap = new Map(afterAuthors.map((author) => [author.id, author]))
  const ids = new Set([...beforeMap.keys(), ...afterMap.keys()])
  const changes = []

  for (const id of ids) {
    const before = beforeMap.get(id)
    const after = afterMap.get(id)

    if (!before && after) {
      changes.push({ id, changeType: 'added', fields: [...AUTHOR_BASE_KEYS] })
      continue
    }

    if (before && !after) {
      changes.push({ id, changeType: 'removed', fields: [...AUTHOR_BASE_KEYS] })
      continue
    }

    const beforeBase = normalizeAuthor(before)
    const afterBase = normalizeAuthor(after)
    const changedFields = AUTHOR_BASE_KEYS.filter(
      (key) => JSON.stringify(beforeBase[key]) !== JSON.stringify(afterBase[key]),
    )

    if (changedFields.length > 0) {
      changes.push({ id, changeType: 'updated', fields: changedFields })
    }
  }

  return changes
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
      'Modify only src/data/authors.json i18n entries for the affected authors unless explicitly required otherwise.',
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

function buildAuthorIssuePayload({ changes, locales, headSha, repository }) {
  const sourcePath = 'src/data/authors.json'
  const marker = 'translation-source:src/data/authors.json#authors-base'
  const changeLines = changes.map(
    (change) => `- ${change.id}: ${change.changeType} (${change.fields.join(', ')})`,
  )
  const body = [
    `<!-- ${marker} -->`,
    '<!-- translation-kind:author-profile -->',
    '',
    '## Summary',
    `- Source path: ${sourcePath}`,
    `- Source locale: ${DEFAULT_SOURCE_LOCALE}`,
    `- Source commit: ${headSha}`,
    '',
    '## Changed Authors',
    ...changeLines,
    '',
    '## Target Locales',
    ...locales.map((locale) => `- ${locale}`),
    '',
    '## Instructions',
    '- Update only the `i18n` translations in `src/data/authors.json` for the affected authors.',
    '- Do not change the Japanese source fields unless the issue explicitly requires it.',
    '- Keep `bio` and `skills` aligned with the updated Japanese source.',
    '- Run `npm run build` after the translation changes.',
    '',
    '## References',
    `- Repository: ${repository}`,
    `- Source file: ${sourcePath}`,
    `- Suggested issue template: .github/ISSUE_TEMPLATE/translation-request.yml`,
  ].join('\n')

  return {
    title: '[translation] Update author profile translations',
    body,
    marker,
    issueKind: 'author-profile',
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
  const { repository } = getRepositoryInfo()
  const locales = loadTargetLocales()
  const changedEntries = getChangedEntries({
    baseSha,
    headSha,
    changedFiles: args.changedFiles,
  })

  const blogChanges = changedEntries.filter((entry) => isJapaneseBlogPostPath(entry.path))
  const authorsEntry = changedEntries.find((entry) => entry.path === 'src/data/authors.json')
  const authorChanges = authorsEntry ? getChangedAuthors(baseSha, headSha) : []

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
  ]

  if (authorChanges.length > 0) {
    payloads.push(
      buildAuthorIssuePayload({
        changes: authorChanges,
        locales,
        headSha,
        repository,
      }),
    )
  }

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
