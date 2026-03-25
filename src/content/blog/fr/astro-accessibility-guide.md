---
title: "Guide pratique pour rendre un site Astro conforme au WCAG AA"
description: "Présentation de toutes les étapes d'amélioration de l'accessibilité réalisées sur un site Astro + UnoCSS. Attributs aria, contraste, gestion du focus, validation de formulaires, compatibilité avec les lecteurs d'écran — toutes les mesures nécessaires pour la conformité WCAG AA."
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'アクセシビリティ']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: "L'accessibilité est une amélioration de l'UX pour tous"
  text: "L'accessibilité ne concerne pas uniquement les personnes en situation de handicap. La navigation au clavier, le contraste et l'affichage du focus contribuent directement à l'ergonomie pour tous les utilisateurs. C'est un investissement qui améliore la qualité globale du site."
processFigure:
  title: Démarche d'amélioration de l'accessibilité
  steps:
    - title: Audit automatisé
      description: Identification automatique des problèmes détectables avec axe DevTools et Lighthouse.
      icon: i-lucide-scan
    - title: Audit manuel
      description: Test réel avec la navigation au clavier et un lecteur d'écran.
      icon: i-lucide-hand
    - title: Corrections
      description: Ajout d'attributs aria, correction des contrastes, ajout de styles de focus.
      icon: i-lucide-wrench
    - title: Revérification
      description: Confirmation d'un score de 100 pour l'accessibilité PageSpeed.
      icon: i-lucide-check-circle
checklist:
  title: Checklist de conformité WCAG AA
  items:
    - text: Le ratio de contraste du texte est supérieur à 4.5:1 (3:1 pour les grands textes)
      checked: true
    - text: Tous les éléments interactifs ont un style focus-visible
      checked: true
    - text: Les icônes décoratives ont l'attribut aria-hidden="true"
      checked: true
    - text: Les liens externes comportent une notification pour les lecteurs d'écran
      checked: true
    - text: Les formulaires ont une validation en ligne avec aria-invalid
      checked: true
    - text: Les images ont des attributs width/height (prévention du CLS)
      checked: true
    - text: Les éléments de liste ont role="list" (correctif pour list-style:none)
      checked: true
faq:
  title: Questions fréquentes
  items:
    - question: Quelle est la différence entre axe DevTools et Lighthouse ?
      answer: "Lighthouse est un outil d'audit global incluant la performance et le SEO, ne vérifiant qu'une partie des critères d'accessibilité. axe DevTools est spécialisé dans l'accessibilité et effectue des vérifications plus détaillées avec davantage de règles. Il est recommandé d'utiliser les deux."
    - question: Faut-il ajouter des attributs aria à tous les éléments ?
      answer: "Non. Si la sémantique HTML est correcte, aria n'est pas nécessaire. Les attributs aria servent à compléter les informations que le HTML seul ne peut pas transmettre. Un usage excessif rend la lecture par les lecteurs d'écran trop verbeuse."
    - question: Un score de 100 en accessibilité PageSpeed signifie-t-il une conformité WCAG ?
      answer: "Un score de 100 ne garantit pas une conformité WCAG complète. Lighthouse a un nombre limité de critères vérifiés, et certains critères ne peuvent être vérifiés que manuellement (ordre logique de lecture, pertinence du texte alternatif, etc.). Les tests automatisés et manuels sont tous deux nécessaires."
---

## Introduction

L'« accessibilité » est souvent un sujet qu'on repousse à plus tard. Pourtant, en y travaillant concrètement, on réalise que l'amélioration du contraste, de la navigation au clavier et de l'affichage du focus contribue directement à l'ergonomie pour tous les utilisateurs.

Cet article présente les améliorations réalisées pour atteindre un score PageSpeed Accessibility de 100 sur un site Astro + UnoCSS, classées par catégorie.

---

## aria-hidden pour les icônes décoratives

Les icônes Iconify d'UnoCSS (`i-lucide-*`) sont souvent utilisées comme éléments décoratifs visuels, mais les lecteurs d'écran les annoncent comme « image » ou « image inconnue », ce qui crée de la confusion.

### Solution

Ajoutez `aria-hidden="true"` aux icônes purement décoratives.

```html
<span class="i-lucide-mail" aria-hidden="true"></span>
Contact
```

Cette correction a été appliquée à plus de 30 icônes sur l'ensemble du site. Attention aux icônes dans les composants comme StatBar, Callout, ServiceCard et ProcessFigure, souvent oubliées.

---

## Notification pour lecteur d'écran sur les liens externes

Les liens ouverts avec `target="_blank"` sont visuellement identifiables comme ouvrant un nouvel onglet, mais cette information n'est pas transmise aux utilisateurs de lecteurs d'écran.

### Solution

Ajoutez un texte supplémentaire visuellement masqué aux liens externes.

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  Example
  <span class="sr-only">(s'ouvre dans un nouvel onglet)</span>
</a>
```

Le plugin `rehype-external-links` permet d'ajouter automatiquement `target="_blank"` et `rel` aux liens externes dans le Markdown. Le texte de notification pour les lecteurs d'écran est ajouté côté template.

---

## Assurer un contraste suffisant

L'insuffisance de contraste est le problème le plus fréquemment signalé par PageSpeed Insights.

### Problèmes courants

Avec la palette de couleurs d'UnoCSS, `text-slate-400` sur fond blanc donne un ratio de contraste d'environ 3:1, ne satisfaisant pas le critère WCAG AA de 4.5:1.

### Solution

Passer de `text-slate-400` à `text-slate-500` (ratio de contraste de 4.6:1) permet de satisfaire le critère. Ce changement est particulièrement fréquent pour les textes auxiliaires comme les dates et les légendes — vérifiez l'ensemble du site.

---

## Styles focus-visible

Pour les utilisateurs naviguant au clavier, l'indicateur de focus est le seul repère visuel de leur position actuelle. Le WCAG 2.4.7 exige l'affichage du focus.

### Implémentation avec UnoCSS

Définissez un style de focus commun pour les boutons et les liens. La fonctionnalité de raccourcis d'UnoCSS permet de l'appliquer globalement à partir d'une seule définition.

```typescript
shortcuts: {
  'ac-btn': '... focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none',
}
```

`focus-visible` est une pseudo-classe qui n'affiche l'anneau que lors de la navigation au clavier, pas lors d'un clic souris. L'UX est meilleure qu'avec `focus`.

### Éléments souvent oubliés

- Boutons de copie
- Bouton de retour en haut
- Bouton de fermeture des annonces ancrées
- Bouton de fermeture des modales

---

## Soulignement des liens en ligne

PageSpeed peut signaler que « les liens ne sont identifiables que par la couleur ». Les utilisateurs ayant des troubles de la vision des couleurs ne peuvent pas distinguer les liens.

### Solution

Affichez le soulignement en permanence au lieu de ne l'afficher qu'au survol. L'unification via les raccourcis UnoCSS est recommandée.

```typescript
shortcuts: {
  'ac-link': 'underline decoration-brand-300 underline-offset-2 hover:decoration-brand-500 transition-colors',
}
```

---

## Accessibilité des formulaires

L'accessibilité est particulièrement importante dans les contextes de saisie utilisateur, comme les formulaires de contact.

### Validation en ligne

Affichez immédiatement les messages d'erreur sur les événements `blur` / `input`, en les associant aux attributs aria suivants :

- `aria-invalid="true"` — signale que la saisie est invalide
- `aria-describedby` — référence l'ID du message d'erreur

```html
<input
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<p id="email-error" role="alert">Veuillez saisir une adresse e-mail valide</p>
```

### Indication des champs obligatoires

Le marqueur visuel `*` seul est insuffisant. Ajoutez un texte complémentaire pour les lecteurs d'écran.

```html
<span aria-hidden="true">*</span>
<span class="sr-only">(obligatoire)</span>
```

---

## Attribut role des éléments figure

Définir `role="img"` sur les éléments `<figure>` masque les éléments enfants pour les lecteurs d'écran. Pour les composants contenant des icônes et du texte descriptif (InsightGrid, ProcessFigure, Timeline), changez pour `role="group"` afin de garder le contenu interne accessible.

---

## Attribut role des éléments de liste

Lorsque `list-style: none` est défini en CSS, un bug connu de VoiceOver dans Safari fait que les listes ne sont plus reconnues comme telles.

Ajoutez `role="list"` aux éléments `<ol>` / `<ul>` du fil d'Ariane, de la barre latérale et du pied de page. Vérifiez toutes les listes dont l'apparence a été personnalisée.

---

## Autres améliorations

### Attributs width/height des images

Les images sans `width` et `height` explicites causent un décalage de mise en page (CLS — Cumulative Layout Shift) lors du chargement. Spécifiez les dimensions pour toutes les images, y compris les avatars (32×32, 48×48, 64×64px) et les miniatures YouTube (480×360px).

### aria-live pour le slider Hero

Les sliders à défilement automatique ne transmettent pas les changements aux utilisateurs de lecteurs d'écran. Prévoyez une zone `aria-live="polite"` et notifiez par texte : « Diapositive 1 / 4 : ○○ ».

### aria-labelledby pour les dialog

Référencez l'ID de l'élément titre via `aria-labelledby` sur les éléments `<dialog>` pour que les lecteurs d'écran puissent annoncer l'objet de la modale.

### aria-current pour la pagination

Définissez `aria-current="page"` sur le numéro de page actuel pour indiquer aux lecteurs d'écran qu'il s'agit de la page en cours.

### Mise à jour de l'aria-label du bouton de copie

Lors de la copie réussie dans le presse-papiers, mettez dynamiquement à jour l'`aria-label` en « Copié » pour notifier le changement d'état aux lecteurs d'écran.

---

## Conclusion

Chaque amélioration de l'accessibilité est un petit changement en soi, mais leur accumulation améliore considérablement la qualité globale du site. Les trois mesures les plus efficaces ont été :

1. **Application globale de focus-visible** : amélioration radicale de la navigation au clavier
2. **Correction du ratio de contraste** : `text-slate-400` → `text-slate-500` suffit pour satisfaire le WCAG AA
3. **Notification SR pour les liens externes** : traitement automatique de tous les liens en combinaison avec `rehype-external-links`

Nous recommandons de commencer par scanner le site avec axe DevTools et de corriger d'abord les problèmes détectables automatiquement.

---

## Série d'articles associée

Cet article fait partie de la série « [Guide d'amélioration de la qualité d'un site Astro](/blog/website-improvement-batches/) ». Les améliorations de performance, SEO et UX sont présentées dans des articles dédiés.
