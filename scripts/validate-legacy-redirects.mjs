import fs from 'node:fs/promises'

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
    'https://acecore.net/blog/robot-workshop-event/',
  ],
  ['/i/design-C5qVivLXJDZ/', 'https://acecore.net/services/#design'],
  ['/i/designs-C5qVivLXJDZ/', 'https://acecore.net/services/#design'],
].flatMap(([path, destination]) => [
  { path, destination },
  { path: path.slice(0, -1), destination },
])

function matches(source, path) {
  const escaped = source
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')

  return new RegExp(`^${escaped}$`, 'u').test(path)
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

for (const testCase of legacyCases) {
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

if (issues.length > 0) {
  console.error('Legacy redirect validation failed:')
  for (const issue of issues) console.error(`- ${issue}`)
  process.exitCode = 1
} else {
  console.log(
    `Validated ${legacyCases.length} legacy URL variants against ${redirects.length} redirect rules.`,
  )
}
