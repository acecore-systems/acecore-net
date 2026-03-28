declare global {
  interface Window {
    PagefindUI?: new (options: Record<string, unknown>) => unknown
    aceTrackEvent?: (name: string, params?: Record<string, unknown>) => void
    aceInitAdSlots?: (root?: ParentNode) => void
  }
}

let searchObserver: MutationObserver | null = null
let pagefindLoadPromise: Promise<void> | null = null
let isPagefindReady = false

const PAGEFIND_STYLE_ID = 'pagefind-ui-style'
const PAGEFIND_SCRIPT_ID = 'pagefind-ui-script'
const PAGEFIND_OVERRIDE_STYLE_ID = 'pagefind-ui-override-style'

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
      border-color: #e2e8f0 !important;
      font-size: 0.95rem !important;
      padding: 0.625rem 1rem 0.625rem 2.5rem !important;
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
    }
    .pagefind-ui__result {
      padding: 0.75rem 0 !important;
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
  if (isPagefindReady && window.PagefindUI) {
    return Promise.resolve()
  }
  if (pagefindLoadPromise) {
    return pagefindLoadPromise
  }

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

    function detachHandlers() {
      script.removeEventListener('load', handleLoad)
      script.removeEventListener('error', handleError)
    }

    function handleLoad() {
      detachHandlers()
      isPagefindReady = true
      resolve()
    }

    function handleError() {
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

    if (!existingScript) {
      document.head.appendChild(script)
    }
  })

  return pagefindLoadPromise
}

function waitForSearchInput(dialog: HTMLDialogElement) {
  const existingInput = dialog.querySelector<HTMLInputElement>(
    '.pagefind-ui__search-input',
  )
  if (existingInput) {
    return Promise.resolve(existingInput)
  }

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
      resolve(dialog.querySelector<HTMLInputElement>('.pagefind-ui__search-input'))
    }, 3000)
  })
}

function showSearchLoading(container: HTMLElement) {
  const dialog = document.getElementById('search-dialog') as HTMLDialogElement | null
  const loadingText = dialog?.dataset.tLoading ?? 'Loading search...'
  container.innerHTML = `<p class="px-1 py-4 text-sm text-slate-600">${loadingText}</p>`
}

function showSearchError(container: HTMLElement, retry: () => void) {
  const dialog = document.getElementById('search-dialog') as HTMLDialogElement | null
  const errorText = dialog?.dataset.tError ?? 'Failed to load search.'
  const retryText = dialog?.dataset.tRetry ?? 'Retry'
  container.innerHTML =
    '<div class="px-1 py-4 space-y-3">' +
    `<p class="text-sm text-red-700">${errorText}</p>` +
    `<button type="button" class="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm font-600 text-slate-700 hover:bg-slate-50 transition-colors" data-search-retry>${retryText}</button>` +
    '</div>'

  container
    .querySelector<HTMLButtonElement>('[data-search-retry]')
    ?.addEventListener('click', retry, { once: true })
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

  container.innerHTML = ''
  const d = dialog.dataset
  new window.PagefindUI!({
    element: '#search-container',
    showSubResults: false,
    showImages: false,
    showFilters: true,
    translations: {
      placeholder: d.tPlaceholder ?? 'Enter keywords…',
      zero_results: d.tZeroResults ?? 'No articles found matching "[SEARCH_TERM]"',
      many_results: d.tManyResults ?? '[COUNT] articles found',
      one_result: d.tOneResult ?? '1 article found',
      filters_label: d.tFilters ?? 'Filters',
    },
  })
  container.dataset.pagefindReady = 'true'

  return waitForSearchInput(dialog)
}

function bindSearchInputAnalytics(input: HTMLInputElement | null) {
  if (!input || input.dataset.gaBound === 'true') return

  input.dataset.gaBound = 'true'
  let debounceTimer = 0
  let lastTrackedQuery = ''

  input.addEventListener('input', () => {
    window.clearTimeout(debounceTimer)
    debounceTimer = window.setTimeout(() => {
      const value = input.value.trim()
      if (value.length < 2 || value === lastTrackedQuery) return

      lastTrackedQuery = value
      window.aceTrackEvent?.('search_submit', {
        location: 'search_modal',
        page_path: window.location.pathname,
        page_title: document.title,
        search_term: value,
      })
    }, 400)
  })
}

function bindDialogChrome(dialog: HTMLDialogElement) {
  if (dialog.dataset.chromeBound === 'true') return

  dialog.dataset.chromeBound = 'true'
  const closeBtn = document.getElementById('search-close')
  closeBtn?.addEventListener('click', () => dialog.close())

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close()
    }
  })
}

function bindResultClickAnalytics(dialog: HTMLDialogElement, container: HTMLElement) {
  if (container.dataset.gaClickBound === 'true') return

  container.dataset.gaClickBound = 'true'
  container.addEventListener('click', (event) => {
    const target = event.target as Element | null
    const resultLink = target?.closest('.pagefind-ui__result-link') as
      | HTMLAnchorElement
      | null
    if (!resultLink) return

    const searchInput = dialog.querySelector<HTMLInputElement>(
      '.pagefind-ui__search-input',
    )
    window.aceTrackEvent?.('search_result_click', {
      location: 'search_modal',
      page_path: window.location.pathname,
      page_title: document.title,
      search_term: searchInput?.value.trim() || '',
      result_title: resultLink.textContent?.trim() || '',
      destination: resultLink.href,
    })
  })
}

function bindSearchObserver(dialog: HTMLDialogElement, container: HTMLElement) {
  searchObserver?.disconnect()

  searchObserver = new MutationObserver(() => {
    const results = document.querySelector('.pagefind-ui__results-area')
    const ad = document.getElementById('search-ad')
    const message = document.querySelector('.pagefind-ui__message')
    let fallback = document.getElementById('search-fallback')
    const d = dialog.dataset

    if (message?.textContent && !document.querySelector('.pagefind-ui__result')) {
      if (!fallback) {
        fallback = document.createElement('div')
        fallback.id = 'search-fallback'
        fallback.className = 'px-1 py-3 text-sm text-slate-600'
        const blogLink = d.linkBlog ?? '/blog/'
        const servicesLink = d.linkServices ?? '/services/'
        const contactLink = d.linkContact ?? '/contact/'
        fallback.innerHTML =
          `<p class="mb-2">${d.tFallbackHeading ?? 'You may also try:'}</p>` +
          '<ul class="space-y-1 list-none p-0 m-0">' +
          `<li><a href="${blogLink}" class="ac-link">${d.tFallbackBlog ?? '→ Browse all articles'}</a></li>` +
          `<li><a href="${servicesLink}" class="ac-link">${d.tFallbackServices ?? '→ View services'}</a></li>` +
          `<li><a href="${contactLink}" class="ac-link">${d.tFallbackContact ?? '→ Contact us'}</a></li>` +
          '</ul>'
        message.parentNode?.insertBefore(fallback, message.nextSibling)
      }
    } else {
      fallback?.remove()
    }

    if (ad) {
      if (results && results.children.length > 0) {
        ad.classList.remove('hidden')
        window.aceInitAdSlots?.(ad)
      } else {
        ad.classList.add('hidden')
      }
    }
  })

  searchObserver.observe(container, { childList: true, subtree: true })
}

function getDialogElements() {
  const dialog = document.getElementById('search-dialog') as HTMLDialogElement | null
  const container = document.getElementById('search-container')

  if (!dialog || !container) {
    return null
  }

  return { dialog, container }
}

export async function openSearch(query?: string) {
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
    bindSearchInputAnalytics(input)
    if (query && input) {
      input.value = query
      input.dispatchEvent(new Event('input', { bubbles: true }))
    } else {
      input?.focus()
    }
  } catch {
    showSearchError(container, () => {
      void openSearch(query)
    })
  }
}
