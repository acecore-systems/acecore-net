/**
 * i18n ロケール設定
 *
 * サイト全体で使用するロケール定義と各種マッピングを提供する。
 * - defaultLocale: デフォルト言語（日本語）
 * - locales: サポートする全ロケールの配列
 * - localeLabels: 言語切替 UI 用のロケール表示名
 * - ogLocaleMap: Open Graph meta タグ用のロケールコード
 * - htmlLangMap: HTML lang 属性用の言語コード
 */

/** サイトのデフォルトロケール（日本語） */
export const defaultLocale = 'ja' as const

/** サポートする全ロケールの一覧 */
export const locales = ['ja', 'en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru'] as const

/** ロケール型（サポートする全言語のユニオン型） */
export type Locale = (typeof locales)[number]

/** 言語切替 UI に表示するロケール別の表示名 */
export const localeLabels: Record<Locale, string> = {
  ja: '日本語',
  en: 'English',
  'zh-cn': '简体中文',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  ko: '한국어',
  de: 'Deutsch',
  ru: 'Русский',
}

/** og:locale 用マッピング */
export const ogLocaleMap: Record<Locale, string> = {
  ja: 'ja_JP',
  en: 'en_US',
  'zh-cn': 'zh_CN',
  es: 'es_ES',
  pt: 'pt_BR',
  fr: 'fr_FR',
  ko: 'ko_KR',
  de: 'de_DE',
  ru: 'ru_RU',
}

/** html lang 属性用マッピング */
export const htmlLangMap: Record<Locale, string> = {
  ja: 'ja',
  en: 'en',
  'zh-cn': 'zh-CN',
  es: 'es',
  pt: 'pt',
  fr: 'fr',
  ko: 'ko',
  de: 'de',
  ru: 'ru',
}
