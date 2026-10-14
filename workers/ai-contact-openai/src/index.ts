type Env = { OPENAI_API_KEY_STORE?: { get(): Promise<string> } }

const MODEL = 'gpt-6-luna'
const MAX_BODY_BYTES = 40_000
const MAX_RESPONSE_BYTES = 512 * 1024

function isRequest(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const body = value as Record<string, unknown>
  const messages = body.messages
  return (
    Object.keys(body).every((key) =>
      [
        'model',
        'messages',
        'reasoning_effort',
        'max_completion_tokens',
        'user',
        'store',
      ].includes(key),
    ) &&
    body.model === MODEL &&
    body.store === false &&
    (body.reasoning_effort === 'low' ||
      body.reasoning_effort === 'medium' ||
      body.reasoning_effort === 'high') &&
    Number.isInteger(body.max_completion_tokens) &&
    Number(body.max_completion_tokens) > 0 &&
    Number(body.max_completion_tokens) <= 640 &&
    typeof body.user === 'string' &&
    body.user.length <= 128 &&
    Array.isArray(messages) &&
    messages.length === 2 &&
    Object.keys(messages[0] || {}).every((key) =>
      ['role', 'content'].includes(key),
    ) &&
    Object.keys(messages[1] || {}).every((key) =>
      ['role', 'content'].includes(key),
    ) &&
    messages[0]?.role === 'system' &&
    typeof messages[0]?.content === 'string' &&
    messages[0].content.length <= 16_000 &&
    messages[1]?.role === 'user' &&
    typeof messages[1]?.content === 'string' &&
    messages[1].content.length <= 16_000
  )
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (
      request.method !== 'POST' ||
      new URL(request.url).pathname !== '/v1/chat'
    )
      return new Response(null, { status: 404 })
    if (
      request.headers.get('content-type') !== 'application/json' ||
      Number(request.headers.get('content-length')) > MAX_BODY_BYTES
    )
      return new Response(null, { status: 400 })

    const body = await request.text()
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES)
      return new Response(null, { status: 413 })
    let parsed: unknown
    try {
      parsed = JSON.parse(body)
    } catch {
      return new Response(null, { status: 400 })
    }
    if (!isRequest(parsed)) return new Response(null, { status: 400 })

    let apiKey: string
    try {
      apiKey = (await env.OPENAI_API_KEY_STORE?.get())?.trim() || ''
    } catch {
      apiKey = ''
    }
    if (!apiKey) return new Response(null, { status: 503 })

    try {
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body,
          signal: AbortSignal.timeout(30_000),
        },
      )
      if (!response.ok) {
        await response.body?.cancel()
        return new Response(null, { status: 502 })
      }
      const text = await response.text()
      if (text.length > MAX_RESPONSE_BYTES)
        return new Response(null, { status: 502 })
      return new Response(text, {
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
        },
      })
    } catch {
      return new Response(null, { status: 502 })
    }
  },
} satisfies ExportedHandler<Env>
