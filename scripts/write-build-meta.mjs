import { readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const commit =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  process.env.COMMIT_SHA ||
  'local'
const outputFile = resolve('dist/.well-known/acecore-build.json')

await mkdir(resolve('dist/.well-known'), { recursive: true })
await writeFile(
  outputFile,
  `${JSON.stringify({ commit, searchCorpusVersion: readCorpusVersion() })}\n`,
  'utf8',
)

function readCorpusVersion() {
  try {
    const corpus = JSON.parse(
      readFileSync(resolve('.vectorize/corpus.json'), 'utf8'),
    )
    return typeof corpus.version === 'string' ? corpus.version : null
  } catch {
    return null
  }
}
