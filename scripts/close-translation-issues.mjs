import { execFileSync } from 'node:child_process'

const AUTHORS_MARKER = 'translation-source:src/data/authors.json#authors-base'

function parseArgs(argv) {
  const options = {
    prNumber: null,
  }

  for (const arg of argv) {
    if (arg.startsWith('--pr=')) {
      options.prNumber = Number(arg.slice('--pr='.length)) || null
    }
  }

  return options
}

function inferRepositoryFromGitRemote() {
  try {
    const remoteUrl = execFileSync('git', ['remote', 'get-url', 'origin'], {
      encoding: 'utf8',
    }).trim()

    const sshMatch = remoteUrl.match(/github\.com:([^/]+\/[^/.]+)(?:\.git)?$/)
    if (sshMatch) return sshMatch[1]

    const httpsMatch = remoteUrl.match(/github\.com\/([^/]+\/[^/.]+)(?:\.git)?$/)
    if (httpsMatch) return httpsMatch[1]
  } catch {
    return null
  }

  return null
}

function getRepositoryInfo() {
  const repository = process.env.GITHUB_REPOSITORY || inferRepositoryFromGitRemote()
  if (!repository) {
    throw new Error('GITHUB_REPOSITORY is required')
  }

  const [owner, repo] = repository.split('/')
  return { owner, repo, repository }
}

async function requestGitHub(path, { method = 'GET', body } = {}) {
  const token = process.env.GITHUB_TOKEN
  if (!token) {
    throw new Error('GITHUB_TOKEN is required')
  }

  const response = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': 'acecore-net-translation-issue-close-bot',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 404) return null

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`GitHub API ${method} ${path} failed: ${response.status} ${errorText}`)
  }

  if (response.status === 204) return null
  return response.json()
}

async function getPullRequest(prNumber) {
  const { owner, repo } = getRepositoryInfo()
  return requestGitHub(`/repos/${owner}/${repo}/pulls/${prNumber}`)
}

async function listPullRequestFiles(prNumber) {
  const { owner, repo } = getRepositoryInfo()
  const files = []

  for (let page = 1; page <= 10; page += 1) {
    const response = await requestGitHub(
      `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100&page=${page}`,
    )

    if (!Array.isArray(response) || response.length === 0) break
    files.push(...response)

    if (response.length < 100) break
  }

  return files
}

function isEligibleMergedTranslationPullRequest(pr) {
  return (
    pr &&
    pr.state === 'closed' &&
    pr.merged_at &&
    pr.base?.ref === 'main' &&
    typeof pr.title === 'string' &&
    pr.title.startsWith('[translation]') &&
    (
      pr.user?.login === 'Copilot' ||
      pr.user?.login === 'app/copilot-swe-agent' ||
      pr.user?.login === 'copilot-swe-agent[bot]' ||
      pr.head?.ref?.startsWith('copilot/')
    )
  )
}

function collectIssueMarkers(files) {
  const markers = new Set()

  for (const file of files) {
    const path = file.filename
    if (path === 'src/data/authors.json') {
      markers.add(AUTHORS_MARKER)
      continue
    }

    const match = path.match(/^src\/content\/blog\/([^/]+)\/([^/]+\.md)$/)
    if (!match) continue

    const [, locale, filename] = match
    if (locale === 'ja') continue

    markers.add(`translation-source:src/content/blog/${filename}`)
  }

  return [...markers]
}

function collectIssueMarkersFromPullRequestBody(body) {
  const markers = new Set()
  const sourcePaths = body?.match(/src\/content\/blog\/[^/\s`]+\.md/g) ?? []

  for (const sourcePath of sourcePaths) {
    markers.add(`translation-source:${sourcePath}`)
  }

  if (typeof body === 'string' && body.includes('src/data/authors.json')) {
    markers.add(AUTHORS_MARKER)
  }

  return [...markers]
}

async function findOpenIssuesByMarker(repository, marker) {
  const query = encodeURIComponent(`repo:${repository} is:issue is:open in:body ${marker}`)
  const response = await requestGitHub(`/search/issues?q=${query}`)
  return response?.items ?? []
}

async function commentAndCloseIssue(issueNumber, prNumber) {
  const { owner, repo } = getRepositoryInfo()
  const note = `翻訳PR #${prNumber} のマージ完了に伴い、自動でクローズします。`

  await requestGitHub(`/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: { body: note },
  })

  await requestGitHub(`/repos/${owner}/${repo}/issues/${issueNumber}`, {
    method: 'PATCH',
    body: { state: 'closed' },
  })

  console.log(`Closed translation issue #${issueNumber}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.prNumber) {
    console.log('No pull request number provided. Skipping issue close automation.')
    return
  }

  const pullRequest = await getPullRequest(args.prNumber)
  if (!pullRequest) {
    console.log(`Pull request #${args.prNumber} was not found. Skipping.`)
    return
  }

  if (!isEligibleMergedTranslationPullRequest(pullRequest)) {
    console.log(`Pull request #${pullRequest.number} is not an eligible merged translation PR. Skipping.`)
    return
  }

  const files = await listPullRequestFiles(pullRequest.number)
  const markers = new Set([
    ...collectIssueMarkers(files),
    ...collectIssueMarkersFromPullRequestBody(pullRequest.body ?? ''),
  ])
  if (markers.size === 0) {
    console.log(`No translation issue markers derived from PR #${pullRequest.number}.`)
    return
  }

  const { repository } = getRepositoryInfo()
  const issueNumbers = new Set()

  for (const marker of markers) {
    const issues = await findOpenIssuesByMarker(repository, marker)
    for (const issue of issues) {
      issueNumbers.add(issue.number)
    }
  }

  if (issueNumbers.size === 0) {
    console.log(`No open translation issues found for PR #${pullRequest.number}.`)
    return
  }

  for (const issueNumber of issueNumbers) {
    await commentAndCloseIssue(issueNumber, pullRequest.number)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
