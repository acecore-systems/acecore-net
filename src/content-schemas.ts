import { z } from 'zod'

import { ARTICLE_ID_PATTERN } from './utils/article-id.ts'
import {
  isValidContentDateValue,
  normalizeContentDateValue,
} from './utils/content-date.ts'

const CONTENT_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})?$/

function parseContentDate(value: string): Date {
  const raw = value.trim()
  const normalized = normalizeContentDateValue(raw)
  const date = new Date(normalized)

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date value in content frontmatter: ${raw}`)
  }

  return date
}

const contentDate = z
  .string()
  .refine((value) => CONTENT_DATETIME_PATTERN.test(value.trim()), {
    message:
      'Content date must include time as YYYY-MM-DDTHH:mm, optionally with timezone',
  })
  .refine(isValidContentDateValue, {
    message: 'Content date must use a real calendar date and valid time',
  })
  .transform(parseContentDate)

const localizedAuthorSchema = z.object({
  name: z.string().optional(),
  role: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
})

const localizedTagSchema = z.object({
  name: z.string().optional(),
})

export const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  articleId: z.string().uuid().regex(ARTICLE_ID_PATTERN),
  date: contentDate,
  lastUpdated: contentDate.optional(),
  translation: z.boolean().optional(),
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
  statBar: z
    .object({
      items: z.array(
        z.object({
          value: z.string(),
          label: z.string(),
          description: z.string().optional(),
          icon: z.string().optional(),
        }),
      ),
    })
    .optional(),
})

export const authorSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().optional(),
  avatar: z.string().optional(),
  avatarImage: z.string().optional(),
  bio: z.string().optional(),
  url: z.string().optional(),
  github: z.string().optional(),
  twitter: z.string().optional(),
  skills: z.array(z.string()).optional(),
  i18n: z.record(z.string(), localizedAuthorSchema).optional(),
})

export const tagSchema = z.object({
  id: z.string(),
  name: z.string(),
  i18n: z.record(z.string(), localizedTagSchema).optional(),
})
