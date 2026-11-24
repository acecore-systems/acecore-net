import modelConfig from '../../config/ai-models.cjs'

// The bound Voyage indexes were built in this model's embedding space.
const VOYAGE_INDEX_MODEL = 'voyage-4-lite'
const selection = modelConfig?.features?.['search.embedding']
export const VOYAGE_MODEL =
  modelConfig?.schema_version === 1 &&
  selection?.profile === 'embedding.default' &&
  selection.provider === 'mongodb' &&
  selection.execution_mode === 'realtime' &&
  selection.api_model_id === VOYAGE_INDEX_MODEL
    ? selection.api_model_id
    : null
export const VOYAGE_DIMENSIONS = 1024

export function requireVoyageEmbeddingModel(): string {
  if (!VOYAGE_MODEL) throw new Error('embedding_policy_incompatible')
  return VOYAGE_MODEL
}

export function voyageRequest(
  input: string[],
  inputType: 'query' | 'document',
) {
  return {
    model: requireVoyageEmbeddingModel(),
    input,
    input_type: inputType,
    output_dimension: VOYAGE_DIMENSIONS,
    output_dtype: 'float',
    truncation: false,
  }
}

export function parseVoyageEmbeddings(
  payload: unknown,
  count: number,
): number[][] {
  const model = requireVoyageEmbeddingModel()
  if (
    !isRecord(payload) ||
    payload.model !== model ||
    !Array.isArray(payload.data) ||
    payload.data.length !== count
  ) {
    throw new Error('invalid_embedding_response')
  }

  const embeddings: number[][] = []
  for (const row of payload.data) {
    if (
      !isRecord(row) ||
      typeof row.index !== 'number' ||
      !Number.isInteger(row.index) ||
      row.index < 0 ||
      row.index >= count ||
      embeddings[row.index] !== undefined
    ) {
      throw new Error('invalid_embedding_index')
    }

    const values = row.embedding
    if (
      !Array.isArray(values) ||
      values.length !== VOYAGE_DIMENSIONS ||
      !values.every(
        (value) => typeof value === 'number' && Number.isFinite(value),
      )
    ) {
      throw new Error('invalid_embedding')
    }

    embeddings[row.index] = values
  }
  return embeddings
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
