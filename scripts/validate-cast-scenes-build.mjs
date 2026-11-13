import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import {
  sha256,
  validateProjectCastScenes,
  validateBuiltSceneReferences,
} from './validate-cast-scenes.mjs'

const root = new URL('../', import.meta.url)
const { registration } = await validateProjectCastScenes(root)
for (const asset of registration.assets) {
  const bytes = await readFile(new URL('dist' + asset.localPath, root))
  assert.equal(bytes.length, asset.bytes, 'built scene byte count')
  assert.equal(sha256(bytes), asset.sha256, 'built scene checksum')
}
const allowed = new Set(registration.assets.map((asset) => asset.localPath))
const seen = new Set()
let htmlCount = 0
let creditCount = 0

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = new URL(
      entry.name + (entry.isDirectory() ? '/' : ''),
      directory,
    )
    if (entry.isDirectory()) {
      await inspect(path)
      continue
    }
    if (!entry.name.endsWith('.html')) continue
    const html = await readFile(path, 'utf8')
    htmlCount += 1
    assert.ok(
      !/audience-heading|consultation-profiles-title|learning-starts-title/u.test(
        html,
      ),
      'retired cast section in ' + path.pathname,
    )
    for (const scenePath of validateBuiltSceneReferences(
      html,
      allowed,
      path.pathname,
    ))
      seen.add(scenePath)
    if (/<footer\b/u.test(html)) {
      assert.ok(
        html.includes('data-cast-scene-credit'),
        'footer scene credit missing in ' + path.pathname,
      )
      assert.ok(
        html.includes('href="https://cast.acecore.net/"'),
        'catalog link missing in ' + path.pathname,
      )
      creditCount += 1
    }
    for (const asset of registration.assets) {
      const stem = asset.id.slice(registration.site.length + 2)
      const legacy =
        registration.site === 'systems'
          ? '/images/' + stem + '.webp'
          : '/images/schools/purpose-city/' + stem + '.webp'
      if (registration.site !== 'net')
        assert.ok(
          !html.includes(legacy),
          'legacy person scene in ' + path.pathname,
        )
    }
    if (registration.site === 'net') {
      assert.ok(
        !/photo-(?:1504384308090-c894fdcc538d|1517245386807-bb43f82c33c4|1521737604893-d14cc237f11d|1522071820081-009f0129c71c|1531482615713-2afd69097998)/u.test(
          html,
        ),
        'legacy person photo in ' + path.pathname,
      )
    }
  }
}
await inspect(new URL('dist/', root))
assert.ok(htmlCount > 0, 'no built HTML')
// Registered, approved assets may remain available without being placed on a page.
// Every scene that is used must still be registered, and every asset is hash-checked above.
assert.ok(creditCount > 0, 'no visible scene credits')
console.log(
  'Validated ' +
    seen.size +
    ' Cast scenes and ' +
    creditCount +
    ' footer credits across ' +
    htmlCount +
    ' built HTML files.',
)
