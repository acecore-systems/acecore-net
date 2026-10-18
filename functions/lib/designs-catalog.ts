import type { FederatedGroundingResult } from '../api/ai-contact-search.ts'

const ORIGIN = 'https://designs.acecore.net'
// Use the same Git-backed production deployment's public asset hostname.
// Same-zone global fetch otherwise routes to the origin instead of Pages.
const CATALOG_URL = 'https://acecore-designs.pages.dev/catalog.json'
const MAX_BYTES = 512 * 1024
const LOCALES = new Set([
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
const DESIGN_QUERY =
  /(?:acecore\s+designs?|イラスト|挿絵|キャラクター|3d|モデリング|ナレーション|朗読|脚本|シナリオ|illustration|character|voice.?recording|script.?writing)/iu

export function getDesignsUrl(locale: string): string {
  return `${ORIGIN}/${locale !== 'ja' && LOCALES.has(locale) ? `${locale}/` : ''}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function text(value: unknown, limit: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= limit
  )
}

function catalogExcerpt(payload: unknown, locale: string): string | null {
  if (
    !isRecord(payload) ||
    payload.schemaVersion !== 1 ||
    payload.sourceUrl !== `${ORIGIN}/` ||
    !isRecord(payload.locales)
  )
    return null
  const catalog = payload.locales[locale]
  if (
    !isRecord(catalog) ||
    !text(catalog.conditionsBody, 4000) ||
    !Array.isArray(catalog.groups) ||
    !catalog.groups.length ||
    catalog.groups.length > 20
  )
    return null
  const services: {
    title: string
    startingPriceJPYTaxIncluded: number
    description: string
  }[] = []
  const ids = new Set<string>()
  for (const group of catalog.groups) {
    if (!isRecord(group) || !Array.isArray(group.services)) return null
    for (const service of group.services) {
      if (
        !isRecord(service) ||
        !text(service.id, 100) ||
        ids.has(service.id) ||
        !text(service.title, 300) ||
        !text(service.description, 3000) ||
        typeof service.price !== 'number' ||
        !Number.isSafeInteger(service.price) ||
        service.price < 0
      )
        return null
      ids.add(service.id)
      services.push({
        title: service.title,
        startingPriceJPYTaxIncluded: service.price,
        description: service.description,
      })
    }
  }
  if (!services.length || services.length > 50) return null
  const excerpt = JSON.stringify({
    conditions: catalog.conditionsBody,
    services,
  })
  return excerpt.length <= 16000 ? excerpt : null
}

async function fetchExcerpt(
  locale: string,
  fetcher: typeof fetch,
): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)
  try {
    const response = await fetcher(CATALOG_URL, {
      signal: controller.signal,
      redirect: 'error',
      headers: { Accept: 'application/json' },
    })
    if (
      !response.ok ||
      !response.headers.get('content-type')?.includes('application/json') ||
      Number(response.headers.get('content-length')) > MAX_BYTES ||
      !response.body
    )
      return null
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let bytes = 0
    let body = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        bytes += value.byteLength
        if (bytes > MAX_BYTES) {
          await reader.cancel()
          return null
        }
        body += decoder.decode(value, { stream: true })
      }
      body += decoder.decode()
    } finally {
      reader.releaseLock()
    }
    return catalogExcerpt(JSON.parse(body), locale)
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/** The dedicated site is the single price source. Discard retired indexed prices even on failure. */
export async function refreshDesignsEvidence(
  result: FederatedGroundingResult,
  query: string,
  locale: string,
  fetcher: typeof fetch = fetch,
): Promise<FederatedGroundingResult> {
  if (result.sourceIntent !== 'acecore') return result
  const isRetired = (url: string) =>
    /^https:\/\/acecore\.net\/(?:[a-z-]+\/)?designs\/$/u.test(url)
  const hadRetired = result.entries.some(
    (entry) => entry.source === 'acecore' && isRetired(entry.url),
  )
  if (!hadRetired && !DESIGN_QUERY.test(query)) return result
  const entries = result.entries.filter(
    (entry) => !(entry.source === 'acecore' && isRetired(entry.url)),
  )
  const excerpt = await fetchExcerpt(locale, fetcher)
  return {
    ...result,
    entries: [
      {
        source: 'acecore',
        id: 'designs-live-catalog',
        score: 1,
        url: getDesignsUrl(locale),
        title: 'Acecore Designs',
        section: 'Production services',
        contentType: 'page',
        locale,
        excerpt:
          excerpt ??
          'The current dedicated-site catalog could not be verified. Do not quote prices or infer scope from retired pages. Direct the visitor to the official Acecore Designs site or the shared contact form.',
      },
      ...entries,
    ],
  }
}
