import { CMS_REPOSITORY } from './_cms-policy.ts'
import { GitHubApiError, githubJson, isRecord } from './_github-api.ts'

const AUTH_CACHE_TTL_MS = 5 * 60 * 1000
const TOKEN_MAX_LENGTH = 512

export type GitHubEditor = {
  avatar_url: string
  email: string | null
  html_url: string
  id: number
  login: string
  name: string | null
  type: string
}

const authorizationCache = new Map<
  string,
  { expiresAt: number; user: GitHubEditor }
>()

export async function getGitHubEditor(request: Request) {
  const token = readOAuthToken(request.headers.get('Authorization'))

  if (!token) {
    throw new GitHubApiError('GitHub OAuth認証が必要です。', 401)
  }

  const cacheKey = await sha256(token)
  const cached = authorizationCache.get(cacheKey)

  if (cached && cached.expiresAt > Date.now()) {
    return { token, user: cached.user }
  }

  const user = await readCurrentUser(token)
  let repository: unknown

  try {
    repository = await githubJson<unknown>({
      path: `/repos/${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}`,
      token,
    })
  } catch (error) {
    if (
      error instanceof GitHubApiError &&
      (error.status === 403 || error.status === 404)
    ) {
      throw new GitHubApiError(
        'このGitHubアカウントにはCMS対象repositoryへのwrite権限がありません。',
        403,
      )
    }

    throw error
  }

  if (
    !isRecord(repository) ||
    !isRecord(repository.permissions) ||
    repository.permissions.push !== true
  ) {
    throw new GitHubApiError(
      'このGitHubアカウントにはCMS対象repositoryへのwrite権限がありません。',
      403,
    )
  }

  authorizationCache.set(cacheKey, {
    expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
    user,
  })

  return { token, user }
}

export function clearGitHubEditorCacheForTests() {
  authorizationCache.clear()
}

function readOAuthToken(authorization: string | null) {
  const match = authorization?.match(/^(?:Bearer|token)\s+(\S+)$/i)
  const token = match?.[1]

  if (!token || token.length > TOKEN_MAX_LENGTH) return null

  return token
}

async function readCurrentUser(token: string): Promise<GitHubEditor> {
  let value: unknown

  try {
    value = await githubJson<unknown>({ path: '/user', token })
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 401) {
      throw new GitHubApiError('GitHub OAuth tokenが無効です。', 401)
    }

    throw error
  }

  if (
    !isRecord(value) ||
    typeof value.id !== 'number' ||
    typeof value.login !== 'string' ||
    typeof value.html_url !== 'string'
  ) {
    throw new GitHubApiError('GitHub user responseが不正です。', 502)
  }

  return {
    avatar_url: typeof value.avatar_url === 'string' ? value.avatar_url : '',
    email: typeof value.email === 'string' ? value.email : null,
    html_url: value.html_url,
    id: value.id,
    login: value.login,
    name: typeof value.name === 'string' ? value.name : null,
    type: typeof value.type === 'string' ? value.type : 'User',
  }
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
