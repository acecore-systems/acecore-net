---
title: "Guide d'amélioration SEO : implémenter les données structurées et l'OGP sur un site Astro"
description: "Synthèse des étapes d'implémentation correcte des données structurées JSON-LD, de l'OGP, du sitemap et du RSS sur un site Astro + Cloudflare Pages. Des résultats enrichis Google à l'optimisation du flux RSS, des améliorations SEO pratiques."
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'SEO']
image: https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Public cible de cet article
  text: "Cet article s'adresse à ceux qui souhaitent améliorer systématiquement le SEO de leur site Astro. Il présente les types de données structurées et leurs schémas d'implémentation, la configuration de l'OGP, l'optimisation du sitemap et d'autres procédures pratiques directement applicables."
processFigure:
  title: Processus d'amélioration SEO
  steps:
    - title: Mise en place des balises meta
      description: Configuration du title, description, canonical et OGP sur toutes les pages.
      icon: i-lucide-file-text
    - title: Données structurées
      description: Transmettre la signification des pages à Google via JSON-LD.
      icon: i-lucide-braces
    - title: Sitemap
      description: Configuration de la priorité et de la fréquence de mise à jour par type de page.
      icon: i-lucide-map
    - title: RSS
      description: Distribution d'un flux de haute qualité incluant auteur et catégories.
      icon: i-lucide-rss
insightGrid:
  title: Données structurées implémentées
  items:
    - title: Organization
      description: Affichage du nom de l'entreprise, URL, logo et coordonnées dans les résultats de recherche.
      icon: i-lucide-building
    - title: BlogPosting
      description: Résultats enrichis pour les articles avec auteur, date de publication, date de mise à jour et image.
      icon: i-lucide-pen-line
    - title: BreadcrumbList
      description: Sortie de la structure hiérarchique de toutes les pages sous forme de fil d'Ariane.
      icon: i-lucide-chevrons-right
    - title: FAQPage
      description: Activation des résultats enrichis pour les questions fréquentes sur les articles avec FAQ.
      icon: i-lucide-help-circle
    - title: WebPage / ContactPage
      description: Attribution de types spécifiques pour la page d'accueil et la page de contact.
      icon: i-lucide-layout
    - title: SearchAction
      description: Possibilité de lancer une recherche interne directement depuis les résultats Google.
      icon: i-lucide-search
faq:
  title: Questions fréquentes
  items:
    - question: L'ajout de données structurées modifie-t-il immédiatement les résultats de recherche ?
      answer: "Non. Il faut plusieurs jours à plusieurs semaines pour que Google explore et ré-indexe. Vous pouvez vérifier l'état de la prise en compte dans le rapport « Résultats enrichis » de Google Search Console."
    - question: Quelle taille est appropriée pour les images OGP ?
      answer: "1200×630 px est recommandé. C'est le ratio optimal pour l'affichage summary_large_image sur X (Twitter)."
    - question: La priorité du sitemap influence-t-elle le SEO ?
      answer: "Google a officiellement déclaré qu'il ignore la priorité, mais d'autres moteurs de recherche peuvent la prendre en compte. Cela ne coûte rien de la configurer."
---

## Introduction

Le SEO évoque souvent l'image du « bourrage de mots-clés », mais le SEO moderne consiste essentiellement à **transmettre avec précision la structure et le contenu du site aux moteurs de recherche**.

Cet article explique les mesures SEO à implémenter sur un site Astro, réparties en 4 catégories. Toutes ces mesures produisent des effets continus une fois configurées.

---

## Configuration OGP et balises meta

L'OGP et les balises meta gèrent l'apparence lors du partage sur les réseaux sociaux et la transmission d'informations aux moteurs de recherche.

### Balises meta de base

Dans le composant de layout d'Astro, les éléments suivants sont générés pour chaque page :

- `og:title` / `og:description` / `og:image` — titre, description et image lors du partage sur les réseaux sociaux
- `twitter:card` = `summary_large_image` — affichage d'une grande carte image sur X (Twitter)
- `rel="canonical"` — spécification de l'URL canonique pour les pages dupliquées
- `rel="prev"` / `rel="next"` — indication des relations de pagination

### Balises meta spécifiques aux articles de blog

Les pages d'articles reçoivent les balises supplémentaires suivantes :

- `article:published_time` / `article:modified_time` — date de publication et de mise à jour
- `article:tag` — informations de tags de l'article
- `article:section` — catégorie de contenu

### Points d'implémentation

Une architecture où le composant de layout reçoit `title` / `description` / `image` en props permet de générer des balises meta cohérentes sur toutes les pages. Pour l'`og:title` de la page d'accueil, utilisez un titre concret incluant le nom du site et l'accroche, plutôt que simplement « Accueil ».

---

## Implémentation des données structurées (JSON-LD)

Les données structurées permettent aux moteurs de recherche de comprendre mécaniquement le contenu des pages. Une implémentation correcte peut entraîner l'affichage de résultats enrichis (FAQ, fil d'Ariane, informations sur l'auteur, etc.) dans les résultats de recherche.

### Organization

Transmet les informations de l'entreprise à Google. Peut s'afficher dans le Knowledge Panel.

```json
{
  "@type": "Organization",
  "name": "Acecore",
  "url": "https://acecore.net",
  "logo": "https://acecore.net/logo.png",
  "contactPoint": { "@type": "ContactPoint", "telephone": "..." }
}
```

Sur la page de présentation de l'entreprise, vous pouvez ajouter le champ `knowsAbout` pour préciser les domaines d'activité.

### BlogPosting

Configurez `BlogPosting` pour les articles de blog. L'inclusion de l'auteur, la date de publication, la date de mise à jour et l'image mise en avant permet d'obtenir un affichage avec informations sur l'auteur dans Google Discover et les résultats de recherche.

### BreadcrumbList

Les données structurées de fil d'Ariane sont configurées sur toutes les pages. Point d'attention lors de l'implémentation : vérifiez que les chemins intermédiaires (comme `/blog/tags/` pour les pages de liste) existent réellement, et ne générez pas la propriété `item` pour les chemins inexistants.

### FAQPage

Les articles avec FAQ génèrent des données structurées `FAQPage`. Avec Astro, il est pratique de définir un champ `faq` dans le frontmatter et de le détecter et générer côté template.

### WebSite + SearchAction

Si le site dispose d'une recherche interne, la configuration de `SearchAction` peut entraîner l'affichage d'une boîte de recherche interne dans les résultats Google. En combinaison avec un moteur de recherche comme Pagefind, configurez un mécanisme d'ouverture automatique de la modale de recherche via le paramètre `?q=` pour améliorer l'expérience utilisateur.

---

## Optimisation du sitemap

Le plugin `@astrojs/sitemap` d'Astro génère automatiquement le sitemap, mais les paramètres par défaut sont insuffisants.

### Configuration par type de page

Utilisez la fonction `serialize()` pour configurer `changefreq` et `priority` selon le pattern d'URL de chaque page.

| Type de page | changefreq | priority |
| --- | --- | --- |
| Page d'accueil | daily | 1.0 |
| Articles de blog | weekly | 0.8 |
| Autres | monthly | 0.6 |

### Configuration de lastmod

Définissez `lastmod` avec la date/heure du build pour indiquer la fraîcheur du contenu aux moteurs de recherche. Si l'article a un champ `lastUpdated` dans le frontmatter, utilisez-le en priorité.

---

## Enrichissement du flux RSS

Le RSS est souvent « configuré et oublié », mais améliorer la qualité du flux améliore l'affichage dans les lecteurs RSS et l'expérience des abonnés.

### Informations à ajouter

- **author** : inclure le nom de l'auteur pour chaque article
- **categories** : ajouter les tags comme catégories pour améliorer la classification dans les lecteurs RSS

```typescript
items: posts.map(post => ({
  title: post.data.title,
  description: post.data.description,
  link: `/blog/${post.id}/`,
  pubDate: post.data.date,
  author: post.data.author,
  categories: post.data.tags,
}))
```

---

## Checklist d'amélioration SEO

Voici les points à vérifier pour l'amélioration SEO d'un site Astro :

1. **Une URL canonical est-elle définie sur toutes les pages**
2. **Chaque page dispose-t-elle d'une image OGP propre**
3. **Validation des données structurées** : vérification avec le [test des résultats enrichis Google](https://search.google.com/test/rich-results)
4. **Les chemins intermédiaires du fil d'Ariane correspondent-ils à des URL existantes**
5. **Le sitemap ne contient-il pas de pages inutiles (404, etc.)**
6. **Le flux RSS inclut-il l'auteur et les catégories**
7. **L'index de recherche (`/pagefind/`, etc.) est-il exclu du crawl dans robots.txt**

Une fois tous ces éléments configurés, les fondations SEO sont en place. Le reste dépend de la qualité du contenu et de la fréquence de mise à jour.

---

## Série d'articles associée

Cet article fait partie de la série « [Guide d'amélioration de la qualité d'un site Astro](/blog/website-improvement-batches/) ». Les améliorations de performance, d'accessibilité et d'UX sont présentées dans des articles dédiés.
