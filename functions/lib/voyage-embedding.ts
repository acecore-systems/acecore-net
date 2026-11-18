export const VOYAGE_MODEL = 'voyage-4-lite'
export const VOYAGE_DIMENSIONS = 1024

export function voyageRequest(
  input: string[],
  inputType: 'query' | 'document',
) {
  return {
    model: VOYAGE_MODEL,
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
  if (
    !isRecord(payload) ||
    payload.model !== VOYAGE_MODEL ||
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
