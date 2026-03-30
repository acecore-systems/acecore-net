/**
 * OG 画像生成モジュール
 *
 * ブログ記事のタイトルから動的に Open Graph 画像（1200×630px PNG）を生成する。
 * Satori でタイトルテキストを SVG にレンダリングし、Sharp で PNG に変換する。
 *
 * フォント: Noto Sans JP（Bold 700）を CDN から取得しメモリにキャッシュする。
 * デザイン: Acecore ブランドカラーのグラデーション背景にタイトルを白文字で表示する。
 */
import satori from 'satori'
import sharp from 'sharp'

/** Noto Sans JP Bold フォントの CDN URL */
const FONT_URL =
  'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-700-normal.ttf'
/** フォントデータのメモリキャッシュ（ビルド中に 1 度だけフェッチ） */
let fontCache: ArrayBuffer | null = null

/** フォントデータをフェッチしキャッシュに保存する */
async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache
  const res = await fetch(FONT_URL)
  fontCache = await res.arrayBuffer()
  return fontCache
}

/**
 * Satori がレンダリングできない特殊 Unicode 文字を安全な代替文字に置換する。
 * ダッシュ類（—, –, ―）やスマートクォート（'' ""）が対象。
 */
function sanitizeForFont(text: string): string {
  return text
    .replace(/[\u2015\u2014\u2013]/g, ' - ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
}

/**
 * ブログ記事タイトルから OG 画像（1200×630px PNG）を生成する。
 * タイトルが 30 文字を超える場合はフォントサイズを自動で縮小する。
 */
export async function generateOgImage(title: string): Promise<Buffer> {
  const safeTitle = sanitizeForFont(title)
  const fontData = await loadFont()

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '60px 80px',
          background:
            'linear-gradient(135deg, #1e3a5f 0%, #264b7d 50%, #3b6fb5 100%)',
          fontFamily: 'Noto Sans JP',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '40px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    },
                    children: {
                      type: 'div',
                      props: {
                        style: {
                          width: '18px',
                          height: '18px',
                          background: 'white',
                          transform: 'rotate(45deg)',
                        },
                      },
                    },
                  },
                },
                {
                  type: 'span',
                  props: {
                    style: {
                      fontSize: '28px',
                      color: 'rgba(255,255,255,0.8)',
                      letterSpacing: '2px',
                    },
                    children: 'Acecore',
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontSize: safeTitle.length > 30 ? '44px' : '52px',
                fontWeight: 700,
                color: 'white',
                lineHeight: 1.4,
                maxWidth: '1040px',
                wordBreak: 'break-word',
              },
              children: safeTitle,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                position: 'absolute',
                bottom: '50px',
                right: '80px',
                fontSize: '20px',
                color: 'rgba(255,255,255,0.5)',
              },
              children: 'acecore.net',
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: 'Noto Sans JP',
          data: fontData,
          weight: 700,
          style: 'normal',
        },
      ],
    },
  )

  return sharp(Buffer.from(svg)).png().toBuffer()
}
