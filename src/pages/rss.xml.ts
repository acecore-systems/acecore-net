import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import type { APIContext } from 'astro'
import { isBasePost } from '../utils/blog-i18n'

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog'))
    .filter(isBasePost)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
  return rss({
    title: 'Acecore ブログ',
    description:
      'システム開発・Web制作・サーバー運用・IT教育に関する技術情報や活動報告',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/blog/${post.id}/`,
      ...(post.data.author ? { author: post.data.author } : {}),
      categories: post.data.tags ?? [],
    })),
  })
}
