/**
 * Vectorize is the primary on-site search. Pagefind is loaded only after the
 * semantic endpoint has no safe result or is unavailable, while the related
 * Acecore-site section remains independent from both local search paths.
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

type NetworkSearchSource =
  'acecore' | 'systems' | 'schools' | 'wiki' | 'portal' | 'world-foundation'

type NetworkSearchResult = {
  url: string
  title: string
  section: string
  excerpt: string
  source: NetworkSearchSource
  sourceLabel: string
  rank: number
}

type NetworkSearchResponse = {
  ok: boolean
  requestId?: string
  results?: NetworkSearchResult[]
  error?: { code?: string }
}

const PAGEFIND_STYLE_ID = 'pagefind-ui-style'
const PAGEFIND_SCRIPT_ID = 'pagefind-ui-script'
const PAGEFIND_OVERRIDE_STYLE_ID = 'pagefind-ui-override-style'
const SEMANTIC_DEBOUNCE_MS = 400
const SEMANTIC_TIMEOUT_MS = 1600
const NETWORK_TIMEOUT_MS = 1800
const SEARCH_CLIENT_STORAGE_KEY = 'acecore-search-client-v1'
const SEARCH_PRIVACY_NOTICE_ID = 'semantic-search-privacy-notice'
const NETWORK_RESULT_LIMIT = 3
const MIN_QUERY_LENGTH = 2
const MAX_QUERY_LENGTH = 160
const MAX_PATH_DECODE_PASSES = 4
const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const LOCAL_NETWORK_SOURCE: NetworkSearchSource = 'acecore'
const NETWORK_SOURCE_DETAILS: Readonly<
  Record<NetworkSearchSource, { origin: string; sourceLabel: string }>
> = {
  acecore: { origin: 'https://acecore.net', sourceLabel: 'Acecore' },
  systems: {
    origin: 'https://systems.acecore.net',
    sourceLabel: 'Acecore Systems',
  },
  schools: {
    origin: 'https://schools.acecore.net',
    sourceLabel: 'Acecore Schools',
  },
  wiki: {
    origin: 'https://asv-wiki.acecore.net',
    sourceLabel: 'Aceserver WIKI',
  },
  portal: {
    origin: 'https://asv.acecore.net',
    sourceLabel: 'Aceserver Portal',
  },
  'world-foundation': {
    origin: 'https://world-foundation.acecore.net',
    sourceLabel: 'World Foundation',
  },
}

let pagefindLoadPromise: Promise<void> | null = null
let isPagefindReady = false
let semanticAbortController: AbortController | null = null
let networkAbortController: AbortController | null = null
let semanticDebounceTimer = 0
let searchSequence = 0
let semanticResultCount = 0
let networkResultCount = 0
let searchObserver: MutationObserver | null = null
let searchLifecycleBound = false

function bindSearchLifecycle() {
  if (searchLifecycleBound) return

  searchLifecycleBound = true
  document.addEventListener('astro:before-swap', () => {
    resetSearchState()
    searchObserver?.disconnect()
    searchObserver = null
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
    #pagefind-search-container .pagefind-ui__form,
    #pagefind-search-container .pagefind-ui__search-input {
      display: none !important;
    }
    .pagefind-ui__result-link {
      color: #264b7d !important;
      font-weight: 600 !important;
    }
    .pagefind-ui__result-excerpt {
      color: #64748b !important;
      font-size: 0.875rem !important;
      line-height: 1.65 !important;
    }
    .pagefind-ui__result {
      border-top: 1px solid #e2e8f0 !important;
      padding: 1rem 0 !important;
    }
    #pagefind-search-container .pagefind-ui {
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
  // Astro's head swap can detach dynamically added style nodes, so attach them
  // again whenever the fallback is requested.
  ensurePagefindStyle()
  ensurePagefindOverrideStyle()

  if (isPagefindReady && window.PagefindUI) return Promise.resolve()
  if (pagefindLoadPromise) return pagefindLoadPromise

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

function waitForPagefindInput(container: HTMLElement) {
  const existingInput = container.querySelector<HTMLInputElement>(
    '.pagefind-ui__search-input',
  )
  if (existingInput) return Promise.resolve(existingInput)

  return new Promise<HTMLInputElement | null>((resolve) => {
    const observer = new MutationObserver(() => {
      const input = container.querySelector<HTMLInputElement>(
        '.pagefind-ui__search-input',
      )
      if (!input) return
      observer.disconnect()
      resolve(input)
    })

    observer.observe(container, { childList: true, subtree: true })
    window.setTimeout(() => {
      observer.disconnect()
      resolve(
        container.querySelector<HTMLInputElement>('.pagefind-ui__search-input'),
      )
    }, 3000)
  })
}

async function ensurePagefindFallback(dialog: HTMLDialogElement) {
  const container = getPagefindContainer()
  if (!container) return null
  if (container.dataset.pagefindReady === 'true') {
    return waitForPagefindInput(container)
  }

  await loadPagefindScript()
  container.replaceChildren()
  const d = dialog.dataset
  new window.PagefindUI!({
    element: '#pagefind-search-container',
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
  return waitForPagefindInput(container)
}

function bindSearchInput(input: HTMLInputElement, dialog: HTMLDialogElement) {
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
    const query = normalizeQuery(input.value)
    const sequence = resetSearchState()
    if (!isSearchQuery(query)) return

    semanticDebounceTimer = window.setTimeout(() => {
      if (sequence !== searchSequence) return
      if (query !== lastTrackedQuery) {
        lastTrackedQuery = query
        window.aceTrackEvent?.('search_submit', {
          location: 'search_modal',
          page_path: window.location.pathname,
          page_title: document.title,
          query_length: [...query].length,
        })
      }
      void runSearch(query, dialog, sequence)
    }, SEMANTIC_DEBOUNCE_MS)
  })
}

async function runSearch(
  query: string,
  dialog: HTMLDialogElement,
  sequence: number,
) {
  await runSemanticSearch(query, dialog, sequence)
  if (sequence !== searchSequence) return
  void runNetworkSearch(query, dialog, sequence)
}

async function runSemanticSearch(
  query: string,
  dialog: HTMLDialogElement,
  sequence: number,
) {
  const controller = new AbortController()
  semanticAbortController = controller
  const timeout = window.setTimeout(
    () => controller.abort(),
    SEMANTIC_TIMEOUT_MS,
  )
  const startedAt = performance.now()
  showSemanticLoading(dialog)
  updateAd()

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
    if (sequence !== searchSequence) return
    if (
      !response.ok ||
      !payload.ok ||
      !isRequestId(payload.requestId) ||
      !Array.isArray(payload.results)
    ) {
      throw new Error(payload.error?.code || `http_${response.status}`)
    }

    const results = payload.results
      .map(normalizeSemanticResult)
      .filter((result): result is SemanticSearchResult => result !== null)
      .slice(0, 5)
    if (results.length === 0) {
      showSemanticEmpty(dialog)
      await showPagefindFallback(query, dialog, sequence)
      window.aceTrackEvent?.('semantic_search_fallback', {
        location: 'search_modal',
        page_path: window.location.pathname,
        reason: 'no_safe_results',
      })
      return
    }

    renderSemanticResults(results, dialog)
    window.aceTrackEvent?.('semantic_search_complete', {
      location: 'search_modal',
      page_path: window.location.pathname,
      result_count: results.length,
      duration_ms: Math.round(performance.now() - startedAt),
    })
  } catch (error) {
    if (sequence !== searchSequence) return

    hideSemanticSearch()
    await showPagefindFallback(query, dialog, sequence)
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
    updateAd()
  }
}

async function runNetworkSearch(
  query: string,
  dialog: HTMLDialogElement,
  sequence: number,
) {
  const networkApi = dialog.dataset.networkApi
  if (!networkApi) return

  const controller = new AbortController()
  networkAbortController = controller
  const timeout = window.setTimeout(
    () => controller.abort(),
    NETWORK_TIMEOUT_MS,
  )
  const startedAt = performance.now()

  try {
    const response = await fetch(networkApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        locale: dialog.dataset.locale || 'ja',
      }),
      credentials: 'omit',
      signal: controller.signal,
    })
    const payload = (await response.json()) as NetworkSearchResponse
    if (sequence !== searchSequence) return
    if (
      !response.ok ||
      !payload.ok ||
      !isRequestId(payload.requestId) ||
      !Array.isArray(payload.results)
    ) {
      throw new Error(payload.error?.code || `http_${response.status}`)
    }

    renderNetworkResults(payload.results, dialog)
    window.aceTrackEvent?.('network_search_complete', {
      location: 'search_modal',
      page_path: window.location.pathname,
      result_count: networkResultCount,
      duration_ms: Math.round(performance.now() - startedAt),
    })
  } catch {
    if (sequence !== searchSequence) return
    hideNetworkSearch()
    window.aceTrackEvent?.('network_search_unavailable', {
      location: 'search_modal',
      page_path: window.location.pathname,
    })
  } finally {
    window.clearTimeout(timeout)
    if (networkAbortController === controller) {
      networkAbortController = null
    }
  }
}

function showSemanticLoading(dialog: HTMLDialogElement) {
  const elements = getSemanticElements()
  if (!elements) return

  semanticResultCount = 0
  elements.section.classList.remove('hidden')
  elements.status.textContent =
    dialog.dataset.tSemanticLoading ?? 'Finding related content...'
  elements.results.replaceChildren()
}

function showSemanticEmpty(dialog: HTMLDialogElement) {
  const elements = getSemanticElements()
  if (!elements) return

  semanticResultCount = 0
  elements.section.classList.remove('hidden')
  elements.status.textContent =
    dialog.dataset.tSemanticZeroResults ?? 'No related content'
  elements.results.replaceChildren()
}

function renderSemanticResults(
  results: SemanticSearchResult[],
  dialog: HTMLDialogElement,
) {
  const elements = getSemanticElements()
  if (!elements) return

  semanticResultCount = results.length
  elements.section.classList.remove('hidden')
  elements.status.textContent = getResultStatus(
    results.length,
    dialog.dataset.tSemanticOneResult,
    dialog.dataset.tSemanticManyResults,
  )
  elements.results.replaceChildren(
    ...results.map((result) => createLocalResultItem(result)),
  )
  updateAd()
}

function hideSemanticSearch() {
  semanticResultCount = 0
  const elements = getSemanticElements()
  if (!elements) return
  elements.section.classList.add('hidden')
  elements.status.textContent = ''
  elements.results.replaceChildren()
}

function renderNetworkResults(
  results: NetworkSearchResult[],
  dialog: HTMLDialogElement,
) {
  const elements = getNetworkElements()
  if (!elements) return

  const safeResults = results
    .map(normalizeNetworkResult)
    .filter((result): result is NetworkSearchResult => result !== null)
    .slice(0, NETWORK_RESULT_LIMIT)
  networkResultCount = safeResults.length
  if (safeResults.length === 0) {
    hideNetworkSearch()
    return
  }

  elements.section.classList.remove('hidden')
  elements.status.textContent = getResultStatus(
    safeResults.length,
    dialog.dataset.tNetworkOneResult,
    dialog.dataset.tNetworkManyResults,
  )
  elements.results.replaceChildren(
    ...safeResults.map((result) => createNetworkResultItem(result)),
  )
  updateAd()
}

function hideNetworkSearch() {
  networkResultCount = 0
  const elements = getNetworkElements()
  if (!elements) return
  elements.section.classList.add('hidden')
  elements.status.textContent = ''
  elements.results.replaceChildren()
}

async function showPagefindFallback(
  query: string,
  dialog: HTMLDialogElement,
  sequence: number,
) {
  const elements = getPagefindElements()
  if (!elements) return

  elements.section.classList.remove('hidden')
  elements.status.textContent = ''
  elements.notice.textContent =
    dialog.dataset.tPagefindNotice ??
    'Showing keyword matches because semantic search is unavailable.'

  try {
    const pagefindInput = await ensurePagefindFallback(dialog)
    if (!pagefindInput || sequence !== searchSequence) return
    pagefindInput.value = query
    pagefindInput.dispatchEvent(new Event('input', { bubbles: true }))
  } catch {
    if (sequence !== searchSequence) return
    elements.notice.textContent =
      dialog.dataset.tError ?? 'Failed to load search.'
    elements.container.replaceChildren(createSearchFallback(dialog))
  } finally {
    updateAd()
  }
}

function hidePagefindSearch() {
  const elements = getPagefindElements()
  if (!elements) return
  elements.section.classList.add('hidden')
  elements.status.textContent = ''
  elements.notice.textContent = ''
}

function createLocalResultItem(result: SemanticSearchResult) {
  const item = document.createElement('li')
  item.className = 'py-3 first:pt-0 last:pb-0'

  const link = document.createElement('a')
  link.className =
    'group block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-400'
  link.href = result.url
  link.dataset.semanticResult = 'true'
  link.dataset.rank = String(result.rank)

  appendResultContent(link, result.title, result.section, result.excerpt)
  item.append(link)
  return item
}

function createNetworkResultItem(result: NetworkSearchResult) {
  const item = document.createElement('li')
  item.className = 'py-3 first:pt-0 last:pb-0'

  const link = document.createElement('a')
  link.className =
    'group block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand-400'
  link.href = result.url
  link.dataset.networkResult = 'true'
  link.dataset.rank = String(result.rank)
  link.dataset.source = result.source

  appendResultContent(link, result.title, result.section, result.excerpt)
  const source = document.createElement('span')
  source.className = 'mt-1 block text-xs font-600 text-slate-400'
  source.textContent = result.sourceLabel
  link.append(source)
  item.append(link)
  return item
}

function appendResultContent(
  link: HTMLAnchorElement,
  title: string,
  section: string,
  excerpt: string,
) {
  const heading = document.createElement('span')
  heading.className =
    'block text-sm font-700 text-brand-800 transition-colors group-hover:text-brand-600'
  heading.textContent = title
  link.append(heading)

  if (section && section !== title) {
    const sectionElement = document.createElement('span')
    sectionElement.className = 'mt-0.5 block text-xs font-600 text-slate-500'
    sectionElement.textContent = section
    link.append(sectionElement)
  }

  if (excerpt) {
    const excerptElement = document.createElement('span')
    excerptElement.className =
      'mt-1 block text-xs leading-relaxed text-slate-500 sm:text-sm'
    excerptElement.textContent = excerpt
    link.append(excerptElement)
  }
}

function normalizeSemanticResult(
  result: SemanticSearchResult,
): SemanticSearchResult | null {
  if (
    !result ||
    !isSafeText(result.title, 240) ||
    !isSafeText(result.section, 240, true) ||
    !isSafeText(result.excerpt, 500, true) ||
    !Number.isInteger(result.rank) ||
    result.rank < 1 ||
    !isSafeText(result.url, 500) ||
    !result.url.startsWith('/') ||
    result.url.startsWith('//')
  ) {
    return null
  }

  const pathname = decodePublicPathname(result.url)
  if (!pathname || isPrivateRootPath(pathname)) return null

  try {
    const url = new URL(pathname, window.location.href)
    if (url.origin === window.origin && !url.search && !url.hash) {
      return { ...result, url: pathname }
    }
    return null
  } catch {
    return null
  }
}

function normalizeNetworkResult(
  result: NetworkSearchResult,
): NetworkSearchResult | null {
  const sourceDetails = NETWORK_SOURCE_DETAILS[result?.source]
  if (
    !result ||
    !isSafeText(result.title, 240) ||
    !isSafeText(result.section, 240, true) ||
    !isSafeText(result.excerpt, 500, true) ||
    !isSafeText(result.sourceLabel, 120) ||
    !Number.isInteger(result.rank) ||
    result.rank < 1 ||
    result.rank > NETWORK_RESULT_LIMIT ||
    result.source === LOCAL_NETWORK_SOURCE ||
    !isSafeText(result.url, 500) ||
    !sourceDetails ||
    result.sourceLabel !== sourceDetails.sourceLabel
  ) {
    return null
  }

  const pathname = resolveRawNetworkPathname(result.url, sourceDetails.origin)
  if (!pathname || !isSafeNetworkPath(result.source, pathname)) return null

  return {
    ...result,
    url: `${sourceDetails.origin}${pathname}`,
  }
}

function resolveRawNetworkPathname(
  rawUrl: string,
  expectedOrigin: string,
): string | null {
  const normalizedUrl = rawUrl.normalize('NFKC')
  const prefix = `${expectedOrigin}/`
  if (!normalizedUrl.startsWith(prefix)) return null

  return decodePublicPathname(normalizedUrl.slice(expectedOrigin.length))
}

function isSafeNetworkPath(source: NetworkSearchSource, pathname: string) {
  if (
    isPrivateRootPath(pathname) ||
    (source === 'wiki' && !pathname.startsWith('/article/'))
  ) {
    return false
  }

  return !(
    source === 'portal' &&
    (/^\/(?:admin|api)(?:\/|$)/u.test(pathname) ||
      [
        '/vector-corpus.json',
        '/404',
        '/404/',
        '/404.html',
        '/404.html/',
      ].includes(pathname))
  )
}

function decodePublicPathname(pathname: string): string | null {
  let decoded = pathname

  for (let attempt = 0; attempt < MAX_PATH_DECODE_PASSES; attempt += 1) {
    decoded = decoded.normalize('NFKC')
    if (/%(?:2f|5c)/iu.test(decoded)) return null

    try {
      const next = decodeURIComponent(decoded)
      if (next === decoded) {
        return isSafeDecodedPathname(decoded) ? decoded : null
      }
      decoded = next
    } catch {
      return null
    }
  }

  const normalized = decoded.normalize('NFKC')
  return isSafeDecodedPathname(normalized) ? normalized : null
}

function isPrivateRootPath(pathname: string) {
  const firstPathSegment = pathname.split('/').find(Boolean)?.toLowerCase()
  return (
    firstPathSegment !== undefined &&
    ['admin', 'api'].includes(firstPathSegment)
  )
}

function isSafeDecodedPathname(pathname: string): boolean {
  return (
    pathname.startsWith('/') &&
    !pathname.includes('%') &&
    !pathname.includes('?') &&
    !pathname.includes('#') &&
    !pathname.includes('//') &&
    !/\s/u.test(pathname) &&
    !/[\\\u0000-\u001f\u007f]/u.test(pathname) &&
    !pathname.split('/').some((segment) => segment === '.' || segment === '..')
  )
}

function isSafeText(value: unknown, maximumLength: number, allowEmpty = false) {
  if (typeof value !== 'string') return false
  const normalized = value.normalize('NFKC').replace(/\s+/gu, ' ').trim()
  return (
    (allowEmpty || normalized.length > 0) &&
    normalized.length <= maximumLength &&
    !/[<>]/u.test(normalized)
  )
}

function isRequestId(value: unknown): value is string {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value)
}

function getResultStatus(
  count: number,
  oneResult: string | undefined,
  manyResults: string | undefined,
) {
  return count === 1
    ? (oneResult ?? '1 result found')
    : (manyResults ?? '[COUNT] results found').replace('[COUNT]', String(count))
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
    resetSearchState()
  })
}

function bindResultClickAnalytics(dialog: HTMLDialogElement) {
  if (dialog.dataset.gaClickBound === 'true') return

  dialog.dataset.gaClickBound = 'true'
  dialog.addEventListener('click', (event) => {
    const target = event.target as Element | null
    const localLink = target?.closest<HTMLAnchorElement>(
      '[data-semantic-result]',
    )
    if (localLink) {
      trackResultClick('vectorize', localLink)
      return
    }

    const networkLink = target?.closest<HTMLAnchorElement>(
      '[data-network-result]',
    )
    if (networkLink) {
      trackResultClick(
        'acecore_network',
        networkLink,
        networkLink.dataset.source,
      )
      return
    }

    const pagefindLink = target?.closest<HTMLAnchorElement>(
      '.pagefind-ui__result-link',
    )
    if (!pagefindLink || !getPagefindContainer()?.contains(pagefindLink)) return
    window.aceTrackEvent?.('search_result_click', {
      location: 'search_modal',
      source: 'pagefind_fallback',
      page_path: window.location.pathname,
      result_title: pagefindLink.textContent?.trim() || '',
      destination: pagefindLink.pathname,
    })
  })
}

function trackResultClick(
  source: string,
  link: HTMLAnchorElement,
  relatedSource?: string,
) {
  window.aceTrackEvent?.('search_result_click', {
    location: 'search_modal',
    source,
    related_source: relatedSource,
    rank: Number(link.dataset.rank || 0),
    page_path: window.location.pathname,
    destination: link.pathname,
  })
}

function bindSearchObserver() {
  const container = getPagefindContainer()
  if (!container || container.dataset.observerBound === 'true') return

  container.dataset.observerBound = 'true'
  searchObserver?.disconnect()
  searchObserver = new MutationObserver(() => updateAd())
  searchObserver.observe(container, { childList: true, subtree: true })
}

function updateAd() {
  const ad = document.getElementById('search-ad')
  if (!ad) return

  const pagefindCount = getPagefindContainer()?.querySelectorAll(
    '.pagefind-ui__result',
  ).length
  if (semanticResultCount > 0 || networkResultCount > 0 || pagefindCount) {
    ad.classList.remove('hidden')
    window.aceInitAdSlots?.(ad)
  } else {
    ad.classList.add('hidden')
  }
}

function createSearchFallback(dialog: HTMLDialogElement) {
  const d = dialog.dataset
  const fallback = document.createElement('div')
  fallback.className = 'py-3 text-sm text-slate-600'

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

function resetSearchState() {
  window.clearTimeout(semanticDebounceTimer)
  semanticDebounceTimer = 0
  semanticAbortController?.abort()
  semanticAbortController = null
  networkAbortController?.abort()
  networkAbortController = null
  searchSequence += 1
  hideSemanticSearch()
  hidePagefindSearch()
  hideNetworkSearch()
  updateAd()
  return searchSequence
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

function isSearchQuery(query: string) {
  const length = [...query].length
  return length >= MIN_QUERY_LENGTH && length <= MAX_QUERY_LENGTH
}

function getDialog() {
  return document.getElementById('search-dialog') as HTMLDialogElement | null
}

function getSearchInput() {
  return document.getElementById(
    'semantic-search-input',
  ) as HTMLInputElement | null
}

function getSemanticElements() {
  const section = document.getElementById('semantic-search')
  const status = document.getElementById('semantic-search-status')
  const results = document.getElementById('semantic-search-results')
  if (!section || !status || !results) return null
  return { section, status, results }
}

function getPagefindContainer() {
  return document.getElementById('pagefind-search-container')
}

function getPagefindElements() {
  const section = document.getElementById('pagefind-search')
  const status = document.getElementById('pagefind-search-status')
  const notice = document.getElementById('pagefind-search-notice')
  const container = getPagefindContainer()
  if (!section || !status || !notice || !container) return null
  return { section, status, notice, container }
}

function getNetworkElements() {
  const section = document.getElementById('network-search')
  const status = document.getElementById('network-search-status')
  const results = document.getElementById('network-search-results')
  if (!section || !status || !results) return null
  return { section, status, results }
}

export async function openSearch(query?: string) {
  bindSearchLifecycle()

  const dialog = getDialog()
  const input = getSearchInput()
  if (!dialog || !input) return

  bindDialogChrome(dialog)
  bindResultClickAnalytics(dialog)
  bindSearchObserver()
  bindSearchInput(input, dialog)

  if (!dialog.open) {
    dialog.showModal()
    window.aceTrackEvent?.('search_open', {
      location: 'search_modal',
      page_path: window.location.pathname,
      page_title: document.title,
    })
  }

  if (query) {
    input.value = query
    input.dispatchEvent(new Event('input', { bubbles: true }))
  } else {
    input.focus()
    if (isSearchQuery(normalizeQuery(input.value))) {
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }
}
