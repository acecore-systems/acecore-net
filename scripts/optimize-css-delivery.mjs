import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const DIST_DIR = path.resolve('dist')
const STYLESHEET_PATTERN = /<link rel="stylesheet" href="(\/_astro\/[^"]+\.css)">/g

async function collectHtmlFiles(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const resolvedPath = path.join(dirPath, entry.name)
      if (entry.isDirectory()) return collectHtmlFiles(resolvedPath)
      if (entry.isFile() && resolvedPath.endsWith('.html')) return [resolvedPath]
      return []
    }),
  )

  return files.flat()
}

function optimizeStylesheetLinks(html) {
  return html.replace(STYLESHEET_PATTERN, (_, href) => {
    return `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="${href}"></noscript>`
  })
}

async function main() {
  const distStat = await stat(DIST_DIR)
  if (!distStat.isDirectory()) {
    throw new Error(`dist directory not found: ${DIST_DIR}`)
  }

  const htmlFiles = await collectHtmlFiles(DIST_DIR)
  let updatedCount = 0

  for (const filePath of htmlFiles) {
    const originalHtml = await readFile(filePath, 'utf8')
    const optimizedHtml = optimizeStylesheetLinks(originalHtml)

    if (optimizedHtml === originalHtml) continue

    await writeFile(filePath, optimizedHtml, 'utf8')
    updatedCount += 1
  }

  console.log(`optimize-css-delivery: updated ${updatedCount} HTML files`)
}

main().catch((error) => {
  console.error('optimize-css-delivery failed')
  console.error(error)
  process.exitCode = 1
})