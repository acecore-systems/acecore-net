import type { Locale } from '../i18n'

export const SEO_TITLE_LENGTH = { min: 15, max: 70 } as const
export const SEO_DESCRIPTION_LENGTH = { min: 50, max: 160 } as const

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

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function countCharacters(value: string): number {
  return Array.from(value).length
}

function trimTrailingSeparator(value: string): string {
  return value.replace(/[\s,;:!?、。・，；：！？…—–-]+$/u, '').trimEnd()
}

function truncateAtWordBoundary(
  value: string,
  maxLength: number,
  locale: Locale,
): string {
  const normalized = normalizeWhitespace(value)
  if (countCharacters(normalized) <= maxLength) return normalized

  const ellipsis = '…'
  const contentLimit = maxLength - countCharacters(ellipsis)
  const segmenter = new Intl.Segmenter(localeMap[locale], {
    granularity: 'word',
  })
  let candidate = ''

  for (const { segment } of segmenter.segment(normalized)) {
    if (countCharacters(candidate + segment) > contentLimit) break
    candidate += segment
  }

  if (countCharacters(candidate.trim()) < Math.floor(contentLimit * 0.6)) {
    candidate = Array.from(normalized).slice(0, contentLimit).join('')
  }

  return `${trimTrailingSeparator(candidate)}${ellipsis}`
}

function truncateTitleWithContext(
  value: string,
  maxLength: number,
  locale: Locale,
): string {
  const normalized = normalizeWhitespace(value)
  if (countCharacters(normalized) <= maxLength) return normalized

  const ellipsis = locale === 'ja' || locale === 'zh-cn' ? '…' : '… '
  const contentLimit = maxLength - countCharacters(ellipsis)
  const startLimit = Math.ceil(contentLimit * 0.65)
  const endLimit = contentLimit - startLimit
  const segments = Array.from(
    new Intl.Segmenter(localeMap[locale], { granularity: 'word' }).segment(
      normalized,
    ),
    ({ segment }) => segment,
  )
  let start = ''
  let end = ''

  for (const segment of segments) {
    if (countCharacters(start + segment) > startLimit) break
    start += segment
  }

  for (const segment of segments.toReversed()) {
    if (countCharacters(segment + end) > endLimit) break
    end = segment + end
  }

  if (countCharacters(start.trim()) < Math.floor(startLimit * 0.6)) {
    start = Array.from(normalized).slice(0, startLimit).join('')
  }
  if (countCharacters(end.trim()) === 0) {
    end = Array.from(normalized).slice(-endLimit).join('')
  }

  return `${trimTrailingSeparator(start)}${ellipsis}${end
    .replace(/^[\s,;:!?、。・，；：！？…—–-]+/u, '')
    .trimStart()}`
}

function truncateDescriptionAtSentenceBoundary(
  value: string,
  locale: Locale,
): string {
  const normalized = normalizeWhitespace(value)
  if (countCharacters(normalized) <= SEO_DESCRIPTION_LENGTH.max) {
    return normalized
  }

  const segmenter = new Intl.Segmenter(localeMap[locale], {
    granularity: 'sentence',
  })
  let candidate = ''

  for (const { segment } of segmenter.segment(normalized)) {
    if (countCharacters(candidate + segment) > SEO_DESCRIPTION_LENGTH.max) {
      break
    }
    candidate += segment
  }

  const completeSentences = candidate.trim()
  if (countCharacters(completeSentences) >= SEO_DESCRIPTION_LENGTH.min) {
    return completeSentences
  }

  return truncateAtWordBoundary(normalized, SEO_DESCRIPTION_LENGTH.max, locale)
}

interface BuildSeoTitleOptions {
  title: string
  titleContext?: string
  siteTitle: string
  shortTitleContext: string
  locale: Locale
  isHome: boolean
}

export function buildSeoTitle({
  title,
  titleContext,
  siteTitle,
  shortTitleContext,
  locale,
  isHome,
}: BuildSeoTitleOptions): string {
  if (isHome) {
    return truncateAtWordBoundary(siteTitle, SEO_TITLE_LENGTH.max, locale)
  }

  const brandSuffix = ' | Acecore'
  const titleLimit = SEO_TITLE_LENGTH.max - countCharacters(brandSuffix)
  const normalizedTitle = normalizeWhitespace(title)
  const normalizedTitleContext = titleContext
    ? normalizeWhitespace(titleContext)
    : ''
  const contextSeparator = ' – '
  const contextLimit =
    titleLimit -
    countCharacters(normalizedTitle) -
    countCharacters(contextSeparator)
  const conciseTitle =
    normalizedTitleContext && contextLimit >= 8
      ? `${normalizedTitle}${contextSeparator}${truncateAtWordBoundary(
          normalizedTitleContext,
          contextLimit,
          locale,
        )}`
      : truncateTitleWithContext(normalizedTitle, titleLimit, locale)
  let pageTitle = `${conciseTitle}${brandSuffix}`

  if (countCharacters(pageTitle) < SEO_TITLE_LENGTH.min) {
    pageTitle = `${pageTitle} ${shortTitleContext}`
  }

  return truncateAtWordBoundary(pageTitle, SEO_TITLE_LENGTH.max, locale)
}

interface BuildSeoDescriptionOptions {
  description: string
  shortDescriptionContext: string
  locale: Locale
}

export function buildSeoDescription({
  description,
  shortDescriptionContext,
  locale,
}: BuildSeoDescriptionOptions): string {
  let pageDescription = normalizeWhitespace(description)

  if (countCharacters(pageDescription) < SEO_DESCRIPTION_LENGTH.min) {
    pageDescription = `${pageDescription} ${shortDescriptionContext}`
  }

  return truncateDescriptionAtSentenceBoundary(pageDescription, locale)
}
