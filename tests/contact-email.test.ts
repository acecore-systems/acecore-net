import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import worker from '../workers/contact-email/src/index.ts'
import { onRequestPost } from '../functions/api/contact.ts'
const originalFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = originalFetch
})
const fields = {
  locale: 'ja',
  category: '相談',
  name: 'Test User',
  email: 'test@example.com',
  subject: '相談',
  message: 'This is a sufficiently long consultation message.',
}
function request(contact: unknown = fields): Request {
  return new Request('https://contact-email.internal/deliver', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contact,
      submittedAt: '2026-09-12T00:00:00.000Z',
      referer: '',
      userAgent: '',
    }),
  })
}
function config(
  send: (email: EmailMessage | EmailMessageBuilder) => Promise<EmailSendResult>,
): ContactEmailConfig {
  return {
    CONTACT_FROM_EMAIL: 'noreply@acecore.net',
    CONTACT_TO_EMAIL: 'info@acecore.net',
    EMAIL: { send },
  }
}
test('APIキーなしで通知と受付メールを1回ずつ送り、宛先・差出人・返信先を維持', async () => {
  const emails: (EmailMessage | EmailMessageBuilder)[] = []
  const env = config(async (email) => {
    emails.push(email)
    return { messageId: 'message-id' }
  })
  const response = await worker.fetch(
    request({
      ...fields,
      to: 'attacker@example.com',
      from: 'attacker@example.com',
    }),
    env,
  )
  assert.equal(response.status, 201)
  assert.deepEqual(await response.json(), {
    success: true,
    result: { id: 'message-id' },
  })
  assert.equal(emails.length, 2)
  const [notice, ack] = emails as EmailMessageBuilder[]
  assert.equal(notice.to, 'info@acecore.net')
  assert.equal(ack.to, 'test@example.com')
  assert.deepEqual(notice.from, {
    email: 'noreply@acecore.net',
    name: '株式会社Acecore',
  })
  assert.equal(notice.replyTo, 'test@example.com')
  assert.equal(ack.replyTo, 'info@acecore.net')
  assert.equal(ack.html, undefined)
})
test('不正入力・path・method・巨大bodyでは送信しない', async () => {
  let sends = 0
  const env = config(async () => {
    sends++
    return { messageId: 'id' }
  })
  for (const [r, status] of [
    [request({ ...fields, email: 'invalid' }), 400],
    [new Request('https://contact-email.internal/'), 404],
    [new Request('https://contact-email.internal/deliver'), 405],
    [request({ ...fields, message: 'x'.repeat(70000) }), 400],
  ] as const) {
    assert.equal((await worker.fetch(r, env)).status, status)
  }
  assert.equal(sends, 0)
})
test('送信障害時は再送せず、エラー詳細を返さない', async () => {
  for (const [code, status] of [
    ['E_RATE_LIMIT_EXCEEDED', 429],
    ['E_DAILY_LIMIT_EXCEEDED', 429],
    ['E_SENDER_NOT_VERIFIED', 503],
    ['E_INTERNAL_SERVER_ERROR', 500],
  ] as const) {
    let sends = 0
    const env = config(async () => {
      sends++
      throw Object.assign(new Error('private-detail'), { code })
    })
    const response = await worker.fetch(request(), env)
    assert.equal(response.status, status)
    assert.equal(await response.text(), '{"ok":false}')
    assert.equal(sends, 1)
  }
})
test('受付メール失敗時も先に成功した通知を再送しない', async () => {
  let sends = 0
  const env = config(async () => {
    if (++sends === 2) throw new Error('private-detail')
    return { messageId: 'id' }
  })
  const response = await worker.fetch(request(), env)
  assert.equal(response.status, 500)
  assert.equal(sends, 2)
  assert.equal(await response.text(), '{"ok":false}')
})
test('Pagesは検証後のみ内部送信し、binding障害時に旧Secretへfallbackしない', async () => {
  let providerCalls = 0
  globalThis.fetch = async () => {
    providerCalls++
    return Response.json({ success: true, hostname: 'acecore.net' })
  }
  let serviceCalls = 0
  const env = {
    TURNSTILE_SECRET_KEY: 'turnstile',
    CLOUDFLARE_EMAIL_API_TOKEN: 'legacy-do-not-use',
    CONTACT_EMAIL_SERVICE: {
      fetch: async (r: Request) => {
        serviceCalls++
        const body = (await r.json()) as Record<string, unknown>
        assert.ok(body.contact)
        assert.doesNotMatch(
          JSON.stringify(body),
          /turnstile|legacy-do-not-use|verified-token/,
        )
        return Response.json({ error: 'private-detail' }, { status: 503 })
      },
    },
  }
  const post = (origin: string, ip: string) =>
    new Request('https://acecore.net/api/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: origin,
        'CF-Connecting-IP': ip,
      },
      body: JSON.stringify({ ...fields, turnstileToken: 'verified-token' }),
    })
  assert.equal(
    (
      await onRequestPost({
        request: post('https://attacker.example', '198.51.100.40'),
        env,
      })
    ).status,
    403,
  )
  assert.equal(serviceCalls, 0)
  const response = await onRequestPost({
    request: post('https://acecore.net', '198.51.100.41'),
    env,
  })
  assert.equal(response.status, 503)
  assert.doesNotMatch(await response.text(), /private-detail|legacy/)
  assert.equal(serviceCalls, 1)
  assert.equal(providerCalls, 1)
})
