import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import {
  hasSuccessfulTranslationBuild,
  isEligibleTranslationPullRequest,
  markPullRequestReadyForReview,
  mergePullRequest,
  parseArguments,
  parsePullRequest,
  type GitHubClient,
  type RepositoryInfo,
  type TranslationPullRequest,
} from '../scripts/merge-translation-pr.ts'

const REPOSITORY: RepositoryInfo = {
  owner: 'acecore-systems',
  repo: 'acecore-net',
  repository: 'acecore-systems/acecore-net',
}
const HEAD_SHA = 'a'.repeat(40)
const MERGE_SHA = 'b'.repeat(40)

function createPullRequest(
  overrides: Partial<TranslationPullRequest> = {},
): TranslationPullRequest {
  return {
    number: 176,
    state: 'open',
    baseRef: 'main',
    authorLogin: 'app/copilot-swe-agent',
    headRef: 'copilot/update-translations',
    headSha: HEAD_SHA,
    headRepositoryFullName: REPOSITORY.repository,
    title: '[translation] Update site text translations',
    draft: true,
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
  assert.deepEqual(parseArguments(['--pr=176', '--skip-build-check']), {
    prNumber: 176,
    skipBuildCheck: true,
  })
  assert.throws(
    () => parseArguments(['--pr=0']),
    /positive pull request number/,
  )
  assert.throws(
    () => parseArguments(['--pr=1', '--pr=2']),
    /only be provided once/,
  )
  assert.throws(() => parseArguments(['--unexpected']), /Unknown argument/)
})

test('対象外のPRは翻訳自動マージ対象にしない', () => {
  assert.equal(isEligibleTranslationPullRequest(createPullRequest()), true)
  assert.equal(
    isEligibleTranslationPullRequest(
      createPullRequest({ authorLogin: 'octocat', headRef: 'feature/update' }),
    ),
    false,
  )
  assert.equal(
    isEligibleTranslationPullRequest(createPullRequest({ baseRef: 'develop' })),
    false,
  )
  assert.equal(
    isEligibleTranslationPullRequest(
      createPullRequest({ title: 'Update site text translations' }),
    ),
    false,
  )
})

test('GitHub API応答の必須PR head SHAを検証する', () => {
  assert.throws(
    () =>
      parsePullRequest({
        number: 176,
        state: 'open',
        base: { ref: 'main' },
        head: { ref: 'copilot/update-translations', sha: 'not-a-full-sha' },
        user: { login: 'app/copilot-swe-agent' },
        title: '[translation] Update site text translations',
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

test('検証済みhead SHAをmerge APIへ固定してから同一repo枝だけを削除する', async () => {
  const requests: Array<{ path: string; options?: unknown }> = []
  const client: GitHubClient = {
    async request(path, options) {
      requests.push({ path, options })
      if (options?.method === 'PUT') {
        return {
          merged: true,
          sha: MERGE_SHA,
          message: 'Pull Request successfully merged',
        }
      }
      if (options?.method === 'DELETE') return null
      throw new Error(`Unexpected request: ${path}`)
    },
    async graphql() {
      throw new Error('GraphQL must not be called while merging a ready PR.')
    },
  }
  const { logger } = createLogger()

  assert.equal(
    await mergePullRequest(createPullRequest(), {
      client,
      logger,
      repository: REPOSITORY,
    }),
    true,
  )

  assert.deepEqual(requests, [
    {
      path: '/repos/acecore-systems/acecore-net/pulls/176/merge',
      options: {
        method: 'PUT',
        body: {
          merge_method: 'squash',
          commit_title: '[translation] Update site text translations',
          sha: HEAD_SHA,
        },
      },
    },
    {
      path: '/repos/acecore-systems/acecore-net/git/refs/heads/copilot/update-translations',
      options: { method: 'DELETE' },
    },
  ])
})

test('GitHubがmerged: trueを返さなければ枝を削除しない', async () => {
  const requests: Array<{ path: string; options?: unknown }> = []
  const client: GitHubClient = {
    async request(path, options) {
      requests.push({ path, options })
      return {
        merged: false,
        sha: null,
        message: 'Pull Request is not mergeable',
      }
    },
    async graphql() {
      throw new Error('GraphQL must not be called while merging a ready PR.')
    },
  }
  const { logger, warnings } = createLogger()

  assert.equal(
    await mergePullRequest(createPullRequest({ draft: false }), {
      client,
      logger,
      repository: REPOSITORY,
    }),
    false,
  )
  assert.equal(requests.length, 1)
  assert.match(warnings[0] ?? '', /did not merge/)
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
            number: 176,
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

test('workflow入力は環境変数で渡し、TypeScriptの型チェック後に実行する', async () => {
  const workflow = await readFile(
    '.github/workflows/merge-translation-pr.yml',
    'utf8',
  )

  assert.match(workflow, /PR_NUMBER: \$\{\{ inputs\.pr_number \}\}/u)
  assert.doesNotMatch(workflow, /pr_number="\$\{\{ inputs\.pr_number \}\}"/u)
  assert.match(workflow, /checks:\s+read/u)
  assert.match(workflow, /npm run typecheck:translation-merge/u)
  assert.match(
    workflow,
    /node --experimental-strip-types scripts\/merge-translation-pr\.ts --pr="\$PR_NUMBER"/u,
  )
})
