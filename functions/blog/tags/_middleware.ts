import { getCanonicalTagRedirectUrl } from '../../../src/utils/tag-route-redirect'

type PagesMiddlewareContext = {
  request: Request
  next(): Promise<Response>
}

export const onRequest = (
  context: PagesMiddlewareContext,
): Promise<Response> | Response => {
  const location = getCanonicalTagRedirectUrl(
    context.request.url,
    context.request.method,
  )

  if (location) {
    return new Response(null, {
      status: 301,
      headers: { Location: location },
    })
  }

  return context.next()
}
