import assert from 'node:assert/strict'
import { test } from 'node:test'

class ElementMock {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase()
    this.id = ''
    this.rel = ''
    this.href = ''
    this.src = ''
    this.className = ''
    this.textContent = ''
    this.value = ''
    this.open = false
    this.dataset = {}
    this.children = []
    this.parentElement = null
    this.attributes = new Map()
    this.listeners = new Map()
    this.classList = {
      add: (...names) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean))
        for (const name of names) classes.add(name)
        this.className = [...classes].join(' ')
      },
      remove: (...names) => {
        const removed = new Set(names)
        this.className = this.className
          .split(/\s+/)
          .filter((name) => name && !removed.has(name))
          .join(' ')
      },
    }
  }

  append(...children) {
    for (const child of children) this.appendChild(child)
  }

  appendChild(child) {
    child.parentElement = this
    this.children.push(child)
    if (this.tagName === 'HEAD' && child.tagName === 'SCRIPT') {
      queueMicrotask(() => child.emit('load'))
    }
    return child
  }

  replaceChildren(...children) {
    for (const child of this.children) child.parentElement = null
    this.children = []
    this.append(...children)
  }

  remove() {
    if (!this.parentElement) return
    this.parentElement.children = this.parentElement.children.filter(
      (child) => child !== this,
    )
    this.parentElement = null
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener)
  }

  emit(type) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ type, target: this })
    }
  }

  dispatchEvent(event) {
    this.emit(event.type)
    return true
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value))
  }

  querySelector(selector) {
    return findElement(this, selector)
  }

  querySelectorAll(selector) {
    return findElements(this, selector)
  }

  contains(element) {
    return (
      element === this || this.children.some((child) => child.contains(element))
    )
  }

  focus() {}

  showModal() {
    this.open = true
  }

  close() {
    this.open = false
  }
}

function matchesSelector(element, selector) {
  if (selector.startsWith('#')) return element.id === selector.slice(1)
  if (selector.startsWith('.')) {
    return element.className.split(/\s+/).includes(selector.slice(1))
  }
  return element.tagName.toLowerCase() === selector.toLowerCase()
}

function findElement(root, selector) {
  for (const child of root.children) {
    if (matchesSelector(child, selector)) return child
    const nested = findElement(child, selector)
    if (nested) return nested
  }
  return null
}

function findElements(root, selector) {
  const matches = []
  for (const child of root.children) {
    if (matchesSelector(child, selector)) matches.push(child)
    matches.push(...findElements(child, selector))
  }
  return matches
}

class DocumentMock {
  constructor() {
    this.head = new ElementMock('head')
    this.body = new ElementMock('body')
    this.title = 'Search modal test'
    this.listeners = new Map()
  }

  createElement(tagName) {
    return new ElementMock(tagName)
  }

  getElementById(id) {
    return (
      (this.head.id === id ? this.head : findElement(this.head, `#${id}`)) ??
      (this.body.id === id ? this.body : findElement(this.body, `#${id}`))
    )
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }
}

class MutationObserverMock {
  observe() {}

  disconnect() {}
}

function createElement(documentMock, id) {
  const element = documentMock.createElement('div')
  element.id = id
  return element
}

function installSearchSurface(documentMock) {
  const dialog = documentMock.createElement('dialog')
  dialog.id = 'search-dialog'
  dialog.dataset.locale = 'en'
  dialog.dataset.networkApi = 'https://acecore.net/api/network-search'

  const closeButton = documentMock.createElement('button')
  closeButton.id = 'search-close'
  const input = documentMock.createElement('input')
  input.id = 'semantic-search-input'
  const privacy = createElement(documentMock, 'semantic-search-privacy-notice')
  const semantic = createElement(documentMock, 'semantic-search')
  const semanticStatus = createElement(documentMock, 'semantic-search-status')
  const semanticResults = documentMock.createElement('ol')
  semanticResults.id = 'semantic-search-results'
  semantic.append(semanticStatus, semanticResults)
  const pagefind = createElement(documentMock, 'pagefind-search')
  const pagefindStatus = createElement(documentMock, 'pagefind-search-status')
  const pagefindNotice = createElement(documentMock, 'pagefind-search-notice')
  const pagefindContainer = createElement(
    documentMock,
    'pagefind-search-container',
  )
  pagefind.append(pagefindStatus, pagefindNotice, pagefindContainer)
  const network = createElement(documentMock, 'network-search')
  const networkStatus = createElement(documentMock, 'network-search-status')
  const networkResults = documentMock.createElement('ol')
  networkResults.id = 'network-search-results'
  network.append(networkStatus, networkResults)

  dialog.append(closeButton, input, privacy, semantic, pagefind, network)
  documentMock.body.replaceChildren(dialog)
  return { dialog, input, pagefindContainer }
}

function waitForFallback() {
  return new Promise((resolve) => setTimeout(resolve, 520))
}

test('Vectorizeが主検索で、Pagefindは有効な結果がない時だけ遅延読込する', async () => {
  const originalDocument = globalThis.document
  const originalWindow = globalThis.window
  const originalMutationObserver = globalThis.MutationObserver
  const originalFetch = globalThis.fetch
  const documentMock = new DocumentMock()

  class PagefindUIMock {
    constructor() {
      const input = documentMock.createElement('input')
      input.className = 'pagefind-ui__search-input'
      documentMock.getElementById('pagefind-search-container').append(input)
    }
  }

  globalThis.document = documentMock
  globalThis.window = {
    PagefindUI: PagefindUIMock,
    location: {
      href: 'https://acecore.net/en/',
      pathname: '/en/',
    },
    origin: 'https://acecore.net',
    clearTimeout,
    setTimeout,
  }
  globalThis.MutationObserver = MutationObserverMock
  let localResultAvailable = true
  let localResponseResolved = false
  let networkStartedAfterLocal = false
  let fetchCallCount = 0
  globalThis.fetch = async (input) => {
    fetchCallCount += 1
    if (String(input) !== '/api/search') {
      networkStartedAfterLocal = localResponseResolved
      return Response.json({
        ok: true,
        requestId: '018f7e5a-7b4d-7c6a-8e9f-0123456789ab',
        results: [
          {
            url: 'https://schools.acecore.net/learning-support/',
            title: 'Safe related result',
            section: 'Learning support',
            excerpt: 'This is allowed.',
            source: 'schools',
            sourceLabel: 'Acecore Schools',
            rank: 1,
          },
          {
            url: 'https://acecore.net/services/',
            title: 'Own-site result',
            section: 'Services',
            excerpt: 'This must not be displayed.',
            source: 'acecore',
            sourceLabel: 'Acecore',
            rank: 1,
          },
          {
            url: 'https://schools.acecore.net/learning-support/',
            title: 'Mismatched label',
            section: 'Learning support',
            excerpt: 'This must not be displayed.',
            source: 'schools',
            sourceLabel: 'Aceserver WIKI',
            rank: 2,
          },
          {
            url: 'https://systems.acecore.net/%61dmin/',
            title: 'Encoded admin result',
            section: 'Unsafe',
            excerpt: 'This must not be displayed.',
            source: 'systems',
            sourceLabel: 'Acecore Systems',
            rank: 2,
          },
          {
            url: 'https://systems.acecore.net/%61pi/search/',
            title: 'Encoded API result',
            section: 'Unsafe',
            excerpt: 'This must not be displayed.',
            source: 'systems',
            sourceLabel: 'Acecore Systems',
            rank: 2,
          },
          {
            url: 'https://systems.acecore.net/%2561dmin/',
            title: 'Double encoded admin result',
            section: 'Unsafe',
            excerpt: 'This must not be displayed.',
            source: 'systems',
            sourceLabel: 'Acecore Systems',
            rank: 2,
          },
          {
            url: 'https://systems.acecore.net/%2561pi/search/',
            title: 'Double encoded API result',
            section: 'Unsafe',
            excerpt: 'This must not be displayed.',
            source: 'systems',
            sourceLabel: 'Acecore Systems',
            rank: 2,
          },
          {
            url: 'https://systems.acecore.net/%00public/',
            title: 'Encoded control result',
            section: 'Unsafe',
            excerpt: 'This must not be displayed.',
            source: 'systems',
            sourceLabel: 'Acecore Systems',
            rank: 2,
          },
          {
            url: 'https://systems.acecore.net/%EF%BC%85%36%31dmin/',
            title: 'NFKC encoded admin result',
            section: 'Unsafe',
            excerpt: 'This must not be displayed.',
            source: 'systems',
            sourceLabel: 'Acecore Systems',
            rank: 2,
          },
          {
            url: 'https://systems.acecore.net/%252e%252e/admin/',
            title: 'Double encoded parent result',
            section: 'Unsafe',
            excerpt: 'This must not be displayed.',
            source: 'systems',
            sourceLabel: 'Acecore Systems',
            rank: 2,
          },
          {
            url: 'https://systems.acecore.net/public/%253Fprivate/',
            title: 'Double encoded query result',
            section: 'Unsafe',
            excerpt: 'This must not be displayed.',
            source: 'systems',
            sourceLabel: 'Acecore Systems',
            rank: 2,
          },
          {
            url: 'https://systems.acecore.net/public/%2523private/',
            title: 'Double encoded hash result',
            section: 'Unsafe',
            excerpt: 'This must not be displayed.',
            source: 'systems',
            sourceLabel: 'Acecore Systems',
            rank: 2,
          },
          {
            url: 'https://systems.acecore.net/safe/../public/',
            title: 'Raw parent result',
            section: 'Unsafe',
            excerpt: 'This must not be displayed.',
            source: 'systems',
            sourceLabel: 'Acecore Systems',
            rank: 2,
          },
          {
            url: 'https://systems.acecore.net/safe\\private/',
            title: 'Raw backslash result',
            section: 'Unsafe',
            excerpt: 'This must not be displayed.',
            source: 'systems',
            sourceLabel: 'Acecore Systems',
            rank: 2,
          },
          {
            url: 'https://systems.acecore.net/safe\tpublic/',
            title: 'Raw control result',
            section: 'Unsafe',
            excerpt: 'This must not be displayed.',
            source: 'systems',
            sourceLabel: 'Acecore Systems',
            rank: 2,
          },
        ],
      })
    }

    localResponseResolved = true
    return Response.json({
      ok: true,
      requestId: '018f7e5a-7b4d-7c6a-8e9f-0123456789ab',
      results: localResultAvailable
        ? [
            {
              id: 'local-result',
              url: '/services/',
              title: 'Website support',
              section: 'Services',
              excerpt: 'Official local result',
              contentType: 'page',
              rank: 1,
            },
            {
              id: 'local-admin-result',
              url: '/admin/',
              title: 'Admin',
              section: 'Unsafe',
              excerpt: 'This must not be displayed.',
              contentType: 'page',
              rank: 2,
            },
            {
              id: 'local-nfkc-encoded-admin-result',
              url: '/%EF%BC%85%36%31dmin/',
              title: 'NFKC encoded admin',
              section: 'Unsafe',
              excerpt: 'This must not be displayed.',
              contentType: 'page',
              rank: 3,
            },
            {
              id: 'local-encoded-query-result',
              url: '/public/%253Fprivate/',
              title: 'Encoded query',
              section: 'Unsafe',
              excerpt: 'This must not be displayed.',
              contentType: 'page',
              rank: 4,
            },
            {
              id: 'local-raw-parent-result',
              url: '/safe/../services/',
              title: 'Raw parent',
              section: 'Unsafe',
              excerpt: 'This must not be displayed.',
              contentType: 'page',
              rank: 5,
            },
            {
              id: 'local-raw-backslash-result',
              url: '/safe\\private/',
              title: 'Raw backslash',
              section: 'Unsafe',
              excerpt: 'This must not be displayed.',
              contentType: 'page',
              rank: 6,
            },
            {
              id: 'local-raw-control-result',
              url: '/safe\tpublic/',
              title: 'Raw control',
              section: 'Unsafe',
              excerpt: 'This must not be displayed.',
              contentType: 'page',
              rank: 7,
            },
          ]
        : [],
    })
  }

  try {
    const { openSearch } = await import('../src/scripts/search-modal.ts')
    const { input } = installSearchSurface(documentMock)

    await openSearch()
    assert.equal(documentMock.getElementById('pagefind-ui-style'), null)
    assert.equal(documentMock.getElementById('pagefind-ui-script'), null)

    input.value = 'website'
    input.emit('input')
    await waitForFallback()

    assert.equal(documentMock.getElementById('pagefind-ui-style'), null)
    assert.equal(documentMock.getElementById('pagefind-ui-script'), null)
    assert.equal(
      documentMock.getElementById('semantic-search-results').children.length,
      1,
    )
    assert.equal(networkStartedAfterLocal, true)
    assert.equal(
      documentMock.getElementById('network-search-results').children.length,
      1,
    )
    assert.equal(
      documentMock.getElementById('network-search-results').children[0]
        .children[0].children[0].textContent,
      'Safe related result',
    )

    const fetchCountBeforeLongQuery = fetchCallCount
    input.value = 'x'.repeat(161)
    input.emit('input')
    await waitForFallback()
    assert.equal(fetchCallCount, fetchCountBeforeLongQuery)

    localResultAvailable = false
    input.value = 'not found'
    input.emit('input')
    await waitForFallback()

    assert.ok(documentMock.getElementById('pagefind-ui-style'))
    assert.ok(documentMock.getElementById('pagefind-ui-override-style'))
    assert.ok(documentMock.getElementById('pagefind-ui-script'))
  } finally {
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
    if (originalMutationObserver === undefined)
      delete globalThis.MutationObserver
    else globalThis.MutationObserver = originalMutationObserver
    globalThis.fetch = originalFetch
  }
})
