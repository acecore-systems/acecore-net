import { createRemoteJWKSet, jwtVerify } from 'jose'
import { CMS_PRODUCTION_HOSTNAME } from './_cms-policy.ts'
import { GitHubApiError, isRecord } from './_github-api.ts'

export type CmsAccessEnv = {
  CMS_ACCESS_AUD?: string
  CMS_ACCESS_TEAM_DOMAIN?: string
  CMS_ACCESS_HOSTNAMES?: string
}

// Only public key resolvers are cached, never tokens or permissions.
const jwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>()
const SUBJECT = 'https://acecore.net/claims/subject'
const GITHUB_ID = 'https://acecore.net/claims/github-id'
const IDENTITY_ACCOUNT_ID = 'db9b62f409f463da7acbcc374b8385d0'
const IDENTITY_PROVIDER_ID = 'a18ae74a-a342-40db-bfb2-7cc515d26637'
const MAX_IDENTITY_RESPONSE_BYTES = 64 * 1024
const IDENTITY_REQUEST_TIMEOUT_MS = 8 * 1000
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const GITHUB_ID_PATTERN = /^[1-9][0-9]{0,19}$/

export async function getAcecoreGitHubId(request: Request, env: CmsAccessEnv) {
  const url = new URL(request.url)
  if (url.origin !== 'https://' + CMS_PRODUCTION_HOSTNAME)
    throw new GitHubApiError('CMS APIは本番サイトでのみ利用できます。', 403)
  if (
    request.method === 'POST' &&
    (request.headers.get('Origin') !== url.origin ||
      ['cross-site', 'same-site'].includes(
        request.headers.get('Sec-Fetch-Site') || '',
      ))
  )
    throw new GitHubApiError('CMSの同一originから操作してください。', 403)
  const audience = env.CMS_ACCESS_AUD?.trim()
  const hostnames = (env.CMS_ACCESS_HOSTNAMES || '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean)
  let issuer: URL
  try {
    issuer = new URL(env.CMS_ACCESS_TEAM_DOMAIN || '')
    if (
      issuer.protocol !== 'https:' ||
      issuer.port ||
      issuer.username ||
      issuer.password ||
      issuer.pathname !== '/' ||
      issuer.search ||
      issuer.hash ||
      !issuer.hostname.endsWith('.cloudflareaccess.com')
    )
      throw new Error()
  } catch {
    throw new GitHubApiError(
      'CMSのAcecoreID / Access設定が不足しています。',
      503,
    )
  }
  if (!audience || !hostnames.length)
    throw new GitHubApiError(
      'CMSのAcecoreID / Access設定が不足しています。',
      503,
    )
  if (!hostnames.includes(url.hostname.toLowerCase()))
    throw new GitHubApiError('CMSの本番ドメインからログインしてください。', 401)
  const token = request.headers.get('Cf-Access-Jwt-Assertion')
  if (!token || token.length > 32768)
    throw new GitHubApiError('AcecoreIDでログインしてください。', 401)
  let payload
  try {
    let keys = jwks.get(issuer.origin)
    if (!keys) {
      if (jwks.size >= 4) jwks.clear()
      keys = createRemoteJWKSet(new URL('/cdn-cgi/access/certs', issuer))
      jwks.set(issuer.origin, keys)
    }
    payload = (
      await jwtVerify(token, keys, {
        algorithms: ['RS256'],
        issuer: issuer.origin,
        audience,
        requiredClaims: ['sub', 'iat', 'exp'],
        clockTolerance: 60,
      })
    ).payload
  } catch {
    throw new GitHubApiError('AcecoreIDのAccess認証を確認できません。', 401)
  }
  if (payload.type !== 'app')
    throw new GitHubApiError(
      'AcecoreIDの連携GitHubを確認してください。',
      403,
      'CMS_AUTH_TOKEN_TYPE_INVALID',
    )
  if (typeof payload.sub !== 'string' || !UUID_PATTERN.test(payload.sub))
    throw new GitHubApiError(
      'AcecoreIDのAccess認証を確認できません。',
      401,
      'CMS_AUTH_ACCESS_SUBJECT_INVALID',
    )
  const custom = payload.custom
  if (custom !== undefined && !isRecord(custom))
    throw new GitHubApiError(
      'AcecoreIDの連携GitHubを確認してください。',
      403,
      'CMS_AUTH_CUSTOM_CLAIMS_MISSING',
    )
  const claims = custom || {}
  const directSubject = optionalClaim(
    claims,
    SUBJECT,
    UUID_PATTERN,
    'CMS_AUTH_SUBJECT_INVALID',
  )
  const directGitHubId = optionalClaim(
    claims,
    GITHUB_ID,
    GITHUB_ID_PATTERN,
    'CMS_AUTH_GITHUB_ID_INVALID',
  )

  if (directSubject && directGitHubId) return directGitHubId

  const identity = await getFullIdentity(issuer, token)
  if (typeof identity.user_uuid !== 'string')
    throwIdentityError('CMS_AUTH_IDENTITY_USER_MISSING')
  if (identity.user_uuid !== payload.sub)
    throwIdentityError('CMS_AUTH_IDENTITY_USER_MISMATCH')
  if (identity.account_id !== IDENTITY_ACCOUNT_ID)
    throwIdentityError('CMS_AUTH_IDENTITY_ACCOUNT_MISMATCH')
  if (!isRecord(identity.idp) || typeof identity.idp.id !== 'string')
    throwIdentityError('CMS_AUTH_IDENTITY_PROVIDER_MISSING')
  if (identity.idp.id !== IDENTITY_PROVIDER_ID)
    throwIdentityError('CMS_AUTH_IDENTITY_PROVIDER_MISMATCH')
  if (identity.idp.type !== 'oidc')
    throwIdentityError('CMS_AUTH_IDENTITY_PROVIDER_TYPE_MISMATCH')
  if (!isRecord(identity.oidc_fields))
    throwIdentityError('CMS_AUTH_IDENTITY_FIELDS_MISSING')

  const identitySubject = requiredIdentityClaim(
    identity.oidc_fields,
    SUBJECT,
    UUID_PATTERN,
    'CMS_AUTH_SUBJECT_INVALID',
  )
  const identityGitHubId = requiredIdentityClaim(
    identity.oidc_fields,
    GITHUB_ID,
    GITHUB_ID_PATTERN,
    'CMS_AUTH_GITHUB_ID_INVALID',
  )
  if (
    (directSubject !== undefined && directSubject !== identitySubject) ||
    (directGitHubId !== undefined && directGitHubId !== identityGitHubId)
  )
    throwIdentityError('CMS_AUTH_IDENTITY_SOURCE_CONFLICT')
  return identityGitHubId
}

function optionalClaim(
  claims: Record<string, unknown>,
  name: string,
  pattern: RegExp,
  code: string,
) {
  const value = claims[name]
  if (value === undefined) return undefined
  if (typeof value !== 'string' || !pattern.test(value))
    throw new GitHubApiError(
      'AcecoreIDの連携GitHubを確認してください。',
      403,
      code,
    )
  return value
}

async function getFullIdentity(issuer: URL, token: string) {
  let response: Response
  try {
    response = await fetch(new URL('/cdn-cgi/access/get-identity', issuer), {
      method: 'GET',
      redirect: 'manual',
      cache: 'no-store',
      signal: AbortSignal.timeout(IDENTITY_REQUEST_TIMEOUT_MS),
      headers: {
        Accept: 'application/json',
        Cookie: 'CF_Authorization=' + token,
      },
    })
  } catch {
    throwIdentityError('CMS_AUTH_IDENTITY_UNAVAILABLE', 502)
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined)
    throwIdentityError('CMS_AUTH_IDENTITY_UNAVAILABLE', 502)
  }
  const identity = await readBoundedJson(response)
  if (!isRecord(identity)) throwIdentityError('CMS_AUTH_IDENTITY_INVALID', 502)
  return identity
}

function requiredIdentityClaim(
  claims: Record<string, unknown>,
  name: string,
  pattern: RegExp,
  code: string,
) {
  const value = claims[name]
  if (typeof value !== 'string' || !pattern.test(value))
    throwIdentityError(code)
  return value
}

function throwIdentityError(code: string, status = 403): never {
  console.warn(
    JSON.stringify({ message: 'CMS Access identity rejected', code }),
  )
  throw new GitHubApiError(
    'AcecoreIDの連携GitHubを確認してください。',
    status,
    code,
  )
}

async function readBoundedJson(response: Response): Promise<unknown> {
  if (!response.body) return null
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalBytes += value.byteLength
      if (totalBytes > MAX_IDENTITY_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined)
        return null
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(totalBytes)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes),
    )
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }
}
