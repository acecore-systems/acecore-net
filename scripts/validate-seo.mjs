import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDirectory = path.join(root, 'dist')
const titleRange = { min: 15, max: 70 }
const descriptionRange = { min: 50, max: 160 }
const localizedPrefixes = new Set([
  'de',
  'en',
  'es',
  'fr',
  'ko',
  'pt',
  'ru',
  'zh-cn',
])
const contextualCoreRoutes = new Set([
  'about',
  'services',
  'contact',
  'privacy',
  'acestudio',
  'blog',
])

function decodeHtmlEntities(value) {
  return value
    .replace(/&#x([\da-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_, decimal) =>
      String.fromCodePoint(Number.parseInt(decimal, 10)),
    )
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

function countCharacters(value) {
  return Array.from(value).length
}

function extractTitle(html) {
  return decodeHtmlEntities(
    html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '',
  )
}

function extractMetaContent(html, name) {
  const tag = html.match(
    new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*>`, 'i'),
  )?.[0]
  if (!tag) return ''

  const match = tag.match(/content=(["'])([\s\S]*?)\1/i)
  return decodeHtmlEntities(match?.[2] ?? '')
}

function extractCanonical(html) {
  const tag = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*>/i)?.[0]
  if (!tag) return ''

  const match = tag.match(/href=(["'])([\s\S]*?)\1/i)
  return decodeHtmlEntities(match?.[2] ?? '')
}

function extractAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=(['"])([\\s\\S]*?)\\1`, 'i'))
  return decodeHtmlEntities(match?.[2] ?? '')
}

function extractHreflangLinks(html) {
  return new Map(
    Array.from(html.matchAll(/<link\s+[^>]*>/gi), (match) => match[0])
      .filter((tag) => extractAttribute(tag, 'rel') === 'alternate')
      .filter((tag) => extractAttribute(tag, 'hreflang'))
      .map((tag) => [
        extractAttribute(tag, 'hreflang'),
        extractAttribute(tag, 'href'),
      ]),
  )
}

function getImageAltIssues(html, url) {
  return Array.from(html.matchAll(/<img\s+[^>]*>/gi), (match) => match[0])
    .filter((tag) => !extractAttribute(tag, 'alt').trim())
    .map((tag) => ({
      label: 'image alt is empty or missing',
      url,
      value: extractAttribute(tag, 'src') || '(missing src)',
    }))
}

async function getSitemapUrls() {
  const sitemapIndex = await readFile(
    path.join(distDirectory, 'sitemap-index.xml'),
    'utf8',
  )
  const sitemapLocations = Array.from(
    sitemapIndex.matchAll(/<loc>(.*?)<\/loc>/g),
    (match) => decodeHtmlEntities(match[1]),
  )
  const sitemapFiles = sitemapLocations.map((location) =>
    path.join(distDirectory, path.basename(new URL(location).pathname)),
  )
  const sitemapXmlFiles = await Promise.all(
    sitemapFiles.map((file) => readFile(file, 'utf8')),
  )

  return sitemapXmlFiles.flatMap((xml) =>
    Array.from(xml.matchAll(/<loc>(.*?)<\/loc>/g), (match) =>
      decodeHtmlEntities(match[1]),
    ),
  )
}

function getHtmlPath(url) {
  const pathname = decodeURIComponent(new URL(url).pathname)
  if (pathname === '/') return path.join(distDirectory, 'index.html')
  return path.join(
    distDirectory,
    pathname.replace(/^\/+|\/+$/g, ''),
    'index.html',
  )
}

function getLocale(url) {
  const firstPathSegment = new URL(url).pathname.split('/').filter(Boolean)[0]
  return localizedPrefixes.has(firstPathSegment) ? firstPathSegment : 'ja'
}

function isContextualCorePage(url) {
  const segments = new URL(url).pathname.split('/').filter(Boolean)
  if (localizedPrefixes.has(segments[0])) segments.shift()
  return segments.length === 1 && contextualCoreRoutes.has(segments[0])
}

function getLengthIssue(label, value, range, url) {
  const length = countCharacters(value)
  if (length < range.min) {
    return { label: `${label} is too short`, length, url, value }
  }
  if (length > range.max) {
    return { label: `${label} is too long`, length, url, value }
  }
  return null
}

const urls = await getSitemapUrls()
const issues = []
const pages = []
let contextualCorePageCount = 0

for (const url of urls) {
  const html = await readFile(getHtmlPath(url), 'utf8')
  const title = extractTitle(html).trim()
  const description = extractMetaContent(html, 'description').trim()
  const robots = extractMetaContent(html, 'robots').toLowerCase()
  const canonical = extractCanonical(html)
  pages.push({ url, title, description, locale: getLocale(url) })

  if (isContextualCorePage(url)) {
    contextualCorePageCount += 1
    if (!title.includes(' – ')) {
      issues.push({
        label: 'core page title lacks page-specific context',
        url,
        value: title,
      })
    }
  }

  const titleIssue = getLengthIssue('title', title, titleRange, url)
  if (titleIssue) issues.push(titleIssue)

  const descriptionIssue = getLengthIssue(
    'meta description',
    description,
    descriptionRange,
    url,
  )
  if (descriptionIssue) issues.push(descriptionIssue)

  if (robots.includes('noindex')) {
    issues.push({ label: 'sitemap URL is noindex', url, value: robots })
  }

  if (canonical !== url) {
    issues.push({
      label: 'canonical does not match sitemap URL',
      url,
      value: canonical || '(missing)',
    })
  }

  issues.push(...getImageAltIssues(html, url))
}

const rootUrl = 'https://acecore.net/'
const rootHtml = await readFile(getHtmlPath(rootUrl), 'utf8')
const rootHreflangLinks = extractHreflangLinks(rootHtml)
const expectedRootHreflangLinks = new Map([
  ['ja', rootUrl],
  ['en', 'https://acecore.net/en/'],
  ['x-default', rootUrl],
])

for (const [hreflang, expectedUrl] of expectedRootHreflangLinks) {
  const actualUrl = rootHreflangLinks.get(hreflang)
  if (actualUrl === expectedUrl) continue
  issues.push({
    label: 'root hreflang does not match the default locale policy',
    url: rootUrl,
    value: `${hreflang}: ${actualUrl || '(missing)'} (expected ${expectedUrl})`,
  })
}

if (
  rootHtml.includes('navigator.language') &&
  rootHtml.includes('location.replace')
) {
  issues.push({
    label: 'root page contains an automatic locale redirect',
    url: rootUrl,
    value: 'Use explicit hreflang links and the language switcher instead.',
  })
}

const expectedContextualCorePages =
  contextualCoreRoutes.size * (localizedPrefixes.size + 1)
if (contextualCorePageCount !== expectedContextualCorePages) {
  issues.push({
    label: 'contextual core page coverage is incomplete',
    url: '(sitemap)',
    value: `${contextualCorePageCount}/${expectedContextualCorePages}`,
  })
}

for (const field of ['title', 'description']) {
  const values = new Map()

  for (const page of pages) {
    const key = `${page.locale}:${page[field]}`
    const matchingUrls = values.get(key) ?? []
    matchingUrls.push(page.url)
    values.set(key, matchingUrls)
  }

  for (const [key, matchingUrls] of values) {
    if (matchingUrls.length < 2) continue
    issues.push({
      label: `duplicate ${field}`,
      url: matchingUrls.join(', '),
      value: key.slice(key.indexOf(':') + 1),
    })
  }
}

const counts = Object.fromEntries(
  Array.from(new Set(issues.map((issue) => issue.label))).map((label) => [
    label,
    issues.filter((issue) => issue.label === label).length,
  ]),
)

console.log(`SEO validation checked ${urls.length} sitemap URLs.`)
console.log(
  `Page-specific title context checked ${contextualCorePageCount} core URLs.`,
)
console.log(JSON.stringify(counts, null, 2))

if (issues.length > 0) {
  for (const issue of issues) {
    const length = issue.length === undefined ? '' : ` (${issue.length})`
    console.error(`${issue.label}${length}: ${issue.url} — ${issue.value}`)
  }
  process.exitCode = 1
} else {
  console.log('All sitemap URLs passed the shared Google/Bing SEO checks.')
}
