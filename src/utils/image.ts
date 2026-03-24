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
    parts.push('fit=cover', 'output=auto', 'q=50')
    return `https://wsrv.nl/?${parts.join('&')}`
  } catch {
    return url
  }
}

/** 指定幅で wsrv.nl URL を生成する（srcset 用） */
export function optimizeImageWithWidth(url: string, width: number): string {
  try {
    const parsed = new URL(url)
    // 既に wsrv.nl URL の場合は元画像URLを取り出して再構築
    if (parsed.hostname === 'wsrv.nl') {
      const originalUrl = parsed.searchParams.get('url')
      if (originalUrl) {
        return `https://wsrv.nl/?url=${originalUrl}&w=${width}&fit=cover&output=auto&q=50`
      }
    }
    const origin = `${parsed.origin}${parsed.pathname}`
    return `https://wsrv.nl/?url=${origin}&w=${width}&fit=cover&output=auto&q=50`
  } catch {
    return url
  }
}

/** srcset 文字列を生成する */
export function generateSrcSet(
  url: string,
  widths: number[] = [480, 640, 960, 1280, 1600],
): string {
  return widths.map((w) => `${optimizeImageWithWidth(url, w)} ${w}w`).join(', ')
}
