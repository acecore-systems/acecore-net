/**
 * ブログ記事の多言語対応ユーティリティ
 *
 * 記事の言語別バリアントの解決、ベーススラッグの抽出、
 * 著者情報のローカライズを提供する。
 *
 * 記事 ID の構造:
 *   - ベース記事（日本語）: "my-post.md"
 *   - 翻訳記事: "en/my-post.md", "zh-cn/my-post.md" 等
 */
import type { CollectionEntry } from 'astro:content'
import { defaultLocale, getLocalizedUrl, locales, type Locale } from '../i18n'
import type { AuthorData } from './authors'

/** 著者の多言語フィールド型 */
type LocalizedAuthor = { name?: string; bio?: string; skills?: string[] }

const nonDefaultLocalePattern = locales
  .filter((locale) => locale !== defaultLocale)
  .join('|')

function getUrlSuffix(href: string): string {
  const suffixIndex = href.search(/[?#]/)
  return suffixIndex === -1 ? '' : href.slice(suffixIndex)
}

/** Strip locale prefix from post id to get the base slug */
export function getBaseSlug(postId: string): string {
  const idx = postId.indexOf('/')
  return idx !== -1 ? postId.slice(idx + 1) : postId
}

/** true if the post is a base (non-localized) post */
export function isBasePost(post: CollectionEntry<'blog'>): boolean {
  return !post.id.includes('/')
}

/** true if a post has content in the requested locale */
export function isPostAvailableInLocale(
  post: CollectionEntry<'blog'>,
  allPosts: CollectionEntry<'blog'>[],
  locale: Locale,
): boolean {
  if (locale === defaultLocale) return true
  const baseSlug = getBaseSlug(post.id)
  return allPosts.some((candidate) => candidate.id === `${locale}/${baseSlug}`)
}

/** Keep only posts that have real content in the requested locale. */
export function filterPostsForLocale(
  posts: CollectionEntry<'blog'>[],
  allPosts: CollectionEntry<'blog'>[],
  locale: Locale,
): CollectionEntry<'blog'>[] {
  return posts.filter((post) => isPostAvailableInLocale(post, allPosts, locale))
}

/**
 * Resolve an article path without sending internal links through a redirect.
 * If no translation exists, link directly to the Japanese canonical page.
 */
export function getPostUrl(
  postId: string,
  allPosts: CollectionEntry<'blog'>[],
  locale: Locale,
): string {
  const baseSlug = getBaseSlug(postId)
  const basePost = allPosts.find((candidate) => candidate.id === baseSlug)
  return basePost && isPostAvailableInLocale(basePost, allPosts, locale)
    ? getLocalizedUrl(`/blog/${baseSlug}/`, locale)
    : `/blog/${baseSlug}/`
}

/** Localize a root-relative content link while preserving query and hash. */
export function localizeContentUrl(
  href: string,
  allPosts: CollectionEntry<'blog'>[],
  locale: Locale,
): string {
  if (
    locale === defaultLocale ||
    !href.startsWith('/') ||
    href.startsWith('//')
  ) {
    return href
  }

  const articleMatch = href.match(/^\/blog\/([^/?#]+)\/?(?:[?#].*)?$/)
  if (articleMatch) {
    return `${getPostUrl(articleMatch[1], allPosts, locale)}${getUrlSuffix(href)}`
  }

  const localizedArticleMatch = href.match(
    new RegExp(
      `^\\/(?:${nonDefaultLocalePattern})\\/blog\\/([^/?#]+)\\/?(?:[?#].*)?$`,
    ),
  )
  if (localizedArticleMatch) {
    return `${getPostUrl(localizedArticleMatch[1], allPosts, locale)}${getUrlSuffix(href)}`
  }

  return href === '/' ||
    /^\/(?:about|acestudio|blog|contact|privacy|services)(?:\/|[?#]|$)/.test(
      href,
    )
    ? `/${locale}${href}`
    : href
}
/** Get the localized version of a post, fallback to original */
export function localizePost(
  post: CollectionEntry<'blog'>,
  allPosts: CollectionEntry<'blog'>[],
  locale: Locale,
): CollectionEntry<'blog'> {
  if (locale === defaultLocale) return post
  return allPosts.find((p) => p.id === `${locale}/${post.id}`) ?? post
}

/** Get localized author bio and skills, fallback to default (ja) */
export function getLocalizedAuthor(author: AuthorData, locale: Locale) {
  if (locale === defaultLocale) return author
  const i18n = (
    author as AuthorData & { i18n?: Record<string, LocalizedAuthor> }
  ).i18n
  const localized = i18n?.[locale]
  return {
    ...author,
    name: localized?.name ?? author.name,
    bio: localized?.bio ?? author.bio,
    skills: localized?.skills ?? author.skills,
  }
}
