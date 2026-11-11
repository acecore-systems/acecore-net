import {
  cleanupProcessedMetaResponses,
  createGitHubJournalStore,
  finalizeMetaGroup,
} from './meta-translation-background.ts'

const id = process.argv[2] ?? ''
const repo = process.env.GITHUB_REPOSITORY ?? ''
const token = process.env.GITHUB_TOKEN ?? ''
const sha = process.env.GITHUB_SHA ?? ''
const store = createGitHubJournalStore(repo, token, sha)
await finalizeMetaGroup(id, store)
await cleanupProcessedMetaResponses(
  store,
  process.env.META_TRANSLATION_API_KEY ?? '',
)
