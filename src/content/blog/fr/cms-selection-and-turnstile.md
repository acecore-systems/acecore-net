---
title: "Guide d'installation de Sveltia CMS"
description: "Guide pratique pour ajouter Sveltia CMS à un site Astro ou statique : backend GitHub, OAuth Worker, images, multilingue, PRs de CMS et retours d'expérience."
date: 2026-06-07T16:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'CMS', 'Astro', 'Cloudflare', 'セキュリティ']
image: /uploads/acecore-generated/blog-cms-selection-and-turnstile.webp
processFigure:
  title: Flux d'installation de Sveltia CMS
  description: L'admin, l'authentification, les contenus modifiables, les médias et le flux de PR doivent être conçus séparément.
  steps:
    - title: Ajouter l'admin
      description: Placer index.html et config.yml dans public/admin et charger Sveltia CMS.
      icon: i-lucide-layout
      accent: brand
    - title: Configurer GitHub
      description: Définir repo, branche, OAuth Worker et messages de commit avant l'édition.
      icon: i-lucide-git-branch
      accent: emerald
    - title: Limiter le périmètre éditable
      description: Exposer seulement le blog, les auteurs, les tags et les JSON source japonais nécessaires.
      icon: i-lucide-file-text
      accent: amber
    - title: Automatiser l'exploitation
      description: Relier la branche cms-content, les PRs de CMS et les tâches de traduction sans les mélanger au développement.
      icon: i-lucide-git-pull-request
      accent: slate
compareTable:
  title: Avant et après le CMS
  before:
    label: Markdown édité à la main
    items:
      - Seules les personnes à l'aise avec GitHub ou un éditeur peuvent mettre à jour
      - Les chemins d'image, IDs d'auteur et tags sont saisis à la main
      - Source japonaise et traductions peuvent être mélangées
      - Une preview peut lire main par erreur
  after:
    label: Édition avec Sveltia CMS
    items:
      - Markdown et JSON se modifient dans le navigateur
      - relation, image et select réduisent les valeurs invalides
      - Seuls les commits CMS déclenchent les tâches de traduction
      - runtime config change la branche CMS entre preview et production
callout:
  type: note
  title: Hypothèse de ce guide
  text: Sveltia CMS est une application d'administration côté navigateur qui édite Markdown et JSON via un backend Git. L'exemple vient du site Acecore, mais le modèle convient à de nombreux sites Astro.
checklist:
  title: Checklist de mise en place
  items:
    - text: Charger Sveltia CMS depuis public/admin/index.html
      checked: true
    - text: Définir backend GitHub et collections dans public/admin/config.yml
      checked: true
    - text: Utiliser un OAuth Worker pour l'édition multiutilisateur
      checked: true
    - text: Aligner media_folder et public_folder avec le dossier public d'Astro
      checked: true
    - text: Définir comment les commits CMS déclenchent traduction ou publication
      checked: true
faq:
  title: Questions fréquentes
  items:
    - question: Pour quels sites Sveltia CMS est-il adapté ?
      answer: Il convient aux sites statiques dont le contenu Markdown ou JSON vit dans le dépôt, comme Astro, Hugo ou VitePress. On ajoute un CMS sans base de données externe.
    - question: Un Personal Access Token GitHub suffit-il ?
      answer: Oui pour tester, mais pour plusieurs éditeurs ou des profils non techniques, un OAuth Worker est plus sûr et plus simple à expliquer.
    - question: Faut-il éditer toutes les langues dans le CMS ?
      answer: Pour une petite équipe, il est plus sûr d'éditer seulement la source japonaise dans le CMS et de mettre à jour les traductions par PR.
---

Sveltia CMS est utile quand on veut ajouter une interface d'édition à un site statique sans déplacer les contenus vers une base externe. Ce guide reprend la mise en place sur le site Astro d'Acecore et les corrections apparues ensuite dans les PRs et commits.

Le titre est volontairement simple : **Guide d'installation de Sveltia CMS**. L'objectif est d'aider quelqu'un à l'installer sur son propre site, pas de refaire un comparatif généraliste.

## Quand Sveltia CMS est pertinent

Sveltia CMS ne possède pas votre base de données et ne sert pas les contenus via une API séparée. C'est une application SPA qui modifie les fichiers du dépôt via un backend GitHub.

Il est pertinent si :

- le contenu est en Markdown ou JSON dans le dépôt
- les changements d'articles, auteurs, tags et textes de pages doivent rester visibles en diff Git
- vous ne voulez pas ajouter de base de données ni de service admin séparé
- les images peuvent être stockées dans `public/uploads`
- les modifications CMS doivent passer par Pull Request avant production

Pour des permissions éditoriales complexes, une planification avancée ou une grande médiathèque, un headless CMS complet sera plus adapté.

## Architecture générale

```text
public/admin/index.html
  -> charge @sveltia/cms depuis un CDN

public/admin/config.yml
  -> définit backend GitHub, collections et médias

workers/sveltia-cms-auth
  -> Cloudflare Worker pour GitHub OAuth

cms-content branch
  -> branche où le CMS enregistre les modifications

.github/workflows/cms-content-pr.yml
  -> ouvre une PR de cms-content vers main

.github/workflows/create-translation-prs.yml
  -> crée des tâches de traduction seulement pour les commits cms:
```

Installer la page admin n'est qu'un début. Authentification, médias, preview, traduction et merge strategy font partie du design.

## 1. Placer l'admin dans `public/admin`

Dans Astro, `public` est servi comme dossier statique. La documentation Sveltia CMS indique aussi `public` pour Astro, Next.js, Nuxt, Remix et VitePress.

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex,nofollow" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CMS</title>
  </head>
  <body>
    <script src="https://unpkg.com/@sveltia/cms@0.166.0/dist/sveltia-cms.js"></script>
  </body>
</html>
```

N'ajoutez pas de CSS externe ni `type="module"` sans besoin. Le bundle JavaScript contient déjà les styles nécessaires.

Acecore utilise l'initialisation manuelle pour changer la branche en preview.

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
    },
  },
})
```

## 2. Configurer le backend GitHub

Le minimum est `backend.name` et `backend.repo`. En production, il faut aussi décider la branche, OAuth et les messages de commit.

```yaml
backend:
  name: github
  repo: owner/repository
  branch: cms-content
  base_url: https://your-sveltia-cms-auth-worker.example.workers.dev
  auth_methods: [oauth]
  commit_messages:
    create: 'cms: create {{collection}} "{{slug}}"'
    update: 'cms: update {{collection}} "{{slug}}"'
    delete: 'cms: delete {{collection}} "{{slug}}"'
    uploadMedia: 'cms: upload "{{path}}"'
    deleteMedia: 'cms: delete media "{{path}}"'
```

Sur un site personnel, sauvegarder vers `main` peut suffire. Pour un site d'entreprise ou multilingue, une branche dédiée comme `cms-content` rend la revue plus sûre.

## 3. Ajouter un OAuth Worker

Un Personal Access Token suffit pour un test, mais pas pour une vraie équipe. Acecore utilise Sveltia CMS Authenticator sur Cloudflare Workers et le configure en `base_url`.

Le callback de l'application OAuth GitHub pointe vers `/callback` du Worker. Le Worker reçoit `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` et éventuellement `ALLOWED_DOMAINS`.

Ce n'est pas le rôle de Turnstile. OAuth protège la connexion au CMS ; Turnstile protège les formulaires ou APIs contre les bots.

## 4. Fixer le dossier média tôt

Sveltia CMS peut stocker les médias dans le dépôt. Pour Astro, la configuration pratique est :

```yaml
media_folder: public/uploads
public_folder: /uploads
```

Acecore a corrigé ce point plus tard dans la [PR #116](https://github.com/acecore-systems/acecore-net/pull/116). Il faut décider en même temps le chemin dans le dépôt et l'URL publique.

## 5. Séparer les collections

| collection | Cible                          | Politique                                              |
| ---------- | ------------------------------ | ------------------------------------------------------ |
| `blog`     | `src/content/blog/*.md`        | Éditer seulement les articles source japonais          |
| `authors`  | `src/content/authors/*.json`   | Éditer profils et noms localisés                       |
| `tags`     | `src/content/tags/*.json`      | Éditer tags et noms localisés                          |
| page text  | `src/i18n/source/ja/**/*.json` | Éditer les textes source japonais des pages et de l'UI |

N'exposez pas tous les Markdown traduits sans raison. Acecore garde le japonais comme source canonique et met à jour les traductions via le [pipeline GitHub Copilot](/fr/blog/copilot-translation-pipeline/).

## 6. Utiliser relation et select

Les tags doivent être choisis par relation, pas saisis librement.

```yaml
- name: tags
  label: Tags
  widget: relation
  collection: tags
  value_field: name
  display_fields: ['{{name}} ({{id}})']
  search_fields: [name, id]
  multiple: true
  required: false
```

Même logique pour auteurs, icônes et styles d'annonce. Un bon CMS empêche autant que possible les valeurs cassées.

## 7. Éditer les JSON source japonais

Les textes de pages fixes peuvent aussi être exposés. Acecore les centralise dans `src/i18n/source/ja/**/*.json`.

La leçon : ne pas tout ajouter d'un coup. `config.yml` grossit vite. Commencez par blog, auteurs, tags, annonces et pages qui changent souvent.

## 8. Les previews doivent lire la bonne branche

Si le CMS ouvert dans une preview Cloudflare Pages lit encore `main`, l'éditeur ne voit pas le même contenu que la preview. Acecore génère `public/admin/runtime-config.js` avant le build et injecte la branche courante.

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
    },
  },
})
```

## 9. Créer des PRs depuis une branche CMS

Enregistrer dans `cms-content` puis ouvrir une PR vers `main` garde la revue claire.

```yaml
on:
  push:
    branches:
      - cms-content
```

La méthode de merge compte. Les tâches de traduction dépendent de subjects comme `cms: create ...`. Si un squash les supprime, l'automatisation peut rater le changement. Pour les PRs CMS, préférez merge commit ou rebase merge.

## 10. Déclencher la traduction seulement pour les commits CMS

La [PR #98](https://github.com/acecore-systems/acecore-net/pull/98) a ajouté `--cms-only` afin que les tâches de traduction liées aux push ne se créent que pour les commits CMS.

```javascript
function isCmsCommitSubject(subject) {
  return /^cms: (create|update|delete) /.test(subject || '')
}
```

`cms:` est un contrat d'automatisation, pas un simple préfixe.

## 11. Donner son propre CSP à `/admin`

L'admin doit contacter le CDN, l'API GitHub, l'OAuth Worker et des blob URLs. Acecore sépare donc le CSP de `/admin/*` et marque cette zone en `noindex`.

## Séparer Turnstile

L'ancienne version mélangeait CMS et Cloudflare Turnstile. C'était confus.

Sveltia CMS concerne le backend GitHub, OAuth, les collections, médias et PRs. Turnstile concerne la protection anti-bot des formulaires ou APIs. Ce sont deux couches différentes.

## Leçons des PRs et commits

- Quand le CMS change, articles et liens internes doivent suivre.
- OAuth fait partie du vrai setup, pas d'une amélioration future.
- Les chemins médias doivent être fixés avant les uploads.
- `config.yml` doit grandir par étapes.
- `cms:` est un contrat pour les workflows.
- En preview, la branche lue par le CMS doit être claire.

## Point de départ minimal

```text
public/admin/index.html
public/admin/config.yml
public/admin/init.js
public/admin/runtime-config.js
```

Ajoutez ensuite relations auteurs et tags, images, JSON source, PRs automatiques de CMS et tâches de traduction.

## Références

- [Sveltia CMS Getting Started](https://sveltiacms.app/en/docs/start)
- [Sveltia CMS GitHub Backend](https://sveltiacms.app/en/docs/backends/github)
- [Sveltia CMS Internal Media Storage](https://sveltiacms.app/en/docs/media/internal)
- [Sveltia CMS Manual Initialization](https://sveltiacms.app/en/docs/api/initialization)
- [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth)

## Résumé

Sveltia CMS est facile à placer dans `public/admin`, mais une installation de production exige de définir branche, OAuth, dossiers médias, politique de langue source, workflow de traduction et stratégie de merge. Avec ces règles, un site Astro reste léger tout en gagnant un processus d'édition fiable.
