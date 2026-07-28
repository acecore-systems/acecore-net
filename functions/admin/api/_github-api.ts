import { SignJWT, importPKCS8 } from 'jose'

import {
  CMS_REPOSITORY,
  isAllowedCmsDirectoryPath,
  isAllowedCmsWritePath,
  normalizeCmsPath,
} from './_cms-policy.ts'

const GITHUB_API_VERSION = '2022-11-28'
const USER_AGENT = 'acecore-net-sveltia-cms'
const INSTALLATION_TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000
const RSA_ALGORITHM_IDENTIFIER = Uint8Array.from([
  0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
  0x05, 0x00,
])

export type CmsGitHubAppEnv = {
  CMS_GITHUB_APP_CLIENT_ID?: string
  CMS_GITHUB_APP_INSTALLATION_ID?: string
  CMS_GITHUB_APP_PRIVATE_KEY?: string
}

const installationTokenCache = new Map<
  string,
  { token: string; expiresAt: number }
>()

export class GitHubApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function getGitHubAppToken(
  env: CmsGitHubAppEnv,
  { forceRefresh = false }: { forceRefresh?: boolean } = {},
) {
  const clientId = env.CMS_GITHUB_APP_CLIENT_ID?.trim()
  const installationId = env.CMS_GITHUB_APP_INSTALLATION_ID?.trim()
  const privateKey = env.CMS_GITHUB_APP_PRIVATE_KEY?.replace(
    /\\n/g,
    '\n',
  ).trim()

  if (
    !clientId ||
    !installationId ||
    !/^\d+$/.test(installationId) ||
    !privateKey
  ) {
    throw new GitHubApiError(
      'CMS GitHub Appの認証設定がCloudflare Pagesにありません。',
      503,
    )
  }

  const cacheKey = `${clientId}:${installationId}`
  const cached = installationTokenCache.get(cacheKey)

  if (
    !forceRefresh &&
    cached &&
    cached.expiresAt - INSTALLATION_TOKEN_REFRESH_BUFFER_MS > Date.now()
  ) {
    return cached.token
  }

  let appJwt: string

  try {
    const signingKey = await importPKCS8(
      normalizeGitHubAppPrivateKey(privateKey),
      'RS256',
    )
    const now = Math.floor(Date.now() / 1000)

    appJwt = await new SignJWT({})
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(clientId)
      .setIssuedAt(now - 60)
      .setExpirationTime(now + 9 * 60)
      .sign(signingKey)
  } catch {
    throw new GitHubApiError('CMS GitHub Appの秘密鍵を読み込めません。', 503)
  }

  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${appJwt}`,
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
      },
      body: JSON.stringify({
        repositories: [CMS_REPOSITORY.name],
        permissions: {
          contents: 'write',
        },
      }),
    },
  )
  const data: unknown = await response.json().catch(() => null)

  if (
    !response.ok ||
    !isRecord(data) ||
    typeof data.token !== 'string' ||
    typeof data.expires_at !== 'string' ||
    !hasExpectedInstallationScope(data)
  ) {
    const message =
      isRecord(data) && typeof data.message === 'string'
        ? data.message
        : 'CMS GitHub Appのinstallation tokenを発行できません。'

    throw new GitHubApiError(message, response.ok ? 502 : response.status)
  }

  const expiresAt = Date.parse(data.expires_at)

  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    throw new GitHubApiError(
      'CMS GitHub Appのinstallation token有効期限が不正です。',
      502,
    )
  }

  installationTokenCache.set(cacheKey, { token: data.token, expiresAt })

  return data.token
}

function hasExpectedInstallationScope(data: Record<string, unknown>) {
  if (
    !isRecord(data.permissions) ||
    data.permissions.contents !== 'write' ||
    data.permissions.metadata !== 'read' ||
    Object.keys(data.permissions).some(
      (permission) => permission !== 'contents' && permission !== 'metadata',
    ) ||
    !Array.isArray(data.repositories) ||
    data.repositories.length !== 1
  ) {
    return false
  }

  const repository = data.repositories[0]

  return (
    isRecord(repository) &&
    repository.name === CMS_REPOSITORY.name &&
    repository.full_name === `${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}`
  )
}

export function clearGitHubAppTokenCacheForTests() {
  installationTokenCache.clear()
}

function normalizeGitHubAppPrivateKey(privateKey: string) {
  if (privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) return privateKey

  const match = privateKey.match(
    /^-----BEGIN RSA PRIVATE KEY-----\s*([\s\S]*?)\s*-----END RSA PRIVATE KEY-----$/,
  )

  if (!match) {
    throw new Error('Unsupported private key format')
  }

  const pkcs1 = Uint8Array.from(atob(match[1].replace(/\s/g, '')), (value) =>
    value.charCodeAt(0),
  )
  const version = Uint8Array.from([0x02, 0x01, 0x00])
  const privateKeyOctets = encodeDerElement(0x04, pkcs1)
  const pkcs8 = encodeDerElement(
    0x30,
    concatenateBytes(version, RSA_ALGORITHM_IDENTIFIER, privateKeyOctets),
  )
  const base64 = bytesToBase64(pkcs8)
  const lines = base64.match(/.{1,64}/g)

  if (!lines) throw new Error('Invalid private key')

  return `-----BEGIN PRIVATE KEY-----\n${lines.join('\n')}\n-----END PRIVATE KEY-----`
}

function encodeDerElement(tag: number, value: Uint8Array) {
  return concatenateBytes(
    Uint8Array.from([tag]),
    encodeDerLength(value.byteLength),
    value,
  )
}

function encodeDerLength(length: number) {
  if (length < 0x80) return Uint8Array.from([length])

  const bytes: number[] = []
  let remaining = length

  while (remaining > 0) {
    bytes.unshift(remaining & 0xff)
    remaining = Math.floor(remaining / 0x100)
  }

  return Uint8Array.from([0x80 | bytes.length, ...bytes])
}

function concatenateBytes(...values: Uint8Array[]) {
  const result = new Uint8Array(
    values.reduce((length, value) => length + value.byteLength, 0),
  )
  let offset = 0

  for (const value of values) {
    result.set(value, offset)
    offset += value.byteLength
  }

  return result
}

function bytesToBase64(value: Uint8Array) {
  let binary = ''

  for (const byte of value) binary += String.fromCharCode(byte)

  return btoa(binary)
}

export type CmsGitTreeItem = {
  path: string
  mode: string
  type: 'blob' | 'tree'
  sha: string
  size?: number
  url?: string
}

export type CmsGitTree = {
  sha: string
  tree: CmsGitTreeItem[]
  truncated: boolean
  url?: string
}

export async function githubRequest({
  accept = 'application/vnd.github+json',
  body,
  method = 'GET',
  path,
  token,
}: {
  accept?: string
  body?: unknown
  method?: string
  path: string
  token: string
}) {
  const headers = new Headers({
    Accept: accept,
    Authorization: `Bearer ${token}`,
    'User-Agent': USER_AGENT,
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
  })

  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(`https://api.github.com${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

export async function githubJson<T>(
  options: Parameters<typeof githubRequest>[0],
) {
  const response = await githubRequest(options)
  const data: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      isRecord(data) && typeof data.message === 'string'
        ? data.message
        : 'GitHub APIでエラーが発生しました。'

    throw new GitHubApiError(message, response.status)
  }

  return data as T
}

export async function fetchCmsTree(
  token: string,
  ref: string = CMS_REPOSITORY.branch,
) {
  const data = await githubJson<unknown>({
    path: `/repos/${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}/git/trees/${encodeURIComponent(ref)}?recursive=1`,
    token,
  })

  if (
    !isRecord(data) ||
    typeof data.sha !== 'string' ||
    !Array.isArray(data.tree) ||
    typeof data.truncated !== 'boolean'
  ) {
    throw new GitHubApiError('GitHub tree response が不正です。', 502)
  }

  if (data.truncated) {
    throw new GitHubApiError(
      'GitHub tree が省略されたためCMS対象を安全に判定できません。',
      502,
    )
  }

  const tree = data.tree.flatMap((item): CmsGitTreeItem[] => {
    if (!isRecord(item)) return []

    const path =
      typeof item.path === 'string' ? normalizeCmsPath(item.path) : null
    const type = item.type
    const sha = item.sha
    const mode = item.mode

    if (
      !path ||
      (type !== 'blob' && type !== 'tree') ||
      typeof sha !== 'string' ||
      typeof mode !== 'string'
    ) {
      return []
    }

    const allowed =
      type === 'blob'
        ? isAllowedCmsWritePath(path)
        : isAllowedCmsDirectoryPath(path)

    if (!allowed) return []

    return [
      {
        path,
        type,
        sha,
        mode,
        ...(typeof item.size === 'number' ? { size: item.size } : {}),
        ...(typeof item.url === 'string' ? { url: item.url } : {}),
      },
    ]
  })

  return {
    sha: data.sha,
    tree,
    truncated: data.truncated,
    ...(typeof data.url === 'string' ? { url: data.url } : {}),
  } satisfies CmsGitTree
}

export function getAllowedCmsBlobShas(tree: CmsGitTree) {
  return new Set(
    tree.tree.filter((item) => item.type === 'blob').map((item) => item.sha),
  )
}

export function copyGitHubResponse(response: Response) {
  const headers = new Headers()

  for (const name of ['Content-Type', 'ETag', 'Link']) {
    const value = response.headers.get(name)

    if (value) headers.set(name, value)
  }

  headers.set('Cache-Control', 'no-store')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
