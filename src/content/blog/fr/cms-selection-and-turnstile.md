---
title: 'Chronique du choix d''un CMS headless — Pourquoi Pages CMS et la protection anti-bot avec Turnstile'
description: "Retour sur l'évaluation comparative de Keystatic, Sveltia CMS et Pages CMS, le choix de Pages CMS, et l'implémentation de la protection anti-spam du formulaire de contact avec Cloudflare Turnstile."
date: 2026-03-15
author: gui
tags: ['技術', 'CMS', 'セキュリティ']
image: https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&h=400&fit=crop&q=80
compareTable:
  title: Comparaison des CMS
  before:
    label: Keystatic / Sveltia CMS
    items:
      - Keystatic nécessite un runtime côté serveur
      - Sveltia CMS est riche en fonctionnalités mais le coût d'apprentissage est élevé
      - Les deux sont surdimensionnés pour une architecture Astro + Pages
      - La mise en place prend du temps
  after:
    label: Pages CMS
    items:
      - Édition directe des fichiers Markdown du dépôt GitHub
      - Éditeur GUI permettant aux non-développeurs de mettre à jour les articles
      - Pas de serveur nécessaire, parfaitement compatible avec Pages
      - Configuration complète avec un seul fichier .pages.yml
callout:
  type: tip
  title: Avantages de Turnstile
  text: Contrairement à reCAPTCHA, Cloudflare Turnstile ne demande pas aux utilisateurs de sélectionner des images. La vérification s'effectue automatiquement en arrière-plan, permettant une protection anti-bot sans dégrader l'expérience utilisateur.
faq:
  title: Questions fréquentes
  items:
    - question: Qu'est-ce que Pages CMS ?
      answer: C'est un CMS léger qui permet d'éditer directement les fichiers Markdown d'un dépôt GitHub via une interface graphique. Sans serveur et configurable avec un simple fichier .pages.yml, il permet même aux non-développeurs de mettre à jour les articles.
    - question: Quelle est la différence entre Cloudflare Turnstile et reCAPTCHA ?
      answer: Turnstile ne demande pas aux utilisateurs de sélectionner des images et effectue la vérification automatiquement en arrière-plan. Il respecte la vie privée et est disponible gratuitement.
    - question: Comment traiter les soumissions de formulaires sur un site statique ?
      answer: En utilisant des services de formulaires externes comme ssgform.com ou Formspree, vous pouvez traiter les soumissions de formulaires sans code côté serveur. La combinaison avec Turnstile permet également la protection anti-spam.
---

Le choix d'un CMS est une décision discrète mais importante. Cet article présente le processus d'évaluation de 3 CMS et l'implémentation de la protection anti-bot avec Cloudflare Turnstile sur le formulaire de contact.

## Processus de sélection du CMS

Lors de l'introduction d'un CMS sur un site statique construit avec Astro, nous avons retenu les 3 candidats suivants.

### Keystatic : premier candidat

Keystatic nous intéressait en tant que CMS type-safe. L'intégration avec Astro est officiellement supportée. Cependant, le fonctionnement en mode local nécessite un runtime côté serveur, ce qui pose des problèmes de compatibilité avec le déploiement statique sur Cloudflare Pages.

### Sveltia CMS : riche mais lourd

Sveltia CMS est un fork de Decap CMS (anciennement Netlify CMS), attrayant par son interface moderne et ses nombreuses fonctionnalités. Cependant, pour la taille actuelle du projet (quelques articles de blog + quelques pages fixes), il s'avère surdimensionné. Nous prévoyons de le réévaluer lorsque le contenu augmentera.

### Pages CMS : choix adopté

[Pages CMS](https://pagescms.org/) est un CMS léger qui édite directement les fichiers Markdown du dépôt GitHub.

Les raisons déterminantes du choix :

- **Installation simple** : il suffit d'ajouter un seul fichier `.pages.yml`
- **Sans serveur** : fonctionne via l'API GitHub, aucune infrastructure supplémentaire nécessaire
- **Natif Markdown** : s'intègre directement avec les collections de contenu d'Astro
- **Éditeur GUI** : les membres non-développeurs de l'équipe peuvent éditer les articles depuis leur navigateur

```yaml
# .pages.yml
content:
  - name: blog
    label: Blog
    path: src/content/blog
    type: collection
    fields:
      - name: title
        label: Titre
        type: string
      - name: date
        label: Date de publication
        type: date
      - name: tags
        label: Tags
        type: string
        list: true
```

## Introduction de Cloudflare Turnstile

Cloudflare Turnstile a été introduit comme mesure anti-spam pour le formulaire de contact.

### Pourquoi Turnstile plutôt que reCAPTCHA

Google reCAPTCHA v2 force les utilisateurs à sélectionner des images, et la v3 basée sur les scores pose des problèmes de confidentialité. Cloudflare Turnstile excelle sur les points suivants :

| Critère | reCAPTCHA v2 | reCAPTCHA v3 | Turnstile |
| --- | --- | --- | --- |
| Action utilisateur | Sélection d'images requise | Non requise | Non requise |
| Confidentialité | Suivi par cookies | Analyse comportementale | Collecte minimale de données |
| Performance | Lourd | Moyen | Léger |
| Tarification | Gratuit (avec limites) | Gratuit (avec limites) | Gratuit (illimité) |

### Implémentation

L'introduction de Turnstile est étonnamment simple.

#### 1. Création du widget dans le Dashboard Cloudflare

Créez un widget depuis la section « Turnstile » du Dashboard Cloudflare et enregistrez les noms d'hôte cibles (domaine de production et `localhost`). Une clé de site est générée.

#### 2. Ajout du widget au formulaire

```html
<!-- Chargement du script Turnstile -->
<script
  src="https://challenges.cloudflare.com/turnstile/v0/api.js"
  async
  defer
></script>

<!-- Placement du widget dans le formulaire -->
<form action="https://ssgform.com/s/your-form-id" method="POST">
  <!-- Champs du formulaire -->
  <input type="text" name="name" required />
  <textarea name="message" required></textarea>

  <!-- Widget Turnstile -->
  <div
    class="cf-turnstile"
    data-sitekey="your-site-key"
    data-language="ja"
    data-theme="light"
  ></div>

  <button type="submit">Envoyer</button>
</form>
```

La spécification de `data-language="ja"` affiche « 成功しました！ » en japonais lors de la vérification réussie. `data-theme="light"` contrôle la couleur de fond pour correspondre au design du site.

#### 3. Mise à jour des en-têtes CSP

Turnstile utilise des iframes, il faut donc les autoriser correctement dans le CSP.

```text
script-src: https://challenges.cloudflare.com
connect-src: https://challenges.cloudflare.com
frame-src: https://challenges.cloudflare.com
```

### Attention : délai de propagation après la création du widget

Immédiatement après la création d'un widget dans le Dashboard Cloudflare, il faut 1 à 2 minutes pour que la clé de site se propage globalement. L'erreur `400020` peut se produire pendant cette période, mais elle se résout en attendant un peu.

## Utilisation de ssgform.com

Pour la destination d'envoi du formulaire, nous utilisons [ssgform.com](https://ssgform.com/). C'est un service de soumission de formulaires utilisable depuis des sites statiques, offrant les avantages suivants :

- Sans code côté serveur
- Notifications par email automatiques
- Compatible avec la vérification de tokens Turnstile
- Plan gratuit avec un nombre de soumissions suffisant

## Conclusion

Tant pour le CMS que pour la protection anti-bot, nous avons suivi le principe de « choisir le minimum nécessaire ». Pages CMS se met en place en 5 minutes, et Turnstile s'implémente en ajoutant quelques lignes de HTML. C'est précisément parce que la configuration est simple que les coûts d'exploitation restent bas.
