export const DEFAULT_OPENAI_EMBEDDING_MODEL = 'text-embedding-3-large'
export const OPENAI_EMBEDDING_DIMENSIONS = 1536

const OPENAI_EMBEDDINGS_ENDPOINT = 'https://api.openai.com/v1/embeddings'
const OPENAI_REQUEST_TIMEOUT_MS = 30_000
const MAX_OPENAI_RESPONSE_BYTES = 512 * 1024

export type OpenAiEnv = {
  OPENAI_API_KEY?: string
  OPENAI_EMBEDDING_MODEL?: string
  OPENAI_EMBEDDING_DIMENSIONS?: string
}

export class OpenAiProviderError extends Error {
  readonly code: string
  readonly status?: number

  constructor(code: string, status?: number) {
    super(code)
    this.name = 'OpenAiProviderError'
    this.code = code
    this.status = status
  }
}

export async function createOpenAiEmbedding(
  env: OpenAiEnv,
  input: string,
): Promise<number[]> {
  const configuredDimensions = normalizeEmbeddingDimensions(
    env.OPENAI_EMBEDDING_DIMENSIONS,
  )
  const configuredModel = normalizeEmbeddingModel(env.OPENAI_EMBEDDING_MODEL)
  const payload = await requestOpenAiJson(
    OPENAI_EMBEDDINGS_ENDPOINT,
    env.OPENAI_API_KEY,
    {
      model: configuredModel,
      input,
      dimensions: configuredDimensions,
      encoding_format: 'float',
    },
  )

  const data = isJsonObject(payload) ? payload.data : undefined
  if (
    !isJsonObject(payload) ||
    payload.model !== configuredModel ||
    !Array.isArray(data) ||
    data.length !== 1 ||
    !isJsonObject(data[0])
  ) {
    throw new OpenAiProviderError('invalid_embedding_response')
  }

  const embedding = data[0].embedding
  if (
    data[0].index !== 0 ||
    !Array.isArray(embedding) ||
    embedding.length !== OPENAI_EMBEDDING_DIMENSIONS ||
    embedding.some((value) => !Number.isFinite(value))
  ) {
    throw new OpenAiProviderError('invalid_embedding')
  }

  return embedding as number[]
}

export function getOpenAiErrorCode(
  error: unknown,
  fallback = 'provider_error',
): string {
  if (error instanceof OpenAiProviderError) return error.code
  return error instanceof Error && error.name ? error.name : fallback
}

function normalizeEmbeddingDimensions(value: unknown): number {
  if (value === undefined || value === null || value === '') {
    return OPENAI_EMBEDDING_DIMENSIONS
  }

  const dimensions = Number(value)
  if (dimensions !== OPENAI_EMBEDDING_DIMENSIONS) {
    throw new OpenAiProviderError('invalid_embedding_configuration')
  }
  return dimensions
}

function normalizeEmbeddingModel(value: unknown): string {
  const model = normalizeConfigValue(value) || DEFAULT_OPENAI_EMBEDDING_MODEL
  if (model !== DEFAULT_OPENAI_EMBEDDING_MODEL) {
    throw new OpenAiProviderError('invalid_embedding_configuration')
  }
  return model
}

function normalizeConfigValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

async function requestOpenAiJson(
  endpoint: string,
  apiKeyValue: unknown,
  body: unknown,
): Promise<unknown> {
  const apiKey = normalizeConfigValue(apiKeyValue)
  if (!apiKey) throw new OpenAiProviderError('unconfigured')

  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(new Error('OpenAI request timed out.')),
    OPENAI_REQUEST_TIMEOUT_MS,
  )

  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined)
      throw new OpenAiProviderError(
        response.status === 429
          ? 'rate_limited'
          : response.status >= 500
            ? 'provider_unavailable'
            : 'provider_rejected',
        response.status,
      )
    }

    return await readBoundedJsonResponse(response)
  } catch (error) {
    if (error instanceof OpenAiProviderError) throw error
    if (controller.signal.aborted) {
      throw new OpenAiProviderError('timeout')
    }
    throw new OpenAiProviderError(
      error instanceof TypeError ? 'network_error' : 'provider_error',
    )
  } finally {
    clearTimeout(timeout)
  }
}

async function readBoundedJsonResponse(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get('Content-Length'))
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_OPENAI_RESPONSE_BYTES
  ) {
    await response.body?.cancel().catch(() => undefined)
    throw new OpenAiProviderError('response_too_large')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new OpenAiProviderError('invalid_json_response')

  const decoder = new TextDecoder()
  let bytesRead = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytesRead += value.byteLength
      if (bytesRead > MAX_OPENAI_RESPONSE_BYTES) {
        await reader.cancel().catch(() => undefined)
        throw new OpenAiProviderError('response_too_large')
      }
      text += decoder.decode(value, { stream: true })
    }
    text += decoder.decode()
  } finally {
    reader.releaseLock()
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new OpenAiProviderError('invalid_json_response')
  }
}

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
