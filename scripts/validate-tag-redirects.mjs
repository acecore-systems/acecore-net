import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getCanonicalTagRedirectUrl } from '../src/utils/tag-route-redirect.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tagsDirectory = path.join(root, 'src', 'content', 'tags')
const locales = ['', 'en/', 'zh-cn/', 'es/', 'pt/', 'fr/', 'ko/', 'de/', 'ru/']

const tagFiles = (await readdir(tagsDirectory)).filter((file) =>
  file.endsWith('.json'),
)
const tags = await Promise.all(
  tagFiles.map(async (file) =>
    JSON.parse(await readFile(path.join(tagsDirectory, file), 'utf8')),
  ),
)
const tagNames = tags.map((tag) => tag.name)
const nonAsciiTagCount = tagNames.filter((name) =>
  /[^\x00-\x7f]/u.test(name),
).length

let checked = 0
for (const locale of locales) {
  for (const tag of tagNames) {
    const encodedTag = encodeURIComponent(tag)
    const startUrl = `https://acecore.net/${locale}blog/tags/${encodedTag}`
    const expectedUrl = `${startUrl}/`

    for (const method of ['GET', 'HEAD']) {
      const location = getCanonicalTagRedirectUrl(startUrl, method)
      assert.equal(location, expectedUrl)
      assert.match(location, /^[\x00-\x7f]+$/u)
      checked += 1
    }

    assert.equal(getCanonicalTagRedirectUrl(expectedUrl, 'GET'), null)
  }

  const movedTagUrl = `https://acecore.net/${locale}blog/tags/${encodeURIComponent('システム開発')}`
  for (const method of ['GET', 'HEAD']) {
    assert.equal(
      getCanonicalTagRedirectUrl(`${movedTagUrl}?from=gsc`, method),
      'https://systems.acecore.net/guide/?from=gsc',
    )
    checked += 1
  }
}

assert.equal(
  getCanonicalTagRedirectUrl(
    'https://acecore.net/blog/tags/%E6%95%99%E8%82%B2?from=gsc',
    'GET',
  ),
  'https://acecore.net/blog/tags/%E6%95%99%E8%82%B2/?from=gsc',
)
assert.equal(
  getCanonicalTagRedirectUrl(
    'https://acecore.net/it/blog/tags/%E6%95%99%E8%82%B2',
    'GET',
  ),
  null,
)
assert.equal(
  getCanonicalTagRedirectUrl(
    'https://acecore.net/blog/tags/%E6%95%99%E8%82%B2',
    'POST',
  ),
  null,
)
assert.equal(
  getCanonicalTagRedirectUrl(
    'https://acecore.net/blog/%E6%95%99%E8%82%B2',
    'GET',
  ),
  null,
)

console.log(
  `Validated ${checked} GET/HEAD redirects across ${locales.length} locales and ${tagNames.length} current tag routes (${nonAsciiTagCount} non-ASCII), plus the moved system-development tag.`,
)
