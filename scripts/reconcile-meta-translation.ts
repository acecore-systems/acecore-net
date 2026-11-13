import { readFileSync } from 'node:fs'
import {
  createGitHubJournalStore,
  reconcileMetaReceipt,
} from './meta-translation-background.ts'

const file = process.argv[2]
if (!file) throw new Error('receipt file path is required')
const store = createGitHubJournalStore(
  process.env.GITHUB_REPOSITORY ?? '',
  process.env.GITHUB_TOKEN ?? '',
  process.env.GITHUB_SHA ?? '',
)
for (const line of readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)) {
  const receipt = JSON.parse(line) as {
    groupId: string
    customId: string
    responseId: string
  }
  await reconcileMetaReceipt(
    receipt,
    store,
    process.env.META_TRANSLATION_API_KEY ?? '',
  )
}
console.log(
  'Verified receipt IDs were reconciled without submitting new requests.',
)
