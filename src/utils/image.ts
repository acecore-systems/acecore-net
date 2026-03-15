/**
 * 外部画像URLをwsrv.nl経由で最適化配信する。
 * AVIF/WebP を自動選択し、Cloudflare CDN でキャッシュ。
 */
export function optimizeImage(url: string): string {
  try {
    const parsed = new URL(url)
    const w = parsed.searchParams.get('w')
    const h = parsed.searchParams.get('h')
    const origin = `${parsed.origin}${parsed.pathname}`
    const parts = [`url=${origin}`]
    if (w) parts.push(`w=${w}`)
    if (h) parts.push(`h=${h}`)
    parts.push('fit=cover', 'output=webp', 'q=70')
    return `https://wsrv.nl/?${parts.join('&')}`
  } catch {
    return url
  }
}
