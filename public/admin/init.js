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
const noticeClose = document.createElement('button')

notice.className = 'cms-publish-notice'
notice.setAttribute('aria-label', 'CMSの公開方法')
noticeTitle.textContent = '保存すると自動で公開されます'
noticeBody.textContent = 'サイトへの反映には少し時間がかかります。'
noticeClose.className = 'cms-publish-notice__close'
noticeClose.type = 'button'
noticeClose.setAttribute('aria-label', '公開方法の案内を閉じる')
noticeClose.textContent = '×'
noticeClose.addEventListener('click', () => notice.remove())
notice.append(noticeTitle, noticeBody, noticeClose)
document.body.append(notice)
