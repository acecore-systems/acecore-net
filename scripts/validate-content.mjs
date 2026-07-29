import { access, readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const errors = []

function fail(scope, message) {
  errors.push(`${scope}: ${message}`)
}

async function fileExists(relativePath) {
  try {
    await access(path.join(root, relativePath))
    return true
  } catch {
    return false
  }
}

function extractCmsContentPaths(config) {
  const paths = []
  const pathPattern = /^\s*(?:folder|file):\s*['"]?([^'"\n#]+?)['"]?\s*$/gm
  for (const match of config.matchAll(pathPattern)) {
    paths.push(match[1].trim())
  }
  return paths
}

function isAllowedCmsContentPath(contentPath) {
  return (
    contentPath === 'src/content/blog' ||
    contentPath === 'src/content/authors' ||
    contentPath === 'src/content/tags' ||
    contentPath === 'src/i18n/source/ja/campaigns' ||
    /^src\/i18n\/source\/ja\/(?:common|blog)\.json$/.test(contentPath) ||
    /^src\/i18n\/source\/ja\/pages\/[a-z0-9-]+\.json$/.test(contentPath)
  )
}

const contextualTitleFiles = [
  'src/i18n/source/ja/pages/services.json',
  'src/i18n/source/ja/pages/about.json',
  'src/i18n/source/ja/pages/contact.json',
  'src/i18n/source/ja/pages/acestudio.json',
  'src/i18n/source/ja/pages/privacy.json',
  'src/i18n/source/ja/blog.json',
]

function extractCmsFileDefinition(config, contentPath) {
  const start = config.indexOf(`file: ${contentPath}`)
  if (start < 0) return ''

  const nextDefinition = config.indexOf('\n      - name:', start)
  return config.slice(start, nextDefinition < 0 ? undefined : nextDefinition)
}

function extractCmsCollectionDefinition(config, collectionName) {
  const definitionPattern = new RegExp(`^  - name: ${collectionName}\\s*$`, 'm')
  const match = definitionPattern.exec(config)

  if (!match) return ''

  const nextDefinition = config.indexOf(
    '\n  - name:',
    match.index + match[0].length,
  )

  return config.slice(
    match.index,
    nextDefinition < 0 ? undefined : nextDefinition,
  )
}

async function validateCmsConfig() {
  const scope = 'public/admin/config.yml'
  const config = await readFile(path.join(root, scope), 'utf8')
  const graphql = await readFile(
    path.join(root, 'functions/admin/api/graphql.ts'),
    'utf8',
  )
  const oauth = await readFile(
    path.join(root, 'functions/admin/api/_github-oauth.ts'),
    'utf8',
  )
  const githubApi = await readFile(
    path.join(root, 'functions/admin/api/_github-api.ts'),
    'utf8',
  )
  const cmsPolicy = await readFile(
    path.join(root, 'functions/admin/api/_cms-policy.ts'),
    'utf8',
  )
  const contentValidator = await readFile(
    path.join(root, 'functions/admin/api/_cms-content-validator.ts'),
    'utf8',
  )
  const cmsLimits = await readFile(
    path.join(root, 'functions/admin/api/_cms-limits.ts'),
    'utf8',
  )
  const referenceValidator = await readFile(
    path.join(root, 'functions/admin/api/_cms-reference-validator.ts'),
    'utf8',
  )
  const configFunction = await readFile(
    path.join(root, 'functions/admin/config.yml.ts'),
    'utf8',
  )
  const adminInit = await readFile(
    path.join(root, 'public/admin/init.js'),
    'utf8',
  )
  const adminIndex = await readFile(
    path.join(root, 'public/admin/index.html'),
    'utf8',
  )
  const readme = await readFile(path.join(root, 'README.md'), 'utf8')
  const cmsWorkflow = await readFile(
    path.join(root, 'docs/cms-write-workflow.md'),
    'utf8',
  )
  const pagesConfig = await readFile(path.join(root, 'wrangler.jsonc'), 'utf8')
  const oauthWorkerConfig = await readFile(
    path.join(root, 'workers/sveltia-cms-auth/wrangler.jsonc'),
    'utf8',
  )

  if (/^\s*-?\s*name:\s*path\b/m.test(config)) {
    fail(scope, 'path field must not be exposed in CMS')
  }
  if (!/backend:\s*[\s\S]*?\n\s+branch:\s*main\b/.test(config)) {
    fail(
      scope,
      'CMS backend branch must be main; do not use a permanent cms-content branch',
    )
  }
  if (/^publish_mode:\s*editorial_workflow\b/m.test(config)) {
    fail(
      scope,
      'Sveltia CMS does not implement editorial_workflow; use the validated direct-publish proxy',
    )
  }
  if (
    !config.includes('api_root: /admin/api/github') ||
    !config.includes('graphql_api_root: /admin/api/graphql')
  ) {
    fail(scope, 'CMS must use the same-origin GitHub REST and GraphQL proxy')
  }
  if (
    !graphql.includes('expectedHeadOid: mainSha') ||
    !graphql.includes('branchName: CMS_REPOSITORY.branch') ||
    !graphql.includes("publication: 'direct'") ||
    !graphql.includes('return `cms: update') ||
    graphql.includes('/pulls') ||
    graphql.includes('cms/acecore/')
  ) {
    fail(
      scope,
      'CMS writes must atomically commit allowed content to the expected main HEAD with a cms: subject',
    )
  }
  if (
    !graphql.includes('fetchCmsReferenceState(token, mainSha)') ||
    !graphql.includes('validateProjectedCmsReferences') ||
    !githubApi.includes('query CmsReferenceState') ||
    !referenceValidator.includes('src/content/blog/') ||
    !referenceValidator.includes('frontmatter.author') ||
    !referenceValidator.includes('frontmatter.tags') ||
    !referenceValidator.includes('frontmatter.uploadedImage') ||
    !referenceValidator.includes('frontmatter.gallery')
  ) {
    fail(
      scope,
      'CMS direct publish must validate projected author, tag, and media references across every locale before committing',
    )
  }
  if (
    !oauth.includes('repository.permissions.push !== true') ||
    !oauth.includes("path: '/user'") ||
    !graphql.includes('getGitHubEditor(request, { forceRefresh: true })')
  ) {
    fail(
      scope,
      'CMS proxy must freshly validate the GitHub user and repository write access before each mutation',
    )
  }
  if (
    !graphql.includes('validateCmsAdditionContents(commitInput.additions)') ||
    !contentValidator.includes('blogSchema.strict().safeParse') ||
    !contentValidator.includes('matchesJsonTemplate') ||
    !contentValidator.includes('validateMedia') ||
    cmsPolicy.includes("'.svg'")
  ) {
    fail(
      scope,
      'CMS direct publish must synchronously validate content schemas and real media formats, with SVG excluded',
    )
  }
  if (
    !cmsLimits.includes(
      'export const MAX_CMS_TEXT_CONTENT_BYTES = 448 * 1024',
    ) ||
    !contentValidator.includes(
      "import { MAX_CMS_TEXT_CONTENT_BYTES } from './_cms-limits.ts'",
    ) ||
    !contentValidator.includes(
      'bytes.byteLength > MAX_CMS_TEXT_CONTENT_BYTES',
    ) ||
    !githubApi.includes(
      "import { MAX_CMS_TEXT_CONTENT_BYTES } from './_cms-limits.ts'",
    ) ||
    !githubApi.includes('blob.size > MAX_CMS_TEXT_CONTENT_BYTES') ||
    !githubApi.includes('value.byteSize > MAX_CMS_TEXT_CONTENT_BYTES') ||
    !readme.includes('テキストファイル1件あたり448 KiB') ||
    !cmsWorkflow.includes('テキストファイル1件あたり448 KiB')
  ) {
    fail(
      scope,
      'CMS additions and current main reference text must share the documented 448 KiB per-file limit',
    )
  }
  if (
    !cmsPolicy.includes('export function isAllowedCmsDeletePath') ||
    !graphql.includes('!isAllowedCmsDeletePath(path)')
  ) {
    fail(
      scope,
      'CMS deletion must be restricted independently from the write allowlist',
    )
  }
  for (const collectionName of ['authors', 'tags']) {
    if (
      !/^\s{4}delete:\s*false\s*$/m.test(
        extractCmsCollectionDefinition(config, collectionName),
      )
    ) {
      fail(
        scope,
        `${collectionName} deletion must be disabled in the CMS interface`,
      )
    }
  }
  if (
    !graphql.includes('getGitHubAppToken(env)') ||
    !githubApi.includes('CMS_GITHUB_APP_CLIENT_ID') ||
    !githubApi.includes('CMS_GITHUB_APP_INSTALLATION_ID') ||
    !githubApi.includes('CMS_GITHUB_APP_PRIVATE_KEY') ||
    !githubApi.includes('repositories: [CMS_REPOSITORY.name]') ||
    !githubApi.includes("contents: 'write'") ||
    githubApi.includes("pull_requests: 'write'")
  ) {
    fail(
      scope,
      'CMS repository access must use a repository-scoped Contents-only GitHub App token',
    )
  }
  if (
    !readme.includes(
      'Client ID、Installation ID、private keyはCloudflare Pagesのproduction環境だけに設定',
    ) ||
    !cmsWorkflow.includes(
      'Cloudflare Pagesのproduction環境だけに次をsecretまたはvariableとして設定',
    ) ||
    !cmsWorkflow.includes(
      'preview環境にはこれらのwriter認証情報を設定しません',
    ) ||
    pagesConfig.includes('CMS_GITHUB_APP_') ||
    oauthWorkerConfig.includes('CMS_GITHUB_APP_')
  ) {
    fail(
      scope,
      'CMS writer credentials must be documented and configured for production only, never Pages previews or the OAuth Worker',
    )
  }
  if (
    !configFunction.includes('$1${origin}/admin/api/github') ||
    !configFunction.includes('$1${origin}/admin/api/graphql')
  ) {
    fail(scope, 'CMS runtime config must use the deployment origin proxy')
  }
  if (
    !adminInit.includes('保存すると自動で公開されます') ||
    !adminInit.includes("endsWith('.pages.dev')") ||
    !adminInit.includes('プレビューでは保存できません') ||
    !adminInit.includes('著者・タグ・画像は削除できません') ||
    adminInit.includes('保存は公開ではありません') ||
    !adminIndex.includes('/admin/cms-notice.css')
  ) {
    fail(scope, 'CMS admin must explain that saving starts publication')
  }

  for (const contentPath of extractCmsContentPaths(config)) {
    if (!isAllowedCmsContentPath(contentPath)) {
      fail(scope, `unexpected CMS content path (${contentPath})`)
      continue
    }
    if (!(await fileExists(contentPath))) {
      fail(scope, `CMS content path does not exist (${contentPath})`)
    }
  }

  for (const contentPath of contextualTitleFiles) {
    const source = JSON.parse(
      await readFile(path.join(root, contentPath), 'utf8'),
    )
    if (
      typeof source.seoTitleContext !== 'string' ||
      source.seoTitleContext.trim() === ''
    ) {
      fail(contentPath, 'seoTitleContext must be a non-empty string')
    }

    const definition = extractCmsFileDefinition(config, contentPath)
    if (!/^\s*-\s*name:\s*['"]seoTitleContext['"]\s*$/m.test(definition)) {
      fail(scope, `seoTitleContext field is missing for ${contentPath}`)
    }
  }
}

const LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/
const TIMEZONE_PATTERN = /(?:Z|[+-]\d{2}:\d{2})$/

async function listMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const entryPath = path.join(directory, entry.name)
      return entry.isDirectory()
        ? listMarkdownFiles(entryPath)
        : entry.name.endsWith('.md')
          ? [entryPath]
          : []
    }),
  )
  return nested.flat()
}

function parseFrontmatterDate(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'))
  if (!match) return null

  const raw = match[1].trim().replace(/^['"]|['"]$/g, '')
  const normalized =
    LOCAL_DATETIME_PATTERN.test(raw) && !TIMEZONE_PATTERN.test(raw)
      ? `${raw}+09:00`
      : raw
  const timestamp = Date.parse(normalized)
  return { raw, timestamp }
}

async function validateBlogDates() {
  const blogDirectory = path.join(root, 'src/content/blog')
  const files = await listMarkdownFiles(blogDirectory)

  for (const file of files) {
    const scope = path.relative(root, file).split(path.sep).join('/')
    const content = await readFile(file, 'utf8')
    const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1]
    if (!frontmatter) continue

    const published = parseFrontmatterDate(frontmatter, 'date')
    const modified = parseFrontmatterDate(frontmatter, 'lastUpdated')
    if (!published || !modified) continue

    if (Number.isNaN(published.timestamp)) {
      fail(scope, `invalid date (${published.raw})`)
      continue
    }
    if (Number.isNaN(modified.timestamp)) {
      fail(scope, `invalid lastUpdated (${modified.raw})`)
      continue
    }
    if (modified.timestamp < published.timestamp) {
      fail(
        scope,
        `lastUpdated (${modified.raw}) must not be earlier than date (${published.raw})`,
      )
    }
  }
}

await validateCmsConfig()
await validateBlogDates()

if (errors.length > 0) {
  console.error('Content validation failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log('Content validation passed.')
