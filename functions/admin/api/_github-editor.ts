import { CMS_REPOSITORY } from './_cms-policy.ts'
import {
  GitHubApiError,
  getGitHubAppToken,
  githubJson,
  isRecord,
  type CmsGitHubAppEnv,
} from './_github-api.ts'
import { getAcecoreGitHubId, type CmsAccessEnv } from './_acecore-auth.ts'

export type CmsEditorEnv = CmsGitHubAppEnv & CmsAccessEnv
export type GitHubEditor = {
  avatar_url: string
  email: string | null
  html_url: string
  id: number
  login: string
  name: string | null
  type: string
}

const GITHUB_LOGIN_PATTERN = /^[a-z0-9][a-z0-9-]{0,38}$/i
const NO_WRITE_PERMISSION_MESSAGE =
  '連携GitHubアカウントにはCMS対象repositoryへのwrite権限がありません。'
const NO_WRITE_PERMISSION_CODE = 'CMS_AUTH_REPOSITORY_WRITE_DENIED'

export async function getGitHubEditor(
  request: Request,
  env: CmsEditorEnv,
  { forceRefresh = false }: { forceRefresh?: boolean } = {},
) {
  const id = await getAcecoreGitHubId(request, env)
  const token = await getGitHubAppToken(env, { forceRefresh })
  const user = await getCurrentGitHubUser(token, id)
  await requireRepositoryWritePermission(token, id, user.login)
  return {
    user: {
      id: user.id,
      login: user.login,
      type: user.type,
      html_url: 'https://github.com/' + user.login,
      avatar_url: typeof user.avatar_url === 'string' ? user.avatar_url : '',
      email: null,
      name: null,
    } satisfies GitHubEditor,
  }
}

async function getCurrentGitHubUser(token: string, id: string) {
  let user: unknown
  try {
    user = await githubJson<unknown>({ path: '/user/' + id, token })
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404)
      throw new GitHubApiError(
        'GitHubの連携ユーザーを数値IDから確認できません。',
        502,
      )
    throw error
  }
  if (
    !isRecord(user) ||
    typeof user.id !== 'number' ||
    !Number.isSafeInteger(user.id) ||
    String(user.id) !== id ||
    typeof user.login !== 'string' ||
    !GITHUB_LOGIN_PATTERN.test(user.login) ||
    user.type !== 'User'
  )
    throw new GitHubApiError('GitHub userの応答が不正です。', 502)
  return {
    id: user.id,
    login: user.login,
    type: user.type,
    avatar_url: user.avatar_url,
  }
}

async function requireRepositoryWritePermission(
  token: string,
  id: string,
  login: string,
) {
  let grant: unknown
  try {
    grant = await githubJson<unknown>({
      path:
        '/repos/' +
        CMS_REPOSITORY.owner +
        '/' +
        CMS_REPOSITORY.name +
        '/collaborators/' +
        encodeURIComponent(login) +
        '/permission',
      token,
    })
  } catch (error) {
    if (error instanceof GitHubApiError && error.status === 404)
      throw new GitHubApiError(
        NO_WRITE_PERMISSION_MESSAGE,
        403,
        NO_WRITE_PERMISSION_CODE,
      )
    throw error
  }
  if (
    !isRecord(grant) ||
    typeof grant.permission !== 'string' ||
    !['admin', 'write', 'read', 'none'].includes(grant.permission) ||
    typeof grant.role_name !== 'string' ||
    !grant.role_name.trim() ||
    !isRecord(grant.user) ||
    typeof grant.user.id !== 'number' ||
    !Number.isSafeInteger(grant.user.id) ||
    String(grant.user.id) !== id ||
    typeof grant.user.login !== 'string' ||
    grant.user.login.toLowerCase() !== login.toLowerCase() ||
    grant.user.type !== 'User'
  )
    throw new GitHubApiError('GitHub権限の応答が不正です。', 502)
  if (grant.permission !== 'admin' && grant.permission !== 'write')
    throw new GitHubApiError(
      NO_WRITE_PERMISSION_MESSAGE,
      403,
      NO_WRITE_PERMISSION_CODE,
    )
}
