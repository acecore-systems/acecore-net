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

    return {
      sourceUrl: isLocalOrigin
        ? `${parsed.pathname}${parsed.search}`
        : parsed.toString(),
      width: parsed.searchParams.get('w') ?? undefined,
      height: parsed.searchParams.get('h') ?? undefined,
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
  quality = '50',
): string {
  if (import.meta.env.DEV && sourceUrl.startsWith('/')) {
    return sourceUrl
  }

  const { width, height } = dimensions
  const transformOptions: string[] = []

  if (width) transformOptions.push(`width=${width}`)
  if (height) transformOptions.push(`height=${height}`)

  transformOptions.push(`fit=${width && height ? 'cover' : 'scale-down'}`)
  transformOptions.push('format=auto', `quality=${quality}`, 'metadata=none')

  const separator = sourceUrl.startsWith('/') ? '' : '/'

  return `${CLOUDFLARE_IMAGE_ORIGIN}${CLOUDFLARE_IMAGE_PREFIX}${transformOptions.join(',')}${separator}${sourceUrl}`
}

/**
 * 外部画像URLまたはローカル画像パスを Cloudflare Images の変換URLに変換する。
 * 外部URLはリモート取得、ローカル画像は同一オリジン画像として最適化配信する。
 */
export function optimizeImage(
  url: string,
  overrides: OptimizeImageOptions = {},
): string {
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
      : (parsed.quality ?? '50'),
  )
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
    overrides.quality != null
      ? String(overrides.quality)
      : (parsed.quality ?? '50'),
  )
}

/** srcset 文字列を生成する */
export function generateSrcSet(
  url: string,
  widths: number[] = [480, 640, 960, 1280, 1600],
): string {
  return widths.map((w) => `${optimizeImageWithWidth(url, w)} ${w}w`).join(', ')
}
