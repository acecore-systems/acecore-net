import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import { load } from 'js-yaml'

const workflowPath = new URL(
  '../.github/workflows/sync-vectorize.yml',
  import.meta.url,
)
const pagesConfigPath = new URL('../wrangler.jsonc', import.meta.url)

test('Production同期workflowから20%超削除を解除できない', async () => {
  const source = await readFile(workflowPath, 'utf8')
  const workflow = load(source)
  const productionSteps = workflow.jobs['sync-production'].steps
  const syncStep = productionSteps.find(
    ({ name }) => name === 'Sync production Vectorize index',
  )

  assert.equal(workflow.on.workflow_dispatch, null)
  assert.equal(
    productionSteps.find(
      ({ name }) => name === 'Validate manual large-delete approval',
    ),
    undefined,
  )
  assert.doesNotMatch(source, /allow_large_delete/u)
  assert.doesNotMatch(
    source,
    /approved_(?:commit|corpus_version|delete_count|plan_id)/u,
  )
  assert.doesNotMatch(syncStep.run, /--allow-large-delete/u)
  assert.doesNotMatch(syncStep.run, /--expected-delete-count/u)
  assert.doesNotMatch(syncStep.run, /--expected-plan-id/u)
  assert.match(
    syncStep.run,
    /node --experimental-strip-types \.\.\/tooling\/scripts\/sync-vectorize\.ts/,
  )
  assert.match(syncStep.run, /--confirm-production "\$VECTORIZE_INDEX_NAME"/u)
  assert.equal(
    syncStep.env.VECTORIZE_INDEX_NAME,
    'acecore-net-search-openai-1536-production',
  )
  assert.equal(syncStep.env.OPENAI_API_KEY, '${{ secrets.OPENAI_API_KEY }}')
  assert.match(syncStep.run, /OPENAI_API_KEY is not configured/)
})

test('Vectorize同期workflowはProduction専用でPreview credentialを参照しない', async () => {
  const source = await readFile(workflowPath, 'utf8')
  const workflow = load(source)

  assert.deepEqual(Object.keys(workflow.jobs), ['sync-production'])
  assert.equal(workflow.on.workflow_dispatch, null)
  assert.match(
    workflow.jobs['sync-production'].if,
    /github\.event_name == 'workflow_dispatch'/,
  )
  assert.doesNotMatch(workflow.jobs['sync-production'].if, /inputs\.target/u)
  assert.doesNotMatch(source, /cloudflare-search-preview/u)
  assert.doesNotMatch(source, /CLOUDFLARE_SEARCH_PREVIEW_API_TOKEN/u)
  assert.doesNotMatch(source, /acecore-net-search-openai-1536-preview/u)
})

test('配置待機ゲートを型検査済みのTypeScriptとして実行する', async () => {
  const source = await readFile(workflowPath, 'utf8')
  const workflow = load(source)
  const productionSteps = workflow.jobs['sync-production'].steps
  const typecheckStep = productionSteps.find(
    ({ name }) => name === 'Type-check protected Vectorize tooling',
  )
  const deploymentMarkerSteps = productionSteps.filter(({ name }) =>
    [
      'Wait for the pushed commit to be public',
      'Resolve deployed site commit',
      'Confirm the built commit is still public',
    ].includes(name),
  )

  assert.ok(typecheckStep)
  assert.match(typecheckStep.run, /npm run typecheck:deployment-marker/u)
  assert.equal(deploymentMarkerSteps.length, 3)
  for (const step of deploymentMarkerSteps) {
    assert.match(
      step.run,
      /node --experimental-strip-types tooling\/scripts\/wait-for-deployment\.ts/u,
    )
  }
  assert.doesNotMatch(source, /wait-for-deployment\.mjs/u)
})

test('確認済み正規indexをProduction bindingへ設定する', async () => {
  const config = await readFile(pagesConfigPath, 'utf8')

  assert.match(
    config,
    /"binding": "SEARCH_INDEX",\s+"index_name": "acecore-net-search-openai-1536-production",/u,
  )
  assert.doesNotMatch(
    config,
    /"binding": "SEARCH_INDEX",\s+"index_name": "acecore-net-search-openai-1536-production-v2",/u,
  )
})
