---
title: 'Distribution sécurisée de sites statiques avec Cloudflare Pages'
description: "Guide pratique du déploiement de sites statiques sur Cloudflare Pages et de la configuration des en-têtes de sécurité et du CSP via _headers. Retour d'expérience sur le passage de Worker à Pages."
date: 2026-03-15
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ']
image: https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop&q=80
processFigure:
  title: Évolution de la configuration de déploiement
  steps:
    - title: Configuration initiale
      description: Distribution de site statique avec Cloudflare Pages.
      icon: i-lucide-cloud
    - title: Migration vers Worker
      description: Migration vers Worker pour le traitement des formulaires de contact.
      icon: i-lucide-server
    - title: Retour à Pages
      description: Retour au statique grâce à l'adoption d'un service de formulaire externe.
      icon: i-lucide-rotate-ccw
    - title: Renforcement de la sécurité
      description: Configuration du CSP et des en-têtes de sécurité via _headers.
      icon: i-lucide-shield-check
callout:
  type: info
  title: Worker vs Pages
  text: Cloudflare Worker est flexible, mais pour les sites statiques, Pages est supérieur en termes d'efficacité du cache et de simplicité de déploiement. Si aucun traitement côté serveur n'est nécessaire, choisissez Pages.
faq:
  title: Questions fréquentes
  items:
    - question: Quand choisir Cloudflare Pages et quand choisir Workers ?
      answer: Pour un site statique sans traitement côté serveur, Pages est le choix optimal. L'intégration avec le CDN est transparente et le déploiement est simple. Le traitement des formulaires peut être délégué à des services externes.
    - question: Quels en-têtes de sécurité configurer dans le fichier _headers ?
      answer: Les essentiels sont Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy et Permissions-Policy. Le CSP doit être ajusté en fonction des ressources externes utilisées par votre site.
    - question: Comment autoriser AdSense et Analytics dans le CSP ?
      answer: Ajoutez les domaines googletagmanager.com et googlesyndication.com dans script-src. Des autorisations dans img-src et connect-src pour les domaines associés peuvent également être nécessaires.
---

Cloudflare Pages est une plateforme idéale pour l'hébergement de sites statiques. Cet article présente la configuration de déploiement concrète et la configuration de sécurité via le fichier `_headers`.

## Configuration de déploiement : pourquoi nous sommes revenus de Worker à Pages

Initialement, nous prévoyions d'effectuer le traitement backend du formulaire de contact avec Cloudflare Worker. Worker permet l'envoi d'emails et la validation côté serveur.

Cependant, la configuration a révélé les problèmes suivants :

- **Complexification du build** : une configuration supplémentaire est nécessaire pour distribuer la sortie de build d'Astro via Worker
- **Effort de débogage** : différences de comportement entre `wrangler dev` en local et la production
- **Contrôle du cache** : l'intégration avec le CDN Cloudflare est plus naturelle avec Pages

Finalement, en utilisant [ssgform.com](https://ssgform.com/), un service externe de formulaires, nous avons complètement éliminé le traitement côté serveur. Le Worker n'étant plus nécessaire, le site peut être déployé sur Pages en tant que pur site statique.

## Configuration de sécurité via \_headers

Avec Cloudflare Pages, les en-têtes de réponse HTTP peuvent être définis dans le fichier `public/_headers`. Voici un extrait de la configuration utilisée.

### Content-Security-Policy (CSP)

Le CSP est un en-tête crucial pour prévenir les attaques de type cross-site scripting (XSS). Il spécifie les sources de ressources autorisées selon une approche de liste blanche.

```text
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://wsrv.nl https://images.unsplash.com data:;
  connect-src 'self' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  frame-src https://challenges.cloudflare.com https://googleads.g.doubleclick.net;
  form-action https://ssgform.com;
```

Points clés :

- **script-src** : autorisation de Cloudflare Turnstile (`challenges.cloudflare.com`) et AdSense
- **img-src** : autorisation du proxy d'images wsrv.nl et d'Unsplash
- **form-action** : envoi de formulaire limité à ssgform.com uniquement
- **frame-src** : autorisation des iframes Turnstile et des cadres publicitaires AdSense

### Autres en-têtes de sécurité

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- **X-Content-Type-Options** : prévention du MIME sniffing
- **X-Frame-Options** : interdiction de l'intégration en iframe contre le clickjacking
- **Referrer-Policy** : envoi de l'origin uniquement en cross-origin
- **Permissions-Policy** : désactivation des API navigateur inutiles (caméra, microphone, géolocalisation)

## Contrôle du cache

Des durées de cache longues sont définies pour les ressources statiques, et des durées courtes pour le HTML.

```text
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=3600
```

Les fichiers du répertoire `_astro/` générés par Astro contiennent un hash de contenu, il est donc sûr de les mettre en cache immutable pendant 1 an. Le HTML est mis à jour plus fréquemment, donc le cache est limité à 1 heure.

## Configuration du déploiement Pages

La configuration du projet Cloudflare Pages est simple :

| Élément | Valeur |
| --- | --- |
| Commande de build | `npx astro build` |
| Répertoire de sortie | `dist` |
| Version Node.js | 22 |

En connectant le dépôt GitHub, chaque push vers la branche `main` déclenche un déploiement automatique. Les déploiements de prévisualisation sont également générés automatiquement pour chaque PR, facilitant la revue.

## Conclusion

Il est essentiel de déterminer si « un traitement côté serveur est vraiment nécessaire ». L'utilisation de services externes a permis d'éliminer le Worker, simplifiant ainsi le déploiement et la gestion de la sécurité. La configuration du CSP via `_headers` demande un effort initial, mais une fois écrite, elle s'applique à toutes les pages — c'est une mesure de sécurité au rapport coût-efficacité excellent.
