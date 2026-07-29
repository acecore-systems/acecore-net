---
title: 'Techniques pratiques pour améliorer PageSpeed sur un site Astro'
description: "Techniques pratiques d'optimisation pour un site Astro, UnoCSS et Cloudflare Pages. Couvre la distribution CSS, les polices, les images responsives, le contrôle de chargement AdSense, le chargement différé de GA4 et le cache."
date: 2026-03-15T00:00
lastUpdated: '2026-07-29T00:28:23+09:00'
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: /uploads/acecore-generated/blog-astro-performance-tuning.webp
callout:
  type: tip
  title: Public cible de cet article
  text: "Cet article s'adresse à ceux qui souhaitent améliorer le score PageSpeed de leur site Astro. Il présente des techniques concrètes et directement applicables pour l'optimisation du CSS, des polices, des images et des scripts publicitaires."
processFigure:
  title: Processus d'optimisation
  steps:
    - title: Stratégie de distribution CSS
      description: Comprendre le compromis entre intégration en ligne et fichier externe.
      icon: i-lucide-file-code
    - title: Optimisation des polices
      description: Vérifier quelles polices sont chargées et utilisées au rendu.
      icon: i-lucide-type
    - title: Optimisation des images
      description: Optimiser les images externes avec Cloudflare Images + srcset + sizes.
      icon: i-lucide-image
    - title: Contrôle du chargement
      description: Vérifier la tentative initiale et les reprises AdSense, ainsi que le chargement différé de GA4.
      icon: i-lucide-timer
compareTable:
  title: Comparaison avant/après optimisation
  before:
    label: Avant optimisation
    items:
      - Connexions des polices et rendu réel non vérifiés
      - Sortie CSS et cache non vérifiés
      - Images distribuées en taille fixe
      - Script AdSense chargé immédiatement
      - Suivi de scores fixes sans consigner les conditions de test
  after:
    label: Après optimisation
    items:
      - Requêtes et polices réellement rendues vérifiées
      - CSS volumineux externalisé, assets hashés en cache immutable
      - Taille adaptée à la largeur d'écran avec srcset + sizes
      - AdSense vérifie l'affichabilité au premier essai puis reprend via observers ; GA4 charge après interaction ou délai
      - PageSpeed Insights répété dans des conditions équivalentes
faq:
  title: Questions fréquentes
  items:
    - question: CSS en ligne ou en fichier externe, lequel est le plus rapide ?
      answer: "Cela dépend de la taille du CSS, de la structure de la page et du cache. Utilisez le réglage actuel build.inlineStylesheets: 'auto', inspectez le HTML et le CSS générés, puis mesurez dans les mêmes conditions."
    - question: Pourquoi Google Fonts CDN est-il lent ?
      answer: "Un domaine externe peut ajouter DNS lookup, connexion TCP et handshake TLS. L'impact dépend du réseau et du cache ; inspectez les requêtes et les polices réellement rendues avant de décider."
    - question: Que faire si Cloudflare Images est lent ?
      answer: "Les performances de Cloudflare Images dépendent de la source, de la transformation et de l'état du cache. Une première transformation ou un échec de cache récupère encore l'image source ; mesurez le candidat LCP dans les mêmes conditions et envisagez un responsive preload uniquement si nécessaire."
    - question: Le contrôle de chargement AdSense affecte-t-il les revenus ?
      answer: "L'effet varie selon l'emplacement publicitaire et le comportement des visiteurs. Comparez la visibilité, les requêtes publicitaires et les revenus avant et après, séparément des mesures de performance."
---

## Introduction

Le site officiel d'Acecore repose sur Astro 7.1.3 + UnoCSS + Cloudflare Pages. Cet article présente des réglages d'optimisation vérifiés dans le dépôt au 29 juillet 2026.

Les résultats PageSpeed Insights varient selon la date, l'appareil et le réseau. Aucun score fixe n'est donc publié : comparez les changements dans les mêmes conditions avec les Core Web Vitals et le volume transféré.

---

## Pourquoi avoir choisi Astro

Astro prend en charge la génération statique (SSG) et permet d'ajouter du JavaScript client uniquement là où il est nécessaire. Le site actuel distribue aussi des scripts ClientRouter, de recherche, de publicité et d'analytics : il faut donc mesurer le volume livré et les métriques de rendu plutôt que supposer une page sans JavaScript.

Le site utilise UnoCSS avec `presetWind3()`. Il génère le CSS à partir des utilitaires détectés au build, ce qui peut réduire le volume livré sans prouver qu'il s'agit du plus petit résultat possible. Inspectez le CSS généré et les classes réellement utilisées.

---

## Stratégie de distribution CSS : en ligne vs fichier externe

La distribution CSS influe sur la taille du HTML, les requêtes supplémentaires et le cache du navigateur.

### Lors de l'intégration CSS en ligne

Avec le paramètre `build.inlineStylesheets: 'always'` d'Astro, tout le CSS est intégré dans le HTML. Cela supprime les requêtes CSS externes et peut améliorer le FCP (First Contentful Paint) selon la page.

Les conditions favorables dépendent du volume de CSS et de la page ; un seuil fixe ne suffit pas.

### Lors de l'utilisation de CSS externe

Les fichiers externes permettent de réutiliser le CSS partagé et hashé grâce au cache du navigateur.

Le site actuel utilise `build.inlineStylesheets: 'auto'` et vérifie la sortie générée lors des ajustements.

### Solution : externalisation + cache immutable

Changez le paramètre d'Astro en `build.inlineStylesheets: 'auto'`. Astro décide automatiquement en fonction de la taille du CSS, externalisant le CSS volumineux.

```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    inlineStylesheets: 'auto',
  },
})
```

Les fichiers CSS externes sont générés dans le répertoire `/_astro/`. Configurez un cache immutable via les en-têtes de Cloudflare Pages.

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

Après ce changement, inspectez le HTML généré, les fichiers CSS et le comportement du cache, puis relancez PageSpeed Insights dans les mêmes conditions.

---

## Optimisation des polices : vérifier la distribution réelle

### Comparer distribution externe et locale

Les polices externes peuvent ajouter une connexion au chemin critique. La distribution locale envoie aussi du CSS et des fichiers de police depuis le site ; comparez les deux dans les mêmes conditions.

Utilisez le panneau réseau pour vérifier les requêtes, le cache et le volume transféré, puis Rendered Fonts pour voir les polices réellement utilisées.

### État actuel du dépôt

`package.json` contient `@fontsource/noto-sans-jp`, mais au 29 juillet 2026 aucun fichier sous `src` ne l'importe. La seule présence d'une dépendance ne prouve pas que la police est distribuée.

La pile de polices UnoCSS actuelle est :

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', 'Yu Gothic', 'Meiryo', system-ui, sans-serif",
  },
}
```

Cette déclaration seule ne télécharge aucune police web. Si l'auto-hébergement est adopté, vérifiez ensemble l'import explicite, le CSS et les fichiers générés, puis le rendu.

---

## Optimisation des images : Cloudflare Images + srcset + sizes

### Transformations Cloudflare Images

L'utilitaire actuel envoie uniquement les images externes vers la transformation `/cdn-cgi/image/` de Cloudflare Images. Les fichiers root-relative `/uploads/...` et les images gérées sous `asv.acecore.net/uploads/...` sont servis directement.

- **Conversion de format** : `output=auto` pour la sélection automatique AVIF / WebP selon le navigateur
- **Ajustement de qualité** : l'utilitaire actuel utilise `quality=75` par défaut ; vérifiez l'image réelle avant de le modifier
- **Redimensionnement** : paramètre `w=` pour redimensionner à la largeur spécifiée

### Configuration srcset et sizes

Pour les images externes distribuées en responsive, générez `srcset` et définissez `sizes` avec l'utilitaire.

```astro
---
import { generateSrcSet, optimizeImage } from '../utils/image'

const remoteImage =
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop'
---

<img
  src={optimizeImage(remoteImage, { width: 800, height: 400, quality: 75 })}
  srcset={generateSrcSet(remoteImage, [480, 640, 960, 1280, 1600], {
    quality: 75,
    aspectRatio: 2,
  })}
  sizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  width="800"
  height="400"
  loading="lazy"
  decoding="async"
/>
```

### Précision de `sizes`

Si l'attribut `sizes` reste à `100vw` (largeur totale de l'écran), le navigateur sélectionne une image plus grande que nécessaire. Spécifiez selon la mise en page réelle : `calc(100vw - 2rem)` ou `(max-width: 768px) 100vw, 50vw`.

### Amélioration du LCP : preload

Préchargez uniquement l'image réellement candidate au LCP. Pour une image responsive, alignez les valeurs `href`, `imagesrcset` et `imagesizes` du layout sur l'image et définissez `fetchpriority="high"`. Des préchargements supplémentaires peuvent entrer en concurrence : confirmez le choix par la mesure.

```html
<link
  rel="preload"
  as="image"
  href="..."
  imagesrcset="..."
  imagesizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  fetchpriority="high"
/>
```

### Prévention du CLS (décalage de mise en page)

Indiquez des valeurs `width` et `height` précises dont le rapport correspond à l'image source. Des valeurs correctes permettent de réserver l'espace, mais les attributs seuls ne garantissent pas la suppression du CLS. Les chemins hero et de réécriture Markdown actuels ajoutent aussi des dimensions fixes : vérifiez leur rapport pour chaque source et mesurez le CLS.

Les images souvent oubliées sont les avatars (32×32, 48×48, 64×64px) et les miniatures YouTube (480×360px).

---

## Contrôle du chargement publicitaire et analytique différée

### AdSense

Le runtime actuel, actif sur les pages japonaises `/blog/`, enregistre `IntersectionObserver` (`rootMargin: 200px`) et `ResizeObserver` pour chaque emplacement, vérifie son affichabilité, puis exécute un premier `attemptInit()`. Ce premier essai n'attend pas l'intersection : un emplacement de largeur exploitable peut donc demander une publicité immédiatement. Les observers servent aux reprises lors d'une intersection ou d'un changement de taille. Les URL traduites préfixées par une locale reçoivent des emplacements, mais ne chargent pas actuellement ce runtime.

```javascript
const retry = () => void attemptInit()
const intersectionObserver = new IntersectionObserver(
  (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      retry()
    }
  },
  { rootMargin: '200px' },
)
const resizeObserver = new ResizeObserver(retry)

intersectionObserver.observe(container)
resizeObserver.observe(container)
void attemptInit() // le premier essai n'attend pas l'intersection
```

`attemptInit()` vérifie largeur et visibilité ; les attributs d'état évitent les requêtes en double.

### GA4

Google Analytics 4 est planifié par `pointerdown`, `keydown`, `touchstart` ou `scroll`. Il utilise `requestIdleCallback` quand il est disponible et `setTimeout` sinon ; sans interaction, un timer le planifie après 12 secondes sur l'accueil ou 4 secondes sur les autres pages.

---

## Stratégie de cache

Le bloc suivant documente les réglages actuels du fichier `_headers` de Cloudflare Pages. Ces valeurs ne constituent pas une recommandation générale pour tous les fichiers.

```
# Sortie de build (noms de fichiers avec hash)
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

# Index de recherche
/pagefind/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

# HTML
/*
  Cache-Control: public, max-age=0, must-revalidate
```

- `/_astro/*` contient un hash dans le nom de fichier, un cache immutable d'un an est donc sûr
- `/pagefind/*` : actuellement une semaine de cache + un jour de stale-while-revalidate. Comme `pagefind-entry.json`, au nom fixe, référence des métadonnées hashées, revalidez les fichiers entry/bootstrap pour éviter de mélanger les générations et réservez le cache long aux chunks hashés
- HTML : `max-age=0, must-revalidate`, avec revalidation avant de réutiliser le cache

---

## Checklist d'optimisation de la performance

1. **La stratégie de distribution CSS est-elle appropriée** : vérifier la sortie de `auto` et mesurer dans les mêmes conditions
2. **La distribution des polices a-t-elle été comparée** : mesurer auto-hébergement et CDN externe dans les mêmes conditions
3. **La distribution réelle a-t-elle été vérifiée** : contrôler les requêtes réseau et Rendered Fonts
4. **Les images distribuées en responsive ont-elles srcset + sizes** : prévoir des tailles mobiles petites
5. **Seul le véritable candidat LCP est-il préchargé** : aligner srcset, sizes et priorité responsive
6. **Les width / height sont-ils exacts** : faire correspondre le rapport source et mesurer le CLS
7. **Le contrôle AdSense/GA4 est-il adapté** : vérifier premier essai et reprises AdSense, interactions et timer de secours GA4
8. **Les en-têtes de cache sont-ils configurés** : limiter immutable aux assets hashés

---

## Conclusion

Le principe de l'optimisation de la performance se résume à **« ne pas envoyer ce qui est inutile »**. La distribution CSS doit être vérifiée sur la sortie réelle ; l'auto-hébergement est une option pour les polices lorsqu'il convient aux mesures et à l'exploitation du site.

Ne traitez pas un score fixe comme un résultat. Mesurez à nouveau les Core Web Vitals et le volume transféré dans des conditions constantes, y compris le comportement des publicités et d'Analytics.

---

## Série d'articles associée

Cet article fait partie de la série « [Guide d'amélioration de la qualité d'un site Astro](/blog/website-improvement-batches/) ». Les améliorations du SEO, de l'accessibilité et de l'UX sont présentées dans des articles dédiés.
