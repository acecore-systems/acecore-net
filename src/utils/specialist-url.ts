import { defaultLocale, type Locale } from '../i18n/config.ts'

/**
 * Specialist sites use the same locale prefixes as acecore.net.
 * Keep the existing unprefixed Japanese routes and add the active locale for
 * every translated route.
 */
export function getSpecialistUrl(
  origin: string,
  locale: Locale,
  pathOrHash = '',
): string {
  const normalizedOrigin = origin.replace(/\/+$/, '')
  const suffix = pathOrHash.startsWith('#')
    ? `/${pathOrHash}`
    : pathOrHash
      ? pathOrHash.startsWith('/')
        ? pathOrHash
        : `/${pathOrHash}`
      : ''

  if (locale === defaultLocale) {
    return `${normalizedOrigin}${suffix}`
  }

  return `${normalizedOrigin}/${locale}${suffix || '/'}`
}
