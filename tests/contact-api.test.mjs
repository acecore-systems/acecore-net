import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'

import { onRequestOptions, onRequestPost } from '../functions/api/contact.ts'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

test('Systemsのurlencodedフォームは同じlocaleの完了画面へ戻る', async () => {
  const calls = mockSuccessfulContact('systems.acecore.net')
  const response = await onRequestPost({
    request: nativeContactRequest({
      body: new URLSearchParams(nativeContactFields('ru')),
      origin: 'https://systems.acecore.net',
      ip: '203.0.113.10',
    }),
    env: contactEnv(),
  })

  assert.equal(response.status, 303)
  assert.equal(
    response.headers.get('Location'),
    'https://systems.acecore.net/ru/contact/thanks/',
  )
  assert.equal(calls.length, 2)
})

test('SystemsのFormData入力エラーも同じlocaleのフォームへ戻る', async () => {
  const body = new FormData()
  body.set('locale', 'fr')
  const response = await onRequestPost({
    request: nativeContactRequest({
      body,
      origin: 'https://systems.acecore.net',
      ip: '203.0.113.11',
    }),
    env: contactEnv(),
  })

  assert.equal(response.status, 303)
  assert.equal(
    response.headers.get('Location'),
    'https://systems.acecore.net/fr/contact/?contact=error#contact-form',
  )
})

test('Acecore同一originのJSON送信は従来どおり201を返す', async () => {
  mockSuccessfulContact('acecore.net')
  const response = await onRequestPost({
    request: jsonContactRequest({
      origin: 'https://acecore.net',
      locale: 'ja',
      ip: '203.0.113.12',
    }),
    env: contactEnv(),
  })

  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), {
    ok: true,
    result: { id: 'message-id' },
  })
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://acecore.net',
  )
  assert.match(response.headers.get('Vary') || '', /\bOrigin\b/)
})

test('問い合わせ通知は株式会社Acecore名で送信する', async () => {
  const calls = mockSuccessfulContact('acecore.net')
  const response = await onRequestPost({
    request: jsonContactRequest({
      origin: 'https://acecore.net',
      locale: 'ja',
      ip: '203.0.113.16',
    }),
    env: contactEnv(),
  })

  assert.equal(response.status, 201)
  const emailCall = calls.find((call) =>
    call.url.includes('/email/sending/send'),
  )
  assert.ok(emailCall)
  assert.equal(emailCall.init?.method, 'POST')

  const payload = JSON.parse(String(emailCall.init?.body))
  assert.equal(payload.from.name, '株式会社Acecore')
  assert.match(payload.subject, /^株式会社Acecore お問い合わせ:/)
  assert.match(payload.text, /株式会社Acecore公式サイト/)
  assert.match(payload.html, /株式会社Acecore公式サイト/)
})

test('許可したSystems originのJSON応答にCORSヘッダーを付ける', async () => {
  mockSuccessfulContact('systems.acecore.net')
  const response = await onRequestPost({
    request: jsonContactRequest({
      origin: 'https://systems.acecore.net',
      locale: 'en',
      ip: '203.0.113.13',
    }),
    env: contactEnv(),
  })

  assert.equal(response.status, 201)
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://systems.acecore.net',
  )
  assert.match(response.headers.get('Vary') || '', /\bOrigin\b/)
})

test('許可したSystems originのJSON入力エラーにもCORSヘッダーを付ける', async () => {
  const response = await onRequestPost({
    request: new Request('https://acecore.net/api/contact', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Origin: 'https://systems.acecore.net',
      },
      body: JSON.stringify({ locale: 'fr' }),
    }),
    env: contactEnv(),
  })

  assert.equal(response.status, 400)
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://systems.acecore.net',
  )
  assert.match(response.headers.get('Vary') || '', /\bOrigin\b/)
  assert.equal((await response.json()).ok, false)
})

test('未許可originのJSON応答はoriginを公開しない', async () => {
  const response = await onRequestPost({
    request: jsonContactRequest({
      origin: 'https://example.com',
      locale: 'en',
      ip: '203.0.113.14',
    }),
    env: contactEnv(),
  })

  assert.equal(response.status, 403)
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null)
  assert.match(response.headers.get('Vary') || '', /\bOrigin\b/)
  assert.equal((await response.json()).ok, false)
})

test('Systemsのpreflight応答も許可originを明示する', () => {
  const response = onRequestOptions({
    request: new Request('https://acecore.net/api/contact', {
      method: 'OPTIONS',
      headers: { Origin: 'https://systems.acecore.net' },
    }),
    env: contactEnv(),
  })

  assert.equal(response.status, 204)
  assert.equal(
    response.headers.get('Access-Control-Allow-Origin'),
    'https://systems.acecore.net',
  )
  assert.match(response.headers.get('Vary') || '', /\bOrigin\b/)
})

test('未許可originをHTMLリダイレクト先には使わない', async () => {
  const body = new FormData()
  body.set('locale', 'en')
  const response = await onRequestPost({
    request: nativeContactRequest({
      body,
      origin: 'https://example.com',
      ip: '203.0.113.15',
    }),
    env: contactEnv(),
  })

  assert.equal(response.status, 303)
  assert.equal(
    response.headers.get('Location'),
    'https://acecore.net/contact/?contact=error#contact-form',
  )
})

function mockSuccessfulContact(hostname) {
  const calls = []
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    calls.push({ url, init })
    if (url.includes('/siteverify')) {
      return Response.json({ success: true, hostname })
    }
    return Response.json({
      success: true,
      result: { id: 'message-id' },
    })
  }
  return calls
}

function nativeContactFields(locale) {
  return [
    ['locale', locale],
    ['お問い合わせ種別', 'Business systems'],
    ['お名前', 'Test User'],
    ['メールアドレス', 'test@example.com'],
    ['件名', 'Consultation'],
    ['お問い合わせ内容', 'This is a sufficiently long consultation message.'],
    ['cf-turnstile-response', 'verified-token'],
    ['company_website', ''],
  ]
}

function nativeContactRequest({ body, origin, ip }) {
  return new Request('https://acecore.net/api/contact', {
    method: 'POST',
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      Origin: origin,
      'CF-Connecting-IP': ip,
    },
    body,
  })
}

function jsonContactRequest({ origin, locale, ip }) {
  return new Request('https://acecore.net/api/contact', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: origin,
      'CF-Connecting-IP': ip,
    },
    body: JSON.stringify({
      locale,
      category: 'Business systems',
      name: 'Test User',
      email: 'test@example.com',
      subject: 'Consultation',
      message: 'This is a sufficiently long consultation message.',
      turnstileToken: 'verified-token',
    }),
  })
}

function contactEnv() {
  return {
    CLOUDFLARE_ACCOUNT_ID: 'account-id',
    CLOUDFLARE_EMAIL_API_TOKEN: 'email-token',
    CONTACT_ALLOWED_HOSTNAMES: 'acecore.net,systems.acecore.net',
    TURNSTILE_SECRET_KEY: 'turnstile-secret',
  }
}
