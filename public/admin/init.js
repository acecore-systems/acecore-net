// @ts-check

/**
 * @typedef {{
 *   init: (options: { config: { backend: { branch: string } } }) => void | Promise<void>
 * }} SveltiaCms
 */

/** @type {unknown} */
const cmsCandidate = Reflect.get(globalThis, 'CMS')

/**
 * @param {unknown} value
 * @returns {value is SveltiaCms}
 */
const isSveltiaCms = (value) =>
  typeof value === 'object' &&
  value !== null &&
  'init' in value &&
  typeof value.init === 'function'

if (!isSveltiaCms(cmsCandidate)) {
  throw new Error('Sveltia CMS failed to load.')
}

const cms = cmsCandidate

void initialize().catch((error) => {
  const status = document.createElement('p')
  status.textContent =
    error instanceof Error
      ? error.message
      : 'AcecoreIDのログインを確認してください。'
  document.body.append(status)
  if (error instanceof Error && Reflect.get(error, 'refreshLogin') === true) {
    const guidance = document.createElement('p')
    const accountLink = document.createElement('a')
    accountLink.href = 'https://id.acecore.net/'
    accountLink.target = '_blank'
    accountLink.rel = 'noopener noreferrer'
    accountLink.textContent = 'AcecoreIDでGitHub連携を確認'
    guidance.append(
      accountLink,
      document.createTextNode(
        'してから、このサイトのログイン情報を更新してください。',
      ),
    )
    document.body.append(guidance)

    const form = document.createElement('form')
    form.method = 'post'
    form.action = '/admin/api/refresh-session'
    const button = document.createElement('button')
    button.type = 'submit'
    button.textContent = 'ログイン情報を更新'
    form.append(button)
    document.body.append(form)
  }
})

const INITIALIZE_FALLBACK_MESSAGE =
  'CMSを開始できませんでした。AcecoreIDのログインと連携GitHubの編集権限を確認してください。'
const MAX_INITIALIZATION_ERROR_BYTES = 4 * 1024
const READABLE_INITIALIZATION_ERROR_STATUSES = new Set([401, 403, 502])
const INITIALIZE_ERROR_MESSAGES = new Map([
  ...[
    'CMS_AUTH_IDENTITY_USER_MISSING',
    'CMS_AUTH_IDENTITY_PROVIDER_MISSING',
    'CMS_AUTH_IDENTITY_USER_MISMATCH',
    'CMS_AUTH_IDENTITY_ACCOUNT_MISMATCH',
    'CMS_AUTH_IDENTITY_PROVIDER_MISMATCH',
    'CMS_AUTH_IDENTITY_PROVIDER_TYPE_MISMATCH',
    'CMS_AUTH_IDENTITY_FIELDS_MISSING',
  ].map(
    (code) =>
      /** @type {[string, string]} */ ([
        '403:' + code,
        'AcecoreIDの本人情報とログイン先を確認してください。',
      ]),
  ),
  [
    '401:CMS_AUTH_ACCESS_SUBJECT_INVALID',
    'AcecoreIDのAccess認証情報を確認してください。',
  ],
  [
    '403:CMS_AUTH_CUSTOM_CLAIMS_MISSING',
    'AcecoreIDの連携情報を確認してください。',
  ],
  [
    '403:CMS_AUTH_TOKEN_TYPE_INVALID',
    'AcecoreIDの認証情報を確認してください。',
  ],
  [
    '403:CMS_AUTH_SUBJECT_INVALID',
    'AcecoreIDの連携情報（利用者ID）を確認してください。',
  ],
  [
    '403:CMS_AUTH_GITHUB_ID_INVALID',
    'AcecoreIDの連携GitHubを確認してください。',
  ],
  [
    '403:CMS_AUTH_REPOSITORY_WRITE_DENIED',
    '連携GitHubアカウントのCMS編集権限を確認してください。',
  ],
  [
    '403:CMS_AUTH_IDENTITY_SOURCE_CONFLICT',
    'AcecoreIDの連携情報が一致していません。',
  ],
  [
    '502:CMS_AUTH_IDENTITY_UNAVAILABLE',
    'AcecoreIDの本人情報を取得できませんでした。時間をおいて再度お試しください。',
  ],
  [
    '502:CMS_AUTH_IDENTITY_INVALID',
    'AcecoreIDの本人情報の応答を確認できませんでした。',
  ],
])

async function initialize() {
  const response = await fetch('/admin/api/github/user', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) throw await getInitializationError(response)
  // A UI sentinel only. Server endpoints ignore Authorization and verify Access.
  const signin = btoa(
    JSON.stringify({ token: 'acecore-id-access', prefs: { language: 'ja' } }),
  )
  history.replaceState(
    null,
    '',
    `${location.pathname}${location.search}#/signin/${signin}`,
  )
  await cms.init({ config: { backend: { branch: 'main' } } })
}

/** @param {Response} response */
async function getInitializationError(response) {
  const body = await readInitializationErrorBody(response)
  const code =
    body && typeof body === 'object' && typeof body.code === 'string'
      ? body.code
      : ''
  const message =
    INITIALIZE_ERROR_MESSAGES.get(response.status + ':' + code) ||
    INITIALIZE_FALLBACK_MESSAGE
  const diagnostic =
    code && message !== INITIALIZE_FALLBACK_MESSAGE ? ' / ' + code : ''
  const error = new Error(
    message + '（HTTP ' + response.status + diagnostic + '）',
  )
  Reflect.set(
    error,
    'refreshLogin',
    response.status === 401 || response.status === 403,
  )
  return error
}

/** @param {Response} response */
async function readInitializationErrorBody(response) {
  if (
    !READABLE_INITIALIZATION_ERROR_STATUSES.has(response.status) ||
    !/^application\/json(?:;|$)/i.test(
      response.headers.get('Content-Type')?.trim() || '',
    )
  )
    return null
  const reader = response.body?.getReader()
  if (!reader) return null
  const decoder = new TextDecoder()
  let bytes = 0
  let text = ''
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > MAX_INITIALIZATION_ERROR_BYTES) {
        await reader.cancel()
        return null
      }
      text += decoder.decode(value, { stream: true })
    }
    return JSON.parse(text + decoder.decode())
  } catch {
    return null
  } finally {
    reader.releaseLock()
  }
}

const notice = document.createElement('aside')
const noticeTitle = document.createElement('strong')
const noticeBody = document.createElement('span')
const noticePolicy = document.createElement('span')
const noticeClose = document.createElement('button')
const isPreview = window.location.hostname.endsWith('.pages.dev')

notice.className = 'cms-publish-notice'
notice.setAttribute('aria-label', 'CMSの公開方法')
noticeTitle.textContent = isPreview
  ? 'プレビューでは保存できません'
  : '保存すると自動で公開されます'
noticeBody.textContent = isPreview
  ? 'コンテンツの編集と公開は本番の /admin/ から行ってください。'
  : 'サイトへの反映には少し時間がかかります。'
noticePolicy.textContent =
  '記事・キャンペーンは削除できます。著者・タグ・画像は削除できません。'
noticeClose.className = 'cms-publish-notice__close'
noticeClose.type = 'button'
noticeClose.setAttribute('aria-label', '公開方法の案内を閉じる')
noticeClose.textContent = '×'
noticeClose.addEventListener('click', () => notice.remove())
notice.append(noticeTitle, noticeBody, noticePolicy, noticeClose)
document.body.append(notice)
