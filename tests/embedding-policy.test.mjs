import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test from 'node:test'
import modelConfig from '../config/ai-models.generated.json' with { type: 'json' }

const updatedModel = 'voyage-future-model'
const updatedConfig = structuredClone(modelConfig)
updatedConfig.features['search.embedding'].api_model_id = updatedModel

const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '../../config/ai-models.cjs')
      return {
        url:
          'data:text/javascript,' +
          encodeURIComponent(`export default ${JSON.stringify(updatedConfig)}`),
        shortCircuit: true,
      }
    return nextResolve(specifier, context)
  },
})
const { createSearchEmbedding } =
  await import('../functions/lib/search-embedding.ts')
const { syncVectorize } = await import('../scripts/sync-vectorize.ts')
hook.deregister()

test('同じ次元の別モデルを配布しても既存Voyage索引への検索・同期を拒否する', async (t) => {
  const unexpected = t.mock.fn(() => {
    throw new Error('Unexpected external request')
  })

  for (const model of ['voyage-4-lite', updatedModel]) {
    await assert.rejects(
      createSearchEmbedding(
        {
          SEARCH_EMBEDDING_MODEL: model,
          SEARCH_EMBEDDING_DIMENSIONS: '1024',
          VOYAGE_EMBEDDING: { fetch: unexpected },
        },
        '検索',
      ),
      { code: 'embedding_policy_incompatible' },
    )
  }

  await assert.rejects(
    syncVectorize({
      indexName: 'acecore-net-search-voyage-4-lite-1024-production-v1',
      voyageApiKey: 'synthetic',
      fetchImpl: unexpected,
    }),
    { message: 'embedding_policy_incompatible' },
  )
  assert.equal(unexpected.mock.callCount(), 0)
})
