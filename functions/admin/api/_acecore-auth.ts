import { createRemoteJWKSet, jwtVerify } from 'jose'
import { GitHubApiError } from './_github-api.ts'

export type CmsAccessEnv = {
  CMS_ACCESS_AUD?: string
  CMS_ACCESS_TEAM_DOMAIN?: string
  CMS_ACCESS_HOSTNAMES?: string
}

// Only public key resolvers are cached, never tokens or permissions.
const jwks = new Map<string, ReturnType<typeof createRemoteJWKSet>>()
const SUBJECT = 'https://acecore.net/claims/subject'
const GITHUB_ID = 'https://acecore.net/claims/github-id'

export async function getAcecoreGitHubId(request: Request, env: CmsAccessEnv) {
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
  if (!hostnames.includes(new URL(request.url).hostname.toLowerCase()))
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
  const custom = payload.custom
  if (!custom || typeof custom !== 'object' || Array.isArray(custom))
    throw new GitHubApiError('AcecoreIDの連携GitHubを確認してください。', 403)
  const claims = custom as Record<string, unknown>
  if (
    payload.type !== 'app' ||
    typeof claims[SUBJECT] !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      claims[SUBJECT],
    ) ||
    typeof claims[GITHUB_ID] !== 'string' ||
    !/^[1-9][0-9]{0,19}$/.test(claims[GITHUB_ID])
  ) {
    throw new GitHubApiError('AcecoreIDの連携GitHubを確認してください。', 403)
  }
  return claims[GITHUB_ID]
}
