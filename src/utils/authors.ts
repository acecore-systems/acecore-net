/**
 * 著者データ取得ユーティリティ
 *
 * Astro Content Collections の authors コレクションから著者情報を取得する。
 * getAllAuthors() は Promise をメモ化し、ビルド中の重複フェッチを防止する。
 */
import { getCollection, type CollectionEntry } from 'astro:content'

/** 著者データの型（コレクションエントリの data 部分） */
export type AuthorData = CollectionEntry<'authors'>['data']

/** メモ化された著者一覧の Promise キャッシュ */
let authorsPromise: Promise<AuthorData[]> | undefined

/**
 * 全著者データを取得する。
 * 初回呼び出しで Promise を生成しキャッシュするため、
 * 複数のページで呼び出しても API リクエストは 1 回のみ。
 */
export function getAllAuthors(): Promise<AuthorData[]> {
  if (!authorsPromise) {
    authorsPromise = getCollection('authors').then((entries) =>
      entries.map((entry) => entry.data as AuthorData),
    )
  }

  return authorsPromise
}

/**
 * 著者 ID で著者データを検索する。
 * 見つからない場合は null を返す。
 */
export function findAuthorById(
  authors: readonly AuthorData[] = [],
  authorId?: string | null,
): AuthorData | null {
  if (!authorId) return null
  return authors.find((author) => author.id === authorId) ?? null
}
