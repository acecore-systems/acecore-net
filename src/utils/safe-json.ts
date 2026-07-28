/**
 * JSONをHTMLのraw-text要素へ埋め込める形に直列化する。
 *
 * application/ld+json の script 要素も `</script>` で閉じられるため、
 * JSON.stringify() の結果をそのまま set:html へ渡さない。
 */
export function serializeJsonForHtml(value: unknown): string {
  const serialized = JSON.stringify(value)

  if (serialized === undefined) {
    throw new TypeError('JSONとして直列化できない値です。')
  }

  return serialized.replace(
    /[<>&\u2028\u2029]/g,
    (character) =>
      ({
        '<': '\\u003c',
        '>': '\\u003e',
        '&': '\\u0026',
        '\u2028': '\\u2028',
        '\u2029': '\\u2029',
      })[character] ?? character,
  )
}
