---
title: 'De VitePress à Starlight — Unification du framework pour les sites de documentation'
description: "Récit de la migration d'un site documentaire de plan d'affaires construit avec VitePress + UnoCSS vers Astro + Starlight, unifiant le framework de deux projets. La migration CDN des diagrammes Mermaid est également présentée."
date: 2026-03-15
author: gui
tags: ['技術', 'Astro', 'Starlight']
image: https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?w=800&h=400&fit=crop&q=80
processFigure:
  title: Étapes de la migration
  steps:
    - title: Analyse de l'existant
      description: Inventaire de la configuration VitePress + UnoCSS.
      icon: i-lucide-search
    - title: Mise en place de Starlight
      description: Reconfiguration du projet avec Astro + Starlight.
      icon: i-lucide-star
    - title: Migration du contenu
      description: Ajustement du placement et du frontmatter des fichiers Markdown.
      icon: i-lucide-file-text
    - title: Migration CDN de Mermaid
      description: Suppression des dépendances de plugins et rendu des diagrammes via CDN.
      icon: i-lucide-git-branch
compareTable:
  title: Comparaison avant et après la migration
  before:
    label: VitePress + UnoCSS
    items:
      - SSG basé sur Vue
      - Stylisation via UnoCSS
      - Mermaid fonctionnant via un plugin
      - Stack technique séparée du projet Astro
  after:
    label: Astro + Starlight
    items:
      - SSG basé sur Astro
      - Stylisation intégrée à Starlight
      - Mermaid fonctionnant via CDN
      - Framework unifié avec le site principal
faq:
  title: Questions fréquentes
  items:
    - question: Quel est l'avantage de migrer de VitePress vers Starlight ?
      answer: Si le site principal fonctionne sous Astro, l'unification du framework réduit les coûts d'apprentissage, simplifie la gestion des dépendances et améliore la cohérence de la configuration. Le pipeline de build peut également être consolidé.
    - question: Comment sont affichés les diagrammes Mermaid ?
      answer: Nous avons abandonné la dépendance au plugin pour charger Mermaid via CDN (jsdelivr). Cela élimine toute dépendance de build et stabilise le rendu des diagrammes.
    - question: Combien de temps demande la migration ?
      answer: Le travail principal consiste en la conversion de la structure de répertoires (docs/ → src/content/docs/) et l'ajustement du frontmatter. Le contenu étant en Markdown, il peut être réutilisé tel quel, ce qui permet de finaliser la migration en un temps relativement court.
---

Voici les étapes de la migration d'un site documentaire construit avec VitePress vers Astro + Starlight. Lorsque le site principal fonctionne sous Astro, unifier également la documentation sous Starlight simplifie l'exploitation. La migration CDN des diagrammes Mermaid est également abordée.

## Pourquoi unifier le framework ?

Lorsque le site principal et le site documentaire utilisent des frameworks différents, les problèmes suivants se posent :

- **Double coût d'apprentissage** : Il faut maîtriser les spécifications de VitePress et d'Astro
- **Dispersion des dépendances** : Gérer les mises à jour des packages npm sur deux systèmes
- **Incohérence de la configuration** : Maintenir individuellement ESLint, Prettier, configuration de déploiement, etc.

En unifiant sous Astro + Starlight, on peut mutualiser les patterns de fichiers de configuration et le savoir-faire de dépannage.

## Procédure de migration de VitePress vers Starlight

### 1. Conversion de la structure du projet

VitePress place les documents dans le répertoire `docs/`, Starlight dans `src/content/docs/`.

```
# Avant (VitePress)
docs/
  pages/
    index.md
    business-overview.md
    market-analysis.md

# Après (Starlight)
src/
  content/
    docs/
      index.md
      business-overview.md
      market-analysis.md
```

### 2. Ajustement du frontmatter

Les formats de frontmatter diffèrent légèrement entre VitePress et Starlight. La configuration `sidebar` de VitePress a été migrée vers le champ `sidebar` du frontmatter.

```yaml
# Frontmatter Starlight
---
title: Vue d'ensemble de l'activité
sidebar:
  order: 1
---
```

### 3. Configuration de astro.config.mjs

```javascript
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  integrations: [
    starlight({
      title: 'Plan d\'affaires Acecore',
      defaultLocale: 'ja',
      sidebar: [
        {
          label: 'Plan d\'affaires',
          autogenerate: { directory: '/' },
        },
      ],
    }),
  ],
})
```

### 4. Suppression d'UnoCSS

Dans l'environnement VitePress, UnoCSS était utilisé pour les styles personnalisés, mais Starlight intègre des styles par défaut suffisants. La suppression de `uno.config.ts` et des packages associés a permis d'alléger les dépendances.

## Migration CDN des diagrammes Mermaid

Le document de plan d'affaires utilise Mermaid pour les organigrammes et les diagrammes de flux. Sous VitePress, Mermaid était intégré via un plugin (`vitepress-plugin-mermaid`), mais un tel plugin n'existe pas pour Starlight.

La solution adoptée a été de charger Mermaid côté navigateur depuis un CDN.

### Implémentation

Ajout du script CDN Mermaid dans l'en-tête personnalisé de Starlight.

```javascript
// astro.config.mjs
starlight({
  head: [
    {
      tag: 'script',
      attrs: { type: 'module' },
      content: `
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'
        mermaid.initialize({ startOnLoad: true })
      `,
    },
  ],
})
```

La syntaxe Mermaid standard dans le Markdown fonctionne telle quelle :

````markdown
```mermaid
graph TD
    A[Plan d'affaires] --> B[Analyse de marché]
    A --> C[Stratégie commerciale]
    A --> D[Plan financier]
```
````

### Avantages de l'approche CDN

- **Zéro dépendance de build** : Pas besoin de Mermaid en tant que package npm
- **Toujours à jour** : Récupération de la dernière version via CDN
- **Pas de SSR nécessaire** : Le rendu côté navigateur n'impacte pas le temps de build

## Résultat de la migration

| Élément | Avant | Après |
| --- | --- | --- |
| Framework | VitePress 1.x | Astro 6 + Starlight |
| CSS | UnoCSS | Intégré à Starlight |
| Mermaid | vitepress-plugin-mermaid | CDN (jsdelivr) |
| Sortie de build | `docs/.vitepress/dist` | `dist` |
| Hébergement | Cloudflare Pages | Cloudflare Pages (inchangé) |

L'unification du framework permet de mutualiser les patterns de configuration `astro.config.mjs` et les paramètres de déploiement entre plusieurs projets.

## Conclusion

L'unification du framework n'est pas urgente au départ, mais ses bénéfices se renforcent avec le temps. La migration de VitePress vers Starlight se réalise en quelques heures, et la migration CDN de Mermaid apporte même l'avantage de se libérer de la gestion de plugins. Si vous gérez plusieurs projets, envisagez l'unification de votre stack technique.
