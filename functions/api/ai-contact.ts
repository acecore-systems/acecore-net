type Env = {
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
}

type PagesContext = {
  request: Request
  env: Env
}

type OpenAIResponse = {
  output_text?: string
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
  error?: {
    message?: string
  }
}

const OPENAI_RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = 'gpt-5-nano'
const MAX_QUESTION_LENGTH = 800

const ACECORE_CONTEXT = `
Acecore is a Japan-based technology collective.
Main services:
- Business system and app development
- Server setup and operations
- Website design and maintenance
- Design and creative production
- IT education through Acecore Schools
- Aceserver, a public Minecraft server community

Contact flow:
1. Encourage the visitor to check common questions and related pages first.
2. If the question is still unclear, answer briefly and help them decide what to write in the contact form.
3. Recommend the contact form for estimates, project consultation, partnerships, recruitment, and service questions.
4. Present LINE, email, and phone as additional contact options when they fit the visitor's situation, while keeping the form as the main route for detailed inquiries.
`

export const onRequestPost = async ({
  request,
  env,
}: PagesContext): Promise<Response> => {
  if (!env.OPENAI_API_KEY) {
    return jsonResponse(
      {
        ok: false,
        answer:
          'AI assistant is not configured yet. Please use the contact form.',
      },
      503,
    )
  }

  let payload: { question?: string; locale?: string }
  try {
    payload = (await request.json()) as { question?: string; locale?: string }
  } catch {
    return jsonResponse({ ok: false, answer: 'Invalid request body.' }, 400)
  }

  const question = String(payload.question || '').trim()
  const locale = String(payload.locale || 'ja').slice(0, 16)

  if (!question) {
    return jsonResponse({ ok: false, answer: 'Question is required.' }, 400)
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return jsonResponse({ ok: false, answer: 'Question is too long.' }, 400)
  }

  const response = await fetch(OPENAI_RESPONSES_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || DEFAULT_MODEL,
      instructions: [
        'You are Acecore contact page assistant.',
        'Answer in the visitor locale.',
        'Keep answers concise and practical.',
        'Do not invent pricing, timelines, contracts, guarantees, or private contact details.',
        'If a request needs a human decision, guide the visitor to the contact form.',
        "Keep the form as the main route for detailed inquiries, and mention LINE, email, or phone naturally when they fit the visitor's situation.",
        ACECORE_CONTEXT,
      ].join('\n'),
      input: `Visitor locale: ${locale}\nVisitor question: ${question}`,
      max_output_tokens: 360,
    }),
  })

  const result = (await response
    .json()
    .catch(() => null)) as OpenAIResponse | null

  if (!response.ok) {
    return jsonResponse(
      {
        ok: false,
        answer:
          result?.error?.message ||
          'AI assistant failed. Please use the contact form.',
      },
      response.status,
    )
  }

  const answer = extractOutputText(result).trim()
  return jsonResponse({
    ok: true,
    answer: answer || 'Please use the contact form for this question.',
  })
}

export const onRequestOptions = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://acecore.net',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept, Content-Type',
    },
  })

function extractOutputText(result: OpenAIResponse | null): string {
  if (!result) return ''
  if (typeof result.output_text === 'string') return result.output_text

  return (result.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || '')
    .filter(Boolean)
    .join('\n')
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
