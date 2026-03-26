import { SITE } from '../data/site'

const CLOUDFLARE_IMAGE_ORIGIN = SITE.url.replace(/\/$/, '')
const CLOUDFLARE_IMAGE_PREFIX = '/cdn-cgi/image/'

type ParsedImageSource = {
  sourceUrl: string
  width?: string
  height?: string
}

function parseCloudflareImageUrl(url: string): ParsedImageSource | null {
  try {
    const parsed = new URL(url, CLOUDFLARE_IMAGE_ORIGIN)
    if (!parsed.pathname.startsWith(CLOUDFLARE_IMAGE_PREFIX)) return null

    const body = parsed.pathname.slice(CLOUDFLARE_IMAGE_PREFIX.length)
    const slashIndex = body.indexOf('/')
    if (slashIndex === -1) return null

    const optionText = body.slice(0, slashIndex)
    const sourceUrl = `${body.slice(slashIndex + 1)}${parsed.search}`
    if (!sourceUrl.startsWith('http://') && !sourceUrl.startsWith('https://')) {
      return null
    }

    const options = new Map(
      optionText
        .split(',')
        .map((entry) => entry.split('='))
        .filter((entry): entry is [string, string] => entry.length === 2),
    )

    return {
      sourceUrl,
      width: options.get('width'),
      height: options.get('height'),
    }
  } catch {
    return null
  }
}

function parseImageSource(url: string): ParsedImageSource | null {
  const cloudflareImage = parseCloudflareImageUrl(url)
  if (cloudflareImage) return cloudflareImage

  try {
    const parsed = new URL(url)
    return {
      sourceUrl: parsed.toString(),
      width: parsed.searchParams.get('w') ?? undefined,
      height: parsed.searchParams.get('h') ?? undefined,
    }
  } catch {
    return null
  }
}

function buildCloudflareImageUrl(
  sourceUrl: string,
  dimensions: { width?: string; height?: string },
): string {
  const { width, height } = dimensions
  const options: string[] = []

  if (width) options.push(`width=${width}`)
  if (height) options.push(`height=${height}`)

  options.push(`fit=${width && height ? 'cover' : 'scale-down'}`)
  options.push('format=auto', 'quality=50', 'metadata=none')

  return `${CLOUDFLARE_IMAGE_ORIGIN}${CLOUDFLARE_IMAGE_PREFIX}${options.join(',')}/${sourceUrl}`
}

/**
 * 外部画像URLを Cloudflare Images のリモート変換URLに変換する。
 * 元画像は外部公開URLのまま使い、初回だけ Cloudflare が取得して以後はキャッシュされる。
 */
export function optimizeImage(url: string): string {
  const parsed = parseImageSource(url)
  if (!parsed) return url

  return buildCloudflareImageUrl(parsed.sourceUrl, {
    width: parsed.width,
    height: parsed.height,
  })
}

/** 指定幅で Cloudflare Images URL を生成する（srcset 用） */
export function optimizeImageWithWidth(url: string, width: number): string {
  const parsed = parseImageSource(url)
  if (!parsed) return url

  return buildCloudflareImageUrl(parsed.sourceUrl, { width: String(width) })
}

/** srcset 文字列を生成する */
export function generateSrcSet(
  url: string,
  widths: number[] = [480, 640, 960, 1280, 1600],
): string {
  return widths.map((w) => `${optimizeImageWithWidth(url, w)} ${w}w`).join(', ')
}
