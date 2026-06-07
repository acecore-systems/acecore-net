---
title: 'Nous avons lancé le portail Aceserver'
description: 'Nous avons lancé le portail officiel d’Aceserver, un serveur Minecraft public et gratuit que tout le monde peut rejoindre. Construit avec Astro, UnoCSS et Sveltia CMS, il organise présentation du serveur, vidéos, cartes des mondes, Wiki et accès Discord dans une seule entrée.'
date: 2026-06-07T10:00
author: gui
tags: ['お知らせ', 'Web制作', 'Webサイト', 'CMS', 'Astro', 'インフラ']
image: /uploads/aceserver-portal-screenshot-1600.webp
callout:
  type: info
  title: Site publié
  text: 'Le portail Aceserver est disponible sur https://asv.acecore.net/. Il rassemble les informations de participation, les vidéos, les cartes des mondes et les liens vers le Wiki du serveur Minecraft public.'
processFigure:
  title: Parcours organisés dans le portail
  steps:
    - title: Présentation du serveur
      description: Présente clairement Aceserver aux personnes qui arrivent pour la première fois.
      icon: i-lucide-server
    - title: Parcours de participation
      description: Place le bouton Discord à un endroit facile à trouver.
      icon: i-lucide-message-circle
    - title: Parcours des cartes
      description: Facilite l’accès aux cartes du monde principal, ressources et RPG.
      icon: i-lucide-map
    - title: Gestion CMS
      description: Permet de mettre à jour le contenu et les paramètres du site depuis Sveltia CMS.
      icon: i-lucide-file-pen-line
insightGrid:
  title: Structure principale du portail Aceserver
  items:
    - title: Accueil
      description: Une entrée compacte pour comprendre le serveur, le support Java et Bedrock, et la façon de participer.
      icon: i-lucide-home
      tone: brand
    - title: Cartes des mondes
      description: Des pages séparées guident vers le monde principal, ressources et RPG.
      icon: i-lucide-map
      tone: emerald
    - title: Wiki et vidéos
      description: Les visiteurs peuvent aller naturellement vers le Wiki et les vidéos pour les détails ou l’ambiance.
      icon: i-lucide-book-open
      tone: amber
linkCards:
  - href: https://asv.acecore.net/
    title: Portail Aceserver
    description: Le portail officiel publié d’Aceserver.
    icon: i-lucide-external-link
  - href: /fr/works/#case-aceserver-portal
    title: Étude de cas du portail Aceserver
    description: Également listée comme cas de production sur la page des réalisations d’Acecore.
    icon: i-lucide-briefcase-business
  - href: /fr/works/#case-aceserver
    title: Exploitation du serveur public Aceserver
    description: Voir le cas lié à l’exploitation serveur et à la communauté.
    icon: i-lucide-server-cog
  - href: /fr/services/#web
    title: Création et exploitation de sites web
    description: Consultation pour portails, organisation de contenu et exploitation web.
    icon: i-lucide-globe
faq:
  title: Questions fréquentes
  items:
    - question: Que peut-on voir sur le portail Aceserver ?
      answer: On y trouve la présentation d’Aceserver, le parcours de participation, la page vidéo, les cartes du monde principal, ressources et RPG, ainsi que les liens vers le Wiki.
    - question: Avec quelles technologies le site est-il construit ?
      answer: C’est un site statique construit avec Astro, UnoCSS et Sveltia CMS. Le sitemap est également généré par l’intégration Astro.
    - question: Quelle est la différence avec le cas d’exploitation Aceserver existant ?
      answer: Le cas existant couvre l’exploitation du serveur public et la gestion de communauté. Ce cas se concentre sur le portail qui organise les informations pour les participants.
---

Nous avons lancé le portail officiel d’[Aceserver](https://asv.acecore.net/), un serveur Minecraft public et gratuit que tout le monde peut rejoindre.

Aceserver prend en charge Java Edition et Bedrock Edition. Le nouveau portail rassemble présentation du serveur, informations de participation, vidéos, cartes des mondes et chemins vers le Wiki dans une seule entrée. Il est aussi listé sur la [page des réalisations](/fr/works/#case-aceserver-portal) d’Acecore comme cas de production web et portail de communauté.

## Contexte

Avant de rejoindre Aceserver, les visiteurs doivent comprendre le serveur, la façon de participer, les mondes disponibles et l’endroit où les règles et détails sont maintenus.

Lorsque ces informations sont réparties entre Discord, Wiki, vidéos et cartes, les personnes qui arrivent pour la première fois ne savent pas toujours par où commencer. Nous avons donc conçu le portail comme une porte d’entrée qui relie les sources existantes.

## Une entrée avant de participer

La page d’accueil présente Aceserver comme un serveur Minecraft public et gratuit. Elle montre ensuite que les joueurs Java et Bedrock peuvent participer, que le serveur reste proche d’une expérience vanilla, et que la première étape passe par le Discord officiel.

Au lieu de surcharger la page avec tous les détails, le portail aide les visiteurs à décider leur prochaine action. Les règles et mises à jour continues restent reliées au Wiki et à Discord.

## Garder vidéos, cartes et Wiki connectés

Le portail inclut des chemins clairs vers les vidéos et les cartes des mondes. Les cartes sont séparées entre monde principal, ressources et RPG pour accéder rapidement au bon endroit.

Le Wiki est également accessible depuis l’accueil. Les informations qui changent avec le temps sont plus faciles à maintenir dans le Wiki, tandis que le portail fournit un chemin stable.

## Conçu pour des mises à jour CMS continues

Le site est construit avec Astro, UnoCSS et Sveltia CMS. Astro sert le portail comme site statique, tandis qu’UnoCSS garde les styles légers. Le contenu des pages et les paramètres du site peuvent être modifiés depuis le CMS, ce qui permet de mettre à jour annonces et navigation sans changement de code.

Notre approche de l’exploitation CMS légère est décrite dans [Exploitation légère de CMS avec Sveltia CMS et Cloudflare Turnstile](/fr/blog/cms-selection-and-turnstile/). Pour la performance des sites statiques, voir [Guide pratique pour améliorer les performances d’un site Astro](/fr/blog/astro-performance-tuning/).

## Ajouté comme cas

La [page réalisations et portfolio](/fr/works/) d’Acecore inclut maintenant ce projet comme “Production du portail Aceserver”.

Le cas existant d’[exploitation du serveur public Aceserver](/fr/works/#case-aceserver) couvre la fiabilité opérationnelle et la gestion de communauté. Ce nouveau cas se concentre sur le portail web qui organise les informations et parcours d’entrée pour les joueurs.

Pour les portails, sites de communauté et sites de services dont les informations sont réparties en plusieurs endroits, créer une première entrée claire est souvent plus utile que tout rassembler sur une seule page.

## Résumé

Le portail Aceserver est publié comme entrée reliant présentation du serveur, participation, vidéos, cartes et Wiki.

Acecore accompagne la création de sites web, la mise en place de CMS, l’exploitation serveur et l’architecture d’information pour communautés. Pour un portail ou une organisation de contenu, contactez-nous depuis [Création et exploitation de sites web](/fr/services/#web) ou [Contact](/fr/contact/).
