import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const contactPageUrl = new URL(
  '../src/views/ContactPage.astro',
  import.meta.url,
)

test('期限切れの Turnstile トークンを自動的に再取得する', async () => {
  const page = await readFile(contactPageUrl, 'utf8')

  assert.match(
    page,
    /'expired-callback': function \(\) \{\s*window\.turnstile\.reset\(widgetId\)/,
  )
  assert.match(page, /typeof window\.turnstile !== 'undefined' && widgetId/)
})

test('API の安全なエラーメッセージをフォームへ表示する', async () => {
  const page = await readFile(contactPageUrl, 'utf8')

  assert.match(page, /const payload = await res\.json\(\)\.catch/)
  assert.match(page, /showFeedback\('error', message\)/)
})
