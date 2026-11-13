import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import { runOpenAiTranslationProbe } from '../scripts/openai-translation-probe.ts'
import {
  createMetaTranslationProbeInput,
  selectCompletedBatch,
} from '../scripts/openai-translation-batch.ts'
import {
  validateSubmissionJournal,
  type SubmissionJournal,
  type SubmissionStore,
} from '../scripts/openai-batch-submission.ts'

function store(): SubmissionStore {
  let journal: SubmissionJournal = { version: 1, submissions: {} }
  return {
    async read() {
      return structuredClone(journal)
    },
    async mutate(change) {
      const copy = structuredClone(journal)
      change(copy)
      validateSubmissionJournal(copy)
      journal = copy
      return structuredClone(journal)
    },
  }
}

test('合成送信は通常collector対象外のBatchへ medium と構造出力を送る', async () => {
  const calls: string[] = []
  const fake: typeof fetch = async (url, init) => {
    calls.push(String(url))
    if (String(url).endsWith('/files')) {
      const form = init!.body as FormData
      assert.equal(form.get('purpose'), 'batch')
      const request = JSON.parse(await (form.get('file') as Blob).text())
      assert.equal(request.body.model, 'gpt-6.1-terra')
      assert.equal(request.body.reasoning.effort, 'medium')
      assert.equal(request.body.text.format.type, 'json_schema')
      return Response.json({ id: 'file-probe' })
    }
    const body = JSON.parse(String(init!.body))
    assert.equal(body.endpoint, '/v1/responses')
    assert.equal(body.completion_window, '24h')
    assert.equal(body.metadata.translation_system, 'acecore-net-probe-v1')
    return Response.json({ id: 'batch_probe' })
  }
  const journal = store()
  assert.deepEqual(
    await runOpenAiTranslationProbe('submit', 'key', journal, undefined, fake),
    { state: 'submitted', batchId: 'batch_probe' },
  )
  assert.deepEqual(
    await runOpenAiTranslationProbe('submit', 'key', journal, undefined, fake),
    { state: 'submitted', batchId: 'batch_probe' },
  )
  assert.equal(calls.length, 2)
  assert.equal(
    selectCompletedBatch(
      [
        {
          id: 'batch_probe',
          status: 'completed',
          created_at: 100,
          output_file_id: 'file-probe',
          metadata: { translation_system: 'acecore-net-probe-v1' },
        },
      ],
      new Set(),
      101,
    ),
    null,
  )
})

test('合成回収はGETのみで完了結果の識別子と構造を検証する', async () => {
  const calls: string[] = []
  const customId = createMetaTranslationProbeInput(
    createHash('sha256').update('test').digest('hex'),
  ).custom_id
  const fake: typeof fetch = async (url, init) => {
    calls.push(String(url))
    assert.equal(init?.method, 'GET')
    if (String(url).endsWith('/batches/batch_probe'))
      return Response.json({
        id: 'batch_probe',
        status: 'completed',
        endpoint: '/v1/responses',
        output_file_id: 'file-probe',
        metadata: {
          translation_system: 'acecore-net-probe-v1',
          ai_model: 'gpt-6.1-terra',
          ai_reasoning_effort: 'medium',
          ai_probe_request_hash: createHash('sha256')
            .update(customId)
            .digest('hex'),
        },
      })
    return new Response(
      JSON.stringify({
        custom_id: customId,
        error: null,
        response: {
          status_code: 200,
          body: {
            status: 'completed',
            model: 'gpt-6.1-terra',
            output_text: JSON.stringify({
              translations: [{ id: '/greeting', text: 'Hello' }],
            }),
          },
        },
      }),
    )
  }
  assert.deepEqual(
    await runOpenAiTranslationProbe(
      'collect',
      'key',
      undefined,
      'batch_probe',
      fake,
    ),
    { state: 'completed', batchId: 'batch_probe' },
  )
  assert.equal(calls.length, 2)
  const wrong: typeof fetch = async () =>
    Response.json({
      id: 'batch_probe',
      status: 'completed',
      endpoint: '/v1/responses',
      metadata: { translation_system: 'acecore-net-v1' },
    })
  await assert.rejects(
    runOpenAiTranslationProbe(
      'collect',
      'key',
      undefined,
      'batch_probe',
      wrong,
    ),
    /probe_batch_identity_mismatch/,
  )
})
