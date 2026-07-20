import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { Root } from 'hast'
import { visit } from 'unist-util-visit'
import { defaultLocale, locales, type Locale } from '../i18n/config'

type MarkdownFile = {
  path?: string
  history?: string[]
}

const translatedBlogSlugsByLocale = new Map<Locale, Set<string>>()

for (const locale of locales) {
  if (locale === defaultLocale) continue
  const directory = fileURLToPath(
    new URL(`../content/blog/${locale}/`, import.meta.url),
  )
  translatedBlogSlugsByLocale.set(
    locale,
    new Set(
      existsSync(directory)
        ? readdirSync(directory)
            .filter((file) => file.endsWith('.md'))
            .map((file) => file.replace(/\.md$/, ''))
        : [],
    ),
  )
}

function getMarkdownLocale(file: MarkdownFile): Locale | null {
  const sourcePath = (file.path ?? file.history?.[0] ?? '').replaceAll(
    '\\',
    '/',
  )
  return (
    locales.find(
      (locale) =>
        locale !== defaultLocale &&
        sourcePath.includes(`src/content/blog/${locale}/`),
    ) ?? null
  )
}

function prefixLocale(href: string, locale: Locale): string {
  return href === '/' ? `/${locale}/` : `/${locale}${href}`
}

function getUrlSuffix(href: string): string {
  const suffixIndex = href.search(/[?#]/)
  return suffixIndex === -1 ? '' : href.slice(suffixIndex)
}

function localizeHref(href: string, locale: Locale): string {
  if (!href.startsWith('/') || href.startsWith('//')) return href

  const articleMatch = href.match(/^\/blog\/([^/?#]+)\/?(?:[?#].*)?$/)
  if (articleMatch) {
    const slug = decodeURIComponent(articleMatch[1])
    return translatedBlogSlugsByLocale.get(locale)?.has(slug)
      ? prefixLocale(href, locale)
      : href
  }

  const localizedArticleMatch = href.match(
    new RegExp(`^\\/${locale}\\/blog\\/([^/?#]+)\\/?(?:[?#].*)?$`),
  )
  if (localizedArticleMatch) {
    const slug = decodeURIComponent(localizedArticleMatch[1])
    return translatedBlogSlugsByLocale.get(locale)?.has(slug)
      ? href
      : `/blog/${localizedArticleMatch[1]}/${getUrlSuffix(href)}`
  }

  return href === '/' ||
    /^\/(?:about|acestudio|blog|contact|privacy|services)(?:\/|[?#]|$)/.test(
      href,
    )
    ? prefixLocale(href, locale)
    : href
}

/** Localize internal anchors emitted from translated Markdown content. */
export default function rehypeLocalizeInternalLinks() {
  return (tree: Root, file: MarkdownFile) => {
    const locale = getMarkdownLocale(file)
    if (!locale) return

    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') return
      const href = node.properties?.href
      if (typeof href !== 'string') return
      node.properties.href = localizeHref(href, locale)
    })
  }
}
