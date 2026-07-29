import { JSON_SCHEMA, load as loadYaml } from 'js-yaml'

import {
  authorSchema,
  blogSchema,
  tagSchema,
} from '../../../src/content-schemas.ts'
import {
  isCmsReferenceStatePath,
  isCmsReferenceTextPath,
  normalizeCmsPath,
} from './_cms-policy.ts'
import { GitHubApiError } from './_github-api.ts'

export type CmsReferenceStateEntry = {
  path: string
  contents?: string
}

type CmsReferenceAddition = {
  path: string
  contents: string
}

type CmsReferenceDeletion = {
  path: string
}

type ProjectedTextEntry = {
  path: string
  contents: string
}

const BLOG_FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/
const LOCAL_UPLOAD_PREFIX = '/uploads/'

export function validateProjectedCmsReferences({
  additions,
  currentState,
  deletions,
}: {
  additions: readonly CmsReferenceAddition[]
  currentState: readonly CmsReferenceStateEntry[]
  deletions: readonly CmsReferenceDeletion[]
}) {
  const projectedState = new Map<string, string | null>()

  for (const entry of currentState) {
    if (!isCmsReferenceStatePath(entry.path)) continue

    if (isCmsReferenceTextPath(entry.path)) {
      if (typeof entry.contents !== 'string') {
        throw new GitHubApiError(
          `GitHub上のCMS参照元を読み込めません: ${entry.path}`,
          502,
        )
      }

      projectedState.set(entry.path, entry.contents)
    } else {
      projectedState.set(entry.path, null)
    }
  }

  for (const { path } of deletions) {
    if (isCmsReferenceStatePath(path)) projectedState.delete(path)
  }

  for (const addition of additions) {
    if (!isCmsReferenceStatePath(addition.path)) continue

    projectedState.set(
      addition.path,
      isCmsReferenceTextPath(addition.path)
        ? decodeBase64Text(addition.path, addition.contents)
        : null,
    )
  }

  validateProjectedState(projectedState)
}

function validateProjectedState(state: ReadonlyMap<string, string | null>) {
  const authors = new Set<string>()
  const tags = new Map<string, string>()
  const media = new Set<string>()
  const articles: ProjectedTextEntry[] = []
  const authorProfiles: ProjectedTextEntry[] = []

  for (const [path, contents] of state) {
    if (path.startsWith('public/uploads/')) {
      media.add(path)
      continue
    }

    if (typeof contents !== 'string') {
      throw new GitHubApiError(`CMS参照状態が不正です: ${path}`, 422)
    }

    if (path.startsWith('src/content/blog/')) {
      articles.push({ path, contents })
      continue
    }

    if (path.startsWith('src/content/authors/')) {
      const author = parseAuthor(path, contents)
      const id = getFileStem(path)

      if (author.id !== id) {
        throw new GitHubApiError(
          `著者IDとファイル名が一致しません: ${path}`,
          422,
        )
      }

      authors.add(author.id)
      authorProfiles.push({ path, contents })
      continue
    }

    if (path.startsWith('src/content/tags/')) {
      const tag = parseTag(path, contents)
      const id = getFileStem(path)

      if (tag.id !== id) {
        throw new GitHubApiError(
          `タグIDとファイル名が一致しません: ${path}`,
          422,
        )
      }

      const existingPath = tags.get(tag.name)

      if (existingPath && existingPath !== path) {
        throw new GitHubApiError(
          `同じタグ名を複数の定義で使用できません: ${tag.name}`,
          422,
        )
      }

      tags.set(tag.name, path)
    }
  }

  for (const profile of authorProfiles) {
    const author = parseAuthor(profile.path, profile.contents)

    validateOptionalMediaReference({
      allowExternal: true,
      field: 'avatar',
      media,
      ownerPath: profile.path,
      value: author.avatar,
    })
    validateOptionalMediaReference({
      allowExternal: false,
      field: 'avatarImage',
      media,
      ownerPath: profile.path,
      value: author.avatarImage,
    })
  }

  for (const article of articles) {
    const frontmatter = parseBlogFrontmatter(article.path, article.contents)

    if (!authors.has(frontmatter.author)) {
      throw new GitHubApiError(
        `記事の著者が存在しません: ${article.path} -> ${frontmatter.author}`,
        422,
      )
    }

    for (const tag of frontmatter.tags ?? []) {
      if (!tags.has(tag)) {
        throw new GitHubApiError(
          `記事のタグが存在しません: ${article.path} -> ${tag}`,
          422,
        )
      }
    }

    validateOptionalMediaReference({
      allowExternal: true,
      field: 'image',
      media,
      ownerPath: article.path,
      value: frontmatter.image,
    })
    validateOptionalMediaReference({
      allowExternal: false,
      field: 'uploadedImage',
      media,
      ownerPath: article.path,
      value: frontmatter.uploadedImage,
    })

    for (const [index, item] of (frontmatter.gallery?.items ?? []).entries()) {
      validateOptionalMediaReference({
        allowExternal: false,
        field: `gallery.items[${index}].src`,
        media,
        ownerPath: article.path,
        value: item.src,
      })
    }
  }
}

function parseBlogFrontmatter(path: string, source: string) {
  const match = source.match(BLOG_FRONTMATTER_PATTERN)

  if (!match) {
    throw new GitHubApiError(`記事frontmatterが不正です: ${path}`, 422)
  }

  let value: unknown

  try {
    value = loadYaml(match[1], { schema: JSON_SCHEMA })
  } catch {
    throw new GitHubApiError(`記事frontmatterが不正です: ${path}`, 422)
  }

  const parsed = blogSchema.strict().safeParse(value)

  if (!parsed.success) {
    throw new GitHubApiError(`記事schemaが不正です: ${path}`, 422)
  }

  return parsed.data
}

function parseAuthor(path: string, source: string) {
  const value = parseJsonValue(path, source)
  const result = authorSchema.strict().safeParse(value)

  if (!result.success) {
    throw new GitHubApiError(`JSON schemaが不正です: ${path}`, 422)
  }

  return result.data
}

function parseTag(path: string, source: string) {
  const value = parseJsonValue(path, source)
  const result = tagSchema.strict().safeParse(value)

  if (!result.success) {
    throw new GitHubApiError(`JSON schemaが不正です: ${path}`, 422)
  }

  return result.data
}

function parseJsonValue(path: string, source: string) {
  let value: unknown

  try {
    value = JSON.parse(source)
  } catch {
    throw new GitHubApiError(`JSONが不正です: ${path}`, 422)
  }

  return value
}

function validateOptionalMediaReference({
  allowExternal,
  field,
  media,
  ownerPath,
  value,
}: {
  allowExternal: boolean
  field: string
  media: ReadonlySet<string>
  ownerPath: string
  value?: string
}) {
  if (!value?.trim()) return

  const localCandidate = value.trim().startsWith(LOCAL_UPLOAD_PREFIX)
  const mediaPath = toRepositoryMediaPath(value)

  if (!mediaPath) {
    if (allowExternal && !localCandidate) return

    throw new GitHubApiError(
      `CMS画像参照は/uploads/配下を指定してください: ${ownerPath} (${field})`,
      422,
    )
  }

  if (!media.has(mediaPath)) {
    throw new GitHubApiError(
      `記事または著者の画像が存在しません: ${ownerPath} (${field}) -> ${value}`,
      422,
    )
  }
}

function toRepositoryMediaPath(value: string) {
  const rawPath = value.trim().split(/[?#]/, 1)[0]

  if (!rawPath.startsWith(LOCAL_UPLOAD_PREFIX)) return null

  let decodedPath: string

  try {
    decodedPath = decodeURIComponent(rawPath)
  } catch {
    return null
  }

  const repositoryPath = `public${decodedPath}`
  const normalized = normalizeCmsPath(repositoryPath)

  return normalized === repositoryPath &&
    isCmsReferenceStatePath(repositoryPath)
    ? repositoryPath
    : null
}

function decodeBase64Text(path: string, value: string) {
  try {
    const binary = atob(value)
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    )

    return new TextDecoder('utf-8', {
      fatal: true,
      ignoreBOM: false,
    }).decode(bytes)
  } catch {
    throw new GitHubApiError(`CMS保存内容を読み込めません: ${path}`, 422)
  }
}

function getFileStem(path: string) {
  const fileName = path.split('/').pop() || ''
  const dot = fileName.lastIndexOf('.')

  return dot === -1 ? fileName : fileName.slice(0, dot)
}
