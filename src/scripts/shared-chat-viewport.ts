const viewportControllers = new WeakMap<HTMLElement, AbortController>()
/** Shared with the corporate, Schools and Systems chat widgets. */
export function initializeChatViewport() {
  const roots = document.querySelectorAll<HTMLElement>('.ac-chat')
  if (!roots.length) return
  roots.forEach((root) => viewportControllers.get(root)?.abort())
  const controller = new AbortController()
  roots.forEach((root) => viewportControllers.set(root, controller))
  const update = () => {
    const viewport = window.visualViewport
    const height = viewport?.height ?? window.innerHeight
    const offset = Math.max(
      0,
      window.innerHeight - height - (viewport?.offsetTop ?? 0),
    )
    roots.forEach((root) => {
      root.style.setProperty('--chat-viewport-height', `${height}px`)
      root.style.setProperty('--chat-keyboard-offset', `${offset}px`)
    })
  }
  update()
  window.visualViewport?.addEventListener('resize', update, {
    signal: controller.signal,
  })
  window.visualViewport?.addEventListener('scroll', update, {
    signal: controller.signal,
  })
  window.addEventListener('resize', update, { signal: controller.signal })
  document.addEventListener('astro:before-swap', () => controller.abort(), {
    once: true,
    signal: controller.signal,
  })
  window.addEventListener('pagehide', () => controller.abort(), {
    once: true,
    signal: controller.signal,
  })
}
initializeChatViewport()
document.addEventListener('astro:page-load', initializeChatViewport)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) initializeChatViewport()
})
