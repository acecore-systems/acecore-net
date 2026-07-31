const provider = 'github'
const csrfCookieName = 'sveltia-cms-auth-csrf'
const csrfMaxAgeSeconds = 600

type AuthErrorCode =
  | 'UNSUPPORTED_BACKEND'
  | 'UNSUPPORTED_DOMAIN'
  | 'MISCONFIGURED_CLIENT'
  | 'AUTH_CODE_REQUEST_FAILED'
  | 'CSRF_DETECTED'
  | 'TOKEN_REQUEST_FAILED'
  | 'MALFORMED_RESPONSE'

type OAuthOutput =
  | { type: 'success'; token: string }
  | { type: 'error'; error: string; errorCode: AuthErrorCode }

type GitHubAccessTokenResponse = {
  accessToken?: string
  error?: string
  errorDescription?: string
}

/**
 * Wrangler generates `SveltiaCmsAuthConfig` from `wrangler.jsonc`. Secrets and
 * dashboard-only variables intentionally do not appear in that generated type.
 */
type SveltiaCmsAuthRuntimeOverrides = {
  readonly GITHUB_CLIENT_ID?: string
  readonly GITHUB_CLIENT_SECRET?: string
  readonly GITHUB_HOSTNAME?: string
}

type SveltiaCmsAuthEnv = SveltiaCmsAuthConfig & SveltiaCmsAuthRuntimeOverrides

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const scriptString = (value: string): string =>
  JSON.stringify(value).replace(/</g, '\\u003c')

const deleteCsrfCookie = `${csrfCookieName}=deleted; HttpOnly; Max-Age=0; Path=/; SameSite=Lax; Secure`

const outputHTML = (output: OAuthOutput): Response => {
  const state = output.type === 'error' ? 'error' : 'success'
  const payload =
    output.type === 'error'
      ? { provider, error: output.error, errorCode: output.errorCode }
      : { provider, token: output.token }
  const message = `authorization:${provider}:${state}:${JSON.stringify(payload)}`
  const probe = `authorizing:${provider}`

  return new Response(
    `<!doctype html>
<html>
  <body>
    <script>
      (() => {
        const probe = ${scriptString(probe)};
        const message = ${scriptString(message)};
        window.addEventListener('message', ({ data, origin }) => {
          if (data === probe) {
            window.opener?.postMessage(message, origin);
          }
        });
        window.opener?.postMessage(probe, '*');
      })();
    </script>
  </body>
</html>`,
    {
      headers: {
        'Content-Type': 'text/html;charset=UTF-8',
        'Set-Cookie': deleteCsrfCookie,
      },
    },
  )
}

const outputError = (error: string, errorCode: AuthErrorCode): Response =>
  outputHTML({ type: 'error', error, errorCode })

const isAllowedDomain = (
  domain: string | null,
  allowedDomains: string | undefined,
): boolean => {
  if (!allowedDomains) return true
  if (!domain) return false

  const normalizedDomain = domain.toLowerCase()

  return allowedDomains
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .some((pattern) => {
      const regex = new RegExp(
        `^${escapeRegExp(pattern).replaceAll('\\*', '.+')}$`,
      )

      return regex.test(normalizedDomain)
    })
}

const readCsrfCookie = (cookieHeader: string | null): string | undefined =>
  cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${csrfCookieName}=`))
    ?.slice(csrfCookieName.length + 1)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readOptionalString = (
  record: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

const parseGitHubAccessTokenResponse = (
  value: unknown,
): GitHubAccessTokenResponse | null => {
  if (!isRecord(value)) return null

  const accessToken = readOptionalString(value, 'access_token')
  const error = readOptionalString(value, 'error')
  const errorDescription = readOptionalString(value, 'error_description')

  return accessToken || error ? { accessToken, error, errorDescription } : null
}

const csrfTokensMatch = async (
  state: string,
  csrfToken: string,
): Promise<boolean> => {
  const encoder = new TextEncoder()
  const [stateHash, csrfHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(state)),
    crypto.subtle.digest('SHA-256', encoder.encode(csrfToken)),
  ])

  return crypto.subtle.timingSafeEqual(stateHash, csrfHash)
}

const handleAuth = async (
  request: Request,
  env: SveltiaCmsAuthEnv,
): Promise<Response> => {
  const requestURL = new URL(request.url)
  const requestedProvider = requestURL.searchParams.get('provider')
  const siteID = requestURL.searchParams.get('site_id')

  if (requestedProvider !== provider) {
    return outputError(
      'Your Git backend is not supported by the authenticator.',
      'UNSUPPORTED_BACKEND',
    )
  }

  if (!isAllowedDomain(siteID, env.ALLOWED_DOMAINS)) {
    return outputError(
      'Your domain is not allowed to use the authenticator.',
      'UNSUPPORTED_DOMAIN',
    )
  }

  const clientID = env.GITHUB_CLIENT_ID
  const clientSecret = env.GITHUB_CLIENT_SECRET
  if (!clientID || !clientSecret) {
    return outputError(
      'OAuth app client ID or secret is not configured.',
      'MISCONFIGURED_CLIENT',
    )
  }

  const csrfToken = crypto.randomUUID().replaceAll('-', '')
  const githubHostname = env.GITHUB_HOSTNAME || 'github.com'
  const authURL = new URL(`https://${githubHostname}/login/oauth/authorize`)

  authURL.searchParams.set('client_id', clientID)
  authURL.searchParams.set('scope', env.GITHUB_SCOPE || 'repo,user')
  authURL.searchParams.set('state', csrfToken)

  return new Response('', {
    status: 302,
    headers: {
      Location: authURL.toString(),
      'Set-Cookie': `${csrfCookieName}=${csrfToken}; HttpOnly; Path=/; Max-Age=${csrfMaxAgeSeconds}; SameSite=Lax; Secure`,
    },
  })
}

const handleCallback = async (
  request: Request,
  env: SveltiaCmsAuthEnv,
): Promise<Response> => {
  const requestURL = new URL(request.url)
  const code = requestURL.searchParams.get('code')
  const state = requestURL.searchParams.get('state')
  const csrfToken = readCsrfCookie(request.headers.get('Cookie'))

  if (!code || !state) {
    return outputError(
      'Failed to receive an authorization code. Please try again later.',
      'AUTH_CODE_REQUEST_FAILED',
    )
  }

  if (!csrfToken || !(await csrfTokensMatch(state, csrfToken))) {
    return outputError(
      'Potential CSRF attack detected. Authentication flow aborted.',
      'CSRF_DETECTED',
    )
  }

  const clientID = env.GITHUB_CLIENT_ID
  const clientSecret = env.GITHUB_CLIENT_SECRET
  if (!clientID || !clientSecret) {
    return outputError(
      'OAuth app client ID or secret is not configured.',
      'MISCONFIGURED_CLIENT',
    )
  }

  const githubHostname = env.GITHUB_HOSTNAME || 'github.com'
  const response = await fetch(
    `https://${githubHostname}/login/oauth/access_token`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: clientID,
        client_secret: clientSecret,
      }),
    },
  ).catch(() => null)

  if (!response) {
    return outputError(
      'Failed to request an access token. Please try again later.',
      'TOKEN_REQUEST_FAILED',
    )
  }

  const tokenPayload: unknown = await response.json().catch(() => null)
  const tokenResponse = parseGitHubAccessTokenResponse(tokenPayload)

  if (!tokenResponse) {
    return outputError(
      'Server responded with malformed data. Please try again later.',
      'MALFORMED_RESPONSE',
    )
  }

  if (tokenResponse.error) {
    return outputError(
      tokenResponse.errorDescription || tokenResponse.error,
      'TOKEN_REQUEST_FAILED',
    )
  }

  if (!tokenResponse.accessToken) {
    return outputError(
      'Server responded with malformed data. Please try again later.',
      'MALFORMED_RESPONSE',
    )
  }

  return outputHTML({ type: 'success', token: tokenResponse.accessToken })
}

export default {
  async fetch(request, env): Promise<Response> {
    const { method } = request
    const { pathname } = new URL(request.url)

    if (method === 'GET' && ['/auth', '/oauth/authorize'].includes(pathname)) {
      return handleAuth(request, env)
    }

    if (
      method === 'GET' &&
      ['/callback', '/oauth/redirect'].includes(pathname)
    ) {
      return handleCallback(request, env)
    }

    return new Response('', { status: 404 })
  },
} satisfies ExportedHandler<SveltiaCmsAuthEnv>
