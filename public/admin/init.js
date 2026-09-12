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
})

async function initialize() {
  const response = await fetch('/admin/api/github/user', {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  })
  if (!response.ok) {
    throw new Error(
      'AcecoreIDへのログインと連携GitHubの編集権限を確認してください。',
    )
  }
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
