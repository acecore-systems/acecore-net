import type { CollectionEntry } from 'astro:content'
import { defaultLocale, type Locale } from '../i18n'
import authors from '../data/authors.json'

type Author = (typeof authors)[number]
type LocalizedAuthor = { bio: string; skills: string[] }

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
export function getLocalizedAuthor(author: Author, locale: Locale) {
  if (locale === defaultLocale) return author
  const i18n = (author as Author & { i18n?: Record<string, LocalizedAuthor> }).i18n
  const localized = i18n?.[locale]
  return {
    ...author,
    bio: localized?.bio ?? author.bio,
    skills: localized?.skills ?? author.skills,
  }
}
