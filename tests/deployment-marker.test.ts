import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  assertDeployedBuild,
  parseArguments,
  parseBuildMarker,
  parseBuildMetadata,
  parseSearchCorpusVersion,
  readDeployedBuild,
  waitForDeployment,
} from '../scripts/wait-for-deployment.ts'

const COMMIT = 'a'.repeat(40)
const CORPUS_VERSION = 'b'.repeat(20)
const BUILD_MARKER_URL = 'https://acecore.net/.well-known/acecore-build.json'

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
  assert.throws(() => parseBuildMetadata('[]'), /JSON object/)
})

test('検索corpusのversionをJSON境界で検証する', () => {
  assert.equal(
    parseSearchCorpusVersion({ version: CORPUS_VERSION.toUpperCase() }),
    CORPUS_VERSION,
  )
  assert.throws(() => parseSearchCorpusVersion({ version: 'test' }), /version/)
  assert.throws(() => parseSearchCorpusVersion([]), /JSON object/)
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
    assertDeployedBuild(BUILD_MARKER_URL, COMMIT, CORPUS_VERSION, {
      fetchImpl,
      logger: silentLogger,
    }),
  )
  await assert.rejects(
    assertDeployedBuild(BUILD_MARKER_URL, COMMIT, 'c'.repeat(20), {
      fetchImpl,
      logger: silentLogger,
    }),
    /search corpus differs/,
  )
})

test('CLI引数の形式と余分な引数をfail closedで検証する', () => {
  assert.deepEqual(parseArguments([BUILD_MARKER_URL, COMMIT]), {
    kind: 'wait',
    targetUrl: BUILD_MARKER_URL,
    expectedCommit: COMMIT,
  })
  assert.deepEqual(parseArguments([BUILD_MARKER_URL, '--print-current']), {
    kind: 'print-current',
    targetUrl: BUILD_MARKER_URL,
  })
  assert.deepEqual(
    parseArguments([
      BUILD_MARKER_URL,
      '--assert-current',
      COMMIT,
      '.vectorize/corpus.json',
    ]),
    {
      kind: 'assert-current',
      targetUrl: BUILD_MARKER_URL,
      expectedCommit: COMMIT,
      corpusFile: '.vectorize/corpus.json',
    },
  )
  assert.throws(
    () => parseArguments([BUILD_MARKER_URL, '--print-current', COMMIT]),
    /does not accept additional arguments/,
  )
  assert.throws(
    () => parseArguments([BUILD_MARKER_URL, '--assert-current', COMMIT]),
    /requires an expected commit and corpus JSON file/,
  )
  assert.throws(
    () => parseArguments([BUILD_MARKER_URL, COMMIT, 'unexpected']),
    /only one expected commit/,
  )
})

test('タイムアウトとpoll間隔は正の安全な整数だけを受け入れる', async () => {
  let fetchCalled = false
  const fetchImpl = async () => {
    fetchCalled = true
    return new Response('{}', { status: 200 })
  }

  await assert.rejects(
    readDeployedBuild(BUILD_MARKER_URL, { fetchImpl, fetchTimeoutMs: 0 }),
    /fetchTimeoutMs must be a positive safe integer/,
  )
  assert.equal(fetchCalled, false)

  await assert.rejects(
    waitForDeployment(BUILD_MARKER_URL, COMMIT, { timeoutMs: 0 }),
    /timeoutMs must be a positive safe integer/,
  )
  await assert.rejects(
    waitForDeployment(BUILD_MARKER_URL, COMMIT, {
      timeoutMs: 1,
      pollMs: 0,
    }),
    /pollMs must be a positive safe integer/,
  )
  await assert.rejects(
    waitForDeployment(BUILD_MARKER_URL, COMMIT, {
      timeoutMs: 2_147_483_648,
    }),
    /no greater than 2147483647/,
  )
})
