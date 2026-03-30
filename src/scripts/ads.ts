/**
 * Google AdSense ランタイム管理モジュール
 *
 * ブログページで AdSense 広告スロットを遅延読み込み・初期化するためのスクリプト。
 *
 * 主な処理フロー:
 *   1. initAdsRuntime() がエントリポイント。ページ内の広告スロットを検出し監視を開始する。
 *   2. 各広告スロットに対して IntersectionObserver（ビューポート接近検知）と
 *      ResizeObserver（コンテナサイズ変更検知）を設定する。
 *   3. スロットが可視領域に近づくと AdSense スクリプトを遅延ロードし、広告リクエストを発行する。
 *   4. 重複防止: data-ace-ad-pushed / data-ace-ad-observed 属性で二重初期化を防ぐ。
 *   5. Astro View Transitions に対応し、ページ遷移後も自動で再初期化する。
 *
 * グローバル公開 API（window 経由でアクセス可能）:
 *   - aceEnsureAdsScript(): AdSense スクリプトのロードを保証する
 *   - aceInitAdSlots(root): 指定ルート内の広告スロットをまとめて初期化する
 *   - aceRequestAdSlot(slot): 個別の広告スロットを初期化する
 */
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

/** AdSense スクリプト要素の識別用 ID */
const ADS_SCRIPT_ID = 'ace-ads-script'
/** リトライ可能な AdSense エラーの判定パターン（幅 0 やスロット重複など一時的なエラー） */
const RETRYABLE_AD_ERROR_PATTERN = /availableWidth=0|No slot size|All ins elements in the DOM with class=adsbygoogle already have ads in them/i

/**
 * AdSense のメインスクリプトをページに挿入し、ロード完了を Promise で返す。
 * 既にロード済みの場合はキャッシュされた Promise を返す。
 * ロード失敗時はキャッシュをクリアして再試行可能にする。
 */
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

/**
 * 広告スロットが広告リクエスト可能な状態かどうかを判定する。
 * - すでに push 済み、または AdSense がステータスを設定済みなら false
 * - コンテナ幅が最小幅 (160px) 未満、または非表示なら false
 */
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

/**
 * 広告スロットに対して adsbygoogle.push() を実行する。
 * AdSense スクリプトのロードを待ってから push し、
 * リトライ可能なエラー（幅 0 等）は静かに無視する。
 */
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

/**
 * 広告スロットに IntersectionObserver と ResizeObserver を設定する。
 * スロットがビューポートに近づいた（rootMargin: 200px）とき、
 * またはコンテナサイズが変わったときに広告リクエストを試行する。
 * push 成功後は両 Observer を自動で切断する。
 */
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

/** 指定ルート内のすべての広告スロット要素を検出し、Observer を設定する */
function initAdSlots(root: ParentNode = document) {
  root
    .querySelectorAll<HTMLElement>('[data-ace-ad-slot].adsbygoogle')
    .forEach((slot) => {
      observeAdSlot(slot)
    })
}

/**
 * AdSense ランタイムを初期化するエントリポイント。
 * - グローバル API を window に公開する
 * - 現在のページ内の広告スロットを初期化する
 * - astro:page-load イベントで View Transitions 後も再初期化する
 * - 二重初期化防止フラグ付き
 */
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
