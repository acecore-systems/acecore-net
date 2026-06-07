/**
 * Cloudflare Images 画像最適化ユーティリティ
 *
 * 外部画像 URL やローカル画像パスを Cloudflare Images の変換 URL に変換する。
 * /cdn-cgi/image/ エンドポイントを使用して、サイズ変更・フォーマット変換・品質調整を行う。
 *
 * 主要関数:
 *   - optimizeImage(): 画像 URL を最適化 URL に変換
 *   - optimizeImageWithWidth(): 指定幅で最適化（srcset 生成用）
 *   - generateSrcSet(): レスポンシブ画像用の srcset 文字列を生成
 *   - resolveImageSource(): 複数候補から最初の有効な画像 URL を返す
 */
import { SITE } from '../data/site'

/** Cloudflare Images のベースオリジン URL */
const CLOUDFLARE_IMAGE_ORIGIN = SITE.url.replace(/\/$/, '')
/** Cloudflare Images 変換 API のパスプレフィクス */
const CLOUDFLARE_IMAGE_PREFIX = '/cdn-cgi/image/'
/** 通常画像の画質。高DPI環境の粗さを抑えつつ転送量を増やしすぎない値にする。 */
const DEFAULT_IMAGE_QUALITY = '75'
/** 外部画像ソースの取得元を上げる上限。Cloudflare 変換後の表示幅とは別に扱う。 */
const REMOTE_SOURCE_MAX_WIDTH = 1600
const REMOTE_SOURCE_MAX_HEIGHT = 1600
/** 自社管理の公開画像で、Cloudflare 変換を通さず直接配信するオリジン */
const DIRECT_IMAGE_ORIGINS = new Set(['https://asv.acecore.net'])

/** パース済み画像ソースの情報（元 URL とオプションのサイズ・品質） */
type ParsedImageSource = {
  sourceUrl: string
  width?: string
  height?: string
  quality?: string
}

/** optimizeImage() に渡すオプション */
type OptimizeImageOptions = {
  width?: number | string
  height?: number | string
  quality?: number | string
}

export type GenerateSrcSetOptions = Pick<OptimizeImageOptions, 'quality'> & {
  aspectRatio?: number
}

/**
 * 複数の画像 URL 候補から最初の有効な文字列を返す。
 * uploadedImage / image フィールドのフォールバック解決に使用する。
 */
export function resolveImageSource(
  ...candidates: Array<string | null | undefined>
): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const normalized = candidate.trim()
    if (normalized) return normalized
  }

  return undefined
}

/**
 * Cloudflare Images 変換 URL をパースし、元の画像 URL とオプションを抽出する。
 * /cdn-cgi/image/ で始まる URL のみ処理し、それ以外は null を返す。
 */
function parseCloudflareImageUrl(url: string): ParsedImageSource | null {
  try {
    const parsed = new URL(url, CLOUDFLARE_IMAGE_ORIGIN)
    if (!parsed.pathname.startsWith(CLOUDFLARE_IMAGE_PREFIX)) return null

    const body = parsed.pathname.slice(CLOUDFLARE_IMAGE_PREFIX.length)
    const slashIndex = body.indexOf('/')
    if (slashIndex === -1) return null

    const optionText = body.slice(0, slashIndex)
    const sourceUrlText = `${body.slice(slashIndex + 1)}${parsed.search}`
    const sourceUrl =
      sourceUrlText.startsWith('http://') ||
      sourceUrlText.startsWith('https://')
        ? sourceUrlText
        : `/${sourceUrlText.replace(/^\/+/, '')}`

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

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function normalizeRemoteImageSourceUrl(
  sourceUrl: string,
  dimensions: { width?: string; height?: string },
): string {
  const parsed = new URL(sourceUrl)
  if (parsed.hostname !== 'images.unsplash.com') return parsed.toString()

  const sourceWidth = parsePositiveInteger(
    parsed.searchParams.get('w') ?? undefined,
  )
  const sourceHeight = parsePositiveInteger(
    parsed.searchParams.get('h') ?? undefined,
  )
  const requestedWidth = parsePositiveInteger(dimensions.width)
  const requestedHeight = parsePositiveInteger(dimensions.height)

  const targetWidth = requestedWidth
    ? Math.min(requestedWidth, REMOTE_SOURCE_MAX_WIDTH)
    : sourceWidth
      ? Math.min(sourceWidth * 2, REMOTE_SOURCE_MAX_WIDTH)
      : undefined
  const targetHeight = requestedHeight
    ? Math.min(requestedHeight, REMOTE_SOURCE_MAX_HEIGHT)
    : sourceWidth && sourceHeight && targetWidth
      ? Math.round((sourceHeight * targetWidth) / sourceWidth)
      : undefined

  if (!targetWidth) return parsed.toString()

  parsed.searchParams.set('w', String(targetWidth))

  if (targetHeight) {
    parsed.searchParams.set('h', String(targetHeight))
    if (!parsed.searchParams.has('fit')) {
      parsed.searchParams.set('fit', 'crop')
    }
  }

  return parsed.toString()
}

/**
 * 画像 URL をパースし、元のソース URL と既存のサイズ・品質パラメータを抽出する。
 * Cloudflare Images URL → 通常の URL の順にパースを試行する。
 */
function parseImageSource(url: string): ParsedImageSource | null {
  const cloudflareImage = parseCloudflareImageUrl(url)
  if (cloudflareImage) return cloudflareImage

  try {
    const parsed = new URL(url, CLOUDFLARE_IMAGE_ORIGIN)
    const isLocalOrigin = parsed.origin === CLOUDFLARE_IMAGE_ORIGIN
    const width = parsed.searchParams.get('w') ?? undefined
    const height = parsed.searchParams.get('h') ?? undefined

    return {
      sourceUrl: isLocalOrigin
        ? `${parsed.pathname}${parsed.search}`
        : parsed.toString(),
      width,
      height,
      quality: parsed.searchParams.get('q') ?? undefined,
    }
  } catch {
    return null
  }
}

/**
 * Cloudflare Images 変換 URL を組み立てる。
 * fit はサイズ指定に応じて cover（幅高さ両方）または scale-down（片方のみ）を選択する。
 * 出力フォーマットは自動（WebP/AVIF）、メタデータは除去する。
 */
function buildCloudflareImageUrl(
  sourceUrl: string,
  dimensions: { width?: string; height?: string },
  quality = DEFAULT_IMAGE_QUALITY,
): string {
  if (sourceUrl.startsWith('/')) {
    return sourceUrl
  }

  const { width, height } = dimensions
  const transformOptions: string[] = []

  if (width) transformOptions.push(`width=${width}`)
  if (height) transformOptions.push(`height=${height}`)

  transformOptions.push(`fit=${width && height ? 'cover' : 'scale-down'}`)
  transformOptions.push('format=auto', `quality=${quality}`, 'metadata=none')

  const normalizedSourceUrl = normalizeRemoteImageSourceUrl(
    sourceUrl,
    dimensions,
  )
  const separator = sourceUrl.startsWith('/') ? '' : '/'
  const transformOrigin = normalizedSourceUrl.startsWith('/')
    ? ''
    : CLOUDFLARE_IMAGE_ORIGIN

  return `${transformOrigin}${CLOUDFLARE_IMAGE_PREFIX}${transformOptions.join(',')}${separator}${normalizedSourceUrl}`
}

/**
 * 外部画像URLまたはCloudflare変換URLを最適化済みURLに変換する。
 * ルート相対のローカル画像や自社管理の公開画像は、開発・プレビュー環境でも読めるよう直接配信する。
 */
function isTrustedDirectImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return (
      DIRECT_IMAGE_ORIGINS.has(parsed.origin) &&
      parsed.pathname.startsWith('/uploads/')
    )
  } catch {
    return false
  }
}

function shouldServeDirectly(url: string): boolean {
  return (
    (url.startsWith('/') &&
      !url.startsWith('//') &&
      !url.startsWith(CLOUDFLARE_IMAGE_PREFIX)) ||
    isTrustedDirectImageUrl(url)
  )
}

export function optimizeImage(
  url: string,
  overrides: OptimizeImageOptions = {},
): string {
  if (shouldServeDirectly(url)) return url

  const parsed = parseImageSource(url)
  if (!parsed) return url

  return buildCloudflareImageUrl(
    parsed.sourceUrl,
    {
      width: overrides.width != null ? String(overrides.width) : parsed.width,
      height:
        overrides.height != null ? String(overrides.height) : parsed.height,
    },
    overrides.quality != null
      ? String(overrides.quality)
      : (parsed.quality ?? DEFAULT_IMAGE_QUALITY),
  )
}

/** 指定幅で Cloudflare Images URL を生成する（srcset 用） */
export function optimizeImageWithWidth(
  url: string,
  width: number,
  overrides: GenerateSrcSetOptions = {},
): string {
  if (shouldServeDirectly(url)) return url

  const parsed = parseImageSource(url)
  if (!parsed) return url
  const height =
    overrides.aspectRatio && overrides.aspectRatio > 0
      ? String(Math.round(width / overrides.aspectRatio))
      : undefined

  return buildCloudflareImageUrl(
    parsed.sourceUrl,
    { width: String(width), height },
    overrides.quality != null
      ? String(overrides.quality)
      : (parsed.quality ?? DEFAULT_IMAGE_QUALITY),
  )
}

/** srcset 文字列を生成する */
export function generateSrcSet(
  url: string,
  widths: number[] = [480, 640, 960, 1280, 1600],
  options: GenerateSrcSetOptions = {},
): string {
  if (shouldServeDirectly(url)) {
    const maxWidth = widths[widths.length - 1]
    return maxWidth ? `${url} ${maxWidth}w` : url
  }

  return widths
    .map((w) => `${optimizeImageWithWidth(url, w, options)} ${w}w`)
    .join(', ')
}
