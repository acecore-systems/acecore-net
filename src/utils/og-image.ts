import satori from 'satori'
import sharp from 'sharp'

const FONT_URL = 'https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-jp@latest/japanese-700-normal.ttf'
let fontCache: ArrayBuffer | null = null

async function loadFont(): Promise<ArrayBuffer> {
  if (fontCache) return fontCache
  const res = await fetch(FONT_URL)
  fontCache = await res.arrayBuffer()
  return fontCache
}

export async function generateOgImage(title: string): Promise<Buffer> {
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
          background: 'linear-gradient(135deg, #1e3a5f 0%, #264b7d 50%, #3b6fb5 100%)',
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
                      fontSize: '24px',
                      color: 'white',
                    },
                    children: '✦',
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
                fontSize: title.length > 30 ? '44px' : '52px',
                fontWeight: 700,
                color: 'white',
                lineHeight: 1.4,
                maxWidth: '1040px',
                wordBreak: 'break-word',
              },
              children: title,
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
