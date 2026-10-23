import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

// OGの既存構図・文字を保持し、濃背景上のロゴだけを正本SVGへ同期する。
const logo = await readFile(
  new URL('../public/logo-on-dark.svg', import.meta.url),
  'utf8',
)
const sourceUrl = new URL('../public/uploads/og-default.svg', import.meta.url)
const source = await readFile(sourceUrl, 'utf8')
const mark = logo.replace(
  /<svg\b[^>]*>/,
  '<svg width="76" height="76" viewBox="0 0 375 374.999991">',
)
const next = source.replace(
  /(<g transform="translate\(76 54\)">\s*)<svg\b[\s\S]+?<\/svg>/,
  (_, prefix) => prefix + mark.trim(),
)
if (!source.includes('<g transform="translate(76 54)">'))
  throw new Error('OG内の同期対象ロゴが見つかりません')
await writeFile(sourceUrl, next)
await sharp(Buffer.from(next))
  .png()
  .toFile(
    fileURLToPath(new URL('../public/uploads/og-default.png', import.meta.url)),
  )
