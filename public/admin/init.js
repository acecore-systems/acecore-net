CMS.init({
  config: {
    backend: {
      branch: 'main',
    },
  },
})

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
