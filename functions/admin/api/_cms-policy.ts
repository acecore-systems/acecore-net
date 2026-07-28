export const CMS_REPOSITORY = {
  owner: 'acecore-systems',
  name: 'acecore-net',
  branch: 'main',
} as const

const CONTENT_RULES = [
  { prefix: 'src/content/blog/', extension: '.md', recursive: false },
  { prefix: 'src/content/authors/', extension: '.json', recursive: false },
  { prefix: 'src/content/tags/', extension: '.json', recursive: false },
  {
    prefix: 'src/i18n/source/ja/campaigns/',
    extension: '.json',
    recursive: false,
  },
] as const

const DELETABLE_CONTENT_RULES = [
  { prefix: 'src/content/blog/', extension: '.md', recursive: false },
  {
    prefix: 'src/i18n/source/ja/campaigns/',
    extension: '.json',
    recursive: false,
  },
] as const

const CONTENT_FILES = new Set([
  'src/i18n/source/ja/common.json',
  'src/i18n/source/ja/blog.json',
  'src/i18n/source/ja/pages/home.json',
  'src/i18n/source/ja/pages/services.json',
  'src/i18n/source/ja/pages/pricing.json',
  'src/i18n/source/ja/pages/about.json',
  'src/i18n/source/ja/pages/contact.json',
  'src/i18n/source/ja/pages/acestudio.json',
  'src/i18n/source/ja/pages/privacy.json',
  'src/i18n/source/ja/pages/not-found.json',
])

const MEDIA_PREFIX = 'public/uploads/'
const MAX_CMS_PATH_LENGTH = 240
const MEDIA_EXTENSIONS = new Set([
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.webp',
])

export function normalizeCmsPath(path: string | null) {
  if (path === null || /[\u0000-\u001f\u007f]/.test(path)) return null

  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '')

  if (normalized === '') return ''
  if (normalized.length > MAX_CMS_PATH_LENGTH) return null

  const segments = normalized.split('/')

  if (
    segments.some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    return null
  }

  return segments.join('/')
}

export function isAllowedCmsWritePath(path: string) {
  if (normalizeCmsPath(path) !== path) return false

  if (CONTENT_FILES.has(path)) return true

  if (CONTENT_RULES.some((rule) => matchesContentRule(path, rule))) {
    return true
  }

  if (!path.startsWith(MEDIA_PREFIX)) return false

  return MEDIA_EXTENSIONS.has(getExtension(path))
}

export function isAllowedCmsDeletePath(path: string) {
  if (normalizeCmsPath(path) !== path) return false

  return DELETABLE_CONTENT_RULES.some((rule) => matchesContentRule(path, rule))
}

export function isAllowedCmsDirectoryPath(path: string) {
  if (normalizeCmsPath(path) !== path) return false
  if (path === '') return true

  if (isDirectoryAllowedByRoot(path, MEDIA_PREFIX.slice(0, -1), true)) {
    return true
  }

  if (
    CONTENT_RULES.some(({ prefix, recursive }) => {
      return isDirectoryAllowedByRoot(path, prefix.slice(0, -1), recursive)
    })
  ) {
    return true
  }

  return Array.from(CONTENT_FILES, (filePath) =>
    getDirectoryName(filePath),
  ).some((root) => isDirectoryAllowedByRoot(path, root, false))
}

export function encodePathSegments(path: string) {
  return path.split('/').map(encodeURIComponent).join('/')
}

function getDirectoryName(path: string) {
  return path.split('/').slice(0, -1).join('/')
}

function matchesContentRule(
  path: string,
  {
    prefix,
    extension,
    recursive,
  }: {
    prefix: string
    extension: string
    recursive: boolean
  },
) {
  if (!path.startsWith(prefix) || !path.endsWith(extension)) return false

  const relativePath = path.slice(prefix.length)

  return relativePath.length > 0 && (recursive || !relativePath.includes('/'))
}

function isDirectoryAllowedByRoot(
  path: string,
  root: string,
  recursive: boolean,
) {
  return (
    path === root ||
    root.startsWith(`${path}/`) ||
    (recursive && path.startsWith(`${root}/`))
  )
}

function getExtension(path: string) {
  const fileName = path.split('/').pop() || ''
  const dot = fileName.lastIndexOf('.')

  return dot === -1 ? '' : fileName.slice(dot).toLowerCase()
}
