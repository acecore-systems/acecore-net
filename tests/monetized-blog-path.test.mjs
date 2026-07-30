import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import { defaultLocale, locales } from '../src/i18n/config.ts'
import { hasAdsEnabledMarker, initAdsRuntime } from '../src/scripts/ads.ts'
import { isMonetizedBlogPath } from '../src/utils/monetized-route.ts'

const BASE_LAYOUT_URL = new URL(
  '../src/layouts/BaseLayout.astro',
  import.meta.url,
)
const SEARCH_MODAL_URL = new URL(
  '../src/components/SearchModal.astro',
  import.meta.url,
)

for (const locale of locales) {
  test(`${locale}のブログ一覧と記事で広告ランタイムを有効にする`, () => {
    const blogRoot = locale === defaultLocale ? '/blog/' : `/${locale}/blog/`

    assert.equal(isMonetizedBlogPath(blogRoot, blogRoot), true)
    assert.equal(
      isMonetizedBlogPath(blogRoot.replace(/\/$/, ''), blogRoot),
      true,
    )
    assert.equal(
      isMonetizedBlogPath(`${blogRoot}example-article/`, blogRoot),
      true,
    )
  })
}

test('ブログ配下の補助ページでも広告ランタイムを有効にする', () => {
  assert.equal(isMonetizedBlogPath('/blog/page/2/', '/blog/'), true)
  assert.equal(isMonetizedBlogPath('/en/blog/tags/astro/', '/en/blog/'), true)
  assert.equal(
    isMonetizedBlogPath('/zh-cn/blog/archive/2026-07/', '/zh-cn/blog/'),
    true,
  )
})

test('非ブログページと似た名前のルートでは広告ランタイムを無効にする', () => {
  const nonBlogCases = [
    ['/', '/blog/'],
    ['/services/', '/blog/'],
    ['/en/', '/en/blog/'],
    ['/en/services/', '/en/blog/'],
    ['/blogroll/', '/blog/'],
    ['/en/blogroll/', '/en/blog/'],
    ['/en/about/blog/', '/en/blog/'],
    ['/ja/blog/', '/blog/'],
  ]

  for (const [pathname, blogRoot] of nonBlogCases) {
    assert.equal(isMonetizedBlogPath(pathname, blogRoot), false, pathname)
  }
})

test('広告ランタイムは現在DOMのmonetized markerがないページでslotを初期化しない', () => {
  const originalDocument = globalThis.document
  const originalWindow = globalThis.window
  const listeners = new Map()
  let enabled = false
  let slotQueries = 0
  const documentMock = {
    addEventListener(type, listener) {
      listeners.set(type, listener)
    },
    querySelector(selector) {
      return selector === '[data-ace-ads-enabled="true"]' && enabled ? {} : null
    },
    querySelectorAll() {
      slotQueries += 1
      return []
    },
  }
  const windowMock = {}

  globalThis.document = documentMock
  globalThis.window = windowMock

  try {
    assert.equal(hasAdsEnabledMarker(documentMock), false)
    initAdsRuntime()
    assert.equal(slotQueries, 0)

    windowMock.aceInitAdSlots?.(documentMock)
    assert.equal(slotQueries, 0)

    enabled = true
    assert.equal(hasAdsEnabledMarker(documentMock), true)
    listeners.get('astro:page-load')?.()
    assert.equal(slotQueries, 1)

    enabled = false
    listeners.get('astro:page-load')?.()
    assert.equal(slotQueries, 1)
    listeners.get('astro:before-swap')?.()
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
  }
})

test('BaseLayoutと検索モーダルが同じ広告境界を共有する', async () => {
  const [baseLayout, searchModal] = await Promise.all([
    readFile(BASE_LAYOUT_URL, 'utf8'),
    readFile(SEARCH_MODAL_URL, 'utf8'),
  ])

  assert.match(
    baseLayout,
    /data-ace-ads-enabled=\{isMonetizedPage \? 'true' : undefined\}/,
  )
  assert.match(baseLayout, /<SearchModal monetized=\{isMonetizedPage\} \/>/)
  assert.match(searchModal, /const monetized = Astro\.props\.monetized/)
  assert.match(searchModal, /monetized && \(/)
})
