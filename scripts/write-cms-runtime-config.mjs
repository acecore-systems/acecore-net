import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const outputPath = resolve('public/admin/runtime-config.js')

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, 'window.CMS_MANUAL_INIT = true;\n', 'utf8')

console.log('CMS runtime config branch: main')
