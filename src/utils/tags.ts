/**
 * タグデータ取得・ローカライズユーティリティ
 *
 * Astro Content Collections の tags コレクションからタグ情報を取得し、
 * ロケール別の表示名に変換する機能を提供する。
 * getAllTags() は Promise をメモ化してビルド中の重複フェッチを防止する。
 */
import { getCollection, type CollectionEntry } from 'astro:content'
import { defaultLocale, type Locale } from '../i18n'

/** タグデータの型（コレクションエントリの data 部分） */
export type TagData = CollectionEntry<'tags'>['data']

/** タグの多言語フィールド型 */
type LocalizedTag = { name?: string }

/** メモ化されたタグ一覧の Promise キャッシュ */
let tagsPromise: Promise<TagData[]> | undefined

/**
 * 全タグデータを取得する。
 * 初回呼び出しで Promise を生成しキャッシュするため、
 * 複数のページで呼び出しても API リクエストは 1 回のみ。
 */
export function getAllTags(): Promise<TagData[]> {
  if (!tagsPromise) {
    tagsPromise = getCollection('tags').then((entries) =>
      entries.map((entry) => entry.data as TagData),
    )
  }

  return tagsPromise
}

/**
 * タグ名でタグデータを検索する。
 * 見つからない場合は null を返す。
 */
export function findTagByName(
  tags: readonly TagData[] = [],
  tagName?: string | null,
): TagData | null {
  if (!tagName) return null
  return tags.find((tag) => tag.name === tagName) ?? null
}

/**
 * タグデータをロケール別の表示名に変換する。
 * デフォルトロケール（日本語）の場合はそのまま返す。
 * 翻訳が存在しない場合は日本語名にフォールバックする。
 */
export function getLocalizedTag(tag: TagData, locale: Locale) {
  if (locale === defaultLocale) return tag
  const i18n = (tag as TagData & { i18n?: Record<string, LocalizedTag> }).i18n
  const localized = i18n?.[locale]
  return {
    ...tag,
    name: localized?.name ?? tag.name,
  }
}

/**
 * タグ名をロケールに合わせた表示名に変換する便利関数。
 * タグが見つからない場合は元のタグ名をそのまま返す。
 */
export function getLocalizedTagName(
  tags: readonly TagData[] = [],
  tagName: string,
  locale: Locale,
): string {
  const tag = findTagByName(tags, tagName)
  if (!tag) return tagName
  return getLocalizedTag(tag, locale).name
}
