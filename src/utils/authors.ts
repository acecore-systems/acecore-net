import { getCollection, type CollectionEntry } from 'astro:content'

export type AuthorData = CollectionEntry<'authors'>['data']

let authorsPromise: Promise<AuthorData[]> | undefined

export function getAllAuthors(): Promise<AuthorData[]> {
  if (!authorsPromise) {
    authorsPromise = getCollection('authors').then((entries) =>
      entries.map((entry) => entry.data as AuthorData),
    )
  }

  return authorsPromise
}

export function findAuthorById(
  authors: readonly AuthorData[] = [],
  authorId?: string | null,
): AuthorData | null {
  if (!authorId) return null
  return authors.find((author) => author.id === authorId) ?? null
}
