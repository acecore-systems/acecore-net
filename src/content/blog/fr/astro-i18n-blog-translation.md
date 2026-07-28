---
title: 'Comment faire supporter 9 langues à un site Astro 7 ― Traduction du blog et architecture multilingue'
description: "Retour d'expérience sur l'internationalisation d'un site Astro 7.1.3 + UnoCSS + Cloudflare Pages en 9 langues. Couvre l'ensemble du processus, de l'internationalisation de l'UI à la traduction du blog et à la configuration multilingue de Pages CMS."
date: 2026-03-25T00:00
lastUpdated: '2026-07-29T00:28:02+09:00'
author: gui
tags: ['技術', 'Astro', 'i18n', 'Webサイト']
image: /uploads/acecore-generated/blog-astro-i18n-blog-translation.webp
processFigure:
  title: Flux de travail multilingue
  steps:
    - title: Base i18n
      description: Mettre en place le routage i18n natif d'Astro et les utilitaires de traduction.
      icon: i-lucide-globe
    - title: Traduction des textes UI
      description: Traduire les textes de l'en-tête, du pied de page et de tous les composants.
      icon: i-lucide-languages
    - title: Traduction des articles
      description: Générer 168 fichiers lors du déploiement initial (21 articles × 8 langues).
      icon: i-lucide-file-text
    - title: CMS et vérification du build
      description: Configuration multilingue du Pages CMS et vérification de la génération de toutes les pages.
      icon: i-lucide-check-circle
compareTable:
  title: Comparaison avant et après
  before:
    label: Japonais uniquement
    items:
      - 1 seule langue (japonais)
      - 23 articles de blog
      - 523 pages générées (après support multilingue de l'UI)
      - Pages CMS avec 1 collection de blog
      - Tags et données auteur en japonais uniquement
      - 1 seul flux RSS
  after:
    label: 9 langues (déploiement initial)
    items:
      - Japonais + 8 langues (en, zh-cn, es, pt, fr, ko, de, ru)
      - 23 articles + 168 traductions = 191 au total
      - 621 pages générées lors du déploiement initial
      - Pages CMS avec 9 collections par langue
      - 25 tags et données auteur traduits par langue
      - Flux RSS multilingues (9 langues)
callout:
  type: info
  title: Langues prises en charge
  text: 'Prend en charge 9 langues : japonais (par défaut), anglais, chinois simplifié, espagnol, portugais, français, coréen, allemand et russe.'
statBar:
  items:
    - value: '9'
      label: Langues prises en charge
    - value: '208'
      label: Articles traduits (au 29 juillet 2026)
    - value: '652'
      label: Pages générées (au 29 juillet 2026)
faq:
  title: Questions fréquentes
  items:
    - question: Pourquoi avoir choisi 9 langues ?
      answer: "Pour maximiser la portée mondiale, nous avons couvert les principaux marchés linguistiques. L'anglais, le chinois, l'espagnol et le portugais couvrent la majorité des internautes, tandis que le français, l'allemand, le russe et le coréen complètent les marchés principaux restants."
    - question: Comment la qualité de traduction est-elle garantie ?
      answer: "Nous utilisons la traduction par IA avec GitHub Copilot. La version anglaise est d'abord créée comme langue intermédiaire, puis traduite de l'anglais vers chaque langue cible pour réduire les écarts de qualité. Les valeurs de tags dans le frontmatter restent en japonais, et les URLs, blocs de code et chemins d'images ne sont pas modifiés."
    - question: "Que se passe-t-il quand un article traduit n'existe pas ?"
      answer: "Si le fichier de traduction d'une locale manque, aucune URL localisée n'est générée pour l'article. L'article japonais reste disponible à son URL d'origine et le sélecteur de langue renvoie vers l'index du blog de la locale cible."
    - question: "Faut-il traduire lors de l'ajout d'un nouvel article ?"
      answer: "La traduction n'est pas requise pour publier l'article japonais. Ajouter un fichier Markdown du même nom dans le répertoire d'une langue active l'URL, l'entrée sitemap et la relation hreflang de cette locale."
---

Nous avons fait évoluer le site officiel d'Acecore du japonais uniquement vers 9 langues. Le déploiement initial a traduit 21 articles en 8 langues, soit 168 fichiers. Au 29 juillet 2026, le dépôt contient 29 articles japonais et 208 traductions, soit 237 fichiers d'article au total, et le build génère 652 pages. Une URL localisée n'est publiée que lorsque son fichier de traduction existe.

## Stratégie multilingue

### Définition du périmètre

Nous avons abordé le support multilingue en trois phases :

1. **Base i18n** : Configuration du routage i18n natif d'Astro, utilitaires de traduction et fichiers JSON de traduction pour 9 langues
2. **Traduction des textes UI** : Textes des composants dans l'en-tête, le pied de page, la barre latérale et toutes les pages
3. **Traduction des articles** : 21 articles traduits en 8 langues lors du déploiement initial (168 fichiers générés)

### Conception des URLs

Nous avons adopté le `prefixDefaultLocale: false` d'Astro, servant le japonais à la racine (`/blog/...`) et les autres langues avec des préfixes (`/en/blog/...`, `/zh-cn/blog/...`, etc.).

```
# Japonais (par défaut)
/blog/astro-performance-tuning/

# Anglais
/en/blog/astro-performance-tuning/

# Chinois simplifié
/zh-cn/blog/astro-performance-tuning/
```

Utiliser le même slug dans toutes les langues simplifie le mappage des URLs lors du changement de langue.

## Implémentation de la base i18n

### Configuration i18n d'Astro

Le routage i18n est configuré dans `astro.config.mjs`.

```javascript
// astro.config.mjs
export default defineConfig({
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
})
```

### Utilitaires de traduction

Les fichiers de configuration, fonctions utilitaires et fichiers JSON de traduction sont regroupés dans `src/i18n/`.

```typescript
// src/i18n/utils.ts
export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key] ?? translations[defaultLocale][key] ?? key
}
```

Les fichiers de traduction sont au format JSON sous `src/i18n/locales/`, gérant environ 100 clés pour la navigation, le pied de page, l'UI du blog et les métadonnées.

### Pattern View Component

L'implémentation des pages utilise le **Pattern View Component**. Le layout et la logique sont centralisés dans `src/views/`, tandis que les fichiers de route (`src/pages/`) sont de légers wrappers qui passent simplement le locale.

```astro
---
// src/pages/[locale]/about.astro (fichier de route)
import AboutPage from '../../views/AboutPage.astro'
const { locale } = Astro.params
---

<AboutPage locale={locale} />
```

Ce design élimine la duplication de logique entre la route japonaise (`/about`) et les routes multilingues (`/en/about`).

## Support multilingue du contenu du blog

### Structure des répertoires

Les articles traduits sont placés dans des sous-répertoires avec le code de langue. Le loader glob d'Astro les détecte automatiquement de façon récursive avec le pattern `**/*.md`.

```
src/content/blog/
  astro-performance-tuning.md          # Japonais (base)
  website-renewal.md
  en/
    astro-performance-tuning.md        # Version anglaise
    website-renewal.md
  zh-cn/
    astro-performance-tuning.md        # Version chinois simplifié
    website-renewal.md
  es/
    ...
```

### Utilitaires de résolution de contenu

Trois fonctions ont été implémentées dans `src/utils/blog-i18n.ts`.

```typescript
// Déterminer si c'est un article de base (pas de slash dans l'ID = base)
export function isBasePost(post: CollectionEntry<'blog'>): boolean {
  return !post.id.includes('/')
}

// Supprimer le préfixe locale de l'ID pour obtenir le slug de base
export function getBaseSlug(postId: string): string {
  const idx = postId.indexOf('/')
  return idx !== -1 ? postId.slice(idx + 1) : postId
}

// Obtenir la version localisée d'un article de base (fallback vers l'original)
export function localizePost(
  post: CollectionEntry<'blog'>,
  allPosts: CollectionEntry<'blog'>[],
  locale: Locale,
): CollectionEntry<'blog'> {
  if (locale === defaultLocale) return post
  return allPosts.find((p) => p.id === `${locale}/${post.id}`) ?? post
}
```

`localizePost()` renvoie toujours l'article source comme solution de sécurité, mais les routes publiques et les listes utilisent `isPostAvailableInLocale()` et des filtres pour ne retenir que les traductions existantes. Aucune URL localisée n'est générée lorsqu'une traduction manque.

Le point clé est de **ne pas modifier le schema existant de la collection de contenu**. Le loader glob d'Astro reconnaît automatiquement les fichiers dans les sous-répertoires avec des IDs comme `en/astro-performance-tuning`, sans nécessiter de changement de configuration.

### Règles des fichiers de traduction

Les fichiers de traduction ont été générés en suivant ces règles :

- Les **clés du frontmatter** restent en anglais (`title`, `description`, `date`, etc.)
- Les **valeurs des tags** sont conservées en japonais (`['技術', 'Astro']`, etc.)
- Les **URLs, chemins d'images, blocs de code et HTML** ne sont pas modifiés
- La **date et l'auteur** restent inchangés
- Le **texte du corps et les valeurs textuelles du frontmatter** (title, description, callout, FAQ, etc.) sont traduits

### Flux de travail de traduction

Le processus de traduction suit ces étapes :

1. **Créer l'anglais comme langue intermédiaire** : Traduire du japonais original vers l'anglais
2. **Traduire de l'anglais vers chaque langue** : Étendre depuis l'anglais vers 7 langues
3. **Traitement par lots** : Traiter 5-6 articles à la fois avec GitHub Copilot

La traduction en deux étapes (japonais → anglais → langues cibles) réduit les écarts de qualité. Passer par l'anglais comme langue intermédiaire produit une qualité plus stable que traduire directement du japonais vers chaque langue.

## View Components multilingues

### Implémentation de BlogPostPage

La page d'article de blog obtient la version locale du contenu avec `localizePost()` et l'assigne à une variable de template.

```astro
---
// src/views/BlogPostPage.astro
const localizedPost = localizePost(basePost, allPosts, locale)
const post = localizedPost // les références existantes du template fonctionnent telles quelles
---
```

Cette approche permet le support multilingue sans modifier aucune référence à `post.data.title` ou `post.body` dans le template.

### Implémentation des pages de liste

Les listes du blog, listes de tags, listes d'auteurs et pages d'archives filtrent uniquement les articles de base avec `isBasePost()`, puis substituent avec les versions traduites en utilisant `localizePost()` au moment de l'affichage.

```astro
---
const allPosts = await getCollection('blog')
const basePosts = allPosts.filter(isBasePost)
const displayPosts = basePosts.map((p) => localizePost(p, allPosts, locale))
---
```

## Considérations de build

### Échappement dans le frontmatter YAML

Les traductions en français ont causé des problèmes où les apostrophes (`l'atelier`, `qu'on`, etc.) entraient en conflit avec les guillemets simples du YAML.

```yaml
# NG : Erreur d'analyse YAML
title: 'Le métavers est plus proche qu'on ne le pense'

# OK : Passer aux guillemets doubles
title: "Le métavers est plus proche qu'on ne le pense"
```

Un script Node.js a été utilisé pour corriger tous les fichiers en lot. Le texte anglais comme `Acecore's` a le même problème, le type de guillemets doit donc être pris en compte lors de la génération des fichiers de traduction.

### Filtrage des routes d'images OG

`/blog/og/[slug].png.ts` capturait aussi les slugs des articles traduits (`en/aceserver-hijacked`, etc.), causant des erreurs de paramètres. Résolu en filtrant avec `isBasePost()`.

```typescript
export const getStaticPaths: GetStaticPaths = async () => {
  const allPosts = await getCollection('blog')
  const posts = allPosts.filter(isBasePost)
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title },
  }))
}
```

## Support multilingue de Pages CMS

Pages CMS (`.pages.yml`) ne cible que les fichiers directement sous le répertoire `path` spécifié, les sous-répertoires de traduction ont donc été enregistrés comme des collections individuelles.

```yaml
content:
  - name: blog
    label: ブログ（日本語）
    path: src/content/blog
  - name: blog-en
    label: Blog（English）
    path: src/content/blog/en
  - name: blog-zh-cn
    label: 博客（简体中文）
    path: src/content/blog/zh-cn
  # ... configuré pour chaque langue
```

Les libellés sont rédigés dans chaque langue pour qu'il soit immédiatement clair quelle collection correspond à quelle langue dans le CMS.

## UI de changement de langue

Un composant `LanguageSwitcher` a été ajouté à l'en-tête, fournissant une UI de changement de langue pour desktop et mobile. Lors du changement de langue, les utilisateurs naviguent vers le locale correspondant de la même page. Lors de la première visite, le `navigator.language` du navigateur est détecté pour une redirection automatique.

## Affichage multilingue des tags

Les tags des articles conservent leurs slugs en japonais dans les URLs tandis que **seul le nom affiché est traduit**. Cela évite la complexité du routage tout en montrant les tags dans la langue maternelle de l'utilisateur.

Les définitions de tags sont centralisées dans `src/content/tags/{tagId}.json`, avec chaque tag contenant un champ `i18n.name`. Cela déplace la source de vérité des traductions de tags des JSON de traduction vers la collection de tags.

```json
{
  "id": "technology",
  "name": "技術",
  "i18n": {
    "en": { "name": "Technology" },
    "fr": { "name": "Technologie" }
  }
}
```

Les cartes d'articles, la barre latérale, la liste des tags et les détails d'articles consultent la collection de tags pour changer le nom affiché, garantissant que l'affichage des tags est unifié dans la langue appropriée.

## Données auteur multilingues

Les noms, biographies et listes de compétences des auteurs changent également selon la langue. Un champ `i18n` a été ajouté à `src/content/authors/{authorId}.json` pour stocker les traductions de chaque langue.

```json
{
  "id": "hatt",
  "name": "ハット",
  "bio": "代表取締役。Web制作・サーバー運用…",
  "skills": ["TypeScript", "Astro", "..."]
  "i18n": {
    "en": {
      "name": "Hatt",
      "bio": "CEO and representative director. Web development...",
      "skills": ["TypeScript", "Astro", "..."]
    }
  }
}
```

L'utilitaire `getLocalizedAuthor()` récupère les informations de l'auteur appropriées pour le locale.

```typescript
// src/utils/blog-i18n.ts
export function getLocalizedAuthor(author: Author, locale: Locale) {
  const localized = author.i18n?.[locale]
  return localized ? { ...author, ...localized } : author
}
```

## SEO pour site multilingue

Pour maximiser les bénéfices SEO du support multilingue, nous avons mis en place des mécanismes permettant aux moteurs de recherche d'identifier et d'indexer correctement chaque version linguistique.

### Support hreflang dans le sitemap

L'option `i18n` de `@astrojs/sitemap` est associée à un filtre qui vérifie l'existence des fichiers de traduction. Le sitemap ne contient que les versions réelles et génère automatiquement leurs balises `xhtml:link rel="alternate"`.

```javascript
// astro.config.mjs
sitemap({
  filter(page) {
    return !isMissingLocalizedBlogPost(page)
  },
  i18n: {
    defaultLocale: 'ja',
    locales: {
      ja: 'ja',
      en: 'en',
      'zh-cn': 'zh-CN',
      es: 'es',
      pt: 'pt',
      fr: 'fr',
      ko: 'ko',
      de: 'de',
      ru: 'ru',
    },
  },
})
```

Les articles disponibles dans les 9 langues reçoivent un cluster hreflang de 9 langues. Un article disponible uniquement en japonais reste une entrée japonaise autonome, sans lien vers des URLs localisées inexistantes.

### Support linguistique dans les données structurées JSON-LD

Le champ `inLanguage` a été ajouté aux données structurées `BlogPosting` des articles, informant les moteurs de recherche de la langue de chaque article.

```javascript
// BlogPostPage.astro (extrait JSON-LD)
{
  "@type": "BlogPosting",
  "inLanguage": htmlLangMap[locale],  // "ja", "en", "zh-CN", etc.
  "headline": post.data.title,
  // ...
}
```

### Flux RSS multilingues

En plus du `/rss.xml` en japonais, des flux RSS sont générés pour chaque version linguistique (`/en/rss.xml`, `/zh-cn/rss.xml`, etc.). Les titres et descriptions des flux sont traduits par langue, et la balise `<language>` génère des codes de langue conformes au BCP47.

```typescript
// src/pages/[locale]/rss.xml.ts
export const getStaticPaths = () =>
  locales
    .filter((l) => l !== defaultLocale)
    .map((l) => ({ params: { locale: l } }))
```

Le `<link rel="alternate" type="application/rss+xml">` dans `BaseLayout.astro` configure également automatiquement l'URL RSS appropriée pour le locale.

## Résumé

Le site utilise actuellement les fonctions i18n natives d'Astro 7.1.3 pour produire sa version statique multilingue.

- **Base i18n** : Pas de préfixe pour le japonais avec `prefixDefaultLocale: false` d'Astro
- **Traduction de l'UI** : Zéro duplication de logique grâce au Pattern View Component
- **Traduction du contenu** : Approche par sous-répertoires sans modification du schéma
- **Traduction des tags** : Slugs japonais dans les URLs, noms affichés traduits par langue
- **Traduction des données auteur** : Bio et compétences changent selon la langue
- **SEO** : Hreflang dans le sitemap, `inLanguage` dans le JSON-LD, flux RSS multilingues
- **Traductions absentes** : Aucune URL localisée n'est générée ; l'article japonais reste à son URL d'origine
- **Support CMS** : Les articles de chaque langue sont éditables individuellement dans Pages CMS

Les fichiers de traduction continueront d'être ajoutés progressivement. Tant qu'une traduction n'existe pas, seul l'article japonais est publié ; l'ajout du fichier de locale active son URL, son entrée sitemap et sa relation hreflang.
