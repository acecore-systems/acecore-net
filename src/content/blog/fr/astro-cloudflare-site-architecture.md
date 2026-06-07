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

Quand on démarre avec Astro et Cloudflare Pages, des pages statiques rapides et sûres suffisent souvent.

Avec le temps, de nouveaux besoins arrivent : édition depuis le navigateur, pages localisées, orientation par chat IA, transmission du contexte au formulaire et commentaires.

Cet article est un index d'implémentation : il aide à décider dans quelle couche placer chaque fonction, dans quel ordre les ajouter et quel guide lire ensuite. L'exemple vient du site Acecore, mais le modèle s'applique à d'autres sites Astro + Cloudflare.

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

## Lire par objectif

Il n'est pas nécessaire de tout lire d'abord. Commencez par la fonction à ajouter.

| Objectif                                         | Lire d'abord                                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Modifier articles et images depuis le navigateur | [Guide d'installation de Sveltia CMS](/fr/blog/cms-selection-and-turnstile/)                     |
| Publier des pages multilingues indexables        | [Exploiter un blog multilingue avec Sveltia CMS](/fr/blog/copilot-translation-pipeline/)         |
| Guider les visiteurs avec le chat IA             | [Conception technique du chat IA de contact](/fr/blog/astro-ai-contact-chat/)                    |
| Rendre des liens sûrs dans les réponses IA       | [Rendu sécurisé des liens Markdown dans les réponses IA](/fr/blog/ai-chat-markdown-link-safety/) |
| Transmettre le contexte du service au formulaire | [Transmettre le contexte du CTA au formulaire](/fr/blog/service-cta-contact-prefill/)            |
| Ajouter des commentaires sans service externe    | [Commentaires de blog Astro avec Cloudflare seulement](/fr/blog/cloudflare-only-blog-comments/)  |

## Ordre d'implémentation

Pour un site similaire, l'ordre pratique est :

1. Stabiliser les pages statiques, le blog, RSS, sitemap et OGP avec Astro.
2. Ajouter Sveltia CMS pour modifier la source japonaise.
3. Générer les pages localisées en HTML statique.
4. Ajouter le guidage par chat IA et les CTA de services.
5. Verrouiller les liens Markdown, le prefill de formulaire, les Origin checks et les rate limits.
6. Ajouter les commentaires dans Cloudflare seulement quand ils deviennent nécessaires.

## Conclusion

Astro + Cloudflare permet d'étendre un site institutionnel sans perdre les avantages du statique.

Utilisez cette page comme point d'entrée et n'ajoutez que les éléments dont votre site a besoin, sans affaiblir la base statique.
