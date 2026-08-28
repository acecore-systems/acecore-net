import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const ROBOTS_URL = new URL('../public/robots.txt', import.meta.url)

function getUniversalCrawlerDirectives(source) {
  const directives = new Map()
  let inUniversalGroup = false

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separator = line.indexOf(':')
    if (separator === -1) continue

    const name = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (name === 'user-agent') {
      inUniversalGroup = value === '*'
      continue
    }

    if (!inUniversalGroup) continue
    const values = directives.get(name) ?? []
    values.push(value)
    directives.set(name, values)
  }

  return directives
}

test('検索対象外の管理画面と API は crawler に公開しない', async () => {
  const directives = getUniversalCrawlerDirectives(
    await readFile(ROBOTS_URL, 'utf8'),
  )

  assert.deepEqual(directives.get('allow'), ['/'])
  assert.deepEqual([...directives.get('disallow')].sort(), [
    '/admin/',
    '/api/',
    '/pagefind/',
  ])
  assert.deepEqual(directives.get('sitemap'), [
    'https://acecore.net/sitemap-index.xml',
  ])
})
