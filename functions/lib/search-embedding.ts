export const SEARCH_EMBEDDING_MODEL = '@cf/baai/bge-m3'
export const SEARCH_EMBEDDING_DIMENSIONS = 1024

export type SearchEmbeddingEnv = {
  AI?: Ai
  SEARCH_EMBEDDING_MODEL?: string
  SEARCH_EMBEDDING_DIMENSIONS?: string
}

export class SearchEmbeddingProviderError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.name = 'SearchEmbeddingProviderError'
    this.code = code
  }
}

export async function createSearchEmbedding(
  env: SearchEmbeddingEnv,
  input: string,
): Promise<number[]> {
  validateConfiguration(env)
  if (!env.AI) throw new SearchEmbeddingProviderError('unconfigured')

  let payload: unknown
  try {
    payload = await env.AI.run(SEARCH_EMBEDDING_MODEL, {
      text: [input],
      truncate_inputs: false,
    })
  } catch (error) {
    throw new SearchEmbeddingProviderError(
      error instanceof Error && error.name ? error.name : 'provider_error',
    )
  }

  if (!isRecord(payload) || !Array.isArray(payload.data)) {
    throw new SearchEmbeddingProviderError('invalid_embedding_response')
  }
  if (payload.data.length !== 1 || !Array.isArray(payload.data[0])) {
    throw new SearchEmbeddingProviderError('invalid_embedding')
  }

  const embedding = payload.data[0]
  if (
    embedding.length !== SEARCH_EMBEDDING_DIMENSIONS ||
    !embedding.every(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value),
    )
  ) {
    throw new SearchEmbeddingProviderError('invalid_embedding')
  }
  if (
    (payload.pooling !== undefined && payload.pooling !== 'cls') ||
    (payload.shape !== undefined &&
      (!Array.isArray(payload.shape) ||
        payload.shape.length !== 2 ||
        payload.shape[0] !== 1 ||
        payload.shape[1] !== SEARCH_EMBEDDING_DIMENSIONS))
  ) {
    throw new SearchEmbeddingProviderError('invalid_embedding_contract')
  }

  return embedding
}

export function getSearchEmbeddingErrorCode(
  error: unknown,
  fallback = 'provider_error',
): string {
  if (error instanceof SearchEmbeddingProviderError) return error.code
  return error instanceof Error && error.name ? error.name : fallback
}

function validateConfiguration(env: SearchEmbeddingEnv): void {
  const configuredModel = normalize(env.SEARCH_EMBEDDING_MODEL)
  const configuredDimensions = normalize(env.SEARCH_EMBEDDING_DIMENSIONS)
  if (
    (configuredModel && configuredModel !== SEARCH_EMBEDDING_MODEL) ||
    (configuredDimensions &&
      Number(configuredDimensions) !== SEARCH_EMBEDDING_DIMENSIONS)
  ) {
    throw new SearchEmbeddingProviderError('invalid_embedding_configuration')
  }
}

function normalize(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
