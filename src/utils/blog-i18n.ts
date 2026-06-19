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
import { defaultLocale, type Locale } from '../i18n'
import type { AuthorData } from './authors'

/** 著者の多言語フィールド型 */
type LocalizedAuthor = { name?: string; bio?: string; skills?: string[] }

/** Strip locale prefix from post id to get the base slug */
export function getBaseSlug(postId: string): string {
  const idx = postId.indexOf('/')
  return idx !== -1 ? postId.slice(idx + 1) : postId
}

/** true if the post is a base (non-localized) post */
export function isBasePost(post: CollectionEntry<'blog'>): boolean {
  return !post.id.includes('/')
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
