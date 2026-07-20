type PagesMiddlewareContext = {
  next(): Promise<Response>
}

/**
 * public/_headers does not apply to Pages Functions, so every API response
 * receives the same search exclusion header regardless of method or status.
 */
export const onRequest = async (
  context: PagesMiddlewareContext,
): Promise<Response> => {
  const response = await context.next()
  const headers = new Headers(response.headers)
  headers.set('X-Robots-Tag', 'noindex, nofollow')

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
