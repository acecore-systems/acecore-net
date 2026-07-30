import { load as loadYaml } from 'js-yaml'

import {
  isValidContentDateValue,
  normalizeContentDateValue,
} from '../../../src/utils/content-date.ts'
import { GitHubApiError } from './_github-api.ts'

type CmsBlogAddition = {
  path: string
  contents: string
}

type CmsBlogStateEntry = {
  path: string
  contents?: string
}

type CmsBlogDeletion = {
  path: string
}

type ContentDate = {
  raw: string
  timestamp: number
  valid: boolean
  calendarDate: string | null
}

type ParsedBlogDocument = {
  body: string
  frontmatter: unknown
  date: ContentDate | null
  lastUpdated: ContentDate | null
  renameIdentity: {
    locale: string
    shared: string
  } | null
}

const BLOG_PREFIX = 'src/content/blog/'
const BLOG_FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/

export function validateCmsBlogFreshness({
  additions,
  currentState,
  deletions = [],
}: {
  additions: readonly CmsBlogAddition[]
  currentState: readonly CmsBlogStateEntry[]
  deletions?: readonly CmsBlogDeletion[]
}) {
  const currentArticles = new Map(
    currentState.flatMap((entry): Array<[string, string]> => {
      return isBlogPath(entry.path) && typeof entry.contents === 'string'
        ? [[entry.path, entry.contents]]
        : []
    }),
  )
  const updatedBySlug = new Map<
    string,
    Array<{ calendarDate: string; path: string }>
  >()
  const headDocuments = new Map<string, ParsedBlogDocument>()

  for (const addition of additions) {
    if (!isBlogPath(addition.path)) continue

    const headDocument = parseDocument(
      addition.path,
      decodeBase64Text(addition.path, addition.contents),
    )
    const headUpdated = headDocument.lastUpdated

    if (headUpdated) {
      if (!headUpdated.valid || !headUpdated.calendarDate) {
        throw new GitHubApiError(
          `記事のlastUpdatedが不正です: ${addition.path} (${headUpdated.raw})`,
          422,
        )
      }

      const published = headDocument.date

      if (
        !published ||
        !published.valid ||
        headUpdated.timestamp < published.timestamp
      ) {
        throw new GitHubApiError(
          `記事のlastUpdatedは公開日date以降にしてください: ${addition.path} (${published?.raw ?? '未設定'} -> ${headUpdated.raw})`,
          422,
        )
      }
    }

    headDocuments.set(addition.path, headDocument)
  }

  const newBlogAdditions = additions.filter(
    ({ path }) => isBlogPath(path) && !currentArticles.has(path),
  )
  const blogDeletions = deletions.filter(({ path }) => isBlogPath(path))
  const renameBaseByHeadPath = matchFallbackRenames({
    additions: newBlogAdditions,
    currentArticles,
    deletions: blogDeletions,
    headDocuments,
  })
  const matchedBasePaths = new Set(renameBaseByHeadPath.values())
  const hasUnmatchedAddition = newBlogAdditions.some(
    ({ path }) => !renameBaseByHeadPath.has(path),
  )
  const hasUnmatchedDeletion = blogDeletions.some(
    ({ path }) => !matchedBasePaths.has(path),
  )

  if (hasUnmatchedAddition && hasUnmatchedDeletion) {
    throw new GitHubApiError(
      '記事の削除と新規作成の対応関係を判定できないため保存できません。slug変更は識別情報を維持して同一操作で保存してください。',
      422,
    )
  }

  for (const addition of additions) {
    if (!isBlogPath(addition.path)) continue

    const basePath = renameBaseByHeadPath.get(addition.path) ?? addition.path
    const baseContent = currentArticles.get(basePath)

    // A path that does not exist on the current main branch is a new article.
    // New articles may continue to use date without lastUpdated.
    if (baseContent === undefined) continue

    const baseDocument = parseDocument(basePath, baseContent)
    const headDocument = headDocuments.get(addition.path)

    if (!headDocument) {
      throw new GitHubApiError(
        `CMS保存内容を読み込めません: ${addition.path}`,
        422,
      )
    }

    const headUpdated = headDocument.lastUpdated
    const baseUpdated = baseDocument.lastUpdated

    if (baseUpdated && !baseUpdated.valid) {
      throw new GitHubApiError(
        `GitHub上の既存記事のlastUpdatedが不正です: ${addition.path} (${baseUpdated.raw})`,
        502,
      )
    }

    if (baseUpdated && !headUpdated) {
      throw new GitHubApiError(
        `既存記事のlastUpdatedを削除できません: ${addition.path} (${baseUpdated.raw})`,
        422,
      )
    }

    if (
      baseUpdated &&
      headUpdated &&
      headUpdated.timestamp < baseUpdated.timestamp
    ) {
      throw new GitHubApiError(
        `既存記事のlastUpdatedを以前より前の日時にできません: ${addition.path} (${baseUpdated.raw} -> ${headUpdated.raw})`,
        422,
      )
    }

    if (
      basePath === addition.path &&
      getMeaningfulSignature(baseDocument) ===
        getMeaningfulSignature(headDocument)
    ) {
      continue
    }

    if (!headUpdated) {
      throw new GitHubApiError(
        `既存記事の内容を変更する場合はlastUpdatedを設定してください: ${addition.path}`,
        422,
      )
    }

    if (!headUpdated.valid || !headUpdated.calendarDate) {
      throw new GitHubApiError(
        `既存記事のlastUpdatedが不正です: ${addition.path} (${headUpdated.raw})`,
        422,
      )
    }

    if (baseUpdated && headUpdated.timestamp <= baseUpdated.timestamp) {
      throw new GitHubApiError(
        `既存記事のlastUpdatedは以前より後の日時にしてください: ${addition.path} (${baseUpdated.raw} -> ${headUpdated.raw})`,
        422,
      )
    }

    const slug = getSlug(addition.path)
    const entries = updatedBySlug.get(slug) ?? []
    entries.push({
      calendarDate: headUpdated.calendarDate,
      path: addition.path,
    })
    updatedBySlug.set(slug, entries)
  }

  for (const [slug, entries] of updatedBySlug) {
    if (entries.length < 2) continue

    const dates = new Set(entries.map(({ calendarDate }) => calendarDate))

    if (dates.size > 1) {
      throw new GitHubApiError(
        `${slug}: 同時に変更する多言語記事のlastUpdated日を揃えてください (${entries
          .map(({ calendarDate, path }) => `${path}=${calendarDate}`)
          .join(', ')})`,
        422,
      )
    }
  }
}

function parseDocument(path: string, source: string): ParsedBlogDocument {
  const match = source.match(BLOG_FRONTMATTER_PATTERN)

  if (!match) {
    throw new GitHubApiError(`記事frontmatterが不正です: ${path}`, 422)
  }

  let frontmatter: unknown

  try {
    // Astro's Markdown parser uses the default safe schema, including its
    // timestamp normalization. Match that behavior for meaningful diffs.
    frontmatter = loadYaml(match[1])
  } catch {
    throw new GitHubApiError(`記事frontmatterが不正です: ${path}`, 422)
  }

  if (!isRecord(frontmatter)) {
    throw new GitHubApiError(`記事frontmatterが不正です: ${path}`, 422)
  }

  const { lastUpdated: _lastUpdated, ...meaningfulFrontmatter } = frontmatter

  return {
    body: normalizeMarkdownBody(source.slice(match[0].length)),
    frontmatter: stableValue(meaningfulFrontmatter),
    date: parseContentDate(extractRawFrontmatterScalar(match[1], 'date')),
    lastUpdated: parseContentDate(
      extractRawFrontmatterScalar(match[1], 'lastUpdated'),
    ),
    renameIdentity: getFallbackRenameIdentity(path, frontmatter),
  }
}

function matchFallbackRenames({
  additions,
  currentArticles,
  deletions,
  headDocuments,
}: {
  additions: readonly CmsBlogAddition[]
  currentArticles: ReadonlyMap<string, string>
  deletions: readonly CmsBlogDeletion[]
  headDocuments: ReadonlyMap<string, ParsedBlogDocument>
}) {
  const additionCandidates = additions.flatMap((addition) => {
    const identity = headDocuments.get(addition.path)?.renameIdentity

    return identity ? [{ identity, path: addition.path }] : []
  })
  const deletionCandidates = deletions.flatMap((deletion) => {
    const contents = currentArticles.get(deletion.path)

    if (contents === undefined) return []

    const identity = parseDocument(deletion.path, contents).renameIdentity

    return identity ? [{ identity, path: deletion.path }] : []
  })
  const renameBaseByHeadPath = new Map<string, string>()
  const matchedBasePaths = new Set<string>()

  for (const includeLocale of [false, true]) {
    const availableAdditions = additionCandidates.filter(
      ({ path }) => !renameBaseByHeadPath.has(path),
    )
    const availableDeletions = deletionCandidates.filter(
      ({ path }) => !matchedBasePaths.has(path),
    )
    const additionsByIdentity = groupRenameCandidates(
      availableAdditions,
      includeLocale,
    )
    const deletionsByIdentity = groupRenameCandidates(
      availableDeletions,
      includeLocale,
    )

    for (const [identity, matchingAdditions] of additionsByIdentity) {
      const matchingDeletions = deletionsByIdentity.get(identity)

      if (matchingAdditions.length !== 1 || matchingDeletions?.length !== 1) {
        continue
      }

      renameBaseByHeadPath.set(
        matchingAdditions[0].path,
        matchingDeletions[0].path,
      )
      matchedBasePaths.add(matchingDeletions[0].path)
    }
  }

  return renameBaseByHeadPath
}

function groupRenameCandidates(
  candidates: readonly {
    identity: NonNullable<ParsedBlogDocument['renameIdentity']>
    path: string
  }[],
  includeLocale: boolean,
) {
  const groups = new Map<string, Array<{ path: string }>>()

  for (const candidate of candidates) {
    const key = includeLocale
      ? JSON.stringify([candidate.identity.locale, candidate.identity.shared])
      : candidate.identity.shared
    const entries = groups.get(key) ?? []

    entries.push({ path: candidate.path })
    groups.set(key, entries)
  }

  return groups
}

function getFallbackRenameIdentity(
  path: string,
  frontmatter: Record<string, unknown>,
) {
  const relativePath = path.slice(BLOG_PREFIX.length)
  const directory = relativePath.includes('/')
    ? relativePath.slice(0, relativePath.lastIndexOf('/'))
    : ''
  const date = stableValue(frontmatter.date)
  const author = frontmatter.author
  const image = frontmatter.image ?? null
  const uploadedImage = frontmatter.uploadedImage ?? null
  const hasStableImage =
    typeof image === 'string' || typeof uploadedImage === 'string'
  const title = frontmatter.title
  const description = frontmatter.description

  if (
    typeof date !== 'string' ||
    typeof author !== 'string' ||
    (!hasStableImage &&
      (typeof title !== 'string' || typeof description !== 'string'))
  ) {
    return null
  }

  return {
    locale: directory || 'ja',
    shared: JSON.stringify({
      date,
      author,
      image: typeof image === 'string' ? image : null,
      uploadedImage: typeof uploadedImage === 'string' ? uploadedImage : null,
      ...(hasStableImage ? {} : { title, description }),
    }),
  }
}

function getMeaningfulSignature(document: {
  body: string
  frontmatter: unknown
}) {
  return JSON.stringify({
    frontmatter: document.frontmatter,
    body: document.body,
  })
}

function stableValue(
  value: unknown,
  depth = 0,
  seen = new WeakSet<object>(),
): unknown {
  if (depth > 64) throw new Error('Frontmatter nesting is too deep')
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) {
    return value.map((item) => stableValue(item, depth + 1, seen))
  }
  if (!isRecord(value)) return value
  if (seen.has(value)) throw new Error('Cyclic frontmatter is not supported')

  seen.add(value)
  const result = Object.fromEntries(
    Object.keys(value)
      .sort()
      .filter((key) => value[key] !== undefined)
      .map((key) => [key, stableValue(value[key], depth + 1, seen)]),
  )
  seen.delete(value)
  return result
}

function normalizeMarkdownBody(content: string) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  let fence: { character: string; length: number } | null = null
  const normalized: string[] = []

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

function parseContentDate(rawValue: string | null): ContentDate | null {
  if (!rawValue) return null

  const normalized = normalizeContentDateValue(rawValue)
  const timestamp = Date.parse(normalized)

  return {
    raw: rawValue,
    timestamp,
    valid: isValidContentDateValue(rawValue) && !Number.isNaN(timestamp),
    calendarDate: rawValue.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? null,
  }
}

function extractRawFrontmatterScalar(frontmatter: string, key: string) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'))

  if (!match) return null

  const raw = match[1].trim().replace(/\s+#.*$/, '')
  const quote = raw[0]

  return (quote === "'" || quote === '"') && raw.at(-1) === quote
    ? raw.slice(1, -1)
    : raw
}

function decodeBase64Text(path: string, value: string) {
  try {
    const binary = atob(value)
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    )

    return new TextDecoder('utf-8', {
      fatal: true,
      ignoreBOM: false,
    }).decode(bytes)
  } catch {
    throw new GitHubApiError(`CMS保存内容を読み込めません: ${path}`, 422)
  }
}

function isBlogPath(path: string) {
  return (
    path.startsWith(BLOG_PREFIX) &&
    path.length > BLOG_PREFIX.length &&
    path.endsWith('.md')
  )
}

function getSlug(path: string) {
  const fileName = path.split('/').pop() || ''
  return fileName.endsWith('.md') ? fileName.slice(0, -3) : fileName
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
