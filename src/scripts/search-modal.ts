/**
 * Pagefindを主検索として維持し、Vectorizeの意味検索結果を補助表示する。
 * 意味検索が失敗・制限・未設定の場合もPagefindだけで検索を継続できる。
 */
declare global {
  interface Window {
    PagefindUI?: new (options: Record<string, unknown>) => unknown
    aceTrackEvent?: (name: string, params?: Record<string, unknown>) => void
    aceInitAdSlots?: (root?: ParentNode) => void
  }
}

type SemanticSearchResult = {
  id: string
  url: string
  title: string
  section: string
  excerpt: string
  contentType: string
  rank: number
}

type SemanticSearchResponse = {
  ok: boolean
  requestId?: string
  results?: SemanticSearchResult[]
  error?: { code?: string }
}

let searchObserver: MutationObserver | null = null
let pagefindLoadPromise: Promise<void> | null = null
let isPagefindReady = false
let semanticAbortController: AbortController | null = null
let semanticDebounceTimer = 0
let semanticSequence = 0
let semanticResultCount = 0
let semanticState: 'idle' | 'loading' | 'ready' | 'empty' | 'hidden' = 'idle'

const PAGEFIND_STYLE_ID = 'pagefind-ui-style'
const PAGEFIND_SCRIPT_ID = 'pagefind-ui-script'
const PAGEFIND_OVERRIDE_STYLE_ID = 'pagefind-ui-override-style'
const SEMANTIC_DEBOUNCE_MS = 400
const SEMANTIC_TIMEOUT_MS = 1600
const SEARCH_CLIENT_STORAGE_KEY = 'acecore-search-client-v1'
const SEARCH_PRIVACY_NOTICE_ID = 'semantic-search-privacy-notice'
let searchLifecycleBound = false

function bindSearchLifecycle() {
  if (searchLifecycleBound) return

  searchLifecycleBound = true
  document.addEventListener('astro:before-swap', () => {
    window.clearTimeout(semanticDebounceTimer)
    semanticDebounceTimer = 0
    searchObserver?.disconnect()
    searchObserver = null
    hideSemanticSearch()
  })
}

function ensurePagefindStyle() {
  if (document.getElementById(PAGEFIND_STYLE_ID)) return

  const link = document.createElement('link')
  link.id = PAGEFIND_STYLE_ID
  link.rel = 'stylesheet'
  link.href = '/pagefind/pagefind-ui.css'
  document.head.appendChild(link)
}

function ensurePagefindOverrideStyle() {
  if (document.getElementById(PAGEFIND_OVERRIDE_STYLE_ID)) return

  const style = document.createElement('style')
  style.id = PAGEFIND_OVERRIDE_STYLE_ID
  style.textContent = `
    .pagefind-ui__search-input {
      border-radius: 0.5rem !important;
      border-color: #cbd5e1 !important;
      font-size: 1rem !important;
      min-height: 3rem !important;
      padding: 0.75rem 1rem 0.75rem 2.75rem !important;
    }
    .pagefind-ui__search-input:focus {
      border-color: #7fa4cf !important;
      box-shadow: 0 0 0 2px rgba(127, 164, 207, 0.25) !important;
      outline: none !important;
    }
    .pagefind-ui__result-link {
      color: #264b7d !important;
      font-weight: 600 !important;
    }
    .pagefind-ui__result-excerpt {
      font-size: 0.875rem !important;
      color: #64748b !important;
      line-height: 1.65 !important;
    }
    .pagefind-ui__result {
      border-top: 1px solid #e2e8f0 !important;
      padding: 1rem 0 !important;
    }
    #search-container .pagefind-ui {
      --pagefind-ui-primary: #264b7d;
      --pagefind-ui-border: #e2e8f0;
      --pagefind-ui-border-width: 1px;
      --pagefind-ui-border-radius: 0.5rem;
      --pagefind-ui-scale: 0.9;
    }
  `
  document.head.appendChild(style)
}

function loadPagefindScript() {
  if (isPagefindReady && window.PagefindUI) return Promise.resolve()
  if (pagefindLoadPromise) return pagefindLoadPromise

  ensurePagefindStyle()
  ensurePagefindOverrideStyle()

  pagefindLoadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(
      PAGEFIND_SCRIPT_ID,
    ) as HTMLScriptElement | null
    if (existingScript && window.PagefindUI) {
      isPagefindReady = true
      resolve()
      return
    }

    const script = existingScript ?? document.createElement('script')
    const detachHandlers = () => {
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }
    const handleLoad = () => {
      detachHandlers()
      isPagefindReady = true
      resolve()
    }
    const handleError = () => {
      detachHandlers()
      pagefindLoadPromise = null
      isPagefindReady = false
      script.remove()
      reject(new Error('Pagefind script failed to load'))
    }

    script.id = PAGEFIND_SCRIPT_ID
    script.src = '/pagefind/pagefind-ui.js'
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
    if (!existingScript) document.head.appendChild(script)
  })

  return pagefindLoadPromise
}

function waitForSearchInput(dialog: HTMLDialogElement) {
  const existingInput = dialog.querySelector<HTMLInputElement>(
    '.pagefind-ui__search-input',
  )
  if (existingInput) return Promise.resolve(existingInput)

  return new Promise<HTMLInputElement | null>((resolve) => {
    const observer = new MutationObserver(() => {
      const input = dialog.querySelector<HTMLInputElement>(
        '.pagefind-ui__search-input',
      )
      if (!input) return
      observer.disconnect()
      resolve(input)
    })

    observer.observe(dialog, { childList: true, subtree: true })
    window.setTimeout(() => {
      observer.disconnect()
      resolve(
        dialog.querySelector<HTMLInputElement>('.pagefind-ui__search-input'),
      )
    }, 3000)
  })
}

function showSearchLoading(container: HTMLElement) {
  const dialog = getDialog()
  const message = document.createElement('p')
  message.className = 'px-1 py-5 text-sm text-slate-600'
  message.textContent = dialog?.dataset.tLoading ?? 'Loading search...'
  container.replaceChildren(message)
}

function showSearchError(container: HTMLElement, retry: () => void) {
  const dialog = getDialog()
  const wrapper = document.createElement('div')
  wrapper.className = 'space-y-3 px-1 py-5'

  const message = document.createElement('p')
  message.className = 'text-sm text-red-700'
  message.textContent =
    dialog?.dataset.tError ?? 'Failed to load search. Please try again.'

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'ac-btn-outline text-sm'
  button.textContent = dialog?.dataset.tRetry ?? 'Retry'
  button.addEventListener('click', retry, { once: true })

  wrapper.append(message, button)
  container.replaceChildren(wrapper)
}

async function ensureSearchUi(
  dialog: HTMLDialogElement,
  container: HTMLElement,
) {
  if (container.dataset.pagefindReady === 'true') {
    return waitForSearchInput(dialog)
  }

  showSearchLoading(container)
  await loadPagefindScript()

  container.replaceChildren()
  const d = dialog.dataset
  new window.PagefindUI!({
    element: '#search-container',
    showSubResults: false,
    showImages: false,
    showFilters: true,
    translations: {
      placeholder: d.tPlaceholder ?? 'Enter keywords…',
      zero_results: d.tZeroResults ?? 'No results for "[SEARCH_TERM]"',
      many_results: d.tManyResults ?? '[COUNT] results found',
      one_result: d.tOneResult ?? '1 result found',
      filters_label: d.tFilters ?? 'Filters',
    },
  })
  container.dataset.pagefindReady = 'true'

  return waitForSearchInput(dialog)
}

function bindSearchInput(
  input: HTMLInputElement | null,
  dialog: HTMLDialogElement,
  container: HTMLElement,
) {
  if (!input) return

  const describedBy = new Set(
    (input.getAttribute('aria-describedby') || '')
      .split(/\s+/u)
      .filter(Boolean),
  )
  describedBy.add(SEARCH_PRIVACY_NOTICE_ID)
  input.setAttribute('aria-describedby', [...describedBy].join(' '))

  if (input.dataset.searchBound === 'true') return

  input.dataset.searchBound = 'true'
  let lastTrackedQuery = ''

  input.addEventListener('input', () => {
    window.clearTimeout(semanticDebounceTimer)
    hideSemanticSearch()
    const query = normalizeQuery(input.value)

    if (query.length < 2) {
      updateFallbackAndAd(dialog, container)
      return
    }

    semanticDebounceTimer = window.setTimeout(() => {
      if (hasActivePagefindFilter(container)) {
        hideSemanticSearch()
        updateFallbackAndAd(dialog, container)
        return
      }

      if (query !== lastTrackedQuery) {
        lastTrackedQuery = query
        window.aceTrackEvent?.('search_submit', {
          location: 'search_modal',
          page_path: window.location.pathname,
          page_title: document.title,
          query_length: [...query].length,
        })
      }

      void runSemanticSearch(query, dialog, container)
    }, SEMANTIC_DEBOUNCE_MS)
  })

  container.addEventListener('change', () => {
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function runSemanticSearch(
  query: string,
  dialog: HTMLDialogElement,
  container: HTMLElement,
) {
  const sequence = ++semanticSequence
  const controller = new AbortController()
  semanticAbortController = controller
  const timeout = window.setTimeout(
    () => controller.abort(),
    SEMANTIC_TIMEOUT_MS,
  )
  const startedAt = performance.now()
  showSemanticLoading(dialog)
  updateFallbackAndAd(dialog, container)

  try {
    const response = await fetch('/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Acecore-Search-Client': getSearchClientId(),
      },
      body: JSON.stringify({
        query,
        locale: dialog.dataset.locale || 'ja',
      }),
      credentials: 'same-origin',
      signal: controller.signal,
    })
    const payload = (await response.json()) as SemanticSearchResponse
    if (sequence !== semanticSequence) return

    if (!response.ok || !payload.ok || !Array.isArray(payload.results)) {
      throw new Error(payload.error?.code || `http_${response.status}`)
    }

    renderSemanticResults(payload.results, dialog)
    updateFallbackAndAd(dialog, container)
    window.aceTrackEvent?.('semantic_search_complete', {
      location: 'search_modal',
      page_path: window.location.pathname,
      result_count: payload.results.length,
      duration_ms: Math.round(performance.now() - startedAt),
    })
  } catch (error) {
    if (sequence !== semanticSequence) return

    hideSemanticSearch()
    updateFallbackAndAd(dialog, container)
    window.aceTrackEvent?.('semantic_search_fallback', {
      location: 'search_modal',
      page_path: window.location.pathname,
      reason:
        error instanceof DOMException && error.name === 'AbortError'
          ? 'timeout_or_cancelled'
          : 'unavailable',
    })
  } finally {
    window.clearTimeout(timeout)
    if (semanticAbortController === controller) {
      semanticAbortController = null
    }
  }
}

function showSemanticLoading(dialog: HTMLDialogElement) {
  const elements = getSemanticElements()
  if (!elements) return

  semanticState = 'loading'
  semanticResultCount = 0
  elements.section.classList.remove('hidden')
  elements.status.textContent =
    dialog.dataset.tSemanticLoading ?? 'Finding related content...'
  elements.results.replaceChildren()
}

function renderSemanticResults(
  results: SemanticSearchResult[],
  dialog: HTMLDialogElement,
) {
  const elements = getSemanticElements()
  if (!elements) return

  const safeResults = results.filter(isSafeSemanticResult).slice(0, 5)
  semanticResultCount = safeResults.length
  semanticState = safeResults.length > 0 ? 'ready' : 'empty'
  elements.section.classList.remove('hidden')
  elements.status.textContent =
    safeResults.length === 0
      ? (dialog.dataset.tSemanticZeroResults ?? 'No related content')
      : safeResults.length === 1
        ? (dialog.dataset.tSemanticOneResult ?? '1 related result')
        : (
            dialog.dataset.tSemanticManyResults ?? '[COUNT] related results'
          ).replace('[COUNT]', String(safeResults.length))

  const items = safeResults.map((result) => {
    const item = document.createElement('li')
    item.className = 'py-3 first:pt-0 last:pb-0'

    const link = document.createElement('a')
    link.className =
      'group block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-400'
    link.href = result.url
    link.dataset.semanticResult = 'true'
    link.dataset.rank = String(result.rank)

    const heading = document.createElement('span')
    heading.className =
      'block text-sm font-700 text-brand-800 transition-colors group-hover:text-brand-600'
    heading.textContent = result.title

    if (result.section && result.section !== result.title) {
      const section = document.createElement('span')
      section.className = 'mt-0.5 block text-xs font-600 text-slate-500'
      section.textContent = result.section
      link.append(heading, section)
    } else {
      link.append(heading)
    }

    if (result.excerpt) {
      const excerpt = document.createElement('span')
      excerpt.className =
        'mt-1 block text-xs leading-relaxed text-slate-500 sm:text-sm'
      excerpt.textContent = result.excerpt
      link.append(excerpt)
    }

    item.append(link)
    return item
  })
  elements.results.replaceChildren(...items)
}

function hideSemanticSearch() {
  semanticAbortController?.abort()
  semanticAbortController = null
  semanticSequence += 1
  semanticResultCount = 0
  semanticState = 'hidden'

  const elements = getSemanticElements()
  if (!elements) return
  elements.section.classList.add('hidden')
  elements.status.textContent = ''
  elements.results.replaceChildren()
}

function isSafeSemanticResult(result: SemanticSearchResult) {
  if (
    !result ||
    typeof result.url !== 'string' ||
    typeof result.title !== 'string' ||
    typeof result.rank !== 'number' ||
    !result.url.startsWith('/') ||
    result.url.startsWith('//')
  ) {
    return false
  }

  try {
    return new URL(result.url, window.location.href).origin === window.origin
  } catch {
    return false
  }
}

function hasActivePagefindFilter(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
      '.pagefind-ui__filter-panel input, .pagefind-ui__filter-panel select',
    ),
  ).some((control) =>
    control instanceof HTMLInputElement
      ? control.checked
      : Boolean(control.value),
  )
}

function bindDialogChrome(dialog: HTMLDialogElement) {
  if (dialog.dataset.chromeBound === 'true') return

  dialog.dataset.chromeBound = 'true'
  document
    .getElementById('search-close')
    ?.addEventListener('click', () => dialog.close())

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
  dialog.addEventListener('close', () => {
    window.clearTimeout(semanticDebounceTimer)
    hideSemanticSearch()
  })
}

function bindResultClickAnalytics(
  dialog: HTMLDialogElement,
  container: HTMLElement,
) {
  if (dialog.dataset.gaClickBound === 'true') return

  dialog.dataset.gaClickBound = 'true'
  dialog.addEventListener('click', (event) => {
    const target = event.target as Element | null
    const semanticLink = target?.closest<HTMLAnchorElement>(
      '[data-semantic-result]',
    )
    if (semanticLink) {
      window.aceTrackEvent?.('search_result_click', {
        location: 'search_modal',
        source: 'vectorize',
        rank: Number(semanticLink.dataset.rank || 0),
        page_path: window.location.pathname,
        destination: semanticLink.pathname,
      })
      return
    }

    const pagefindLink = target?.closest<HTMLAnchorElement>(
      '.pagefind-ui__result-link',
    )
    if (!pagefindLink || !container.contains(pagefindLink)) return

    window.aceTrackEvent?.('search_result_click', {
      location: 'search_modal',
      source: 'pagefind',
      page_path: window.location.pathname,
      result_title: pagefindLink.textContent?.trim() || '',
      destination: pagefindLink.pathname,
    })
  })
}

function bindSearchObserver(dialog: HTMLDialogElement, container: HTMLElement) {
  searchObserver?.disconnect()
  searchObserver = new MutationObserver(() => {
    updateFallbackAndAd(dialog, container)
  })
  searchObserver.observe(container, { childList: true, subtree: true })
}

function updateFallbackAndAd(
  dialog: HTMLDialogElement,
  container: HTMLElement,
) {
  const resultsArea = container.querySelector('.pagefind-ui__results-area')
  const pagefindResults = container.querySelectorAll('.pagefind-ui__result')
  const message = container.querySelector('.pagefind-ui__message')
  const ad = document.getElementById('search-ad')
  let fallback = document.getElementById('search-fallback')
  const pagefindHasResults = pagefindResults.length > 0
  const semanticHasResults = semanticResultCount > 0
  const shouldShowFallback =
    Boolean(message?.textContent) &&
    !pagefindHasResults &&
    !semanticHasResults &&
    semanticState !== 'loading'

  if (shouldShowFallback && !fallback) {
    fallback = createSearchFallback(dialog)
    message?.parentNode?.insertBefore(fallback, message.nextSibling)
  } else if (!shouldShowFallback) {
    fallback?.remove()
  }

  if (!ad) return
  if ((resultsArea && pagefindHasResults) || semanticHasResults) {
    ad.classList.remove('hidden')
    window.aceInitAdSlots?.(ad)
  } else {
    ad.classList.add('hidden')
  }
}

function createSearchFallback(dialog: HTMLDialogElement) {
  const d = dialog.dataset
  const fallback = document.createElement('div')
  fallback.id = 'search-fallback'
  fallback.className = 'px-1 py-4 text-sm text-slate-600'

  const heading = document.createElement('p')
  heading.className = 'mb-2'
  heading.textContent = d.tFallbackHeading ?? 'You may also try:'

  const list = document.createElement('ul')
  list.className = 'm-0 list-none space-y-2 p-0'
  const links = [
    [d.linkBlog ?? '/blog/', d.tFallbackBlog ?? '→ Browse all articles'],
    [d.linkServices ?? '/services/', d.tFallbackServices ?? '→ View services'],
    [d.linkContact ?? '/contact/', d.tFallbackContact ?? '→ Contact us'],
  ]

  for (const [href, label] of links) {
    const item = document.createElement('li')
    const link = document.createElement('a')
    link.className = 'ac-link'
    link.href = href
    link.textContent = label
    item.append(link)
    list.append(item)
  }

  fallback.append(heading, list)
  return fallback
}

function getSearchClientId() {
  try {
    const existing = sessionStorage.getItem(SEARCH_CLIENT_STORAGE_KEY)
    if (existing) return existing

    const clientId = crypto.randomUUID()
    sessionStorage.setItem(SEARCH_CLIENT_STORAGE_KEY, clientId)
    return clientId
  } catch {
    return crypto.randomUUID()
  }
}

function normalizeQuery(value: string) {
  return value.normalize('NFKC').replace(/\s+/gu, ' ').trim()
}

function getDialog() {
  return document.getElementById('search-dialog') as HTMLDialogElement | null
}

function getSemanticElements() {
  const section = document.getElementById('semantic-search')
  const status = document.getElementById('semantic-search-status')
  const results = document.getElementById('semantic-search-results')
  if (!section || !status || !results) return null
  return { section, status, results }
}

function getDialogElements() {
  const dialog = getDialog()
  const container = document.getElementById('search-container')
  return dialog && container ? { dialog, container } : null
}

export async function openSearch(query?: string) {
  bindSearchLifecycle()

  const elements = getDialogElements()
  if (!elements) return

  const { dialog, container } = elements
  bindDialogChrome(dialog)
  bindResultClickAnalytics(dialog, container)
  bindSearchObserver(dialog, container)

  if (!dialog.open) {
    dialog.showModal()
    window.aceTrackEvent?.('search_open', {
      location: 'search_modal',
      page_path: window.location.pathname,
      page_title: document.title,
    })
  }

  try {
    const input = await ensureSearchUi(dialog, container)
    bindSearchInput(input, dialog, container)
    if (query && input) {
      input.value = query
      input.dispatchEvent(new Event('input', { bubbles: true }))
    } else if (input) {
      input.focus()
      if (normalizeQuery(input.value).length >= 2) {
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
  } catch {
    showSearchError(container, () => {
      void openSearch(query)
    })
  }
}
