import { defineConfig } from 'astro/config'
import UnoCSS from '@unocss/astro'
import sitemap from '@astrojs/sitemap'
import rehypeExternalLinks from 'rehype-external-links'

export default defineConfig({
  site: 'https://acecore.net',
  integrations: [UnoCSS({ injectReset: true }), sitemap()],
  markdown: {
    rehypePlugins: [
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }],
    ],
  },
  vite: {
    plugins: [
      {
        name: 'font-display-optional',
        transform(code, id) {
          if (id.includes('@fontsource') && id.endsWith('.css')) {
            return code.replaceAll('font-display:swap', 'font-display:optional')
              .replaceAll('font-display: swap', 'font-display: optional')
          }
        },
      },
    ],
  },
})
