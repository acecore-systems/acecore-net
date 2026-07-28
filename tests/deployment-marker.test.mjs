import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  assertDeployedBuild,
  parseBuildMarker,
  parseBuildMetadata,
} from '../scripts/wait-for-deployment.mjs'

const COMMIT = 'a'.repeat(40)
const CORPUS_VERSION = 'b'.repeat(20)

test('build markerのcommitとcorpus versionを検証する', () => {
  const marker = JSON.stringify({
    commit: COMMIT.toUpperCase(),
    searchCorpusVersion: CORPUS_VERSION.toUpperCase(),
  })

  assert.deepEqual(parseBuildMetadata(marker), {
    commit: COMMIT,
    searchCorpusVersion: CORPUS_VERSION,
  })
  assert.equal(parseBuildMarker(marker), COMMIT)
  assert.throws(
    () => parseBuildMetadata(JSON.stringify({ commit: COMMIT })),
    /search corpus version/,
  )
})

test('公開commitとcorpus versionの両方が一致した場合だけ許可する', async () => {
  const fetchImpl = async () =>
    new Response(
      JSON.stringify({
        commit: COMMIT,
        searchCorpusVersion: CORPUS_VERSION,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  const silentLogger = { log() {} }

  await assert.doesNotReject(
    assertDeployedBuild(
      'https://acecore.net/.well-known/acecore-build.json',
      COMMIT,
      CORPUS_VERSION,
      { fetchImpl, logger: silentLogger },
    ),
  )
  await assert.rejects(
    assertDeployedBuild(
      'https://acecore.net/.well-known/acecore-build.json',
      COMMIT,
      'c'.repeat(20),
      { fetchImpl, logger: silentLogger },
    ),
    /search corpus differs/,
  )
})
