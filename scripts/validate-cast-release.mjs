import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const origin = 'https://cast.acecore.net'
const allowedSites = [
  'https://acecore.net',
  'https://systems.acecore.net',
  'https://schools.acecore.net',
]
const permissions = {
  publicViewing: true,
  namedSiteDisplay: true,
  thirdPartyReuse: false,
  redistribution: false,
  sale: false,
  training: false,
}
const hashPattern = /^[a-f0-9]{64}$/u
const root = new URL('../', import.meta.url)
export const sha256 = (bytes) =>
  createHash('sha256').update(bytes).digest('hex')

export function validateCastLock(lock, manifestBytes) {
  assert.equal(lock.schemaVersion, 1, 'unsupported consumer lock schema')
  assert.ok(allowedSites.includes(lock.siteOrigin), 'unsupported consumer site')
  assert.match(
    lock.releaseVersion,
    /^v\d+\.\d+\.\d+$/u,
    'immutable release required',
  )
  const base = origin + '/releases/' + lock.releaseVersion
  assert.deepEqual(
    Object.keys(lock).sort(),
    [
      'schemaVersion',
      'siteOrigin',
      'releaseVersion',
      'manifest',
      'catalog',
      'assets',
    ].sort(),
    'consumer lock must contain public registration fields only',
  )
  assert.deepEqual(
    Object.keys(lock.manifest).sort(),
    ['url', 'sha256', 'snapshot'].sort(),
  )
  assert.deepEqual(Object.keys(lock.catalog).sort(), ['url', 'sha256'].sort())
  assert.equal(lock.manifest.url, base + '/consumer-manifest.json')
  assert.equal(
    lock.manifest.snapshot,
    'vendor/cast/' + lock.releaseVersion + '/consumer-manifest.json',
  )
  assert.match(lock.manifest.sha256, hashPattern)
  assert.equal(
    sha256(manifestBytes),
    lock.manifest.sha256,
    'manifest checksum differs',
  )
  const manifest = JSON.parse(Buffer.from(manifestBytes).toString('utf8'))
  assert.deepEqual(
    Object.keys(manifest).sort(),
    [
      'schemaVersion',
      'releaseVersion',
      'manifestUrl',
      'catalog',
      'permissions',
      'permittedSites',
      'assets',
    ].sort(),
    'manifest must contain public allowlist fields only',
  )
  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.releaseVersion, lock.releaseVersion)
  assert.equal(manifest.manifestUrl, lock.manifest.url)
  assert.ok(
    manifest.permittedSites.includes(lock.siteOrigin),
    'site display not permitted',
  )
  assert.deepEqual(
    manifest.permissions,
    permissions,
    'display permissions differ',
  )
  assert.deepEqual(lock.catalog, manifest.catalog)
  assert.equal(lock.catalog.url, base + '/public-catalog.json')
  assert.match(lock.catalog.sha256, hashPattern)
  assert.ok(
    Array.isArray(lock.assets) && lock.assets.length > 0,
    'no registered portraits',
  )
  const ids = new Set()
  const subjects = new Set()
  for (const asset of lock.assets) {
    assert.deepEqual(
      Object.keys(asset).sort(),
      [
        'id',
        'subjectId',
        'url',
        'sha256',
        'mimeType',
        'width',
        'height',
      ].sort(),
      'portrait must contain public metadata only',
    )
    assert.match(asset.id, /^[a-z][a-z0-9-]{1,63}$/u)
    assert.ok(!ids.has(asset.id), 'duplicate portrait ID')
    assert.ok(!subjects.has(asset.subjectId), 'duplicate subject portrait')
    ids.add(asset.id)
    subjects.add(asset.subjectId)
    assert.match(asset.sha256, hashPattern)
    const file = new URL(asset.url)
    assert.equal(file.origin, origin, 'portrait must use the public origin')
    assert.equal(file.search + file.hash, '', 'portrait URL must be immutable')
    const prefix = base + '/assets/'
    assert.ok(
      asset.url.startsWith(prefix),
      'portrait must belong to the pinned release',
    )
    const filename = asset.url.slice(prefix.length)
    assert.match(filename, /^v00[123]--[a-z0-9-]+--[a-f0-9]{64}\.webp$/u)
    assert.ok(
      filename.endsWith('--' + asset.id + '--' + asset.sha256 + '.webp'),
    )
    assert.equal(asset.mimeType, 'image/webp')
    for (const dimension of [asset.width, asset.height]) {
      assert.ok(
        Number.isInteger(dimension) && dimension > 0 && dimension <= 8192,
      )
    }
    const published = manifest.assets.find((item) => item.id === asset.id)
    assert.ok(published, 'portrait is absent from the approved public manifest')
    assert.deepEqual(
      asset,
      published,
      'portrait metadata differs from the public manifest',
    )
  }
  return manifest
}

async function fetchBytes(url, fetcher) {
  const response = await fetcher(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
  })
  assert.ok(response.ok, 'public fetch failed: ' + response.status + ' ' + url)
  const maxBytes = 4 * 1024 * 1024
  const reader = response.body.getReader()
  const chunks = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      assert.ok(size <= maxBytes, 'public asset exceeds the verification limit')
      chunks.push(Buffer.from(value))
    }
  } finally {
    await reader.cancel()
  }
  return Buffer.concat(chunks)
}

export async function verifyRemoteCast(lock, snapshotBytes, fetcher = fetch) {
  validateCastLock(lock, snapshotBytes)
  const liveManifest = await fetchBytes(lock.manifest.url, fetcher)
  assert.equal(
    sha256(liveManifest),
    lock.manifest.sha256,
    'live manifest checksum differs',
  )
  const catalogBytes = await fetchBytes(lock.catalog.url, fetcher)
  assert.equal(
    sha256(catalogBytes),
    lock.catalog.sha256,
    'live catalog checksum differs',
  )
  const catalog = JSON.parse(catalogBytes.toString('utf8'))
  assert.equal(catalog.releaseId, lock.releaseVersion)
  assert.equal(catalog.preview, false)
  for (const asset of lock.assets) {
    const item = catalog.assets.find((entry) => entry.id === asset.id)
    assert.ok(item, 'portrait is absent from the public catalog')
    assert.equal(
      item.view,
      'front',
      'this integration requires a front portrait',
    )
    assert.equal(item.subjectId, asset.subjectId)
    assert.equal(item.sha256, asset.sha256)
    assert.equal(new URL(item.image, origin + '/').href, asset.url)
    const bytes = await fetchBytes(asset.url, fetcher)
    assert.equal(
      sha256(bytes),
      asset.sha256,
      'portrait checksum differs: ' + asset.id,
    )
    assert.equal(
      bytes.toString('ascii', 0, 4),
      'RIFF',
      'invalid WebP container',
    )
    assert.equal(
      bytes.toString('ascii', 8, 12),
      'WEBP',
      'invalid WebP signature',
    )
  }
}

export async function loadCastRegistration() {
  const lock = JSON.parse(
    await readFile(new URL('src/data/cast-release.json', root), 'utf8'),
  )
  // Validate the version before resolving a path from the registration.
  assert.match(lock.releaseVersion, /^v\d+\.\d+\.\d+$/u)
  const bytes = await readFile(
    new URL(
      'vendor/cast/' + lock.releaseVersion + '/consumer-manifest.json',
      root,
    ),
  )
  return { lock, bytes }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { lock, bytes } = await loadCastRegistration()
  validateCastLock(lock, bytes)
  if (process.argv.includes('--remote')) await verifyRemoteCast(lock, bytes)
  console.log(
    'Cast release verified: ' +
      lock.releaseVersion +
      ', ' +
      lock.assets.length +
      ' portraits' +
      (process.argv.includes('--remote')
        ? ' (public HTTP + SHA-256)'
        : ' (offline pin)'),
  )
}
