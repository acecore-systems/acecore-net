import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { test } from 'node:test'
const require = createRequire(
  new URL('../node_modules/wrangler/package.json', import.meta.url),
)
const { build } = require('esbuild')
const {
  Miniflare,
  convertV4MiniflareOptions,
  Log,
  LogLevel,
} = require('miniflare')

test('実workerdのService BindingとローカルEmail bindingでキーなしの送信契約を確認', async () => {
  const contact = await build({
    entryPoints: ['workers/contact-email/src/index.ts'],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2023',
  })
  const pages = await build({
    stdin: {
      contents:
        "import {onRequestPost} from './shared/contact.ts'; export default {fetch(request,env){return onRequestPost({request,env})}}",
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'browser',
    target: 'es2023',
  })
  const mf = new Miniflare(
    convertV4MiniflareOptions({
      log: new Log(LogLevel.ERROR),
      workers: [
        {
          name: 'pages',
          modules: true,
          script: pages.outputFiles[0].text,
          compatibilityDate: '2026-09-10',
          bindings: { TURNSTILE_SECRET_KEY: 'synthetic-turnstile' },
          serviceBindings: { CONTACT_EMAIL_SERVICE: 'contact' },
          outboundService: async (r) => {
            assert.equal(new URL(r.url).hostname, 'challenges.cloudflare.com')
            return Response.json({ success: true, hostname: 'acecore.net' })
          },
        },
        {
          name: 'contact',
          modules: true,
          script: contact.outputFiles[0].text,
          compatibilityDate: '2026-09-10',
          bindings: {
            CONTACT_FROM_EMAIL: 'noreply@acecore.net',
            CONTACT_TO_EMAIL: 'info@acecore.net',
          },
          email: {
            send_email: [
              {
                name: 'EMAIL',
                allowed_sender_addresses: ['noreply@acecore.net'],
              },
            ],
          },
          outboundService: async () => {
            throw new Error('Unexpected external fetch')
          },
        },
      ],
    }),
  )
  try {
    const response = await mf.dispatchFetch('https://acecore.net/api/contact', {
      method: 'POST',
      headers: {
        Origin: 'https://acecore.net',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locale: 'ja',
        category: 'Runtime test',
        name: 'Synthetic User',
        email: 'synthetic@example.invalid',
        message: 'Synthetic integration fixture with sufficient length.',
        turnstileToken: 'synthetic-token',
      }),
    })
    assert.equal(response.status, 201)
    const body = await response.json()
    assert.equal(body.ok, true)
    assert.equal(typeof body.result.id, 'string')
    const denied = await mf.dispatchFetch('https://acecore.net/api/contact', {
      method: 'POST',
      headers: {
        Origin: 'https://attacker.example',
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    assert.equal(denied.status, 403)
  } finally {
    await mf.dispose()
  }
})
