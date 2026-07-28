import assert from 'node:assert/strict'
import test from 'node:test'

import { serializeJsonForHtml } from '../src/utils/safe-json.ts'

test('JSON-LDをscript要素から脱出できない形で直列化する', () => {
  const payload = {
    title: '</script><script>alert(1)</script>',
    separator: '\u2028\u2029',
    ampersand: '&',
  }
  const serialized = serializeJsonForHtml(payload)

  assert.equal(serialized.includes('<'), false)
  assert.equal(serialized.includes('>'), false)
  assert.equal(serialized.includes('&'), false)
  assert.equal(serialized.includes('\u2028'), false)
  assert.equal(serialized.includes('\u2029'), false)
  assert.deepEqual(JSON.parse(serialized), payload)
})

test('JSONにできない値は暗黙に空文字へ変換しない', () => {
  assert.throws(() => serializeJsonForHtml(undefined), TypeError)
})
