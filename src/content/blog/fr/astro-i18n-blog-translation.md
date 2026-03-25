---
title: "Comment faire supporter 9 langues à un site Astro 6 ― Traduction automatique de 136 articles et architecture multilingue"
description: "Retour d'expérience sur l'internationalisation d'un site Astro 6 + UnoCSS + Cloudflare Pages en 9 langues. Couvre l'ensemble du processus, de l'internationalisation de l'UI à la traduction de 136 articles et la configuration multilingue de Pages CMS."
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'i18n', 'Webサイト']
image: https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop&q=80
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
      description: Générer 136 fichiers de traduction (17 articles × 8 langues).
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
      - 17 articles de blog
      - 523 pages générées (après support multilingue de l'UI)
      - Pages CMS avec 1 collection de blog
      - Tags et données auteur en japonais uniquement
      - 1 seul flux RSS
  after:
    label: 9 langues
    items:
      - Japonais + 8 langues (en, zh-cn, es, pt, fr, ko, de, ru)
      - 17 articles + 136 traductions = 153 au total
      - 541 pages générées (articles traduits avec fallback)
      - Pages CMS avec 9 collections par langue
      - 25 tags et données auteur traduits par langue
      - Flux RSS multilingues (9 langues)
callout:
  type: info
  title: Langues prises en charge
  text: "Prend en charge 9 langues : japonais (par défaut), anglais, chinois simplifié, espagnol, portugais, français, coréen, allemand et russe."
statBar:
  items:
    - value: '9'
      label: Langues prises en charge
    - value: '136'
      label: Articles traduits
    - value: '541'
      label: Pages générées
faq:
  title: Questions fréquentes
  items:
    - question: Pourquoi avoir choisi 9 langues ?
      answer: "Pour maximiser la portée mondiale, nous avons couvert les principaux marchés linguistiques. L'anglais, le chinois, l'espagnol et le portugais couvrent la majorité des internautes, tandis que le français, l'allemand, le russe et le coréen complètent les marchés principaux restants."
    - question: Comment la qualité de traduction est-elle garantie ?
      answer: "Nous utilisons la traduction par IA avec GitHub Copilot. La version anglaise est d'abord créée comme langue intermédiaire, puis traduite de l'anglais vers chaque langue cible pour réduire les écarts de qualité. Les valeurs de tags dans le frontmatter restent en japonais, et les URLs, blocs de code et chemins d'images ne sont pas modifiés."
    - question: "Que se passe-t-il quand un article traduit n'existe pas ?"
      answer: "La fonction de fallback affiche l'article original en japonais lorsqu'aucune traduction n'existe. Les traductions peuvent être ajoutées progressivement."
    - question: "Faut-il traduire lors de l'ajout d'un nouvel article ?"
      answer: "La traduction n'est pas obligatoire — s'il n'y a pas de fichier de traduction, la version japonaise est affichée par défaut. Pour ajouter une traduction, il suffit de placer un fichier Markdown du même nom dans le répertoire de la langue correspondante."
---

Nous avons mis à niveau le site officiel d'Acecore du japonais uniquement vers un support de 9 langues. Cet article couvre l'ensemble du processus : internationalisation de l'UI, traduction de 17 articles × 8 langues = 136 fichiers, et configuration multilingue du Pages CMS.

## Stratégie multilingue

### Définition du périmètre

Nous avons abordé le support multilingue en trois phases :

1. **Base i18n** : Configuration du routage i18n natif d'Astro, utilitaires de traduction et fichiers JSON de traduction pour 9 langues
2. **Traduction des textes UI** : Textes des composants dans l'en-tête, le pied de page, la barre latérale et toutes les pages
3. **Traduction des articles** : Les 17 articles traduits en 8 langues (136 fichiers générés)

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
  return translations[locale]?.[key]
    ?? translations[defaultLocale][key]
    ?? key
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
const displayPosts = basePosts.map(p => localizePost(p, allPosts, locale))
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

```typescript
// src/i18n/utils.ts
export function translateTag(tag: string, locale: Locale): string {
  return t(locale, `tags.${tag}`) !== `tags.${tag}`
    ? t(locale, `tags.${tag}`)
    : tag
}
```

Une section `tags` a été ajoutée à chaque JSON de traduction, définissant les traductions pour les 25 types de tags.

```json
// en.json (extrait)
{
  "tags": {
    "技術": "Technology",
    "セキュリティ": "Security",
    "パフォーマンス": "Performance",
    "アクセシビリティ": "Accessibility"
  }
}
```

`translateTag()` est utilisé à 6 endroits — cartes d'articles, barre latérale, index des tags et détail des articles — garantissant que tous les tags s'affichent de manière unifiée dans la langue appropriée.

## Données auteur multilingues

Les biographies et listes de compétences des auteurs changent également selon la langue. Un champ `i18n` a été ajouté à `src/data/authors.json` pour stocker les traductions de chaque langue.

```json
{
  "id": "hatt",
  "name": "hatt",
  "bio": "代表取締役。Web制作・システム開発…",
  "skills": ["TypeScript", "Astro", "..."]
  "i18n": {
    "en": {
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

L'option `i18n` de `@astrojs/sitemap` a été configurée pour générer automatiquement les balises `xhtml:link rel="alternate"` dans le sitemap.

```javascript
// astro.config.mjs
sitemap({
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

Cela génère des liens hreflang pour les 9 langues sur chaque URL, permettant à Google de comprendre précisément la correspondance entre les versions linguistiques.

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
  locales.filter((l) => l !== defaultLocale).map((l) => ({ params: { locale: l } }))
```

Le `<link rel="alternate" type="application/rss+xml">` dans `BaseLayout.astro` configure également automatiquement l'URL RSS appropriée pour le locale.

## Résumé

En exploitant les fonctionnalités i18n natives d'Astro 6, nous avons obtenu un support multilingue de haute qualité même sur un site statique.

- **Base i18n** : Pas de préfixe pour le japonais avec `prefixDefaultLocale: false` d'Astro
- **Traduction de l'UI** : Zéro duplication de logique grâce au Pattern View Component
- **Traduction du contenu** : Approche par sous-répertoires sans modification du schéma
- **Traduction des tags** : Slugs japonais dans les URLs, noms affichés traduits par langue
- **Traduction des données auteur** : Bio et compétences changent selon la langue
- **SEO** : Hreflang dans le sitemap, `inLanguage` dans le JSON-LD, flux RSS multilingues
- **Fallback** : Les articles non traduits affichent automatiquement la version japonaise
- **Support CMS** : Les articles de chaque langue sont éditables individuellement dans Pages CMS

À l'avenir, les fichiers de traduction seront ajoutés progressivement à mesure que de nouveaux articles seront publiés. Grâce à la fonction de fallback, la version japonaise est affichée jusqu'à ce que les traductions soient terminées, maintenant la qualité du site.
