import { access, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defaultLocale, locales } from '../src/i18n/config.ts'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))

for (const locale of locales.filter((value) => value !== defaultLocale)) {
  const source = path.join(dist, locale, '404', 'index.html')
  const target = path.join(dist, locale, '404.html')

  try {
    await copyFile(source, target)
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    // Astro may eventually emit the desired path without an extra copy.
    await access(target)
  }
}

console.log(`Prepared localized 404 pages for ${locales.length - 1} locales.`)
