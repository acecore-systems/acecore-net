import {
  Kind,
  parse,
  type ArgumentNode,
  type FieldNode,
  type OperationDefinitionNode,
  type SelectionSetNode,
  type ValueNode,
} from 'graphql'

import {
  CMS_REPOSITORY,
  isAllowedCmsDeletePath,
  isAllowedCmsWritePath,
  isCmsReferenceStatePath,
  normalizeCmsPath,
} from './_cms-policy.ts'
import { validateCmsBlogFreshness } from './_cms-blog-freshness-validator.ts'
import { validateCmsAdditionContents } from './_cms-content-validator.ts'
import { validateProjectedCmsReferences } from './_cms-reference-validator.ts'
import { getGitHubEditor, type GitHubEditor } from './_github-oauth.ts'
import {
  type CmsGitHubAppEnv,
  GitHubApiError,
  copyGitHubResponse,
  fetchCmsTree,
  fetchCmsReferenceState,
  getAllowedCmsBlobShas,
  getGitHubAppToken,
  githubJson,
  githubRequest,
  isRecord,
} from './_github-api.ts'

type GraphqlPayload = {
  query: string
  variables: Record<string, unknown>
}

type CmsAddition = {
  path: string
  contents: string
  byteSize: number
}

type CmsDeletion = {
  path: string
}

type CmsCommitInput = {
  expectedHeadOid: string
  additions: CmsAddition[]
  deletions: CmsDeletion[]
}

const SHA_PATTERN = /^[a-f0-9]{40}$/i
const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/
const MAX_GRAPHQL_QUERY_CHARS = 512 * 1024
const MAX_REQUEST_BYTES = 36 * 1024 * 1024
const MAX_CHANGE_COUNT = 100
const MAX_TOTAL_CONTENT_BYTES = 25 * 1024 * 1024
const MAX_GRAPHQL_BLOB_SIZE = 10 * 1024 * 1024
const MAX_AMBIGUOUS_RECOVERY_BYTES = 4 * 1024 * 1024

export const onRequestPost: PagesFunction<CmsGitHubAppEnv> = async ({
  request,
  env,
}) => {
  try {
    let auth = await getGitHubEditor(request)
    const bodyText = await readRequestText(request)

    if (bodyText === null) {
      return json({ message: 'CMS保存データが大きすぎます。' }, 413)
    }

    const payload = parseGraphqlPayload(bodyText)

    if (!payload || payload.query.length > MAX_GRAPHQL_QUERY_CHARS) {
      return json({ message: 'CMS GraphQL request が不正です。' }, 400)
    }

    const operation = parseOperation(payload.query)

    if (!operation) {
      return json({ message: 'CMS GraphQL operation が不正です。' }, 400)
    }

    if (operation.operation === 'query') {
      const token = await getGitHubAppToken(env)
      return await handleReadQuery({ operation, payload, token })
    }

    if (operation.operation === 'mutation') {
      auth = await getGitHubEditor(request, { forceRefresh: true })
      const token = await getGitHubAppToken(env, { forceRefresh: true })
      return await handleCommitMutation({ auth, operation, payload, token })
    }

    return json(
      { message: 'CMS GraphQL operation は許可されていません。' },
      403,
    )
  } catch (error) {
    return toErrorResponse(error)
  }
}

async function handleReadQuery({
  operation,
  payload,
  token,
}: {
  operation: OperationDefinitionNode
  payload: GraphqlPayload
  token: string
}) {
  const authorization = validateReadOperation(operation, payload.variables)

  if (!authorization) {
    return json({ message: 'CMSで許可されていないGraphQL queryです。' }, 403)
  }

  if (authorization.blobShas.size > 0) {
    const tree = await fetchCmsTree(token)
    const allowedShas = getAllowedCmsBlobShas(tree)

    if (
      Array.from(authorization.blobShas).some((sha) => !allowedShas.has(sha))
    ) {
      return json({ message: 'CMS管理対象外のGit blobです。' }, 403)
    }
  }

  const response = await githubRequest({
    body: {
      query: payload.query,
      variables: payload.variables,
    },
    method: 'POST',
    path: '/graphql',
    token,
  })

  return copyGitHubResponse(response)
}

async function handleCommitMutation({
  auth,
  operation,
  payload,
  token,
}: {
  auth: { user: GitHubEditor }
  operation: OperationDefinitionNode
  payload: GraphqlPayload
  token: string
}) {
  if (!isCmsCommitOperation(operation, payload.variables)) {
    return json({ message: 'CMSで許可されていないGraphQL mutationです。' }, 403)
  }

  const commitInput = parseCmsCommitInput(payload.variables.input)

  if (!commitInput) {
    return json(
      { message: 'CMS管理対象外のファイル、または不正な保存データです。' },
      403,
    )
  }

  validateCmsAdditionContents(commitInput.additions)

  const mainRef = await githubJson<unknown>({
    path: `/repos/${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}/git/ref/heads/${CMS_REPOSITORY.branch}`,
    token,
  })
  const mainSha = getGitRefSha(mainRef)

  if (!mainSha) {
    throw new GitHubApiError('GitHub branch response が不正です。', 502)
  }

  if (mainSha !== commitInput.expectedHeadOid) {
    return json(
      {
        message:
          'mainが更新されています。CMSを再読み込みしてから、もう一度保存してください。',
      },
      409,
    )
  }

  const changedPaths = [
    ...commitInput.additions.map(({ path }) => path),
    ...commitInput.deletions.map(({ path }) => path),
  ]

  if (changedPaths.some((path) => isCmsReferenceStatePath(path))) {
    const currentState = await fetchCmsReferenceState(token, mainSha)

    validateCmsBlogFreshness({
      additions: commitInput.additions,
      currentState,
      deletions: commitInput.deletions,
    })
    validateProjectedCmsReferences({
      additions: commitInput.additions,
      currentState,
      deletions: commitInput.deletions,
    })
  }

  const mutation = buildCmsCommitMutation(commitInput.additions)
  const requestMarker = crypto.randomUUID()
  let githubResult: Record<string, unknown>

  try {
    githubResult = await githubJson<Record<string, unknown>>({
      body: {
        query: mutation,
        variables: {
          input: {
            branch: {
              repositoryNameWithOwner: `${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}`,
              branchName: CMS_REPOSITORY.branch,
            },
            expectedHeadOid: mainSha,
            fileChanges: {
              additions: commitInput.additions.map(({ path, contents }) => ({
                path,
                contents,
              })),
              deletions: commitInput.deletions,
            },
            message: {
              headline: buildCommitHeadline(changedPaths),
              body: [
                `GitHub editor: @${auth.user.login}`,
                `CMS request: ${requestMarker}`,
              ].join('\n'),
            },
          },
        },
      },
      method: 'POST',
      path: '/graphql',
      token,
    })

    ensureCommitSucceeded(githubResult)
  } catch (error) {
    const recovered = await recoverAmbiguousDirectCommit({
      commitInput,
      expectedHeadOid: mainSha,
      requestMarker,
      token,
    })

    if (recovered) {
      githubResult = recovered
    } else {
      throw error
    }
  }

  const extensions = isRecord(githubResult.extensions)
    ? githubResult.extensions
    : {}
  const cmsExtensions = isRecord(extensions.cms) ? extensions.cms : {}

  return json({
    ...githubResult,
    extensions: {
      ...extensions,
      cms: {
        ...cmsExtensions,
        branch: CMS_REPOSITORY.branch,
        publication: 'direct',
      },
    },
  })
}

function validateReadOperation(
  operation: OperationDefinitionNode,
  variables: Record<string, unknown>,
) {
  if (
    operation.operation !== 'query' ||
    operation.directives?.length ||
    !variablesMatchDefinitions(operation, variables) ||
    operation.selectionSet.selections.length !== 1
  ) {
    return null
  }

  const root = operation.selectionSet.selections[0]

  if (
    root.kind !== Kind.FIELD ||
    root.name.value !== 'repository' ||
    root.alias ||
    !root.selectionSet ||
    !hasExactArguments(root, ['owner', 'name']) ||
    !argumentMatches(root, 'owner', CMS_REPOSITORY.owner, variables) ||
    !argumentMatches(root, 'name', CMS_REPOSITORY.name, variables)
  ) {
    return null
  }

  const authorization = { blobShas: new Set<string>() }

  return validateRepositorySelection(
    root.selectionSet,
    variables,
    authorization,
  )
    ? authorization
    : null
}

function validateRepositorySelection(
  selectionSet: SelectionSetNode,
  variables: Record<string, unknown>,
  authorization: { blobShas: Set<string> },
) {
  if (
    selectionSet.selections.length === 0 ||
    selectionSet.selections.length > 600
  ) {
    return false
  }

  return selectionSet.selections.every((selection) => {
    if (selection.kind !== Kind.FIELD || selection.directives?.length)
      return false

    if (selection.name.value === 'defaultBranchRef') {
      return (
        !selection.arguments?.length &&
        !!selection.selectionSet &&
        validateLeafSelection(selection.selectionSet, ['name'])
      )
    }

    if (selection.name.value === 'ref') {
      return (
        !!selection.selectionSet &&
        hasExactArguments(selection, ['qualifiedName']) &&
        argumentMatches(
          selection,
          'qualifiedName',
          CMS_REPOSITORY.branch,
          variables,
        ) &&
        validateRefSelection(selection.selectionSet)
      )
    }

    if (selection.name.value === 'object') {
      const oid = getArgumentString(selection, 'oid', variables)

      if (
        !oid ||
        !SHA_PATTERN.test(oid) ||
        !selection.selectionSet ||
        !hasExactArguments(selection, ['oid']) ||
        !validateBlobObjectSelection(selection.selectionSet)
      ) {
        return false
      }

      authorization.blobShas.add(oid)
      return true
    }

    return false
  })
}

function validateRefSelection(selectionSet: SelectionSetNode) {
  if (selectionSet.selections.length !== 1) return false

  const target = selectionSet.selections[0]

  return (
    target.kind === Kind.FIELD &&
    target.name.value === 'target' &&
    !target.alias &&
    !target.arguments?.length &&
    !target.directives?.length &&
    !!target.selectionSet &&
    validateTypedSelection(
      target.selectionSet,
      'Commit',
      validateCommitSelection,
    )
  )
}

function validateBlobObjectSelection(selectionSet: SelectionSetNode) {
  return validateTypedSelection(selectionSet, 'Blob', (blobSelection) => {
    return validateLeafSelection(blobSelection, ['text'])
  })
}

function validateTypedSelection(
  selectionSet: SelectionSetNode,
  typeName: string,
  validator: (selectionSet: SelectionSetNode) => boolean,
) {
  if (selectionSet.selections.length !== 1) return false

  const fragment = selectionSet.selections[0]

  return (
    fragment.kind === Kind.INLINE_FRAGMENT &&
    fragment.typeCondition?.name.value === typeName &&
    !fragment.directives?.length &&
    validator(fragment.selectionSet)
  )
}

function validateCommitSelection(selectionSet: SelectionSetNode) {
  if (
    selectionSet.selections.length === 0 ||
    selectionSet.selections.length > 300
  ) {
    return false
  }

  return selectionSet.selections.every((selection) => {
    if (
      selection.kind !== Kind.FIELD ||
      selection.name.value !== 'history' ||
      selection.directives?.length ||
      !selection.selectionSet
    ) {
      return false
    }

    const argumentNames = (selection.arguments || []).map(
      ({ name }) => name.value,
    )

    if (
      !argumentNames.includes('first') ||
      argumentNames.some((name) => name !== 'first' && name !== 'path') ||
      new Set(argumentNames).size !== argumentNames.length
    ) {
      return false
    }

    const first = getArgument(selection, 'first')?.value

    if (first?.kind !== Kind.INT) return false

    const firstValue = Number(first.value)

    if (!Number.isInteger(firstValue) || firstValue < 1 || firstValue > 100) {
      return false
    }

    const pathArgument = getArgument(selection, 'path')

    if (pathArgument) {
      if (pathArgument.value.kind !== Kind.STRING) return false

      const path = normalizeCmsPath(pathArgument.value.value)

      if (
        !path ||
        path !== pathArgument.value.value ||
        !isAllowedCmsWritePath(path)
      ) {
        return false
      }
    }

    return validateHistorySelection(selection.selectionSet)
  })
}

function validateHistorySelection(selectionSet: SelectionSetNode) {
  if (selectionSet.selections.length !== 1) return false

  const nodes = selectionSet.selections[0]

  return (
    nodes.kind === Kind.FIELD &&
    nodes.name.value === 'nodes' &&
    !nodes.alias &&
    !nodes.arguments?.length &&
    !nodes.directives?.length &&
    !!nodes.selectionSet &&
    validateCommitNodeSelection(nodes.selectionSet)
  )
}

function validateCommitNodeSelection(selectionSet: SelectionSetNode) {
  const leafFields = new Set(['oid', 'message', 'committedDate'])

  if (selectionSet.selections.length === 0) return false

  return selectionSet.selections.every((selection) => {
    if (selection.kind !== Kind.FIELD || selection.directives?.length)
      return false

    if (leafFields.has(selection.name.value)) {
      return !selection.arguments?.length && !selection.selectionSet
    }

    if (selection.name.value !== 'author') return false

    return (
      !selection.arguments?.length &&
      !!selection.selectionSet &&
      validateAuthorSelection(selection.selectionSet)
    )
  })
}

function validateAuthorSelection(selectionSet: SelectionSetNode) {
  const leafFields = new Set(['name', 'email', 'avatarUrl'])

  if (selectionSet.selections.length === 0) return false

  return selectionSet.selections.every((selection) => {
    if (selection.kind !== Kind.FIELD || selection.directives?.length)
      return false

    if (leafFields.has(selection.name.value)) {
      return !selection.arguments?.length && !selection.selectionSet
    }

    if (selection.name.value !== 'user') return false

    return (
      !selection.arguments?.length &&
      !!selection.selectionSet &&
      validateLeafSelection(selection.selectionSet, ['databaseId', 'login'])
    )
  })
}

function validateLeafSelection(
  selectionSet: SelectionSetNode,
  allowedNames: string[],
) {
  const allowed = new Set(allowedNames)

  return (
    selectionSet.selections.length > 0 &&
    selectionSet.selections.every((selection) => {
      return (
        selection.kind === Kind.FIELD &&
        allowed.has(selection.name.value) &&
        !selection.arguments?.length &&
        !selection.directives?.length &&
        !selection.selectionSet
      )
    })
  )
}

function isCmsCommitOperation(
  operation: OperationDefinitionNode,
  variables: Record<string, unknown>,
) {
  if (
    operation.operation !== 'mutation' ||
    operation.directives?.length ||
    operation.selectionSet.selections.length !== 1 ||
    Object.keys(variables).length !== 1 ||
    !Object.hasOwn(variables, 'input')
  ) {
    return false
  }

  const root = operation.selectionSet.selections[0]

  if (
    root.kind !== Kind.FIELD ||
    root.name.value !== 'createCommitOnBranch' ||
    root.alias ||
    root.directives?.length ||
    !root.selectionSet ||
    !hasExactArguments(root, ['input'])
  ) {
    return false
  }

  const input = getArgument(root, 'input')?.value

  return input?.kind === Kind.VARIABLE && input.name.value === 'input'
}

function parseCmsCommitInput(value: unknown): CmsCommitInput | null {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'branch',
      'expectedHeadOid',
      'fileChanges',
      'message',
    ]) ||
    !isRecord(value.branch) ||
    !hasOnlyKeys(value.branch, ['repositoryNameWithOwner', 'branchName']) ||
    value.branch.repositoryNameWithOwner !==
      `${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}` ||
    value.branch.branchName !== CMS_REPOSITORY.branch ||
    typeof value.expectedHeadOid !== 'string' ||
    !SHA_PATTERN.test(value.expectedHeadOid) ||
    !isRecord(value.fileChanges) ||
    !hasOnlyKeys(value.fileChanges, ['additions', 'deletions']) ||
    !isRecord(value.message) ||
    !hasOnlyKeys(value.message, ['headline']) ||
    typeof value.message.headline !== 'string'
  ) {
    return null
  }

  const additionsValue = value.fileChanges.additions ?? []
  const deletionsValue = value.fileChanges.deletions ?? []

  if (!Array.isArray(additionsValue) || !Array.isArray(deletionsValue)) {
    return null
  }

  if (
    additionsValue.length + deletionsValue.length === 0 ||
    additionsValue.length + deletionsValue.length > MAX_CHANGE_COUNT
  ) {
    return null
  }

  const additions: CmsAddition[] = []
  const deletions: CmsDeletion[] = []
  const paths = new Set<string>()
  let totalContentBytes = 0

  for (const addition of additionsValue) {
    if (
      !isRecord(addition) ||
      !hasOnlyKeys(addition, ['path', 'contents']) ||
      typeof addition.path !== 'string' ||
      typeof addition.contents !== 'string' ||
      !BASE64_PATTERN.test(addition.contents)
    ) {
      return null
    }

    const path = normalizeCmsPath(addition.path)

    if (
      !path ||
      path !== addition.path ||
      !isAllowedCmsWritePath(path) ||
      paths.has(path)
    ) {
      return null
    }

    const byteSize = getBase64ByteSize(addition.contents)

    totalContentBytes += byteSize

    if (totalContentBytes > MAX_TOTAL_CONTENT_BYTES) return null

    paths.add(path)
    additions.push({ path, contents: addition.contents, byteSize })
  }

  for (const deletion of deletionsValue) {
    if (
      !isRecord(deletion) ||
      !hasOnlyKeys(deletion, ['path']) ||
      typeof deletion.path !== 'string'
    ) {
      return null
    }

    const path = normalizeCmsPath(deletion.path)

    if (
      !path ||
      path !== deletion.path ||
      !isAllowedCmsDeletePath(path) ||
      paths.has(path)
    ) {
      return null
    }

    paths.add(path)
    deletions.push({ path })
  }

  return {
    expectedHeadOid: value.expectedHeadOid,
    additions,
    deletions,
  }
}

async function recoverAmbiguousDirectCommit({
  commitInput,
  expectedHeadOid,
  requestMarker,
  token,
}: {
  commitInput: CmsCommitInput
  expectedHeadOid: string
  requestMarker: string
  token: string
}) {
  let currentHead: string

  try {
    const mainRef = await githubJson<unknown>({
      path: `/repos/${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}/git/ref/heads/${CMS_REPOSITORY.branch}`,
      token,
    })
    const sha = getGitRefSha(mainRef)

    if (!sha || sha === expectedHeadOid) return null

    currentHead = sha
  } catch {
    return null
  }

  const recoveryBytes = commitInput.additions.reduce(
    (total, addition) => total + addition.byteSize,
    0,
  )

  if (recoveryBytes > MAX_AMBIGUOUS_RECOVERY_BYTES) {
    throw new GitHubApiError(
      '保存結果を安全に確認できません。CMSを再読み込みして反映状態を確認してください。',
      409,
    )
  }

  const comparison = await githubJson<unknown>({
    path: `/repos/${CMS_REPOSITORY.owner}/${CMS_REPOSITORY.name}/compare/${expectedHeadOid}...${currentHead}`,
    token,
  }).catch(() => null)
  const recovered = await matchExactCmsCommit({
    comparison,
    commitInput,
    currentHead,
    expectedHeadOid,
    requestMarker,
  })

  if (!recovered) {
    throw new GitHubApiError(
      'mainが更新されています。CMSを再読み込みしてから、もう一度保存してください。',
      409,
    )
  }

  return {
    data: {
      createCommitOnBranch: {
        commit: recovered,
      },
    },
    extensions: {
      cms: {
        recovered: true,
      },
    },
  }
}

async function matchExactCmsCommit({
  comparison,
  commitInput,
  currentHead,
  expectedHeadOid,
  requestMarker,
}: {
  comparison: unknown
  commitInput: CmsCommitInput
  currentHead: string
  expectedHeadOid: string
  requestMarker: string
}) {
  if (
    !isRecord(comparison) ||
    comparison.status !== 'ahead' ||
    comparison.ahead_by !== 1 ||
    comparison.behind_by !== 0 ||
    comparison.total_commits !== 1 ||
    !Array.isArray(comparison.commits) ||
    comparison.commits.length !== 1 ||
    !Array.isArray(comparison.files)
  ) {
    return null
  }

  const commit = comparison.commits[0]

  if (
    !isRecord(commit) ||
    commit.sha !== currentHead ||
    !Array.isArray(commit.parents) ||
    commit.parents.length !== 1 ||
    !isRecord(commit.parents[0]) ||
    commit.parents[0].sha !== expectedHeadOid
  ) {
    return null
  }

  const expectedFiles = new Map<
    string,
    { status: 'removed' } | { sha: string; status: 'written' }
  >()
  const additionShas: string[] = []

  for (const addition of commitInput.additions) {
    const sha = await getGitBlobSha(addition.contents, addition.byteSize)

    additionShas.push(sha)
    expectedFiles.set(addition.path, {
      status: 'written',
      sha,
    })
  }

  for (const deletion of commitInput.deletions) {
    expectedFiles.set(deletion.path, { status: 'removed' })
  }

  if (comparison.files.length !== expectedFiles.size) return null

  for (const file of comparison.files) {
    if (!isRecord(file) || typeof file.filename !== 'string') return null

    const expected = expectedFiles.get(file.filename)

    if (!expected) return null

    if (expected.status === 'removed') {
      if (file.status !== 'removed') return null
    } else if (
      (file.status !== 'added' && file.status !== 'modified') ||
      file.sha !== expected.sha
    ) {
      return null
    }

    expectedFiles.delete(file.filename)
  }

  if (expectedFiles.size !== 0) return null

  const commitMetadata = isRecord(commit.commit) ? commit.commit : {}
  const commitMessage =
    typeof commitMetadata.message === 'string' ? commitMetadata.message : ''

  if (!commitMessage.split(/\r?\n/).includes(`CMS request: ${requestMarker}`)) {
    return null
  }

  const committer = isRecord(commitMetadata.committer)
    ? commitMetadata.committer
    : {}
  const committedDate =
    typeof committer.date === 'string' ? committer.date : null
  const recoveredCommit: Record<string, unknown> = {
    oid: currentHead,
    committedDate,
  }

  for (let index = 0; index < commitInput.additions.length; index += 1) {
    const addition = commitInput.additions[index]

    if (addition.byteSize <= MAX_GRAPHQL_BLOB_SIZE) {
      recoveredCommit[`file_${index}`] = {
        oid: additionShas[index],
      }
    }
  }

  return recoveredCommit
}

async function getGitBlobSha(contents: string, byteSize: number) {
  const content = Uint8Array.from(atob(contents), (character) =>
    character.charCodeAt(0),
  )
  const header = new TextEncoder().encode(`blob ${byteSize}\0`)
  const data = new Uint8Array(header.byteLength + content.byteLength)

  data.set(header)
  data.set(content, header.byteLength)

  const digest = await crypto.subtle.digest('SHA-1', data)

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function buildCmsCommitMutation(additions: CmsAddition[]) {
  const fileShaQuery = additions
    .map(({ path, byteSize }, index) => {
      return byteSize <= MAX_GRAPHQL_BLOB_SIZE
        ? `file_${index}: file(path: ${JSON.stringify(path)}) { oid }`
        : ''
    })
    .filter(Boolean)
    .join('\n')

  return `
    mutation CmsCommit($input: CreateCommitOnBranchInput!) {
      createCommitOnBranch(input: $input) {
        commit {
          oid
          committedDate
          ${fileShaQuery}
        }
      }
    }
  `
}

function ensureCommitSucceeded(result: Record<string, unknown>) {
  if (Array.isArray(result.errors) && result.errors.length > 0) {
    const firstError = result.errors[0]
    const message =
      isRecord(firstError) && typeof firstError.message === 'string'
        ? firstError.message
        : 'GitHub GraphQL mutation が失敗しました。'

    throw new GitHubApiError(message, 502)
  }

  if (
    !isRecord(result.data) ||
    !isRecord(result.data.createCommitOnBranch) ||
    !isRecord(result.data.createCommitOnBranch.commit) ||
    typeof result.data.createCommitOnBranch.commit.oid !== 'string'
  ) {
    throw new GitHubApiError(
      'GitHub GraphQL mutation response が不正です。',
      502,
    )
  }
}

function parseGraphqlPayload(text: string): GraphqlPayload | null {
  try {
    const value: unknown = JSON.parse(text)

    if (
      !isRecord(value) ||
      typeof value.query !== 'string' ||
      (value.variables !== undefined && !isRecord(value.variables))
    ) {
      return null
    }

    return {
      query: value.query,
      variables: value.variables || {},
    }
  } catch {
    return null
  }
}

function parseOperation(query: string) {
  try {
    const document = parse(query)

    if (document.definitions.length !== 1) return null

    const definition = document.definitions[0]

    return definition.kind === Kind.OPERATION_DEFINITION ? definition : null
  } catch {
    return null
  }
}

function variablesMatchDefinitions(
  operation: OperationDefinitionNode,
  variables: Record<string, unknown>,
) {
  const defined = new Set(
    (operation.variableDefinitions || []).map(
      ({ variable }) => variable.name.value,
    ),
  )

  return Object.keys(variables).every((name) => defined.has(name))
}

function hasExactArguments(field: FieldNode, names: string[]) {
  const argumentsList = field.arguments || []

  return (
    argumentsList.length === names.length &&
    new Set(argumentsList.map(({ name }) => name.value)).size ===
      names.length &&
    names.every((name) => argumentsList.some((arg) => arg.name.value === name))
  )
}

function argumentMatches(
  field: FieldNode,
  name: string,
  expected: string,
  variables: Record<string, unknown>,
) {
  return getArgumentString(field, name, variables) === expected
}

function getArgument(field: FieldNode, name: string): ArgumentNode | undefined {
  return field.arguments?.find((argument) => argument.name.value === name)
}

function getArgumentString(
  field: FieldNode,
  name: string,
  variables: Record<string, unknown>,
) {
  const value = getArgument(field, name)?.value

  return value ? resolveStringValue(value, variables) : null
}

function resolveStringValue(
  value: ValueNode,
  variables: Record<string, unknown>,
) {
  if (value.kind === Kind.STRING) return value.value

  if (value.kind === Kind.VARIABLE) {
    const variable = variables[value.name.value]

    return typeof variable === 'string' ? variable : null
  }

  return null
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: string[]) {
  const allowed = new Set(allowedKeys)

  return Object.keys(value).every((key) => allowed.has(key))
}

function getBase64ByteSize(value: string) {
  if (!value) return 0

  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0

  return (value.length * 3) / 4 - padding
}

function buildCommitHeadline(changedPaths: string[]) {
  const extraCount = changedPaths.length - 1

  return `cms: update ${summarizePath(changedPaths[0])}${extraCount > 0 ? ` (+${extraCount})` : ''}`
}

function summarizePath(path: string) {
  return path.length > 200 ? `${path.slice(0, 197)}...` : path
}

function getGitRefSha(value: unknown) {
  if (!isRecord(value) || !isRecord(value.object)) return null

  return typeof value.object.sha === 'string' &&
    SHA_PATTERN.test(value.object.sha)
    ? value.object.sha
    : null
}

async function readRequestText(request: Request) {
  const contentLength = Number(request.headers.get('Content-Length') || 0)

  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return null
  }

  if (!request.body) return ''

  const reader = request.body.getReader()
  const decoder = new TextDecoder('utf-8', {
    fatal: true,
    ignoreBOM: false,
  })
  const chunks: string[] = []
  let totalBytes = 0

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) break

      totalBytes += value.byteLength

      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined)
        return null
      }

      chunks.push(decoder.decode(value, { stream: true }))
    }

    chunks.push(decoder.decode())
    return chunks.join('')
  } finally {
    reader.releaseLock()
  }
}

function toErrorResponse(error: unknown) {
  if (error instanceof GitHubApiError) {
    return json({ message: error.message }, error.status)
  }

  console.error(
    JSON.stringify({
      message: 'CMS GraphQL proxy failed',
      error: error instanceof Error ? error.message : String(error),
    }),
  )

  return json({ message: 'CMS GraphQL proxyでエラーが発生しました。' }, 500)
}

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}
