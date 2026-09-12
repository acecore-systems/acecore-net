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

// GitHub remains the authorization source, not a second login or bearer path.
export async function getGitHubEditor(
  request: Request,
  env: CmsEditorEnv,
  { forceRefresh = false }: { forceRefresh?: boolean } = {},
) {
  const id = await getAcecoreGitHubId(request, env)
  const token = await getGitHubAppToken(env, { forceRefresh })
  // This endpoint supports installation tokens and includes team/base/owner grants.
  // Match immutable ID directly; do not use the user-token-only /permission endpoint.
  for (let page = 1; page <= 100; page++) {
    const rows = await githubJson<unknown>({
      path: `/repos/${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}/collaborators?affiliation=all&per_page=100&page=${page}`,
      token,
    })
    if (!Array.isArray(rows))
      throw new GitHubApiError('GitHub権限の応答が不正です。', 502)
    const user = rows.find(
      (row) =>
        isRecord(row) && Number.isSafeInteger(row.id) && String(row.id) === id,
    )
    if (user) {
      if (!isRecord(user.permissions) || user.permissions.push !== true) break
      if (
        typeof user.login !== 'string' ||
        !/^[a-z0-9][a-z0-9-]{0,38}$/i.test(user.login) ||
        user.type !== 'User'
      ) {
        throw new GitHubApiError('GitHub userの応答が不正です。', 502)
      }
      return {
        user: {
          id: user.id,
          login: user.login,
          type: user.type,
          html_url: `https://github.com/${user.login}`,
          avatar_url:
            typeof user.avatar_url === 'string' ? user.avatar_url : '',
          email: null,
          name: null,
        } satisfies GitHubEditor,
      }
    }
    if (rows.length < 100) break
    if (page === 100)
      throw new GitHubApiError('GitHub権限一覧を完全に確認できません。', 503)
  }
  throw new GitHubApiError(
    '連携GitHubアカウントにはCMS対象repositoryへのwrite権限がありません。',
    403,
  )
}
