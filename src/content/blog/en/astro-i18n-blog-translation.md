---
title: 'Making an Astro 6 Site Support 9 Languages — Auto-Translating 136 Blog Posts and Multilingual Architecture'
description: 'A record of making an Astro 6 + UnoCSS + Cloudflare Pages site support 9 languages. Covers the entire process from UI internationalization to translating 136 blog posts and configuring Pages CMS for multilingual content.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'i18n', 'Webサイト']
image: https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop&q=80
processFigure:
  title: Multilingual Workflow
  steps:
    - title: i18n Foundation
      description: Set up Astro built-in i18n routing and translation utilities.
      icon: i-lucide-globe
    - title: UI Text Translation
      description: Translate display text across header, footer, and all components.
      icon: i-lucide-languages
    - title: Blog Post Translation
      description: Generate 136 translation files (17 articles × 8 languages).
      icon: i-lucide-file-text
    - title: CMS & Build Verification
      description: Configure Pages CMS multilingual support and verify all page builds.
      icon: i-lucide-check-circle
compareTable:
  title: Before and After Comparison
  before:
    label: Japanese Only
    items:
      - Japanese language only
      - 17 blog posts
      - 523 pages generated (after UI multilingual support)
      - Pages CMS with 1 blog collection
      - Tags and author data in Japanese only
      - Single RSS feed
  after:
    label: 9 Languages
    items:
      - Japanese + 8 languages (en, zh-cn, es, pt, fr, ko, de, ru)
      - 17 blog posts + 136 translations = 153 total
      - 541 pages generated (translated posts with fallback)
      - Pages CMS with 9 language-specific collections
      - 25 tags and author data translated per language
      - Multilingual RSS feeds (9 languages)
callout:
  type: info
  title: Supported Languages
  text: 'Supports 9 languages: Japanese (default), English, Simplified Chinese, Spanish, Portuguese, French, Korean, German, and Russian.'
statBar:
  items:
    - value: '9'
      label: Supported Languages
    - value: '136'
      label: Translated Articles
    - value: '541'
      label: Generated Pages
faq:
  title: Frequently Asked Questions
  items:
    - question: Why did you choose 9 languages?
      answer: 'To maximize global reach, we covered the major language markets. English, Chinese, Spanish, and Portuguese cover the majority of internet users, while French, German, Russian, and Korean complement the remaining major markets.'
    - question: How do you ensure translation quality?
      answer: 'We use AI translation via GitHub Copilot. English is created as an intermediate language first, then translated into each target language to reduce quality variation. Tag values in frontmatter are kept in Japanese, and URLs, code blocks, and image paths remain unchanged.'
    - question: What happens when a translated article does not exist?
      answer: 'The fallback feature displays the original Japanese article when no translation exists. Translations can be added incrementally.'
    - question: Do I need to translate when adding a new article?
      answer: "Translation is not required — if no translation file exists, the Japanese version is displayed as a fallback. To add a translation, simply place a Markdown file with the same name in the corresponding language directory."
---

We upgraded the Acecore official website from Japanese-only to supporting 9 languages. This article covers the entire process: UI internationalization, translating 17 blog posts × 8 languages = 136 files, and Pages CMS multilingual configuration.

## Multilingual Strategy

### Defining Scope

We addressed multilingual support in three phases:

1. **i18n Foundation**: Astro built-in i18n routing configuration, translation utilities, and translation JSON files for 9 languages
2. **UI Text Translation**: Component text across header, footer, sidebar, and all pages
3. **Blog Post Translation**: All 17 articles translated into 8 languages (136 files generated)

### URL Design

We adopted Astro's `prefixDefaultLocale: false`, serving Japanese at the root (`/blog/...`) and other languages with prefixes (`/en/blog/...`, `/zh-cn/blog/...`, etc.).

```
# Japanese (default)
/blog/astro-performance-tuning/

# English
/en/blog/astro-performance-tuning/

# Simplified Chinese
/zh-cn/blog/astro-performance-tuning/
```

Using the same slug across all languages keeps URL mapping simple during language switching.

## i18n Foundation Implementation

### Astro i18n Configuration

Configure i18n routing in `astro.config.mjs`.

```javascript
// astro.config.mjs
export default defineConfig({
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
})
```

### Translation Utilities

Configuration files, utility functions, and translation JSON files are consolidated in `src/i18n/`.

```typescript
// src/i18n/utils.ts
export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key]
    ?? translations[defaultLocale][key]
    ?? key
}
```

Translation files are in JSON format under `src/i18n/locales/`, managing approximately 100 keys for navigation, footer, blog UI, and metadata.

### View Component Pattern

Page implementation uses the **View Component Pattern**. Layout and logic are centralized in `src/views/`, while route files (`src/pages/`) are thin wrappers that simply pass the locale.

```astro
---
// src/pages/[locale]/about.astro (route file)
import AboutPage from '../../views/AboutPage.astro'
const { locale } = Astro.params
---
<AboutPage locale={locale} />
```

This design eliminates logic duplication between the Japanese route (`/about`) and multilingual routes (`/en/about`).

## Blog Content Multilingual Support

### Directory Structure

Translated articles are placed in language code subdirectories. Astro's glob loader automatically detects them recursively with the `**/*.md` pattern.

```
src/content/blog/
  astro-performance-tuning.md          # Japanese (base)
  website-renewal.md
  en/
    astro-performance-tuning.md        # English version
    website-renewal.md
  zh-cn/
    astro-performance-tuning.md        # Simplified Chinese version
    website-renewal.md
  es/
    ...
```

### Content Resolution Utilities

Three functions were implemented in `src/utils/blog-i18n.ts`.

```typescript
// Determine if post is a base article (no slash in ID = base)
export function isBasePost(post: CollectionEntry<'blog'>): boolean {
  return !post.id.includes('/')
}

// Remove locale prefix from ID to get base slug
export function getBaseSlug(postId: string): string {
  const idx = postId.indexOf('/')
  return idx !== -1 ? postId.slice(idx + 1) : postId
}

// Get localized version of a base article (falls back to original)
export function localizePost(
  post: CollectionEntry<'blog'>,
  allPosts: CollectionEntry<'blog'>[],
  locale: Locale,
): CollectionEntry<'blog'> {
  if (locale === defaultLocale) return post
  return allPosts.find((p) => p.id === `${locale}/${post.id}`) ?? post
}
```

The key point is **not modifying the existing content collection schema**. Astro's glob loader automatically recognizes files in subdirectories with IDs like `en/astro-performance-tuning`, so no configuration changes were needed.

### Translation File Rules

Translation files were generated following these rules:

- **Frontmatter keys** remain in English (`title`, `description`, `date`, etc.)
- **Tag values** are kept in Japanese (`['技術', 'Astro']`, etc.)
- **URLs, image paths, code blocks, and HTML** are not modified
- **Date and author** remain unchanged
- **Body text and frontmatter text values** (title, description, callout, FAQ, etc.) are translated

### Translation Workflow

The translation process follows these steps:

1. **Create English as intermediate language**: Translate from the Japanese original to English
2. **Translate from English to each language**: Expand from English to 7 languages
3. **Batch processing**: Process 5–6 articles at a time with GitHub Copilot

The two-stage translation (Japanese → English → target languages) reduces quality variation. Routing through English as an intermediate language produces more stable quality than translating directly from Japanese to each language.

## Multilingual View Components

### BlogPostPage Implementation

The blog post page retrieves the locale version of content using `localizePost()` and assigns it to a template variable.

```astro
---
// src/views/BlogPostPage.astro
const localizedPost = localizePost(basePost, allPosts, locale)
const post = localizedPost // existing template references work as-is
---
```

This approach enables multilingual support without changing any references to `post.data.title` or `post.body` in the template.

### List Page Implementation

Blog lists, tag lists, author lists, and archive pages filter to base articles only with `isBasePost()`, then swap in translated versions with `localizePost()` at display time.

```astro
---
const allPosts = await getCollection('blog')
const basePosts = allPosts.filter(isBasePost)
const displayPosts = basePosts.map(p => localizePost(p, allPosts, locale))
---
```

## Build Considerations

### YAML Frontmatter Escaping

French translations caused issues where apostrophes (`l'atelier`, `qu'on`, etc.) conflicted with YAML single quotes.

```yaml
# NG: YAML parse error
title: 'Le métavers est plus proche qu'on ne le pense'

# OK: Switch to double quotes
title: "Le métavers est plus proche qu'on ne le pense"
```

A Node.js script was used to fix all files in bulk. English text like `Acecore's` has the same issue, so quote type must be considered when generating translation files.

### OG Image Route Filtering

`/blog/og/[slug].png.ts` was also picking up translated article slugs (`en/aceserver-hijacked`, etc.), causing parameter errors. This was resolved by filtering with `isBasePost()`.

```typescript
export const getStaticPaths: GetStaticPaths = async () => {
  const allPosts = await getCollection('blog')
  const posts = allPosts.filter(isBasePost)
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title },
  }))
}
```

## Pages CMS Multilingual Support

Pages CMS (`.pages.yml`) only targets files directly under the specified `path` directory, so translation subdirectories were registered as individual collections.

```yaml
content:
  - name: blog
    label: ブログ（日本語）
    path: src/content/blog
  - name: blog-en
    label: Blog（English）
    path: src/content/blog/en
  - name: blog-zh-cn
    label: 博客（简体中文）
    path: src/content/blog/zh-cn
  # ... configured for each language
```

Labels are written in each language so it's immediately clear which collection corresponds to which language in the CMS.

## Language Switcher UI

A `LanguageSwitcher` component was added to the header, providing a language switching UI for both desktop and mobile. When switching languages, users navigate to the corresponding locale of the same page. On first visit, the browser's `navigator.language` is detected for automatic redirection.

## Multilingual Tag Display

Article tags keep their Japanese slugs in URLs while **only translating the display name**. This avoids routing complexity while showing tags in the user's native language.

```typescript
// src/i18n/utils.ts
export function translateTag(tag: string, locale: Locale): string {
  return t(locale, `tags.${tag}`) !== `tags.${tag}`
    ? t(locale, `tags.${tag}`)
    : tag
}
```

A `tags` section was added to each translation JSON, defining translations for all 25 tag types.

```json
// en.json (excerpt)
{
  "tags": {
    "技術": "Technology",
    "セキュリティ": "Security",
    "パフォーマンス": "Performance",
    "アクセシビリティ": "Accessibility"
  }
}
```

`translateTag()` is used across 6 locations — article cards, sidebar, tag index, and article detail — ensuring all tag displays are unified in the locale-appropriate language.

## Multilingual Author Data

Author bios and skill lists also switch per language. An `i18n` field was added to `src/data/authors.json` to hold translations for each language.

```json
{
  "id": "hatt",
  "name": "hatt",
  "bio": "代表取締役。Web制作・システム開発…",
  "skills": ["TypeScript", "Astro", "..."]
  "i18n": {
    "en": {
      "bio": "CEO and representative director. Web development...",
      "skills": ["TypeScript", "Astro", "..."]
    }
  }
}
```

The `getLocalizedAuthor()` utility retrieves author information appropriate for the locale.

```typescript
// src/utils/blog-i18n.ts
export function getLocalizedAuthor(author: Author, locale: Locale) {
  const localized = author.i18n?.[locale]
  return localized ? { ...author, ...localized } : author
}
```

## Multilingual Site SEO

To maximize the SEO benefits of multilingual support, we implemented mechanisms for search engines to correctly identify and index each language version.

### Sitemap hreflang Support

The `i18n` option in `@astrojs/sitemap` was configured to automatically output `xhtml:link rel="alternate"` tags in the sitemap.

```javascript
// astro.config.mjs
sitemap({
  i18n: {
    defaultLocale: 'ja',
    locales: {
      ja: 'ja',
      en: 'en',
      'zh-cn': 'zh-CN',
      es: 'es',
      pt: 'pt',
      fr: 'fr',
      ko: 'ko',
      de: 'de',
      ru: 'ru',
    },
  },
})
```

This outputs hreflang links for all 9 languages on every URL, allowing Google to accurately understand the correspondence between language versions.

### JSON-LD Structured Data Language Support

An `inLanguage` field was added to the `BlogPosting` structured data for blog articles, informing search engines which language each article is written in.

```javascript
// BlogPostPage.astro (JSON-LD excerpt)
{
  "@type": "BlogPosting",
  "inLanguage": htmlLangMap[locale],  // "ja", "en", "zh-CN", etc.
  "headline": post.data.title,
  // ...
}
```

### Multilingual RSS Feeds

In addition to the Japanese `/rss.xml`, RSS feeds are generated for each language version (`/en/rss.xml`, `/zh-cn/rss.xml`, etc.). Feed titles and descriptions are translated per language, and the `<language>` tag outputs BCP47-compliant language codes.

```typescript
// src/pages/[locale]/rss.xml.ts
export const getStaticPaths = () =>
  locales.filter((l) => l !== defaultLocale).map((l) => ({ params: { locale: l } }))
```

The `<link rel="alternate" type="application/rss+xml">` in `BaseLayout.astro` also automatically sets the locale-appropriate RSS URL.

## Summary

By leveraging Astro 6's built-in i18n features, we achieved high-quality multilingual support even on a static site.

- **i18n Foundation**: No prefix for Japanese with Astro's `prefixDefaultLocale: false`
- **UI Translation**: Zero logic duplication via the View Component Pattern
- **Content Translation**: Subdirectory approach with no schema changes
- **Tag Translation**: Japanese slugs in URLs, display names translated per language
- **Author Data Translation**: Bio and skills switch per language
- **SEO**: Sitemap hreflang, JSON-LD `inLanguage`, multilingual RSS feeds
- **Fallback**: Untranslated articles automatically display the Japanese version
- **CMS Support**: Each language's articles editable individually in Pages CMS

Going forward, translation files will be added incrementally as new articles are published. Thanks to the fallback feature, the Japanese version is displayed until translations are complete, maintaining site quality.
