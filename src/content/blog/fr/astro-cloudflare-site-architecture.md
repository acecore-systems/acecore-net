---
title: 'Concevoir un site Astro + Cloudflare qui grandit fonctionnalité par fonctionnalité'
description: 'Comment nous avons combiné Astro et Cloudflare Pages avec un chat IA, Sveltia CMS, un blog multilingue, des CTA de services, un rendu Markdown sécurisé et des commentaires sans service externe.'
date: 2026-06-07T19:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'Astro', 'Cloudflare', 'Webサイト', 'AI', 'CMS']
image: /uploads/acecore-generated/work-acecore-net-website.webp
callout:
  type: tip
  title: Définir les limites avant d'ajouter des fonctions
  text: 'Chat IA, CMS, localisation et commentaires sont utiles, mais ils ont besoin de limites claires dans le même site. Astro génère le HTML statique, Cloudflare livre le site et traite les petites API, GitHub garde les changements vérifiables.'
processFigure:
  eyebrow: Site Architecture
  title: Couches d'extension du site
  description: Garder le site statique par défaut et ajouter du dynamique seulement où c'est nécessaire.
  variant: inline
  steps:
    - title: Livrer
      description: Générer le HTML avec Astro et le servir sur Cloudflare Pages.
      icon: i-lucide-rocket
      accent: brand
    - title: Éditer
      description: Modifier la source japonaise dans Sveltia CMS et revoir par PR.
      icon: i-lucide-file-pen-line
      accent: emerald
    - title: Traduire
      description: Garder les traductions dans des PR plutôt que dans toute l'interface CMS.
      icon: i-lucide-languages
      accent: amber
    - title: Guider
      description: Utiliser le chat IA et les CTA de services pour orienter vers le bon formulaire.
      icon: i-lucide-route
      accent: slate
linkCards:
  - href: /fr/blog/astro-ai-contact-chat/
    title: Conception technique du chat IA de contact
    description: Frontières API et contrôle des réponses avec les informations du site.
    icon: i-lucide-bot
  - href: /fr/blog/cms-selection-and-turnstile/
    title: Guide d'installation de Sveltia CMS
    description: CMS, GitHub backend, OAuth et exploitation par PR pour un site statique.
    icon: i-lucide-badge-check
  - href: /fr/blog/copilot-translation-pipeline/
    title: Exploiter un blog multilingue avec Sveltia CMS
    description: Publier des pages statiques localisées au lieu d'une traduction uniquement en UI.
    icon: i-lucide-languages
  - href: /fr/blog/service-cta-contact-prefill/
    title: Transmettre le contexte du CTA au formulaire
    description: Conserver le service consulté dans la catégorie et le sujet du formulaire.
    icon: i-lucide-route
  - href: /fr/blog/ai-chat-markdown-link-safety/
    title: Rendu sécurisé des liens Markdown de l'IA
    description: Rendre seulement les liens autorisés sans traiter la sortie IA comme du HTML fiable.
    icon: i-lucide-shield-check
  - href: /fr/blog/cloudflare-only-blog-comments/
    title: Commentaires de blog avec Cloudflare seulement
    description: Commentaires sans service externe, avec Pages Functions, D1 et Turnstile.
    icon: i-lucide-message-square-text
---

Les derniers articles ont traité le chat IA de contact, Sveltia CMS, la publication multilingue, les CTA de services, le rendu Markdown sécurisé et les commentaires réalisés uniquement avec Cloudflare.

Il manquait l'article qui relie tout.

## Résumé

L'architecture sépare les rôles :

| Couche      | Rôle                                     |
| ----------- | ---------------------------------------- |
| Astro       | Pages, blog, OGP, RSS, sitemap et UI     |
| Cloudflare  | Pages, Pages Functions, D1 et Turnstile  |
| GitHub      | PR, diffs CMS, traductions et historique |
| Sveltia CMS | Source japonaise, auteurs, tags, images  |
| OpenAI API  | Réponses du chat de contact              |
| Pagefind    | Index de recherche pour HTML revu        |

Ce qui peut être statique reste statique. Le dynamique passe par de petites API.

## Pourquoi un article hub

Il existait déjà des articles sur la performance, le SEO, l'accessibilité, l'i18n et la refonte du site. Ils ne reliaient pas les fonctionnalités récentes.

Ce texte sert de carte d'entrée.

## Petites API sur Cloudflare

Le chat IA et les commentaires suivent le même modèle.

Astro rend l'interface. Pages Functions gère la frontière API. Les secrets, bindings D1, Turnstile, Origin checks et rate limits restent côté serveur.

## CMS comme surface d'édition

Sveltia CMS n'est pas une base de données runtime. Il crée des changements Git.

Le contenu japonais, les auteurs, tags, images et JSON passent par PR, build et review.

## Traduction comme contenu statique

La localisation n'est pas une traduction de l'interface au moment de l'affichage.

Chaque langue a sa propre URL, son title, sa description, ses métadonnées OGP, JSON-LD, RSS, sitemap et hreflang.

## Canaux de contact séparés

Le chat IA aide les visiteurs qui hésitent. Le CTA de service conserve le contexte. Le formulaire enregistre la demande formelle.

Chaque canal a son rôle.

## La sortie IA n'est pas du HTML fiable

Les liens Markdown de l'IA sont traités comme du texte jusqu'à validation.

Seuls les liens autorisés par allowlist deviennent des éléments DOM sûrs.

## Commentaires dans Cloudflare

Les commentaires ne reposent pas sur un widget externe.

Pages Functions reçoit GET/POST, D1 stocke les commentaires et Turnstile protège les envois.

## Ordre de lecture conseillé

1. [Guide d'installation de Sveltia CMS](/fr/blog/cms-selection-and-turnstile/)
2. [Exploiter un blog multilingue avec Sveltia CMS](/fr/blog/copilot-translation-pipeline/)
3. [Conception technique du chat IA de contact](/fr/blog/astro-ai-contact-chat/)
4. [Rendu sécurisé des liens Markdown dans les réponses IA](/fr/blog/ai-chat-markdown-link-safety/)
5. [Transmettre le contexte du CTA au formulaire](/fr/blog/service-cta-contact-prefill/)
6. [Commentaires de blog Astro avec Cloudflare seulement](/fr/blog/cloudflare-only-blog-comments/)

## Conclusion

Astro + Cloudflare permet d'étendre un site institutionnel sans perdre les avantages du statique.

Les articles détaillés expliquent chaque fonctionnalité. Cet article explique pourquoi elles forment une seule architecture.
