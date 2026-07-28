import { readFile, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDirectory = path.join(root, 'dist')
const args = process.argv.slice(2)
const unknownArgs = args.filter((arg) => arg !== '--check')

if (unknownArgs.length > 0) {
  throw new Error(`Unknown argument: ${unknownArgs.join(', ')}`)
}

const checkOnly = args.includes('--check')

function decodeXmlEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function extractAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=(['"])([\\s\\S]*?)\\1`, 'i'))
  return match?.[2] ?? ''
}

function extractMetaContent(html, attribute, value) {
  const tag = Array.from(
    html.matchAll(/<meta\s+[^>]*>/gi),
    (match) => match[0],
  ).find((candidate) => extractAttribute(candidate, attribute) === value)

  return tag ? extractAttribute(tag, 'content') : ''
}

function extractCanonical(html) {
  const tag = Array.from(
    html.matchAll(/<link\s+[^>]*>/gi),
    (match) => match[0],
  ).find((candidate) =>
    extractAttribute(candidate, 'rel').split(/\s+/).includes('canonical'),
  )

  return tag ? extractAttribute(tag, 'href') : ''
}

function isBlogPostUrl(url) {
  const segments = new URL(url).pathname.split('/').filter(Boolean)
  return (
    (segments.length === 2 && segments[0] === 'blog') ||
    (segments.length === 3 && segments[1] === 'blog')
  )
}

function normalizeDate(value, label) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`${label} is missing or invalid`)
  }
  return date.toISOString()
}

function isBlogPostHtml(file) {
  const segments = path.relative(distDirectory, file).split(path.sep)
  if (segments.at(-1) !== 'index.html') return false

  const routeSegments = segments.slice(0, -1)
  return (
    (routeSegments.length === 2 && routeSegments[0] === 'blog') ||
    (routeSegments.length === 3 && routeSegments[1] === 'blog')
  )
}

async function getHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) return getHtmlFiles(target)
      return entry.isFile() && entry.name === 'index.html' ? [target] : []
    }),
  )

  return files.flat()
}

async function getGeneratedArticles() {
  const htmlFiles = await getHtmlFiles(distDirectory)
  const candidates = htmlFiles.filter(isBlogPostHtml)
  const errors = []
  const articles = new Map()

  const entries = await Promise.all(
    candidates.map(async (file) => {
      const html = await readFile(file, 'utf8')
      const robots = extractMetaContent(html, 'name', 'robots').toLowerCase()
      if (robots.includes('noindex')) return null

      const canonical = extractCanonical(html)
      if (!canonical || !isBlogPostUrl(canonical)) {
        errors.push(
          `${path.relative(distDirectory, file)}: canonical blog URL is missing or invalid`,
        )
        return null
      }

      const modifiedTime = extractMetaContent(
        html,
        'property',
        'article:modified_time',
      )
      const publishedTime = extractMetaContent(
        html,
        'property',
        'article:published_time',
      )

      let lastmod
      try {
        lastmod = normalizeDate(
          modifiedTime || publishedTime,
          `${canonical} article date`,
        )
      } catch (error) {
        errors.push(
          `${canonical}: ${error instanceof Error ? error.message : String(error)}`,
        )
        return null
      }

      return [canonical, lastmod]
    }),
  )

  for (const entry of entries) {
    if (!entry) continue
    const [url, lastmod] = entry
    if (articles.has(url)) {
      errors.push(`${url}: multiple generated indexable blog articles`)
      continue
    }
    articles.set(url, lastmod)
  }

  return { articles, errors }
}

async function getSitemapFiles() {
  const sitemapIndex = await readFile(
    path.join(distDirectory, 'sitemap-index.xml'),
    'utf8',
  )
  const sitemapLocations = Array.from(
    sitemapIndex.matchAll(/<loc>([\s\S]*?)<\/loc>/g),
    (match) => decodeXmlEntities(match[1]),
  )

  if (sitemapLocations.length === 0) {
    throw new Error('No sitemap files were found in sitemap-index.xml')
  }

  return sitemapLocations.map((location) =>
    path.join(distDirectory, path.basename(new URL(location).pathname)),
  )
}

async function inspectSitemap(file, generatedArticles) {
  const xml = await readFile(file, 'utf8')
  const urlBlocks = Array.from(
    xml.matchAll(/<url>[\s\S]*?<\/url>/g),
    (match) => match[0],
  )
  const articleUrls = []
  const errors = []

  const updatedBlocks = urlBlocks.map((block) => {
    const locationMatch = block.match(/<loc>([\s\S]*?)<\/loc>/)
    const url = locationMatch ? decodeXmlEntities(locationMatch[1].trim()) : ''

    if (!url || !isBlogPostUrl(url)) return block

    articleUrls.push(url)
    const expected = generatedArticles.get(url)
    if (!expected) {
      errors.push(`${url}: matching generated indexable article is missing`)
      return block
    }

    const lastmodMatches = Array.from(
      block.matchAll(/<lastmod>([\s\S]*?)<\/lastmod>/g),
    )
    if (lastmodMatches.length > 1) {
      errors.push(`${url}: multiple lastmod elements`)
      return block
    }

    const actual = lastmodMatches[0]?.[1].trim() ?? ''
    if (checkOnly) {
      if (actual !== expected) {
        errors.push(
          `${url}: lastmod ${actual || '(missing)'} does not match ${expected}`,
        )
      }
      return block
    }

    if (lastmodMatches.length === 1) {
      return block.replace(
        /<lastmod>[\s\S]*?<\/lastmod>/,
        `<lastmod>${expected}</lastmod>`,
      )
    }

    return block.replace(/<\/loc>/, `</loc><lastmod>${expected}</lastmod>`)
  })

  let blockIndex = 0
  const updatedXml = xml.replace(
    /<url>[\s\S]*?<\/url>/g,
    () => updatedBlocks[blockIndex++],
  )

  return { articleUrls, errors, file, updatedXml }
}

const sitemapFiles = await getSitemapFiles()
const generated = await getGeneratedArticles()
const results = await Promise.all(
  sitemapFiles.map((file) => inspectSitemap(file, generated.articles)),
)
const sitemapArticleUrls = results.flatMap((result) => result.articleUrls)
const sitemapArticleUrlSet = new Set()
const errors = [
  ...generated.errors,
  ...results.flatMap((result) => result.errors),
]

for (const url of sitemapArticleUrls) {
  if (sitemapArticleUrlSet.has(url)) {
    errors.push(`${url}: duplicate sitemap entry`)
  }
  sitemapArticleUrlSet.add(url)
}

for (const url of generated.articles.keys()) {
  if (!sitemapArticleUrlSet.has(url)) {
    errors.push(`${url}: generated indexable article is missing from sitemap`)
  }
}

if (generated.articles.size === 0) {
  errors.push('No generated indexable blog articles were found')
}

if (errors.length > 0) {
  for (const error of errors) console.error(error)
  process.exitCode = 1
} else {
  if (!checkOnly) {
    await Promise.all(
      results.map((result) => writeFile(result.file, result.updatedXml)),
    )
  }

  const action = checkOnly ? 'Verified' : 'Added'
  console.log(
    `${action} accurate sitemap lastmod values for ${generated.articles.size} blog article URLs.`,
  )
}
