import { defineMiddleware } from 'astro:middleware'

export const onRequest = defineMiddleware(async (_context, next) => {
  const response = await next()

  // CDNキャッシュ制御（古いレスポンスの長期キャッシュを防止）
  response.headers.set('cache-control', 'public, max-age=0, must-revalidate')

  // SEO: noindex を確実に上書き
  response.headers.set('x-robots-tag', 'all')

  // セキュリティヘッダー
  response.headers.set('x-content-type-options', 'nosniff')
  response.headers.set('x-frame-options', 'SAMEORIGIN')
  response.headers.set('referrer-policy', 'no-referrer-when-downgrade')
  response.headers.set('permissions-policy', 'geolocation=(), microphone=(), camera=()')
  response.headers.set('cross-origin-opener-policy', 'same-origin')
  response.headers.set(
    'content-security-policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.googletagservices.com https://adservice.google.com https://fundingchoicesmessages.google.com https://tpc.googlesyndication.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://wsrv.nl https://images.unsplash.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.google.com https://www.gstatic.com",
      "font-src 'self' data:",
      "connect-src 'self' https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://fundingchoicesmessages.google.com https://csi.gstatic.com",
      "frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://fundingchoicesmessages.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  )
  response.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains')

  return response
})
