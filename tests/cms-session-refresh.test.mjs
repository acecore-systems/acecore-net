import assert from 'node:assert/strict'
import { test } from 'node:test'
import { onRequest } from '../functions/admin/api/refresh-session.ts'
import { CMS_PRODUCTION_HOSTNAME } from '../functions/admin/api/_cms-policy.ts'

const origin = 'https://' + CMS_PRODUCTION_HOSTNAME

test('ログイン更新は同一origin POSTでhost-only Cookieだけを破棄する', async () => {
  const response = await onRequest({
    request: new Request(origin + '/admin/api/refresh-session', {
      method: 'POST',
      headers: { Origin: origin, 'Sec-Fetch-Site': 'same-origin' },
    }),
  })
  assert.equal(response.status, 303)
  assert.equal(response.headers.get('Location'), '/admin/')
  assert.equal(response.headers.get('Cache-Control'), 'no-store')
  assert.equal(
    response.headers.get('Set-Cookie'),
    'CF_Authorization=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
  )
})

for (const [method, requestOrigin, site, hostname] of [
  ['GET', origin, 'same-origin', CMS_PRODUCTION_HOSTNAME],
  ['POST', '', 'same-origin', CMS_PRODUCTION_HOSTNAME],
  ['POST', 'https://evil.example', 'cross-site', CMS_PRODUCTION_HOSTNAME],
  ['POST', origin, 'same-site', CMS_PRODUCTION_HOSTNAME],
  ['POST', 'https://preview.pages.dev', 'same-origin', 'preview.pages.dev'],
]) {
  test('ログイン更新は不正な操作を拒否する', async () => {
    const response = await onRequest({
      request: new Request(
        'https://' + hostname + '/admin/api/refresh-session',
        {
          method,
          headers: { Origin: requestOrigin, 'Sec-Fetch-Site': site },
        },
      ),
    })
    assert.ok([403, 405].includes(response.status))
    assert.equal(response.headers.get('Set-Cookie'), null)
  })
}
