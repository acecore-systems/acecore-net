export const SCHOOLS_ORIGIN = 'https://schools.acecore.net'

export function getSchoolsUrl(pathOrHash = '') {
  if (!pathOrHash) {
    return `${SCHOOLS_ORIGIN}/`
  }

  if (pathOrHash.startsWith('#')) {
    return `${SCHOOLS_ORIGIN}/${pathOrHash}`
  }

  const normalizedPath = pathOrHash.startsWith('/')
    ? pathOrHash
    : `/${pathOrHash}`

  return `${SCHOOLS_ORIGIN}${normalizedPath}`
}
