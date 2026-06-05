---
title: 'Comment gérer un blog en 9 langues en publiant un seul article en japonais'
description: "Un guide du flux de travail qui génère automatiquement des articles traduits en japonais + 8 langues, exécute des compilations et gère la fusion automatique — tout cela déclenché simplement par la mise à jour d'un article en japonais dans Pages CMS via GitHub Actions et GitHub Copilot."
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: Conclusion d'abord
  text: "Avec le site actuel d'Acecore, vous pouvez automatiser la gestion d'un blog en japonais + 8 langues en utilisant GitHub Actions et GitHub Copilot, en traitant les articles en japonais comme la source canonique."
processFigure:
  title: Le flux d'1 article en japonais vers une exploitation en 9 langues
  steps:
    - title: Mettre à jour la source en japonais
      description: Modifiez uniquement l'article en japonais via Pages CMS ou Markdown et poussez-le vers main.
      icon: i-lucide-pencil-line
    - title: Créer directement une tâche de PR de traduction
      description: GitHub Actions crée une tâche Copilot avec le chemin source et les langues cibles intégrés.
      icon: i-lucide-git-branch
    - title: Copilot crée des PRs de traduction
      description: En recevant la tâche, Copilot génère les fichiers de traduction et ouvre un PR de traduction.
      icon: i-lucide-git-pull-request
    - title: Compiler et fusionner automatiquement
      description: Après une compilation réussie, le PR de traduction qui remplit toutes les conditions est fusionné automatiquement.
      icon: i-lucide-check-check
compareTable:
  title: Flux de travail de traduction manuel vs. automatisé
  before:
    label: Flux de travail de traduction manuel
    items:
      - Quelqu'un crée manuellement des tâches de traduction après la publication d'un article
      - Les responsables sont assignés par langue
      - Les compilations et les décisions de fusion sont gérées par des personnes
      - Les tâches en double et le nettoyage des PRs ont tendance à s'accumuler
  after:
    label: Flux de travail de traduction automatisé
    items:
      - Un push vers l'article en japonais déclenche l'ensemble du flux
      - Une tâche de PR de traduction Copilot est créée directement
      - Les PRs de traduction sont fusionnés automatiquement après une compilation réussie
      - La création en double est évitée grâce à un marqueur dans le corps du PR
checklist:
  title: Ce dont vous avez besoin avant de commencer
  items:
    - text: Une structure de contenu avec le japonais comme source de traduction
    - text: Une règle de disposition des fichiers de traduction comme src/content/blog/{locale}/{slug}.md
    - text: GitHub Actions avec permission de lecture sur les pull requests
    - text: Un COPILOT_AGENT_TOKEN capable d'appeler l'API de l'agent de codage Copilot
    - text: Une commande de compilation stable comme npm run build
faq:
  title: Questions fréquentes
  items:
    - question: En poussant un article en japonais, des articles dans d'autres langues seront-ils créés automatiquement?
      answer: "Oui. Le site actuel d'Acecore prend en charge 9 langues — `ja`, `en`, `zh-cn`, `es`, `pt`, `fr`, `ko`, `de`, `ru` — donc pousser un article en japonais peut déclencher la création de tâches de PR de traduction Copilot pour les 8 langues restantes, la création de PRs de traduction, la compilation et la fusion automatique. Même sans fichiers de traduction, chaque URL de langue est servie avec un fallback en japonais, vous pouvez donc publier d'abord et remplacer par de vraies traductions plus tard."
    - question: Pourquoi créer une tâche de PR directement sans passer par un issue?
      answer: "Comme le résultat du travail de traduction est un PR, fixer le chemin source, la langue cible et les conditions de traduction directement dans l'énoncé du problème de la tâche Copilot et le marqueur du corps du PR rend le flux plus court. En recherchant les PRs ouverts avec le marqueur, vous pouvez également éviter la création en double pour le même chemin source."
    - question: La fusion automatique n'est-elle pas risquée?
      answer: 'La fusion automatique inconditionnelle est risquée. En la limitant uniquement aux PRs de traduction — en exigeant que Copilot ait créé le PR, que le titre commence par [translation], que la compilation ait réussi et que ce ne soit pas un brouillon — vous pouvez la maintenir de manière assez sûre.'
---

Pour aller droit au but : avec ce site, publier un seul article en japonais dans Pages CMS est suffisant pour avoir éventuellement cet article disponible en japonais plus 8 autres langues. GitHub Actions et GitHub Copilot s'occupent de la création des tâches de PR de traduction, de la création des PRs de traduction, de la compilation et de la fusion automatique.

L'opérateur n'a besoin de gérer que les articles en japonais et les informations sur les auteurs au quotidien. Comme il n'est plus nécessaire de soumettre manuellement des tâches de traduction ou de trier les PRs à chaque fois, cela réduit considérablement la charge de gestion d'un blog multilingue.

## Prérequis pour cette approche

Cette approche suppose que l'infrastructure suivante est déjà en place du côté d'Astro.

- Routage en 9 langues (ja, en, zh-cn, es, pt, fr, ko, de, ru)
- Un fallback qui sert le contenu en japonais pour les pages sans traductions
- Une configuration opérationnelle où les articles en japonais et les informations sur les auteurs peuvent être mis à jour via Pages CMS

Pour savoir comment configurer cette infrastructure, voir [Rendre un site Astro 6 compatible avec 9 langues — Traduction automatique de 168 articles de blog et architecture multilingue](/blog/astro-i18n-blog-translation/). Cet article se concentre uniquement sur la façon de superposer le flux de travail de traduction automatique de Copilot sur cette base.

## Ce que cela permet

Du point de vue de l'opérateur, il n'y a que 2 écrans avec lesquels vous interagissez régulièrement. Dans cet article, nous utilisons les écrans de Pages CMS tels quels, en précisant immédiatement **quels écrans sont utilisés dans les opérations quotidiennes**.

![Écran de la liste de blog en japonais de Pages CMS](/uploads/pagescms-blog-ja-live-20260329.png)

Le premier écran est la liste de blog en japonais de Pages CMS. Ici, vous pouvez voir les dates de publication et les informations sur les auteurs tout en ajoutant ou mettant à jour uniquement les articles en japonais. La clé est de rester en mode "toucher uniquement le japonais source", sans avoir à entrer dans les écrans d'édition de chaque langue à chaque fois.

![Écran du formulaire d'informations sur l'auteur de Pages CMS](/uploads/pagescms-authors-live-20260329.png)

Le deuxième écran est le formulaire d'informations sur l'auteur. En mettant à jour uniquement les champs de base en japonais dans le CMS pour les données d'auteur, et en laissant le flux automatisé de GitHub gérer le `i18n` pour les traductions, la séparation des responsabilités opérationnelles devient assez propre.

## Cas où cette approche fonctionne le mieux

Comme prérequis, c'est particulièrement efficace pour les équipes et les sites comme les suivants.

- Vous voulez que le japonais soit la source de traduction
- Votre blog est géré en Markdown
- Soumettre manuellement des tâches de traduction à chaque fois est fastidieux
- Vous êtes à l'aise avec le fait de laisser l'IA gérer un bon degré de qualité de traduction
- Mais vous voulez arrêter les PRs qui échouent à la compilation ou qui restent des brouillons

À l'inverse, si vous avez une configuration éditoriale complètement indépendante par langue, un flux de travail différent peut être plus adapté.

## Étape 1. Fixer les articles en japonais comme source de traduction

La première chose à décider est "quel fichier est la source de traduction." L'ambiguïté ici cassera votre automatisation.

La "source de traduction" dans cet article désigne le **fichier en japonais qui est édité en premier et sert de base pour les articles et les données dérivées dans chaque langue**.

Dans cette configuration, la source et la cible sont divisées comme suit.

- Source de l'article de blog : `src/content/blog/{slug}.md`
- Cible de l'article de blog : `src/content/blog/{locale}/{slug}.md`
- Source des informations sur l'auteur : `src/content/authors/{authorId}.json`
- Cible des informations sur l'auteur : le champ `i18n` dans `src/content/authors/{authorId}.json`
- Source de la définition de l'étiquette : `src/content/tags/{tagId}.json`
- Cible de la définition de l'étiquette : le champ `i18n` dans `src/content/tags/{tagId}.json`

Une structure de répertoire approximativement comme celle-ci est facile à gérer.

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

La clé est de **garder le slug du fichier de traduction aligné avec le slug de l'article source en japonais**. Cela seul facilite l'identification automatique de la cible de traduction à partir du chemin source.

Dans ce repo, même lorsque les fichiers de traduction n'existent pas encore, l'URL de chaque langue est toujours générée en utilisant un fallback en japonais. Cela signifie que vous pouvez opérer en mode "publier d'abord l'article en japonais, et laisser les PRs de traduction rattraper leur retard ensuite".

## Étape 2. Convertir les pushs d'articles en japonais en tâches de PR de traduction

La prochaine étape est d'utiliser GitHub Actions pour détecter les changements dans les articles en japonais et créer directement des tâches de PR de traduction Copilot.

Les exigences minimales sont :

- Surveiller les pushs vers `main`
- Créer des tâches automatiquement uniquement pour `src/content/blog/*.md`
- Créer des tâches uniquement lorsque le corps de l'article change, pas seulement le frontmatter
- Si un PR ouvert avec le même marqueur de chemin source existe, ne pas créer de tâche en double
- Intégrer le chemin source comme marqueur dans le corps du PR de traduction

Les informations sur les auteurs et les définitions des étiquettes sont des cibles de traduction, mais ne pas créer de tâches automatiquement lors des pushs normaux. Les exécuter uniquement via `workflow_dispatch` lorsque c'est explicitement nécessaire évite que des tâches inutiles ne s'accumulent.

Par exemple, inclure des commentaires comme celui-ci dans le corps du PR de traduction le rend réutilisable dans l'automatisation en aval.

```md
<!-- translation-source:src/content/blog/my-post.md -->
<!-- translation-kind:blog-post -->
```

Le filtrage de base du côté du workflow ressemble à ceci.

```yaml
on:
  push:
    branches:
      - main
    paths:
      - src/content/blog/*.md
```

De plus, en comparant uniquement le corps Markdown pour décider quand créer des tâches de traduction, vous pouvez éviter de générer accidentellement une avalanche de tâches à partir de petits ajustements comme la mise à jour d'une date de publication ou d'une étiquette.

## Étape 3. Créer des tâches de PR via l'API de l'agent de codage Copilot

La tâche est créée directement en utilisant l'API de l'agent de codage Copilot — pas via la création d'issue.

Il y a 2 choses à faire.

1. Ajouter `COPILOT_AGENT_TOKEN` comme secret du référentiel
2. Appeler l'API de tâche de job après avoir détecté un changement

Conceptuellement, vous appelez le point de terminaison de création de tâche avec les paramètres appropriés.

```json
{
  "title": "[translation] Translate my-post.md",
  "problem_statement": "Translate the Japanese source article...",
  "event_type": "copilot_task"
}
```

À ce stade, gardez la création automatique régulière limitée uniquement aux articles, et exécutez les informations sur les auteurs et les définitions des étiquettes uniquement via dispatch manuel lorsque c'est nécessaire, pour maintenir des opérations stables. Indiquer explicitement les règles — champs `i18n` dans `src/content/authors/{authorId}.json` pour les informations sur les auteurs, `i18n.name` dans `src/content/tags/{tagId}.json` pour les définitions des étiquettes, et fichiers de même nom sous `src/content/blog/{locale}/` pour les articles — réduit les erreurs.

## Étape 4. Compiler les PRs de traduction et les fusionner automatiquement

L'automatisation inconditionnelle n'est pas sûre ici. La recommandation est de rendre uniquement les PRs qui satisfont toutes les conditions suivantes éligibles à la fusion.

- Le PR a été créé par Copilot
- Le titre commence par `[translation]`
- Il cible `main`
- Ce n'est pas un brouillon
- La compilation a réussi

Dans cette configuration, le processus est divisé en 2 étapes.

1. `Translation PR Build`
2. `Merge Translation PR`

Le head du PR est compilé lorsqu'il est prêt pour la révision, et s'il réussit, il est immédiatement fusionné par squash. Comme cela ne dépend pas de la protection des branches de GitHub, c'est facile à gérer même dans les petits repos.

### Conditions à imposer pour la fusion automatique

Lors de l'ajout de la fusion automatique, voici les conditions minimales recommandées.

- Exclure tout ce qui n'est pas un PR de traduction
- Arrêter en cas d'échec de compilation
- Arrêter tant que c'est un brouillon
- Exclure les PRs non créés par Copilot

Avec ces 4 conditions en place, vous pouvez largement éviter l'accident d'attraper des PRs de développement normal dans le filet de fusion automatique.

## Étape 5. Éviter les doublons avec les marqueurs de corps de PR

La dernière pièce qui maintient les opérations propres est la prévention des doublons avant de créer une tâche de traduction.

L'approche est simple : avant de créer une tâche de PR de traduction, faites ce qui suit.

1. Rechercher les PRs ouverts qui contiennent le marqueur `translation-source:` dans leur corps
2. Si un PR correspondant existe, ignorer et ne pas créer de tâche en double
3. Sinon, procéder à la création de la tâche de PR de traduction

La raison de rechercher le marqueur dans le corps du PR est que se fier uniquement au titre peut parfois rendre la déduplication peu fiable. **Utiliser un marqueur unique dans le corps du PR** maintient la stabilité et garantit qu'une seule tâche de traduction est créée par article.

## Notes

### Orienter la langue des PRs Copilot vers le japonais

Si vous voulez stabiliser la langue de sortie de Copilot du côté de GitHub, utiliser des instructions au niveau du référentiel est l'approche la plus directe.

Cela signifie placer `.github/copilot-instructions.md`.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

Avec juste ce fichier en place, la langue par défaut et le contexte lorsque l'agent de codage Copilot crée des PRs devient considérablement plus stable.

## Résumé

Le cœur de cette configuration est de transformer la traduction de "quelque chose que les humains demandent à chaque fois" en **un processus de routine subordonné aux pushs de sources en japonais**.

Voici à nouveau le flux.

1. Écrire uniquement l'article en japonais
2. Un push crée directement une tâche de PR de traduction Copilot
3. Copilot crée le PR de traduction
4. Compiler le PR de traduction et le fusionner automatiquement
5. Éviter les doublons grâce aux marqueurs dans le corps du PR

Une fois que tout cela est pleinement assemblé, la sensation du côté de l'opérateur est assez naturelle. **Une fois que vous poussez l'article en japonais, les articles dans d'autres langues sont créés un par un du côté de GitHub**.

Bien sûr, en pratique, cela passe par des étapes asynchrones — création de tâches de PR, exécution de Copilot, création de PRs, compilation et fusion — donc tout ne se passe pas "instantanément". Mais l'opérateur n'a plus besoin de soumettre manuellement des tâches de traduction ou d'oublier de fermer des PRs à chaque fois.

Cet article lui-même est structuré de sorte que la version en japonais puisse être alimentée dans ce flux comme point de départ. Si vous gérez un site multilingue en continu, commencer avec environ ce niveau d'automatisation est probablement le plus approprié.
