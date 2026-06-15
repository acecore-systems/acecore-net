/**
 * サイト共通設定
 *
 * サイト名、URL、連絡先、外部サービス ID などのグローバル定数。
 * BaseLayout.astro や各コンポーネントから参照される。
 */
export const SITE = {
  /** サイト名 */
  name: 'Acecore',
  /** サイトの公開 URL（Cloudflare Pages） */
  url: 'https://acecore.net',
  /** 電話番号（国内表記） */
  phone: '050-8890-2788',
  /** 電話番号（国際表記） */
  phoneIntl: '+81-50-8890-2788',
  /** お問い合わせメールアドレス */
  email: 'info@acecore.net',
  /** LINE 公式アカウント URL */
  line: 'https://lin.ee/DjIrdqj',
  /** Google AdSense クライアント ID */
  adsenseClientId: 'ca-pub-3935803464310919',
  /** Google Analytics 4 測定 ID */
  ga4Id: 'G-G79SGTMYEX',
  /** AdSense サイドバー広告スロット ID */
  adSlotId: '3228710511',
  /** AdSense インライン（記事内）広告スロット ID */
  inlineAdSlotId: '4541792182',
  /** Cloudflare Turnstile サイトキー（お問い合わせフォーム用） */
  turnstileSiteKey: '0x4AAAAAACrIzSf3oGLj_GwT',
  /** ソーシャルリンク */
  social: {
    x: 'https://x.com/acecorenet',
    github: 'https://github.com/acecore-systems',
    systems: 'https://systems.acecore.net',
    aceserver: 'https://asv.acecore.net',
    discord: 'https://discord.gg/acsv',
  },
} as const
