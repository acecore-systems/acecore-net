import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import vm from 'node:vm'

const source = await readFile(
  new URL('../public/admin/init.js', import.meta.url),
  'utf8',
)

async function runAdminInit(response) {
  const appended = []
  const created = []
  const cmsCalls = []
  const document = {
    body: {
      append(...nodes) {
        appended.push(...nodes)
      },
    },
    createElement(tagName) {
      const node = {
        addEventListener() {},
        append() {},
        remove() {},
        setAttribute() {},
        tagName,
        textContent: '',
      }
      created.push(node)
      return node
    },
    createTextNode(textContent) {
      return { tagName: '#text', textContent }
    },
  }
  const context = {
    CMS: { init: async (options) => cmsCalls.push(options) },
    Reflect,
    btoa: (value) => Buffer.from(value).toString('base64'),
    document,
    fetch: async () => response,
    history: { replaceState() {} },
    location: { hostname: 'example.test', pathname: '/admin/', search: '' },
    window: { location: { hostname: 'acecore.net' } },
    TextDecoder,
  }
  vm.runInNewContext(source, context)
  await new Promise((resolve) => setImmediate(resolve))
  return { appended, created, cmsCalls }
}

test('認証診断を固定表示し連携確認とログイン更新を案内する', async () => {
  const { appended, created, cmsCalls } = await runAdminInit(
    Response.json(
      { code: 'CMS_AUTH_GITHUB_ID_INVALID', message: 'server detail' },
      { status: 403 },
    ),
  )
  const status = appended.find((node) => node.tagName === 'p')
  assert.equal(
    status.textContent,
    'AcecoreIDの連携GitHubを確認してください。（HTTP 403 / CMS_AUTH_GITHUB_ID_INVALID）',
  )
  assert.equal(status.textContent.includes('server detail'), false)
  const link = created.find((node) => node.tagName === 'a')
  assert.equal(link.href, 'https://id.acecore.net/')
  assert.equal(link.rel, 'noopener noreferrer')
  const form = appended.find((node) => node.tagName === 'form')
  assert.equal(form.method, 'post')
  assert.equal(form.action, '/admin/api/refresh-session')
  assert.deepEqual(cmsCalls, [])
})

test('identity上流障害は安全な固定表示にしてCookie更新を出さない', async () => {
  const { appended, cmsCalls } = await runAdminInit(
    Response.json(
      { code: 'CMS_AUTH_IDENTITY_UNAVAILABLE', message: 'server detail' },
      { status: 502 },
    ),
  )
  const status = appended.find((node) => node.tagName === 'p')
  assert.equal(
    status.textContent,
    'AcecoreIDの本人情報を取得できませんでした。時間をおいて再度お試しください。（HTTP 502 / CMS_AUTH_IDENTITY_UNAVAILABLE）',
  )
  assert.equal(
    appended.some((node) => node.tagName === 'form'),
    false,
  )
  assert.deepEqual(cmsCalls, [])
})

test('未知codeと過大JSON本文は共通案内に制限する', async () => {
  for (const response of [
    Response.json(
      { code: 'CMS_AUTH_UNKNOWN', message: 'server detail' },
      { status: 403 },
    ),
    new Response(
      JSON.stringify({
        code: 'CMS_AUTH_GITHUB_ID_INVALID',
        padding: 'x'.repeat(4096),
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      },
    ),
  ]) {
    const { appended, cmsCalls } = await runAdminInit(response)
    const status = appended.find((node) => node.tagName === 'p')
    assert.equal(
      status.textContent,
      'CMSを開始できませんでした。AcecoreIDのログインと連携GitHubの編集権限を確認してください。（HTTP 403）',
    )
    assert.equal(status.textContent.includes('server detail'), false)
    assert.deepEqual(cmsCalls, [])
  }
})

test('CMS初期化成功時は既存main設定で開始する', async () => {
  const { appended, cmsCalls } = await runAdminInit(
    Response.json({ login: 'editor' }),
  )
  assert.equal(
    appended.some((node) => node.tagName === 'p'),
    false,
  )
  assert.equal(cmsCalls.length, 1)
  assert.equal(cmsCalls[0].config.backend.branch, 'main')
})
