import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import {
  enablePullRequestAutoMerge,
  hasOnlyAllowedTranslationFiles,
  hasSuccessfulTranslationBuild,
  isEligibleTranslationPullRequest,
  isPullRequestBehindMain,
  markPullRequestReadyForReview,
  parseArguments,
  parsePullRequest,
  runMergeAutomation,
  updatePullRequestBranch,
  type GitHubClient,
  type RepositoryInfo,
  type TranslationPullRequest,
} from '../scripts/merge-translation-pr.ts'
import { hashSource } from '../scripts/openai-translation-batch.ts'

const REPOSITORY: RepositoryInfo = {
  owner: 'acecore-systems',
  repo: 'acecore-net',
  repository: 'acecore-systems/acecore-net',
}
const HEAD_SHA = 'a'.repeat(40)

function createPullRequest(
  overrides: Partial<TranslationPullRequest> = {},
): TranslationPullRequest {
  return {
    number: 42,
    state: 'open',
    baseRef: 'main',
    headRef: 'translation/openai/batch_example',
    headSha: HEAD_SHA,
    headRepositoryFullName: REPOSITORY.repository,
    title: '[translation] OpenAI Batch batch_example',
    body: null,
    authorLogin: 'acecore-translation-bot[bot]',
    draft: true,
    mergeableState: 'clean',
    autoMergeEnabled: false,
    nodeId: 'PR_kwDORlSgas123',
    ...overrides,
  }
}

function createLogger() {
  const logs: string[] = []
  const warnings: string[] = []
  return {
    logs,
    warnings,
    logger: {
      log(message: string) {
        logs.push(message)
      },
      warn(message: string) {
        warnings.push(message)
      },
    },
  }
}

test('PR番号は安全な正整数だけを受け入れ、未知の引数で停止する', () => {
  assert.deepEqual(parseArguments(['--pr=42']), { prNumber: 42 })
  assert.throws(
    () => parseArguments(['--pr=0']),
    /positive pull request number/,
  )
  assert.throws(
    () => parseArguments(['--pr=1', '--pr=2']),
    /only be provided once/,
  )
  assert.throws(() => parseArguments(['--unexpected']), /Unknown argument/)
  assert.throws(
    () => parseArguments(['--skip-build-check']),
    /Unknown argument/,
  )
})

test('対象外のPRは翻訳自動マージ対象にしない', () => {
  assert.equal(
    isEligibleTranslationPullRequest(createPullRequest(), REPOSITORY),
    true,
  )
  assert.equal(
    isEligibleTranslationPullRequest(
      createPullRequest({ headRef: 'feature/update' }),
      REPOSITORY,
    ),
    false,
  )
  assert.equal(
    isEligibleTranslationPullRequest(
      createPullRequest({ baseRef: 'develop' }),
      REPOSITORY,
    ),
    false,
  )
  assert.equal(
    isEligibleTranslationPullRequest(
      createPullRequest({ title: '[translation] Legacy translation PR' }),
      REPOSITORY,
    ),
    false,
  )
  assert.equal(
    isEligibleTranslationPullRequest(
      createPullRequest({
        headRef: 'copilot/update-translations',
      }),
      REPOSITORY,
    ),
    false,
  )
  assert.equal(
    isEligibleTranslationPullRequest(
      createPullRequest({
        headRepositoryFullName: 'untrusted-fork/acecore-net',
      }),
      REPOSITORY,
    ),
    false,
  )
  assert.equal(
    isEligibleTranslationPullRequest(
      createPullRequest({ authorLogin: 'untrusted-user' }),
      REPOSITORY,
    ),
    false,
  )
})

test('Metaと現行OpenAIのPR titleはbranch IDと完全一致する場合だけ認める', () => {
  const metaId = `meta-${'b'.repeat(32)}`
  for (const [headRef, title] of [
    [`translation/openai/${metaId}`, `[translation] ${metaId}`],
    ['translation/openai/batch_example', '[translation] batch_example'],
  ] as const) {
    const eligible = createPullRequest({ headRef, title })
    assert.equal(isEligibleTranslationPullRequest(eligible, REPOSITORY), true)
    for (const overrides of [
      { title: `${title} extra` },
      { title: '[translation] batch_other' },
      { headRef: `${headRef}/nested` },
      { authorLogin: 'untrusted-user' },
      { headRepositoryFullName: 'untrusted-fork/acecore-net' },
    ]) {
      assert.equal(
        isEligibleTranslationPullRequest(
          { ...eligible, ...overrides },
          REPOSITORY,
        ),
        false,
      )
    }
  }
  assert.equal(
    isEligibleTranslationPullRequest(
      createPullRequest({
        headRef: 'translation/openai/meta-invalid',
        title: '[translation] meta-invalid',
      }),
      REPOSITORY,
    ),
    false,
  )
})

test('翻訳PRは8ロケールのMarkdownと翻訳JSONだけを変更できる', () => {
  assert.equal(
    hasOnlyAllowedTranslationFiles([
      'src/content/blog/en/example.md',
      'src/content/blog/zh-cn/example.md',
      'src/i18n/translations/de.json',
    ]),
    true,
  )
  assert.equal(hasOnlyAllowedTranslationFiles([]), false)
  assert.equal(
    hasOnlyAllowedTranslationFiles(['src/content/blog/example.md']),
    false,
  )
  assert.equal(
    hasOnlyAllowedTranslationFiles(['.github/workflows/ci.yml']),
    false,
  )
})

test('GitHub API応答の必須PR head SHAを検証する', () => {
  assert.throws(
    () =>
      parsePullRequest({
        number: 42,
        state: 'open',
        base: { ref: 'main' },
        head: {
          ref: 'translation/openai/batch_example',
          sha: 'not-a-full-sha',
        },
        title: '[translation] OpenAI Batch batch_example',
        draft: true,
        node_id: 'PR_kwDORlSgas123',
      }),
    /head.sha must be a full Git SHA/,
  )
})

test('成功済みTranslation PR Buildだけをマージ条件として認める', () => {
  assert.equal(
    hasSuccessfulTranslationBuild([
      {
        name: 'Translation PR Build',
        status: 'completed',
        conclusion: 'success',
      },
    ]),
    true,
  )
  assert.equal(
    hasSuccessfulTranslationBuild([
      {
        name: 'Translation PR Build',
        status: 'completed',
        conclusion: 'failure',
      },
    ]),
    false,
  )
})

test('検証済みhead SHAとsquash方式を固定してGitHub Auto-mergeを予約する', async () => {
  const graphqlCalls: Array<{ query: string; variables?: unknown }> = []
  const client: GitHubClient = {
    async request() {
      throw new Error('REST API must not be called while enabling auto-merge.')
    },
    async graphql(query, variables) {
      graphqlCalls.push({ query, variables })
      return {
        enablePullRequestAutoMerge: {
          pullRequest: {
            number: 42,
            merged: false,
            autoMergeRequest: { mergeMethod: 'SQUASH' },
          },
        },
      }
    },
  }
  const { logger } = createLogger()

  assert.equal(
    await enablePullRequestAutoMerge(createPullRequest(), {
      client,
      logger,
    }),
    true,
  )

  assert.equal(graphqlCalls.length, 1)
  assert.match(graphqlCalls[0]?.query ?? '', /mergeMethod: SQUASH/u)
  assert.deepEqual(graphqlCalls[0]?.variables, {
    pullRequestId: 'PR_kwDORlSgas123',
    expectedHeadOid: HEAD_SHA,
    commitHeadline: '[translation] OpenAI Batch batch_example',
  })
})

test('GitHubがAuto-merge予約も即時mergeも返さなければ失敗する', async () => {
  const client: GitHubClient = {
    async request() {
      throw new Error('REST API must not be called while enabling auto-merge.')
    },
    async graphql() {
      return {
        enablePullRequestAutoMerge: {
          pullRequest: {
            number: 42,
            merged: false,
            autoMergeRequest: null,
          },
        },
      }
    },
  }
  const { logger, warnings } = createLogger()

  assert.equal(
    await enablePullRequestAutoMerge(createPullRequest({ draft: false }), {
      client,
      logger,
    }),
    false,
  )
  assert.match(warnings[0] ?? '', /did not enable auto-merge/)
})

test('既にAuto-merge予約済みならGitHub APIを再呼び出ししない', async () => {
  const client: GitHubClient = {
    async request() {
      throw new Error('REST API must not be called for an existing request.')
    },
    async graphql() {
      throw new Error('GraphQL must not be called for an existing request.')
    },
  }
  const { logger, logs } = createLogger()

  assert.equal(
    await enablePullRequestAutoMerge(
      createPullRequest({ autoMergeEnabled: true }),
      { client, logger },
    ),
    true,
  )
  assert.match(logs[0] ?? '', /already enabled/)
})

test('behindの翻訳PRは検証済みHEAD SHAを固定してmainへ追従させる', async () => {
  const requests: Array<{ path: string; options?: unknown }> = []
  const client: GitHubClient = {
    async request(path, options) {
      requests.push({ path, options })
      return { message: 'Updating pull request branch.' }
    },
    async graphql() {
      throw new Error('GraphQL must not be called while updating a branch.')
    },
  }
  const { logger } = createLogger()

  assert.equal(
    await updatePullRequestBranch(
      createPullRequest({ mergeableState: 'behind' }),
      { client, logger, repository: REPOSITORY },
    ),
    true,
  )
  assert.deepEqual(requests, [
    {
      path: '/repos/acecore-systems/acecore-net/pulls/42/update-branch',
      options: {
        method: 'PUT',
        body: { expected_head_sha: HEAD_SHA },
      },
    },
  ])
})

test('mergeable_stateが古くてもAuto-merge予約済みPRを実際のmainへ追従させ新HEADのCIを待つ', async () => {
  const sourcePath = 'src/content/blog/website-renewal.md'
  const marker = Buffer.from(
    JSON.stringify({
      kind: 'blog',
      sourcePath,
      sourceHash: hashSource(await readFile(sourcePath, 'utf8')),
    }),
  ).toString('base64url')
  const mainSha = 'b'.repeat(40)
  for (const mergeableState of ['clean', 'unknown']) {
    const requests: Array<{ path: string; options?: unknown }> = []
    const client: GitHubClient = {
      async request(path, options) {
        requests.push({ path, options })
        if (path.endsWith('/pulls/42'))
          return {
            number: 42,
            state: 'open',
            base: { ref: 'main' },
            head: {
              ref: 'translation/openai/batch_example',
              sha: HEAD_SHA,
              repo: { full_name: REPOSITORY.repository },
            },
            title: '[translation] batch_example',
            body: `<!-- openai-translation-source:${marker} -->`,
            user: { login: 'acecore-translation-bot[bot]' },
            draft: false,
            mergeable_state: mergeableState,
            auto_merge: { merge_method: 'squash' },
            node_id: 'PR_kwDORlSgas123',
          }
        if (path.includes('/files?'))
          return [{ filename: 'src/i18n/translations/en.json' }]
        if (path.endsWith('/git/ref/heads/main'))
          return { object: { sha: mainSha } }
        if (path.includes('/compare/')) {
          assert.equal(
            path,
            `/repos/${REPOSITORY.repository}/compare/${mainSha}...${HEAD_SHA}?per_page=1`,
          )
          return { behind_by: 2 }
        }
        if (path.endsWith('/update-branch')) {
          assert.deepEqual(options, {
            method: 'PUT',
            body: { expected_head_sha: HEAD_SHA },
          })
          return { message: 'Updating pull request branch.' }
        }
        throw new Error(`Must wait for new HEAD checks: ${path}`)
      },
      async graphql() {
        throw new Error('Must not merge or mark ready before new HEAD checks.')
      },
    }
    await runMergeAutomation(['--pr=42'], {
      client,
      repository: REPOSITORY,
      logger: createLogger().logger,
    })
    assert.equal(
      requests.filter(({ path }) => path.endsWith('/update-branch')).length,
      1,
    )
    assert.equal(
      requests.some(({ path }) => path.includes('/check-runs')),
      false,
    )
  }
})

test('mainとの比較結果が欠ける場合は推測してマージしない', async () => {
  const client: GitHubClient = {
    async request(path) {
      if (path.endsWith('/git/ref/heads/main'))
        return { object: { sha: 'b'.repeat(40) } }
      return { status: 'unknown' }
    },
    async graphql() {
      throw new Error('Must not merge without ancestry.')
    },
  }
  await assert.rejects(
    isPullRequestBehindMain(createPullRequest(), REPOSITORY, client),
    /must include behind_by/,
  )
})

test('mainへ追従済みでも現在のhead SHAの翻訳buildが未完了ならready化も予約もしない', async () => {
  const sourcePath = 'src/content/blog/website-renewal.md'
  const marker = Buffer.from(
    JSON.stringify({
      kind: 'blog',
      sourcePath,
      sourceHash: hashSource(await readFile(sourcePath, 'utf8')),
    }),
  ).toString('base64url')
  let checkedHead = false
  const client: GitHubClient = {
    async request(path, options) {
      assert.equal(options?.method, undefined)
      if (path.endsWith('/pulls/42'))
        return {
          number: 42,
          state: 'open',
          base: { ref: 'main' },
          head: {
            ref: 'translation/openai/batch_example',
            sha: HEAD_SHA,
            repo: { full_name: REPOSITORY.repository },
          },
          title: '[translation] batch_example',
          body: `<!-- openai-translation-source:${marker} -->`,
          user: { login: 'acecore-translation-bot[bot]' },
          draft: true,
          mergeable_state: 'unknown',
          auto_merge: null,
          node_id: 'PR_kwDORlSgas123',
        }
      if (path.includes('/files?'))
        return [{ filename: 'src/i18n/translations/en.json' }]
      if (path.endsWith('/git/ref/heads/main'))
        return { object: { sha: 'b'.repeat(40) } }
      if (path.includes('/compare/')) return { behind_by: 0 }
      if (path.endsWith(`/commits/${HEAD_SHA}/check-runs?per_page=100`)) {
        checkedHead = true
        return {
          check_runs: [
            {
              name: 'Translation PR Build',
              status: 'in_progress',
              conclusion: null,
            },
          ],
        }
      }
      throw new Error(`Unexpected request: ${path}`)
    },
    async graphql() {
      throw new Error('Current HEAD checks must pass first.')
    },
  }
  await runMergeAutomation(['--pr=42'], {
    client,
    repository: REPOSITORY,
    logger: createLogger().logger,
  })
  assert.equal(checkedHead, true)
})

test('ready化のGraphQL応答が対象PRをreadyと確認できなければ停止する', async () => {
  const client: GitHubClient = {
    async request() {
      throw new Error('REST API must not be called while marking ready.')
    },
    async graphql() {
      return {
        markPullRequestReadyForReview: {
          pullRequest: {
            number: 42,
            isDraft: true,
          },
        },
      }
    },
  }
  const { logger, warnings } = createLogger()

  assert.equal(
    await markPullRequestReadyForReview(createPullRequest(), {
      client,
      logger,
    }),
    false,
  )
  assert.match(warnings[0] ?? '', /did not mark PR/)
})

test('OpenAI翻訳PRのsourceHashが古ければbuild成功後でも閉じてマージしない', async () => {
  const staleMarker = Buffer.from(
    JSON.stringify({
      kind: 'blog',
      sourcePath: 'src/content/blog/website-renewal.md',
      sourceHash: '0'.repeat(64),
    }),
  ).toString('base64url')
  const requests: Array<{ path: string; options?: unknown }> = []
  const client: GitHubClient = {
    async request(path, options) {
      requests.push({ path, options })
      if (!options?.method) {
        return {
          number: 42,
          state: 'open',
          base: { ref: 'main' },
          head: {
            ref: 'translation/openai/batch_stale',
            sha: HEAD_SHA,
            repo: { full_name: REPOSITORY.repository },
          },
          title: '[translation] OpenAI Batch batch_stale',
          body: `<!-- openai-translation-source:${staleMarker} -->`,
          user: { login: 'acecore-translation-bot[bot]' },
          draft: true,
          mergeable_state: 'clean',
          node_id: 'PR_kwDORlSgas123',
        }
      }
      if (options.method === 'PATCH') return {}
      throw new Error(`Unexpected request: ${path}`)
    },
    async graphql() {
      throw new Error('GraphQL must not be called for a stale PR.')
    },
  }
  const { logger } = createLogger()

  await runMergeAutomation(['--pr=42'], {
    client,
    environment: { GITHUB_REPOSITORY: REPOSITORY.repository },
    logger,
    repository: REPOSITORY,
  })

  assert.deepEqual(requests, [
    {
      path: '/repos/acecore-systems/acecore-net/pulls/42',
      options: undefined,
    },
    {
      path: '/repos/acecore-systems/acecore-net/pulls/42',
      options: { method: 'PATCH', body: { state: 'closed' } },
    },
  ])
})

test('成功した翻訳build・通常CI・main更新で翻訳PRを再評価する', async () => {
  const workflow = await readFile(
    '.github/workflows/merge-translation-pr.yml',
    'utf8',
  )

  assert.match(workflow, /workflow_run:/u)
  assert.match(workflow, /workflows:\s+- Translation PR Build\s+- CI/u)
  assert.match(workflow, /push:\s+branches:\s+- main/u)
  assert.match(workflow, /PR_NUMBERS: \$\{\{ steps\.pr\.outputs\.numbers \}\}/u)
  assert.match(workflow, /checks:\s+read/u)
  assert.match(workflow, /contents:\s+read/u)
  assert.match(workflow, /pull-requests:\s+read/u)
  assert.match(workflow, /actions\/create-github-app-token@v3/u)
  assert.match(
    workflow,
    /client-id:\s+\$\{\{ secrets\.TRANSLATION_BOT_CLIENT_ID \}\}/u,
  )
  assert.doesNotMatch(workflow, /TRANSLATION_BOT_APP_ID/u)
  assert.doesNotMatch(workflow, /^\s+app-id:/mu)
  assert.match(
    workflow,
    /GITHUB_TOKEN: \$\{\{ steps\.app-token\.outputs\.token \}\}/u,
  )
  assert.match(workflow, /Enable auto-merge for eligible translation PR/u)
  assert.match(workflow, /npm run typecheck:translation-merge/u)
  assert.match(workflow, /npm run typecheck:openai-translation/u)
  assert.match(
    workflow,
    /node --experimental-strip-types scripts\/merge-translation-pr\.ts --pr="\$pr_number"/u,
  )
})

test('翻訳buildは両providerを受け入れ手動実行でもbot・repo・branch IDを検証する', async () => {
  const workflow = await readFile(
    '.github/workflows/translation-pr-build.yml',
    'utf8',
  )
  assert.match(workflow, /\[translation\] meta-/u)
  assert.match(workflow, /\[translation\] batch_/u)
  assert.match(workflow, /\.user\.login == "acecore-translation-bot\[bot\]"/u)
  assert.match(workflow, /\.head\.repo\.full_name \| ascii_downcase/u)
  assert.match(workflow, /\.title == "\[translation\] \\\(/u)
  assert.match(
    workflow,
    /PR_NUMBER: \$\{\{ github\.event\.pull_request\.number \|\| inputs\.pr_number \}\}/u,
  )
  assert.doesNotMatch(
    workflow,
    /echo "[^\n]*\$\{\{ github\.event\.pull_request\.(?:title|head\.ref)/u,
  )
})
