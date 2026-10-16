import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  loadCastRegistration,
  sha256,
  validateCastLock,
  verifyRemoteCast,
} from '../scripts/validate-cast-release.mjs'

const { lock, bytes } = await loadCastRegistration()
const clone = () => structuredClone(lock)

test('the selected portraits match the pinned public manifest', () => {
  assert.equal(
    validateCastLock(lock, bytes).releaseVersion,
    lock.releaseVersion,
  )
})

test('a changed manifest is rejected before parsing', () => {
  assert.throws(
    () => validateCastLock(lock, Buffer.concat([bytes, Buffer.from(' ')])),
    /checksum/,
  )
})

test('mutable or third-party portrait URLs are rejected', () => {
  for (const url of [
    'https://cast.acecore.net/latest/portrait.webp',
    'https://example.com/portrait.webp',
    lock.assets[0].url + '?latest=1',
  ]) {
    const candidate = clone()
    candidate.assets[0].url = url
    assert.throws(() => validateCastLock(candidate, bytes))
  }
})

test('unregistered sites and releases are rejected', () => {
  const candidate = clone()
  candidate.siteOrigin = 'https://example.com'
  assert.throws(() => validateCastLock(candidate, bytes), /site/)
  candidate.siteOrigin = lock.siteOrigin
  candidate.releaseVersion = 'latest'
  assert.throws(() => validateCastLock(candidate, bytes), /release/)
})

test('duplicate subjects, wrong dimensions and altered hashes are rejected', () => {
  for (const mutate of [
    (candidate) => candidate.assets.push(candidate.assets[0]),
    (candidate) => {
      candidate.assets[0].width = 0
    },
    (candidate) => {
      candidate.assets[0].height += 1
    },
    (candidate) => {
      candidate.assets[0].sha256 = '0'.repeat(64)
    },
  ]) {
    const candidate = clone()
    mutate(candidate)
    assert.throws(() => validateCastLock(candidate, bytes))
  }
})

test('broader reuse permissions are not silently accepted', () => {
  const manifest = JSON.parse(bytes.toString('utf8'))
  manifest.permissions.training = true
  const altered = Buffer.from(JSON.stringify(manifest))
  const candidate = clone()
  candidate.manifest.sha256 = sha256(altered)
  assert.throws(() => validateCastLock(candidate, altered), /permissions/)
})

test('private or unknown registration fields are rejected', () => {
  const candidate = clone()
  candidate.privateSource = 'not-public'
  assert.throws(
    () => validateCastLock(candidate, bytes),
    /public registration fields/,
  )
})

test('remote verification rejects a changed manifest without following asset requests', async () => {
  let calls = 0
  await assert.rejects(
    verifyRemoteCast(lock, bytes, async () => {
      calls += 1
      return new Response('changed public manifest')
    }),
    /live manifest checksum/,
  )
  assert.equal(calls, 1)
})

function remoteFixture() {
  const candidate = clone()
  const imageBytes = Buffer.from('RIFF0000WEBPsynthetic-test-only')
  const asset = { ...candidate.assets[0], sha256: sha256(imageBytes) }
  asset.url = asset.url.replace(/[a-f0-9]{64}\.webp$/u, asset.sha256 + '.webp')
  candidate.assets = [asset]
  const catalogBytes = Buffer.from(
    JSON.stringify({
      releaseId: candidate.releaseVersion,
      preview: false,
      assets: [
        {
          id: asset.id,
          subjectId: asset.subjectId,
          sha256: asset.sha256,
          view: 'front',
          image: new URL(asset.url).pathname.slice(1),
        },
      ],
    }),
  )
  candidate.catalog.sha256 = sha256(catalogBytes)
  const manifest = JSON.parse(bytes.toString('utf8'))
  manifest.assets = [asset]
  manifest.catalog = { ...candidate.catalog }
  const manifestBytes = Buffer.from(JSON.stringify(manifest))
  candidate.manifest.sha256 = sha256(manifestBytes)
  const responses = new Map([
    [candidate.manifest.url, manifestBytes],
    [candidate.catalog.url, catalogBytes],
    [asset.url, imageBytes],
  ])
  return {
    candidate,
    manifestBytes,
    responses,
    fetcher: async (url) => {
      assert.ok(responses.has(url), 'unexpected public request')
      return new Response(responses.get(url))
    },
  }
}

test('remote verification checks a complete manifest, catalog and WebP image', async () => {
  const fixture = remoteFixture()
  await verifyRemoteCast(
    fixture.candidate,
    fixture.manifestBytes,
    fixture.fetcher,
  )
})

test('remote verification rejects changed catalog or image bytes', async () => {
  for (const field of ['catalog', 'image']) {
    const fixture = remoteFixture()
    const url =
      field === 'catalog'
        ? fixture.candidate.catalog.url
        : fixture.candidate.assets[0].url
    fixture.responses.set(url, Buffer.from('changed bytes'))
    await assert.rejects(
      verifyRemoteCast(
        fixture.candidate,
        fixture.manifestBytes,
        fixture.fetcher,
      ),
      field === 'catalog' ? /catalog checksum/ : /portrait checksum/,
    )
  }
})
