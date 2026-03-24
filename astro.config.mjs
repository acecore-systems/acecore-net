import { defineConfig } from 'astro/config'
import UnoCSS from '@unocss/astro'
import sitemap from '@astrojs/sitemap'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeOptimizeImages from './src/utils/rehype-optimize-images'
import rehypeInjectAds from './src/utils/rehype-inject-ads'

export default defineConfig({
  site: 'https://acecore.net',
  build: {
    inlineStylesheets: 'always',
  },
  integrations: [UnoCSS({ injectReset: true }), sitemap({
    lastmod: new Date(),
    serialize(item) {
      if (item.url === 'https://acecore.net/') {
        item.changefreq = 'daily'
        item.priority = 1.0
      } else if (item.url.includes('/blog/') && !item.url.includes('/page/') && !item.url.includes('/tags/') && !item.url.includes('/authors/') && !item.url.includes('/archive/')) {
        item.changefreq = 'weekly'
        item.priority = 0.8
      } else {
        item.changefreq = 'monthly'
        item.priority = 0.6
      }
      return item
    },
  })],
  markdown: {
    rehypePlugins: [
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'], properties: { className: ['external-link'] } }],
      rehypeOptimizeImages,
      rehypeInjectAds,
    ],
  },
})
