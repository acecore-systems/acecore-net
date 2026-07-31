import assert from 'node:assert/strict'
import test from 'node:test'

import worker from '../workers/sveltia-cms-auth/src/index.ts'

const env: Record<string, string> = {
  ALLOWED_DOMAINS:
    'acecore.net,*.acecore-net.pages.dev,localhost,localhost:4321,127.0.0.1',
  GITHUB_SCOPE: 'repo,user',
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
}

const fetchWorker = (path: string, init?: RequestInit): Promise<Response> => {
  assert.ok(worker.fetch)
  return worker.fetch(new Request(`https://auth.example${path}`, init), env)
}

test('starts GitHub OAuth only for an allowed CMS origin', async () => {
  const response = await fetchWorker(
    '/auth?provider=github&site_id=acecore.net',
  )

  assert.equal(response.status, 302)

  const location = new URL(response.headers.get('Location') || '')
  assert.equal(location.origin, 'https://github.com')
  assert.equal(location.pathname, '/login/oauth/authorize')
  assert.equal(location.searchParams.get('client_id'), 'client-id')
  assert.equal(location.searchParams.get('scope'), 'repo,user')
  assert.match(location.searchParams.get('state') || '', /^[0-9a-f]{32}$/)
  assert.match(
    response.headers.get('Set-Cookie') || '',
    /sveltia-cms-auth-csrf=[0-9a-f]{32}; HttpOnly; Path=\/; Max-Age=600; SameSite=Lax; Secure/,
  )
})

test('rejects an unsupported Git backend before OAuth redirect', async () => {
  const response = await fetchWorker(
    '/auth?provider=gitlab&site_id=acecore.net',
  )

  assert.equal(response.status, 200)
  assert.match(await response.text(), /UNSUPPORTED_BACKEND/)
})

test('rejects a callback without an authorization code', async () => {
  const response = await fetchWorker('/callback?state=csrf-token')

  assert.equal(response.status, 200)
  assert.match(await response.text(), /AUTH_CODE_REQUEST_FAILED/)
})

test('returns 404 for a route outside the OAuth flow', async () => {
  const response = await fetchWorker('/unknown?provider=github')

  assert.equal(response.status, 404)
})
