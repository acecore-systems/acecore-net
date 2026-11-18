import {
  parseVoyageEmbeddings,
  VOYAGE_DIMENSIONS,
  VOYAGE_MODEL,
  voyageRequest,
} from './voyage-embedding.ts'

export const SEARCH_EMBEDDING_MODEL = VOYAGE_MODEL
export const SEARCH_EMBEDDING_DIMENSIONS = VOYAGE_DIMENSIONS

const VOYAGE_SERVICE_URL = 'https://voyage-embeddings.internal/v1/embeddings'

export type SearchEmbeddingEnv = {
  VOYAGE_EMBEDDING?: Fetcher
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
  if (!env.VOYAGE_EMBEDDING)
    throw new SearchEmbeddingProviderError('unconfigured')

  let response: Response
  try {
    response = await env.VOYAGE_EMBEDDING.fetch(VOYAGE_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voyageRequest([input], 'query')),
    })
  } catch (error) {
    throw new SearchEmbeddingProviderError(
      error instanceof Error && error.name ? error.name : 'provider_error',
    )
  }

  if (!response.ok)
    throw new SearchEmbeddingProviderError(`http_${response.status}`)

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new SearchEmbeddingProviderError('invalid_embedding_response')
  }

  try {
    const [embedding] = parseVoyageEmbeddings(payload, 1)
    if (embedding) return embedding
  } catch (error) {
    throw new SearchEmbeddingProviderError(
      error instanceof Error ? error.message : 'invalid_embedding_response',
    )
  }
  throw new SearchEmbeddingProviderError('invalid_embedding_response')
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
