import { SITE } from '../data/site'

const CLOUDFLARE_IMAGE_ORIGIN = SITE.url.replace(/\/$/, '')
const CLOUDFLARE_IMAGE_PREFIX = '/cdn-cgi/image/'

type ParsedImageSource = {
  sourceUrl: string
  width?: string
  height?: string
  quality?: string
}

type OptimizeImageOptions = {
  width?: number | string
  height?: number | string
  quality?: number | string
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
      quality: options.get('quality'),
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
  quality = '50',
): string {
  const { width, height } = dimensions
  const transformOptions: string[] = []

  if (width) transformOptions.push(`width=${width}`)
  if (height) transformOptions.push(`height=${height}`)

  transformOptions.push(`fit=${width && height ? 'cover' : 'scale-down'}`)
  transformOptions.push('format=auto', `quality=${quality}`, 'metadata=none')

  return `${CLOUDFLARE_IMAGE_ORIGIN}${CLOUDFLARE_IMAGE_PREFIX}${transformOptions.join(',')}/${sourceUrl}`
}

/**
 * 外部画像URLを Cloudflare Images のリモート変換URLに変換する。
 * 元画像は外部公開URLのまま使い、初回だけ Cloudflare が取得して以後はキャッシュされる。
 */
export function optimizeImage(url: string, overrides: OptimizeImageOptions = {}): string {
  const parsed = parseImageSource(url)
  if (!parsed) return url

  return buildCloudflareImageUrl(parsed.sourceUrl, {
    width: overrides.width != null ? String(overrides.width) : parsed.width,
    height: overrides.height != null ? String(overrides.height) : parsed.height,
  }, overrides.quality != null ? String(overrides.quality) : (parsed.quality ?? '50'))
}

/** 指定幅で Cloudflare Images URL を生成する（srcset 用） */
export function optimizeImageWithWidth(
  url: string,
  width: number,
  overrides: Pick<OptimizeImageOptions, 'quality'> = {},
): string {
  const parsed = parseImageSource(url)
  if (!parsed) return url

  return buildCloudflareImageUrl(
    parsed.sourceUrl,
    { width: String(width) },
    overrides.quality != null ? String(overrides.quality) : (parsed.quality ?? '50'),
  )
}

/** srcset 文字列を生成する */
export function generateSrcSet(
  url: string,
  widths: number[] = [480, 640, 960, 1280, 1600],
): string {
  return widths.map((w) => `${optimizeImageWithWidth(url, w)} ${w}w`).join(', ')
}
