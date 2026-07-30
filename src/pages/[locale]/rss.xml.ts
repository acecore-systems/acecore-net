import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import type { APIContext } from 'astro'
import { locales, defaultLocale, t, type Locale } from '../../i18n'
import {
  isBasePost,
  localizePost,
  getLocalizedAuthor,
  filterPostsForLocale,
} from '../../utils/blog-i18n'
import { getAllAuthors, findAuthorById } from '../../utils/authors'
import { getAllTags, getLocalizedTagName } from '../../utils/tags'

export function getStaticPaths() {
  return locales
    .filter((l) => l !== defaultLocale)
    .map((locale) => ({ params: { locale } }))
}

export async function GET(context: APIContext) {
  const locale = context.params.locale as Locale
  const authors = await getAllAuthors()
  const tags = await getAllTags()
  const allPosts = await getCollection('blog')
  const basePosts = allPosts
    .filter(isBasePost)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())

  const localizedPosts = filterPostsForLocale(basePosts, allPosts, locale).map(
    (post) => localizePost(post, allPosts, locale),
  )

  return rss({
    title: t(locale, 'blog.rssTitle'),
    description: t(locale, 'blog.rssDescription'),
    site: context.site!,
    items: localizedPosts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/${locale}/blog/${post.id.includes('/') ? post.id.split('/').pop() : post.id}/`,
      ...(post.data.author
        ? {
            author: getLocalizedAuthor(
              findAuthorById(authors, post.data.author) ?? {
                id: post.data.author,
                name: post.data.author,
              },
              locale,
            ).name,
          }
        : {}),
      categories: (post.data.tags ?? []).map((tag) =>
        getLocalizedTagName(tags, tag, locale),
      ),
    })),
  })
}
