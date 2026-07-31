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

function installSearchSurface(documentMock) {
  const dialog = documentMock.createElement('dialog')
  dialog.id = 'search-dialog'
  dialog.dataset.locale = 'en'

  const closeButton = documentMock.createElement('button')
  closeButton.id = 'search-close'

  const container = documentMock.createElement('div')
  container.id = 'search-container'

  dialog.append(closeButton, container)
  documentMock.body.replaceChildren(dialog)
  return { container, dialog }
}

test('SPA head swap後も読み込み済みPagefind runtimeのstyleを再装着する', async () => {
  const originalDocument = globalThis.document
  const originalWindow = globalThis.window
  const originalMutationObserver = globalThis.MutationObserver
  const documentMock = new DocumentMock()

  class PagefindUIMock {
    constructor() {
      const input = documentMock.createElement('input')
      input.className = 'pagefind-ui__search-input'
      documentMock.getElementById('search-container').append(input)
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

  try {
    const { openSearch } = await import('../src/scripts/search-modal.ts')

    installSearchSurface(documentMock)
    await openSearch()

    assert.ok(documentMock.getElementById('pagefind-ui-style'))
    assert.ok(documentMock.getElementById('pagefind-ui-override-style'))
    assert.ok(documentMock.getElementById('pagefind-ui-script'))

    documentMock.head.replaceChildren()
    installSearchSurface(documentMock)
    await openSearch()

    const pagefindStyle = documentMock.getElementById('pagefind-ui-style')
    const overrideStyle = documentMock.getElementById(
      'pagefind-ui-override-style',
    )

    assert.ok(pagefindStyle)
    assert.equal(pagefindStyle.rel, 'stylesheet')
    assert.equal(pagefindStyle.href, '/pagefind/pagefind-ui.css')
    assert.ok(overrideStyle)
    assert.match(overrideStyle.textContent, /\.pagefind-ui__search-input/)
  } finally {
    if (originalDocument === undefined) {
      delete globalThis.document
    } else {
      globalThis.document = originalDocument
    }

    if (originalWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = originalWindow
    }

    if (originalMutationObserver === undefined) {
      delete globalThis.MutationObserver
    } else {
      globalThis.MutationObserver = originalMutationObserver
    }
  }
})
