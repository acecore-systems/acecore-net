import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const COMMIT_PATTERN = /^[0-9a-f]{40}$/i
const MAX_MARKER_BYTES = 4096

export function parseBuildMarker(text) {
  if (Buffer.byteLength(text, 'utf8') > MAX_MARKER_BYTES) {
    throw new Error('Pages build marker is unexpectedly large.')
  }

  const payload = JSON.parse(text)
  if (
    typeof payload?.commit !== 'string' ||
    !COMMIT_PATTERN.test(payload.commit)
  ) {
    throw new Error('Pages build marker must contain a full 40-character SHA.')
  }

  return payload.commit.toLowerCase()
}

export async function readDeployedCommit(
  targetUrl,
  {
    fetchImpl = globalThis.fetch,
    fetchTimeoutMs = Number(process.env.DEPLOYMENT_FETCH_TIMEOUT_MS || 10_000),
  } = {},
) {
  const url = new URL(targetUrl)
  if (url.protocol !== 'https:') {
    throw new Error('Pages build marker URL must use HTTPS.')
  }

  const response = await fetchImpl(url, {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache, no-store',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(fetchTimeoutMs),
  })
  if (!response.ok) {
    throw new Error(`Pages build marker returned HTTP ${response.status}.`)
  }

  return parseBuildMarker(await response.text())
}

export async function waitForDeployment(
  targetUrl,
  expectedCommit,
  {
    timeoutMs = Number(process.env.DEPLOYMENT_WAIT_TIMEOUT_MS || 600_000),
    pollMs = Number(process.env.DEPLOYMENT_WAIT_POLL_MS || 15_000),
    fetchImpl = globalThis.fetch,
    fetchTimeoutMs = Number(process.env.DEPLOYMENT_FETCH_TIMEOUT_MS || 10_000),
    logger = console,
  } = {},
) {
  if (!COMMIT_PATTERN.test(expectedCommit)) {
    throw new Error('Expected commit must be a full 40-character Git SHA.')
  }

  const normalizedExpectedCommit = expectedCommit.toLowerCase()
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const deployedCommit = await readDeployedCommit(targetUrl, {
        fetchImpl,
        fetchTimeoutMs,
      })
      if (deployedCommit === normalizedExpectedCommit) {
        logger.log(
          JSON.stringify({
            event: 'pages_deployment_ready',
            commit: normalizedExpectedCommit,
          }),
        )
        return normalizedExpectedCommit
      }
    } catch {
      // A deployment can be temporarily unreachable while Cloudflare promotes it.
    }

    await new Promise((resolvePromise) => setTimeout(resolvePromise, pollMs))
  }

  throw new Error(
    `Timed out waiting for Pages deployment ${normalizedExpectedCommit}.`,
  )
}

function isDirectExecution() {
  if (!process.argv[1]) return false
  return (
    resolve(process.argv[1]).toLowerCase() ===
    fileURLToPath(import.meta.url).toLowerCase()
  )
}

if (isDirectExecution()) {
  const targetUrl = process.argv[2]
  const command = process.argv[3]

  if (!targetUrl || !command) {
    throw new Error(
      'Usage: node scripts/wait-for-deployment.mjs <build-meta-url> <commit-sha|--print-current>',
    )
  }

  if (command === '--print-current') {
    console.log(await readDeployedCommit(targetUrl))
  } else {
    await waitForDeployment(targetUrl, command)
  }
}
