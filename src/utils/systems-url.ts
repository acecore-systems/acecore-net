import { SITE } from '../data/site'

export const SYSTEMS_ORIGIN = SITE.social.systems

export function getSystemsUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`

  return `${SYSTEMS_ORIGIN}${normalizedPath}`
}
