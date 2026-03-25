import { defaultLocale, locales, type Locale } from './config'
import jaTranslations from './translations/ja.json'
import enTranslations from './translations/en.json'
import zhCnTranslations from './translations/zh-cn.json'
import esTranslations from './translations/es.json'
import ptTranslations from './translations/pt.json'
import frTranslations from './translations/fr.json'
import koTranslations from './translations/ko.json'
import deTranslations from './translations/de.json'
import ruTranslations from './translations/ru.json'

type TranslationData = typeof jaTranslations

const translations: Record<Locale, TranslationData> = {
  ja: jaTranslations,
  en: enTranslations,
  'zh-cn': zhCnTranslations,
  es: esTranslations,
  pt: ptTranslations,
  fr: frTranslations,
  ko: koTranslations,
  de: deTranslations,
  ru: ruTranslations,
}

/**
 * ネストされたオブジェクトからドット区切りのキーで値を取得
 */
function getNestedValue(obj: Record<string, unknown>, key: string): string {
  const keys = key.split('.')
  let current: unknown = obj
  for (const k of keys) {
    if (current == null || typeof current !== 'object') return key
    current = (current as Record<string, unknown>)[k]
  }
  return typeof current === 'string' ? current : key
}

/**
 * 翻訳文字列を取得する。{placeholder} 形式の変数を置換可能。
 */
export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const value = getNestedValue(translations[locale] as unknown as Record<string, unknown>, key)
  if (!params) return value
  return Object.entries(params).reduce<string>(
    (result, [k, v]) => result.replaceAll(`{${k}}`, String(v)),
    value,
  )
}

/**
 * URL パスからロケールを判定する。
 */
export function getLocaleFromUrl(url: URL | string): Locale {
  const pathname = typeof url === 'string' ? url : url.pathname
  const segments = pathname.split('/').filter(Boolean)
  const first = segments[0]
  if (first && (locales as readonly string[]).includes(first) && first !== defaultLocale) {
    return first as Locale
  }
  return defaultLocale
}

/**
 * 指定ロケール向けの URL パスを生成する。
 */
export function getLocalizedUrl(path: string, locale: Locale): string {
  // パスからロケールプレフィクスを除去
  const segments = path.split('/').filter(Boolean)
  if (segments[0] && (locales as readonly string[]).includes(segments[0]) && segments[0] !== defaultLocale) {
    segments.shift()
  }
  const cleanPath = '/' + segments.join('/')

  if (locale === defaultLocale) return cleanPath
  return `/${locale}${cleanPath}`
}

/**
 * hreflang 等で使う全ロケールの代替 URL を返す。
 */
export function getAlternateUrls(path: string, siteUrl: string): { locale: Locale; url: string }[] {
  return locales.map((locale) => ({
    locale,
    url: `${siteUrl.replace(/\/$/, '')}${getLocalizedUrl(path, locale)}`,
  }))
}

/**
 * 日付をロケールに合わせてフォーマットする。
 */
export function formatDate(date: Date, locale: Locale): string {
  const localeMap: Record<Locale, string> = {
    ja: 'ja-JP',
    en: 'en-US',
    'zh-cn': 'zh-CN',
    es: 'es-ES',
    pt: 'pt-BR',
    fr: 'fr-FR',
    ko: 'ko-KR',
    de: 'de-DE',
    ru: 'ru-RU',
  }
  return date.toLocaleDateString(localeMap[locale], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * タグ名をロケールに合わせて翻訳する。tags マップに未定義ならそのまま返す。
 */
export function translateTag(tag: string, locale: Locale): string {
  const translated = getNestedValue(
    translations[locale] as unknown as Record<string, unknown>,
    `tags.${tag}`,
  )
  return translated !== `tags.${tag}` ? translated : tag
}
