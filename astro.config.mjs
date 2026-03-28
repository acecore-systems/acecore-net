import { defineConfig } from 'astro/config'
import UnoCSS from '@unocss/astro'
import sitemap from '@astrojs/sitemap'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeOptimizeImages from './src/utils/rehype-optimize-images'
import rehypeInjectAds from './src/utils/rehype-inject-ads'

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
      lastmod: new Date(),
      filter(page) {
        return !page.includes('/blog/tags/') && !page.includes('/blog/archive/')
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
      rehypeOptimizeImages,
      rehypeInjectAds,
    ],
  },
})
