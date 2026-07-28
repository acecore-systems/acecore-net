import assert from 'node:assert/strict'
import test from 'node:test'
import { createMarkdownProcessor } from '@astrojs/markdown-remark'

import { serializeJsonForHtml } from '../src/utils/safe-json.ts'

const markdownProcessor = await createMarkdownProcessor({
  syntaxHighlight: false,
})

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

test('Astro rendererではescaped backtick内のHTMLだけが生HTMLになる', async () => {
  const escaped = await markdownProcessor.render(
    '\\`<img src=x onerror=alert(1)>\\`',
  )
  const singleCode = await markdownProcessor.render(
    '`<img src=x onerror=alert(1)>`',
  )
  const multipleCode = await markdownProcessor.render(
    '``<img src=x onerror=alert(1)>``',
  )

  assert.match(escaped.code, /<img\b[^>]*\bonerror=/i)
  assert.doesNotMatch(singleCode.code, /<img\b[^>]*\bonerror=/i)
  assert.doesNotMatch(multipleCode.code, /<img\b[^>]*\bonerror=/i)
})

test('Astro rendererではCommonMark escapeとreference URLがactive URLになる', async () => {
  const activePayloads = [
    '[x](javascript\\:alert(1))',
    '[nested [label]](javascript\\:alert(1))',
    '[x][id]\n\n[id]: javascript:alert(1)',
    '[x][id]\n\n[id]: javascript\\:alert(1)',
    '[x][id]\n\n[id]: <javascript\\:alert(1)>',
    '[x][id]\n\n[id]:\n  javascript\\:alert(1)',
    '![x][id]\n\n[id]: data:image/svg+xml,x',
  ]

  for (const markdown of activePayloads) {
    const rendered = await markdownProcessor.render(markdown)

    assert.match(
      rendered.code,
      /(?:href="javascript:|src="data:image\/svg\+xml)/i,
      `${markdown}\n${rendered.code}`,
    )
  }

  const escapedAutolink = await markdownProcessor.render(
    '<javascript\\:alert(1)>',
  )

  assert.match(escapedAutolink.code, /&#x3C;javascript:alert/)
  assert.doesNotMatch(escapedAutolink.code, /href="javascript:/i)
})

test('Astro rendererではbacktickを含むbacktick fence infoがfenceにならない', async () => {
  const activePayloads = [
    '```bad`info\n<img src=x onerror=alert(1)>\n```',
    '````bad`info\n<img src=x onerror=alert(1)>\n````',
    '```bad\\`info\n<img src=x onerror=alert(1)>\n```',
  ]
  const codePayloads = [
    '```html\n<img src=x onerror=alert(1)>\n```',
    '````html\n<img src=x onerror=alert(1)>\n````',
    '~~~bad`info\n<img src=x onerror=alert(1)>\n~~~',
  ]

  for (const markdown of activePayloads) {
    const rendered = await markdownProcessor.render(markdown)

    assert.match(
      rendered.code,
      /<img\b[^>]*\bonerror=/i,
      `${markdown}\n${rendered.code}`,
    )
  }

  for (const markdown of codePayloads) {
    const rendered = await markdownProcessor.render(markdown)

    assert.doesNotMatch(
      rendered.code,
      /<img\b[^>]*\bonerror=/i,
      `${markdown}\n${rendered.code}`,
    )
  }
})

test('Astro rendererでslash区切りraw HTMLの解釈を確認する', async () => {
  const textPayloads = [
    '<svg/onload=alert(1)>',
    '<body/onload=alert(1)>',
    '<details/open/ontoggle=alert(1)>',
  ]

  for (const markdown of textPayloads) {
    const rendered = await markdownProcessor.render(markdown)

    assert.match(rendered.code, /&#x3C;/, `${markdown}\n${rendered.code}`)
    assert.doesNotMatch(
      rendered.code,
      /<(?:svg|body|details)\b[^>]*\bon(?:load|toggle)=/i,
      `${markdown}\n${rendered.code}`,
    )
  }
})
