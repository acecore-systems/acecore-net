---
title: "Pièges et solutions d'Astro View Transitions — Guide d'amélioration UX et qualité du code"
description: "Solutions aux problèmes de scripts cassés avec les View Transitions d'Astro, introduction de la recherche plein texte Pagefind, amélioration de la sécurité des types TypeScript, gestion centralisée des constantes — un guide pratique pour améliorer l'UX et la qualité du code."
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'Webサイト']
image: https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&h=400&fit=crop&q=80
callout:
  type: warning
  title: Lecture indispensable si vous utilisez View Transitions
  text: "L'introduction du ClientRouter (View Transitions) d'Astro rend les transitions de page fluides, mais en contrepartie, tous les scripts en ligne cessent d'être réexécutés. Cet article résume les patterns de solution ainsi que les méthodes d'amélioration de l'UX et de la qualité du code."
processFigure:
  title: Démarche d'amélioration UX
  steps:
    - title: Identification des problèmes
      description: Inventaire des dysfonctionnements après l'introduction de View Transitions.
      icon: i-lucide-bug
    - title: Unification des patterns
      description: Conversion de tous les scripts vers un pattern d'initialisation unifié.
      icon: i-lucide-repeat
    - title: Implémentation de la recherche
      description: Introduction de la recherche plein texte avec Pagefind et mise en place de la navigation.
      icon: i-lucide-search
    - title: Sécurité des types
      description: Élimination des types any et gestion centralisée des constantes pour améliorer la maintenabilité.
      icon: i-lucide-shield-check
compareTable:
  title: Comparaison avant/après
  before:
    label: Avant amélioration
    items:
      - Le menu hamburger ne fonctionne plus après la navigation
      - Pas de recherche interne
      - Types any et constantes codées en dur dispersées
      - onclick en ligne avec risque de violation CSP
  after:
    label: Après amélioration
    items:
      - Tous les scripts fonctionnent correctement grâce à astro:after-swap
      - Recherche plein texte avec filtrage 3 axes via Pagefind
      - Type safety TypeScript et gestion centralisée des constantes
      - addEventListener + attributs data pour conformité CSP
faq:
  title: Questions fréquentes
  items:
    - question: Ces améliorations sont-elles valables sans View Transitions ?
      answer: "En dehors du pattern d'initialisation des scripts, les améliorations (Pagefind, TypeScript, gestion des constantes) sont valables indépendamment de l'utilisation des View Transitions."
    - question: Jusqu'à quelle taille de site Pagefind peut-il gérer ?
      answer: "Pagefind est conçu pour les sites statiques et fonctionne rapidement même avec plusieurs milliers de pages. L'index de recherche est généré au build et exécuté côté navigateur, donc sans charge serveur."
    - question: Les erreurs de type TypeScript peuvent-elles être ignorées sans conséquence ?
      answer: "Le code fonctionne, mais les erreurs de type sont des signes avant-coureurs de bugs. En particulier, rendre le schéma de contenu Astro type-safe active l'autocomplétion de l'IDE pour l'accès aux propriétés dans les templates, améliorant considérablement l'efficacité du développement."
---

## Introduction

Les View Transitions (ClientRouter) d'Astro sont une fonctionnalité puissante qui rend les transitions de page aussi fluides qu'une SPA. Cependant, dès leur introduction, on est confronté à des problèmes : le menu hamburger ne s'ouvre pas, le bouton de recherche ne répond pas, le slider s'arrête…

Cet article présente les pièges des View Transitions et leurs solutions, ainsi que des méthodes pratiques pour améliorer l'UX et la qualité du code.

---

## Le problème des scripts avec View Transitions

### Pourquoi les scripts cessent-ils de fonctionner ?

Lors d'une navigation classique, le navigateur re-parse le HTML et exécute tous les scripts. Cependant, les View Transitions mettent à jour la page par différentiel DOM, ce qui signifie que **les scripts en ligne ne sont pas réexécutés**.

Les traitements affectés incluent :

- Ouverture/fermeture du menu hamburger
- Gestionnaires de clic du bouton de recherche
- Slider d'images hero
- Suivi du défilement de la table des matières
- Pattern façade des intégrations YouTube

### Pattern de solution

Unifiez tous les scripts en **fonctions nommées, réenregistrées via `astro:after-swap`**.

```html
<script>
  function initHeader() {
    const menuBtn = document.querySelector('[data-menu-toggle]')
    menuBtn?.addEventListener('click', () => { /* ... */ })
  }

  // Exécution initiale
  initHeader()

  // Réexécution après View Transitions
  document.addEventListener('astro:after-swap', initHeader)
</script>
```

### Distinction entre astro:after-swap et astro:page-load

- `astro:after-swap` : se déclenche immédiatement après le remplacement du DOM. Ne se déclenche pas au chargement initial, il faut donc appeler la fonction directement
- `astro:page-load` : se déclenche **à la fois** au chargement initial et après les View Transitions. Permet d'omettre l'appel initial explicite

Pour les intégrations YouTube qui doivent fonctionner dès le chargement initial, `astro:page-load` est plus pratique.

---

## Introduction de la recherche plein texte Pagefind

Pour implémenter une recherche plein texte sur un site statique, Pagefind est recommandé. L'index est généré au build et la recherche est exécutée côté navigateur — sans serveur et rapide.

### Configuration de base

```json
{
  "scripts": {
    "build": "astro build && pagefind --site dist"
  }
}
```

Exécutez Pagefind après le build d'Astro pour générer l'index dans `dist/pagefind/`.

### Recherche à facettes

Les attributs `data-pagefind-filter` permettent le filtrage sur 3 axes : auteur, année et tag.

```html
<span data-pagefind-filter="author">gui</span>
<span data-pagefind-filter="year">2026</span>
<span data-pagefind-filter="tag">Astro</span>
```

### Modale de recherche

Implémentez une modale de recherche s'ouvrant avec le raccourci `Ctrl+K`. En cas de zéro résultat, affichez des liens vers la liste des articles, la page des services et la page de contact pour éviter le départ de l'utilisateur.

### Intégration SearchAction

En définissant le paramètre `?q=` dans les données structurées `SearchAction` de Google, il est possible de naviguer directement de la recherche Google vers la recherche interne du site. Ajoutez un traitement d'ouverture automatique de la modale de recherche lors de la détection du paramètre URL.

### Configuration du cache

Les fichiers d'index Pagefind sont peu fréquemment modifiés — activez le cache via les en-têtes de Cloudflare Pages.

```
/pagefind/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400
```

---

## Élimination des onclick en ligne

Les `onclick="..."` directement dans le HTML sont pratiques mais requièrent `unsafe-inline` dans le CSP (Content Security Policy).

### Pattern d'amélioration

Remplacez `onclick` par des attributs `data-*` + `addEventListener`.

```html
<!-- Avant -->
<button onclick="window.openSearch?.()">Rechercher</button>

<!-- Après -->
<button data-search-trigger>Rechercher</button>
```

```javascript
document.querySelectorAll('[data-search-trigger]').forEach(btn => {
  btn.addEventListener('click', () => window.openSearch?.())
})
```

---

## Mise en place d'une bibliothèque de composants

Disposer de composants utilisables lors de la rédaction d'articles de blog enrichit l'expression des articles.

| Composant | Usage |
| --- | --- |
| Callout | 4 types d'annotations : info / warning / tip / note |
| Timeline | Affichage chronologique d'événements |
| FAQ | Questions-réponses avec données structurées |
| Gallery | Galerie d'images avec Lightbox |
| CompareTable | Tableau de comparaison avant/après |
| ProcessFigure | Schéma de processus étape par étape |
| LinkCard | Carte de lien externe style OGP |
| YouTubeEmbed | Chargement différé avec pattern façade |

Tous ces composants sont conçus pour être invocables depuis le frontmatter du Markdown. Le template affiche `<Callout>` si `data.callout` existe.

---

## Amélioration de la sécurité des types TypeScript

### Élimination des types any

Remplacez `any[]` par `CollectionEntry<'blog'>[]` pour des types concrets. L'autocomplétion IDE et la détection d'erreurs à la compilation fonctionnent, rendant l'accès aux propriétés dans les templates sûr.

### Types littéraux pour le schéma de contenu

```typescript
type: z.enum(['info', 'warning', 'tip', 'note']).default('info')
```

En définissant les valeurs du frontmatter comme union de types littéraux, les branchements `if (callout.type === 'info')` côté template deviennent type-safe.

### Assertion as const

L'ajout de `as const` aux objets constants rend les propriétés `readonly` et l'inférence de type littérale. Appliquez-le systématiquement à la constante `SITE`.

### Migration des imports dépréciés

Remplacez `import { z } from 'astro:content'`, qui sera supprimé dans Astro 7, par `import { z } from 'astro/zod'`.

---

## Gestion centralisée des constantes

Les valeurs codées en dur sont source d'oublis lors des modifications. Les valeurs suivantes ont été centralisées dans `src/data/site.ts`.

| Constante | Nombre d'occurrences avant |
| --- | --- |
| AdSense Client ID | 4 fichiers |
| GA4 Measurement ID | 2 emplacements |
| ID de slot publicitaire | 4 fichiers |
| URLs sociales (X, GitHub, Discord, Aceserver) | 17 emplacements |
| Téléphone, email, LINE | 3 fichiers |

```typescript
export const SITE = {
  name: 'Acecore',
  url: 'https://acecore.net',
  ga4Id: 'G-XXXXXXXXXX',
  adsenseClientId: 'ca-pub-XXXXXXXXXXXXXXXX',
  social: {
    x: 'https://x.com/acecore',
    github: 'https://github.com/acecore-systems',
    discord: 'https://discord.gg/...',
  },
} as const
```

---

## Autres améliorations UX

### Suivi du défilement de la table des matières

`IntersectionObserver` surveille les titres du contenu et met en surbrillance le titre actif dans la table des matières de la barre latérale. Le point clé est d'utiliser `scrollIntoView({ block: 'nearest', behavior: 'smooth' })` pour faire défiler la table des matières elle-même.

### Scroll spy

Pour les pages à structure single-page comme la page de services, `IntersectionObserver` suit automatiquement l'élément actif de la navigation.

### Pagination

Pagination automatique par lots de 6 articles, navigation avec points de suspension (`1 2 ... 9 10`), liens textuels « ← Précédent » et « Suivant → ». La logique de pagination est mutualisée dans `src/utils/pagination.ts`.

### Liens d'ancrage avec en-tête sticky

Avec un en-tête sticky, les destinations des liens d'ancrage sont masquées par l'en-tête. Résolvez cela avec les paramètres preflight d'UnoCSS :

```css
[id] { scroll-margin-top: 5rem; }
html { scroll-behavior: smooth; }
```

---

## Conclusion

Si vous utilisez les View Transitions, **l'unification du pattern d'initialisation des scripts** est primordiale. Comprenez la distinction entre `astro:after-swap` / `astro:page-load` et testez toutes les interactions.

Côté qualité du code, la sécurité des types TypeScript et la gestion centralisée des constantes contribuent grandement à la maintenabilité à long terme. Cela semble fastidieux au début, mais les bénéfices de l'autocomplétion IDE se ressentent au quotidien dans le développement.

---

## Série d'articles associée

Cet article fait partie de la série « [Guide d'amélioration de la qualité d'un site Astro](/blog/website-improvement-batches/) ». Les améliorations de performance, SEO et accessibilité sont présentées dans des articles dédiés.
