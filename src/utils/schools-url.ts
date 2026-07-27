import type { Locale } from '../i18n'

export const SCHOOLS_ORIGIN = 'https://schools.acecore.net'

export function isSchoolsSupportedLocale(locale: Locale) {
  return locale === 'ja'
}

export function getSchoolsUrl(locale: Locale, hash = '') {
  const normalizedHash =
    isSchoolsSupportedLocale(locale) && hash
      ? hash.startsWith('#')
        ? hash
        : `#${hash}`
      : ''

  return `${SCHOOLS_ORIGIN}/${normalizedHash}`
}
