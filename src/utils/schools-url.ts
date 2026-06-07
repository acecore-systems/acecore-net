import { defaultLocale, type Locale } from '../i18n'

export const SCHOOLS_ORIGIN = 'https://schools.acecore.net'

export function getSchoolsUrl(locale: Locale, hash = '') {
  const localePath = locale === defaultLocale ? '/' : `/${locale}/`
  const normalizedHash = hash ? (hash.startsWith('#') ? hash : `#${hash}`) : ''

  return `${SCHOOLS_ORIGIN}${localePath}${normalizedHash}`
}
