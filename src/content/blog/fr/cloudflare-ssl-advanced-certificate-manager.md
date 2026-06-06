---
title: 'Quelle était l’ancienne option SSL payante de Cloudflare ? De Dedicated SSL à Advanced Certificate Manager'
description: 'L’ancienne option payante de Cloudflare, « Dedicated SSL Certificates », a été renommée et enrichie en 2021 sous le nom « Advanced Certificate Manager (ACM) ». Cet article explique les différences avec Universal SSL gratuit et les cas où ACM est nécessaire.'
date: 2026-03-31T00:00
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ', 'インフラ']
image: /uploads/acecore-generated/security-operations.webp
compareTable:
  title: Universal SSL vs Advanced Certificate Manager
  before:
    label: Universal SSL (Gratuit)
    items:
      - Couvre uniquement le domaine racine + les sous-domaines de 1er niveau
      - Impossible de choisir l’AC, la durée de validité ou les suites cryptographiques
      - '*.example.com fonctionne, mais dev.staging.example.com n’est pas couvert'
      - La marque Cloudflare peut apparaître dans le CN du certificat
  after:
    label: Advanced Certificate Manager (Payant, 10 $/mois/zone)
    items:
      - Prend en charge les sous-domaines multi-niveaux, jusqu’à 50 hôtes
      - Permet de choisir l’AC (Let's Encrypt / Google Trust Services, etc.)
      - Durée de validité configurable de 14 à 365 jours
      - 'Votre propre domaine devient le CN et la marque Cloudflare est masquée'
callout:
  type: info
  title: Contexte du changement de nom
  text: 'L’ancien « Dedicated SSL Certificates » a été refondu en 2021 sous le nom Advanced Certificate Manager (ACM). Ce n’est pas qu’un changement de nom : les fonctionnalités ont été largement étendues (sous-domaines multi-niveaux, choix de l’AC, durée de validité, etc.).'
faq:
  title: Questions fréquentes
  items:
    - question: Peut-on utiliser un certificat wildcard (*.example.com) avec Universal SSL ?
      answer: Oui, mais il couvre seulement les sous-domaines de 1er niveau (comme www.example.com). Il ne s’applique pas aux sous-domaines de 2e niveau ou plus, comme dev.staging.example.com, ce qui peut provoquer des erreurs de certificat. Dans ce cas, ACM est nécessaire.
    - question: Peut-on utiliser Advanced Certificate Manager avec l’offre gratuite ?
      answer: Oui. Même avec l’offre gratuite Cloudflare, vous pouvez utiliser ACM en achetant l’add-on ACM (10 $/mois/zone). Pas besoin de passer à une offre supérieure.
    - question: Dans quels cas Universal SSL suffit-il ?
      answer: Pour la plupart des sites personnels et PME, Universal SSL suffit. Si vous utilisez seulement le domaine racine et des sous-domaines de 1er niveau comme www, ACM n’est pas nécessaire.
    - question: Que devient Universal SSL quand on active ACM ?
      answer: Universal SSL et ACM peuvent coexister. Pour un même sous-domaine, le certificat ACM est prioritaire.
linkCards:
  - href: https://developers.cloudflare.com/ssl/edge-certificates/advanced-certificate-manager/
    title: Documentation Advanced Certificate Manager
    description: Guide officiel Cloudflare pour configurer ACM
    icon: i-lucide-file-text
  - href: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/
    title: Limitations de Universal SSL
    description: Documentation officielle des cas non couverts par Universal SSL
    icon: i-lucide-alert-circle
  - href: https://www.cloudflare.com/ja-jp/application-services/products/advanced-certificate-manager/
    title: Page produit Advanced Certificate Manager
    description: Liste des fonctionnalités ACM et mode d’achat (en japonais)
    icon: i-lucide-shield-check
---

« Comment s’appelait déjà l’option SSL payante de Cloudflare ? » — beaucoup se posent la question. Cet article clarifie son identité, son nom actuel et ses fonctionnalités.

## Conclusion : « Dedicated SSL » → « Advanced Certificate Manager (ACM) »

L’ancienne option SSL payante de Cloudflare s’appelait **Dedicated SSL Certificates**. En **2021, elle a été refondue et renommée en « Advanced Certificate Manager (ACM) »**.

Le prix reste identique : **10 $ par mois et par zone (domaine)**.

---

## Pourquoi le nom a changé

À l’époque de « Dedicated SSL », la fonctionnalité était centrée sur l’émission d’un certificat dédié à un domaine. Alors que Universal SSL gratuit partageait des certificats entre plusieurs sites, un certificat dédié permettait d’avoir un nom commun (CN) propre.

Avec la transition vers **Advanced Certificate Manager**, les fonctions suivantes ont été ajoutées, et le nom met davantage l’accent sur la dimension « gestion ».

- **Sous-domaines multi-niveaux** : protection de sous-domaines de 2e niveau ou plus, comme `dev.staging.example.com`
- **Choix de l’AC** : Let's Encrypt, Google Trust Services, etc.
- **Durée de validité personnalisée** : de 14 à 365 jours
- **Jusqu’à 50 hôtes** : un certificat couvre plusieurs hostnames
- **Total TLS** : protection automatique de tous les sous-domaines proxifiés de la zone

---

## Différences avec Universal SSL

Cloudflare propose **Universal SSL** gratuitement, et pour la plupart des sites cela suffit pour activer HTTPS. Mais il existe certaines limites.

### Cas non couverts par Universal SSL

```
# Couverts par Universal SSL
example.com
www.example.com
blog.example.com

# Non couverts par Universal SSL (ACM requis)
dev.staging.example.com
api.v2.example.com
deep.sub.domain.example.com
```

Le wildcard `*.example.com` fonctionne, mais **uniquement pour les sous-domaines de 1er niveau**. Les motifs multi-niveaux comme `*.staging.example.com` ne sont pas pris en charge.

### Présence de la marque Cloudflare

Avec Universal SSL, le CN du certificat peut contenir un domaine Cloudflare, comme `sni.cloudflaressl.com`. Avec ACM, votre propre domaine devient le CN et la marque Cloudflare disparaît.

---

## Quand ACM est nécessaire

Envisagez ACM si l’un des cas suivants s’applique :

1. **Vous utilisez des sous-domaines multi-niveaux**  
   Vous voulez activer SSL pour des sous-domaines de 2e niveau ou plus, comme `api.staging.example.com` ou `dev.app.example.com`.

2. **Vous voulez votre propre domaine en CN du certificat**  
   Vous souhaitez supprimer la marque Cloudflare du certificat (souvent pour les sites d’entreprise et services B2B).

3. **Vous voulez choisir l’AC ou la durée de validité**  
   Votre politique de sécurité impose une AC spécifique, ou vous avez besoin de certificats courts (14 jours, par exemple).

4. **Vous voulez protéger tous les sous-domaines via Total TLS**  
   Vous voulez une protection automatique par certificat pour tous les sous-domaines proxifiés de la zone.

---

## Étapes d’achat et d’activation

Vous pouvez l’activer en quelques étapes depuis le tableau de bord Cloudflare :

1. Ouvrez le domaine cible dans le tableau de bord Cloudflare
2. Allez dans **SSL/TLS** → **Edge Certificates**
3. Dans la section **Advanced Certificate Manager**, cliquez sur **Enable**
4. Confirmez et achetez l’abonnement (10 $/mois)
5. Créez le certificat et ajoutez les hostnames à protéger

Pour activer Total TLS, il suffit de passer la section **Total TLS** sur On dans la même page Edge Certificates.

---

## Résumé

| Élément                        | Universal SSL (Gratuit)     | Advanced Certificate Manager (10 $/mois/zone)       |
| ------------------------------ | --------------------------- | --------------------------------------------------- |
| Sous-domaines multi-niveaux    | ✗                           | ✓                                                   |
| Choix de l’AC                  | ✗                           | ✓                                                   |
| Durée de validité configurable | ✗                           | ✓                                                   |
| CN avec votre propre domaine   | △                           | ✓                                                   |
| Total TLS                      | ✗                           | ✓                                                   |
| Cas d’usage                    | Sites personnels / généraux | Entreprises / structures de sous-domaines complexes |

L’« ancienne option SSL payante » de Cloudflare est **Advanced Certificate Manager (anciennement Dedicated SSL Certificates)**. C’est une option particulièrement utile quand Universal SSL gratuit ne suffit pas — notamment pour protéger des sous-domaines multi-niveaux et contrôler finement les certificats.
