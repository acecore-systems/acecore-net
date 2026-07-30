import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { load } from 'cheerio'

export const SEARCH_CORPUS_SCHEMA_VERSION = 1
export const SEARCH_EMBEDDING_MODEL = 'text-embedding-3-large'
export const SEARCH_EMBEDDING_DIMENSIONS = 1536
export const SEARCH_DISTANCE_METRIC = 'cosine'
export const SEARCH_VECTOR_LIMIT = 4500

const SITE_ORIGIN = 'https://acecore.net'
const DEFAULT_DIST_DIR = resolve('dist')
const DEFAULT_OUTPUT_FILE = resolve('.vectorize/corpus.json')
const TARGET_CHUNK_LENGTH = 850
const MAX_CHUNK_LENGTH = 1200
const OVERLAP_LENGTH = 120
const MIN_BLOCK_LENGTH = 12
const SUPPORTED_LOCALES = new Set([
  'ja',
  'en',
  'zh-cn',
  'es',
  'pt',
  'fr',
  'ko',
  'de',
  'ru',
])

const CONTENT_SELECTORS = [
  'h1',
  'h2',
  'h3',
  'p',
  'li',
  'blockquote',
  'pre',
  'dt',
  'dd',
].join(',')

const REMOVE_SELECTORS = [
  '[data-pagefind-ignore]',
  '[aria-hidden="true"]',
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'canvas',
  'form',
  'button',
  'nav',
  'aside',
  'footer',
].join(',')

export async function buildSearchCorpus({
  distDir = DEFAULT_DIST_DIR,
  outputFile = DEFAULT_OUTPUT_FILE,
  write = true,
} = {}) {
  const htmlFiles = await findHtmlFiles(distDir)
  const documents = []

  for (const htmlFile of htmlFiles) {
    const html = await readFile(htmlFile, 'utf8')
    const document = extractSearchDocument(html, htmlFile, distDir)
    if (document) documents.push(document)
  }

  documents.sort((a, b) => a.url.localeCompare(b.url))

  const chunks = documents.flatMap((document) => chunkSearchDocument(document))
  if (chunks.length > SEARCH_VECTOR_LIMIT) {
    throw new Error(
      `Search corpus has ${chunks.length} vectors; the configured limit is ${SEARCH_VECTOR_LIMIT}.`,
    )
  }

  const localeCounts = Object.fromEntries(
    [...SUPPORTED_LOCALES]
      .map((locale) => [
        locale,
        chunks.filter((chunk) => chunk.namespace === locale).length,
      ])
      .filter(([, count]) => count > 0),
  )
  const version = digest(
    chunks
      .map(({ id }) => id)
      .sort()
      .join('\n'),
  ).slice(0, 20)
  const corpus = {
    schemaVersion: SEARCH_CORPUS_SCHEMA_VERSION,
    version,
    embedding: {
      model: SEARCH_EMBEDDING_MODEL,
      dimensions: SEARCH_EMBEDDING_DIMENSIONS,
      metric: SEARCH_DISTANCE_METRIC,
    },
    chunking: {
      targetCharacters: TARGET_CHUNK_LENGTH,
      maximumCharacters: MAX_CHUNK_LENGTH,
      overlapCharacters: OVERLAP_LENGTH,
    },
    sourceCount: documents.length,
    vectorCount: chunks.length,
    localeCounts,
    chunks,
  }

  if (write) {
    await mkdir(dirname(outputFile), { recursive: true })
    await writeFile(outputFile, `${JSON.stringify(corpus, null, 2)}\n`, 'utf8')
  }

  return corpus
}

export function extractSearchDocument(html, htmlFile, distDir) {
  const $ = load(html)
  const fallbackPath = htmlFileToUrl(htmlFile, distDir)
  const canonicalPath = getCanonicalPath($, fallbackPath)
  const localizedPath = stripLocalePrefix(canonicalPath)

  if (shouldExcludePath(localizedPath) || isNoIndexPage($)) return null

  const locale = getLocale($, canonicalPath)
  const title = normalizeText(
    $('main h1').first().text() ||
      $('meta[property="og:title"]').attr('content') ||
      $('title').text(),
  ).replace(/\s+[|｜]\s+Acecore$/i, '')
  if (!title) return null

  const description = normalizeText(
    $('meta[name="description"]').attr('content') || '',
  )
  const contentRoot = $('main').first().length
    ? $('main').first().clone()
    : $('body').first().clone()
  contentRoot.find(REMOVE_SELECTORS).remove()

  const blocks = collectContentBlocks($, contentRoot, title)
  if (blocks.reduce((total, block) => total + block.text.length, 0) < 50) {
    return null
  }

  return {
    url: canonicalPath,
    locale,
    title,
    description,
    contentType: getContentType(localizedPath),
    blocks,
  }
}

export function chunkSearchDocument(document) {
  const groups = []
  let current = []
  let currentLength = 0

  for (const block of document.blocks) {
    const blockLimit = Math.max(
      400,
      MAX_CHUNK_LENGTH - document.title.length - block.heading.length - 3,
    )
    for (const part of splitLongText(block.text, blockLimit)) {
      const next = { heading: block.heading, text: part }
      let separatorLength = current.length > 0 ? 1 : 0
      const wouldExceed =
        current.length > 0 &&
        (currentLength + separatorLength + part.length > TARGET_CHUNK_LENGTH ||
          composeChunkText(document, [...current, next]).length >
            MAX_CHUNK_LENGTH)

      if (wouldExceed) {
        groups.push(current)
        current = buildOverlap(current)
        if (
          composeChunkText(document, [...current, next]).length >
          MAX_CHUNK_LENGTH
        ) {
          current = []
        }
        currentLength = current.reduce(
          (total, item, index) =>
            total + item.text.length + (index > 0 ? 1 : 0),
          0,
        )
        separatorLength = current.length > 0 ? 1 : 0
      }

      current.push(next)
      currentLength += separatorLength + part.length
    }
  }

  if (current.length > 0) groups.push(current)

  return groups.map((group, index) => {
    const section =
      [...group].reverse().find(({ heading }) => heading)?.heading ||
      document.title
    const body = group.map(({ text }) => text).join('\n')
    const text = composeChunkText(document, group)
    if (text.length > MAX_CHUNK_LENGTH) {
      throw new Error(
        `Search chunk exceeds ${MAX_CHUNK_LENGTH} characters: ${document.url}`,
      )
    }
    const id = `v1-${digest(
      [document.locale, document.url, String(index), text].join('\n'),
    ).slice(0, 48)}`

    return {
      id,
      namespace: document.locale,
      text,
      metadata: {
        url: document.url,
        title: document.title,
        section,
        excerpt: createExcerpt(body || document.description),
        contentType: document.contentType,
        locale: document.locale,
      },
    }
  })
}

function composeChunkText(document, group) {
  const section =
    [...group].reverse().find(({ heading }) => heading)?.heading ||
    document.title
  const body = group.map(({ text }) => text).join('\n')
  return normalizeText(
    [document.title, section !== document.title ? section : '', body]
      .filter(Boolean)
      .join('\n'),
  )
}

function collectContentBlocks($, root, title) {
  const blocks = []
  let currentHeading = title
  let previousText = ''

  root.find(CONTENT_SELECTORS).each((_index, element) => {
    const tagName = String(element.tagName || '').toLowerCase()
    const text = normalizeText($(element).text())
    if (!text || text === previousText) return

    previousText = text
    if (/^h[1-3]$/.test(tagName)) {
      currentHeading = text
      return
    }

    if (text.length < MIN_BLOCK_LENGTH) return
    blocks.push({ heading: currentHeading, text })
  })

  return blocks
}

function splitLongText(text, limit) {
  if (text.length <= limit) return [text]

  const sentences = text.split(/(?<=[。！？.!?])\s*/u).filter(Boolean)
  const parts = []
  let current = ''

  for (const sentence of sentences) {
    if (sentence.length > limit) {
      if (current) {
        parts.push(current)
        current = ''
      }
      for (let index = 0; index < sentence.length; index += limit) {
        parts.push(sentence.slice(index, index + limit))
      }
      continue
    }

    const candidate = current ? `${current} ${sentence}` : sentence
    if (candidate.length > limit) {
      parts.push(current)
      current = sentence
    } else {
      current = candidate
    }
  }

  if (current) parts.push(current)
  return parts
}

function buildOverlap(blocks) {
  const overlap = []
  let length = 0

  for (const block of [...blocks].reverse()) {
    if (overlap.length > 0 && length + block.text.length > OVERLAP_LENGTH) break
    overlap.unshift(block)
    length += block.text.length
    if (length >= OVERLAP_LENGTH) break
  }

  return overlap
}

function createExcerpt(text) {
  const normalized = normalizeText(text)
  if (normalized.length <= 220) return normalized
  return `${normalized.slice(0, 219).trimEnd()}…`
}

function getCanonicalPath($, fallbackPath) {
  const canonical = $('link[rel="canonical"]').attr('href')
  if (!canonical) return fallbackPath

  try {
    const url = new URL(canonical, SITE_ORIGIN)
    if (url.origin !== SITE_ORIGIN) return fallbackPath
    return normalizeUrlPath(url.pathname)
  } catch {
    return fallbackPath
  }
}

function getLocale($, urlPath) {
  const htmlLang = String($('html').attr('lang') || '')
    .trim()
    .toLowerCase()
  const normalizedHtmlLang = htmlLang.startsWith('zh') ? 'zh-cn' : htmlLang
  if (SUPPORTED_LOCALES.has(normalizedHtmlLang)) return normalizedHtmlLang

  const firstSegment = urlPath.split('/').filter(Boolean)[0]?.toLowerCase()
  return SUPPORTED_LOCALES.has(firstSegment) ? firstSegment : 'ja'
}

function getContentType(localizedPath) {
  if (/^\/blog\/[^/]+\/$/.test(localizedPath)) return 'blog'
  if (localizedPath === '/') return 'home'
  return 'page'
}

function stripLocalePrefix(urlPath) {
  const segments = urlPath.split('/').filter(Boolean)
  if (SUPPORTED_LOCALES.has(segments[0]?.toLowerCase())) segments.shift()
  return normalizeUrlPath(`/${segments.join('/')}`)
}

function shouldExcludePath(localizedPath) {
  return (
    localizedPath === '/404/' ||
    localizedPath === '/404.html/' ||
    localizedPath === '/admin/' ||
    localizedPath === '/blog/' ||
    /^\/blog\/(?:tags|archive|authors|page)(?:\/|$)/.test(localizedPath) ||
    localizedPath === '/contact/thanks/'
  )
}

function isNoIndexPage($) {
  return $('meta[name="robots"]')
    .toArray()
    .some((element) =>
      String($(element).attr('content') || '')
        .toLowerCase()
        .split(',')
        .some((value) => value.trim() === 'noindex'),
    )
}

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) return findHtmlFiles(path)
      return entry.isFile() && entry.name.endsWith('.html') ? [path] : []
    }),
  )

  return files.flat()
}

function htmlFileToUrl(htmlFile, distDir) {
  const path = relative(distDir, htmlFile).split(sep).join('/')
  if (path === 'index.html') return '/'
  if (path.endsWith('/index.html')) {
    return normalizeUrlPath(`/${path.slice(0, -'index.html'.length)}`)
  }
  return normalizeUrlPath(`/${path}`)
}

function normalizeUrlPath(path) {
  const normalized = `/${path}`.replace(/\/+/g, '/')
  if (normalized === '/') return normalized
  return normalized.endsWith('/') ? normalized : `${normalized}/`
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/gu, ' ')
    .trim()
}

function digest(value) {
  return createHash('sha256').update(value).digest('hex')
}

function isDirectExecution() {
  if (!process.argv[1]) return false
  return (
    resolve(process.argv[1]).toLowerCase() ===
    fileURLToPath(import.meta.url).toLowerCase()
  )
}

if (isDirectExecution()) {
  const corpus = await buildSearchCorpus()
  console.log(
    JSON.stringify({
      event: 'search_corpus_built',
      version: corpus.version,
      sources: corpus.sourceCount,
      vectors: corpus.vectorCount,
      locales: corpus.localeCounts,
    }),
  )
}
