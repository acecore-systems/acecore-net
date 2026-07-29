/**
 * Astro Content Collections 定義
 *
 * blog・authors・tags の 3 コレクションを定義し、
 * Zod スキーマでフロントマターのバリデーションを行う。
 *
 * blog コレクション:
 *   - Markdown 記事（src/content/blog/）を言語別サブフォルダで管理
 *   - title / description / date / author は必須、その他は任意の拡張フィールド
 *   - 日付は時刻まで必須とし、タイムゾーン未指定の場合は JST +09:00 としてパースされる
 *
 * authors / tags コレクション:
 *   - JSON ファイル（src/content/authors/, src/content/tags/）で定義
 *   - i18n フィールドでロケール別の表示名を持つ
 */
import { glob } from 'astro/loaders'
import { defineCollection } from 'astro:content'

import { authorSchema, blogSchema, tagSchema } from './content-schemas'

/**
 * ブログ記事コレクション
 * src/content/blog/ 配下の Markdown ファイルを読み込む。
 * 言語別サブフォルダ（en/, zh-cn/ 等）で翻訳記事を管理する。
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: blogSchema,
})

/**
 * 著者コレクション
 * src/content/authors/ 配下の JSON ファイルを読み込む。
 * i18n フィールドでロケール別の名前・経歴・スキルを持つ。
 */
const authors = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/authors' }),
  schema: authorSchema,
})

/**
 * タグコレクション
 * src/content/tags/ 配下の JSON ファイルを読み込む。
 * i18n フィールドでロケール別の表示名を持つ。
 */
const tags = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/tags' }),
  schema: tagSchema,
})

export const collections = { blog, authors, tags }
