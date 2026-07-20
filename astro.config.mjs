import { defineConfig } from 'astro/config'
import UnoCSS from '@unocss/astro'
import sitemap from '@astrojs/sitemap'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeOptimizeImages from './src/utils/rehype-optimize-images'
import rehypeInjectAds from './src/utils/rehype-inject-ads'
import rehypeLocalizeInternalLinks from './src/utils/rehype-localize-internal-links'
import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const defaultLocale = 'ja'
const locales = ['ja', 'en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru']
const translatedBlogSlugsByLocale = Object.fromEntries(
  locales
    .filter((locale) => locale !== defaultLocale)
    .map((locale) => {
      const dir = fileURLToPath(
        new URL(`./src/content/blog/${locale}/`, import.meta.url),
      )
      return [
        locale,
        new Set(
          existsSync(dir)
            ? readdirSync(dir)
                .filter((file) => file.endsWith('.md'))
                .map((file) => file.replace(/\.md$/, ''))
            : [],
        ),
      ]
    }),
)

function isMissingLocalizedBlogPost(page) {
  const { pathname } = new URL(page)
  const parts = pathname.split('/').filter(Boolean)
  const [locale, section, slug] = parts
  return (
    locale &&
    locale !== defaultLocale &&
    translatedBlogSlugsByLocale[locale] &&
    section === 'blog' &&
    parts.length === 3 &&
    !translatedBlogSlugsByLocale[locale].has(decodeURIComponent(slug))
  )
}

export default defineConfig({
  site: 'https://acecore.net',
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
  integrations: [
    UnoCSS({
      injectReset: true,
      content: {
        pipeline: {
          exclude: [
            /\.(css|postcss|sass|scss|less|stylus|styl)($|\?)/,
            /\/src\/content\/.*\.mdx?($|\?)/,
          ],
        },
      },
    }),
    sitemap({
      filter(page) {
        return (
          !isMissingLocalizedBlogPost(page) &&
          !page.endsWith('/404/') &&
          !page.includes('/blog/tags/') &&
          !page.includes('/blog/archive/') &&
          !page.includes('/blog/authors/') &&
          !page.includes('/blog/page/') &&
          !page.includes('/contact/thanks/')
        )
      },
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
      serialize(item) {
        if (item.url === 'https://acecore.net/') {
          item.changefreq = 'daily'
          item.priority = 1.0
        } else if (
          item.url.includes('/blog/') &&
          !item.url.includes('/page/') &&
          !item.url.includes('/tags/') &&
          !item.url.includes('/authors/') &&
          !item.url.includes('/archive/')
        ) {
          item.changefreq = 'weekly'
          item.priority = 0.8
        } else {
          item.changefreq = 'monthly'
          item.priority = 0.6
        }
        return item
      },
    }),
  ],
  markdown: {
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          target: '_blank',
          rel: ['noopener', 'noreferrer'],
          properties: { className: ['external-link'] },
        },
      ],
      rehypeLocalizeInternalLinks,
      rehypeOptimizeImages,
      rehypeInjectAds,
    ],
  },
})
