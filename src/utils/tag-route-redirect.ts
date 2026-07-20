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
  if (url.pathname.endsWith('/')) return null

  const parts = url.pathname.split('/').filter(Boolean)
  const isDefaultLocaleTag =
    parts.length === 3 && parts[0] === 'blog' && parts[1] === 'tags'
  const isLocalizedTag =
    parts.length === 4 &&
    localizedRoutePrefixes.has(parts[0]) &&
    parts[1] === 'blog' &&
    parts[2] === 'tags'

  if (!isDefaultLocaleTag && !isLocalizedTag) return null

  url.pathname = `${url.pathname}/`
  return url.href
}
