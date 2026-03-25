---
title: 'Méthode pratique de monkey testing de sites web avec GitHub Copilot × Playwright'
description: "Retour d'expérience sur le monkey testing systématique d'un site statique en combinant le mode agent de VS Code (GitHub Copilot) et les outils de navigateur Playwright. De la conception des tests aux bugs découverts et corrigés, en passant par les propositions d'amélioration."
date: 2026-03-25
author: gui
tags: ['技術', 'GitHub Copilot', 'VS Code', 'Astro', 'Webサイト']
image: https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Public cible de cet article
  text: "Cet article s'adresse aux personnes intéressées par l'automatisation des tests avec l'IA, celles qui souhaitent optimiser l'assurance qualité de leur site web, et celles qui veulent tirer parti du mode agent de GitHub Copilot."
processFigure:
  title: Déroulement du monkey testing IA
  steps:
    - title: Inventaire
      description: Lecture complète du code source pour identifier les routes, composants et interactions à tester.
      icon: i-lucide-clipboard-list
    - title: Test de navigation
      description: Envoi de requêtes HTTP à toutes les routes pour détecter les codes de statut, images cassées et liens vides.
      icon: i-lucide-globe
    - title: Vérification des interactions
      description: Manipulation des éléments pilotés par JS — ouverture/fermeture des FAQ, boutons de copie, modale de recherche, intégrations YouTube.
      icon: i-lucide-mouse-pointer-click
    - title: Audit structure et SEO
      description: Vérification des données structurées, OGP, balises meta, hiérarchie des titres et accessibilité sur toutes les pages.
      icon: i-lucide-shield-check
compareTable:
  title: Comparaison avec les tests manuels
  before:
    label: Tests manuels traditionnels
    items:
      - Vérification visuelle page par page dans le navigateur
      - Création et gestion manuelle des checklists
      - Risque élevé d'oublis lors des vérifications
      - Temps considérable pour documenter les étapes de reproduction
  after:
    label: Monkey testing IA
    items:
      - Navigation automatique de toutes les routes avec vérification du statut HTTP et de la structure DOM
      - Extraction automatique des cibles de test par l'IA à partir du code source
      - Détection sans aucun oubli des images cassées, liens vides et erreurs JS
      - Découverte → identification de la cause → correction → revérification en une seule session
faq:
  title: Questions fréquentes
  items:
    - question: Le mode agent de GitHub Copilot est-il gratuit ?
      answer: "Le plan GitHub Copilot Free impose une limite mensuelle d'utilisation du mode agent. Les plans Pro et Business offrent des limites plus élevées. VS Code Insiders permet d'accéder en avant-première aux dernières fonctionnalités."
    - question: Peut-on faire la même chose avec un autre outil de navigation que Playwright ?
      answer: "Nous utilisons l'outil de navigateur intégré à VS Code (Simple Browser + intégration Playwright). Copilot pilote directement le navigateur via l'outil run_playwright_code, il n'est donc pas nécessaire d'installer Playwright séparément."
    - question: Cette méthode est-elle applicable aux sites autres que statiques ?
      answer: "Oui. La même approche est possible pour les SPA et les sites SSR. Cependant, pour les pages nécessitant une authentification, un mécanisme de gestion sécurisée des identifiants de test est nécessaire."
    - question: "Peut-on aussi confier la correction des bugs découverts à l'IA ?"
      answer: "Le mode agent permet la lecture et l'écriture de fichiers, ce qui permet de compléter l'ensemble du processus — de la détection du bug à sa correction et à la vérification du build — au sein d'une même session. Dans cet article, nous avons découvert 2 bugs et les avons corrigés sur-le-champ."
---

## Introduction

L'assurance qualité d'un site web ne peut se limiter à une vérification unique avant la mise en production. Des dysfonctionnements imprévus peuvent apparaître à chaque ajout de contenu, mise à jour de bibliothèque ou modification de la configuration CDN.

Cet article présente un retour d'expérience sur le monkey testing complet d'un site réalisé par **le mode agent de VS Code (GitHub Copilot)**, qui pilote directement le navigateur. Nous avons systématisé la méthode de test, de l'analyse statique du code source à la vérification dynamique dans le navigateur, le tout exécuté de manière cohérente par l'IA.

---

## Environnement de test

| Élément | Détail |
|---------|--------|
| Éditeur | VS Code + GitHub Copilot (mode agent) |
| Modèle IA | Claude Opus 4.6 |
| Pilotage du navigateur | Outil Playwright intégré à VS Code |
| Site testé | Site statique Astro + UnoCSS + Cloudflare Pages |
| Prévisualisation | `npm run preview` (local) + URL de production |

En mode agent, Copilot exécute de manière autonome les commandes terminal, la lecture/écriture de fichiers et le pilotage du navigateur. Le testeur n'a qu'à donner l'instruction « veuillez tester » et l'IA exécute automatiquement l'ensemble des étapes suivantes.

---

## Phase 1 : Inventaire des cibles de test

### Lecture complète du code source

L'IA commence par analyser la structure des répertoires du projet et lit le code source de tous les composants, pages et utilitaires.

```
src/
├── components/    ← Lecture de 28 composants
├── content/blog/  ← Analyse du frontmatter de 16 articles
├── pages/         ← Identification de tous les fichiers de routage
├── layouts/       ← Compréhension de la structure du BaseLayout
└── utils/         ← Vérification des plugins rehype et de la génération d'images OG
```

À cette étape, l'IA identifie automatiquement :

- **Liste complète des routes** : 7 pages statiques + routes liées au blog (articles, tags, archives, auteurs, pagination)
- **Éléments interactifs** : modale de recherche, FAQ dépliantes, boutons de copie, façade YouTube, bouton de retour en haut, slider hero
- **Intégrations externes** : ssgform.com (formulaire), Cloudflare Turnstile (anti-bot), Google AdSense, GA4

### Génération automatique du plan de test

À partir des résultats de l'analyse du code source, l'IA génère automatiquement un plan de test sous forme de liste de tâches. Il n'est pas nécessaire de créer manuellement une checklist.

---

## Phase 2 : Test de navigation sur toutes les routes

### Vérification des statuts HTTP

Le site compilé est lancé avec `npm run preview`, puis Playwright accède à toutes les routes.

```
Cibles de test : 31 routes
├── Pages statiques      7 (/, /about/, /services/, etc.)
├── Articles de blog    16
├── Pages de tags       24
├── Archives             4
├── Pagination           2 (/blog/page/2/, /blog/page/3/)
├── Pages auteur         2
├── RSS                  1
└── Test 404             1

Résultat : toutes les routes retournent 200 OK (sauf le 404 intentionnel)
```

### Vérification de la structure DOM

Pour chaque page, les éléments suivants sont automatiquement vérifiés :

| Élément vérifié | Méthode de vérification | Résultat |
|-----------------|------------------------|----------|
| Images cassées | `img.complete && img.naturalWidth === 0` | 0 |
| Liens vides | `href` vide, `#` ou non défini | 0 |
| Liens externes non sécurisés | `target="_blank"` sans `rel="noopener"` | 0 |
| Nombre de H1 | `document.querySelectorAll('h1').length === 1` | OK sur toutes les pages |
| Lien d'évitement | Présence de « Aller au contenu » | OK sur toutes les pages |
| Attribut lang | `html[lang="ja"]` | OK sur toutes les pages |

### Vérification des liens morts

Les liens internes sont collectés récursivement à partir de la page d'accueil, et l'accessibilité des 55 URL uniques a été confirmée. **0 lien mort** détecté.

---

## Phase 3 : Vérification des interactions

L'IA manipule directement les éléments du navigateur avec Playwright pour vérifier les fonctionnalités pilotées par JavaScript.

### FAQ (éléments `<details>`)

```javascript
// Exemple de code de test exécuté par l'IA
const details = document.querySelectorAll('details');
// État initial : tous fermés → OK
// Clic pour ouvrir → OK
// Re-clic pour fermer → OK
```

### Modale de recherche (Pagefind)

1. Ouverture du dialogue de recherche avec `window.openSearch()`
2. Attente du chargement complet de l'UI Pagefind
3. Saisie de « Astro » et confirmation de l'affichage des résultats
4. Confirmation de la fermeture avec la touche Échap

### Pattern façade YouTube

1. Clic sur l'élément `.yt-facade`
2. Confirmation de la génération dynamique de l'iframe `youtube-nocookie.com/embed/`
3. Confirmation de la présence du paramètre `autoplay=1`

### Bouton de copie (après View Transitions)

Vérification que le bouton de copie des blocs de code est réinitialisé et fonctionne **après** une navigation View Transitions. Le réenregistrement par l'événement `astro:page-load` fonctionne correctement.

### Bouton ScrollToTop

Défilement jusqu'en bas de page → le bouton apparaît → clic → confirmation que `window.scrollY` revient à 0.

---

## Phase 4 : Audit SEO et données structurées

### Balises meta OGP

Vérifications effectuées sur toutes les pages :

- `og:title` / `og:description` / `og:image` / `og:url` / `og:type` sont définis
- `twitter:card` est défini sur `summary_large_image`
- L'URL `canonical` est correcte
- L'URL de l'image OG existe et est au format recommandé (1200×630)

### Données structurées (JSON-LD)

Le JSON-LD de chaque page a été analysé et le type de schéma ainsi que le contenu ont été vérifiés.

| Type de page | Données structurées |
|-------------|---------------------|
| Commun à toutes les pages | Organization, WebSite |
| Articles de blog | BreadcrumbList, BlogPosting, FAQPage |
| Articles avec FAQ | FAQPage (questions et réponses dans mainEntity) |

### Sitemap

Confirmation que `sitemap-index.xml` → `sitemap-0.xml` contient les 57 URL. La référence au sitemap depuis `robots.txt` est également correcte.

---

## Phase 5 : Vérification de l'accessibilité

Des vérifications équivalentes au moteur AXE ont été exécutées avec Playwright sur plusieurs pages.

| Élément vérifié | Nombre de pages | Violations |
|-----------------|----------------|------------|
| Attribut alt des images | 4 | 0 |
| Label des boutons | 4 | 0 |
| Hiérarchie des titres (h1→h2→h3) | 4 | 0 |
| Label des champs de formulaire | 1 (contact) | 0 |
| Éléments landmarks | 4 | 0 |
| Attribut rel des liens externes | 4 | 0 |
| Validité des tabindex | 4 | 0 |

**Zéro violation sur les 4 pages testées pour tous les éléments vérifiés.**

---

## Phase 6 : Test de navigation View Transitions

Avec les View Transitions d'Astro, le DOM est mis à jour par différentiel, ce qui pose le défi de la réinitialisation JavaScript. Les scénarios de navigation suivants ont été vérifiés :

```
Accueil → Liste du blog → Article → Tag → Auteur → Contact → Services → Accueil
```

Éléments vérifiés après chaque navigation :

- L'URL, le titre et le H1 sont correctement mis à jour
- Le bouton de recherche fonctionne
- Les boutons de copie sont réinitialisés
- Le fil d'Ariane est mis à jour
- **Zéro erreur JS**

---

## Phase 7 : Vérification des en-têtes de sécurité

Résultats de la vérification des en-têtes de réponse du site de production :

| En-tête | Valeur | Évaluation |
|---------|--------|-----------|
| Content-Security-Policy | Configuration complète | ◎ |
| X-Frame-Options | SAMEORIGIN | ◎ |
| X-Content-Type-Options | nosniff | ◎ |
| Strict-Transport-Security | max-age=15552000 | ○ |
| Referrer-Policy | strict-origin-when-cross-origin | ◎ |
| Permissions-Policy | geolocation=(), camera=(), etc. | ◎ |

---

## Bugs découverts et corrections

Lors de ce test, 2 bugs ont été découverts et corrigés au sein de la même session.

### Bug 1 : Manque de résilience de la modale de recherche

**Symptôme** : Si le bouton de recherche est enfoncé avant le chargement complet du script Pagefind, l'interface ne répond pas.

**Cause** : `loadPagefindScript()` ne disposait pas d'un mécanisme de nouvelle tentative après un premier échec.

**Correction** : Suppression du cache de Promise en cas d'échec et implémentation d'une interface de secours affichant un bouton « Recharger » à l'utilisateur.

### Bug 2 : Origines Google manquantes dans l'en-tête CSP

**Symptôme** : Les ressources liées à Google AdSense sont bloquées par le CSP, provoquant des erreurs dans la console.

**Cause** : `connect-src` et `frame-src` ne contenaient pas `https://www.google.com` / `https://www.google.co.jp`.

**Correction** : Ajout des origines Google aux directives CSP de `public/_headers`.

---

## Systématisation de la méthode de test

En structurant cette méthode de monkey testing IA, nous pouvons la classer en couches suivantes :

### Couche 1 : Analyse statique (lecture du code source)

- Analyse de la structure des répertoires
- Compréhension des dépendances entre composants
- Analyse du schéma frontmatter (Zod)
- Vérification des configurations CSP et redirections

### Couche 2 : Tests au niveau HTTP (navigation de toutes les routes)

- Vérification des codes de statut (200/404/301)
- Audit des en-têtes de réponse (sécurité, cache)
- Cohérence du sitemap, robots.txt et ads.txt

### Couche 3 : Tests au niveau DOM (vérification structurelle)

- Images cassées, liens vides, liens externes non sécurisés
- Unicité du H1, hiérarchie des titres
- Balises meta (OGP, canonical, description)
- Données structurées (JSON-LD)

### Couche 4 : Tests au niveau des interactions (vérification fonctionnelle)

- Clic, saisie, navigation au clavier
- Ouverture/fermeture de modales, validation de formulaires
- Réinitialisation du JS après les View Transitions
- Événements de défilement, chargement différé

### Couche 5 : Tests d'accessibilité

- Attributs alt, labels, ARIA
- Hiérarchie des titres, landmarks
- Gestion du focus, tabindex
- Liens d'évitement

---

## Limites et contraintes

Le monkey testing IA présente certaines contraintes.

| Contrainte | Détail |
|-----------|--------|
| Émulation du viewport | Le navigateur intégré à VS Code ne prend pas en charge l'émulation de largeur mobile. La validité du CSS a été vérifiée par analyse statique de la sortie de build |
| État du réseau | Simulation hors-ligne ou connexion lente impossible. Tests de Service Worker non couverts |
| « Sensibilité » de l'utilisateur | La beauté du design, la lisibilité et la cohérence avec la marque nécessitent un jugement humain |
| Flux d'authentification | Les pages nécessitant une connexion requièrent une gestion sécurisée séparée des identifiants |

La compatibilité responsive du CSS a été vérifiée en analysant directement les fichiers CSS de la sortie de build pour confirmer que les media queries `@media(min-width:768px)` sont correctement générées.

---

## Conclusion

Le mode agent de GitHub Copilot peut accomplir un cycle complet d'assurance qualité — de l'analyse du code source à la planification des tests, au pilotage automatique du navigateur, à la correction des bugs et à la revérification — à partir d'une simple instruction « veuillez tester ».

Voici le résumé des résultats de ce test :

- **Cibles de test** : 31 routes + 24 tags + 4 archives + 2 paginations = 61 routes
- **Éléments testés** : statut HTTP, structure DOM, interactions, SEO, accessibilité, sécurité, View Transitions
- **Bugs découverts** : 2 (modale de recherche, en-tête CSP) → corrigés sur-le-champ
- **Violations d'accessibilité** : 0
- **Liens morts** : 0

En combinant la vérification visuelle humaine et la vérification automatisée par l'IA, il est possible de concilier exhaustivité et efficacité des tests.
