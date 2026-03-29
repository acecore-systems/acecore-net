import { defineCollection } from 'astro:content'
import { z } from 'astro/zod'
import { glob } from 'astro/loaders'

const BLOG_TIMEZONE_OFFSET = '+09:00'
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/

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

const contentDate = z.union([z.string(), z.date()]).transform(parseContentDate)

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: contentDate,
    lastUpdated: contentDate.optional(),
    tags: z.array(z.string()).optional(),
    image: z.string().optional(),
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

export const collections = { blog }
