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
const SCHOOLS_ORIGIN = 'https://schools.acecore.net'
const SYSTEMS_ORIGIN = 'https://systems.acecore.net'
const DEFAULT_MODEL = 'gpt-5.4-mini'
const MAX_QUESTION_LENGTH = 800
const MAX_HISTORY_MESSAGES = 8
const MAX_CONVERSATION_LENGTH = 3200
const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 10
const RATE_LIMIT_MAX_BUCKETS = 2000

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>()

const SUPPORTED_LOCALES = [
  'ja',
  'en',
  'zh-cn',
  'es',
  'pt',
  'fr',
  'ko',
  'de',
  'ru',
] as const

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

type LocaleSettings = {
  languageName: string
  contactFormLabel: string
  lineLabel: string
  emailLabel: string
  phoneLabel: string
  messages: {
    unconfigured: string
    invalidRequest: string
    required: string
    questionTooLong: string
    conversationTooLong: string
    rateLimited: string
    failed: string
    emptyAnswer: string
  }
}

const LOCALE_SETTINGS: Record<SupportedLocale, LocaleSettings> = {
  ja: {
    languageName: 'Japanese',
    contactFormLabel: '問い合わせフォーム',
    lineLabel: 'LINE',
    emailLabel: 'メール',
    phoneLabel: '電話',
    messages: {
      unconfigured:
        'AIチャットはまだ設定されていません。問い合わせフォームをご利用ください。',
      invalidRequest: 'リクエスト形式が正しくありません。',
      required: '質問を入力してください。',
      questionTooLong: '質問が長すぎます。短く分けて入力してください。',
      conversationTooLong:
        '会話が長くなっています。質問を短く整理してください。',
      rateLimited:
        '短時間に送信回数が多くなっています。少し時間をおいてからお試しください。',
      failed:
        'AIチャットで回答できませんでした。問い合わせフォームをご利用ください。',
      emptyAnswer: 'この内容は問い合わせフォームからご相談ください。',
    },
  },
  en: {
    languageName: 'English',
    contactFormLabel: 'contact form',
    lineLabel: 'LINE',
    emailLabel: 'email',
    phoneLabel: 'phone',
    messages: {
      unconfigured:
        'AI chat is not configured yet. Please use the contact form.',
      invalidRequest: 'Invalid request body.',
      required: 'Please enter a question.',
      questionTooLong:
        'The question is too long. Please split it into shorter messages.',
      conversationTooLong:
        'The conversation is too long. Please summarize your question.',
      rateLimited:
        'Too many messages were sent in a short time. Please wait a moment and try again.',
      failed: 'AI chat failed. Please use the contact form.',
      emptyAnswer: 'Please use the contact form for this question.',
    },
  },
  'zh-cn': {
    languageName: 'Simplified Chinese',
    contactFormLabel: '咨询表单',
    lineLabel: 'LINE',
    emailLabel: '邮件',
    phoneLabel: '电话',
    messages: {
      unconfigured: 'AI 聊天尚未设置。请使用咨询表单。',
      invalidRequest: '请求格式不正确。',
      required: '请输入问题。',
      questionTooLong: '问题过长。请分成较短的内容发送。',
      conversationTooLong: '对话过长。请简要整理您的问题。',
      rateLimited: '短时间内发送次数过多。请稍后再试。',
      failed: 'AI 聊天无法回答。请使用咨询表单。',
      emptyAnswer: '此问题请通过咨询表单联系我们。',
    },
  },
  es: {
    languageName: 'Spanish',
    contactFormLabel: 'formulario de contacto',
    lineLabel: 'LINE',
    emailLabel: 'correo',
    phoneLabel: 'teléfono',
    messages: {
      unconfigured:
        'El chat de IA aún no está configurado. Utiliza el formulario de contacto.',
      invalidRequest: 'El formato de la solicitud no es válido.',
      required: 'Escribe una pregunta.',
      questionTooLong:
        'La pregunta es demasiado larga. Divídela en mensajes más cortos.',
      conversationTooLong:
        'La conversación es demasiado larga. Resume tu consulta.',
      rateLimited:
        'Se enviaron demasiados mensajes en poco tiempo. Espera un momento e inténtalo de nuevo.',
      failed:
        'El chat de IA no pudo responder. Utiliza el formulario de contacto.',
      emptyAnswer: 'Para esta consulta, utiliza el formulario de contacto.',
    },
  },
  pt: {
    languageName: 'Portuguese',
    contactFormLabel: 'formulário de contato',
    lineLabel: 'LINE',
    emailLabel: 'e-mail',
    phoneLabel: 'telefone',
    messages: {
      unconfigured:
        'O chat de IA ainda não está configurado. Use o formulário de contato.',
      invalidRequest: 'O formato da solicitação é inválido.',
      required: 'Digite uma pergunta.',
      questionTooLong:
        'A pergunta está longa demais. Divida em mensagens menores.',
      conversationTooLong: 'A conversa está longa demais. Resuma sua pergunta.',
      rateLimited:
        'Muitas mensagens foram enviadas em pouco tempo. Aguarde um momento e tente novamente.',
      failed:
        'O chat de IA não conseguiu responder. Use o formulário de contato.',
      emptyAnswer: 'Para esta pergunta, use o formulário de contato.',
    },
  },
  fr: {
    languageName: 'French',
    contactFormLabel: 'formulaire de contact',
    lineLabel: 'LINE',
    emailLabel: 'e-mail',
    phoneLabel: 'téléphone',
    messages: {
      unconfigured:
        "Le chat IA n'est pas encore configuré. Veuillez utiliser le formulaire de contact.",
      invalidRequest: 'Le format de la requête est invalide.',
      required: 'Veuillez saisir une question.',
      questionTooLong:
        'La question est trop longue. Divisez-la en messages plus courts.',
      conversationTooLong:
        'La conversation est trop longue. Résumez votre question.',
      rateLimited:
        'Trop de messages ont été envoyés en peu de temps. Veuillez patienter puis réessayer.',
      failed:
        "Le chat IA n'a pas pu répondre. Veuillez utiliser le formulaire de contact.",
      emptyAnswer:
        'Pour cette question, veuillez utiliser le formulaire de contact.',
    },
  },
  ko: {
    languageName: 'Korean',
    contactFormLabel: '문의 양식',
    lineLabel: 'LINE',
    emailLabel: '이메일',
    phoneLabel: '전화',
    messages: {
      unconfigured:
        'AI 채팅이 아직 설정되어 있지 않습니다. 문의 양식을 이용해 주세요.',
      invalidRequest: '요청 형식이 올바르지 않습니다.',
      required: '질문을 입력해 주세요.',
      questionTooLong: '질문이 너무 깁니다. 짧게 나누어 입력해 주세요.',
      conversationTooLong:
        '대화가 너무 길어졌습니다. 질문을 짧게 정리해 주세요.',
      rateLimited:
        '짧은 시간에 너무 많은 메시지가 전송되었습니다. 잠시 후 다시 시도해 주세요.',
      failed: 'AI 채팅에서 답변할 수 없습니다. 문의 양식을 이용해 주세요.',
      emptyAnswer: '이 내용은 문의 양식으로 상담해 주세요.',
    },
  },
  de: {
    languageName: 'German',
    contactFormLabel: 'Kontaktformular',
    lineLabel: 'LINE',
    emailLabel: 'E-Mail',
    phoneLabel: 'Telefon',
    messages: {
      unconfigured:
        'Der KI-Chat ist noch nicht eingerichtet. Bitte nutzen Sie das Kontaktformular.',
      invalidRequest: 'Das Anfrageformat ist ungültig.',
      required: 'Bitte geben Sie eine Frage ein.',
      questionTooLong:
        'Die Frage ist zu lang. Bitte teilen Sie sie in kürzere Nachrichten auf.',
      conversationTooLong:
        'Der Verlauf ist zu lang. Bitte fassen Sie Ihre Frage zusammen.',
      rateLimited:
        'Es wurden zu viele Nachrichten in kurzer Zeit gesendet. Bitte warten Sie kurz und versuchen Sie es erneut.',
      failed:
        'Der KI-Chat konnte nicht antworten. Bitte nutzen Sie das Kontaktformular.',
      emptyAnswer: 'Bitte nutzen Sie für diese Frage das Kontaktformular.',
    },
  },
  ru: {
    languageName: 'Russian',
    contactFormLabel: 'форма обратной связи',
    lineLabel: 'LINE',
    emailLabel: 'email',
    phoneLabel: 'телефон',
    messages: {
      unconfigured:
        'AI-чат еще не настроен. Пожалуйста, используйте форму обратной связи.',
      invalidRequest: 'Неверный формат запроса.',
      required: 'Введите вопрос.',
      questionTooLong:
        'Вопрос слишком длинный. Разделите его на более короткие сообщения.',
      conversationTooLong:
        'Диалог слишком длинный. Кратко сформулируйте вопрос.',
      rateLimited:
        'Слишком много сообщений за короткое время. Пожалуйста, подождите и попробуйте снова.',
      failed:
        'AI-чат не смог ответить. Пожалуйста, используйте форму обратной связи.',
      emptyAnswer: 'По этому вопросу воспользуйтесь формой обратной связи.',
    },
  },
}

function buildAcecoreContext(locale: SupportedLocale): string {
  const settings = LOCALE_SETTINGS[locale]
  const servicesPath = localizedPath('/services/', locale)
  const systemsPath =
    locale === 'ja'
      ? `${SYSTEMS_ORIGIN}/`
      : `${servicesPath}#system-development`

  return `
Acecore public site context:
- Acecore is a Japan-based technology collective that provides system development, website design, server operations, design, and IT education as a one-stop solution.
- Services include business system and app development, server setup and operations, website design and maintenance, design and creative production, and IT education through Acecore Schools.
- Acecore Schools handles IT learning consultations. Visitors should include what they want to learn, age or grade, and preferred learning pace.
- Aceserver is Acecore's public Minecraft server community.
- Estimates are free, and replies usually arrive within 1-2 business days.
- LINE is available for short consultations and school-related messages. The contact form is best for detailed estimates, project consultations, partnerships, recruitment, and service questions.
- Useful site links for the visitor locale. Use these exact internal URLs:
  - Services overview: ${servicesPath}
  - Business system and app development: ${systemsPath}
  - Server setup and operations: ${servicesPath}#server
  - Website design and maintenance: ${servicesPath}#web
  - Design and creative production: ${servicesPath}#design
  - Acecore Schools and IT education: ${localizedSchoolsPath(locale)}
  - Aceserver: ${servicesPath}#aceserver
  - AceStudio: ${localizedPath('/acestudio/', locale)}
  - Works and case studies: ${localizedPath('/works/', locale)}
  - Blog: ${localizedPath('/blog/', locale)}
  - Contact form: ${localizedPath('/contact/', locale)}
  - Official LINE: https://lin.ee/DjIrdqj
  - Direct email fallback: mailto:info@acecore.net
  - Direct phone fallback: tel:05088902788
- Localized contact labels:
  - Contact form: ${settings.contactFormLabel}
  - LINE: ${settings.lineLabel}
  - Email: ${settings.emailLabel}
  - Phone: ${settings.phoneLabel}
- Answer using only public site context. If the question requires pricing, schedules, contracts, guarantees, urgent support, or private details not listed here, say what can be answered generally and guide the visitor to the contact form or LINE first.
- Do not show email or phone by default. Include direct email or phone links only when the visitor asks for direct contact, says the AI did not resolve the issue, cannot use the form, or needs urgent confirmation.
`
}

export const onRequestPost = async ({
  request,
  env,
}: PagesContext): Promise<Response> => {
  let payload: AiContactPayload
  try {
    payload = (await request.json()) as AiContactPayload
  } catch {
    return jsonResponse(
      { ok: false, answer: getLocalizedMessage('ja', 'invalidRequest') },
      400,
    )
  }

  const question = String(payload.question || '').trim()
  const locale = normalizeLocale(payload.locale)
  const localeSettings = LOCALE_SETTINGS[locale]
  const conversationInput = buildConversationInput(payload)

  if (!isAllowedRequestOrigin(request)) {
    return jsonResponse(
      { ok: false, answer: getLocalizedMessage(locale, 'invalidRequest') },
      403,
    )
  }

  const rateLimit = checkRateLimit(request)
  if (!rateLimit.allowed) {
    return jsonResponse(
      { ok: false, answer: getLocalizedMessage(locale, 'rateLimited') },
      429,
      { 'Retry-After': String(rateLimit.retryAfterSeconds || 60) },
    )
  }

  if (!env.OPENAI_API_KEY) {
    return jsonResponse(
      { ok: false, answer: getLocalizedMessage(locale, 'unconfigured') },
      503,
    )
  }

  if (!conversationInput) {
    return jsonResponse(
      { ok: false, answer: getLocalizedMessage(locale, 'required') },
      400,
    )
  }

  if (question.length > MAX_QUESTION_LENGTH) {
    return jsonResponse(
      { ok: false, answer: getLocalizedMessage(locale, 'questionTooLong') },
      400,
    )
  }

  if (conversationInput.length > MAX_CONVERSATION_LENGTH) {
    return jsonResponse(
      {
        ok: false,
        answer: getLocalizedMessage(locale, 'conversationTooLong'),
      },
      400,
    )
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
        `Answer in ${localeSettings.languageName}. The visitor locale code is ${locale}.`,
        'Answer ordinary questions about Acecore using the public site context below.',
        'Keep answers concise, practical, and helpful for choosing the next action.',
        'Use the localized Acecore paths listed in the context exactly for internal links. Do not replace them with default-language URLs.',
        'Use simple Markdown when it improves readability: short paragraphs, bullet lists, and **bold** for important service names. When a relevant Acecore page or contact path exists, make the first useful mention a Markdown link using the URLs in the context. Include links in answers about service selection, estimates, schools, works, contact options, or next steps. Do not link every repeated mention. Do not use raw HTML or tables. Prefer bullet lists over long arrow chains.',
        'Do not invent pricing, timelines, contracts, guarantees, or private contact details.',
        'If a request needs a human decision, detailed estimate, formal reply, urgent help, or support beyond the public site context, say the AI cannot decide that and guide the visitor to the best contact option.',
        `Use the localized ${localeSettings.contactFormLabel} for detailed project consultations and estimates. Mention ${localeSettings.lineLabel} for short consultations and school-related messages. If the conversation appears unresolved or the visitor asks for direct human contact, add a compact direct-contact line with [${localeSettings.emailLabel}](mailto:info@acecore.net) or [${localeSettings.phoneLabel}](tel:05088902788) only when appropriate.`,
        buildAcecoreContext(locale),
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
        answer: getLocalizedMessage(locale, 'failed'),
      },
      response.status,
    )
  }

  const answer = extractOutputText(result).trim()
  return jsonResponse({
    ok: true,
    answer: answer || getLocalizedMessage(locale, 'emptyAnswer'),
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

function normalizeLocale(value: unknown): SupportedLocale {
  const locale = String(value || 'ja')
    .trim()
    .toLowerCase()
    .slice(0, 16)

  return (SUPPORTED_LOCALES as readonly string[]).includes(locale)
    ? (locale as SupportedLocale)
    : 'ja'
}

function localizedSchoolsPath(locale: SupportedLocale): string {
  return locale === 'ja' ? `${SCHOOLS_ORIGIN}/` : `${SCHOOLS_ORIGIN}/${locale}/`
}

function localizedPath(path: string, locale: SupportedLocale): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return locale === 'ja' ? normalizedPath : `/${locale}${normalizedPath}`
}

function isAllowedRequestOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin')
  if (!origin) return true

  try {
    return new URL(origin).host === new URL(request.url).host
  } catch {
    return false
  }
}

function checkRateLimit(request: Request): {
  allowed: boolean
  retryAfterSeconds?: number
} {
  const now = Date.now()
  const key = getClientKey(request)
  const current = rateLimitBuckets.get(key)

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    })
    pruneRateLimitBuckets(now)
    return { allowed: true }
  }

  current.count += 1

  if (current.count > RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  return { allowed: true }
}

function getClientKey(request: Request): string {
  const forwardedFor = request.headers
    .get('X-Forwarded-For')
    ?.split(',')[0]
    ?.trim()
  const ip =
    request.headers.get('CF-Connecting-IP')?.trim() ||
    forwardedFor ||
    request.headers.get('CF-Ray')?.trim() ||
    'unknown'

  return ip
}

function pruneRateLimitBuckets(now: number): void {
  if (rateLimitBuckets.size <= RATE_LIMIT_MAX_BUCKETS) return

  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.resetAt <= now) {
      rateLimitBuckets.delete(key)
    }
    if (rateLimitBuckets.size <= RATE_LIMIT_MAX_BUCKETS) return
  }
}

function getLocalizedMessage(
  locale: SupportedLocale,
  key: keyof LocaleSettings['messages'],
): string {
  return LOCALE_SETTINGS[locale].messages[key]
}

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

function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}
