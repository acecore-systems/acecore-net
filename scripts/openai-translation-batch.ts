import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const API_BASE_URL = 'https://api.cloudflare.com/client/v4'
const BATCH_MODEL = '@cf/zai-org/glm-5.3-flash'
const BATCH_REASONING_EFFORT = 'high'
const MAX_BATCH_PAYLOAD_BYTES = 10 * 1024 * 1024
const CUSTOM_ID_PREFIX = 'acecore-net:'
const SOURCE_MARKER_PREFIX = '<!-- openai-translation-source:'
const SOURCE_MARKER_SUFFIX = ' -->'
const BATCH_MARKER_PREFIX = '<!-- openai-translation-batch:'
const BATCH_MARKER_SUFFIX = ' -->'
const ZERO_SHA = '0000000000000000000000000000000000000000'
const DEFAULT_LOCALE = 'ja'
const SITE_SOURCE_DIR = 'src/i18n/source/ja'

type JsonPrimitive = boolean | number | string | null
interface JsonRecord {
  [key: string]: JsonValue
}
type JsonValue = JsonPrimitive | JsonValue[] | JsonRecord
type ChangeStatus = 'A' | 'C' | 'D' | 'M' | 'R' | string
type TranslationKind = 'blog' | 'blog-delete' | 'site' | 'site-delete'

interface ChangedEntry {
  status: ChangeStatus
  path: string
  previousPath: string | null
}

interface RequestMetadata {
  version: 1
  kind: TranslationKind
  locale?: string
  sourcePath: string
  previousPath?: string | null
  sourceHash: string
}

interface BatchInputLine {
  external_reference: string
  messages: Array<{ role: 'system' | 'user'; content: string }>
  reasoning_effort: typeof BATCH_REASONING_EFFORT
  max_completion_tokens: number
  response_format: JsonRecord
  store: false
}

interface BatchOutputLine {
  external_reference: string
  result?: JsonRecord
  success: boolean
}

interface CloudflareBatchResult {
  model?: string
  request_id?: string
  responses?: BatchOutputLine[]
  status?: string
}

interface CloudflareBatchEnvelope {
  errors?: Array<{ code?: number; message?: string }>
  result?: CloudflareBatchResult
  success: boolean
}

interface TranslationEntry {
  id: string
  source: string
  current: string | null
}

interface SiteFragment {
  source: JsonValue
  targetMode: 'merge-root' | 'replace-path'
  targetPath: string[]
}

interface BlogDocument {
  frontmatter: string
  body: string
}

interface CollectedResult {
  processedBatchId: string | null
  hasChanges: boolean
  bodyPath: string | null
  batchId: string | null
}

interface ParsedArgs {
  command: 'submit' | 'collect' | 'verify-pr'
  baseSha: string | null
  headSha: string | null
  currentRef: string | null
  processedBatchIds: Set<string>
  pendingBatchIds: string[]
  prNumber: number | null
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeText(value: string): string {
  return value.replace(/\r\n/g, '\n')
}

export function hashSource(value: string): string {
  return createHash('sha256').update(normalizeText(value)).digest('hex')
}

function hashJson(value: JsonValue): string {
  return hashSource(JSON.stringify(value))
}

function runGit(args: readonly string[]): string {
  return execFileSync('git', args, { encoding: 'utf8' }).trim()
}

function tryRunGit(args: readonly string[]): string | null {
  try {
    return runGit(args)
  } catch {
    return null
  }
}

function readFileAtRef(ref: string, filePath: string): string | null {
  try {
    return execFileSync('git', ['show', `${ref}:${filePath}`], {
      encoding: 'utf8',
    })
  } catch {
    return null
  }
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const command = argv[0]
  if (
    command !== 'submit' &&
    command !== 'collect' &&
    command !== 'verify-pr'
  ) {
    throw new Error(
      'Usage: openai-translation-batch.ts <submit|collect|verify-pr>',
    )
  }

  const parsed: ParsedArgs = {
    command,
    baseSha: null,
    headSha: null,
    currentRef: null,
    processedBatchIds: new Set(),
    pendingBatchIds: [],
    prNumber: null,
  }

  for (const argument of argv.slice(1)) {
    if (argument.startsWith('--base=')) {
      parsed.baseSha = argument.slice('--base='.length) || null
      continue
    }

    if (argument.startsWith('--head=')) {
      parsed.headSha = argument.slice('--head='.length) || null
      continue
    }

    if (argument.startsWith('--current-ref=')) {
      parsed.currentRef = argument.slice('--current-ref='.length) || null
      continue
    }

    if (argument.startsWith('--processed-batches=')) {
      const values = argument
        .slice('--processed-batches='.length)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
      parsed.processedBatchIds = new Set(values)
      continue
    }

    if (argument.startsWith('--pending-batches=')) {
      parsed.pendingBatchIds = argument
        .slice('--pending-batches='.length)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
      continue
    }

    if (argument.startsWith('--pr=')) {
      const value = Number(argument.slice('--pr='.length))
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error('--pr must be a positive integer')
      }
      parsed.prNumber = value
      continue
    }

    throw new Error(`Unknown argument: ${argument}`)
  }

  return parsed
}

function normalizeSha(value: string | null | undefined): string | null {
  return value && value !== ZERO_SHA ? value : null
}

function resolveHeadSha(value: string | null): string {
  return normalizeSha(value) ?? normalizeSha(process.env.GITHUB_SHA) ?? 'HEAD'
}

function getTargetLocales(): string[] {
  const config = readFileSync('src/i18n/config.ts', 'utf8')
  const match = config.match(/locales\s*=\s*\[([^\]]+)\]\s*as const/s)
  if (!match?.[1]) throw new Error('Could not load i18n locale configuration')

  return [...match[1].matchAll(/'([^']+)'/g)]
    .map((entry) => entry[1])
    .filter((locale): locale is string =>
      Boolean(locale && locale !== DEFAULT_LOCALE),
    )
}

function parseChangedEntry(line: string): ChangedEntry | null {
  const [statusText, ...rest] = line.split('\t')
  if (!statusText || rest.length === 0) return null
  const status = statusText[0]
  if (!status) return null

  if ((status === 'R' || status === 'C') && rest[0] && rest[1]) {
    return { status, previousPath: rest[0], path: rest[1] }
  }

  if (!rest[0]) return null
  return { status, previousPath: null, path: rest[0] }
}

function isTranslationSourcePath(filePath: string): boolean {
  return (
    /^src\/content\/blog\/[^/]+\.md$/.test(filePath) ||
    (filePath.startsWith(`${SITE_SOURCE_DIR}/`) && filePath.endsWith('.json'))
  )
}

function listChangedEntries(
  baseSha: string | null,
  headSha: string,
): ChangedEntry[] {
  const args = baseSha
    ? [
        'diff',
        '--name-status',
        '--find-renames',
        baseSha,
        headSha,
        '--',
        'src/content/blog',
        SITE_SOURCE_DIR,
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
        SITE_SOURCE_DIR,
      ]
  const output = tryRunGit(args)
  if (!output) return []
  return output
    .split(/\r?\n/)
    .map(parseChangedEntry)
    .filter((entry): entry is ChangedEntry => entry !== null)
    .filter((entry) => isTranslationSourcePath(entry.path))
}

function isBlogPath(filePath: string): boolean {
  return /^src\/content\/blog\/[^/]+\.md$/.test(filePath)
}

function isCampaignPath(filePath: string): boolean {
  return filePath.startsWith(`${SITE_SOURCE_DIR}/campaigns/`)
}

function readJsonFile(filePath: string): JsonValue {
  return JSON.parse(readFileSync(filePath, 'utf8')) as JsonValue
}

function getByPath(
  value: JsonValue,
  segments: readonly string[],
): JsonValue | null {
  let current: JsonValue = value
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment)
      if (!Number.isInteger(index) || index < 0 || index >= current.length)
        return null
      current = current[index] as JsonValue
      continue
    }
    if (!isJsonRecord(current) || !(segment in current)) return null
    current = current[segment] as JsonValue
  }
  return current
}

function setByPath(
  root: JsonRecord,
  segments: readonly string[],
  value: JsonValue,
): void {
  if (segments.length === 0) {
    throw new Error('setByPath requires a non-empty target path')
  }

  let current: JsonRecord = root
  for (const [index, segment] of segments.entries()) {
    const isLeaf = index === segments.length - 1
    if (isLeaf) {
      current[segment] = value
      return
    }
    const next = current[segment]
    if (!isJsonRecord(next)) current[segment] = {}
    current = current[segment] as JsonRecord
  }
}

function deleteByPath(root: JsonRecord, segments: readonly string[]): void {
  if (segments.length === 0) return
  let current: JsonRecord = root
  for (const [index, segment] of segments.entries()) {
    const isLeaf = index === segments.length - 1
    if (isLeaf) {
      delete current[segment]
      return
    }
    const next = current[segment]
    if (!isJsonRecord(next)) return
    current = next
  }
}

function getCampaignFragment(): JsonRecord {
  const campaignDirectory = `${SITE_SOURCE_DIR}/campaigns`
  const entries = existsSync(campaignDirectory)
    ? readdirSync(campaignDirectory)
        .filter((name) => name.endsWith('.json'))
        .sort((left, right) => left.localeCompare(right, 'ja'))
        .map((name) => readJsonFile(path.join(campaignDirectory, name)))
        .filter(isJsonRecord)
        .sort((left, right) => {
          const leftOrder = typeof left.order === 'number' ? left.order : 100
          const rightOrder = typeof right.order === 'number' ? right.order : 100
          const leftId = typeof left.id === 'string' ? left.id : ''
          const rightId = typeof right.id === 'string' ? right.id : ''
          return leftOrder - rightOrder || leftId.localeCompare(rightId, 'ja')
        })
    : []

  const announcements = entries
    .filter((entry) => entry.type === 'announcement')
    .map((entry) => ({
      enabled: entry.enabled,
      title: entry.title ?? entry.eyebrow ?? null,
      body: entry.body ?? entry.message ?? null,
      href: entry.href ?? null,
      ctaLabel: entry.ctaLabel ?? null,
      startsAt: entry.startsAt ?? null,
      endsAt: entry.endsAt ?? null,
      tone: entry.tone ?? null,
    }))
  const campaignNotices = entries
    .filter((entry) => entry.type === 'page-notice')
    .map((entry) => ({
      id: entry.id,
      page: entry.page ?? null,
      placement: entry.placement ?? null,
      enabled: entry.enabled,
      title: entry.title ?? entry.eyebrow ?? null,
      body: entry.body ?? entry.message ?? null,
      href: entry.href ?? null,
      ctaLabel: entry.ctaLabel ?? null,
      icon: entry.icon ?? null,
      tone: entry.tone ?? null,
      startsAt: entry.startsAt ?? null,
      endsAt: entry.endsAt ?? null,
    }))

  return {
    announcement: announcements[0] ?? null,
    campaignNotices,
  }
}

export function getSiteFragment(sourcePath: string): SiteFragment {
  if (sourcePath === `${SITE_SOURCE_DIR}/common.json`) {
    return {
      source: readJsonFile(sourcePath),
      targetMode: 'merge-root',
      targetPath: [],
    }
  }
  if (sourcePath === `${SITE_SOURCE_DIR}/blog.json`) {
    return {
      source: readJsonFile(sourcePath),
      targetMode: 'replace-path',
      targetPath: ['blog'],
    }
  }
  if (sourcePath === `${SITE_SOURCE_DIR}/legacy-tags.json`) {
    return {
      source: readJsonFile(sourcePath),
      targetMode: 'replace-path',
      targetPath: ['tags'],
    }
  }
  if (isCampaignPath(sourcePath)) {
    return {
      source: getCampaignFragment(),
      targetMode: 'merge-root',
      targetPath: [],
    }
  }

  const pageMatch = sourcePath.match(
    /^src\/i18n\/source\/ja\/pages\/([^/]+)\.json$/,
  )
  if (pageMatch?.[1]) {
    return {
      source: readJsonFile(sourcePath),
      targetMode: 'replace-path',
      targetPath: ['pages', pageMatch[1]],
    }
  }

  throw new Error(`Unsupported Japanese translation source: ${sourcePath}`)
}

function getCurrentSiteFragment(
  translation: JsonRecord,
  fragment: SiteFragment,
): JsonValue | null {
  if (fragment.targetMode === 'replace-path') {
    return getByPath(translation, fragment.targetPath)
  }
  if (!isJsonRecord(fragment.source)) return null

  const current: JsonRecord = {}
  for (const key of Object.keys(fragment.source)) {
    if (key in translation) current[key] = translation[key] as JsonValue
  }
  return current
}

const LOCKED_JSON_KEYS = new Set([
  'articleId',
  'author',
  'date',
  'endsAt',
  'href',
  'icon',
  'id',
  'image',
  'page',
  'placement',
  'src',
  'startsAt',
  'tone',
  'type',
  'uploadedImage',
  'url',
])

function isTranslatableJsonString(value: string, key: string): boolean {
  if (LOCKED_JSON_KEYS.has(key)) return false
  if (/^(?:https?:\/\/|\/)/.test(value)) return false
  if (/^[\w.-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(value)) return false
  return true
}

function toJsonPointer(segments: readonly string[]): string {
  return `/${segments
    .map((segment) => segment.replaceAll('~', '~0').replaceAll('/', '~1'))
    .join('/')}`
}

function listTranslationEntries(
  source: JsonValue,
  current: JsonValue | null,
  segments: string[] = [],
): TranslationEntry[] {
  if (typeof source === 'string') {
    const key = segments.at(-1) ?? ''
    if (!isTranslatableJsonString(source, key)) return []
    return [
      {
        id: toJsonPointer(segments),
        source,
        current: typeof current === 'string' ? current : null,
      },
    ]
  }
  if (source === null || typeof source !== 'object') return []

  if (Array.isArray(source)) {
    return source.flatMap((entry, index) =>
      listTranslationEntries(
        entry,
        Array.isArray(current)
          ? ((current[index] as JsonValue | undefined) ?? null)
          : null,
        [...segments, String(index)],
      ),
    )
  }

  return Object.entries(source).flatMap(([key, value]) =>
    listTranslationEntries(
      value,
      isJsonRecord(current)
        ? ((current[key] as JsonValue | undefined) ?? null)
        : null,
      [...segments, key],
    ),
  )
}

function getPlaceholderTokens(value: string): string[] {
  return [...value.matchAll(/\{[A-Za-z0-9_.-]+\}/g)].map((match) => match[0])
}

function getUrlTokens(value: string): string[] {
  return [...value.matchAll(/https?:\/\/[^\s)\]}>]+/g)].map((match) => match[0])
}

function assertProtectedTokens(
  source: string,
  translated: string,
  label: string,
): void {
  for (const token of [
    ...getPlaceholderTokens(source),
    ...getUrlTokens(source),
  ]) {
    if (!translated.includes(token)) {
      throw new Error(`${label} must preserve ${token}`)
    }
  }
}

function translateJsonValue(
  source: JsonValue,
  translations: ReadonlyMap<string, string>,
  segments: string[] = [],
): JsonValue {
  if (typeof source === 'string') {
    const key = segments.at(-1) ?? ''
    if (!isTranslatableJsonString(source, key)) return source
    const id = toJsonPointer(segments)
    const translated = translations.get(id)
    if (typeof translated !== 'string') {
      throw new Error(`Missing translation for ${id}`)
    }
    assertProtectedTokens(source, translated, `Translation ${id}`)
    return translated
  }
  if (source === null || typeof source !== 'object') return source
  if (Array.isArray(source)) {
    return source.map((entry, index) =>
      translateJsonValue(entry, translations, [...segments, String(index)]),
    )
  }

  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      key,
      translateJsonValue(value, translations, [...segments, key]),
    ]),
  ) as JsonRecord
}

function applySiteFragment(
  translation: JsonRecord,
  fragment: SiteFragment,
  translatedSource: JsonValue,
): JsonRecord {
  if (fragment.targetMode === 'replace-path') {
    setByPath(translation, fragment.targetPath, translatedSource)
    return translation
  }
  if (!isJsonRecord(translatedSource)) {
    throw new Error('A root translation fragment must be an object')
  }

  for (const [key, value] of Object.entries(translatedSource)) {
    if (
      value === null &&
      (key === 'announcement' || key === 'campaignNotices')
    ) {
      delete translation[key]
      continue
    }
    translation[key] = value
  }
  return translation
}

function removeSiteTarget(
  translation: JsonRecord,
  sourcePath: string,
): JsonRecord {
  if (sourcePath === `${SITE_SOURCE_DIR}/common.json`) return translation
  if (sourcePath === `${SITE_SOURCE_DIR}/blog.json`) {
    delete translation.blog
    return translation
  }
  if (sourcePath === `${SITE_SOURCE_DIR}/legacy-tags.json`) {
    delete translation.tags
    return translation
  }
  const pageMatch = sourcePath.match(
    /^src\/i18n\/source\/ja\/pages\/([^/]+)\.json$/,
  )
  if (pageMatch?.[1]) {
    deleteByPath(translation, ['pages', pageMatch[1]])
  }
  return translation
}

function splitMarkdownDocument(source: string): BlogDocument {
  const normalized = normalizeText(source)
  if (!normalized.startsWith('---\n')) {
    throw new Error('Japanese blog source must have YAML frontmatter')
  }
  const endIndex = normalized.indexOf('\n---\n', 4)
  if (endIndex === -1)
    throw new Error('Japanese blog frontmatter is not closed')
  return {
    frontmatter: normalized.slice(4, endIndex),
    body: normalized.slice(endIndex + 5),
  }
}

function getFrontmatterString(frontmatter: string, key: string): string | null {
  const raw = frontmatter.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'))?.[1]
  if (!raw) return null
  const trimmed = raw.trim()
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1).replaceAll("''", "'")
  }
  return trimmed
}

function isTranslationDisabled(frontmatter: string): boolean {
  return /^translation:\s*false\s*$/m.test(frontmatter)
}

function updateFrontmatterString(
  frontmatter: string,
  key: string,
  value: string,
): string {
  const pattern = new RegExp(`^${key}:\\s*.*$`, 'm')
  const replacement = `${key}: ${JSON.stringify(value)}`
  if (pattern.test(frontmatter))
    return frontmatter.replace(pattern, replacement)
  return `${frontmatter}\n${replacement}`
}

function getMarkdownExternalUrls(markdown: string): string[] {
  return getUrlTokens(markdown)
}

function validateMarkdownTranslation(
  source: BlogDocument,
  translated: BlogDocument,
): void {
  const sourceFenceCount = (source.body.match(/^```/gm) ?? []).length
  const translatedFenceCount = (translated.body.match(/^```/gm) ?? []).length
  if (sourceFenceCount !== translatedFenceCount) {
    throw new Error('Translated Markdown must preserve fenced code block count')
  }

  for (const url of getMarkdownExternalUrls(source.body)) {
    if (!translated.body.includes(url)) {
      throw new Error(`Translated Markdown must preserve ${url}`)
    }
  }
}

function getBlogTargetPath(locale: string, sourcePath: string): string {
  const basename = path.posix.basename(sourcePath)
  return path.posix.join('src/content/blog', locale, basename)
}

function getBlogHash(sourcePath: string): string | null {
  if (!existsSync(sourcePath)) return null
  return hashSource(readFileSync(sourcePath, 'utf8'))
}

function getSiteHash(sourcePath: string): string | null {
  try {
    return hashJson(getSiteFragment(sourcePath).source)
  } catch {
    return null
  }
}

function getCurrentSourceHash(metadata: RequestMetadata): string | null {
  if (metadata.kind === 'blog') return getBlogHash(metadata.sourcePath)
  if (metadata.kind === 'blog-delete') {
    return existsSync(metadata.sourcePath)
      ? null
      : hashSource(`deleted:${metadata.sourcePath}`)
  }
  if (metadata.kind === 'site') return getSiteHash(metadata.sourcePath)
  return existsSync(metadata.sourcePath)
    ? null
    : hashSource(`deleted:${metadata.sourcePath}`)
}

function encodeMetadata(metadata: RequestMetadata): string {
  return `${CUSTOM_ID_PREFIX}${Buffer.from(JSON.stringify(metadata)).toString('base64url')}`
}

export function decodeMetadata(customId: string): RequestMetadata {
  if (!customId.startsWith(CUSTOM_ID_PREFIX)) {
    throw new Error(`Unexpected batch custom_id: ${customId}`)
  }
  const decoded = JSON.parse(
    Buffer.from(customId.slice(CUSTOM_ID_PREFIX.length), 'base64url').toString(
      'utf8',
    ),
  ) as Partial<RequestMetadata>
  if (
    decoded.version !== 1 ||
    (decoded.kind !== 'blog' &&
      decoded.kind !== 'blog-delete' &&
      decoded.kind !== 'site' &&
      decoded.kind !== 'site-delete') ||
    typeof decoded.sourcePath !== 'string' ||
    typeof decoded.sourceHash !== 'string'
  ) {
    throw new Error(`Malformed translation batch custom_id: ${customId}`)
  }
  if (decoded.locale !== undefined && typeof decoded.locale !== 'string') {
    throw new Error(`Malformed locale in batch custom_id: ${customId}`)
  }
  return decoded as RequestMetadata
}

function sourceMarker(metadata: RequestMetadata): string {
  const source = {
    kind: metadata.kind,
    sourcePath: metadata.sourcePath,
    sourceHash: metadata.sourceHash,
  }
  return `${SOURCE_MARKER_PREFIX}${Buffer.from(JSON.stringify(source)).toString('base64url')}${SOURCE_MARKER_SUFFIX}`
}

function parseSourceMarkers(
  body: string | null | undefined,
): RequestMetadata[] {
  if (!body) return []
  const matches = [
    ...body.matchAll(/<!-- openai-translation-source:([^\s]+) -->/g),
  ]
  return matches.map((match) => {
    const decoded = JSON.parse(
      Buffer.from(match[1] as string, 'base64url').toString('utf8'),
    ) as Partial<RequestMetadata>
    if (
      (decoded.kind !== 'blog' &&
        decoded.kind !== 'blog-delete' &&
        decoded.kind !== 'site' &&
        decoded.kind !== 'site-delete') ||
      typeof decoded.sourcePath !== 'string' ||
      typeof decoded.sourceHash !== 'string'
    ) {
      throw new Error('A translation PR has an invalid source marker')
    }
    return {
      version: 1,
      kind: decoded.kind,
      sourcePath: decoded.sourcePath,
      sourceHash: decoded.sourceHash,
    }
  })
}

function createResponseFormat(name: string, schema: JsonRecord): JsonRecord {
  return {
    type: 'json_schema',
    json_schema: {
      name,
      strict: true,
      schema,
    },
  }
}

const BLOG_RESPONSE_SCHEMA: JsonRecord = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    body: { type: 'string' },
  },
  required: ['title', 'description', 'body'],
  additionalProperties: false,
}

const SITE_RESPONSE_SCHEMA: JsonRecord = {
  type: 'object',
  properties: {
    translations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['id', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['translations'],
  additionalProperties: false,
}

const DELETE_RESPONSE_SCHEMA: JsonRecord = {
  type: 'object',
  properties: { delete: { type: 'boolean' } },
  required: ['delete'],
  additionalProperties: false,
}

function createBlogBatchRequest(
  metadata: RequestMetadata,
  source: string,
  current: string | null,
): BatchInputLine {
  const sourceDocument = splitMarkdownDocument(source)
  const currentDocument = current ? splitMarkdownDocument(current) : null
  const sourceTitle = getFrontmatterString(sourceDocument.frontmatter, 'title')
  const sourceDescription = getFrontmatterString(
    sourceDocument.frontmatter,
    'description',
  )
  if (!sourceTitle || !sourceDescription) {
    throw new Error(`${metadata.sourcePath} must have title and description`)
  }

  return {
    external_reference: encodeMetadata(metadata),
    messages: [
      {
        role: 'system',
        content:
          'Translate the supplied Japanese Acecore blog content into the requested locale. Return JSON only. Translate title, description, and Markdown body. Keep description between 50 and 160 Unicode characters so it can be used as a meta description. Preserve external URLs, placeholders such as {count}, code fences, image references, factual names, and Markdown structure. Do not include YAML frontmatter.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          targetLocale: metadata.locale,
          source: {
            title: sourceTitle,
            description: sourceDescription,
            body: sourceDocument.body,
          },
          current: currentDocument
            ? {
                title: getFrontmatterString(
                  currentDocument.frontmatter,
                  'title',
                ),
                description: getFrontmatterString(
                  currentDocument.frontmatter,
                  'description',
                ),
                body: currentDocument.body,
              }
            : null,
        }),
      },
    ],
    reasoning_effort: BATCH_REASONING_EFFORT,
    max_completion_tokens: 32768,
    response_format: createResponseFormat(
      'blog_translation',
      BLOG_RESPONSE_SCHEMA,
    ),
    store: false,
  }
}

function createSiteBatchRequest(
  metadata: RequestMetadata,
  fragment: SiteFragment,
  currentTranslation: JsonRecord,
): BatchInputLine {
  const currentFragment = getCurrentSiteFragment(currentTranslation, fragment)
  const entries = listTranslationEntries(fragment.source, currentFragment)
  if (entries.length === 0) {
    throw new Error(
      `${metadata.sourcePath} does not contain translatable strings`,
    )
  }

  return {
    external_reference: encodeMetadata(metadata),
    messages: [
      {
        role: 'system',
        content:
          'Translate each Japanese string into the requested locale. Return JSON only. Keep each id unchanged. For SEO metadata ids /description, /indexDescription, /pageDescription, /tagListDescription, and /archiveListDescription, keep the translation between 50 and 160 Unicode characters. Preserve placeholders such as {count}, URLs embedded in a string, product names, route paths, and code-like tokens exactly. Use the current translation as terminology context, but return one translation for every supplied id.',
      },
      {
        role: 'user',
        content: JSON.stringify({
          targetLocale: metadata.locale,
          sourcePath: metadata.sourcePath,
          entries,
        }),
      },
    ],
    reasoning_effort: BATCH_REASONING_EFFORT,
    max_completion_tokens: 32768,
    response_format: createResponseFormat(
      'site_translation',
      SITE_RESPONSE_SCHEMA,
    ),
    store: false,
  }
}

function createDeleteBatchRequest(metadata: RequestMetadata): BatchInputLine {
  return {
    external_reference: encodeMetadata(metadata),
    messages: [
      {
        role: 'system',
        content: 'Return the requested JSON object without additional text.',
      },
      {
        role: 'user',
        content: 'Confirm this translation source deletion.',
      },
    ],
    reasoning_effort: BATCH_REASONING_EFFORT,
    max_completion_tokens: 256,
    response_format: createResponseFormat(
      'translation_delete',
      DELETE_RESPONSE_SCHEMA,
    ),
    store: false,
  }
}

function requireCloudflareAccountId(): string {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  if (!accountId) throw new Error('CLOUDFLARE_ACCOUNT_ID is required')
  return accountId
}

function requireCloudflareApiToken(): string {
  const token = process.env.CLOUDFLARE_WORKERS_AI_API_TOKEN?.trim()
  if (!token) {
    throw new Error('CLOUDFLARE_WORKERS_AI_API_TOKEN is required')
  }
  return token
}

function getWorkersAiBatchUrl(): string {
  return `${API_BASE_URL}/accounts/${requireCloudflareAccountId()}/ai/run/${BATCH_MODEL}?queueRequest=true`
}

async function workersAiBatchRequest(
  body: JsonRecord,
): Promise<CloudflareBatchResult> {
  const response = await fetch(getWorkersAiBatchUrl(), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${requireCloudflareApiToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(
      `Workers AI Batch API failed: ${response.status} ${await response.text()}`,
    )
  }
  const envelope = (await response.json()) as CloudflareBatchEnvelope
  if (!envelope.success || !envelope.result) {
    throw new Error(
      `Workers AI Batch API rejected the request: ${JSON.stringify(envelope.errors ?? [])}`,
    )
  }
  return envelope.result
}

function sourceAtCurrentRefMatches(
  sourcePath: string,
  expectedSource: string | null,
  currentRef: string | null,
): boolean {
  if (!currentRef) return true
  const current = readFileAtRef(currentRef, sourcePath)
  if (expectedSource === null) return current === null
  return current !== null && hashSource(current) === hashSource(expectedSource)
}

async function submitBatch(args: ParsedArgs): Promise<void> {
  const headSha = resolveHeadSha(args.headSha)
  const baseSha =
    normalizeSha(args.baseSha) ?? normalizeSha(process.env.GITHUB_EVENT_BEFORE)

  const inputs: BatchInputLine[] = []
  const locales = getTargetLocales()
  for (const entry of listChangedEntries(baseSha, headSha)) {
    if (isBlogPath(entry.path)) {
      if (entry.status === 'D') {
        if (!sourceAtCurrentRefMatches(entry.path, null, args.currentRef))
          continue
        inputs.push(
          createDeleteBatchRequest({
            version: 1,
            kind: 'blog-delete',
            sourcePath: entry.path,
            sourceHash: hashSource(`deleted:${entry.path}`),
          }),
        )
        continue
      }

      const source = readFileAtRef(headSha, entry.path)
      if (
        !source ||
        !sourceAtCurrentRefMatches(entry.path, source, args.currentRef)
      ) {
        continue
      }
      const sourceDocument = splitMarkdownDocument(source)
      if (isTranslationDisabled(sourceDocument.frontmatter)) continue

      for (const locale of locales) {
        const targetPath = getBlogTargetPath(locale, entry.path)
        const current = existsSync(targetPath)
          ? readFileSync(targetPath, 'utf8')
          : null
        inputs.push(
          createBlogBatchRequest(
            {
              version: 1,
              kind: 'blog',
              locale,
              sourcePath: entry.path,
              previousPath: entry.status === 'R' ? entry.previousPath : null,
              sourceHash: hashSource(source),
            },
            source,
            current,
          ),
        )
      }
      continue
    }

    if (entry.status === 'D' && !isCampaignPath(entry.path)) {
      if (!sourceAtCurrentRefMatches(entry.path, null, args.currentRef))
        continue
      inputs.push(
        createDeleteBatchRequest({
          version: 1,
          kind: 'site-delete',
          sourcePath: entry.path,
          sourceHash: hashSource(`deleted:${entry.path}`),
        }),
      )
      continue
    }

    const fragment = getSiteFragment(entry.path)
    const sourceHash = hashJson(fragment.source)
    for (const locale of locales) {
      const translationPath = `src/i18n/translations/${locale}.json`
      const currentTranslation = readJsonFile(translationPath)
      if (!isJsonRecord(currentTranslation)) {
        throw new Error(`${translationPath} must contain a JSON object`)
      }
      inputs.push(
        createSiteBatchRequest(
          {
            version: 1,
            kind: 'site',
            locale,
            sourcePath: entry.path,
            sourceHash,
          },
          fragment,
          currentTranslation,
        ),
      )
    }
  }

  if (inputs.length === 0) {
    console.log('No current translation inputs to submit.')
    return
  }

  const requestBody: JsonRecord = { requests: inputs as unknown as JsonValue[] }
  const requestBytes = Buffer.byteLength(JSON.stringify(requestBody), 'utf8')
  if (requestBytes >= MAX_BATCH_PAYLOAD_BYTES) {
    throw new Error(
      `Workers AI Batch payload must be under 10 MB; received ${requestBytes} bytes`,
    )
  }
  const batch = await workersAiBatchRequest(requestBody)
  if (batch.status !== 'queued' || !batch.request_id) {
    throw new Error('Workers AI Batch submission returned no queued request_id')
  }
  console.log(
    `Submitted Workers AI translation batch ${batch.request_id} (${inputs.length} requests).`,
  )
  writeOutput('batch_id', batch.request_id)
  writeOutput('pending_marker_path', writePendingMarker(batch.request_id))
}

function getResponseText(body: JsonRecord): string {
  if (!Array.isArray(body.choices) || body.choices.length !== 1) {
    throw new Error('Chat Completions output must contain exactly one choice')
  }
  const choice = body.choices[0]
  if (
    !isJsonRecord(choice) ||
    choice.index !== 0 ||
    choice.finish_reason !== 'stop' ||
    !isJsonRecord(choice.message)
  ) {
    throw new Error('Chat Completions output is incomplete or malformed')
  }
  if (
    typeof choice.message.refusal === 'string' &&
    choice.message.refusal.trim()
  ) {
    throw new Error('Chat Completions output was refused')
  }
  const content = choice.message.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Chat Completions output text is missing')
  }
  return content
}

export function parseJsonResponse(body: JsonRecord): JsonRecord {
  const parsed = JSON.parse(getResponseText(body)) as unknown
  if (!isJsonRecord(parsed))
    throw new Error('Translation response must be a JSON object')
  return parsed
}

function parseSiteTranslations(
  response: JsonRecord,
  expectedEntries: readonly TranslationEntry[],
): Map<string, string> {
  const values = response.translations
  if (!Array.isArray(values))
    throw new Error('Site response.translations must be an array')
  const translations = new Map<string, string>()
  for (const value of values) {
    if (
      !isJsonRecord(value) ||
      typeof value.id !== 'string' ||
      typeof value.text !== 'string'
    ) {
      throw new Error('Site translation item must have id and text')
    }
    if (translations.has(value.id))
      throw new Error(`Duplicate site translation id: ${value.id}`)
    translations.set(value.id, value.text)
  }
  const expectedIds = new Set(expectedEntries.map((entry) => entry.id))
  if (translations.size !== expectedIds.size) {
    throw new Error('Site translation response has an unexpected entry count')
  }
  for (const id of expectedIds) {
    if (!translations.has(id))
      throw new Error(`Missing site translation: ${id}`)
  }
  return translations
}

function parseBlogResponse(response: JsonRecord): {
  title: string
  description: string
  body: string
} {
  if (
    typeof response.title !== 'string' ||
    typeof response.description !== 'string' ||
    typeof response.body !== 'string'
  ) {
    throw new Error('Blog translation response is incomplete')
  }
  if (response.body.startsWith('---\n')) {
    throw new Error('Blog translation must not include YAML frontmatter')
  }
  return {
    title: response.title,
    description: response.description,
    body: normalizeText(response.body),
  }
}

function writeTranslationFile(filePath: string, content: string): boolean {
  const previous = existsSync(filePath) ? readFileSync(filePath, 'utf8') : null
  if (previous === content) return false
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, content)
  return true
}

function applyBlogTranslation(
  metadata: RequestMetadata,
  response: JsonRecord,
): boolean {
  if (!metadata.locale) throw new Error('Blog translation is missing a locale')
  const source = readFileSync(metadata.sourcePath, 'utf8')
  if (hashSource(source) !== metadata.sourceHash) {
    throw new Error(`Stale source: ${metadata.sourcePath}`)
  }
  const sourceDocument = splitMarkdownDocument(source)
  const translated = parseBlogResponse(response)
  const translatedDocument: BlogDocument = {
    frontmatter: updateFrontmatterString(
      updateFrontmatterString(
        sourceDocument.frontmatter,
        'title',
        translated.title,
      ),
      'description',
      translated.description,
    ),
    body: translated.body.endsWith('\n')
      ? translated.body
      : `${translated.body}\n`,
  }
  assertProtectedTokens(
    getFrontmatterString(sourceDocument.frontmatter, 'title') ?? '',
    translated.title,
    'Blog title',
  )
  assertProtectedTokens(
    getFrontmatterString(sourceDocument.frontmatter, 'description') ?? '',
    translated.description,
    'Blog description',
  )
  validateMarkdownTranslation(sourceDocument, translatedDocument)

  const targetPath = getBlogTargetPath(metadata.locale, metadata.sourcePath)
  let changed = writeTranslationFile(
    targetPath,
    `---\n${translatedDocument.frontmatter}\n---\n${translatedDocument.body}`,
  )
  if (metadata.previousPath && metadata.previousPath !== metadata.sourcePath) {
    const previousTargetPath = getBlogTargetPath(
      metadata.locale,
      metadata.previousPath,
    )
    if (existsSync(previousTargetPath)) {
      rmSync(previousTargetPath)
      changed = true
    }
  }
  return changed
}

function applyBlogDeletion(metadata: RequestMetadata): boolean {
  if (existsSync(metadata.sourcePath)) {
    throw new Error(`Stale deletion: ${metadata.sourcePath}`)
  }
  let changed = false
  for (const locale of getTargetLocales()) {
    const targetPath = getBlogTargetPath(locale, metadata.sourcePath)
    if (existsSync(targetPath)) {
      rmSync(targetPath)
      changed = true
    }
  }
  return changed
}

function applySiteTranslation(
  metadata: RequestMetadata,
  response: JsonRecord,
): boolean {
  if (!metadata.locale) throw new Error('Site translation is missing a locale')
  const fragment = getSiteFragment(metadata.sourcePath)
  if (hashJson(fragment.source) !== metadata.sourceHash) {
    throw new Error(`Stale source: ${metadata.sourcePath}`)
  }
  const translationPath = `src/i18n/translations/${metadata.locale}.json`
  const translation = readJsonFile(translationPath)
  if (!isJsonRecord(translation)) {
    throw new Error(`${translationPath} must contain a JSON object`)
  }
  const expectedEntries = listTranslationEntries(
    fragment.source,
    getCurrentSiteFragment(translation, fragment),
  )
  const translatedSource = translateJsonValue(
    fragment.source,
    parseSiteTranslations(response, expectedEntries),
  )
  const next = applySiteFragment(translation, fragment, translatedSource)
  return writeTranslationFile(
    translationPath,
    `${JSON.stringify(next, null, 2)}\n`,
  )
}

function applySiteDeletion(metadata: RequestMetadata): boolean {
  if (existsSync(metadata.sourcePath)) {
    throw new Error(`Stale deletion: ${metadata.sourcePath}`)
  }
  let changed = false
  for (const locale of getTargetLocales()) {
    const translationPath = `src/i18n/translations/${locale}.json`
    const translation = readJsonFile(translationPath)
    if (!isJsonRecord(translation)) continue
    const next = removeSiteTarget(translation, metadata.sourcePath)
    changed =
      writeTranslationFile(
        translationPath,
        `${JSON.stringify(next, null, 2)}\n`,
      ) || changed
  }
  return changed
}

export async function findCompletedPendingBatch(
  pending: readonly string[],
  processed: ReadonlySet<string>,
  request: (
    body: JsonRecord,
  ) => Promise<CloudflareBatchResult> = workersAiBatchRequest,
): Promise<{ batchId: string; batch: CloudflareBatchResult } | null> {
  for (const batchId of pending) {
    if (processed.has(batchId)) continue
    const batch = await request({ request_id: batchId })
    if (Array.isArray(batch.responses)) return { batchId, batch }
  }
  return null
}

function makePrBody(
  batchId: string,
  markers: readonly RequestMetadata[],
): string {
  const uniqueMarkers = new Map<string, RequestMetadata>()
  for (const marker of markers) {
    const key = `${marker.kind}:${marker.sourcePath}:${marker.sourceHash}`
    uniqueMarkers.set(key, marker)
  }
  return [
    `${BATCH_MARKER_PREFIX}${batchId}${BATCH_MARKER_SUFFIX}`,
    ...[...uniqueMarkers.values()].map(sourceMarker),
    '',
    '## 概要',
    '- Cloudflare Workers AI Batch（GLM 5.3 Flash / reasoning high）で最新の日本語sourceを翻訳しました。',
    '- sourceHash が現在の日本語sourceと一致する結果だけを含めています。',
    '',
    '## 確認',
    '- Translation PR Build と必須CIの成功後にsquashで自動マージされます。',
    '',
    '## 補足',
    '自動生成された翻訳PRです。',
  ].join('\n')
}

function writePrBody(
  batchId: string,
  markers: readonly RequestMetadata[],
): string {
  const outputDirectory = process.env.RUNNER_TEMP ?? '.tmp'
  mkdirSync(outputDirectory, { recursive: true })
  const outputPath = path.join(
    outputDirectory,
    `openai-translation-${batchId}.md`,
  )
  writeFileSync(outputPath, makePrBody(batchId, markers))
  return outputPath
}

function writeProcessedMarker(batchId: string): string {
  const outputDirectory = process.env.RUNNER_TEMP ?? '.tmp'
  mkdirSync(outputDirectory, { recursive: true })
  const outputPath = path.join(
    outputDirectory,
    `openai-translation-processed-${batchId}.txt`,
  )
  writeFileSync(outputPath, `${batchId}\n`)
  return outputPath
}

function writePendingMarker(batchId: string): string {
  const outputDirectory = process.env.RUNNER_TEMP ?? '.tmp'
  mkdirSync(outputDirectory, { recursive: true })
  const outputPath = path.join(
    outputDirectory,
    `workers-ai-translation-pending-${batchId}.txt`,
  )
  writeFileSync(outputPath, `${batchId}\n`)
  return outputPath
}

function writeOutput(key: string, value: string): void {
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`, { flag: 'a' })
  }
}

function writeCollectedOutputs(result: CollectedResult): void {
  writeOutput('processed_batch_id', result.processedBatchId ?? '')
  writeOutput('batch_id', result.batchId ?? '')
  writeOutput('has_changes', result.hasChanges ? 'true' : 'false')
  writeOutput('body_path', result.bodyPath ?? '')
  if (result.processedBatchId) {
    writeOutput('marker_path', writeProcessedMarker(result.processedBatchId))
  }
}

async function collectBatch(args: ParsedArgs): Promise<void> {
  await closeStaleOpenAiTranslationPullRequests()
  const completed = await findCompletedPendingBatch(
    args.pendingBatchIds,
    args.processedBatchIds,
  )
  if (!completed) {
    console.log(
      'No unprocessed completed Workers AI translation batches found.',
    )
    writeCollectedOutputs({
      processedBatchId: null,
      hasChanges: false,
      bodyPath: null,
      batchId: null,
    })
    return
  }

  const { batchId, batch } = completed

  const outputs = batch.responses ?? []
  let hasChanges = false
  const appliedMarkers: RequestMetadata[] = []
  for (const output of outputs) {
    if (!output.success || !isJsonRecord(output.result)) {
      throw new Error(`Workers AI Batch ${batchId} contains a failed request`)
    }
    const metadata = decodeMetadata(output.external_reference)
    if (getCurrentSourceHash(metadata) !== metadata.sourceHash) {
      console.log(
        `Discarded stale translation result for ${metadata.sourcePath}`,
      )
      continue
    }

    const response = parseJsonResponse(output.result)
    const changed =
      metadata.kind === 'blog'
        ? applyBlogTranslation(metadata, response)
        : metadata.kind === 'blog-delete'
          ? applyBlogDeletion(metadata)
          : metadata.kind === 'site'
            ? applySiteTranslation(metadata, response)
            : applySiteDeletion(metadata)
    hasChanges = changed || hasChanges
    appliedMarkers.push(metadata)
  }

  const bodyPath = hasChanges ? writePrBody(batchId, appliedMarkers) : null
  writeCollectedOutputs({
    processedBatchId: batchId,
    hasChanges,
    bodyPath,
    batchId,
  })
  console.log(
    hasChanges
      ? `Applied current results from ${batchId}.`
      : `No current file changes from ${batchId}.`,
  )
}

interface PullRequestResponse {
  body?: unknown
}

interface OpenTranslationPullRequest {
  number?: unknown
  body?: unknown
  head?: {
    ref?: unknown
  }
}

async function githubRequest<T>(
  pathName: string,
  init: RequestInit = {},
): Promise<T> {
  const token = process.env.GITHUB_TOKEN
  const repository = process.env.GITHUB_REPOSITORY
  if (!token || !repository) {
    throw new Error('GITHUB_TOKEN and GITHUB_REPOSITORY are required')
  }
  const response = await fetch(
    `https://api.github.com/repos/${repository}${pathName}`,
    {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.headers ?? {}),
      },
    },
  )
  if (!response.ok) {
    throw new Error(`GitHub API ${pathName} failed: ${response.status}`)
  }
  return (await response.json()) as T
}

export function isCurrentTranslationMarker(metadata: RequestMetadata): boolean {
  return getCurrentSourceHash(metadata) === metadata.sourceHash
}

export function areOpenAiTranslationMarkersCurrent(
  body: string | null | undefined,
): boolean {
  const markers = parseSourceMarkers(body)
  return markers.length > 0 && markers.every(isCurrentTranslationMarker)
}

async function closeStaleOpenAiTranslationPullRequests(): Promise<void> {
  if (!process.env.GITHUB_TOKEN || !process.env.GITHUB_REPOSITORY) return
  const pulls = await githubRequest<OpenTranslationPullRequest[]>(
    '/pulls?state=open&per_page=100',
  )
  for (const pull of pulls) {
    if (
      typeof pull.number !== 'number' ||
      typeof pull.head?.ref !== 'string' ||
      (!pull.head.ref.startsWith('translation/openai/') &&
        !pull.head.ref.startsWith('translation/workers-ai/'))
    ) {
      continue
    }

    let markers: RequestMetadata[]
    try {
      markers = parseSourceMarkers(
        typeof pull.body === 'string' ? pull.body : null,
      )
    } catch {
      continue
    }
    if (markers.length === 0 || markers.every(isCurrentTranslationMarker)) {
      continue
    }

    await githubRequest<unknown>(`/pulls/${pull.number}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'closed' }),
    })
    console.log(`Closed stale translation PR #${pull.number}.`)
  }
}

async function verifyPullRequest(prNumber: number): Promise<void> {
  const pullRequest = await githubRequest<PullRequestResponse>(
    `/pulls/${prNumber}`,
  )
  const markers = parseSourceMarkers(
    typeof pullRequest.body === 'string' ? pullRequest.body : null,
  )
  if (markers.length === 0) {
    writeOutput('fresh', 'true')
    return
  }
  const fresh = markers.every(isCurrentTranslationMarker)
  writeOutput('fresh', fresh ? 'true' : 'false')
  if (!fresh) console.log(`Translation PR #${prNumber} is stale.`)
}

async function main(argv: readonly string[]): Promise<void> {
  const args = parseArgs(argv)
  if (args.command === 'submit') return submitBatch(args)
  if (args.command === 'collect') return collectBatch(args)
  if (!args.prNumber) throw new Error('verify-pr requires --pr=<number>')
  return verifyPullRequest(args.prNumber)
}

function isDirectExecution(): boolean {
  return (
    process.argv[1] !== undefined &&
    path.resolve(process.argv[1]).toLowerCase() ===
      fileURLToPath(import.meta.url).toLowerCase()
  )
}

if (isDirectExecution()) {
  await main(process.argv.slice(2))
}
