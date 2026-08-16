import assert from 'node:assert/strict'
import { createHash, createPrivateKey } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { exportPKCS8, generateKeyPair, jwtVerify } from 'jose'

import {
  clearGitHubAppTokenCacheForTests,
  fetchCmsReferenceState,
  getGitHubAppToken,
} from '../functions/admin/api/_github-api.ts'
import { MAX_CMS_TEXT_CONTENT_BYTES } from '../functions/admin/api/_cms-limits.ts'
import {
  CMS_REPOSITORY,
  isAllowedCmsDeletePath,
  isAllowedCmsDirectoryPath,
  isAllowedCmsWritePath,
  isCmsReferenceStatePath,
  isCmsReferenceTextPath,
} from '../functions/admin/api/_cms-policy.ts'
import {
  matchesJsonTemplate,
  validateCmsAdditionContents,
} from '../functions/admin/api/_cms-content-validator.ts'
import { validateCmsBlogFreshness } from '../functions/admin/api/_cms-blog-freshness-validator.ts'
import { validateProjectedCmsReferences } from '../functions/admin/api/_cms-reference-validator.ts'
import { clearGitHubEditorCacheForTests } from '../functions/admin/api/_github-oauth.ts'
import { onRequestPost as handleGraphql } from '../functions/admin/api/graphql.ts'
import { onRequest as handleGithubRest } from '../functions/admin/api/github/[[path]].ts'

const originalFetch = globalThis.fetch
const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))
const mainSha = 'a'.repeat(40)
const oauthToken = 'test-oauth-token'
const appToken = 'test-installation-token'
const appClientId = 'Iv23acecorecms'
const appInstallationId = '12345678'
const { privateKey: appPrivateKey, publicKey: appPublicKey } =
  await generateKeyPair('RS256', { extractable: true })
const appPrivateKeyPem = await exportPKCS8(appPrivateKey)
const githubDownloadedPrivateKeyPem = createPrivateKey(appPrivateKeyPem)
  .export({ format: 'pem', type: 'pkcs1' })
  .toString()
const appEnv = {
  CMS_GITHUB_APP_CLIENT_ID: appClientId,
  CMS_GITHUB_APP_INSTALLATION_ID: appInstallationId,
  CMS_GITHUB_APP_PRIVATE_KEY: githubDownloadedPrivateKeyPem,
}
const defaultArticleId = '11111111-1111-4111-8111-111111111111'
const repositoryApi = `https://api.github.com/repos/${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}`
const contentPath =
  CMS_REPOSITORY.name === 'acecore-net'
    ? 'src/content/blog/example.md'
    : 'src/content/pages/top.json'
const validBlogMarkdown = `---
title: CMS test
description: CMS proxy test content
articleId: ${defaultArticleId}
date: 2026-07-28T12:00
author: gui
---

Valid content.
`
const obfuscatedActiveUrls = [
  'java&#x73;cript&#x3a;alert(1)',
  'java&#x09;script:alert(1)',
  'java&#13;script:alert(1)',
  'java&#10;script:alert(1)',
  'java&#x01;script:alert(1)',
  'java&Tab;script:alert(1)',
  'java&NewLine;script:alert(1)',
]
const validContent =
  CMS_REPOSITORY.name === 'acecore-net'
    ? validBlogMarkdown
    : JSON.stringify({ title: 'CMS test' })
const defaultReferenceFiles = new Map([
  ['src/content/authors/gui.json', JSON.stringify({ id: 'gui', name: 'Gui' })],
])
const validPng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const installationTokenScope = {
  permissions: {
    contents: 'write',
    metadata: 'read',
  },
  repositories: [
    {
      name: CMS_REPOSITORY.name,
      full_name: `${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}`,
    },
  ],
}
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
  clearGitHubAppTokenCacheForTests()
  clearGitHubEditorCacheForTests()
})

test('CMS対象pathだけを許可する', () => {
  assert.equal(isAllowedCmsWritePath(contentPath), true)
  for (const path of collectionWritePaths) {
    assert.equal(isAllowedCmsWritePath(path), true)
  }
  assert.equal(isAllowedCmsWritePath('public/uploads/example.png'), true)
  assert.equal(isAllowedCmsWritePath('public/uploads/example.svg'), false)
  assert.equal(isAllowedCmsWritePath(rejectedPath), false)
  assert.equal(isAllowedCmsWritePath(unlistedContentPath), false)
  assert.equal(isAllowedCmsWritePath('README.md'), false)
  assert.equal(isAllowedCmsWritePath('../README.md'), false)
  assert.equal(isAllowedCmsWritePath(`${contentPath}\nREADME.md`), false)
})

test('CMSから削除できるのは記事とキャンペーンだけ', () => {
  assert.equal(isAllowedCmsDeletePath('src/content/blog/example.md'), true)
  assert.equal(
    isAllowedCmsDeletePath('src/i18n/source/ja/campaigns/example.json'),
    true,
  )
  assert.equal(
    isAllowedCmsDeletePath('src/content/authors/example.json'),
    false,
  )
  assert.equal(isAllowedCmsDeletePath('src/content/tags/example.json'), false)
  assert.equal(isAllowedCmsDeletePath('public/uploads/example.png'), false)
  assert.equal(isAllowedCmsDeletePath('src/i18n/source/ja/common.json'), false)
  assert.equal(isAllowedCmsDeletePath('src/content/blog/en/example.md'), false)
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

test('CMS記事フォームはlastUpdatedを初期入力し、必須項目として扱う', async () => {
  const config = await readFile(
    new URL('../public/admin/config.yml', import.meta.url),
    'utf8',
  )
  const blogCollection = config.match(
    /^  - name: blog[\s\S]*?(?=\n  - name:)/m,
  )?.[0]

  assert.match(
    blogCollection ?? '',
    /name: lastUpdated[\s\S]*?widget: datetime[\s\S]*?default: '\{\{now\}\}'[\s\S]*?required: true/,
  )
})

test('現在のCMS管理対象ファイルが保存前の実体検証を通る', async () => {
  const directories = [
    'src/content/blog',
    'src/content/authors',
    'src/content/tags',
    'src/i18n/source/ja/campaigns',
    'public/uploads',
  ]
  const paths = []

  for (const directory of directories) {
    for (const relativePath of await listFilesRecursively(directory)) {
      if (isAllowedCmsWritePath(relativePath)) paths.push(relativePath)
    }
  }

  const config = await readFile(
    path.join(repositoryRoot, 'public/admin/config.yml'),
    'utf8',
  )

  for (const match of config.matchAll(/^\s*file:\s*([^,\s]+),?\s*$/gm)) {
    if (isAllowedCmsWritePath(match[1])) paths.push(match[1])
  }

  for (const relativePath of new Set(paths)) {
    const contents = await readFile(path.join(repositoryRoot, relativePath))

    assert.doesNotThrow(
      () =>
        validateCmsAdditionContents([
          {
            path: relativePath,
            contents: contents.toString('base64'),
            byteSize: contents.byteLength,
          },
        ]),
      relativePath,
    )
  }
})

test('CMSテキストは448 KiBまで保存でき、1 byte超過を拒否する', () => {
  const value = Buffer.from(
    JSON.stringify({
      id: 'text-boundary',
      type: 'announcement',
      adminTitle: 'Boundary',
      enabled: false,
      tone: 'brand',
    }),
  )
  const exactLimit = Buffer.concat([
    value,
    Buffer.alloc(MAX_CMS_TEXT_CONTENT_BYTES - value.byteLength, 0x20),
  ])
  const path = 'src/i18n/source/ja/campaigns/text-boundary.json'

  assert.doesNotThrow(() =>
    validateCmsAdditionContents([
      {
        path,
        contents: exactLimit.toString('base64'),
        byteSize: exactLimit.byteLength,
      },
    ]),
  )
  assert.throws(
    () =>
      validateCmsAdditionContents([
        {
          path,
          contents: Buffer.concat([exactLimit, Buffer.from(' ')]).toString(
            'base64',
          ),
          byteSize: exactLimit.byteLength + 1,
        },
      ]),
    /CMS保存内容が不正/,
  )
})

test('現在のmainに448 KiBを超えるCMSテキストがあれば保存を停止する', async () => {
  const path = 'src/content/authors/oversized.json'
  let calls = 0

  globalThis.fetch = async (input, init = {}) => {
    calls += 1
    assert.equal(
      String(input),
      `${repositoryApi}/git/trees/${mainSha}?recursive=1`,
    )
    assert.equal(
      new Headers(init.headers).get('Authorization'),
      `Bearer ${appToken}`,
    )

    return jsonResponse({
      sha: mainSha,
      truncated: false,
      tree: [
        {
          mode: '100644',
          path,
          sha: 'f'.repeat(40),
          size: MAX_CMS_TEXT_CONTENT_BYTES + 1,
          type: 'blob',
        },
      ],
    })
  }

  await assert.rejects(
    fetchCmsReferenceState(appToken, mainSha),
    (error) =>
      error?.status === 503 &&
      error.message ===
        `CMS参照元のテキストファイルが448 KiBを超えています: ${path}`,
  )
  assert.equal(calls, 1)
})

test('現在の全言語記事と著者・タグ・画像の参照が整合する', async () => {
  const currentState = []

  for (const directory of [
    'src/content/blog',
    'src/content/authors',
    'src/content/tags',
    'public/uploads',
  ]) {
    for (const relativePath of await listFilesRecursively(directory)) {
      if (!isCmsReferenceStatePath(relativePath)) continue

      const contents = isCmsReferenceTextPath(relativePath)
        ? await readFile(path.join(repositoryRoot, relativePath), 'utf8')
        : undefined

      if (contents !== undefined) {
        assert.ok(
          Buffer.byteLength(contents) <= MAX_CMS_TEXT_CONTENT_BYTES,
          relativePath,
        )
      }

      currentState.push({
        path: relativePath,
        ...(contents === undefined ? {} : { contents }),
      })
    }
  }

  assert.doesNotThrow(() =>
    validateProjectedCmsReferences({
      additions: [],
      currentState,
      deletions: [],
    }),
  )
})

test('同一mutationで追加した著者・タグ・画像を新しい記事から参照できる', () => {
  const additions = [
    referenceAddition(
      'src/content/authors/new-author.json',
      JSON.stringify({ id: 'new-author', name: 'New Author' }),
    ),
    referenceAddition(
      'src/content/tags/new-tag.json',
      JSON.stringify({ id: 'new-tag', name: '新しいタグ' }),
    ),
    referenceAddition('public/uploads/new-image.png', validPng),
    referenceAddition(
      'src/content/blog/new-article.md',
      referenceBlogMarkdown({
        author: 'new-author',
        tags: ['新しいタグ'],
        uploadedImage: '/uploads/new-image.png',
      }),
    ),
  ]

  assert.doesNotThrow(() =>
    validateProjectedCmsReferences({
      additions,
      currentState: [],
      deletions: [],
    }),
  )
})

test('新規記事はlastUpdatedなしで保存できる', () => {
  assert.doesNotThrow(() =>
    validateCmsBlogFreshness({
      additions: [
        referenceAddition(
          'src/content/blog/new-article.md',
          freshnessBlogMarkdown({ body: 'New article.' }),
        ),
      ],
      currentState: [],
    }),
  )
})

test('既存記事の実質変更ではlastUpdatedの追加または前進を要求する', () => {
  const path = 'src/content/blog/existing.md'
  const baseWithoutUpdated = freshnessBlogMarkdown()

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [
          referenceAddition(
            path,
            freshnessBlogMarkdown({ body: 'Revised body.' }),
          ),
        ],
        currentState: [{ path, contents: baseWithoutUpdated }],
      }),
    /内容を変更する場合はlastUpdatedを設定/,
  )

  assert.doesNotThrow(() =>
    validateCmsBlogFreshness({
      additions: [
        referenceAddition(
          path,
          freshnessBlogMarkdown({
            body: 'Revised body.',
            lastUpdated: '2026-07-29T12:00',
          }),
        ),
      ],
      currentState: [{ path, contents: baseWithoutUpdated }],
    }),
  )

  const baseWithUpdated = freshnessBlogMarkdown({
    lastUpdated: '2026-07-29T12:00',
  })

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [
          referenceAddition(
            path,
            freshnessBlogMarkdown({
              body: 'Revised body.',
              lastUpdated: '2026-07-29T12:00',
            }),
          ),
        ],
        currentState: [{ path, contents: baseWithUpdated }],
      }),
    /lastUpdatedは以前より後の日時/,
  )

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [
          referenceAddition(
            path,
            baseWithUpdated.replace(
              'title: Freshness test',
              'title: Updated freshness test',
            ),
          ),
        ],
        currentState: [{ path, contents: baseWithUpdated }],
      }),
    /lastUpdatedは以前より後の日時/,
  )

  assert.doesNotThrow(() =>
    validateCmsBlogFreshness({
      additions: [
        referenceAddition(
          path,
          freshnessBlogMarkdown({
            body: 'Revised body.',
            lastUpdated: '2026-07-30T12:00',
          }),
        ),
      ],
      currentState: [{ path, contents: baseWithUpdated }],
    }),
  )
})

test('lastUpdated自身の前進と意味を変えない書式差だけなら許可する', () => {
  const path = 'src/content/blog/existing.md'
  const base = freshnessBlogMarkdown({
    lastUpdated: '2026-07-29T12:00',
  })
  const reformatted = freshnessBlogMarkdown({
    lastUpdated: '2026-07-30T12:00',
  })
    .replace('title: Freshness test', 'title:   Freshness test')
    .replace(/\n/g, '\r\n')

  assert.doesNotThrow(() =>
    validateCmsBlogFreshness({
      additions: [referenceAddition(path, reformatted)],
      currentState: [{ path, contents: base }],
    }),
  )
})

test('同一articleIdの記事名変更は同一保存なら許可し、lastUpdated更新を必須にする', () => {
  const basePath = 'src/content/blog/old-slug.md'
  const headPath = 'src/content/blog/new-slug.md'

  assert.throws(
    () =>
      validateCmsBlogFreshness({
        additions: [
          referenceAddition(
            headPath,
            freshnessBlogMarkdown({ body: 'Rewritten body.' }),
          ),
        ],
        currentState: [{ path: basePath, contents: freshnessBlogMarkdown() }],
        deletions: [{ path: basePath }],
      }),
    /lastUpdatedを設定/,
  )

  assert.doesNotThrow(() =>
    validateCmsBlogFreshness({
      additions: [
        referenceAddition(
          headPath,
          freshnessBlogMarkdown({
            body: 'Rewritten body.',
            lastUpdated: '2026-07-30T12:00',
          }),
        ),
      ],
      currentState: [{ path: basePath, contents: freshnessBlogMarkdown() }],
      deletions: [{ path: basePath }],
    }),
  )
})

test('タグ名と全参照記事を同一mutationで変更した投影stateだけを許可する', () => {
  const currentState = referenceFixture({
    includeTranslatedArticle: false,
    tagName: '旧タグ',
  })
  const additions = [
    referenceAddition(
      'src/content/tags/topic.json',
      JSON.stringify({ id: 'topic', name: '新タグ' }),
    ),
    referenceAddition(
      'src/content/blog/example.md',
      referenceBlogMarkdown({
        image: '/uploads/example.png',
        tags: ['新タグ'],
      }),
    ),
  ]

  assert.doesNotThrow(() =>
    validateProjectedCmsReferences({
      additions,
      currentState,
      deletions: [],
    }),
  )

  assert.throws(
    () =>
      validateProjectedCmsReferences({
        additions,
        currentState: referenceFixture({
          includeTranslatedArticle: true,
          tagName: '旧タグ',
        }),
        deletions: [],
      }),
    /記事のタグが存在しません.*en\/example\.md.*旧タグ/,
  )
})

test('参照中targetの削除を拒否し、参照記事も同時に除く投影stateは整合する', () => {
  const currentState = referenceFixture({
    includeTranslatedArticle: true,
    tagName: '技術',
  })

  for (const path of [
    'src/content/authors/gui.json',
    'src/content/tags/topic.json',
    'public/uploads/example.png',
  ]) {
    assert.throws(
      () =>
        validateProjectedCmsReferences({
          additions: [],
          currentState,
          deletions: [{ path }],
        }),
      /存在しません/,
      path,
    )
  }

  assert.doesNotThrow(() =>
    validateProjectedCmsReferences({
      additions: [],
      currentState,
      deletions: [
        { path: 'src/content/blog/example.md' },
        { path: 'src/content/blog/en/example.md' },
        { path: 'src/content/authors/gui.json' },
        { path: 'src/content/tags/topic.json' },
        { path: 'public/uploads/example.png' },
      ],
    }),
  )
})

test('記事の不存在author・tag・uploadedImage参照を拒否する', () => {
  const currentState = referenceFixture({
    includeTranslatedArticle: false,
    tagName: '技術',
  }).filter(({ path }) => !path.startsWith('src/content/blog/'))
  const invalidArticles = [
    {
      expected: /記事の著者が存在しません/,
      source: referenceBlogMarkdown({ author: 'missing-author' }),
    },
    {
      expected: /記事のタグが存在しません/,
      source: referenceBlogMarkdown({ tags: ['不存在タグ'] }),
    },
    {
      expected: /記事または著者の画像が存在しません/,
      source: referenceBlogMarkdown({
        uploadedImage: '/uploads/missing.png',
      }),
    },
    {
      expected: /記事または著者の画像が存在しません/,
      source: referenceBlogMarkdown({
        galleryImage: '/uploads/missing-gallery.png',
      }),
    },
  ]

  for (const { expected, source } of invalidArticles) {
    assert.throws(
      () =>
        validateProjectedCmsReferences({
          additions: [referenceAddition('src/content/blog/invalid.md', source)],
          currentState,
          deletions: [],
        }),
      expected,
    )
  }

  assert.throws(
    () =>
      validateProjectedCmsReferences({
        additions: [
          referenceAddition(
            'src/content/authors/gui.json',
            JSON.stringify({
              id: 'gui',
              name: 'Gui',
              avatarImage: '/uploads/missing-avatar.png',
            }),
          ),
        ],
        currentState,
        deletions: [],
      }),
    /記事または著者の画像が存在しません/,
  )
})

test('fixed JSONの配列は先頭要素だけでなく許可済みshapeのunionで検証する', () => {
  const template = [
    { type: 'link', href: '/about/' },
    { type: 'note', text: 'お知らせ', enabled: true },
  ]

  assert.equal(
    matchesJsonTemplate(
      [
        { type: 'note', text: '更新しました', enabled: false },
        { type: 'link', href: '/contact/' },
      ],
      template,
    ),
    true,
  )
  assert.equal(
    matchesJsonTemplate([{ type: 'script', source: '<script />' }], template),
    false,
  )
})

test('GitHub配布形式の秘密鍵からrepository限定installation tokenを発行する', async () => {
  globalThis.fetch = async (input, init = {}) => {
    assert.equal(
      String(input),
      `https://api.github.com/app/installations/${appInstallationId}/access_tokens`,
    )
    assert.equal(init.method, 'POST')

    const authorization = new Headers(init.headers).get('Authorization') || ''
    const { payload } = await jwtVerify(
      authorization.replace(/^Bearer /, ''),
      appPublicKey,
      {
        algorithms: ['RS256'],
        issuer: appClientId,
      },
    )
    const body = JSON.parse(init.body)

    assert.ok((payload.exp ?? 0) - (payload.iat ?? 0) <= 10 * 60)
    assert.deepEqual(body, {
      repositories: [CMS_REPOSITORY.name],
      permissions: {
        contents: 'write',
      },
    })

    return jsonResponse({
      token: appToken,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      ...installationTokenScope,
    })
  }

  assert.equal(await getGitHubAppToken(appEnv), appToken)
})

test('mutationではcached tokenを使わずlive installation scopeを再確認する', async () => {
  let tokenRequests = 0

  mockGitHub(
    async (url, _init, body) => {
      if (url.endsWith('/git/ref/heads/main')) {
        return jsonResponse({ object: { sha: mainSha } })
      }

      if (url.endsWith('/graphql')) {
        return jsonResponse({
          data: {
            createCommitOnBranch: {
              commit: {
                oid: 'b'.repeat(40),
                committedDate: '2026-07-28T00:00:00Z',
              },
            },
          },
        })
      }

      throw new Error(`Unexpected GitHub request: ${url} ${body}`)
    },
    true,
    () => {
      tokenRequests += 1
    },
  )

  await getGitHubAppToken(appEnv)
  const response = await handleGraphql({
    env: appEnv,
    request: graphqlRequest(),
  })

  assert.equal(response.status, 200)
  assert.equal(tokenRequests, 2)
})

test('installation tokenの応答scopeが広い場合は拒否する', async () => {
  globalThis.fetch = async () =>
    jsonResponse({
      token: appToken,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      permissions: {
        contents: 'write',
        metadata: 'read',
        pull_requests: 'write',
      },
      repositories: installationTokenScope.repositories,
    })

  await assert.rejects(
    () => getGitHubAppToken(appEnv, { forceRefresh: true }),
    /installation tokenを発行できません/,
  )
})

test('GitHub OAuth認証がないrequestを拒否する', async () => {
  let called = false
  globalThis.fetch = async () => {
    called = true
    throw new Error('GitHub must not be called')
  }

  const response = await handleGraphql({
    env: appEnv,
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
    env: appEnv,
    request: graphqlRequest(),
  })

  assert.equal(response.status, 403)
  assert.match((await response.json()).message, /write権限/)
})

test('専用GitHub App設定がなければOAuth tokenで保存を代行しない', async () => {
  let cmsOperationCalled = false

  mockGitHub(async () => {
    cmsOperationCalled = true
    throw new Error('CMS operation must not continue')
  })

  const response = await handleGraphql({
    env: {},
    request: graphqlRequest(),
  })
  const result = await response.json()

  assert.equal(response.status, 503)
  assert.match(result.message, /GitHub App/)
  assert.equal(cmsOperationCalled, false)
})

test('mutation直前はcached OAuth認可を使わずpush権限を再確認する', async () => {
  let repositoryReads = 0
  let mutationCalled = false

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input)

    if (url === 'https://api.github.com/user') return jsonResponse(editor)

    if (url === repositoryApi) {
      repositoryReads += 1
      return jsonResponse({
        permissions: { push: repositoryReads === 1 },
      })
    }

    if (
      url ===
      `https://api.github.com/app/installations/${appInstallationId}/access_tokens`
    ) {
      return jsonResponse({
        token: appToken,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        ...installationTokenScope,
      })
    }

    if (url.endsWith('/graphql')) {
      const body = JSON.parse(init.body)

      if (/mutation CmsCommit/.test(body.query)) mutationCalled = true

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
    }

    throw new Error(`Unexpected GitHub request: ${url}`)
  }

  const readResponse = await handleGraphql({
    env: appEnv,
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

  assert.equal(readResponse.status, 200)

  const mutationResponse = await handleGraphql({
    env: appEnv,
    request: graphqlRequest(),
  })

  assert.equal(mutationResponse.status, 403)
  assert.equal(repositoryReads, 2)
  assert.equal(mutationCalled, false)
})

test('Sveltia CMS 0.191のlast-commit queryを許可する', async () => {
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
    env: appEnv,
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

test('Sveltia CMS 0.191のcontent queryをCMS対象blobだけ許可する', async () => {
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
    env: appEnv,
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

test('画像と本文をexpected HEAD付きの1 commitでmainへ直接保存する', async () => {
  const calls = []

  mockGitHub(async (url, init, body) => {
    calls.push({ url, init, body })

    if (url.endsWith('/git/ref/heads/main')) {
      return jsonResponse({ object: { sha: mainSha } })
    }

    if (url.endsWith('/graphql')) {
      assert.match(body.query, /mutation CmsCommit/)
      assert.equal(
        body.variables.input.branch.repositoryNameWithOwner,
        `${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}`,
      )
      assert.equal(body.variables.input.branch.branchName, 'main')
      assert.equal(body.variables.input.expectedHeadOid, mainSha)
      assert.equal(
        body.variables.input.message.headline,
        'cms: update public/uploads/example.png (+1)',
      )
      assert.match(
        body.variables.input.message.body,
        /^GitHub editor: @editor\nCMS request: [0-9a-f-]{36}$/,
      )
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

    throw new Error(`Unexpected GitHub request: ${url}`)
  })

  const response = await handleGraphql({
    env: appEnv,
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
                contents: validPng.toString('base64'),
              },
              {
                path: contentPath,
                contents: Buffer.from(validContent).toString('base64'),
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
  assert.equal(result.extensions.cms.branch, 'main')
  assert.equal(result.extensions.cms.publication, 'direct')
  assert.equal(calls.length, 2)
})

test('同一mutationで追加した参照先と記事をmainへ直接保存する', async () => {
  let commitCalled = false
  const additions = [
    referenceAddition(
      'src/content/authors/new-author.json',
      JSON.stringify({ id: 'new-author', name: 'New Author' }),
    ),
    referenceAddition(
      'src/content/tags/new-tag.json',
      JSON.stringify({ id: 'new-tag', name: '新しいタグ' }),
    ),
    referenceAddition('public/uploads/new-image.png', validPng),
    referenceAddition(
      'src/content/blog/new-article.md',
      referenceBlogMarkdown({
        author: 'new-author',
        tags: ['新しいタグ'],
        uploadedImage: '/uploads/new-image.png',
      }),
    ),
  ].map(({ path, contents }) => ({ path, contents }))

  mockGitHub(async (url, _init, body) => {
    if (url.endsWith('/git/ref/heads/main')) {
      return jsonResponse({ object: { sha: mainSha } })
    }

    if (url.endsWith('/graphql')) {
      commitCalled = true
      assert.deepEqual(body.variables.input.fileChanges.additions, additions)

      return jsonResponse({
        data: {
          createCommitOnBranch: {
            commit: {
              oid: 'b'.repeat(40),
              committedDate: '2026-07-29T00:00:00Z',
            },
          },
        },
      })
    }

    throw new Error(`Unexpected GitHub request: ${url}`)
  })

  const response = await handleGraphql({
    env: appEnv,
    request: graphqlRequest({
      variables: {
        input: {
          branch: {
            repositoryNameWithOwner: `${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}`,
            branchName: 'main',
          },
          expectedHeadOid: mainSha,
          fileChanges: { additions, deletions: [] },
          message: { headline: 'cms: create referenced article' },
        },
      },
    }),
  })

  assert.equal(response.status, 200)
  assert.equal(commitCalled, true)
})

test('不存在参照を含む記事はcommit前に422で拒否する', async () => {
  let commitCalled = false
  const invalidArticle = referenceAddition(
    'src/content/blog/invalid-reference.md',
    referenceBlogMarkdown({ author: 'missing-author' }),
  )

  mockGitHub(async (url) => {
    if (url.endsWith('/git/ref/heads/main')) {
      return jsonResponse({ object: { sha: mainSha } })
    }

    if (url.endsWith('/graphql')) {
      commitCalled = true
      throw new Error('Invalid references must not reach the commit mutation')
    }

    throw new Error(`Unexpected GitHub request: ${url}`)
  })

  const response = await handleGraphql({
    env: appEnv,
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
              { path: invalidArticle.path, contents: invalidArticle.contents },
            ],
            deletions: [],
          },
          message: { headline: 'cms: create invalid article' },
        },
      },
    }),
  })
  const result = await response.json()

  assert.equal(response.status, 422)
  assert.match(result.message, /記事の著者が存在しません/)
  assert.equal(commitCalled, false)
})

test('既存記事のlastUpdated漏れはcommit前に422で拒否する', async () => {
  let commitCalled = false
  const existingArticle = freshnessBlogMarkdown()
  const revisedArticle = freshnessBlogMarkdown({ body: 'Revised body.' })
  const referenceFiles = new Map([
    ...defaultReferenceFiles,
    [contentPath, existingArticle],
  ])

  mockGitHub(
    async (url) => {
      if (url.endsWith('/git/ref/heads/main')) {
        return jsonResponse({ object: { sha: mainSha } })
      }

      if (url.endsWith('/graphql')) {
        commitCalled = true
        throw new Error('Invalid freshness must not reach the commit mutation')
      }

      throw new Error(`Unexpected GitHub request: ${url}`)
    },
    true,
    () => {},
    referenceFiles,
  )

  const response = await handleGraphql({
    env: appEnv,
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
                path: contentPath,
                contents: Buffer.from(revisedArticle).toString('base64'),
              },
            ],
            deletions: [],
          },
          message: { headline: 'cms: update existing article' },
        },
      },
    }),
  })
  const result = await response.json()

  assert.equal(response.status, 422)
  assert.match(result.message, /lastUpdatedを設定/)
  assert.equal(commitCalled, false)
})

test('編集開始後にmainが更新されていればcommitを送らず409にする', async () => {
  let callCount = 0

  mockGitHub(async (url) => {
    callCount += 1

    if (url.endsWith('/git/ref/heads/main')) {
      return jsonResponse({ object: { sha: 'b'.repeat(40) } })
    }

    throw new Error(`Unexpected GitHub request: ${url}`)
  })

  const response = await handleGraphql({
    env: appEnv,
    request: graphqlRequest(),
  })
  const result = await response.json()

  assert.equal(response.status, 409)
  assert.match(result.message, /再読み込み/)
  assert.equal(callCount, 1)
})

test('応答喪失後もmainの1 commitが保存内容と完全一致すれば成功として復旧する', async () => {
  const committedSha = 'b'.repeat(40)
  const content = Buffer.from(validContent)
  const blobSha = gitBlobSha(content)
  let mainRefReads = 0
  let requestMarkerLine = ''

  mockGitHub(async (url, _init, body) => {
    if (url.endsWith('/git/ref/heads/main')) {
      mainRefReads += 1

      return jsonResponse({
        object: { sha: mainRefReads === 1 ? mainSha : committedSha },
      })
    }

    if (url.endsWith('/graphql')) {
      requestMarkerLine = body.variables.input.message.body
        .split('\n')
        .find((line) => line.startsWith('CMS request: '))
      throw new TypeError('response lost after request')
    }

    if (url.endsWith(`/compare/${mainSha}...${committedSha}`)) {
      return jsonResponse({
        status: 'ahead',
        ahead_by: 1,
        behind_by: 0,
        total_commits: 1,
        commits: [
          {
            sha: committedSha,
            parents: [{ sha: mainSha }],
            commit: {
              message: `cms: update example\n\nGitHub editor: @editor\n${requestMarkerLine}`,
              committer: { date: '2026-07-28T00:00:00Z' },
            },
          },
        ],
        files: [
          {
            filename: contentPath,
            status: 'modified',
            sha: blobSha,
          },
        ],
      })
    }

    throw new Error(`Unexpected GitHub request: ${url}`)
  })

  const response = await handleGraphql({
    env: appEnv,
    request: graphqlRequest(),
  })
  const result = await response.json()

  assert.equal(response.status, 200)
  assert.equal(result.data.createCommitOnBranch.commit.oid, committedSha)
  assert.equal(result.extensions.cms.recovered, true)
  assert.equal(result.extensions.cms.publication, 'direct')
  assert.equal(mainRefReads, 2)
})

test('応答が曖昧な間に別内容でmainが更新された場合は成功扱いしない', async () => {
  const committedSha = 'b'.repeat(40)
  let mainRefReads = 0

  mockGitHub(async (url) => {
    if (url.endsWith('/git/ref/heads/main')) {
      mainRefReads += 1

      return jsonResponse({
        object: { sha: mainRefReads === 1 ? mainSha : committedSha },
      })
    }

    if (url.endsWith('/graphql')) {
      throw new TypeError('response lost after request')
    }

    if (url.endsWith(`/compare/${mainSha}...${committedSha}`)) {
      return jsonResponse({
        status: 'ahead',
        ahead_by: 1,
        behind_by: 0,
        total_commits: 1,
        commits: [
          {
            sha: committedSha,
            parents: [{ sha: mainSha }],
            commit: { committer: { date: '2026-07-28T00:00:00Z' } },
          },
        ],
        files: [
          {
            filename: 'src/content/blog/other.md',
            status: 'modified',
            sha: 'c'.repeat(40),
          },
        ],
      })
    }

    throw new Error(`Unexpected GitHub request: ${url}`)
  })

  const response = await handleGraphql({
    env: appEnv,
    request: graphqlRequest(),
  })
  const result = await response.json()

  assert.equal(response.status, 409)
  assert.match(result.message, /再読み込み/)
  assert.equal(mainRefReads, 2)
})

test('親path blobが一致してもrequest markerが違えば復旧しない', async () => {
  const committedSha = 'b'.repeat(40)
  const content = Buffer.from(validContent)
  const blobSha = gitBlobSha(content)
  let mainRefReads = 0

  mockGitHub(async (url) => {
    if (url.endsWith('/git/ref/heads/main')) {
      mainRefReads += 1

      return jsonResponse({
        object: { sha: mainRefReads === 1 ? mainSha : committedSha },
      })
    }

    if (url.endsWith('/graphql')) {
      throw new TypeError('response lost after request')
    }

    if (url.endsWith(`/compare/${mainSha}...${committedSha}`)) {
      return jsonResponse({
        status: 'ahead',
        ahead_by: 1,
        behind_by: 0,
        total_commits: 1,
        commits: [
          {
            sha: committedSha,
            parents: [{ sha: mainSha }],
            commit: {
              message:
                'cms: update example\n\nGitHub editor: @other\nCMS request: 00000000-0000-4000-8000-000000000000',
              committer: { date: '2026-07-28T00:00:00Z' },
            },
          },
        ],
        files: [
          {
            filename: contentPath,
            status: 'modified',
            sha: blobSha,
          },
        ],
      })
    }

    throw new Error(`Unexpected GitHub request: ${url}`)
  })

  const response = await handleGraphql({
    env: appEnv,
    request: graphqlRequest(),
  })
  const result = await response.json()

  assert.equal(response.status, 409)
  assert.match(result.message, /再読み込み/)
})

test('CMS管理対象外の保存をGitHubへ送らない', async () => {
  let cmsOperationCalled = false

  mockGitHub(async () => {
    cmsOperationCalled = true
    throw new Error('CMS operation must not continue')
  })

  const response = await handleGraphql({
    env: appEnv,
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

test('schema違反のMarkdownをmainへ送らず422にする', async () => {
  let cmsOperationCalled = false

  mockGitHub(async () => {
    cmsOperationCalled = true
    throw new Error('CMS operation must not continue')
  })

  const response = await handleGraphql({
    env: appEnv,
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
                path: contentPath,
                contents: Buffer.from(
                  '---\ntitle: missing fields\n---\n<script>alert(1)</script>',
                ).toString('base64'),
              },
            ],
            deletions: [],
          },
          message: { headline: 'cms: update blocked' },
        },
      },
    }),
  })

  assert.equal(response.status, 422)
  assert.equal(cmsOperationCalled, false)
})

test('通常文のJavaScriptは許可しactive URL protocolだけを拒否する', () => {
  const normal = validBlogMarkdown.replace(
    'CMS proxy test content',
    'JavaScriptで実装し、java&#x09;script:という文字列も説明するCMS proxyの解説',
  )
  const dangerous = validBlogMarkdown.replace(
    'author: gui',
    'author: gui\nimage: javascript:alert(1)',
  )

  assert.doesNotThrow(() =>
    validateCmsAdditionContents([
      {
        path: contentPath,
        contents: Buffer.from(normal).toString('base64'),
        byteSize: Buffer.byteLength(normal),
      },
    ]),
  )
  assert.throws(
    () =>
      validateCmsAdditionContents([
        {
          path: contentPath,
          contents: Buffer.from(dangerous).toString('base64'),
          byteSize: Buffer.byteLength(dangerous),
        },
      ]),
    /CMS保存内容が不正/,
  )
})

test('CMS由来のJSONにactive HTMLを保存できない', async () => {
  const sourcePath = 'src/i18n/source/ja/pages/home.json'
  const source = JSON.parse(
    await readFile(path.join(repositoryRoot, sourcePath), 'utf8'),
  )
  source.aboutBody2 = '</script><script>alert(1)</script>'
  const contents = JSON.stringify(source)

  assert.throws(
    () =>
      validateCmsAdditionContents([
        {
          path: sourcePath,
          contents: Buffer.from(contents).toString('base64'),
          byteSize: Buffer.byteLength(contents),
        },
      ]),
    /CMS保存内容が不正/,
  )
})

test('frontmatter URLの制御文字entityによるactive scheme偽装を拒否する', () => {
  for (const url of obfuscatedActiveUrls) {
    const dangerous = validBlogMarkdown.replace(
      'author: gui',
      `author: gui\nimage: "${url}"`,
    )

    assert.throws(
      () =>
        validateCmsAdditionContents([
          {
            path: contentPath,
            contents: Buffer.from(dangerous).toString('base64'),
            byteSize: Buffer.byteLength(dangerous),
          },
        ]),
      /CMS保存内容が不正/,
      url,
    )
  }
})

test('Markdown linkの制御文字entityによるactive scheme偽装を拒否する', () => {
  for (const url of obfuscatedActiveUrls) {
    const dangerous = `${validBlogMarkdown}
[danger](${url})
`

    assert.throws(
      () =>
        validateCmsAdditionContents([
          {
            path: contentPath,
            contents: Buffer.from(dangerous).toString('base64'),
            byteSize: Buffer.byteLength(dangerous),
          },
        ]),
      /CMS保存内容が不正/,
      url,
    )
  }
})

test('Markdown URL locationのCommonMark backslash escapeを解除して検証する', () => {
  const payloads = [
    '[danger](javascript\\:alert(1))',
    '[nested [label]](javascript\\:alert(1))',
    '<javascript\\:alert(1)>',
    '[danger][id]\n\n[id]: javascript\\:alert(1)',
    '[danger][id]\n\n[id]: <javascript\\:alert(1)>',
    '[danger][id]\n\n[id]:\n  javascript\\:alert(1)',
    '![danger][id]\n\n[id]: data\\:image/svg+xml,x',
  ]

  for (const payload of payloads) {
    const dangerous = `${validBlogMarkdown}
${payload}
`

    assert.throws(
      () =>
        validateCmsAdditionContents([
          {
            path: contentPath,
            contents: Buffer.from(dangerous).toString('base64'),
            byteSize: Buffer.byteLength(dangerous),
          },
        ]),
      /CMS保存内容が不正/,
      payload,
    )
  }
})

test('reference definitionのlinkとimageにあるactive URLを拒否する', () => {
  const urls = [
    'javascript:alert(1)',
    'data:image/svg+xml,x',
    ...obfuscatedActiveUrls,
  ]

  for (const url of urls) {
    for (const reference of [
      `[danger][id]\n\n[id]: ${url}`,
      `[danger][id]\n\n[id]: <${url}>`,
      `[danger][id]\n\n[id]:\n  ${url}`,
      `![danger][id]\n\n[id]: ${url}`,
      `[danger][id]\n\n> [id]: ${url}`,
      `[danger][id]\n\n- [id]: ${url}`,
    ]) {
      const dangerous = `${validBlogMarkdown}
${reference}
`

      assert.throws(
        () =>
          validateCmsAdditionContents([
            {
              path: contentPath,
              contents: Buffer.from(dangerous).toString('base64'),
              byteSize: Buffer.byteLength(dangerous),
            },
          ]),
        /CMS保存内容が不正/,
        `${url}\n${reference}`,
      )
    }
  }
})

test('URL locationではない通常文のCommonMark風backslash表記は許可する', () => {
  const safe = `${validBlogMarkdown}
説明文では javascript\\:alert(1) という表記も扱います。
`

  assert.doesNotThrow(() =>
    validateCmsAdditionContents([
      {
        path: contentPath,
        contents: Buffer.from(safe).toString('base64'),
        byteSize: Buffer.byteLength(safe),
      },
    ]),
  )
})

test('raw HTML属性の制御文字entityによるactive scheme偽装を拒否する', () => {
  for (const url of obfuscatedActiveUrls) {
    const dangerous = `${validBlogMarkdown}
<a href="${url}">danger</a>
`

    assert.throws(
      () =>
        validateCmsAdditionContents([
          {
            path: contentPath,
            contents: Buffer.from(dangerous).toString('base64'),
            byteSize: Buffer.byteLength(dangerous),
          },
        ]),
      /CMS保存内容が不正/,
      url,
    )
  }
})

test('escaped backtickで囲ったactive HTMLをinline codeとして除外しない', () => {
  const payloads = [
    '\\`<img src=x onerror=alert(1)>\\`',
    '\\``<img src=x onerror=alert(1)>\\``',
  ]

  for (const payload of payloads) {
    const dangerous = `${validBlogMarkdown}
${payload}
`

    assert.throws(
      () =>
        validateCmsAdditionContents([
          {
            path: contentPath,
            contents: Buffer.from(dangerous).toString('base64'),
            byteSize: Buffer.byteLength(dangerous),
          },
        ]),
      /CMS保存内容が不正/,
      payload,
    )
  }
})

test('singleまたはmultiple backtickの本物のinline codeはactive HTML検証対象外にする', () => {
  const payloads = [
    '`<img src=x onerror=alert(1)>`',
    '``<img src=x onerror=alert(1)>``',
  ]

  for (const payload of payloads) {
    const safe = `${validBlogMarkdown}
${payload}
`

    assert.doesNotThrow(
      () =>
        validateCmsAdditionContents([
          {
            path: contentPath,
            contents: Buffer.from(safe).toString('base64'),
            byteSize: Buffer.byteLength(safe),
          },
        ]),
      payload,
    )
  }
})

test('backtickを含むbacktick fence infoでactive HTMLを隠せない', () => {
  const payloads = [
    '```bad`info\n<img src=x onerror=alert(1)>\n```',
    '````bad`info\n<img src=x onerror=alert(1)>\n````',
    '```bad\\`info\n<img src=x onerror=alert(1)>\n```',
  ]

  for (const payload of payloads) {
    const dangerous = `${validBlogMarkdown}
${payload}
`

    assert.throws(
      () =>
        validateCmsAdditionContents([
          {
            path: contentPath,
            contents: Buffer.from(dangerous).toString('base64'),
            byteSize: Buffer.byteLength(dangerous),
          },
        ]),
      /CMS保存内容が不正/,
      payload,
    )
  }
})

test('正規の3文字・4文字backtick fenceとtilde fenceはcodeとして除外する', () => {
  const payloads = [
    '```html\n<img src=x onerror=alert(1)>\n```',
    '````html\n<img src=x onerror=alert(1)>\n````',
    '~~~bad`info\n<img src=x onerror=alert(1)>\n~~~',
  ]

  for (const payload of payloads) {
    const safe = `${validBlogMarkdown}
${payload}
`

    assert.doesNotThrow(
      () =>
        validateCmsAdditionContents([
          {
            path: contentPath,
            contents: Buffer.from(safe).toString('base64'),
            byteSize: Buffer.byteLength(safe),
          },
        ]),
      payload,
    )
  }
})

test('code外のslash区切りraw HTML tagを拒否する', () => {
  const payloads = [
    '<svg/onload=alert(1)>',
    '<body/onload=alert(1)>',
    '<details/open/ontoggle=alert(1)>',
  ]

  for (const payload of payloads) {
    const dangerous = `${validBlogMarkdown}
${payload}
`

    assert.throws(
      () =>
        validateCmsAdditionContents([
          {
            path: contentPath,
            contents: Buffer.from(dangerous).toString('base64'),
            byteSize: Buffer.byteLength(dangerous),
          },
        ]),
      /CMS保存内容が不正/,
      payload,
    )
  }
})

test('Markdown linkとautolinkはraw HTMLとして誤拒否しない', () => {
  const safe = `${validBlogMarkdown}
[Acecore](https://acecore.net/)

<https://acecore.net/>
`

  assert.doesNotThrow(() =>
    validateCmsAdditionContents([
      {
        path: contentPath,
        contents: Buffer.from(safe).toString('base64'),
        byteSize: Buffer.byteLength(safe),
      },
    ]),
  )
})

test('JSON URLの制御文字entityによるactive scheme偽装だけを拒否する', async () => {
  const sourcePath = 'src/i18n/source/ja/campaigns/site-renewal-2026.json'
  const sourceText = await readFile(
    path.join(repositoryRoot, sourcePath),
    'utf8',
  )

  for (const url of obfuscatedActiveUrls) {
    const source = JSON.parse(sourceText)
    source.href = url
    const contents = JSON.stringify(source)

    assert.throws(
      () =>
        validateCmsAdditionContents([
          {
            path: sourcePath,
            contents: Buffer.from(contents).toString('base64'),
            byteSize: Buffer.byteLength(contents),
          },
        ]),
      /CMS保存内容が不正/,
      url,
    )
  }

  const normalProse = JSON.parse(sourceText)
  normalProse.body =
    'URLではない説明文ではjava&#x09;script:という文字列も保存できる'
  const normalContents = JSON.stringify(normalProse)

  assert.doesNotThrow(() =>
    validateCmsAdditionContents([
      {
        path: sourcePath,
        contents: Buffer.from(normalContents).toString('base64'),
        byteSize: Buffer.byteLength(normalContents),
      },
    ]),
  )
})

test('実形式と拡張子が一致しないmediaをmainへ送らず422にする', async () => {
  let cmsOperationCalled = false

  mockGitHub(async () => {
    cmsOperationCalled = true
    throw new Error('CMS operation must not continue')
  })

  const response = await handleGraphql({
    env: appEnv,
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
                path: 'public/uploads/not-an-image.png',
                contents: Buffer.from('<script>alert(1)</script>').toString(
                  'base64',
                ),
              },
            ],
            deletions: [],
          },
          message: { headline: 'cms: update blocked' },
        },
      },
    }),
  })

  assert.equal(response.status, 422)
  assert.equal(cmsOperationCalled, false)
})

test('参照される著者・タグ・画像・固定JSONはCMSから削除できない', async () => {
  let cmsOperationCalled = false

  mockGitHub(async () => {
    cmsOperationCalled = true
    throw new Error('CMS operation must not continue')
  })

  for (const path of [
    'src/content/authors/example.json',
    'src/content/tags/example.json',
    'public/uploads/example.png',
    'src/i18n/source/ja/common.json',
  ]) {
    const response = await handleGraphql({
      env: appEnv,
      request: graphqlRequest({
        variables: {
          input: {
            branch: {
              repositoryNameWithOwner: `${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}`,
              branchName: 'main',
            },
            expectedHeadOid: mainSha,
            fileChanges: {
              additions: [],
              deletions: [{ path }],
            },
            message: { headline: 'cms: delete blocked' },
          },
        },
      }),
    })

    assert.equal(response.status, 403, path)
  }

  assert.equal(cmsOperationCalled, false)
})

test('記事とキャンペーンはCMSから削除できる', async () => {
  mockGitHub(async (url, _init, body) => {
    if (url.endsWith('/git/ref/heads/main')) {
      return jsonResponse({ object: { sha: mainSha } })
    }

    if (url.endsWith('/graphql')) {
      assert.deepEqual(body.variables.input.fileChanges, {
        additions: [],
        deletions: [
          { path: 'src/content/blog/example.md' },
          { path: 'src/i18n/source/ja/campaigns/example.json' },
        ],
      })

      return jsonResponse({
        data: {
          createCommitOnBranch: {
            commit: {
              oid: 'b'.repeat(40),
              committedDate: '2026-07-28T00:00:00Z',
            },
          },
        },
      })
    }

    throw new Error(`Unexpected GitHub request: ${url}`)
  })

  const response = await handleGraphql({
    env: appEnv,
    request: graphqlRequest({
      variables: {
        input: {
          branch: {
            repositoryNameWithOwner: `${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}`,
            branchName: 'main',
          },
          expectedHeadOid: mainSha,
          fileChanges: {
            additions: [],
            deletions: [
              { path: 'src/content/blog/example.md' },
              { path: 'src/i18n/source/ja/campaigns/example.json' },
            ],
          },
          message: { headline: 'cms: delete allowed' },
        },
      },
    }),
  })

  assert.equal(response.status, 200)
})

test('main以外を指定した保存を拒否する', async () => {
  let cmsOperationCalled = false

  mockGitHub(async () => {
    cmsOperationCalled = true
    throw new Error('CMS operation must not continue')
  })

  const response = await handleGraphql({
    env: appEnv,
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
    env: appEnv,
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
    env: appEnv,
    request: new Request('https://example.com/admin/api/github/user', {
      method: 'POST',
      headers: authorizationHeaders(),
    }),
  })

  assert.equal(response.status, 405)
  assert.equal(called, false)
})

function mockGitHub(
  handler,
  push = true,
  onTokenRequest = () => {},
  referenceFiles = defaultReferenceFiles,
) {
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

    if (
      url ===
      `https://api.github.com/app/installations/${appInstallationId}/access_tokens`
    ) {
      onTokenRequest()
      return jsonResponse({
        token: appToken,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        ...installationTokenScope,
      })
    }

    assert.equal(
      new Headers(init.headers).get('Authorization'),
      `Bearer ${appToken}`,
    )

    if (url.endsWith(`/git/trees/${mainSha}?recursive=1`) && referenceFiles) {
      return jsonResponse(buildReferenceTree(referenceFiles))
    }

    if (
      url.endsWith('/graphql') &&
      body?.query?.includes('query CmsReferenceState') &&
      referenceFiles
    ) {
      return jsonResponse(
        buildReferenceBlobResponse(body.query, referenceFiles),
      )
    }

    return handler(url, init, body)
  }
}

function buildReferenceTree(referenceFiles) {
  return {
    sha: mainSha,
    truncated: false,
    tree: Array.from(referenceFiles, ([path, contents]) => {
      const bytes =
        contents === null ? Buffer.from(`media:${path}`) : Buffer.from(contents)

      return {
        mode: '100644',
        path,
        sha: gitBlobSha(bytes),
        size: bytes.byteLength,
        type: 'blob',
      }
    }),
  }
}

function buildReferenceBlobResponse(query, referenceFiles) {
  const textBySha = new Map(
    Array.from(referenceFiles, ([, contents]) => {
      if (contents === null) return null

      const bytes = Buffer.from(contents)
      return [
        gitBlobSha(bytes),
        {
          byteSize: bytes.byteLength,
          isBinary: false,
          isTruncated: false,
          text: contents,
        },
      ]
    }).filter(Boolean),
  )
  const repository = {}

  for (const match of query.matchAll(
    /blob(\d+): object\(oid: "([a-f0-9]{40})"\)/g,
  )) {
    repository[`blob${match[1]}`] = textBySha.get(match[2]) ?? null
  }

  return { data: { repository } }
}

async function listFilesRecursively(relativeDirectory) {
  const paths = []
  const entries = await readdir(path.join(repositoryRoot, relativeDirectory), {
    withFileTypes: true,
  })

  for (const entry of entries) {
    const relativePath = `${relativeDirectory}/${entry.name}`.replaceAll(
      '\\',
      '/',
    )

    if (entry.isDirectory()) {
      paths.push(...(await listFilesRecursively(relativePath)))
    } else if (entry.isFile()) {
      paths.push(relativePath)
    }
  }

  return paths
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
            contents: Buffer.from(validContent).toString('base64'),
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

function referenceAddition(path, value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value)

  return {
    path,
    contents: bytes.toString('base64'),
    byteSize: bytes.byteLength,
  }
}

function referenceBlogMarkdown({
  articleId = defaultArticleId,
  author = 'gui',
  galleryImage,
  image,
  tags = ['技術'],
  uploadedImage,
} = {}) {
  return `---
title: Reference test
description: CMS reference validation test
articleId: ${articleId}
date: 2026-07-29T12:00
author: ${author}
tags: ${JSON.stringify(tags)}
${image ? `image: ${image}\n` : ''}${uploadedImage ? `uploadedImage: ${uploadedImage}\n` : ''}${
    galleryImage
      ? `gallery:
  items:
    - src: ${galleryImage}
      alt: Reference image
`
      : ''
  }---

Reference validation.
`
}

function freshnessBlogMarkdown({
  articleId = defaultArticleId,
  body = 'Original body.',
  lastUpdated,
} = {}) {
  return `---
title: Freshness test
description: CMS freshness validation test
articleId: ${articleId}
date: 2026-07-28T12:00
${lastUpdated ? `lastUpdated: ${lastUpdated}\n` : ''}author: gui
---

${body}
`
}

function referenceFixture({ includeTranslatedArticle, tagName }) {
  const article = referenceBlogMarkdown({
    image: '/uploads/example.png',
    tags: [tagName],
  })

  return [
    {
      path: 'src/content/authors/gui.json',
      contents: JSON.stringify({ id: 'gui', name: 'Gui' }),
    },
    {
      path: 'src/content/tags/topic.json',
      contents: JSON.stringify({ id: 'topic', name: tagName }),
    },
    { path: 'public/uploads/example.png' },
    { path: 'src/content/blog/example.md', contents: article },
    ...(includeTranslatedArticle
      ? [{ path: 'src/content/blog/en/example.md', contents: article }]
      : []),
  ]
}

function gitBlobSha(content) {
  return createHash('sha1')
    .update(`blob ${content.byteLength}\0`)
    .update(content)
    .digest('hex')
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
