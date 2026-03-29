import { getCollection, type CollectionEntry } from 'astro:content'
import { defaultLocale, type Locale } from '../i18n'

export type TagData = CollectionEntry<'tags'>['data']

type LocalizedTag = { name?: string }

let tagsPromise: Promise<TagData[]> | undefined

export function getAllTags(): Promise<TagData[]> {
  if (!tagsPromise) {
    tagsPromise = getCollection('tags').then((entries) =>
      entries.map((entry) => entry.data as TagData),
    )
  }

  return tagsPromise
}

export function findTagByName(
  tags: readonly TagData[] = [],
  tagName?: string | null,
): TagData | null {
  if (!tagName) return null
  return tags.find((tag) => tag.name === tagName) ?? null
}

export function getLocalizedTag(tag: TagData, locale: Locale) {
  if (locale === defaultLocale) return tag
  const i18n = (tag as TagData & { i18n?: Record<string, LocalizedTag> }).i18n
  const localized = i18n?.[locale]
  return {
    ...tag,
    name: localized?.name ?? tag.name,
  }
}

export function getLocalizedTagName(
  tags: readonly TagData[] = [],
  tagName: string,
  locale: Locale,
): string {
  const tag = findTagByName(tags, tagName)
  if (!tag) return tagName
  return getLocalizedTag(tag, locale).name
}
