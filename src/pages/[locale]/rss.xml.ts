import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import type { APIContext } from 'astro'
import { locales, defaultLocale, type Locale } from '../../i18n'
import { isBasePost, localizePost } from '../../utils/blog-i18n'

export function getStaticPaths() {
  return locales
    .filter((l) => l !== defaultLocale)
    .map((locale) => ({ params: { locale } }))
}

const rssMeta: Record<string, { title: string; description: string }> = {
  en: {
    title: 'Acecore Blog',
    description:
      'Technical articles and activity reports on system development, web production, server operations, and IT education.',
  },
  'zh-cn': {
    title: 'Acecore 博客',
    description: '关于系统开发、Web制作、服务器运维和IT教育的技术文章和活动报告。',
  },
  es: {
    title: 'Blog de Acecore',
    description:
      'Artículos técnicos e informes de actividad sobre desarrollo de sistemas, producción web, operaciones de servidores y educación en TI.',
  },
  pt: {
    title: 'Blog da Acecore',
    description:
      'Artigos técnicos e relatórios de atividades sobre desenvolvimento de sistemas, produção web, operações de servidores e educação em TI.',
  },
  fr: {
    title: 'Blog Acecore',
    description:
      "Articles techniques et rapports d'activité sur le développement de systèmes, la production web, les opérations serveur et l'enseignement informatique.",
  },
  ko: {
    title: 'Acecore 블로그',
    description:
      '시스템 개발, 웹 제작, 서버 운영, IT 교육에 관한 기술 기사 및 활동 보고서.',
  },
  de: {
    title: 'Acecore Blog',
    description:
      'Technische Artikel und Aktivitätsberichte zu Systementwicklung, Webproduktion, Serverbetrieb und IT-Bildung.',
  },
  ru: {
    title: 'Блог Acecore',
    description:
      'Технические статьи и отчёты о деятельности в области разработки систем, веб-производства, серверных операций и IT-образования.',
  },
}

export async function GET(context: APIContext) {
  const locale = context.params.locale as Locale
  const allPosts = await getCollection('blog')
  const basePosts = allPosts
    .filter(isBasePost)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())

  const localizedPosts = basePosts.map((p) => localizePost(p, allPosts, locale))

  const meta = rssMeta[locale] ?? { title: 'Acecore Blog', description: '' }

  return rss({
    title: meta.title,
    description: meta.description,
    site: context.site!,
    items: localizedPosts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/${locale}/blog/${post.id.includes('/') ? post.id.split('/').pop() : post.id}/`,
      ...(post.data.author ? { author: post.data.author } : {}),
      categories: post.data.tags ?? [],
    })),
  })
}
