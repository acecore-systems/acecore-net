import { JSON_SCHEMA, load as loadYaml } from 'js-yaml'
import { z } from 'zod'

import blogTemplate from '../../../src/i18n/source/ja/blog.json' with { type: 'json' }
import commonTemplate from '../../../src/i18n/source/ja/common.json' with { type: 'json' }
import aboutTemplate from '../../../src/i18n/source/ja/pages/about.json' with { type: 'json' }
import acestudioTemplate from '../../../src/i18n/source/ja/pages/acestudio.json' with { type: 'json' }
import contactTemplate from '../../../src/i18n/source/ja/pages/contact.json' with { type: 'json' }
import homeTemplate from '../../../src/i18n/source/ja/pages/home.json' with { type: 'json' }
import notFoundTemplate from '../../../src/i18n/source/ja/pages/not-found.json' with { type: 'json' }
import pricingTemplate from '../../../src/i18n/source/ja/pages/pricing.json' with { type: 'json' }
import privacyTemplate from '../../../src/i18n/source/ja/pages/privacy.json' with { type: 'json' }
import servicesTemplate from '../../../src/i18n/source/ja/pages/services.json' with { type: 'json' }
import {
  authorSchema,
  blogSchema,
  tagSchema,
} from '../../../src/content-schemas.ts'
import { GitHubApiError } from './_github-api.ts'

const MAX_TEXT_CONTENT_BYTES = 2 * 1024 * 1024
const MAX_FRONTMATTER_CHARS = 512 * 1024
const DANGEROUS_PROTOCOL_PATTERN =
  /^\s*(?:(?:javascript|vbscript)\s*:|data\s*:\s*(?:text\/html|image\/svg\+xml))/i
const ACTIVE_HTML_PATTERN =
  /<\s*\/?\s*(?:script|iframe|object|embed|svg|math|style|link|meta|base)\b/i
const ACTIVE_STRING_HTML_PATTERN =
  /<\s*\/?\s*(?:script|iframe|object|embed|svg|math|style|base)\b/i
const EVENT_HANDLER_PATTERN = /<[^>]+\son[a-z][\w:-]*\s*=/i
const ACTIVE_HTML_URL_PATTERN =
  /\b(?:href|src|action|formaction)\s*=\s*(?:"\s*|'\s*|)(?:javascript|vbscript|data)\s*:/i
const ACTIVE_MARKDOWN_URL_PATTERN =
  /!?\[[^\]]*]\(\s*(?:javascript|vbscript|data)\s*:/i
const LOCAL_DATETIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})?$/

const fixedJsonTemplates: Record<string, unknown> = {
  'src/i18n/source/ja/common.json': commonTemplate,
  'src/i18n/source/ja/blog.json': blogTemplate,
  'src/i18n/source/ja/pages/home.json': homeTemplate,
  'src/i18n/source/ja/pages/services.json': servicesTemplate,
  'src/i18n/source/ja/pages/pricing.json': pricingTemplate,
  'src/i18n/source/ja/pages/about.json': aboutTemplate,
  'src/i18n/source/ja/pages/contact.json': contactTemplate,
  'src/i18n/source/ja/pages/acestudio.json': acestudioTemplate,
  'src/i18n/source/ja/pages/privacy.json': privacyTemplate,
  'src/i18n/source/ja/pages/not-found.json': notFoundTemplate,
}

const campaignSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    type: z.enum(['announcement', 'page-notice']),
    adminTitle: z.string(),
    enabled: z.boolean(),
    page: z
      .enum(['home', 'services', 'about', 'contact', 'acestudio'])
      .optional(),
    title: z.string().optional(),
    body: z.string().optional(),
    href: z.string().optional(),
    ctaLabel: z.string().optional(),
    icon: z
      .enum([
        'calendar-check',
        'megaphone',
        'message-circle',
        'graduation-cap',
        'alarm-clock',
        'circle-check',
        'sparkles',
        'tag',
        'briefcase-business',
        'users',
      ])
      .optional(),
    tone: z.enum(['brand', 'amber', 'emerald', 'slate']),
    startsAt: z.string().regex(LOCAL_DATETIME_PATTERN).optional(),
    endsAt: z.string().regex(LOCAL_DATETIME_PATTERN).optional(),
    order: z.number().int().optional(),
  })
  .strict()

export function validateCmsAdditionContents(
  additions: readonly {
    path: string
    contents: string
    byteSize: number
  }[],
) {
  for (const addition of additions) {
    try {
      validateCmsAddition(addition)
    } catch (error) {
      if (error instanceof GitHubApiError) throw error

      throw new GitHubApiError(`CMS保存内容が不正です: ${addition.path}`, 422)
    }
  }
}

function validateCmsAddition(addition: {
  path: string
  contents: string
  byteSize: number
}) {
  const bytes = decodeBase64(addition.contents)

  if (bytes.byteLength !== addition.byteSize) {
    throw new Error('Base64 size mismatch')
  }

  if (addition.path.startsWith('public/uploads/')) {
    validateMedia(addition.path, bytes)
    return
  }

  if (bytes.byteLength > MAX_TEXT_CONTENT_BYTES) {
    throw new Error('Text content is too large')
  }

  const text = new TextDecoder('utf-8', {
    fatal: true,
    ignoreBOM: false,
  }).decode(bytes)

  if (addition.path.endsWith('.md')) {
    validateBlogMarkdown(text)
    return
  }

  if (!addition.path.endsWith('.json')) {
    throw new Error('Unsupported CMS content type')
  }

  validateJsonContent(addition.path, text)
}

function validateBlogMarkdown(source: string) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)

  if (!match || match[1].length > MAX_FRONTMATTER_CHARS) {
    throw new Error('Invalid Markdown frontmatter')
  }

  const frontmatter = loadYaml(match[1], { schema: JSON_SCHEMA })
  const parsed = blogSchema.strict().safeParse(frontmatter)

  if (!parsed.success) throw new Error('Invalid blog schema')

  assertNoDangerousStrings(frontmatter)

  const body = decodeHtmlSecurityEntities(
    stripMarkdownCode(source.slice(match[0].length)),
  )

  if (
    ACTIVE_HTML_PATTERN.test(body) ||
    EVENT_HANDLER_PATTERN.test(body) ||
    ACTIVE_HTML_URL_PATTERN.test(body) ||
    ACTIVE_MARKDOWN_URL_PATTERN.test(body)
  ) {
    throw new Error('Active Markdown content is not allowed')
  }
}

function validateJsonContent(path: string, source: string) {
  const value: unknown = JSON.parse(source)

  if (!isRecord(value)) throw new Error('JSON root must be an object')

  if (path.startsWith('src/content/authors/')) {
    const parsed = authorSchema.strict().safeParse(value)

    if (!parsed.success || parsed.data.id !== getFileStem(path)) {
      throw new Error('Invalid author schema')
    }
  } else if (path.startsWith('src/content/tags/')) {
    const parsed = tagSchema.strict().safeParse(value)

    if (!parsed.success || parsed.data.id !== getFileStem(path)) {
      throw new Error('Invalid tag schema')
    }
  } else if (path.startsWith('src/i18n/source/ja/campaigns/')) {
    const parsed = campaignSchema.safeParse(value)

    if (!parsed.success || parsed.data.id !== getFileStem(path)) {
      throw new Error('Invalid campaign schema')
    }
  } else {
    const template = fixedJsonTemplates[path]

    if (!template || !matchesJsonTemplate(value, template)) {
      throw new Error('Invalid fixed JSON structure')
    }
  }

  assertNoDangerousStrings(value)
}

function validateMedia(path: string, bytes: Uint8Array) {
  const extension = path.slice(path.lastIndexOf('.')).toLowerCase()
  let valid = false

  switch (extension) {
    case '.png':
      valid = startsWith(
        bytes,
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      )
      break
    case '.jpg':
    case '.jpeg':
      valid = startsWith(bytes, [0xff, 0xd8, 0xff])
      break
    case '.gif':
      valid =
        startsWithAscii(bytes, 'GIF87a') || startsWithAscii(bytes, 'GIF89a')
      break
    case '.webp':
      valid =
        startsWithAscii(bytes, 'RIFF') &&
        asciiAt(bytes, 8, 'WEBP') &&
        bytes.byteLength >= 12
      break
    case '.avif':
      valid =
        asciiAt(bytes, 4, 'ftyp') &&
        (containsAscii(bytes.subarray(8, 64), 'avif') ||
          containsAscii(bytes.subarray(8, 64), 'avis'))
      break
  }

  if (!valid) throw new Error('Invalid or active media content')
}

export function matchesJsonTemplate(
  value: unknown,
  template: unknown,
): boolean {
  if (Array.isArray(template)) {
    if (!Array.isArray(value)) return false
    if (template.length === 0) return value.length === 0

    return value.every((item) =>
      template.some((candidate) => matchesJsonTemplate(item, candidate)),
    )
  }

  if (isRecord(template)) {
    if (!isRecord(value)) return false

    const templateKeys = Object.keys(template).sort()
    const valueKeys = Object.keys(value).sort()

    return (
      templateKeys.length === valueKeys.length &&
      templateKeys.every((key, index) => key === valueKeys[index]) &&
      templateKeys.every((key) =>
        matchesJsonTemplate(value[key], template[key]),
      )
    )
  }

  if (typeof template === 'number') {
    return typeof value === 'number' && Number.isFinite(value)
  }

  return typeof value === typeof template
}

function assertNoDangerousStrings(value: unknown, depth = 0) {
  if (depth > 64) throw new Error('JSON nesting is too deep')

  if (typeof value === 'string') {
    const decoded = decodeHtmlSecurityEntities(value)

    if (
      DANGEROUS_PROTOCOL_PATTERN.test(decoded) ||
      ACTIVE_STRING_HTML_PATTERN.test(decoded) ||
      EVENT_HANDLER_PATTERN.test(decoded) ||
      ACTIVE_HTML_URL_PATTERN.test(decoded)
    ) {
      throw new Error('Active HTML or URL is not allowed')
    }
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) assertNoDangerousStrings(item, depth + 1)
    return
  }

  if (isRecord(value)) {
    for (const item of Object.values(value)) {
      assertNoDangerousStrings(item, depth + 1)
    }
  }
}

function decodeHtmlSecurityEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (_match, digits: string) => {
      return decodeCodePoint(digits, 16)
    })
    .replace(/&#([0-9]+);?/g, (_match, digits: string) => {
      return decodeCodePoint(digits, 10)
    })
    .replace(/&(colon|tab|newline);/gi, (match, name: string) => {
      const replacements: Record<string, string> = {
        colon: ':',
        tab: '\t',
        newline: '\n',
      }

      return replacements[name.toLowerCase()] ?? match
    })
}

function decodeCodePoint(digits: string, radix: number) {
  const codePoint = Number.parseInt(digits, radix)

  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return '\ufffd'
  }

  return String.fromCodePoint(codePoint)
}

function stripMarkdownCode(source: string) {
  const visibleLines: string[] = []
  let fenceCharacter = ''
  let fenceLength = 0

  for (const line of source.split(/\r?\n/)) {
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})/)

    if (fence) {
      const marker = fence[1]

      if (!fenceCharacter) {
        fenceCharacter = marker[0]
        fenceLength = marker.length
        continue
      }

      if (
        marker[0] === fenceCharacter &&
        marker.length >= fenceLength &&
        line.slice(fence[0].length).trim() === ''
      ) {
        fenceCharacter = ''
        fenceLength = 0
      }
      continue
    }

    if (!fenceCharacter) visibleLines.push(line)
  }

  return visibleLines.join('\n').replace(/(`+)([^`]*?)\1/g, '')
}

function decodeBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0))
}

function startsWith(value: Uint8Array, expected: number[]) {
  return expected.every((byte, index) => value[index] === byte)
}

function startsWithAscii(value: Uint8Array, expected: string) {
  return asciiAt(value, 0, expected)
}

function asciiAt(value: Uint8Array, offset: number, expected: string) {
  if (offset + expected.length > value.byteLength) return false

  for (let index = 0; index < expected.length; index += 1) {
    if (value[offset + index] !== expected.charCodeAt(index)) return false
  }

  return true
}

function containsAscii(value: Uint8Array, expected: string) {
  for (
    let offset = 0;
    offset + expected.length <= value.byteLength;
    offset += 1
  ) {
    if (asciiAt(value, offset, expected)) return true
  }

  return false
}

function getFileStem(path: string) {
  return path.slice(path.lastIndexOf('/') + 1, -'.json'.length)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
