/**
 * Astro Content Collections 定義
 *
 * blog・authors・tags の 3 コレクションを定義し、
 * Zod スキーマでフロントマターのバリデーションを行う。
 *
 * blog コレクション:
 *   - Markdown 記事（src/content/blog/）を言語別サブフォルダで管理
 *   - title / description / date / author は必須、その他は任意の拡張フィールド
 *   - 日付はタイムゾーン付き（JST +09:00）でパースされる
 *
 * authors / tags コレクション:
 *   - JSON ファイル（src/content/authors/, src/content/tags/）で定義
 *   - i18n フィールドでロケール別の表示名を持つ
 */
import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'
import { glob } from 'astro/loaders'

/** ブログ記事の日付文字列に付与する JST タイムゾーンオフセット */
const BLOG_TIMEZONE_OFFSET = '+09:00'
/** 日付のみ (YYYY-MM-DD) にマッチする正規表現 */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
/** 日時 (YYYY-MM-DDTHH:MM or YYYY-MM-DDTHH:MM:SS) にマッチする正規表現 */
const LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/

/**
 * フロントマターの日付文字列を JST として解釈し Date オブジェクトに変換する。
 *
 * - Date オブジェクトが渡された場合はそのままコピーして返す
 * - "YYYY-MM-DD" → "YYYY-MM-DDT00:00:00+09:00" に正規化
 * - "YYYY-MM-DDTHH:MM" → "YYYY-MM-DDTHH:MM+09:00" に正規化
 * - すでにタイムゾーン情報を含む文字列はそのままパース
 */
function parseContentDate(value: string | Date): Date {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error('Invalid date value in content frontmatter')
    }
    return new Date(value.getTime())
  }

  const raw = String(value).trim()
  const normalized = DATE_ONLY_PATTERN.test(raw)
    ? `${raw}T00:00:00${BLOG_TIMEZONE_OFFSET}`
    : LOCAL_DATETIME_PATTERN.test(raw)
      ? `${raw}${BLOG_TIMEZONE_OFFSET}`
      : raw

  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value in content frontmatter: ${raw}`)
  }

  return date
}

/** 文字列または Date を受け取り、JST 基準の Date に変換する Zod トランスフォーマー */
const contentDate = z.union([z.string(), z.date()]).transform(parseContentDate)

/** 著者の多言語フィールド（name / bio / skills を任意で上書き） */
const localizedAuthorSchema = z.object({
  name: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
})

/** タグの多言語フィールド（name を任意で上書き） */
const localizedTagSchema = z.object({
  name: z.string().optional(),
})

/**
 * ブログ記事コレクション
 * src/content/blog/ 配下の Markdown ファイルを読み込む。
 * 言語別サブフォルダ（en/, zh-cn/ 等）で翻訳記事を管理する。
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: contentDate,
    lastUpdated: contentDate.optional(),
    tags: z.array(z.string()).optional(),
    image: z.string().optional(),
    uploadedImage: z.string().optional(),
    author: z.string(),
    callout: z
      .object({
        type: z.enum(['info', 'warning', 'tip', 'note']).default('info'),
        title: z.string().optional(),
        text: z.string(),
      })
      .optional(),
    timeline: z
      .object({
        title: z.string().optional(),
        items: z.array(
          z.object({
            date: z.string(),
            title: z.string(),
            description: z.string().optional(),
          }),
        ),
      })
      .optional(),
    youtube: z
      .object({
        videoId: z.string(),
        title: z.string().optional(),
        caption: z.string().optional(),
      })
      .optional(),
    faq: z
      .object({
        title: z.string().optional(),
        items: z.array(z.object({ question: z.string(), answer: z.string() })),
      })
      .optional(),
    gallery: z
      .object({
        title: z.string().optional(),
        items: z.array(z.object({ src: z.string(), alt: z.string() })),
        columns: z.union([z.literal(2), z.literal(3)]).optional(),
      })
      .optional(),
    linkCards: z
      .array(
        z.object({
          href: z.string(),
          title: z.string(),
          description: z.string().optional(),
          icon: z.string().optional(),
        }),
      )
      .optional(),
    processFigure: z
      .object({
        eyebrow: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
        variant: z.enum(['card', 'inline']).optional(),
        steps: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
            icon: z.string(),
            accent: z.enum(['brand', 'emerald', 'amber', 'slate']).optional(),
          }),
        ),
      })
      .optional(),
    compareTable: z
      .object({
        title: z.string().optional(),
        before: z.object({ label: z.string(), items: z.array(z.string()) }),
        after: z.object({ label: z.string(), items: z.array(z.string()) }),
      })
      .optional(),
    checklist: z
      .object({
        title: z.string().optional(),
        items: z.array(
          z.object({ text: z.string(), checked: z.boolean().optional() }),
        ),
      })
      .optional(),
    insightGrid: z
      .object({
        eyebrow: z.string().optional(),
        title: z.string(),
        description: z.string().optional(),
        variant: z.enum(['card', 'inline']).optional(),
        items: z.array(
          z.object({
            title: z.string(),
            description: z.string(),
            icon: z.string(),
            tone: z.enum(['brand', 'emerald', 'amber', 'slate']).optional(),
          }),
        ),
      })
      .optional(),
    testimonials: z
      .array(
        z.object({
          quote: z.string(),
          name: z.string(),
          role: z.string().optional(),
        }),
      )
      .optional(),
    pullQuote: z
      .object({ text: z.string(), attribution: z.string().optional() })
      .optional(),
  }),
})

/**
 * 著者コレクション
 * src/content/authors/ 配下の JSON ファイルを読み込む。
 * i18n フィールドでロケール別の名前・経歴・スキルを持つ。
 */
const authors = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/authors' }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    avatar: z.string().optional(),
    avatarImage: z.string().optional(),
    bio: z.string().optional(),
    url: z.string().optional(),
    github: z.string().optional(),
    twitter: z.string().optional(),
    skills: z.array(z.string()).optional(),
    i18n: z.record(z.string(), localizedAuthorSchema).optional(),
  }),
})

/**
 * タグコレクション
 * src/content/tags/ 配下の JSON ファイルを読み込む。
 * i18n フィールドでロケール別の表示名を持つ。
 */
const tags = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/tags' }),
  schema: z.object({
    id: z.string(),
    name: z.string(),
    i18n: z.record(z.string(), localizedTagSchema).optional(),
  }),
})

export const collections = { blog, authors, tags }
