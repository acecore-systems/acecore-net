declare global {
  interface Window {
    __aceAdsRuntimeInitialized?: boolean
    __aceAdsScriptPromise?: Promise<void> | null
    __aceAdsScriptLoaded?: boolean
    aceEnsureAdsScript?: () => Promise<void>
    aceInitAdSlots?: (root?: ParentNode) => void
    aceRequestAdSlot?: (slot: HTMLElement) => void
    adsbygoogle?: unknown[]
  }
}

const ADS_SCRIPT_ID = 'ace-ads-script'
const RETRYABLE_AD_ERROR_PATTERN = /availableWidth=0|No slot size|All ins elements in the DOM with class=adsbygoogle already have ads in them/i

function ensureAdsScript() {
  if (window.__aceAdsScriptPromise) {
    return window.__aceAdsScriptPromise
  }

  window.__aceAdsScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      `#${ADS_SCRIPT_ID}`,
    )

    if (window.__aceAdsScriptLoaded) {
      resolve()
      return
    }

    const script = existingScript ?? document.createElement('script')

    function handleLoad() {
      window.__aceAdsScriptLoaded = true
      cleanup()
      resolve()
    }

    function handleError() {
      cleanup()
      window.__aceAdsScriptPromise = null
      script.remove()
      reject(new Error('AdSense script failed to load'))
    }

    function cleanup() {
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }

    script.id = ADS_SCRIPT_ID
    script.src =
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3935803464310919'
    script.crossOrigin = 'anonymous'
    script.async = true
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })

    if (!existingScript) {
      document.head.appendChild(script)
    }
  })

  return window.__aceAdsScriptPromise
}

function canPushAd(slot: HTMLElement) {
  if (slot.dataset.aceAdPushed === '1') return false
  if (slot.getAttribute('data-adsbygoogle-status')) return false

  const container =
    slot.closest<HTMLElement>('[data-ace-ad-container]') ?? slot
  const rect = container.getBoundingClientRect()
  const style = window.getComputedStyle(container)

  if (rect.width < 160) return false
  if (style.display === 'none' || style.visibility === 'hidden') return false

  return true
}

async function pushAdSlot(slot: HTMLElement) {
  if (!canPushAd(slot)) return false

  await ensureAdsScript()

  if (!canPushAd(slot)) return false

  try {
    ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    slot.dataset.aceAdPushed = '1'
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    if (!RETRYABLE_AD_ERROR_PATTERN.test(message)) {
      console.warn('AdSense load failed:', error)
    }

    return false
  }
}

function observeAdSlot(slot: HTMLElement) {
  if (slot.dataset.aceAdObserved === '1') return

  slot.dataset.aceAdObserved = '1'

  const container =
    slot.closest<HTMLElement>('[data-ace-ad-container]') ?? slot
  let intersectionObserver: IntersectionObserver | null = null
  let resizeObserver: ResizeObserver | null = null

  const cleanup = () => {
    intersectionObserver?.disconnect()
    resizeObserver?.disconnect()
  }

  const attemptInit = async () => {
    if (slot.dataset.aceAdPushed === '1') {
      cleanup()
      return
    }

    const pushed = await pushAdSlot(slot)
    if (pushed) {
      cleanup()
    }
  }

  if ('IntersectionObserver' in window) {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void attemptInit()
        }
      },
      { rootMargin: '200px' },
    )
    intersectionObserver.observe(container)
  }

  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      void attemptInit()
    })
    resizeObserver.observe(container)
  }

  void attemptInit()
}

function initAdSlots(root: ParentNode = document) {
  root
    .querySelectorAll<HTMLElement>('[data-ace-ad-slot].adsbygoogle')
    .forEach((slot) => {
      observeAdSlot(slot)
    })
}

export function initAdsRuntime() {
  if (window.__aceAdsRuntimeInitialized) {
    return
  }

  window.__aceAdsRuntimeInitialized = true
  window.aceEnsureAdsScript = ensureAdsScript
  window.aceInitAdSlots = initAdSlots
  window.aceRequestAdSlot = (slot: HTMLElement) => {
    observeAdSlot(slot)
  }

  initAdSlots()
  document.addEventListener('astro:page-load', () => initAdSlots())
}
