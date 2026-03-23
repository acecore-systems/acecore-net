import { defineConfig } from 'astro/config'
import UnoCSS from '@unocss/astro'
import sitemap from '@astrojs/sitemap'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeOptimizeImages from './src/utils/rehype-optimize-images'
import rehypeInjectAds from './src/utils/rehype-inject-ads'

export default defineConfig({
  site: 'https://acecore.net',
  integrations: [UnoCSS({ injectReset: true }), sitemap({
    changefreq: 'weekly',
    priority: 0.7,
    lastmod: new Date(),
  })],
  markdown: {
    rehypePlugins: [
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'], properties: { className: ['external-link'] } }],
      rehypeOptimizeImages,
      rehypeInjectAds,
    ],
  },
})
