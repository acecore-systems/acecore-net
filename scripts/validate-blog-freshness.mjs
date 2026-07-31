import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseFrontmatter } from '@astrojs/markdown-remark'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const SHA_PATTERN = /^[0-9a-f]{40,64}$/i
const ARTICLE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/

function stableValue(value) {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .filter((key) => value[key] !== undefined)
        .map((key) => [key, stableValue(value[key])]),
    )
  }
  return value
}

function normalizeMarkdownBody(content) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  let fence = null
  const normalized = []

  for (const line of lines) {
    const fenceMatch = line.match(/^ {0,3}(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[1]
      if (!fence) {
        fence = { character: marker[0], length: marker.length }
      } else if (
        marker[0] === fence.character &&
        marker.length >= fence.length
      ) {
        fence = null
      }
    }

    if (!fence && /^\s*$/.test(line)) {
      if (normalized.at(-1) !== '') normalized.push('')
      continue
    }

    const trailingSpaces = line.match(/ +$/)?.[0].length ?? 0
    normalized.push(trailingSpaces === 1 ? line.slice(0, -1) : line)
  }

  while (normalized[0] === '') normalized.shift()
  while (normalized.at(-1) === '') normalized.pop()
  return normalized.join('\n')
}

function parseContentDate(value) {
  if (value === undefined || value === null || value === '') return null

  const raw = value instanceof Date ? value.toISOString() : String(value).trim()
  const normalized = LOCAL_DATETIME_PATTERN.test(raw) ? `${raw}+09:00` : raw
  const timestamp = Date.parse(normalized)

  return {
    raw,
    timestamp,
    valid: !Number.isNaN(timestamp),
    calendarDate: raw.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null,
  }
}

function extractRawFrontmatterScalar(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'))
  if (!match) return null

  const raw = match[1].trim().replace(/\s+#.*$/, '')
  const quote = raw[0]
  if ((quote === "'" || quote === '"') && raw.at(-1) === quote) {
    return raw.slice(1, -1)
  }
  return raw
}

function parseDocument(content) {
  const parsed = parseFrontmatter(content.replace(/^\uFEFF/, ''))
  const {
    articleId: _articleId,
    lastUpdated: _lastUpdated,
    ...meaningfulFrontmatter
  } = parsed.frontmatter

  return {
    body: normalizeMarkdownBody(parsed.content),
    frontmatter: stableValue(meaningfulFrontmatter),
    articleId:
      typeof parsed.frontmatter.articleId === 'string'
        ? parsed.frontmatter.articleId.trim()
        : null,
    lastUpdated: parseContentDate(
      extractRawFrontmatterScalar(parsed.rawFrontmatter, 'lastUpdated'),
    ),
  }
}

function getMeaningfulSignature(document) {
  return JSON.stringify({
    frontmatter: document.frontmatter,
    body: document.body,
  })
}

function getSlug(filePath) {
  return path.posix.basename(filePath, '.md')
}

export function isFullCommitSha(value) {
  return SHA_PATTERN.test(value ?? '')
}

export function validateBlogFreshnessChanges(changes) {
  const errors = []
  const updatedByArticleId = new Map()
  let meaningfulChangeCount = 0

  for (const change of changes) {
    if (
      change.status === 'A' ||
      change.status === 'D' ||
      change.baseContent === null ||
      change.headContent === null
    ) {
      continue
    }

    let baseDocument
    let headDocument
    try {
      baseDocument = parseDocument(change.baseContent)
      headDocument = parseDocument(change.headContent)
    } catch (error) {
      errors.push(
        `${change.headPath}: frontmatter could not be parsed (${error instanceof Error ? error.message : String(error)})`,
      )
      continue
    }

    if (
      baseDocument.articleId &&
      headDocument.articleId !== baseDocument.articleId
    ) {
      errors.push(
        `${change.headPath}: articleId is immutable (${baseDocument.articleId} -> ${headDocument.articleId ?? 'missing'})`,
      )
      continue
    }
    if (
      headDocument.articleId &&
      !ARTICLE_ID_PATTERN.test(headDocument.articleId)
    ) {
      errors.push(
        `${change.headPath}: articleId is invalid (${headDocument.articleId})`,
      )
      continue
    }

    const pathChanged =
      change.basePath !== null &&
      change.headPath !== null &&
      change.basePath !== change.headPath

    if (
      !pathChanged &&
      getMeaningfulSignature(baseDocument) ===
        getMeaningfulSignature(headDocument)
    ) {
      continue
    }

    meaningfulChangeCount += 1
    const baseUpdated = baseDocument.lastUpdated
    const headUpdated = headDocument.lastUpdated

    if (!headUpdated) {
      errors.push(
        `${change.headPath}: meaningful article content changed without lastUpdated`,
      )
      continue
    }
    if (!headUpdated.valid || !headUpdated.calendarDate) {
      errors.push(
        `${change.headPath}: lastUpdated is invalid (${headUpdated.raw})`,
      )
      continue
    }
    if (baseUpdated?.valid && headUpdated.timestamp <= baseUpdated.timestamp) {
      errors.push(
        `${change.headPath}: lastUpdated (${headUpdated.raw}) must be later than the previous value (${baseUpdated.raw})`,
      )
      continue
    }

    const articleIdentity =
      headDocument.articleId?.toLowerCase() ?? getSlug(change.headPath)
    const entries = updatedByArticleId.get(articleIdentity) ?? []
    entries.push({
      calendarDate: headUpdated.calendarDate,
      path: change.headPath,
    })
    updatedByArticleId.set(articleIdentity, entries)
  }

  for (const [articleIdentity, entries] of updatedByArticleId) {
    if (entries.length < 2) continue

    const dates = new Set(entries.map(({ calendarDate }) => calendarDate))
    if (dates.size > 1) {
      errors.push(
        `${articleIdentity}: changed locale variants must use the same lastUpdated calendar date for the same articleId (${entries
          .map(
            ({ calendarDate, path: filePath }) => `${filePath}=${calendarDate}`,
          )
          .join(', ')})`,
      )
    }
  }

  return { errors, meaningfulChangeCount }
}

function runGit(args, options = {}) {
  try {
    return execFileSync('git', args, {
      cwd: options.cwd ?? root,
      encoding: options.encoding ?? 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    const detail = error?.stderr?.toString().trim()
    throw new Error(`git ${args[0]} failed${detail ? `: ${detail}` : ''}`, {
      cause: error,
    })
  }
}

function assertCommitSha(value, label, repositoryRoot = root) {
  if (!isFullCommitSha(value)) {
    throw new Error(`${label} must be a full hexadecimal commit SHA`)
  }
  runGit(['cat-file', '-e', `${value}^{commit}`], { cwd: repositoryRoot })
  return value.toLowerCase()
}

export function parseNameStatus(output) {
  const tokens = output.toString('utf8').split('\0')
  if (tokens.at(-1) === '') tokens.pop()

  const changes = []
  for (let index = 0; index < tokens.length;) {
    const status = tokens[index++]
    if (!status) throw new Error('git diff returned an empty status')

    if (status.startsWith('R')) {
      const basePath = tokens[index++]
      const headPath = tokens[index++]
      if (!basePath || !headPath) {
        throw new Error('git diff returned an incomplete rename')
      }
      changes.push({ status: 'R', basePath, headPath })
      continue
    }

    const filePath = tokens[index++]
    if (!filePath) throw new Error('git diff returned an incomplete path')
    const statusCode = status[0]
    changes.push({
      status: statusCode,
      basePath: statusCode === 'A' ? null : filePath,
      headPath: statusCode === 'D' ? null : filePath,
    })
  }

  return changes
}

function readGitFile(commit, filePath, repositoryRoot = root) {
  if (!filePath) return null
  return runGit(['show', `${commit}:${filePath}`], { cwd: repositoryRoot })
}

function getFallbackRenameIdentity(filePath, content) {
  if (!filePath || !content) return null

  try {
    const { articleId } = parseDocument(content)
    const relativePath = path.posix.relative('src/content/blog', filePath)
    const directory = path.posix.dirname(relativePath)

    if (!articleId) return null

    return {
      locale: directory === '.' ? 'ja' : directory,
      shared: articleId.toLowerCase(),
    }
  } catch {
    return null
  }
}

function groupChangesByFallbackIdentity(changes, includeLocale) {
  const groups = new Map()

  for (const change of changes) {
    const filePath = change.status === 'D' ? change.basePath : change.headPath
    const content =
      change.status === 'D' ? change.baseContent : change.headContent
    const identity = getFallbackRenameIdentity(filePath, content)
    if (!identity) continue
    const key = includeLocale
      ? JSON.stringify([identity.locale, identity.shared])
      : identity.shared

    const entries = groups.get(key) ?? []
    entries.push(change)
    groups.set(key, entries)
  }

  return groups
}

export function getGitChanges(baseSha, headSha, repositoryRoot = root) {
  const gitOptions = { cwd: repositoryRoot }
  const mergeBase = runGit(['merge-base', baseSha, headSha], gitOptions).trim()
  assertCommitSha(mergeBase, 'merge base', repositoryRoot)

  const output = runGit(
    [
      'diff',
      '--name-status',
      '--find-renames=50%',
      '--diff-filter=AMRD',
      '-z',
      mergeBase,
      headSha,
      '--',
      'src/content/blog',
    ],
    { ...gitOptions, encoding: 'buffer' },
  )

  const rawChanges = parseNameStatus(output).map((change) => ({
    ...change,
    baseContent:
      change.status === 'A'
        ? null
        : readGitFile(mergeBase, change.basePath, repositoryRoot),
    headContent:
      change.status === 'D'
        ? null
        : readGitFile(headSha, change.headPath, repositoryRoot),
  }))
  const deletions = rawChanges.filter(({ status }) => status === 'D')
  const additions = rawChanges.filter(({ status }) => status === 'A')
  const fallbackRenameByHeadPath = new Map()

  const deletionsByIdentity = groupChangesByFallbackIdentity(deletions, true)
  const additionsByIdentity = groupChangesByFallbackIdentity(additions, true)

  for (const [identity, matchingAdditions] of additionsByIdentity) {
    const matchingDeletions = deletionsByIdentity.get(identity)
    if (matchingAdditions.length !== 1 || matchingDeletions?.length !== 1) {
      continue
    }
    fallbackRenameByHeadPath.set(
      matchingAdditions[0].headPath,
      matchingDeletions[0],
    )
  }

  const changes = rawChanges.flatMap((change) => {
    if (change.status === 'D') return []
    if (change.status !== 'A') return [change]

    const deletion = fallbackRenameByHeadPath.get(change.headPath)
    if (!deletion) return [change]

    return [
      {
        status: 'R',
        basePath: deletion.basePath,
        headPath: change.headPath,
        baseContent: deletion.baseContent,
        headContent: change.headContent,
      },
    ]
  })

  return {
    changes,
    mergeBase,
  }
}

function parseArgs(argv) {
  const values = {
    base: process.env.BLOG_FRESHNESS_BASE_SHA ?? '',
    head: process.env.BLOG_FRESHNESS_HEAD_SHA ?? '',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--help') return { help: true }
    if (arg === '--base' || arg === '--head') {
      const value = argv[++index]
      if (!value) throw new Error(`${arg} requires a value`)
      values[arg.slice(2)] = value
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  return values
}

const help = `Usage:
  npm run validate:blog-freshness -- --base <full-sha> --head <full-sha>

The BLOG_FRESHNESS_BASE_SHA and BLOG_FRESHNESS_HEAD_SHA environment variables
may be used instead. Existing articles must advance lastUpdated when their
rendered content changes, and an existing articleId is immutable. New articles
may use date without lastUpdated.`

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv)
  if (args.help) {
    console.log(help)
    return
  }

  const baseSha = assertCommitSha(args.base, 'base')
  const headSha = assertCommitSha(args.head, 'head')
  const { changes, mergeBase } = getGitChanges(baseSha, headSha)
  const result = validateBlogFreshnessChanges(changes)

  if (result.errors.length > 0) {
    console.error('Blog freshness validation failed:')
    for (const error of result.errors) console.error(`- ${error}`)
    process.exitCode = 1
    return
  }

  console.log(
    `Blog freshness validation passed: ${result.meaningfulChangeCount} meaningful existing article change(s) checked from ${mergeBase} to ${headSha}.`,
  )
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))

if (isDirectRun) main()
