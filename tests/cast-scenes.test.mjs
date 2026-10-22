import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  loadCastSceneRegistration,
  sha256,
  validateCastSceneLock,
  validateLocalCastScenes,
  validateProjectCastScenes,
  validateBuiltSceneReferences,
} from '../scripts/validate-cast-scenes.mjs'

const root = new URL('../', import.meta.url)
const { registration, manifestBytes } = await loadCastSceneRegistration(root)
const clone = () => structuredClone(registration)
const loader = (asset) => readFile(new URL('public' + asset.localPath, root))

test('approved scene registration and exact local WebP bytes match the pinned release', async () => {
  await validateProjectCastScenes(root)
})
test('modified manifest bytes are rejected before parsing', () => {
  assert.throws(
    () =>
      validateCastSceneLock(
        registration,
        Buffer.concat([manifestBytes, Buffer.from(' ')]),
      ),
    /checksum/u,
  )
})
test('mutable, external and traversal scene paths are rejected', () => {
  for (const path of [
    '/images/cast/latest/scene.webp',
    '/images/cast/scenes-v1.0.0/../scene.webp',
    'https://example.com/scene.webp',
    registration.assets[0].localPath + '?v=1',
  ]) {
    const candidate = clone()
    candidate.assets[0].localPath = path
    assert.throws(() => validateCastSceneLock(candidate, manifestBytes))
  }
})
test('unregistered site, origin, release and public URLs are rejected', () => {
  for (const mutate of [
    (candidate) => {
      candidate.site = 'other'
    },
    (candidate) => {
      candidate.siteOrigin = 'https://example.com'
    },
    (candidate) => {
      candidate.releaseId = 'latest'
    },
    (candidate) => {
      candidate.assets[0].sourceUrl = 'https://example.com/image.webp'
    },
  ]) {
    const candidate = clone()
    mutate(candidate)
    assert.throws(() => validateCastSceneLock(candidate, manifestBytes))
  }
})
test('missing, duplicate and changed scene metadata are rejected', () => {
  for (const mutate of [
    (candidate) => {
      candidate.assets.pop()
    },
    (candidate) => {
      candidate.assets[1] = structuredClone(candidate.assets[0])
    },
    (candidate) => {
      candidate.assets[0].sha256 = '0'.repeat(64)
    },
    (candidate) => {
      candidate.assets[0].width += 1
    },
    (candidate) => {
      candidate.assets[0].bytes += 1
    },
  ]) {
    const candidate = clone()
    mutate(candidate)
    assert.throws(() => validateCastSceneLock(candidate, manifestBytes))
  }
})
test('private or unknown consumer registration fields are rejected', () => {
  const candidate = clone()
  candidate.privateSource = 'not-public'
  assert.throws(
    () => validateCastSceneLock(candidate, manifestBytes),
    /unexpected fields/u,
  )
})
test('a release that does not permit this site is rejected', () => {
  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  manifest.permittedSites = []
  const bytes = Buffer.from(JSON.stringify(manifest))
  const candidate = clone()
  candidate.manifest.sha256 = sha256(bytes)
  assert.throws(() => validateCastSceneLock(candidate, bytes), /not permitted/u)
})
test('changed local image bytes are rejected without any network access', async () => {
  await assert.rejects(
    validateLocalCastScenes(registration, manifestBytes, async (asset) =>
      Buffer.concat([await loader(asset), Buffer.from(' ')]),
    ),
    /byte count/u,
  )
})
test('same-length image tampering is rejected by checksum', async () => {
  await assert.rejects(
    validateLocalCastScenes(registration, manifestBytes, async (asset) => {
      const bytes = Buffer.from(await loader(asset))
      bytes[bytes.length - 1] ^= 1
      return bytes
    }),
    /checksum/u,
  )
})

test('broader image reuse permissions are rejected', () => {
  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  manifest.permissions.thirdPartyReuse = true
  const bytes = Buffer.from(JSON.stringify(manifest))
  const candidate = clone()
  candidate.manifest.sha256 = sha256(bytes)
  assert.throws(() => validateCastSceneLock(candidate, bytes), /permissions/u)
})
test('footer credit is restrained and does not reintroduce a profile section', async () => {
  const path =
    registration.site === 'schools'
      ? 'src/components/SchoolsPage.astro'
      : 'src/components/Footer.astro'
  const source = await readFile(new URL(path, root), 'utf8')
  assert.match(source, /data-cast-scene-credit/u)
  assert.match(source, /https:\/\/cast\.acecore\.net\//u)
  assert.ok(
    !/audience-heading|consultation-profiles-title|learning-starts-title/u.test(
      source,
    ),
  )
})
if (registration.site === 'net') {
  test('About Hero object-position is preserved for initial and lazy images', async () => {
    const hero = await readFile(
      new URL('src/components/Hero.astro', root),
      'utf8',
    )
    const about = await readFile(
      new URL('src/views/AboutPage.astro', root),
      'utf8',
    )
    assert.match(hero, /firstSliderImage\.objectPosition/u)
    assert.match(hero, /img\.style\.objectPosition = image\.objectPosition/u)
    assert.match(about, /objectPosition:\s*['"]0% 50%['"]/u)
  })
}
if (registration.site === 'schools') {
  test('mobile home Hero reserves separate image and copy rows', async () => {
    const css = await readFile(new URL('src/styles/tailwind.css', root), 'utf8')
    const mobile = css.slice(
      css.indexOf('@media (max-width: 700px)'),
      css.indexOf('@media (max-width: 520px)'),
    )
    assert.match(mobile, /\.hero-image\s*\{[^}]*position:\s*relative/su)
    assert.match(mobile, /\.hero-layout\s*\{[^}]*display:\s*contents/su)
    assert.match(mobile, /\.hero-message\s*\{[^}]*grid-area:\s*2\s*\/\s*1/su)
  })
}

test('built pages may use an approved subset while unknown scene paths are rejected', () => {
  const approved = registration.assets[0].localPath
  const allowed = new Set(registration.assets.map((asset) => asset.localPath))
  assert.deepEqual(
    validateBuiltSceneReferences(`<img src="${approved}">`, allowed),
    [approved],
  )
  assert.throws(
    () =>
      validateBuiltSceneReferences(
        '<img src="/images/cast/scenes-v1.0.0/unregistered-scene.webp">',
        allowed,
      ),
    /unregistered scene/u,
  )
})
