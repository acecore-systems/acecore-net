import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const configPath = join(process.cwd(), 'dist', 'admin', 'config.yml')
const branch =
  process.env.CF_PAGES_BRANCH ||
  process.env.GITHUB_HEAD_REF ||
  process.env.GITHUB_REF_NAME ||
  'main'

if (!existsSync(configPath)) {
  throw new Error(`CMS config was not found: ${configPath}`)
}

const normalizedBranch = branch.replace(/^refs\/heads\//, '').trim() || 'main'
const yamlBranch = normalizedBranch.replaceAll("'", "''")
const config = readFileSync(configPath, 'utf8')
const lines = config.split(/\r?\n/)

let foundBackend = false
let updated = false

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i]

  if (/^backend:\s*$/.test(line)) {
    foundBackend = true
    continue
  }

  if (foundBackend && /^[^\s#]/.test(line)) {
    break
  }

  if (foundBackend && /^  branch:\s*/.test(line)) {
    lines[i] = `  branch: '${yamlBranch}'`
    updated = true
    break
  }
}

if (!updated) {
  throw new Error('CMS backend.branch was not found in dist/admin/config.yml')
}

writeFileSync(configPath, lines.join('\n'))
console.log(`[cms] backend.branch set to ${normalizedBranch}`)
