export const onRequestPost: PagesFunction<CloudflareEnv> = async ({
  request,
  env,
}) => {
  if (!env.ACECORE_CHAT) return unavailableResponse()

  return env.ACECORE_CHAT.fetch(request)
}

function unavailableResponse(): Response {
  return new Response(JSON.stringify({ ok: false, error: 'unavailable' }), {
    status: 503,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}
