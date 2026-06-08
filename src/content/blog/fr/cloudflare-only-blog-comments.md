---
title: 'Ajouter des commentaires à un blog Astro avec Cloudflare uniquement'
description: "Retour d'expérience sur l'ajout de commentaires à un blog Astro sans service externe, avec Cloudflare Pages Functions, D1, Turnstile et Wrangler."
date: 2026-06-07T18:00
lastUpdated: 2026-06-07T00:00
author: gui
tags: ['技術', 'Cloudflare', 'Astro', 'セキュリティ', 'Webサイト']
image: /uploads/acecore-generated/blog-cloudflare-pages-security.webp
callout:
  type: tip
  title: Sans service externe de commentaires
  text: "Un site Astro statique peut gérer ses propres commentaires. Pages Functions fournit l'API, D1 stocke les données, Turnstile protège les envois et Wrangler versionne les bindings."
linkCards:
  - href: /fr/blog/cloudflare-pages-security/
    title: Sécurité avec Cloudflare Pages
    description: Headers de sécurité et diffusion statique avec Cloudflare Pages.
    icon: i-lucide-shield
  - href: /fr/blog/cms-selection-and-turnstile/
    title: Guide d'installation de Sveltia CMS
    description: CMS et composants Cloudflare utilisés sur le site.
    icon: i-lucide-badge-check
  - href: /fr/blog/astro-ai-contact-chat/
    title: Chat de contact IA sur Astro
    description: Un autre exemple d'API avec Pages Functions.
    icon: i-lucide-bot
faq:
  title: Questions fréquentes
  items:
    - question: Pourquoi ne pas utiliser un widget externe ?
      answer: "Parce que l'UI, les données, les scripts, la modération et la migration dépendent alors du service. Ici, tout reste dans le site et Cloudflare."
    - question: D1 suffit-il pour des commentaires ?
      answer: 'Pour lire par post_slug, trier par date, masquer avec deleted_at, limiter par client et détecter les doublons, D1 convient bien.'
    - question: Turnstile côté client suffit-il ?
      answer: "Non. La Pages Function doit vérifier le token avec Siteverify avant d'écrire dans D1."
---

Ajouter des commentaires à un site statique revient à ajouter de l'état.

Pour Acecore, nous n'avons pas utilisé de service externe de commentaires. Dans [PR #101](https://github.com/acecore-systems/acecore-net/pull/101), la fonctionnalité reste entièrement sur Cloudflare.

- Astro affiche l'interface.
- Cloudflare Pages Functions expose `/api/comments`.
- Cloudflare D1 stocke les commentaires.
- Cloudflare Turnstile protège les envois.
- `wrangler.jsonc` sépare preview et production.

Le point fort est clair : la zone de commentaires n'est pas un îlot tiers dans la page.

## Architecture

| Couche     | Fichier ou service                         |
| ---------- | ------------------------------------------ |
| UI         | `src/components/BlogComments.astro`        |
| Placement  | `src/views/BlogPostPage.astro`             |
| API        | `functions/api/comments.ts`                |
| Stockage   | Binding D1 `COMMENTS_DB`                   |
| Protection | Cloudflare Turnstile                       |
| Schéma     | `migrations/0001_create_blog_comments.sql` |

L'interface lit avec `GET /api/comments?slug=...&locale=...` et publie avec `POST /api/comments`.

La Function valide origin, payload, Turnstile, limites, doublons et contenu bloqué avant insertion.

## Pourquoi D1

Les commentaires demandent des requêtes simples mais relationnelles : filtrer par article, trier par date, masquer avec `deleted_at`, limiter par client et détecter les doublons.

D1 permet de le faire en SQL. Les lignes visibles sont celles où `deleted_at IS NULL`.

Les requêtes passent par des prepared statements et `bind()`, sans concaténer les entrées utilisateur dans le SQL.

## Wrangler comme contrat

Le binding `COMMENTS_DB` est défini dans `wrangler.jsonc`. Preview pointe vers `acecore-comments-preview`; production vers `acecore-comments-production`.

C'est important : une preview de Pull Request ne doit pas écrire dans la base de production.

La documentation Cloudflare Pages indique aussi que la configuration Wrangler devient la source de vérité du projet Pages.

## Turnstile côté serveur

Le widget visible dans le navigateur ne suffit pas.

Le token est envoyé à la Pages Function, puis validé via Cloudflare Siteverify avec `TURNSTILE_SECRET_KEY`.

Le hostname retourné est également vérifié pour éviter d'accepter un token émis depuis un domaine inattendu.

## Anti-spam

La première version est stricte :

- pas d'URL
- pas d'adresse e-mail
- pas de HTML
- pas de lien Markdown
- pas de répétitions excessives
- pas de termes promotionnels courants
- champ honeypot

Le rate limit existe en mémoire et dans D1. Le client est identifié par un hash salé, pas par une IP brute stockée telle quelle.

## SEO

Les commentaires sont chargés côté client et la section utilise `data-pagefind-ignore`. Ils ne sont pas indexés comme contenu principal.

Pour un blog d'entreprise, c'est un choix sain : l'article est éditorial, les commentaires sont interactifs.

## Résumé

Un service externe de commentaires est pratique, mais pas obligatoire.

Avec Cloudflare Pages, Pages Functions, D1, Turnstile et Wrangler suffisent pour une fonctionnalité légère et maîtrisée.

## Références

- [Cloudflare Pages: Configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Cloudflare Pages Functions: Bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare D1: Prepared statement methods](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [Cloudflare D1: Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Cloudflare Turnstile: Server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare Turnstile: Any Hostname](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/any-hostname/)
- [PR #101: Commentaires avec Cloudflare](https://github.com/acecore-systems/acecore-net/pull/101)
