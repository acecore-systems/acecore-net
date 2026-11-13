/**
 * サイト共通設定
 *
 * サイト名、URL、連絡先、外部サービス ID などのグローバル定数。
 * BaseLayout.astro や各コンポーネントから参照される。
 */
export const SITE = {
  /** サイト名 */
  name: 'Acecore',
  /** 法人格上の名称 */
  legalName: '株式会社Acecore',
  /** サイトの公開 URL（Cloudflare Pages） */
  url: 'https://acecore.net',
  /** 電話番号（国内表記） */
  phone: '0120-987-370',
  /** 構造化データ用の国番号付き表記（海外からの着信可否を示すものではない） */
  phoneIntl: '+81-120-987-370',
  /** お問い合わせメールアドレス */
  email: 'info@acecore.net',
  /** LINE 公式アカウント URL */
  line: 'https://lin.ee/DjIrdqj',
  /** Google Analytics 4 測定 ID */
  ga4Id: 'G-G79SGTMYEX',
  /** Cloudflare Turnstile サイトキー（お問い合わせフォーム用） */
  turnstileSiteKey: '0x4AAAAAACrIzSf3oGLj_GwT',
  /** ソーシャルリンク */
  social: {
    x: 'https://x.com/acecorenet',
    github: 'https://github.com/acecore-systems',
    systems: 'https://systems.acecore.net',
    designs: 'https://designs.acecore.net',
    aceserver: 'https://asv.acecore.net',
    store: 'https://store.acecore.net',
    discord: 'https://discord.gg/acsv',
  },
} as const
