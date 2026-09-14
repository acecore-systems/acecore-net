import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import { SignJWT, exportJWK, generateKeyPair } from 'jose'
import { getAcecoreGitHubId } from '../functions/admin/api/_acecore-auth.ts'
import { CMS_PRODUCTION_HOSTNAME } from '../functions/admin/api/_cms-policy.ts'

const { privateKey, publicKey } = await generateKeyPair('RS256')
const issuer = 'https://identity-test.cloudflareaccess.com'
const audience = 'identity-test'
const userUuid = '22222222-2222-4222-8222-222222222222'
const accountId = 'db9b62f409f463da7acbcc374b8385d0'
const providerId = 'a18ae74a-a342-40db-bfb2-7cc515d26637'
const subjectClaim = 'https://acecore.net/claims/subject'
const githubIdClaim = 'https://acecore.net/claims/github-id'
const subject = '11111111-1111-4111-8111-111111111111'
const env = {
  CMS_ACCESS_AUD: audience,
  CMS_ACCESS_TEAM_DOMAIN: issuer,
  CMS_ACCESS_HOSTNAMES: CMS_PRODUCTION_HOSTNAME,
}
const jwk = {
  ...(await exportJWK(publicKey)),
  kid: 'identity-test',
  alg: 'RS256',
  use: 'sig',
}
const originalFetch = globalThis.fetch
const originalWarn = console.warn

afterEach(() => {
  globalThis.fetch = originalFetch
  console.warn = originalWarn
})

async function mintAccess(overrides = {}) {
  return new SignJWT({
    sub: userUuid,
    iss: issuer,
    aud: audience,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    type: 'app',
    custom: { [subjectClaim]: subject, [githubIdClaim]: '1' },
    ...overrides,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'identity-test' })
    .sign(privateKey)
}

function request(token) {
  return new Request(
    'https://' + CMS_PRODUCTION_HOSTNAME + '/admin/api/github/user',
    { headers: { 'Cf-Access-Jwt-Assertion': token } },
  )
}

function identity(overrides = {}) {
  return {
    user_uuid: userUuid,
    account_id: accountId,
    idp: { id: providerId, type: 'oidc' },
    oidc_fields: { [subjectClaim]: subject, [githubIdClaim]: '1' },
    ...overrides,
  }
}

function accessFetch(token, respond = () => Response.json(identity())) {
  return async (input, init = {}) => {
    const url = String(input)
    if (url === issuer + '/cdn-cgi/access/certs')
      return Response.json({ keys: [jwk] })
    assert.equal(url, issuer + '/cdn-cgi/access/get-identity')
    assert.equal(init.method, 'GET')
    assert.equal(init.redirect, 'manual')
    assert.equal(init.cache, 'no-store')
    assert.equal(init.signal instanceof AbortSignal, true)
    const headers = new Headers(init.headers)
    assert.deepEqual([...headers.keys()].sort(), ['accept', 'cookie'])
    assert.equal(headers.get('Cookie'), 'CF_Authorization=' + token)
    return respond()
  }
}

for (const custom of [
  undefined,
  {},
  { [subjectClaim]: subject },
  { [githubIdClaim]: '1' },
]) {
  test('欠落claimだけfull identityで補完する', async () => {
    const token = await mintAccess({ custom })
    globalThis.fetch = accessFetch(token)
    assert.equal(await getAcecoreGitHubId(request(token), env), '1')
  })
}

for (const { custom, code } of [
  { custom: [], code: 'CMS_AUTH_CUSTOM_CLAIMS_MISSING' },
  {
    custom: { [subjectClaim]: 'invalid', [githubIdClaim]: '1' },
    code: 'CMS_AUTH_SUBJECT_INVALID',
  },
  {
    custom: { [subjectClaim]: subject, [githubIdClaim]: '0' },
    code: 'CMS_AUTH_GITHUB_ID_INVALID',
  },
]) {
  test('不正な署名claimはfull identityで救済しない', async () => {
    const token = await mintAccess({ custom })
    globalThis.fetch = accessFetch(token, () =>
      assert.fail('Unexpected identity request'),
    )
    await assert.rejects(getAcecoreGitHubId(request(token), env), {
      status: 403,
      code,
    })
  })
}

for (const { value, code } of [
  {
    value: identity({ user_uuid: undefined }),
    code: 'CMS_AUTH_IDENTITY_USER_MISSING',
  },
  {
    value: identity({
      user_uuid: '33333333-3333-4333-8333-333333333333',
    }),
    code: 'CMS_AUTH_IDENTITY_USER_MISMATCH',
  },
  {
    value: identity({ account_id: 'other' }),
    code: 'CMS_AUTH_IDENTITY_ACCOUNT_MISMATCH',
  },
  {
    value: identity({ idp: undefined }),
    code: 'CMS_AUTH_IDENTITY_PROVIDER_MISSING',
  },
  {
    value: identity({ idp: { id: 'other', type: 'oidc' } }),
    code: 'CMS_AUTH_IDENTITY_PROVIDER_MISMATCH',
  },
  {
    value: identity({ idp: { id: providerId, type: 'github' } }),
    code: 'CMS_AUTH_IDENTITY_PROVIDER_TYPE_MISMATCH',
  },
  {
    value: identity({ oidc_fields: undefined }),
    code: 'CMS_AUTH_IDENTITY_FIELDS_MISSING',
  },
]) {
  test('full identity本人境界を拒否する: ' + code, async () => {
    const token = await mintAccess({ custom: undefined })
    globalThis.fetch = accessFetch(token, () => Response.json(value))
    console.warn = () => {}
    await assert.rejects(getAcecoreGitHubId(request(token), env), {
      status: 403,
      code,
    })
  })
}

test('署名claimとfull identityの不一致を拒否する', async () => {
  const token = await mintAccess({ custom: { [githubIdClaim]: '1' } })
  globalThis.fetch = accessFetch(token, () =>
    Response.json(
      identity({
        oidc_fields: { [subjectClaim]: subject, [githubIdClaim]: '2' },
      }),
    ),
  )
  console.warn = () => {}
  await assert.rejects(getAcecoreGitHubId(request(token), env), {
    status: 403,
    code: 'CMS_AUTH_IDENTITY_SOURCE_CONFLICT',
  })
})

for (const { response, code } of [
  {
    response: () => new Response(null, { status: 302 }),
    code: 'CMS_AUTH_IDENTITY_UNAVAILABLE',
  },
  {
    response: () => new Response(new Uint8Array(64 * 1024 + 1)),
    code: 'CMS_AUTH_IDENTITY_INVALID',
  },
  {
    response: () => new Response('{'),
    code: 'CMS_AUTH_IDENTITY_INVALID',
  },
]) {
  test('危険なfull identity応答を拒否する: ' + code, async () => {
    const token = await mintAccess({ custom: undefined })
    globalThis.fetch = accessFetch(token, response)
    console.warn = () => {}
    await assert.rejects(getAcecoreGitHubId(request(token), env), {
      status: 502,
      code,
    })
  })
}

test('不正なAccess subはfull identity取得前に拒否する', async () => {
  const token = await mintAccess({ custom: undefined, sub: 'not-a-uuid' })
  globalThis.fetch = accessFetch(token, () =>
    assert.fail('Unexpected identity request'),
  )
  await assert.rejects(getAcecoreGitHubId(request(token), env), {
    status: 401,
    code: 'CMS_AUTH_ACCESS_SUBJECT_INVALID',
  })
})
