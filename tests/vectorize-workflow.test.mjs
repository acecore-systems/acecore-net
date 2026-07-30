import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import yaml from 'js-yaml'

const workflowPath = new URL(
  '../.github/workflows/sync-vectorize.yml',
  import.meta.url,
)

test('production大量削除は公開corpusに結び付く手動承認だけで解除できる', async () => {
  const source = await readFile(workflowPath, 'utf8')
  const workflow = yaml.load(source)
  const inputs = workflow.on.workflow_dispatch.inputs
  const productionSteps = workflow.jobs['sync-production'].steps
  const approvalStep = productionSteps.find(
    ({ name }) => name === 'Validate manual large-delete approval',
  )
  const syncStep = productionSteps.find(
    ({ name }) => name === 'Sync production Vectorize index',
  )

  assert.equal(inputs.allow_large_delete.type, 'boolean')
  assert.equal(inputs.allow_large_delete.default, false)
  assert.ok(inputs.approved_commit)
  assert.ok(inputs.approved_corpus_version)
  assert.ok(inputs.approved_delete_count)
  assert.ok(inputs.approved_plan_id)

  assert.match(approvalStep.run, /manual production dispatch/)
  assert.match(approvalStep.run, /APPROVED_COMMIT.*BUILT_COMMIT/)
  assert.match(approvalStep.run, /APPROVED_CORPUS_VERSION.*corpus_version/)
  assert.match(approvalStep.run, /APPROVED_DELETE_COUNT.*positive integer/s)
  assert.match(approvalStep.run, /APPROVED_PLAN_ID.*SHA-256/s)

  assert.match(syncStep.run, /sync-vectorize\.mjs --plan/)
  assert.match(
    syncStep.run,
    /if \[\[ "\$ALLOW_LARGE_DELETE" == "true" \]\]; then\s+plan_output=/,
  )
  assert.match(syncStep.run, /actual_delete.*APPROVED_DELETE_COUNT/s)
  assert.match(syncStep.run, /actual_plan_id.*APPROVED_PLAN_ID/s)
  assert.match(syncStep.run, /sync-vectorize\.mjs[\s\\]+--allow-large-delete/)
  assert.match(syncStep.run, /--expected-delete-count/)
  assert.match(syncStep.run, /--expected-plan-id/)
  assert.equal(
    syncStep.env.VECTORIZE_INDEX_NAME,
    'acecore-net-search-openai-1536-production',
  )
  assert.equal(syncStep.env.OPENAI_API_KEY, '${{ secrets.OPENAI_API_KEY }}')
  assert.match(syncStep.run, /OPENAI_API_KEY is not configured/)
})

test('preview大量削除もmain corpusに結び付く手動承認だけで解除できる', async () => {
  const source = await readFile(workflowPath, 'utf8')
  const workflow = yaml.load(source)
  const previewSteps = workflow.jobs['sync-preview'].steps
  const approvalStep = previewSteps.find(
    ({ name }) => name === 'Validate preview large-delete approval',
  )
  const syncStep = previewSteps.find(
    ({ name }) => name === 'Sync preview Vectorize index',
  )

  assert.match(approvalStep.run, /APPROVED_COMMIT.*BUILT_COMMIT/)
  assert.match(approvalStep.run, /APPROVED_CORPUS_VERSION.*corpus_version/)
  assert.match(approvalStep.run, /APPROVED_DELETE_COUNT.*positive integer/s)
  assert.match(approvalStep.run, /APPROVED_PLAN_ID.*SHA-256/s)
  assert.match(approvalStep.run, /Approval values require/)

  assert.match(syncStep.run, /sync-vectorize\.mjs --plan/)
  assert.match(
    syncStep.run,
    /if \[\[ "\$ALLOW_LARGE_DELETE" == "true" \]\]; then\s+plan_output=/,
  )
  assert.match(syncStep.run, /actual_delete.*APPROVED_DELETE_COUNT/s)
  assert.match(syncStep.run, /actual_plan_id.*APPROVED_PLAN_ID/s)
  assert.match(syncStep.run, /sync-vectorize\.mjs[\s\\]+--allow-large-delete/)
  assert.match(syncStep.run, /--expected-delete-count/)
  assert.match(syncStep.run, /--expected-plan-id/)
  assert.equal(
    syncStep.env.VECTORIZE_INDEX_NAME,
    'acecore-net-search-openai-1536-preview',
  )
  assert.equal(syncStep.env.OPENAI_API_KEY, '${{ secrets.OPENAI_API_KEY }}')
  assert.match(syncStep.run, /OPENAI_API_KEY is not configured/)
})
