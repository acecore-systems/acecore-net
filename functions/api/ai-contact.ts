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

type ChatMessage = {
  role?: string
  content?: string
}

type AiContactPayload = {
  question?: string
  locale?: string
  messages?: ChatMessage[]
}

const OPENAI_RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses'
const DEFAULT_MODEL = 'gpt-5.4-mini'
const MAX_QUESTION_LENGTH = 800
const MAX_HISTORY_MESSAGES = 8
const MAX_CONVERSATION_LENGTH = 3200

const ACECORE_CONTEXT = `
Acecore public site context:
- Acecore is a Japan-based technology collective that provides system development, website design, server operations, design, and IT education as a one-stop solution.
- Services include business system and app development, server setup and operations, website design and maintenance, design and creative production, and IT education through Acecore Schools.
- Acecore Schools handles IT learning consultations. Visitors should include what they want to learn, age or grade, and preferred learning pace.
- Aceserver is Acecore's public Minecraft server community.
- Estimates are free, and replies usually arrive within 1-2 business days.
- LINE is available for short consultations and school-related messages. The contact form is best for detailed estimates, project consultations, partnerships, recruitment, and service questions.
- Useful site links:
  - Services overview: /services/
  - Business system and app development: /services/#system-development
  - Server setup and operations: /services/#server
  - Website design and maintenance: /services/#web
  - Design and creative production: /services/#design
  - Acecore Schools and IT education: /schools/
  - Aceserver: /services/#aceserver
  - AceStudio: /acestudio/
  - Works and case studies: /works/
  - Blog: /blog/
  - Contact form: /contact/
  - Official LINE: https://lin.ee/DjIrdqj
  - Direct email fallback: mailto:info@acecore.net
  - Direct phone fallback: tel:05088902788
- Answer using only public site context. If the question requires pricing, schedules, contracts, guarantees, urgent support, or private details not listed here, say what can be answered generally and guide the visitor to the contact form or LINE first.
- Do not show email or phone by default. Include direct email or phone links only when the visitor asks for direct contact, says the AI did not resolve the issue, cannot use the form, or needs urgent confirmation.
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

  let payload: AiContactPayload
  try {
    payload = (await request.json()) as AiContactPayload
  } catch {
    return jsonResponse({ ok: false, answer: 'Invalid request body.' }, 400)
  }

  const question = String(payload.question || '').trim()
  const locale = String(payload.locale || 'ja').slice(0, 16)
  const conversationInput = buildConversationInput(payload)

  if (!conversationInput) {
    return jsonResponse({ ok: false, answer: 'Question is required.' }, 400)
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return jsonResponse({ ok: false, answer: 'Question is too long.' }, 400)
  }

  if (conversationInput.length > MAX_CONVERSATION_LENGTH) {
    return jsonResponse({ ok: false, answer: 'Conversation is too long.' }, 400)
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
        'You are Acecore website chat assistant.',
        'Answer in the visitor locale.',
        'Answer ordinary questions about Acecore using the public site context below.',
        'Keep answers concise, practical, and helpful for choosing the next action.',
        'Use simple Markdown when it improves readability: short paragraphs, bullet lists, and **bold** for important service names. When a relevant Acecore page or contact path exists, make the first useful mention a Markdown link using the URLs in the context. Include links in answers about service selection, estimates, schools, works, contact options, or next steps. Do not link every repeated mention. Do not use raw HTML or tables. Prefer bullet lists over long arrow chains.',
        'Do not invent pricing, timelines, contracts, guarantees, or private contact details.',
        'If a request needs a human decision, detailed estimate, formal reply, urgent help, or support beyond the public site context, say the AI cannot decide that and guide the visitor to the best contact option.',
        'Use the contact form for detailed project consultations and estimates. Mention LINE for short consultations and school-related messages. If the conversation appears unresolved or the visitor asks for direct human contact, add a compact direct-contact line with [メール](mailto:info@acecore.net) or [電話](tel:05088902788) only when appropriate.',
        ACECORE_CONTEXT,
      ].join('\n'),
      input: `Visitor locale: ${locale}\nConversation:\n${conversationInput}`,
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

function buildConversationInput(payload: AiContactPayload): string {
  const messages = Array.isArray(payload.messages) ? payload.messages : []
  const lines = messages
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => {
      const role = message.role === 'assistant' ? 'Assistant' : 'User'
      const content = String(message.content || '').trim()
      if (!content) return ''
      return `${role}: ${content.slice(0, MAX_QUESTION_LENGTH)}`
    })
    .filter(Boolean)

  if (lines.length > 0) return lines.join('\n')

  const question = String(payload.question || '').trim()
  return question ? `User: ${question.slice(0, MAX_QUESTION_LENGTH)}` : ''
}

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}
