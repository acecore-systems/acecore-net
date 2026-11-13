export const CORPORATE_MOTTO_SOURCE = '世界を次のステージへ'
export const CORPORATE_MOTTO_TOKEN = '{acecoreCorporateMotto}'

interface TranslationEntry {
  id: string
  source: string
  current: string | null
}

export interface ProtectedTranslationTerm {
  source: string
  token: string
  text: string
}

export function createSiteTranslationTerms(
  sourceMotto: unknown,
  currentMotto: unknown,
): ProtectedTranslationTerm[] {
  // A deliberate change to the Japanese motto must still be translated.
  if (sourceMotto !== CORPORATE_MOTTO_SOURCE) return []
  if (typeof currentMotto !== 'string' || !currentMotto.trim()) {
    throw new Error('The corporate motto needs an approved locale translation')
  }
  return [
    {
      source: CORPORATE_MOTTO_SOURCE,
      token: CORPORATE_MOTTO_TOKEN,
      text: currentMotto,
    },
  ]
}

export function protectSiteTranslationTerms(
  entries: readonly TranslationEntry[],
  terms: readonly ProtectedTranslationTerm[],
): TranslationEntry[] {
  return entries.map((entry) => {
    let { source, current } = entry
    for (const term of terms) {
      source = source.replaceAll(term.source, term.token)
      current = current?.replaceAll(term.text, term.token) ?? null
    }
    return { ...entry, source, current }
  })
}

export function restoreSiteTranslationTerms(
  translations: ReadonlyMap<string, string>,
  entries: readonly TranslationEntry[],
  terms: readonly ProtectedTranslationTerm[],
): Map<string, string> {
  const restored = new Map(translations)
  for (const entry of entries) {
    let translated = restored.get(entry.id)
    if (translated === undefined)
      throw new Error(`Missing translation: ${entry.id}`)
    for (const term of terms) {
      if (!entry.source.includes(term.source)) {
        if (translated.includes(term.token)) {
          throw new Error(`Unexpected protected term in ${entry.id}`)
        }
        continue
      }
      // Exact terms also support results submitted before token protection.
      translated =
        entry.source === term.source
          ? term.text
          : translated.replaceAll(term.token, term.text)
      if (!translated.includes(term.text)) {
        throw new Error(
          `Translation ${entry.id} must preserve the corporate motto`,
        )
      }
    }
    if (translated.includes(CORPORATE_MOTTO_TOKEN)) {
      throw new Error(`Unresolved corporate motto token in ${entry.id}`)
    }
    restored.set(entry.id, translated)
  }
  return restored
}
