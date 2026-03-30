/**
 * i18n モジュール公開 API
 *
 * ロケール設定（config.ts）と翻訳ユーティリティ（utils.ts）を
 * 単一のエントリポイントから re-export する。
 *
 * 使用例:
 *   import { t, getLocalizedUrl, type Locale } from '../i18n'
 */
export { defaultLocale, locales, localeLabels, ogLocaleMap, htmlLangMap } from './config'
export type { Locale } from './config'
export { t, getLocaleFromUrl, getLocalizedUrl, getAlternateUrls, formatDate, getDateParts, getYearMonthKey } from './utils'
