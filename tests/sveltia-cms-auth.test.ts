import assert from 'node:assert/strict'
import test from 'node:test'
import { runInNewContext } from 'node:vm'

import worker from '../workers/sveltia-cms-auth/src/index.ts'

const env = {
  ALLOWED_DOMAINS:
    'acecore.net,*.acecore-net.pages.dev,localhost,localhost:4321,127.0.0.1',
  GITHUB_SCOPE: 'repo,user',
  GITHUB_CLIENT_ID: 'client-id',
  GITHUB_CLIENT_SECRET: 'client-secret',
} as const

const fetchWorker = (path: string, init?: RequestInit): Promise<Response> => {
  assert.ok(worker.fetch)
  return worker.fetch(new Request(`https://auth.example${path}`, init), env)
}

const sessionCookie = (response: Response): string =>
  (response.headers.get('Set-Cookie') || '').split(';', 1)[0]

const sessionFromCookie = (cookie: string): Record<string, unknown> => {
  const value = cookie.slice('sveltia-cms-auth-csrf='.length)
  return JSON.parse(decodeURIComponent(value))
}

const installNodeTimingSafeEqual = (testContext: {
  after: (callback: () => void) => void
}): void => {
  const descriptor = Object.getOwnPropertyDescriptor(
    crypto.subtle,
    'timingSafeEqual',
  )

  Object.defineProperty(crypto.subtle, 'timingSafeEqual', {
    configurable: true,
    value: (left: ArrayBuffer, right: ArrayBuffer): boolean => {
      const leftBytes = new Uint8Array(left)
      const rightBytes = new Uint8Array(right)
      return (
        leftBytes.length === rightBytes.length &&
        leftBytes.every((byte, index) => byte === rightBytes[index])
      )
    },
  })

  testContext.after(() => {
    if (descriptor) {
      Object.defineProperty(crypto.subtle, 'timingSafeEqual', descriptor)
    } else {
      Reflect.deleteProperty(crypto.subtle, 'timingSafeEqual')
    }
  })
}

test('starts GitHub OAuth only for an allowed CMS origin', async () => {
  const response = await fetchWorker(
    '/auth?provider=github&site_id=acecore.net',
  )

  assert.equal(response.status, 302)
  assert.equal(response.headers.get('Cache-Control'), 'no-store')

  const location = new URL(response.headers.get('Location') || '')
  assert.equal(location.origin, 'https://github.com')
  assert.equal(location.pathname, '/login/oauth/authorize')
  assert.equal(location.searchParams.get('client_id'), 'client-id')
  assert.equal(location.searchParams.get('scope'), 'repo,user')
  assert.match(location.searchParams.get('state') || '', /^[0-9a-f]{32}$/)

  const cookie = sessionCookie(response)
  assert.match(cookie, /^sveltia-cms-auth-csrf=%7B/)
  assert.deepEqual(sessionFromCookie(cookie), {
    csrfToken: location.searchParams.get('state'),
    targetOrigin: 'https://acecore.net',
  })
  assert.match(
    response.headers.get('Set-Cookie') || '',
    /; HttpOnly; Path=\/; Max-Age=600; SameSite=Lax; Secure/,
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
  const authResponse = await fetchWorker(
    '/auth?provider=github&site_id=acecore.net',
  )
  const response = await fetchWorker('/callback?state=csrf-token', {
    headers: { Cookie: sessionCookie(authResponse) },
  })

  assert.equal(response.status, 200)
  assert.match(await response.text(), /AUTH_CODE_REQUEST_FAILED/)
})

test('rejects a CMS origin outside the allowlist', async () => {
  const response = await fetchWorker(
    '/auth?provider=github&site_id=attacker.example',
  )

  assert.equal(response.status, 400)
  assert.match(await response.text(), /UNSUPPORTED_DOMAIN/)
})

test('keeps loopback CMS authentication on its HTTP origin', async () => {
  const response = await fetchWorker(
    '/auth?provider=github&site_id=localhost:4321',
  )

  assert.equal(
    sessionFromCookie(sessionCookie(response)).targetOrigin,
    'http://localhost:4321',
  )
})

test('rejects a callback session with an unallowlisted target origin', async () => {
  const authResponse = await fetchWorker(
    '/auth?provider=github&site_id=acecore.net',
  )
  const state = new URL(
    authResponse.headers.get('Location') || '',
  ).searchParams.get('state')
  assert.ok(state)

  const forgedCookie = `sveltia-cms-auth-csrf=${encodeURIComponent(
    JSON.stringify({
      ...sessionFromCookie(sessionCookie(authResponse)),
      targetOrigin: 'https://attacker.example',
    }),
  )}`
  const response = await fetchWorker(`/callback?code=code&state=${state}`, {
    headers: { Cookie: forgedCookie },
  })

  assert.equal(response.status, 400)
  assert.match(await response.text(), /CSRF_DETECTED/)
})

test('binds the OAuth token result to the allowed CMS opener origin', async (t) => {
  const authResponse = await fetchWorker(
    '/auth?provider=github&site_id=acecore.net',
  )
  const state = new URL(
    authResponse.headers.get('Location') || '',
  ).searchParams.get('state')
  assert.ok(state)

  installNodeTimingSafeEqual(t)

  const originalFetch = globalThis.fetch
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ access_token: 'access-token' }))
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  const callbackResponse = await fetchWorker(
    `/callback?code=code&state=${state}`,
    {
      headers: { Cookie: sessionCookie(authResponse) },
    },
  )
  const callbackHTML = await callbackResponse.text()
  const script = callbackHTML.match(/<script>([\s\S]+)<\/script>/)?.[1]
  assert.ok(script)

  const postedMessages: Array<{ message: unknown; targetOrigin: string }> = []
  let messageListener:
    | ((event: { data: unknown; origin: string; source: unknown }) => void)
    | undefined
  const opener = {
    postMessage: (message: unknown, targetOrigin: string): void => {
      postedMessages.push({ message, targetOrigin })
    },
  }
  const popupWindow = {
    opener,
    addEventListener: (
      eventName: string,
      listener: (event: {
        data: unknown
        origin: string
        source: unknown
      }) => void,
    ): void => {
      assert.equal(eventName, 'message')
      messageListener = listener
    },
  }

  runInNewContext(script, { window: popupWindow })
  assert.ok(messageListener)
  assert.deepEqual(postedMessages, [
    { message: 'authorizing:github', targetOrigin: 'https://acecore.net' },
  ])

  messageListener({
    data: 'authorizing:github',
    origin: 'https://attacker.example',
    source: opener,
  })
  assert.equal(postedMessages.length, 1)

  messageListener({
    data: 'authorizing:github',
    origin: 'https://acecore.net',
    source: {},
  })
  assert.equal(postedMessages.length, 1)

  messageListener({
    data: 'authorizing:github',
    origin: 'https://acecore.net',
    source: opener,
  })
  assert.equal(postedMessages.length, 2)
  assert.match(String(postedMessages[1]?.message), /access-token/)
  assert.equal(postedMessages[1]?.targetOrigin, 'https://acecore.net')
})

test('returns 404 for a route outside the OAuth flow', async () => {
  const response = await fetchWorker('/unknown?provider=github')

  assert.equal(response.status, 404)
})
