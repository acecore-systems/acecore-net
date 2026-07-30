const localizedRoutePrefixes = new Set([
  'de',
  'en',
  'es',
  'fr',
  'ko',
  'pt',
  'ru',
  'zh-cn',
])
const localizedDestinationOrigins = new Set([
  'https://acecore.net',
  'https://systems.acecore.net',
  'https://asv.acecore.net',
])

export const RETIRED_TAG_DESTINATIONS: Readonly<Record<string, string>> =
  Object.freeze({
    アクセシビリティ: 'https://systems.acecore.net/insights/',
    'Acecore Schools': 'https://schools.acecore.net/',
    AI: 'https://systems.acecore.net/insights/',
    Astro: 'https://systems.acecore.net/insights/',
    Cloudflare: 'https://systems.acecore.net/insights/',
    CMS: 'https://systems.acecore.net/insights/',
    DNS: 'https://systems.acecore.net/insights/',
    イベント:
      'https://schools.acecore.net/activities/2023-summer-robot-workshop/',
    'GitHub Copilot': 'https://systems.acecore.net/insights/',
    i18n: 'https://systems.acecore.net/insights/',
    インフラ: 'https://systems.acecore.net/insights/',
    メール: 'https://systems.acecore.net/insights/',
    パフォーマンス: 'https://systems.acecore.net/insights/',
    セキュリティ: 'https://systems.acecore.net/insights/',
    SEO: 'https://systems.acecore.net/insights/',
    サービス: 'https://acecore.net/services/',
    Starlight: 'https://systems.acecore.net/insights/',
    技術: 'https://systems.acecore.net/insights/',
    'VS Code': 'https://systems.acecore.net/insights/',
    Web制作: 'https://systems.acecore.net/insights/',
    システム開発: 'https://systems.acecore.net/guide/',
  })

export function localizeRedirectDestination(
  destination: string,
  locale: string,
): string {
  if (!locale) return destination

  const url = new URL(destination)
  if (!localizedDestinationOrigins.has(url.origin)) return destination

  const localePrefix = `/${locale}`
  if (
    url.pathname === localePrefix ||
    url.pathname.startsWith(`${localePrefix}/`)
  ) {
    return destination
  }

  url.pathname = `${localePrefix}${url.pathname}`
  return url.href
}

/**
 * Cloudflare Pages' implicit directory redirect can emit non-ASCII tag names
 * as raw UTF-8 bytes in the Location header. Some crawlers interpret those
 * bytes as Latin-1 and follow a mojibake URL. Return an explicitly serialized
 * ASCII URL so every client reaches the canonical trailing-slash route.
 */
export function getCanonicalTagRedirectUrl(
  requestUrl: string,
  method: string,
): string | null {
  if (method !== 'GET' && method !== 'HEAD') return null

  const url = new URL(requestUrl)

  const parts = url.pathname.split('/').filter(Boolean)
  const isDefaultLocaleTag =
    parts.length === 3 && parts[0] === 'blog' && parts[1] === 'tags'
  const isLocalizedTag =
    parts.length === 4 &&
    localizedRoutePrefixes.has(parts[0]) &&
    parts[1] === 'blog' &&
    parts[2] === 'tags'

  if (!isDefaultLocaleTag && !isLocalizedTag) return null

  let tag = ''
  try {
    tag = decodeURIComponent(parts.at(-1) || '')
  } catch {
    // Keep malformed encodings on the canonical tag route instead of guessing.
  }

  const retiredDestination = RETIRED_TAG_DESTINATIONS[tag]
  if (retiredDestination) {
    const locale = isLocalizedTag ? parts[0] : ''
    const destination = new URL(
      localizeRedirectDestination(retiredDestination, locale),
    )
    destination.search = url.search
    return destination.href
  }

  if (url.pathname.endsWith('/')) return null

  url.pathname = `${url.pathname}/`
  return url.href
}
