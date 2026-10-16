import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'

export const releaseVersion = 'scenes-v1.0.0'
export const releaseBase = 'https://cast.acecore.net/releases/' + releaseVersion
export const snapshotPath =
  'vendor/cast/' + releaseVersion + '/consumer-manifest.json'
const defaultRoot = new URL('../', import.meta.url)
const siteOrigins = {
  net: 'https://acecore.net',
  systems: 'https://systems.acecore.net',
  schools: 'https://schools.acecore.net',
}
const expectedCounts = { net: 5, systems: 11, schools: 12 }
const subjects = new Set([
  'hatt',
  'acvc-001',
  'acvc-003',
  'acvc-004',
  'acvc-005',
  'acvc-006',
])
const hashPattern = /^[a-f0-9]{64}$/u
const assetFields = [
  'id',
  'site',
  'subjectIds',
  'url',
  'sha256',
  'mimeType',
  'width',
  'height',
  'bytes',
]
const registrationFields = [
  'schemaVersion',
  'releaseId',
  'site',
  'siteOrigin',
  'catalogUrl',
  'manifest',
  'assets',
]
const localAssetFields = [
  'id',
  'localPath',
  'sourceUrl',
  'sha256',
  'bytes',
  'width',
  'height',
  'mimeType',
]

export function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function exactKeys(value, keys, label) {
  assert.ok(
    value && typeof value === 'object' && !Array.isArray(value),
    label + ' must be an object',
  )
  assert.deepEqual(
    Object.keys(value).sort(),
    [...keys].sort(),
    label + ' contains unexpected fields',
  )
}

function validateImageFields(asset) {
  assert.match(asset.sha256, hashPattern, 'image checksum')
  assert.equal(asset.mimeType, 'image/webp')
  for (const field of ['width', 'height', 'bytes']) {
    assert.ok(
      Number.isSafeInteger(asset[field]) && asset[field] > 0,
      'invalid image ' + field,
    )
  }
}

export function validateCastSceneLock(registration, manifestBytes) {
  exactKeys(registration, registrationFields, 'public scene registration')
  assert.equal(registration.schemaVersion, 1)
  assert.equal(registration.releaseId, releaseVersion, 'unregistered release')
  assert.ok(Object.hasOwn(siteOrigins, registration.site), 'unregistered site')
  assert.equal(
    registration.siteOrigin,
    siteOrigins[registration.site],
    'site origin',
  )
  assert.equal(registration.catalogUrl, 'https://cast.acecore.net/')
  exactKeys(
    registration.manifest,
    ['url', 'sha256', 'snapshot'],
    'manifest registration',
  )
  assert.equal(
    registration.manifest.url,
    releaseBase + '/consumer-manifest.json',
  )
  assert.equal(registration.manifest.snapshot, snapshotPath)
  assert.match(registration.manifest.sha256, hashPattern, 'manifest checksum')
  assert.equal(
    sha256(manifestBytes),
    registration.manifest.sha256,
    'manifest checksum mismatch',
  )

  const manifest = JSON.parse(manifestBytes.toString('utf8'))
  exactKeys(
    manifest,
    [
      'schemaVersion',
      'releaseVersion',
      'manifestUrl',
      'permissions',
      'permittedSites',
      'assets',
    ],
    'public consumer manifest',
  )
  assert.equal(manifest.schemaVersion, 1)
  assert.equal(manifest.releaseVersion, releaseVersion)
  assert.equal(manifest.manifestUrl, registration.manifest.url)
  assert.deepEqual(
    manifest.permissions,
    {
      namedSiteDisplay: true,
      assetDeliveryForNamedSites: true,
      publicCatalogListing: false,
      thirdPartyReuse: false,
      redistribution: false,
      sale: false,
      training: false,
    },
    'scene display permissions must not be broadened',
  )
  assert.ok(
    Array.isArray(manifest.permittedSites) &&
      manifest.permittedSites.includes(registration.siteOrigin),
    'site is not permitted',
  )
  assert.deepEqual(
    [...manifest.permittedSites].sort(),
    Object.values(siteOrigins).sort(),
    'named site allowlist',
  )
  assert.ok(
    Array.isArray(manifest.assets) && manifest.assets.length === 28,
    'scene release asset count',
  )

  const publicAssets = new Map()
  for (const asset of manifest.assets) {
    exactKeys(asset, assetFields, 'public scene asset')
    assert.ok(Object.hasOwn(siteOrigins, asset.site), 'unknown asset site')
    assert.match(
      asset.id,
      new RegExp('^' + asset.site + '--[a-z0-9]+(?:-[a-z0-9]+)*$'),
      'invalid scene id',
    )
    assert.ok(!publicAssets.has(asset.id), 'duplicate public scene')
    validateImageFields(asset)
    assert.equal(
      asset.url,
      releaseBase + '/assets/' + asset.id + '--' + asset.sha256 + '.webp',
      'immutable public scene URL',
    )
    assert.ok(
      Array.isArray(asset.subjectIds) && asset.subjectIds.length > 0,
      'scene subjects missing',
    )
    assert.equal(
      new Set(asset.subjectIds).size,
      asset.subjectIds.length,
      'duplicate scene subjects',
    )
    assert.ok(
      asset.subjectIds.every((subject) => subjects.has(subject)),
      'unregistered scene subject',
    )
    publicAssets.set(asset.id, asset)
  }

  assert.ok(Array.isArray(registration.assets), 'local scene assets missing')
  assert.equal(
    registration.assets.length,
    expectedCounts[registration.site],
    'local scene asset count',
  )
  const expectedIds = manifest.assets
    .filter((asset) => asset.site === registration.site)
    .map((asset) => asset.id)
    .sort()
  const localIds = []
  for (const asset of registration.assets) {
    exactKeys(asset, localAssetFields, 'local scene asset')
    validateImageFields(asset)
    const published = publicAssets.get(asset.id)
    assert.ok(
      published && published.site === registration.site,
      'scene not permitted for this site',
    )
    assert.equal(
      asset.localPath,
      '/images/cast/' +
        releaseVersion +
        '/' +
        asset.id +
        '--' +
        asset.sha256 +
        '.webp',
      'immutable local scene path',
    )
    assert.equal(asset.sourceUrl, published.url, 'public scene URL mismatch')
    for (const field of ['sha256', 'mimeType', 'bytes', 'width', 'height']) {
      assert.equal(
        asset[field],
        published[field],
        'public scene metadata mismatch: ' + field,
      )
    }
    localIds.push(asset.id)
  }
  assert.deepEqual(
    localIds.sort(),
    expectedIds,
    'site scene allowlist mismatch',
  )
  return manifest
}

export async function validateLocalCastScenes(
  registration,
  manifestBytes,
  imageLoader,
) {
  const manifest = validateCastSceneLock(registration, manifestBytes)
  for (const asset of registration.assets) {
    const bytes = await imageLoader(asset)
    assert.equal(bytes.length, asset.bytes, 'local image byte count')
    assert.equal(sha256(bytes), asset.sha256, 'local image checksum')
    assert.equal(
      bytes.subarray(0, 4).toString('ascii'),
      'RIFF',
      'WebP RIFF signature',
    )
    assert.equal(
      bytes.subarray(8, 12).toString('ascii'),
      'WEBP',
      'WebP signature',
    )
    const metadata = await sharp(bytes).metadata()
    assert.equal(metadata.format, 'webp', 'local image format')
    assert.equal(metadata.width, asset.width, 'local image width')
    assert.equal(metadata.height, asset.height, 'local image height')
    assert.ok(!metadata.exif, 'EXIF/GPS metadata is not allowed')
  }
  return manifest
}

export async function loadCastSceneRegistration(root = defaultRoot) {
  const registration = JSON.parse(
    await readFile(new URL('src/data/cast-scenes.json', root), 'utf8'),
  )
  const manifestBytes = await readFile(new URL(snapshotPath, root))
  return { registration, manifestBytes }
}

export async function validateProjectCastScenes(root = defaultRoot) {
  const { registration, manifestBytes } = await loadCastSceneRegistration(root)
  const manifest = await validateLocalCastScenes(
    registration,
    manifestBytes,
    (asset) => readFile(new URL('public' + asset.localPath, root)),
  )
  return { registration, manifest }
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  const { registration } = await validateProjectCastScenes()
  console.log(
    'Validated ' +
      registration.assets.length +
      ' local Cast scene images for ' +
      registration.site +
      ' from ' +
      registration.releaseId +
      ' (offline).',
  )
}
