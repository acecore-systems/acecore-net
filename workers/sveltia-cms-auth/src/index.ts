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

type OAuthSession = {
  csrfToken: string
  targetOrigin: string
}

/**
 * `GITHUB_HOSTNAME` is an optional dashboard-only override. The required GitHub
 * OAuth secrets are generated from `wrangler.jsonc`'s `secrets.required`.
 */
type SveltiaCmsAuthRuntimeOverrides = {
  readonly GITHUB_HOSTNAME?: string
}

type SveltiaCmsAuthEnv = SveltiaCmsAuthConfig & SveltiaCmsAuthRuntimeOverrides

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const scriptString = (value: string): string =>
  JSON.stringify(value).replace(/</g, '\\u003c')

const deleteCsrfCookie = `${csrfCookieName}=deleted; HttpOnly; Max-Age=0; Path=/; SameSite=Lax; Secure`

const outputHTML = (output: OAuthOutput, targetOrigin: string): Response => {
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
        const targetOrigin = ${scriptString(targetOrigin)};
        const opener = window.opener;
        window.addEventListener('message', ({ data, origin, source }) => {
          if (
            opener &&
            origin === targetOrigin &&
            source === opener &&
            data === probe
          ) {
            opener.postMessage(message, targetOrigin);
          }
        });
        opener?.postMessage(probe, targetOrigin);
      })();
    </script>
  </body>
</html>`,
    {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/html;charset=UTF-8',
        'Set-Cookie': deleteCsrfCookie,
      },
    },
  )
}

const outputError = (
  error: string,
  errorCode: AuthErrorCode,
  targetOrigin?: string,
): Response => {
  if (targetOrigin) {
    return outputHTML({ type: 'error', error, errorCode }, targetOrigin)
  }

  return new Response(JSON.stringify({ provider, error, errorCode }), {
    status: 400,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json;charset=UTF-8',
      'Set-Cookie': deleteCsrfCookie,
    },
  })
}

const isAllowedDomain = (domain: string, allowedDomains: string): boolean => {
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

const isLocalDevelopmentHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1'

const targetOriginForSiteID = (
  siteID: string | null,
  allowedDomains: string,
): string | undefined => {
  if (!siteID) return undefined

  const normalizedSiteID = siteID.toLowerCase()
  let siteURL: URL
  try {
    siteURL = new URL(`https://${normalizedSiteID}`)
  } catch {
    return undefined
  }

  if (
    siteURL.host !== normalizedSiteID ||
    !isAllowedDomain(siteURL.host, allowedDomains)
  ) {
    return undefined
  }

  const protocol = isLocalDevelopmentHost(siteURL.hostname) ? 'http:' : 'https:'
  return new URL(`${protocol}//${siteURL.host}`).origin
}

const readCookieValue = (
  cookieHeader: string | null,
  cookieName: string,
): string | undefined =>
  cookieHeader
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1)

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const readOptionalString = (
  record: Record<string, unknown>,
  key: string,
): string | undefined => {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

const serializeOAuthSession = (session: OAuthSession): string =>
  encodeURIComponent(JSON.stringify(session))

const readOAuthSession = (
  cookieHeader: string | null,
  allowedDomains: string,
): OAuthSession | undefined => {
  const encodedSession = readCookieValue(cookieHeader, csrfCookieName)
  if (!encodedSession) return undefined

  try {
    const sessionValue: unknown = JSON.parse(decodeURIComponent(encodedSession))
    if (!isRecord(sessionValue)) return undefined

    const csrfToken = readOptionalString(sessionValue, 'csrfToken')
    const targetOrigin = readOptionalString(sessionValue, 'targetOrigin')
    if (!csrfToken || !targetOrigin) return undefined

    const targetURL = new URL(targetOrigin)
    const expectedTargetOrigin = targetOriginForSiteID(
      targetURL.host,
      allowedDomains,
    )

    return expectedTargetOrigin === targetOrigin
      ? { csrfToken, targetOrigin }
      : undefined
  } catch {
    return undefined
  }
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
  const targetOrigin = targetOriginForSiteID(siteID, env.ALLOWED_DOMAINS)

  if (requestedProvider !== provider) {
    return outputError(
      'Your Git backend is not supported by the authenticator.',
      'UNSUPPORTED_BACKEND',
      targetOrigin,
    )
  }

  if (!targetOrigin) {
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
      'Cache-Control': 'no-store',
      Location: authURL.toString(),
      'Set-Cookie': `${csrfCookieName}=${serializeOAuthSession({ csrfToken, targetOrigin })}; HttpOnly; Path=/; Max-Age=${csrfMaxAgeSeconds}; SameSite=Lax; Secure`,
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
  const session = readOAuthSession(
    request.headers.get('Cookie'),
    env.ALLOWED_DOMAINS,
  )
  const targetOrigin = session?.targetOrigin

  if (!code || !state) {
    return outputError(
      'Failed to receive an authorization code. Please try again later.',
      'AUTH_CODE_REQUEST_FAILED',
      targetOrigin,
    )
  }

  if (!session || !(await csrfTokensMatch(state, session.csrfToken))) {
    return outputError(
      'Potential CSRF attack detected. Authentication flow aborted.',
      'CSRF_DETECTED',
      targetOrigin,
    )
  }

  const clientID = env.GITHUB_CLIENT_ID
  const clientSecret = env.GITHUB_CLIENT_SECRET
  if (!clientID || !clientSecret) {
    return outputError(
      'OAuth app client ID or secret is not configured.',
      'MISCONFIGURED_CLIENT',
      targetOrigin,
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
      targetOrigin,
    )
  }

  const tokenPayload: unknown = await response.json().catch(() => null)
  const tokenResponse = parseGitHubAccessTokenResponse(tokenPayload)

  if (!tokenResponse) {
    return outputError(
      'Server responded with malformed data. Please try again later.',
      'MALFORMED_RESPONSE',
      targetOrigin,
    )
  }

  if (tokenResponse.error) {
    return outputError(
      tokenResponse.errorDescription || tokenResponse.error,
      'TOKEN_REQUEST_FAILED',
      targetOrigin,
    )
  }

  if (!tokenResponse.accessToken) {
    return outputError(
      'Server responded with malformed data. Please try again later.',
      'MALFORMED_RESPONSE',
      targetOrigin,
    )
  }

  return outputHTML(
    { type: 'success', token: tokenResponse.accessToken },
    session.targetOrigin,
  )
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
