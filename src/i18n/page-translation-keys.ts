// Keep source filenames and runtime page keys in one explicit registry.
export const pageTranslationKeys = {
  home: 'home',
  'not-found': 'notFound',
  about: 'about',
  services: 'services',
  pricing: 'pricing',
  contact: 'contact',
  privacy: 'privacy',
  'security-policy': 'securityPolicy',
  terms: 'terms',
  acestudio: 'acestudio',
} as const

export function getPageTranslationKey(sourceName: string): string | null {
  return Object.hasOwn(pageTranslationKeys, sourceName)
    ? pageTranslationKeys[sourceName as keyof typeof pageTranslationKeys]
    : null
}
