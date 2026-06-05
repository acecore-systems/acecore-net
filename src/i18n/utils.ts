/**
 * i18n 翻訳・ロケールユーティリティ
 *
 * 翻訳文字列の取得、URL のロケール変換、日付フォーマットなど
 * 多言語対応に必要な主要関数を提供する。
 *
 * 翻訳データ: 日本語は src/i18n/source/ja/、他言語は src/i18n/translations/ から静的にインポートする。
 * タイムゾーン: 日付はすべて Asia/Tokyo (JST) で表示する。
 */
import { defaultLocale, locales, type Locale } from './config'
import jaTranslations from './source/ja'
import enTranslations from './translations/en.json'
import zhCnTranslations from './translations/zh-cn.json'
import esTranslations from './translations/es.json'
import ptTranslations from './translations/pt.json'
import frTranslations from './translations/fr.json'
import koTranslations from './translations/ko.json'
import deTranslations from './translations/de.json'
import ruTranslations from './translations/ru.json'

/** 日本語翻訳を基準型として使用する */
type TranslationData = typeof jaTranslations

/** 全ロケールの翻訳データマップ */
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

/** 日付表示に使用するタイムゾーン（日本標準時） */
const BLOG_TIME_ZONE = 'Asia/Tokyo'

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
export function t(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>,
): string {
  const value = getNestedValue(
    translations[locale] as unknown as Record<string, unknown>,
    key,
  )
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
  if (
    first &&
    (locales as readonly string[]).includes(first) &&
    first !== defaultLocale
  ) {
    return first as Locale
  }
  return defaultLocale
}

/**
 * 指定ロケール向けの URL パスを生成する。
 */
export function getLocalizedUrl(path: string, locale: Locale): string {
  const hasTrailingSlash = path.length > 1 && path.endsWith('/')
  // パスからロケールプレフィクスを除去
  const segments = path.split('/').filter(Boolean)
  if (
    segments[0] &&
    (locales as readonly string[]).includes(segments[0]) &&
    segments[0] !== defaultLocale
  ) {
    segments.shift()
  }
  const cleanPath = '/' + segments.join('/')
  const normalizedPath =
    hasTrailingSlash && cleanPath !== '/' ? `${cleanPath}/` : cleanPath

  if (locale === defaultLocale) return normalizedPath
  return `/${locale}${normalizedPath}`
}

/**
 * hreflang 等で使う全ロケールの代替 URL を返す。
 */
export function getAlternateUrls(
  path: string,
  siteUrl: string,
): { locale: Locale; url: string }[] {
  return locales.map((locale) => ({
    locale,
    url: `${siteUrl.replace(/\/$/, '')}${getLocalizedUrl(path, locale)}`,
  }))
}

type DateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
}

/** 日付に時刻部分（0 時 0 分以外）があるかどうかを判定する */
function hasTime(date: Date): boolean {
  const { hour, minute } = getDateParts(date)
  return hour !== 0 || minute !== 0
}

/**
 * Date オブジェクトから JST ベースの年・月・日・時・分を取得する。
 * Intl.DateTimeFormat を使用して正確なタイムゾーン変換を行う。
 */
export function getDateParts(date: Date): DateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BLOG_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
  }
}

/** 日付から "YYYY-MM" 形式の年月キーを生成する（アーカイブページ用） */
export function getYearMonthKey(date: Date): string {
  const { year, month } = getDateParts(date)
  return `${year}-${String(month).padStart(2, '0')}`
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

  const baseOptions: Intl.DateTimeFormatOptions = {
    timeZone: BLOG_TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }

  return hasTime(date)
    ? date.toLocaleString(localeMap[locale], {
        ...baseOptions,
        hour: '2-digit',
        minute: '2-digit',
      })
    : date.toLocaleDateString(localeMap[locale], baseOptions)
}
