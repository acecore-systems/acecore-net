import type { Locale } from '../i18n'

export const SCHOOLS_ORIGIN = 'https://schools.acecore.net'

export function getSchoolsUrl(_locale: Locale, hash = '') {
  const normalizedHash = hash ? (hash.startsWith('#') ? hash : `#${hash}`) : ''

  return `${SCHOOLS_ORIGIN}/${normalizedHash}`
}
