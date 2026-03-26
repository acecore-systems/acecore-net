---
title: "Guide d'amélioration de la qualité d'un site Astro — Jusqu'au score PageSpeed mobile de 99"
description: "Récit complet de l'amélioration d'un site Astro + UnoCSS + Cloudflare Pages sur 4 axes — performance, SEO, accessibilité et UX — aboutissant à un score PageSpeed Insights mobile de 99 et un score parfait sur tous les critères en desktop."
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Public cible de cet article
  text: 'Cet article s''adresse aux personnes travaillant sur l''amélioration de la qualité de sites Web et à celles intéressées par l''exploitation pratique d''Astro + UnoCSS. Il s''agit d''un article hub présentant la vue d''ensemble des améliorations, avec des liens vers des articles détaillés pour chaque thème.'
processFigure:
  title: Approche d'amélioration
  steps:
    - title: Mesure
      description: Identifier les goulots d'étranglement actuels avec PageSpeed Insights et axe.
      icon: i-lucide-gauge
    - title: Analyse
      description: Examiner le détail des scores et identifier les améliorations à plus fort impact.
      icon: i-lucide-search
    - title: Implémentation
      description: Appliquer les modifications une par une et vérifier l'absence d'erreurs de build.
      icon: i-lucide-code
    - title: Re-mesure
      description: Mesurer à nouveau après déploiement pour vérifier les résultats par les chiffres.
      icon: i-lucide-check-circle
compareTable:
  title: Comparaison avant et après amélioration
  before:
    label: Avant amélioration
    items:
      - Score PageSpeed mobile dans les 70
      - Données structurées et OGP non configurés
      - Accessibilité non prise en compte
      - Scripts interrompus par View Transitions
      - Constantes codées en dur dispersées
  after:
    label: Après amélioration
    items:
      - Mobile 99 / 100 / 100 / 100 (Desktop tous à 100)
      - 7 types de données structurées + OGP + canonical
      - Conformité WCAG AA (contraste, aria, notification SR, focus-visible)
      - Tous les composants compatibles View Transitions
      - Constantes SITE, URLs sociales et IDs publicitaires centralisés
linkCards:
  - href: /blog/astro-performance-tuning/
    title: Optimisation des performances
    description: Comment atteindre 99 au PageSpeed avec la stratégie de diffusion CSS, la configuration des polices, les images responsives et le cache.
    icon: i-lucide-gauge
  - href: /blog/astro-seo-and-structured-data/
    title: SEO et données structurées
    description: Guide pratique d'implémentation de JSON-LD, OGP, sitemap et RSS.
    icon: i-lucide-search
  - href: /blog/astro-accessibility-guide/
    title: Accessibilité
    description: Guide des attributs aria, du contraste et de l'amélioration des formulaires pour atteindre la conformité WCAG AA.
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: UX et qualité du code
    description: Pratiques autour des pièges de View Transitions, de la recherche plein texte Pagefind et de la sécurité de type TypeScript.
    icon: i-lucide-sparkles
faq:
  title: Questions fréquentes
  items:
    - question: Est-il possible d'atteindre un score PageSpeed mobile de 100 ?
      answer: 'C''est techniquement possible, mais pour un site intégrant des services externes comme AdSense ou GA4, maintenir un score stable de 100 est extrêmement difficile. Lighthouse simule une connexion slow 4G (environ 1,6 Mbps), ce qui pénalise fortement le chargement de ressources externes. 99 représente un sommet réaliste.'
    - question: Dans quel ordre faut-il procéder aux améliorations ?
      answer: 'Commencez par analyser l''état actuel avec PageSpeed Insights et traitez les éléments à plus fort impact. En général, l''ordre recommandé est : performance → SEO → accessibilité.'
    - question: Ces techniques d'amélioration s'appliquent-elles à d'autres sites Astro ?
      answer: 'Oui. La stratégie de diffusion CSS, l''auto-hébergement des polices, les données structurées et l''amélioration de l''accessibilité sont des bonnes pratiques communes à tous les sites Astro.'
    - question: Avez-vous utilisé GitHub Copilot pour les améliorations ?
      answer: 'Oui. Pratiquement toutes les améliorations ont été réalisées en collaboration avec GitHub Copilot. Les détails seront présentés dans l''article « Flux de développement avec GitHub Copilot ».'
---

## Introduction

Le site officiel d'Acecore, relancé en mars 2026, est construit avec Astro 6 + UnoCSS + Cloudflare Pages. Cependant, juste après la refonte, le site n'était qu'à un stade « fonctionnel ». Des marges d'amélioration existaient en performance, SEO, accessibilité et UX.

Cet article retrace la vue d'ensemble de plus de 150 améliorations ayant abouti à un **score PageSpeed Insights mobile de 99 et un score parfait sur tous les critères en desktop**.

---

## Le mur du score PageSpeed mobile 99

Le premier point à souligner est qu'**obtenir un score élevé PageSpeed Insights sur mobile est bien plus difficile qu'on ne l'imagine**.

### La simulation mobile de Lighthouse

Derrière PageSpeed Insights fonctionne un outil appelé Lighthouse, qui applique le throttling suivant pour les tests mobiles.

| Paramètre | Valeur |
| --- | --- |
| Vitesse de téléchargement | Environ 1,6 Mbps (slow 4G) |
| Vitesse d'upload | Environ 0,75 Mbps |
| Latence | 150 ms (RTT) |
| CPU | Ralentissement ×4 |

Autrement dit, une page qui s'ouvre en 1 seconde avec la fibre prend **5 à 6 secondes** dans la simulation Lighthouse. Le simple chargement de 200 Kio de CSS génère environ **1 seconde** de blocage en slow 4G.

### La non-linéarité des scores

Les scores PageSpeed ne sont pas linéaires.

- **50 → 90** : Atteignable avec des optimisations de base (compression d'images, suppression de scripts inutiles)
- **90 → 95** : Nécessite des stratégies de diffusion CSS, polices et images
- **95 → 99** : Tuning au niveau de la milliseconde. Choix entre inlining CSS et fichier externe
- **99 → 100** : Dépend de la vitesse de réponse du CDN externe et des variations de mesure de Lighthouse. Extrêmement difficile à atteindre de manière stable avec AdSense/GA4

### Variabilité des scores

Même pour un site identique, le score peut **varier de 2 à 5 points** d'une mesure à l'autre. Causes :

- Vitesse de réponse des services de transformation d'images (Cloudflare Images, etc.)
- État du cache du serveur edge Cloudflare Pages
- Marges d'erreur de Lighthouse lui-même

L'objectif doit être « obtenir systématiquement un score élevé sur des mesures répétées » plutôt que « avoir obtenu 100 une fois ».

---

## Scores finaux

Malgré ces difficultés, les scores suivants sont désormais atteints de manière stable.

| Indicateur | Mobile | Desktop |
| --- | --- | --- |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

---

## Les 4 piliers de l'amélioration

Les améliorations ont été menées selon 4 grandes catégories. Les détails de chacune sont présentés dans des articles dédiés.

### 1. Performance

L'optimisation des performances a le plus contribué au score mobile de 99. Stratégie de diffusion CSS (inline vs fichier externe), auto-hébergement des polices, optimisation des images responsives, chargement différé AdSense/GA4 — les goulots d'étranglement ont été éliminés un par un.

Les 3 actions les plus efficaces :

- **Externalisation CSS** : Passage de 190 Kio de CSS inline à un fichier externe, réduisant le poids HTML jusqu'à 91%
- **Correction de l'incohérence du nom de police** : Le nom `Noto Sans JP Variable` enregistré par `@fontsource-variable/noto-sans-jp` ne correspondait pas au `Noto Sans JP` référencé dans le CSS — problème identifié et corrigé
- **Images responsives** : Mise en place de `srcset` + `sizes` sur toutes les images pour servir les tailles adaptées au mobile

### 2. SEO

Pour répondre aux résultats enrichis de Google, 7 types de données structurées JSON-LD ont été implémentés. L'optimisation des balises OGP, canonical, du sitemap et du flux RSS a permis de transmettre précisément la structure du site aux moteurs de recherche.

### 3. Accessibilité

Le score PageSpeed Accessibility 100 a été atteint en passant les tests automatiques axe DevTools et Lighthouse. `aria-hidden` sur les icônes décoratives (plus de 30 emplacements), notifications SR pour les liens externes, correction des contrastes (`text-slate-400` → `text-slate-500`), application globale de `focus-visible` — un travail minutieux et méthodique.

### 4. UX et qualité du code

Résolution des problèmes d'arrêt de scripts causés par View Transitions (ClientRouter) sur tous les composants, implémentation de la recherche plein texte via Pagefind. Côté code, amélioration de la sécurité des types TypeScript, centralisation des constantes (URLs sociales, IDs publicitaires, GA4 ID regroupés dans la constante SITE), améliorant considérablement la maintenabilité.

---

## Stack technique

| Technologie | Usage |
| --- | --- |
| Astro 6 | Génération de site statique (architecture zéro JS) |
| UnoCSS (presetWind3) | CSS utility-first |
| Cloudflare Pages | Hébergement, CDN, contrôle des headers |
| @fontsource-variable/noto-sans-jp | Auto-hébergement de la police japonaise |
| Cloudflare Images | Transformations d'images (conversion automatique AVIF/WebP) |
| Pagefind | Recherche plein texte pour sites statiques |

---

## Conclusion

Pour atteindre un score PageSpeed Insights mobile de 99, il est essentiel de suivre le principe « ne pas envoyer ce qui n'est pas nécessaire ». Stratégie de diffusion CSS, auto-hébergement des polices, optimisation des images, chargement différé des scripts externes — chaque mesure est simple individuellement, mais leur combinaison produit des résultats significatifs.

En parallèle, en menant simultanément les améliorations SEO, accessibilité et UX, on peut atteindre des scores élevés sur les 4 critères. Plutôt que de viser le 100, l'objectif réaliste est de maintenir un score stable au-dessus de 95.

Les détails de chaque thème sont accessibles via les cartes de liens ci-dessus. Pour l'approche d'amélioration et la mise en œuvre dans le code, consultez également le [flux de développement avec GitHub Copilot](/blog/tax-return-with-copilot/).
