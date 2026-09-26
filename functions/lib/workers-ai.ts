export const WORKERS_AI_CHAT_MODEL = '@cf/zai-org/glm-5.3-flash' as const
export const OPENAI_CHAT_MODEL = 'gpt-6-luna' as const
export const DEFAULT_WORKERS_AI_REASONING_EFFORT = 'low' as const

export type WorkersAiReasoningEffort = 'low' | 'medium' | 'high'

export type WorkersAiEnv = {
  AI?: Ai
  WORKERS_AI_CHAT_MODEL?: string
  WORKERS_AI_REASONING_EFFORT?: string
  AI_CONTACT_OPENAI_SERVICE?: Fetcher
}

type WorkersAiResponseOptions = {
  instructions: string
  input: string
  maxOutputTokens: number
  safetyIdentifier: string
}

export type WorkersAiResponseResult = {
  text: string
  hitOutputTokenLimit: boolean
}

type ChatCompletionChoice = {
  index?: unknown
  finish_reason?: unknown
  message?: {
    content?: unknown
    refusal?: unknown
  }
}

export class WorkersAiProviderError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.name = 'WorkersAiProviderError'
    this.code = code
  }
}

export async function createWorkersAiResponse(
  env: WorkersAiEnv,
  options: WorkersAiResponseOptions,
): Promise<WorkersAiResponseResult> {
  const configuredModel = normalizeConfigValue(env.WORKERS_AI_CHAT_MODEL)
  if (
    configuredModel !== WORKERS_AI_CHAT_MODEL &&
    configuredModel !== OPENAI_CHAT_MODEL
  ) {
    throw new WorkersAiProviderError('invalid_model_configuration')
  }

  if (configuredModel === WORKERS_AI_CHAT_MODEL && !env.AI)
    throw new WorkersAiProviderError('unconfigured')
  if (configuredModel === OPENAI_CHAT_MODEL && !env.AI_CONTACT_OPENAI_SERVICE)
    throw new WorkersAiProviderError('unconfigured')

  let payload: unknown
  try {
    const request = {
      messages: [
        { role: 'system', content: options.instructions },
        { role: 'user', content: options.input },
      ],
      reasoning_effort: normalizeReasoningEffort(
        env.WORKERS_AI_REASONING_EFFORT,
      ),
      max_completion_tokens: options.maxOutputTokens,
      user: options.safetyIdentifier,
      store: false,
    }
    if (configuredModel === WORKERS_AI_CHAT_MODEL) {
      payload = await (
        env.AI!.run as (model: string, input: unknown) => Promise<unknown>
      )(WORKERS_AI_CHAT_MODEL, request)
    } else {
      const response = await env.AI_CONTACT_OPENAI_SERVICE!.fetch(
        'https://ai-contact.internal/v1/chat',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: OPENAI_CHAT_MODEL, ...request }),
          signal: AbortSignal.timeout(30_000),
        },
      )
      if (!response.ok) {
        await response.body?.cancel()
        throw new Error('openai_request_failed')
      }
      const body = await response.text()
      if (body.length > 512 * 1024) throw new Error('openai_response_too_large')
      payload = JSON.parse(body)
    }
  } catch (error) {
    throw new WorkersAiProviderError(
      error instanceof Error && error.name === 'AbortError'
        ? 'timeout'
        : 'provider_error',
    )
  }

  return parseWorkersAiResponse(payload)
}

export function getWorkersAiErrorCode(
  error: unknown,
  fallback = 'provider_error',
): string {
  if (error instanceof WorkersAiProviderError) return error.code
  return error instanceof Error && error.name ? error.name : fallback
}

function parseWorkersAiResponse(payload: unknown): WorkersAiResponseResult {
  if (!isJsonObject(payload) || !Array.isArray(payload.choices)) {
    throw new WorkersAiProviderError('invalid_response')
  }

  const choices = payload.choices as ChatCompletionChoice[]
  if (
    choices.length !== 1 ||
    choices[0]?.index !== 0 ||
    !isJsonObject(choices[0]?.message)
  ) {
    throw new WorkersAiProviderError('invalid_response')
  }

  const choice = choices[0]
  if (choice.finish_reason === 'length') {
    return { text: '', hitOutputTokenLimit: true }
  }
  if (choice.finish_reason === 'content_filter') {
    throw new WorkersAiProviderError('provider_rejected')
  }
  if (choice.finish_reason !== 'stop') {
    throw new WorkersAiProviderError('invalid_response')
  }

  const refusal = choice.message?.refusal
  if (typeof refusal === 'string' && refusal.trim()) {
    throw new WorkersAiProviderError('provider_rejected')
  }

  const content = choice.message?.content
  if (typeof content !== 'string') {
    throw new WorkersAiProviderError('invalid_response')
  }

  return { text: content, hitOutputTokenLimit: false }
}

function normalizeReasoningEffort(value: unknown): WorkersAiReasoningEffort {
  const effort = normalizeConfigValue(value).toLowerCase()
  return effort === 'low' || effort === 'medium' || effort === 'high'
    ? effort
    : DEFAULT_WORKERS_AI_REASONING_EFFORT
}

function normalizeConfigValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
