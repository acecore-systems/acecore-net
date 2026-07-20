import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { afterEach, test } from 'node:test'

import {
  CMS_REPOSITORY,
  isAllowedCmsDirectoryPath,
  isAllowedCmsWritePath,
} from '../functions/admin/api/_cms-policy.ts'
import { clearGitHubEditorCacheForTests } from '../functions/admin/api/_github-oauth.ts'
import { onRequestPost as handleGraphql } from '../functions/admin/api/graphql.ts'
import { onRequest as handleGithubRest } from '../functions/admin/api/github/[[path]].ts'

const originalFetch = globalThis.fetch
const mainSha = 'a'.repeat(40)
const oauthToken = 'test-oauth-token'
const repositoryApi = `https://api.github.com/repos/${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}`
const branchPrefix =
  CMS_REPOSITORY.name === 'acecore-net' ? 'cms/acecore/' : 'cms/aceserver/'
const contentPath =
  CMS_REPOSITORY.name === 'acecore-net'
    ? 'src/content/blog/example.md'
    : 'src/content/pages/top.json'
const rejectedPath =
  CMS_REPOSITORY.name === 'acecore-net'
    ? 'src/i18n/translations/en.json'
    : 'src/content.config.ts'
const collectionWritePaths =
  CMS_REPOSITORY.name === 'acecore-net'
    ? [
        'src/content/blog/example.md',
        'src/content/authors/example.json',
        'src/content/tags/example.json',
        'src/i18n/source/ja/campaigns/example.json',
      ]
    : []
const unlistedContentPath =
  CMS_REPOSITORY.name === 'acecore-net'
    ? 'src/content/blog/en/example.md'
    : 'src/content/pages/unlisted.json'

const editor = {
  avatar_url: 'https://avatars.githubusercontent.com/u/1',
  email: null,
  html_url: 'https://github.com/editor',
  id: 1,
  login: 'editor',
  name: 'Editor',
  type: 'User',
}

afterEach(() => {
  globalThis.fetch = originalFetch
  clearGitHubEditorCacheForTests()
})

test('CMS対象pathだけを許可する', () => {
  assert.equal(isAllowedCmsWritePath(contentPath), true)
  for (const path of collectionWritePaths) {
    assert.equal(isAllowedCmsWritePath(path), true)
  }
  assert.equal(isAllowedCmsWritePath('public/uploads/example.png'), true)
  assert.equal(isAllowedCmsWritePath(rejectedPath), false)
  assert.equal(isAllowedCmsWritePath(unlistedContentPath), false)
  assert.equal(isAllowedCmsWritePath('README.md'), false)
  assert.equal(isAllowedCmsWritePath('../README.md'), false)
  assert.equal(isAllowedCmsWritePath(`${contentPath}\nREADME.md`), false)
})

test('CMS設定で公開したfolderとfileがproxyの許可範囲に収まる', async () => {
  const config = await readFile(
    new URL('../public/admin/config.yml', import.meta.url),
    'utf8',
  )
  const folders = Array.from(
    config.matchAll(/^\s*folder:\s*([^,\s]+),?\s*$/gm),
    (match) => match[1],
  )
  const files = Array.from(
    config.matchAll(/^\s*file:\s*([^,\s]+),?\s*$/gm),
    (match) => match[1],
  )

  if (CMS_REPOSITORY.name === 'acecore-net') {
    assert.ok(folders.length > 0)
  }
  assert.ok(files.length > 0)

  for (const path of folders) {
    assert.equal(isAllowedCmsDirectoryPath(path), true, path)
  }

  for (const path of files) {
    assert.equal(isAllowedCmsWritePath(path), true, path)
  }
})

test('GitHub OAuth認証がないrequestを拒否する', async () => {
  let called = false
  globalThis.fetch = async () => {
    called = true
    throw new Error('GitHub must not be called')
  }

  const response = await handleGraphql({
    request: graphqlRequest({ authorization: null }),
  })

  assert.equal(response.status, 401)
  assert.equal(called, false)
})

test('repositoryへのpush権限がないGitHub userを拒否する', async () => {
  mockGitHub(async () => {
    throw new Error('CMS operation must not continue')
  }, false)

  const response = await handleGraphql({
    request: graphqlRequest(),
  })

  assert.equal(response.status, 403)
  assert.match((await response.json()).message, /write権限/)
})

test('Sveltia CMS 0.166のlast-commit queryを許可する', async () => {
  mockGitHub(async (url, _init, body) => {
    assert.match(url, /\/graphql$/)
    assert.match(body.query, /ref\(qualifiedName: \$branch\)/)

    return jsonResponse({
      data: {
        repository: {
          ref: {
            target: {
              history: { nodes: [{ oid: mainSha, message: 'latest' }] },
            },
          },
        },
      },
    })
  })

  const response = await handleGraphql({
    request: graphqlReadRequest(
      `
        query($owner: String!, $repo: String!, $branch: String!) {
          repository(owner: $owner, name: $repo) {
            ref(qualifiedName: $branch) {
              target {
                ... on Commit {
                  history(first: 1) { nodes { oid message } }
                }
              }
            }
          }
        }
      `,
      {
        owner: CMS_REPOSITORY.owner,
        repo: CMS_REPOSITORY.name,
        branch: 'main',
      },
    ),
  })

  assert.equal(response.status, 200)
})

test('Sveltia CMS 0.166のcontent queryをCMS対象blobだけ許可する', async () => {
  const blobSha = 'b'.repeat(40)

  mockGitHub(async (url, _init, body) => {
    if (url.includes('/git/trees/main?recursive=1')) {
      return jsonResponse({
        sha: mainSha,
        truncated: false,
        tree: [
          {
            mode: '100644',
            path: contentPath,
            sha: blobSha,
            size: 12,
            type: 'blob',
          },
        ],
      })
    }

    assert.match(url, /\/graphql$/)
    assert.match(body.query, /content_0:\s*object/)
    assert.match(body.query, /commit_0:\s*ref/)

    return jsonResponse({ data: { repository: {} } })
  })

  const response = await handleGraphql({
    request: graphqlReadRequest(
      `
        query($owner: String!, $repo: String!, $branch: String!) {
          repository(owner: $owner, name: $repo) {
            content_0: object(oid: "${blobSha}") {
              ... on Blob { text }
            }
            commit_0: ref(qualifiedName: $branch) {
              target {
                ... on Commit {
                  history(first: 1, path: "${contentPath}") {
                    nodes {
                      author {
                        name
                        email
                        user { id: databaseId login }
                      }
                      committedDate
                    }
                  }
                }
              }
            }
          }
        }
      `,
      {
        owner: CMS_REPOSITORY.owner,
        repo: CMS_REPOSITORY.name,
        branch: 'main',
      },
    ),
  })

  assert.equal(response.status, 200)
})

test('画像と本文を同じ短期branchの1 commit・1 PRに保存する', async () => {
  const calls = []
  let cmsBranch = ''

  mockGitHub(async (url, init, body) => {
    calls.push({ url, init, body })

    if (url.endsWith('/git/ref/heads/main')) {
      return jsonResponse({ object: { sha: mainSha } })
    }

    if (url.endsWith('/git/refs')) {
      cmsBranch = body.ref.replace('refs/heads/', '')
      assert.match(cmsBranch, new RegExp(`^${branchPrefix}`))
      assert.equal(body.sha, mainSha)

      return jsonResponse({ ref: body.ref, object: { sha: mainSha } }, 201)
    }

    if (url.endsWith('/graphql')) {
      assert.match(body.query, /mutation CmsCommit/)
      assert.equal(
        body.variables.input.branch.repositoryNameWithOwner,
        `${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}`,
      )
      assert.equal(body.variables.input.branch.branchName, cmsBranch)
      assert.equal(body.variables.input.expectedHeadOid, mainSha)
      assert.deepEqual(
        body.variables.input.fileChanges.additions.map(({ path }) => path),
        ['public/uploads/example.png', contentPath],
      )

      return jsonResponse({
        data: {
          createCommitOnBranch: {
            commit: {
              oid: 'b'.repeat(40),
              committedDate: '2026-07-20T00:00:00Z',
              file_0: { oid: 'c'.repeat(40) },
              file_1: { oid: 'd'.repeat(40) },
            },
          },
        },
      })
    }

    if (url.endsWith('/pulls')) {
      assert.equal(body.head, cmsBranch)
      assert.equal(body.base, 'main')
      assert.match(body.body, /GitHub user: @editor/)
      assert.match(body.body, new RegExp(contentPath.replaceAll('/', '\\/')))

      return jsonResponse(
        { number: 91, html_url: 'https://github.com/example/pull/91' },
        201,
      )
    }

    throw new Error(`Unexpected GitHub request: ${url}`)
  })

  const response = await handleGraphql({
    request: graphqlRequest({
      variables: {
        input: {
          branch: {
            repositoryNameWithOwner: `${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}`,
            branchName: 'main',
          },
          expectedHeadOid: mainSha,
          fileChanges: {
            additions: [
              {
                path: 'public/uploads/example.png',
                contents: Buffer.from('image').toString('base64'),
              },
              {
                path: contentPath,
                contents: Buffer.from('content').toString('base64'),
              },
            ],
            deletions: [],
          },
          message: { headline: 'cms: update example' },
        },
      },
    }),
  })
  const result = await response.json()

  assert.equal(response.status, 200)
  assert.equal(result.extensions.cms.branch, cmsBranch)
  assert.equal(result.extensions.cms.pull_request.number, 91)
  assert.equal(calls.length, 4)
})

test('CMS管理対象外の保存をGitHubへ送らない', async () => {
  let cmsOperationCalled = false

  mockGitHub(async () => {
    cmsOperationCalled = true
    throw new Error('CMS operation must not continue')
  })

  const response = await handleGraphql({
    request: graphqlRequest({
      variables: {
        input: {
          branch: {
            repositoryNameWithOwner: `${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}`,
            branchName: 'main',
          },
          expectedHeadOid: mainSha,
          fileChanges: {
            additions: [
              {
                path: 'README.md',
                contents: Buffer.from('blocked').toString('base64'),
              },
            ],
            deletions: [],
          },
          message: { headline: 'cms: update blocked' },
        },
      },
    }),
  })

  assert.equal(response.status, 403)
  assert.equal(cmsOperationCalled, false)
})

test('main以外を指定した保存を拒否する', async () => {
  let cmsOperationCalled = false

  mockGitHub(async () => {
    cmsOperationCalled = true
    throw new Error('CMS operation must not continue')
  })

  const response = await handleGraphql({
    request: graphqlRequest({
      variables: {
        input: {
          branch: {
            repositoryNameWithOwner: `${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}`,
            branchName: 'preview',
          },
          expectedHeadOid: mainSha,
          fileChanges: {
            additions: [
              {
                path: contentPath,
                contents: Buffer.from('blocked').toString('base64'),
              },
            ],
            deletions: [],
          },
          message: { headline: 'cms: update blocked' },
        },
      },
    }),
  })

  assert.equal(response.status, 403)
  assert.equal(cmsOperationCalled, false)
})

test('Git tree responseからCMS対象外pathを除外する', async () => {
  mockGitHub(async (url) => {
    assert.match(url, /\/git\/trees\/main\?recursive=1$/)

    return jsonResponse({
      sha: mainSha,
      truncated: false,
      tree: [
        { mode: '040000', path: 'src', sha: '1'.repeat(40), type: 'tree' },
        {
          mode: '100644',
          path: contentPath,
          sha: '2'.repeat(40),
          size: 12,
          type: 'blob',
        },
        {
          mode: '100644',
          path: 'README.md',
          sha: '3'.repeat(40),
          size: 12,
          type: 'blob',
        },
      ],
    })
  })

  const response = await handleGithubRest({
    request: new Request(
      `https://example.com/admin/api/github/api/v3/repos/${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}/git/trees/main?recursive=1`,
      { headers: authorizationHeaders() },
    ),
  })
  const result = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(
    result.tree.filter(({ type }) => type === 'blob').map(({ path }) => path),
    [contentPath],
  )
})

test('REST writeを認証前に拒否する', async () => {
  let called = false
  globalThis.fetch = async () => {
    called = true
    throw new Error('GitHub must not be called')
  }

  const response = await handleGithubRest({
    request: new Request('https://example.com/admin/api/github/user', {
      method: 'POST',
      headers: authorizationHeaders(),
    }),
  })

  assert.equal(response.status, 405)
  assert.equal(called, false)
})

function mockGitHub(handler, push = true) {
  globalThis.fetch = async (input, init = {}) => {
    const url = String(input)
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : null

    if (url === 'https://api.github.com/user') {
      assert.equal(
        new Headers(init.headers).get('Authorization'),
        `Bearer ${oauthToken}`,
      )
      return jsonResponse(editor)
    }

    if (url === repositoryApi) {
      return jsonResponse({ permissions: { push } })
    }

    return handler(url, init, body)
  }
}

function graphqlRequest({
  authorization = `Bearer ${oauthToken}`,
  variables = {
    input: {
      branch: {
        repositoryNameWithOwner: `${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}`,
        branchName: 'main',
      },
      expectedHeadOid: mainSha,
      fileChanges: {
        additions: [
          {
            path: contentPath,
            contents: Buffer.from('content').toString('base64'),
          },
        ],
        deletions: [],
      },
      message: { headline: 'cms: update example' },
    },
  },
} = {}) {
  const headers = new Headers({ 'Content-Type': 'application/json' })

  if (authorization) headers.set('Authorization', authorization)

  return new Request('https://example.com/admin/api/graphql', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query: `
        mutation($input: CreateCommitOnBranchInput!) {
          createCommitOnBranch(input: $input) {
            commit { oid committedDate }
          }
        }
      `,
      variables,
    }),
  })
}

function authorizationHeaders() {
  return { Authorization: `Bearer ${oauthToken}` }
}

function graphqlReadRequest(query, variables) {
  return new Request('https://example.com/admin/api/graphql', {
    method: 'POST',
    headers: {
      ...authorizationHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
