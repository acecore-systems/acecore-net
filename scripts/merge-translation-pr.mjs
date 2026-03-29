import { execFileSync } from 'node:child_process'

function parseArgs(argv) {
  const options = {
    prNumber: null,
    skipBuildCheck: false,
  }

  for (const arg of argv) {
    if (arg.startsWith('--pr=')) {
      options.prNumber = Number(arg.slice('--pr='.length)) || null
      continue
    }

    if (arg === '--skip-build-check') {
      options.skipBuildCheck = true
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
      'User-Agent': 'acecore-net-translation-pr-merge-bot',
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

function getRepositoryInfo() {
  const repository = process.env.GITHUB_REPOSITORY || inferRepositoryFromGitRemote()
  if (!repository) {
    throw new Error('GITHUB_REPOSITORY is required')
  }

  const [owner, repo] = repository.split('/')
  return { owner, repo, repository }
}

async function getPullRequest(prNumber) {
  const { owner, repo } = getRepositoryInfo()
  return requestGitHub(`/repos/${owner}/${repo}/pulls/${prNumber}`)
}

async function getCheckRuns(headSha) {
  const { owner, repo } = getRepositoryInfo()
  const response = await requestGitHub(
    `/repos/${owner}/${repo}/commits/${headSha}/check-runs?per_page=100`,
  )
  return response?.check_runs ?? []
}

function isEligibleTranslationPullRequest(pr) {
  return (
    pr &&
    pr.state === 'open' &&
    pr.base?.ref === 'main' &&
    (
      pr.user?.login === 'Copilot' ||
      pr.user?.login === 'app/copilot-swe-agent' ||
      pr.user?.login === 'copilot-swe-agent[bot]' ||
      pr.head?.ref?.startsWith('copilot/')
    ) &&
    typeof pr.title === 'string' &&
    pr.title.startsWith('[translation]')
  )
}

function hasSuccessfulTranslationBuild(checkRuns) {
  return checkRuns.some(
    (checkRun) =>
      checkRun.name === 'Translation PR Build' &&
      checkRun.status === 'completed' &&
      checkRun.conclusion === 'success',
  )
}

async function mergePullRequest(pr) {
  const { owner, repo, repository } = getRepositoryInfo()

  try {
    const result = await requestGitHub(`/repos/${owner}/${repo}/pulls/${pr.number}/merge`, {
      method: 'PUT',
      body: {
        merge_method: 'squash',
        commit_title: pr.title,
      },
    })
    console.log(`Merged PR #${pr.number}: ${result?.sha ?? 'ok'}`)
  } catch (error) {
    console.warn(`Could not merge PR #${pr.number}: ${error.message}`)
    return false
  }

  const branchName = pr.head?.ref
  const branchRepoFullName = pr.head?.repo?.full_name

  if (branchName && branchRepoFullName === repository) {
    try {
      await requestGitHub(`/repos/${owner}/${repo}/git/refs/heads/${branchName}`, {
        method: 'DELETE',
      })
      console.log(`Deleted branch ${branchName}`)
    } catch (error) {
      console.warn(`Could not delete branch ${branchName}: ${error.message}`)
    }
  }

  return true
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (!args.prNumber) {
    console.log('No pull request number provided. Skipping merge automation.')
    return
  }

  const pullRequest = await getPullRequest(args.prNumber)
  if (!pullRequest) {
    console.log(`Pull request #${args.prNumber} was not found. Skipping.`)
    return
  }

  if (!isEligibleTranslationPullRequest(pullRequest)) {
    console.log(`Pull request #${pullRequest.number} is not an eligible translation PR. Skipping.`)
    return
  }

  if (pullRequest.draft) {
    console.log(`Pull request #${pullRequest.number} is still a draft. Skipping merge.`)
    return
  }

  if (!args.skipBuildCheck) {
    const checkRuns = await getCheckRuns(pullRequest.head.sha)
    if (!hasSuccessfulTranslationBuild(checkRuns)) {
      console.log(`Pull request #${pullRequest.number} does not have a successful Translation PR Build check yet.`)
      return
    }
  }

  await mergePullRequest(pullRequest)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})