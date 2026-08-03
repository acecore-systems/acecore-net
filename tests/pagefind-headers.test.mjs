import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import { close, createIndex } from 'pagefind'

const HEADERS_URL = new URL('../public/_headers', import.meta.url)
const REVALIDATE = 'public, max-age=0, must-revalidate'
const IMMUTABLE = 'public, max-age=31536000, immutable'
const CHUNK_DIRECTORIES = ['filter', 'fragment', 'index']

function parseHeaderRules(source) {
  const rules = []
  let currentRule

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    if (!/^\s/.test(rawLine)) {
      currentRule = { pattern: line, directives: [] }
      rules.push(currentRule)
      continue
    }

    assert.ok(currentRule, `Header directive without a path rule: ${line}`)
    if (line.startsWith('! ')) {
      currentRule.directives.push({
        action: 'remove',
        name: line.slice(2).toLowerCase(),
      })
      continue
    }

    const separator = line.indexOf(':')
    assert.notEqual(separator, -1, `Invalid header directive: ${line}`)
    currentRule.directives.push({
      action: 'set',
      name: line.slice(0, separator).toLowerCase(),
      value: line.slice(separator + 1).trim(),
    })
  }

  return rules
}

function matchesPattern(pattern, pathname) {
  const expression = pattern
    .split('*')
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  return new RegExp(`^${expression}$`).test(pathname)
}

function effectiveHeaderValues(rules, pathname, headerName) {
  const target = headerName.toLowerCase()
  let values = []

  for (const rule of rules) {
    if (!matchesPattern(rule.pattern, pathname)) continue

    for (const directive of rule.directives) {
      if (directive.name !== target) continue
      if (directive.action === 'remove') {
        values = []
      } else {
        values.push(directive.value)
      }
    }
  }

  return values
}

function assertCacheControl(rules, pathname, expected) {
  const values = effectiveHeaderValues(rules, pathname, 'Cache-Control')
  assert.deepEqual(
    values,
    [expected],
    `${pathname} must have exactly one Cache-Control value`,
  )
}

test('Pagefind rootは再検証し、content hash付きchunkだけimmutableにする', async () => {
  const rules = parseHeaderRules(await readFile(HEADERS_URL, 'utf8'))
  const pagefindCacheRules = rules.filter(
    (rule) =>
      rule.pattern.startsWith('/pagefind/') &&
      rule.directives.some((directive) => directive.name === 'cache-control'),
  )

  assert.deepEqual(
    pagefindCacheRules.map((rule) => rule.pattern),
    CHUNK_DIRECTORIES.map((directory) => `/pagefind/${directory}/*`),
  )

  for (const rootFile of [
    'pagefind.js',
    'pagefind-ui.js',
    'pagefind-entry.json',
    'pagefind.en_deadbeef.pf_meta',
    'wasm.unknown.pagefind',
    'future-runtime.js',
  ]) {
    assertCacheControl(rules, `/pagefind/${rootFile}`, REVALIDATE)
  }

  assertCacheControl(rules, '/pagefind/future/chunk.bin', REVALIDATE)

  for (const directory of CHUNK_DIRECTORIES) {
    assertCacheControl(
      rules,
      `/pagefind/${directory}/en_deadbee.pf_${directory}`,
      IMMUTABLE,
    )
  }
})

test('Pagefindの検索用ファイルは検索結果へ載せない', async () => {
  const rules = parseHeaderRules(await readFile(HEADERS_URL, 'utf8'))

  for (const pathname of [
    '/pagefind/pagefind.js',
    '/pagefind/index/en_deadbee.pf_index',
  ]) {
    assert.deepEqual(effectiveHeaderValues(rules, pathname, 'X-Robots-Tag'), [
      'noindex',
    ])
  }
})

test('Pagefindの実生成物を安全なキャッシュ分類へ収める', async () => {
  const rules = parseHeaderRules(await readFile(HEADERS_URL, 'utf8'))
  let index

  try {
    const created = await createIndex({ forceLanguage: 'en' })
    assert.deepEqual(created.errors, [])
    assert.ok(created.index)
    index = created.index

    const added = await index.addCustomRecord({
      url: '/cache-test/',
      content: 'Pagefind cache control regression test.',
      language: 'en',
      meta: { title: 'Cache test' },
      filters: { tag: ['cache'] },
    })
    assert.deepEqual(added.errors, [])

    const generated = await index.getFiles()
    assert.deepEqual(generated.errors, [])

    const paths = generated.files.map(({ path }) => path.replaceAll('\\', '/'))
    const nestedDirectories = [
      ...new Set(
        paths
          .filter((path) => path.includes('/'))
          .map((path) => path.split('/')[0]),
      ),
    ].sort()

    assert.deepEqual(
      nestedDirectories,
      CHUNK_DIRECTORIES,
      'Pagefind added a nested output class that needs an explicit cache review',
    )

    for (const outputPath of paths) {
      const pathname = `/pagefind/${outputPath}`
      if (!outputPath.includes('/')) {
        assertCacheControl(rules, pathname, REVALIDATE)
        continue
      }

      const [directory, filename] = outputPath.split('/')
      assert.match(filename, /_[0-9a-f]+\.pf_(filter|fragment|index)$/)
      assert.equal(filename.endsWith(`.pf_${directory}`), true)
      assertCacheControl(rules, pathname, IMMUTABLE)
    }
  } finally {
    if (index) await index.deleteIndex()
    await close()
  }
})
