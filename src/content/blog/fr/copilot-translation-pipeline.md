---
title: 'Comment gérer un blog multilingue avec Sveltia CMS'
description: "Un flux pratique pour modifier les articles source en japonais dans Sveltia CMS, générer des PR de traduction avec GitHub Actions et GitHub Copilot, et publier des pages statiques localisées plus utiles pour le SEO qu'une simple traduction d'interface."
date: 2026-06-07T17:00
lastUpdated: 2026-06-07T00:00
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS', 'SEO']
image: /uploads/acecore-generated/blog-copilot-translation-pipeline.webp
callout:
  type: tip
  title: Traduire l'interface n'est pas publier en multilingue
  text: "La traduction du navigateur ou d'un widget aide le lecteur, mais elle ne crée pas d'URL, title, description, liens internes, flux RSS, sitemap ni hreflang par langue. Pour les moteurs de recherche, il faut publier du HTML statique traduit."
linkCards:
  - href: /fr/blog/cms-selection-and-turnstile/
    title: Guide d'installation de Sveltia CMS
    description: Mise en place de Sveltia CMS dans un site statique Astro.
    icon: i-lucide-badge-check
  - href: /fr/blog/astro-i18n-blog-translation/
    title: Architecture multilingue Astro
    description: Routes, fallback, hreflang, RSS et sitemap pour 9 langues.
    icon: i-lucide-globe-2
faq:
  title: FAQ
  items:
    - question: La traduction d'interface suffit-elle ?
      answer: "Elle est utile pour lire une page, mais elle ne crée pas d'actifs par langue pour le SEO, les flux RSS, les sitemaps et les liens internes."
    - question: La traduction par IA est-elle mauvaise pour le SEO ?
      answer: "Le problème n'est pas l'IA elle-même, mais la publication massive de pages sans valeur. Terminologie, faits, liens et naturel doivent être relus."
    - question: Les pages traduites sont-elles du contenu dupliqué ?
      answer: "Google indique que des pages localisées ne sont considérées comme doublons que si le contenu principal n'est pas traduit. Il faut relier les variantes avec hreflang."
---

Acecore édite principalement ses contenus en japonais, mais publie le blog en 9 langues. Le point essentiel est que **traduire le texte affiché** et **publier de vraies pages localisées** sont deux choses différentes.

La traduction du navigateur ou d'un widget peut aider le lecteur. Mais elle ne génère pas d'URL `/fr/blog/.../`, de métadonnées localisées, de RSS, de sitemap ou de liens `hreflang`.

Si le multilingue vise aussi la recherche organique, la traduction doit faire partie du processus de publication.

## Structure utilisée

- Source japonaise : `src/content/blog/{slug}.md`
- Traductions : `src/content/blog/{locale}/{slug}.md`
- URLs : `/blog/{slug}/`, `/en/blog/{slug}/`, `/fr/blog/{slug}/`
- Édition : Sveltia CMS
- Traduction : PR GitHub Copilot
- Publication : build et revue

Sveltia CMS sert d'interface d'édition pour la source japonaise. Les traductions passent par des pull requests afin de garder un historique, une revue et une validation CI.

## Quand la traduction d'interface suffit

Elle convient pour une lecture interne, une consultation ponctuelle, des écrans d'administration, ou des pages qui ne visent pas de trafic de recherche.

Ce modèle est léger, car aucun fichier traduit n'est maintenu. Mais il ne crée pas non plus de pages indexables par langue.

## Bénéfices SEO des pages localisées

Les moteurs de recherche, les aperçus sociaux et les lecteurs RSS travaillent avec des URLs et du HTML.

Si seule la page japonaise existe, le navigateur peut la traduire pour l'utilisateur, mais le `title`, la `description`, le RSS et le sitemap restent ceux de la page japonaise.

Avec des pages statiques, chaque langue a sa propre URL.

```txt
/blog/copilot-translation-pipeline/
/en/blog/copilot-translation-pipeline/
/fr/blog/copilot-translation-pipeline/
/de/blog/copilot-translation-pipeline/
```

### 1. Chaque langue est directement crawlable

Google peut traiter JavaScript, mais sa documentation rappelle aussi les limites de JavaScript et recommande le rendu statique ou côté serveur comme solution plus stable. Pour les autres crawlers et lecteurs RSS, le HTML initial traduit est encore plus important.

### 2. Les métadonnées sont localisées

Le frontmatter peut être traduit :

```yaml
title: 'Comment gérer un blog multilingue avec Sveltia CMS'
description: 'Flux avec Sveltia CMS et GitHub Copilot pour créer des PR de traduction.'
```

Cela influence les résultats de recherche, l'OGP, les cartes liées et le RSS.

### 3. hreflang relie les variantes

Google recommande `hreflang` lorsque différentes URLs correspondent à différentes langues ou régions. Avec une traduction seulement côté interface, il n'existe pas d'URL localisée à relier.

### 4. RSS et sitemap deviennent multilingues

Des fichiers traduits permettent de générer `/fr/rss.xml` et des URLs localisées dans le sitemap.

## Rôle de Sveltia CMS

Sveltia CMS ne traduit pas. Il garde simple l'édition de la source japonaise :

- articles japonais
- auteurs
- tags
- JSON source japonais
- images
- frontmatter comme date, FAQ et linkCards

La mise en place du CMS est détaillée dans le [Guide d'installation de Sveltia CMS](/fr/blog/cms-selection-and-turnstile/).

## Règles pour Copilot

La PR de traduction doit préserver les identifiants et localiser le texte.

```md
Keep:

- slug
- image path
- author id
- tag ids
- external URLs
- code blocks

Localize:

- title
- description
- FAQ
- body text
- internal blog URLs when locale-specific URLs exist
```

## Leçons des PR

- Les anciens articles mentionnaient encore Pages CMS après la migration vers Sveltia CMS.
- Si `date` reste ancien, l'article ne remonte pas en tête du blog.
- Le slug doit rester identique entre les langues.
- Les liens internes doivent respecter la locale du lecteur.
- L'IA accélère la traduction, mais la relecture reste nécessaire.

## Références

- [Google Search Central: Localized Versions of your Pages](https://developers.google.com/search/docs/advanced/crawling/localized-versions?hl=en&rd=1&visit_id=638856769088389068-716743185)
- [Google Search Central: Managing Multi-Regional and Multilingual Sites](https://developers.google.com/search/docs/advanced/crawling/managing-multi-regional-sites)
- [Google Search Central: JavaScript SEO Basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google Search Central: Spam Policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [Guide d'installation de Sveltia CMS](/fr/blog/cms-selection-and-turnstile/)

## Résumé

La traduction d'interface aide à lire une page. Les pages statiques localisées transforment chaque langue en véritable contenu du site.

Sveltia CMS gère le japonais, GitHub Copilot crée les PR de traduction, et Astro build valide le résultat avant publication.
