import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import yaml from 'js-yaml'

const workflowPath = new URL(
  '../.github/workflows/sync-vectorize.yml',
  import.meta.url,
)
const pagesConfigPath = new URL('../wrangler.jsonc', import.meta.url)

test('Production同期workflowは承認済みの固定planだけ20%超削除を実行できる', async () => {
  const source = await readFile(workflowPath, 'utf8')
  const workflow = yaml.load(source)
  const productionSteps = workflow.jobs['sync-production'].steps
  const syncStep = productionSteps.find(
    ({ name }) => name === 'Sync production Vectorize index',
  )

  assert.deepEqual(workflow.on.workflow_dispatch, {
    inputs: {
      execute_approved_plan: {
        description:
          '2026-08-01に承認された正規名indexの74件削除planだけを実行する',
        required: false,
        type: 'boolean',
        default: false,
      },
    },
  })
  assert.doesNotMatch(
    source,
    /inputs\.(?:index_name|expected_delete_count|expected_plan_id)/u,
  )
  assert.match(
    syncStep.run,
    /if \[\[ "\$EVENT_NAME" == "workflow_dispatch" && "\$EXECUTE_APPROVED_PLAN" == "true" \]\]/u,
  )
  assert.match(syncStep.run, /--allow-large-delete/u)
  assert.match(syncStep.run, /--expected-delete-count 74/u)
  assert.match(
    syncStep.run,
    /--expected-plan-id 19e1e130a5bda592d27edb4ecd1f68d19aebb11191723ae369d967331f7dd90b/u,
  )
  assert.match(syncStep.run, /node \.\.\/tooling\/scripts\/sync-vectorize\.mjs/)
  assert.match(
    syncStep.run,
    /node \.\.\/tooling\/scripts\/sync-vectorize\.mjs "\$\{args\[@\]\}"/u,
  )
  assert.equal(
    syncStep.env.VECTORIZE_INDEX_NAME,
    'acecore-net-search-openai-1536-production',
  )
  assert.equal(syncStep.env.EVENT_NAME, '${{ github.event_name }}')
  assert.equal(
    syncStep.env.EXECUTE_APPROVED_PLAN,
    '${{ inputs.execute_approved_plan }}',
  )
  assert.equal(syncStep.env.OPENAI_API_KEY, '${{ secrets.OPENAI_API_KEY }}')
  assert.match(syncStep.run, /OPENAI_API_KEY is not configured/)
})

test('Vectorize同期workflowはProduction専用でPreview credentialを参照しない', async () => {
  const source = await readFile(workflowPath, 'utf8')
  const workflow = yaml.load(source)

  assert.deepEqual(Object.keys(workflow.jobs), ['sync-production'])
  assert.ok(workflow.on.workflow_dispatch.inputs.execute_approved_plan)
  assert.match(
    workflow.jobs['sync-production'].if,
    /github\.event_name == 'workflow_dispatch'/,
  )
  assert.doesNotMatch(workflow.jobs['sync-production'].if, /inputs\.target/u)
  assert.doesNotMatch(source, /cloudflare-search-preview/u)
  assert.doesNotMatch(source, /CLOUDFLARE_SEARCH_PREVIEW_API_TOKEN/u)
  assert.doesNotMatch(source, /acecore-net-search-openai-1536-preview/u)
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
