import { defineConfig } from 'astro/config'
import cloudflare from '@astrojs/cloudflare'
import UnoCSS from '@unocss/astro'
import sitemap from '@astrojs/sitemap'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeOptimizeImages from './src/utils/rehype-optimize-images'

export default defineConfig({
  site: 'https://acecore.net',
  adapter: cloudflare(),
  integrations: [UnoCSS({ injectReset: true }), sitemap()],
  markdown: {
    rehypePlugins: [
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
      rehypeOptimizeImages,
    ],
  },
})
