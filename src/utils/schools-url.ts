export const SCHOOLS_ORIGIN = 'https://schools.acecore.net'

export function getSchoolsUrl(hash = '') {
  const normalizedHash = hash ? (hash.startsWith('#') ? hash : `#${hash}`) : ''

  return `${SCHOOLS_ORIGIN}/${normalizedHash}`
}
