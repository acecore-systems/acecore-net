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

test('Store-only secret is fresh per request and is used in the GitHub token exchange', async (t) => {
  installNodeTimingSafeEqual(t)
  let secret = 'first-synthetic-store-secret'
  let reads = 0
  const storeEnv = {
    ...env,
    GITHUB_CLIENT_SECRET: undefined,
    GITHUB_CLIENT_SECRET_STORE: {
      async get() {
        reads++
        return secret
      },
    },
  }
  const login = await worker.fetch(
    new Request(
      'https://auth.example/auth?provider=github&site_id=acecore.net',
    ),
    storeEnv,
  )
  assert.equal(login.status, 302)
  assert.equal(reads, 1)
  const state = new URL(login.headers.get('Location')!).searchParams.get(
    'state',
  )!
  const cookie = sessionCookie(login)
  let exchanged = false
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://github.com/login/oauth/access_token')
    const payload = JSON.parse(String(init?.body))
    assert.equal(payload.client_secret, secret)
    assert.equal(payload.client_id, env.GITHUB_CLIENT_ID)
    exchanged = true
    return Response.json({ access_token: 'synthetic-access-token' })
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  secret = 'updated-synthetic-store-secret'
  const callback = await worker.fetch(
    new Request(`https://auth.example/callback?code=synthetic&state=${state}`, {
      headers: { Cookie: cookie },
    }),
    storeEnv,
  )
  assert.match(await callback.text(), /synthetic-access-token/)
  assert.equal(exchanged, true)
  assert.equal(reads, 2)
})

test('Store failure does not use legacy credentials or disclose provider details', async (t) => {
  installNodeTimingSafeEqual(t)
  let broken = false
  let reads = 0
  let requests = 0
  const storeEnv = {
    ...env,
    GITHUB_CLIENT_SECRET_STORE: {
      async get() {
        reads++
        if (broken) throw new Error('synthetic-private-provider-detail')
        return 'synthetic-store-secret'
      },
    },
  }
  const login = await worker.fetch(
    new Request(
      'https://auth.example/auth?provider=github&site_id=acecore.net',
    ),
    storeEnv,
  )
  const state = new URL(login.headers.get('Location')!).searchParams.get(
    'state',
  )!
  broken = true
  const originalFetch = globalThis.fetch
  globalThis.fetch = async () => {
    requests++
    return Response.json({ access_token: 'should-not-happen' })
  }
  t.after(() => {
    globalThis.fetch = originalFetch
  })
  const callback = await worker.fetch(
    new Request(`https://auth.example/callback?code=synthetic&state=${state}`, {
      headers: { Cookie: sessionCookie(login) },
    }),
    storeEnv,
  )
  const body = await callback.text()
  assert.match(body, /MISCONFIGURED_CLIENT/)
  assert.doesNotMatch(
    body,
    /synthetic-private-provider-detail|client-secret|should-not-happen/,
  )
  assert.equal(requests, 0)
  assert.equal(reads, 2)
  for (const path of [
    '/unknown',
    '/auth?provider=github&site_id=attacker.example',
    '/callback?code=synthetic&state=missing',
  ]) {
    await worker.fetch(new Request(`https://auth.example${path}`), storeEnv)
  }
  assert.equal(reads, 2)
  for (const value of ['', 'x'.repeat(1025)]) {
    const response = await worker.fetch(
      new Request(
        'https://auth.example/auth?provider=github&site_id=acecore.net',
      ),
      {
        ...env,
        GITHUB_CLIENT_SECRET_STORE: {
          async get() {
            return value
          },
        },
      },
    )
    assert.match(await response.text(), /MISCONFIGURED_CLIENT/)
  }
  broken = false
  assert.equal(
    (
      await worker.fetch(
        new Request(
          'https://auth.example/auth?provider=github&site_id=acecore.net',
        ),
        storeEnv,
      )
    ).status,
    302,
  )
})

test('preserves explicitly allowed production CMS URL forms without broadening origin access', async () => {
  const allowed = [
    'acecore.net',
    'https://acecore.net/admin/',
    'hatt.acecore.net',
    'https://hatt.acecore.net/admin/',
    'asv.acecore.net',
    'https://asv.acecore.net/admin/',
    'localhost:4321',
    'http://localhost:4321',
  ]
  const sharedEnv = { ...env, ALLOWED_DOMAINS: allowed.join(',') }
  for (const site of allowed) {
    const response = await worker.fetch(
      new Request(
        `https://auth.example/auth?provider=github&site_id=${encodeURIComponent(site)}`,
      ),
      sharedEnv,
    )
    assert.equal(response.status, 302, site)
    const target = String(
      sessionFromCookie(sessionCookie(response)).targetOrigin,
    )
    assert.ok(
      [
        'https://acecore.net',
        'https://hatt.acecore.net',
        'https://asv.acecore.net',
        'http://localhost:4321',
      ].includes(target),
    )
  }
  for (const site of [
    'https://hatt.acecore.net/other',
    'http://hatt.acecore.net',
    'https://hatt.acecore.net/admin/?x=1',
    'https://user@hatt.acecore.net/admin/',
    'https://attacker.example/admin/',
    'https://hatt.acecore.net',
  ]) {
    const response = await worker.fetch(
      new Request(
        `https://auth.example/auth?provider=github&site_id=${encodeURIComponent(site)}`,
      ),
      sharedEnv,
    )
    assert.equal(response.status, 400, site)
  }
})
