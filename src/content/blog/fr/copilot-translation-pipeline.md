---
title: "Comment gérer un blog en 9 langues en publiant un seul article en japonais"
description: "Un guide sur la mise à jour des articles uniquement en japonais dans Pages CMS et la génération automatique de traductions en japonais + 8 langues avec GitHub Actions et GitHub Copilot, y compris le build et la fusion automatique."
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: La conclusion en premier
  text: "Avec le site Acecore actuel, vous pouvez automatiser l'exploitation d'un blog en japonais + 8 langues en utilisant GitHub Actions et GitHub Copilot, avec les articles en japonais comme source de traduction."
processFigure:
  title: Flux de 1 article japonais vers une exploitation en 9 langues
  steps:
    - title: Mettre à jour la source en japonais
      description: Modifier uniquement l'article en japonais via Pages CMS ou Markdown et pousser vers main.
      icon: i-lucide-pencil-line
    - title: Créer automatiquement des issues de traduction
      description: GitHub Actions crée des issues avec le chemin source et les langues cibles intégrés.
      icon: i-lucide-ticket
    - title: Copilot crée des PRs de traduction
      description: À la réception de l'issue, génère les fichiers de traduction et ouvre un PR de traduction.
      icon: i-lucide-git-pull-request
    - title: Build, fusion et fermeture des issues
      description: Après un build réussi, la fusion automatique s'exécute et l'issue de traduction parent est automatiquement fermé.
      icon: i-lucide-check-check
compareTable:
  title: Comparaison entre exploitation manuelle et automatique
  before:
    label: Exploitation de traduction manuelle
    items:
      - Quelqu'un crée manuellement des tâches de traduction après la publication d'un article
      - Assigner une personne par langue
      - Les décisions de build et de fusion sont également manuelles
      - Les issues parents restent facilement ouverts
  after:
    label: Exploitation de traduction automatique
    items:
      - Un push de l'article en japonais déclenche tout
      - Automatiquement assigné à Copilot
      - Les PRs de traduction sont fusionnés automatiquement après un build réussi
      - Les issues parents sont également fermés automatiquement après la fusion
checklist:
  title: Prérequis avant de commencer
  items:
    - text: Structure de contenu utilisant le japonais comme source de traduction
    - text: Une règle de placement des fichiers de traduction comme src/content/blog/{locale}/{slug}.md
    - text: GitHub Actions avec permission d'écriture sur les issues
    - text: COPILOT_AGENT_TOKEN pouvant appeler l'API d'assignation de Copilot
    - text: Une commande de build stable comme npm run build
faq:
  title: Questions fréquentes
  items:
    - question: Si je pousse un article en japonais, des articles dans d'autres langues seront-ils créés automatiquement ?
      answer: "Oui. Le site Acecore actuel prend en charge 9 langues — ja, en, zh-cn, es, pt, fr, ko, de, ru — donc pousser un article en japonais déclenche automatiquement la création d'issues de traduction pour les 8 langues restantes, l'assignation à Copilot, la création de PRs de traduction, le build, la fusion automatique et la fermeture des issues. Même si les fichiers de traduction n'existent pas encore, chaque URL de langue peut être servie avec le japonais comme secours, donc vous pouvez publier d'abord et remplacer par des traductions réelles ensuite."
    - question: Pourquoi créer un issue plutôt que de créer directement un PR ?
      answer: "Parce que vous pouvez fixer le chemin source, les langues cibles et les conditions de traduction dans l'issue. Lorsqu'une différence apparaît ensuite, la ré-exécution, la vérification de l'historique et la récupération après échec deviennent beaucoup plus faciles."
    - question: La fusion automatique est-elle sûre ?
      answer: "La fusion automatique inconditionnelle est dangereuse. En la restreignant uniquement aux PRs de traduction et en exigeant que toutes les conditions suivantes soient remplies : créé par Copilot, titre commençant par [translation], build réussi et non brouillon, on peut la rendre assez sûre."
---

En bref, sur ce site, vous pouvez publier un article en japonais une fois via Pages CMS et avoir des articles de blog en japonais + 8 autres langues alignés séquentiellement. GitHub Actions et GitHub Copilot s'occupent de la création des issues de traduction, de la création des PRs de traduction, du build, de la fusion automatique et de la fermeture des issues parents.

Les opérations quotidiennes ne nécessitent que de travailler avec des articles en japonais et des informations sur les auteurs. Comme vous n'avez plus besoin de créer manuellement des tâches de traduction ou d'organiser les PRs à chaque fois, la charge de gestion d'un blog multilingue est considérablement réduite.

## Prérequis pour cette approche

Comme prérequis, cette approche suppose que vous disposez déjà de l'infrastructure suivante côté Astro.

- Routage en 9 langues (ja, en, zh-cn, es, pt, fr, ko, de, ru)
- Secours pour afficher le japonais sur les pages sans traduction
- Opérations pour mettre à jour les articles en japonais et les informations sur les auteurs depuis Pages CMS

Comment construire l'infrastructure elle-même est couvert dans [Faire supporter 9 langues à un site Astro 6 — Traduction automatique de 136 articles de blog et architecture multilingue](/blog/astro-i18n-blog-translation/). Cet article se concentre uniquement sur la façon de superposer les opérations de traduction automatique avec Copilot sur cette base.

## Ce que vous pouvez faire

Du côté des opérations, il y a normalement deux écrans avec lesquels vous interagissez. Cette fois, nous utilisons l'écran de Pages CMS tel quel, rendant immédiatement clair **où interagir dans les opérations quotidiennes**.

![Écran de liste de blog japonais de Pages CMS](/uploads/pagescms-blog-ja-live-20260329.png)

Le premier écran est la liste de blog japonais de Pages CMS. Ici, vous consultez les dates de publication et les auteurs tout en ajoutant et mettant à jour uniquement les articles en japonais. La clé est d'orienter les opérations vers **ne toucher que la source de traduction japonaise**, sans avoir à entrer dans l'écran d'édition de plusieurs langues à chaque fois.

![Écran du formulaire d'informations sur l'auteur de Pages CMS](/uploads/pagescms-authors-live-20260329.png)

Le deuxième écran est le formulaire d'informations sur l'auteur. En ne mettant à jour que les champs basés sur le japonais dans le CMS pour les données d'auteur et en laissant la traduction `i18n` au flux d'automatisation GitHub, la séparation des responsabilités opérationnelles devient assez nette.

## Quand cette approche fonctionne le mieux

Comme prémisse, cette approche est particulièrement efficace pour les équipes ou les sites comme les suivants.

- Veulent utiliser le japonais comme source de traduction
- Le blog est géré en Markdown
- Créer manuellement des tâches de traduction à chaque fois est fastidieux
- Sont prêts à faire confiance à l'IA pour la qualité de traduction dans une certaine mesure
- Mais veulent arrêter les PRs qui échouent au build ou restent comme brouillons

À l'inverse, si chaque langue dispose d'une structure d'édition complètement indépendante, une approche différente peut être plus appropriée.

## Étape 1. Fixer la source de traduction aux articles en japonais

La première chose à décider est "quel fichier utiliser comme source de traduction." Si cela est ambigu, l'automatisation se brise.

La "source de traduction" dans cet article signifie **le fichier japonais qui est édité en premier et sert de standard pour les articles et les données dérivées dans chaque langue**.

Dans cette configuration, les éléments suivants sont divisés en source de traduction et cible de traduction.

- Source de traduction des articles de blog : `src/content/blog/{slug}.md`
- Cible de traduction des articles de blog : `src/content/blog/{locale}/{slug}.md`
- Source de traduction des informations sur les auteurs : `src/data/authors.json`
- Cible de traduction des informations sur les auteurs : `i18n` dans `src/data/authors.json`

La structure de répertoires est plus facile à gérer si elle ressemble approximativement à ceci.

```text
src/content/blog/
  my-post.md
  another-post.md
  en/
    my-post.md
  zh-cn/
    my-post.md
  fr/
    my-post.md
```

La clé est d'**aligner le slug des fichiers de traduction avec l'article original en japonais**. Cela seul facilite l'identification automatique de la cible de traduction à partir du chemin source.

Dans ce repo, même si les fichiers de traduction n'existent pas encore, les URLs de langue elles-mêmes sont générées avec le japonais comme secours. Cela signifie que vous pouvez opérer avec "publier l'article japonais d'abord, puis laisser les PRs de traduction rattraper ensuite."

## Étape 2. Convertir les pushes d'articles en japonais en issues de traduction

L'étape suivante consiste à détecter les changements dans les articles en japonais avec GitHub Actions et à créer automatiquement des issues de traduction.

Au minimum, vous avez besoin des éléments suivants.

- Surveiller les pushes vers `main`
- Cibler uniquement `src/content/blog/*.md` et `src/data/authors.json`
- Mettre à jour un issue ouvert existant avec le même chemin source plutôt que d'en créer un nouveau
- Intégrer le chemin source comme marqueur dans le corps de l'issue

Par exemple, insérer un commentaire comme celui-ci dans le corps de l'issue permet une réutilisation dans l'automatisation en aval.

```md
<!-- translation-source:src/content/blog/my-post.md -->
<!-- translation-kind:blog-post -->
```

Le filtrage de base côté workflow ressemble à ceci.

```yaml
on:
  push:
    branches:
      - main
    paths:
      - src/content/blog/*.md
      - src/data/authors.json
```

Ce qui est important ici n'est pas de "créer des traductions directement" mais de **créer d'abord un issue**. En insérant une étape d'issue, vous pouvez fixer le chemin source, les langues cibles et les conditions de traduction sous une forme visible à la fois par les humains et par l'IA.

## Étape 3. Assigner automatiquement les issues de traduction à Copilot

Créer seulement un issue laisse encore du travail manuel, donc ici vous assignez automatiquement à Copilot.

Il y a deux choses à faire.

1. Ajouter `COPILOT_AGENT_TOKEN` aux secrets du dépôt
2. Appeler l'API d'assignation après la création de l'issue

Conceptuellement, vous patcher l'issue et définissez Copilot comme assignee.

```json
{
  "assignees": ["copilot-swe-agent[bot]"],
  "agent_assignment": {
    "target_repo": "OWNER/REPO",
    "base_branch": "main",
    "custom_instructions": "Translate the Japanese source article..."
  }
}
```

À ce stade, garder les `custom_instructions` séparées pour les articles vs. les informations sur les auteurs stabilise la précision. Spécifier que les informations sur les auteurs ne doivent toucher que `i18n` dans `src/data/authors.json`, et que les articles doivent créer un fichier du même nom dans `src/content/blog/{locale}/`, réduit les erreurs.

## Étape 4. Build des PRs de traduction et fusion automatique

Cette partie est plus sûre si vous n'en faites pas une automatisation inconditionnelle. La recommandation est de ne fusionner que les PRs qui satisfont toutes les conditions suivantes.

- Le PR a été créé par Copilot
- Le titre commence par `[translation]`
- Ciblant `main`
- Pas un brouillon
- Le build a réussi

Dans cette configuration, c'est divisé en deux étapes.

1. `Translation PR Build`
2. `Merge Translation PR`

Quand un PR devient prêt pour révision, construire son head, et si réussi, effectuer un squash merge. Comme cela ne dépend pas de la protection de branche de GitHub, c'est facile à gérer même pour les petits repos.

### Conditions à restreindre pour la fusion automatique

Lors de l'ajout de la fusion automatique, les conditions suivantes sont les minimums recommandés.

- Exclure tout sauf les PRs de traduction
- Arrêter si le build échoue
- Arrêter pendant qu'il est en brouillon
- Exclure les PRs créés par quiconque autre que Copilot

Avec ces quatre en place, vous pouvez en grande partie éviter les accidents où les PRs de développement normaux sont également impliqués.

## Étape 5. Fermer automatiquement les issues de traduction parents après la fusion

La dernière chose à ajouter qui rend les opérations propres est la fermeture automatique des issues parents.

La méthode est simple — pour les PRs de traduction fusionnés, faites ce qui suit.

1. Obtenir les fichiers modifiés dans le PR
2. Lire le chemin source dans le corps du PR
3. Rechercher les issues ouverts correspondant au marqueur `translation-source:`
4. Ajouter un commentaire et fermer

La raison de regarder également le chemin source dans le corps du PR est que, selon la situation, regarder uniquement les fichiers modifiés des PRs créés par Copilot peut rendre la recherche inverse de la source faible. **Utiliser à la fois les fichiers modifiés et le corps du PR** donne des résultats stables.

## Notes supplémentaires

### Orienter le texte des PRs et issues de Copilot vers le japonais

Si vous souhaitez stabiliser le langage de sortie de Copilot côté GitHub, l'utilisation d'instructions à l'échelle du dépôt est l'approche la plus directe.

Placez simplement un `.github/copilot-instructions.md`.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

Avec seulement ce fichier, la langue par défaut et le contexte lorsque l'agent de codage Copilot crée des issues et des PRs se stabilisent considérablement.

## Résumé

La clé de cette configuration est de transformer la traduction de "quelque chose que les gens demandent à chaque fois" en **un processus de routine dépendant du push de la source japonaise**.

Voici le flux une fois de plus.

1. Écrire uniquement l'article en japonais
2. Le push crée automatiquement un issue de traduction
3. Assigner automatiquement à Copilot
4. Construire le PR de traduction et fusionner automatiquement
5. Fermer automatiquement l'issue parent également

Une fois que vous avez cela en place, la sensation opérationnelle est assez directe. **Il suffit de pousser un article en japonais, et les articles dans d'autres langues seront complétés en séquence côté GitHub**.

Bien sûr, en pratique le flux asynchrone de création d'issues, d'exécution de Copilot, de création de PRs, de build et de fusion prend du temps, donc tout ne se passe pas "instantanément." Cependant, le personnel des opérations n'a plus besoin de créer manuellement des tâches de traduction à chaque fois ou d'oublier de fermer les PRs.

Cet article lui-même est structuré pour pouvoir être alimenté dans ce flux avec la version japonaise comme base. Si vous exploitez en continu un site multilingue, commencer avec ce niveau d'automatisation est probablement tout à fait approprié.
