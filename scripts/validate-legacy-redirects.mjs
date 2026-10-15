import fs from 'node:fs/promises'

import {
  getCanonicalTagRedirectUrl,
  localizeRedirectDestination,
  RETIRED_TAG_DESTINATIONS,
} from '../src/utils/tag-route-redirect.ts'

const redirectFile = new URL('../public/_redirects', import.meta.url)
const redirects = (await fs.readFile(redirectFile, 'utf8'))
  .split(/\r?\n/)
  .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
  .filter(({ line }) => line && !line.startsWith('#'))
  .map(({ line, lineNumber }) => {
    const [source, destination, status, ...extra] = line.split(/\s+/)

    if (!source || !destination || !status || extra.length > 0) {
      throw new Error(`Invalid redirect rule at line ${lineNumber}: ${line}`)
    }

    return { source, destination, status, lineNumber }
  })

const legacyCases = [
  ['/i/systems-XsQTlgjZeR0/', 'https://systems.acecore.net/'],
  ['/fr/blog/page/', 'https://acecore.net/fr/blog/'],
  ['/ko/blog/page/', 'https://acecore.net/ko/blog/'],
  ['/de/blog/page/', 'https://acecore.net/de/blog/'],
  ['/ru/blog/authors/', 'https://acecore.net/ru/blog/'],
  ['/i/contact-VR0-RcZ1Ibf/', 'https://acecore.net/contact/'],
  ['/i/schools-ojDrS22NGHP/', 'https://schools.acecore.net/'],
  ['/i/about-vJfpQ5SzUyP/', 'https://acecore.net/about/'],
  ['/i/privacy-EHRLK9OyUTL/', 'https://acecore.net/privacy/'],
  ['/i/privac-EHRLK9OyUTL/', 'https://acecore.net/privacy/'],
  ['/i/高卒認定-3A6mZ3IBMYD/', 'https://schools.acecore.net/'],
  ['/i/ロボット-プログラミング-1c6e_F76wL2/', 'https://schools.acecore.net/'],
  ['/i/パソコン-スマホ-qPJx0yQo_gH/', 'https://schools.acecore.net/'],
  [
    '/i/夏休みロボット工作体験イベントのご案内-bQ_RjzRutHu/',
    'https://schools.acecore.net/activities/2023-summer-robot-workshop/',
  ],
  ['/i/design-C5qVivLXJDZ/', 'https://systems.acecore.net/services/#design'],
  ['/i/designs-C5qVivLXJDZ/', 'https://systems.acecore.net/services/#design'],
].flatMap(([path, destination]) => [
  { path, destination },
  { path: path.slice(0, -1), destination },
])

const specialistDestinations = {
  'ai-chat-markdown-link-safety':
    'https://systems.acecore.net/insights/ai-chat-markdown-link-safety/',
  'ai-monkey-testing-methodology':
    'https://systems.acecore.net/insights/ai-monkey-testing-methodology/',
  'astro-accessibility-guide':
    'https://systems.acecore.net/insights/astro-accessibility-guide/',
  'astro-ai-contact-chat':
    'https://systems.acecore.net/insights/astro-ai-contact-chat/',
  'astro-cloudflare-site-architecture':
    'https://systems.acecore.net/insights/astro-cloudflare-site-architecture/',
  'astro-i18n-blog-translation':
    'https://systems.acecore.net/insights/astro-i18n-blog-translation/',
  'astro-performance-tuning':
    'https://systems.acecore.net/insights/astro-performance-tuning/',
  'astro-seo-and-structured-data':
    'https://systems.acecore.net/insights/astro-seo-and-structured-data/',
  'astro-ux-and-code-quality':
    'https://systems.acecore.net/insights/astro-ux-and-code-quality/',
  'cloudflare-only-blog-comments':
    'https://systems.acecore.net/insights/cloudflare-only-blog-comments/',
  'cloudflare-pages-security':
    'https://systems.acecore.net/insights/cloudflare-pages-security/',
  'cloudflare-ssl-advanced-certificate-manager':
    'https://systems.acecore.net/insights/cloudflare-ssl-advanced-certificate-manager/',
  'cms-selection-and-turnstile':
    'https://systems.acecore.net/insights/cms-selection-and-turnstile/',
  'copilot-translation-pipeline':
    'https://systems.acecore.net/insights/copilot-translation-pipeline/',
  'hatt-homepage-launch':
    'https://systems.acecore.net/insights/hatt-homepage-launch/',
  'homepage-production-cost-guide':
    'https://systems.acecore.net/insights/homepage-production-cost-guide/',
  'service-cta-contact-prefill':
    'https://systems.acecore.net/insights/service-cta-contact-prefill/',
  'tax-return-with-copilot':
    'https://systems.acecore.net/insights/tax-return-with-copilot/',
  'vitepress-to-starlight-migration':
    'https://systems.acecore.net/insights/vitepress-to-starlight-migration/',
  'website-improvement-batches':
    'https://systems.acecore.net/insights/website-improvement-batches/',
  'website-improvement-final-batch':
    'https://systems.acecore.net/insights/website-improvement-final-batch/',
  'zoho-to-kagoya-mail-migration':
    'https://systems.acecore.net/insights/zoho-to-kagoya-mail-migration/',
  'aceserver-hijacked': 'https://asv.acecore.net/stories/aceserver-hijacked/',
  'metaverse-is-close': 'https://asv.acecore.net/stories/metaverse-is-close/',
  'aceserver-portal-launch':
    'https://asv.acecore.net/stories/aceserver-portal-launch/',
  'business-system-implementation-tips': 'https://systems.acecore.net/guide/',
  'robot-workshop-event':
    'https://schools.acecore.net/activities/2023-summer-robot-workshop/',
}
const specialistLocales = [
  '',
  'en',
  'zh-cn',
  'es',
  'pt',
  'fr',
  'ko',
  'de',
  'ru',
]

const specialistCases = Object.entries(specialistDestinations).flatMap(
  ([slug, destination]) =>
    specialistLocales.flatMap((locale) => {
      const localePrefix = locale ? `/${locale}` : ''
      const path = `${localePrefix}/blog/${slug}/`
      const localizedDestination = localizeRedirectDestination(
        destination,
        locale,
      )
      return [
        { path, destination: localizedDestination },
        { path: path.slice(0, -1), destination: localizedDestination },
      ]
    }),
)
const retiredTagCases = Object.entries(RETIRED_TAG_DESTINATIONS).flatMap(
  ([tag, destination]) =>
    specialistLocales.flatMap((locale) => {
      const localePrefix = locale ? `/${locale}` : ''
      const path = `${localePrefix}/blog/tags/${encodeURI(tag)}/`
      const localizedDestination = localizeRedirectDestination(
        destination,
        locale,
      )
      return [
        { path, destination: localizedDestination },
        { path: path.slice(0, -1), destination: localizedDestination },
      ]
    }),
)
const pricingCases = specialistLocales.flatMap((locale) => {
  const prefix = locale ? `/${locale}` : ''
  const destination = `${prefix}/services/#pricing`
  return [
    { path: `${prefix}/pricing`, destination },
    { path: `${prefix}/pricing/`, destination },
  ]
})
const redirectCases = [
  ...legacyCases,
  ...specialistCases,
  ...retiredTagCases,
  ...pricingCases,
]
const retainedCorporateSlugs = [
  'website-renewal',
  'community-and-education',
  'service-introduction',
]
const retainedCorporateCases = retainedCorporateSlugs.flatMap((slug) =>
  specialistLocales.map((locale) => {
    const localePrefix = locale ? `/${locale}` : ''
    return {
      locale,
      path: `${localePrefix}/blog/${slug}/`,
      slug,
    }
  }),
)

function matches(source, path) {
  const normalizedSource = decodePath(source)
  const normalizedPath = decodePath(path)
  const escaped = normalizedSource
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')

  return new RegExp(`^${escaped}$`, 'u').test(normalizedPath)
}

function decodePath(value) {
  try {
    return decodeURI(value)
  } catch {
    return value
  }
}

const duplicateSources = redirects
  .filter(
    (redirect, index) =>
      redirects.findIndex(({ source }) => source === redirect.source) !== index,
  )
  .map(({ source, lineNumber }) => `${source} (line ${lineNumber})`)

const issues = []
const firstDynamicIndex = redirects.findIndex(({ source }) =>
  source.includes('*'),
)
const dynamicRedirects = redirects.filter(({ source }) => source.includes('*'))

for (const { locale, path: articlePath, slug } of retainedCorporateCases) {
  const localeDirectory = locale ? `${locale}/` : ''
  const sourceFile = new URL(
    `../src/content/blog/${localeDirectory}${slug}.md`,
    import.meta.url,
  )

  try {
    await fs.access(sourceFile)
  } catch {
    issues.push(`Retained corporate article is missing: ${sourceFile.pathname}`)
  }

  const redirect = redirects.find(({ source }) => matches(source, articlePath))
  if (redirect) {
    issues.push(
      `${articlePath} must remain a corporate article but matches redirect line ${redirect.lineNumber}`,
    )
  }
}

if (duplicateSources.length > 0) {
  issues.push(`Duplicate sources: ${duplicateSources.join(', ')}`)
}

if (
  firstDynamicIndex !== -1 &&
  redirects.slice(firstDynamicIndex).some(({ source }) => !source.includes('*'))
) {
  issues.push('Static redirects must appear before dynamic redirects')
}

if (dynamicRedirects.length > 100) {
  issues.push(`Dynamic redirect limit exceeded: ${dynamicRedirects.length}`)
}

for (const { source, lineNumber } of dynamicRedirects) {
  if (source.split('*').length !== 2) {
    issues.push(`Line ${lineNumber} must contain exactly one splat: ${source}`)
  }
}

for (const testCase of redirectCases) {
  const match = redirects.find(({ source }) => matches(source, testCase.path))

  if (!match) {
    issues.push(`No redirect matches ${testCase.path}`)
    continue
  }

  if (match.status !== '301') {
    issues.push(
      `${testCase.path} matches line ${match.lineNumber} with status ${match.status}`,
    )
  }

  if (match.destination !== testCase.destination) {
    issues.push(
      `${testCase.path} matches line ${match.lineNumber} with destination ${match.destination}`,
    )
  }
}

for (const testCase of retiredTagCases) {
  const requestUrl = new URL(testCase.path, 'https://acecore.net')
  requestUrl.search = '?from=legacy-validator'
  const expectedDestination = new URL(testCase.destination)
  expectedDestination.search = requestUrl.search
  const middlewareDestination = getCanonicalTagRedirectUrl(
    requestUrl.href,
    'GET',
  )

  if (middlewareDestination !== expectedDestination.href) {
    issues.push(
      `${testCase.path} resolves through Pages Functions to ${middlewareDestination || '(none)'} instead of ${expectedDestination.href}`,
    )
  }
}

if (issues.length > 0) {
  console.error('Legacy redirect validation failed:')
  for (const issue of issues) console.error(`- ${issue}`)
  process.exitCode = 1
} else {
  console.log(
    `Validated ${redirectCases.length} legacy and specialist URL variants against ${redirects.length} redirect rules.`,
  )
}
