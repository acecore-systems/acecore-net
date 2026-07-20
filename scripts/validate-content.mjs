import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const errors = []

function fail(scope, message) {
  errors.push(`${scope}: ${message}`)
}

async function fileExists(relativePath) {
  try {
    await access(path.join(root, relativePath))
    return true
  } catch {
    return false
  }
}

function extractCmsContentPaths(config) {
  const paths = []
  const pathPattern = /^\s*(?:folder|file):\s*['"]?([^'"\n#]+?)['"]?\s*$/gm
  for (const match of config.matchAll(pathPattern)) {
    paths.push(match[1].trim())
  }
  return paths
}

function isAllowedCmsContentPath(contentPath) {
  return (
    contentPath === 'src/content/blog' ||
    contentPath === 'src/content/authors' ||
    contentPath === 'src/content/tags' ||
    contentPath === 'src/i18n/source/ja/campaigns' ||
    /^src\/i18n\/source\/ja\/(?:common|blog)\.json$/.test(contentPath) ||
    /^src\/i18n\/source\/ja\/pages\/[a-z0-9-]+\.json$/.test(contentPath)
  )
}

const contextualTitleFiles = [
  'src/i18n/source/ja/pages/services.json',
  'src/i18n/source/ja/pages/about.json',
  'src/i18n/source/ja/pages/contact.json',
  'src/i18n/source/ja/pages/acestudio.json',
  'src/i18n/source/ja/pages/privacy.json',
  'src/i18n/source/ja/blog.json',
]

function extractCmsFileDefinition(config, contentPath) {
  const start = config.indexOf(`file: ${contentPath}`)
  if (start < 0) return ''

  const nextDefinition = config.indexOf('\n      - name:', start)
  return config.slice(start, nextDefinition < 0 ? undefined : nextDefinition)
}

async function validateCmsConfig() {
  const scope = 'public/admin/config.yml'
  const config = await readFile(path.join(root, scope), 'utf8')

  if (/^\s*-?\s*name:\s*path\b/m.test(config)) {
    fail(scope, 'path field must not be exposed in CMS')
  }
  if (!/backend:\s*[\s\S]*?\n\s+branch:\s*main\b/.test(config)) {
    fail(
      scope,
      'CMS backend branch must be main; do not use a permanent cms-content branch',
    )
  }
  if (!/^publish_mode:\s*editorial_workflow\b/m.test(config)) {
    fail(
      scope,
      'CMS must use editorial_workflow so saves create short-lived branches and PRs',
    )
  }

  for (const contentPath of extractCmsContentPaths(config)) {
    if (!isAllowedCmsContentPath(contentPath)) {
      fail(scope, `unexpected CMS content path (${contentPath})`)
      continue
    }
    if (!(await fileExists(contentPath))) {
      fail(scope, `CMS content path does not exist (${contentPath})`)
    }
  }

  for (const contentPath of contextualTitleFiles) {
    const source = JSON.parse(
      await readFile(path.join(root, contentPath), 'utf8'),
    )
    if (
      typeof source.seoTitleContext !== 'string' ||
      source.seoTitleContext.trim() === ''
    ) {
      fail(contentPath, 'seoTitleContext must be a non-empty string')
    }

    const definition = extractCmsFileDefinition(config, contentPath)
    if (!/^\s*-\s*name:\s*['"]seoTitleContext['"]\s*$/m.test(definition)) {
      fail(scope, `seoTitleContext field is missing for ${contentPath}`)
    }
  }
}

const LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/
const TIMEZONE_PATTERN = /(?:Z|[+-]\d{2}:\d{2})$/

async function listMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name)
      return entry.isDirectory()
        ? listMarkdownFiles(entryPath)
        : entry.name.endsWith('.md')
          ? [entryPath]
          : []
    }),
  )
  return nested.flat()
}

function parseFrontmatterDate(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'))
  if (!match) return null

  const raw = match[1].trim().replace(/^['"]|['"]$/g, '')
  const normalized =
    LOCAL_DATETIME_PATTERN.test(raw) && !TIMEZONE_PATTERN.test(raw)
      ? `${raw}+09:00`
      : raw
  const timestamp = Date.parse(normalized)
  return { raw, timestamp }
}

async function validateBlogDates() {
  const blogDirectory = path.join(root, 'src/content/blog')
  const files = await listMarkdownFiles(blogDirectory)

  for (const file of files) {
    const scope = path.relative(root, file).split(path.sep).join('/')
    const content = await readFile(file, 'utf8')
    const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1]
    if (!frontmatter) continue

    const published = parseFrontmatterDate(frontmatter, 'date')
    const modified = parseFrontmatterDate(frontmatter, 'lastUpdated')
    if (!published || !modified) continue

    if (Number.isNaN(published.timestamp)) {
      fail(scope, `invalid date (${published.raw})`)
      continue
    }
    if (Number.isNaN(modified.timestamp)) {
      fail(scope, `invalid lastUpdated (${modified.raw})`)
      continue
    }
    if (modified.timestamp < published.timestamp) {
      fail(
        scope,
        `lastUpdated (${modified.raw}) must not be earlier than date (${published.raw})`,
      )
    }
  }
}

await validateCmsConfig()
await validateBlogDates()

if (errors.length > 0) {
  console.error('Content validation failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('Content validation passed.')
