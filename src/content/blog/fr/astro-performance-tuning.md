---
title: "Techniques pratiques pour atteindre 99/100 au PageSpeed mobile avec un site Astro"
description: "Présentation des techniques d'optimisation mises en œuvre pour atteindre un score PageSpeed Insights mobile de 99 sur un site Astro + UnoCSS + Cloudflare Pages. De la stratégie de distribution CSS aux pièges des polices, en passant par les images responsives, le chargement différé d'AdSense et la configuration du cache."
date: 2026-03-15
lastUpdated: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80
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
      description: Éliminer la latence des CDN externes grâce à l'auto-hébergement.
      icon: i-lucide-type
    - title: Optimisation des images
      description: Distribuer la taille optimale avec wsrv.nl + srcset + sizes.
      icon: i-lucide-image
    - title: Chargement différé
      description: Injecter AdSense et GA4 lors de la première interaction.
      icon: i-lucide-timer
compareTable:
  title: Comparaison avant/après optimisation
  before:
    label: Avant optimisation
    items:
      - Google Fonts CDN (bloquant le rendu)
      - 190 Kio de CSS intégrés en ligne dans le HTML
      - Images distribuées en taille fixe
      - Script AdSense chargé immédiatement
      - Score mobile autour de 70
  after:
    label: Après optimisation
    items:
      - Auto-hébergement avec @fontsource (nom de police correct)
      - CSS externalisé avec cache immutable
      - Taille optimale selon la largeur d'écran avec srcset + sizes
      - Chargement différé d'AdSense et GA4 au premier défilement
      - Mobile 99, Desktop 100
faq:
  title: Questions fréquentes
  items:
    - question: CSS en ligne ou en fichier externe, lequel est le plus rapide ?
      answer: "Cela dépend de la taille totale du CSS. En dessous de 20 Kio, l'intégration en ligne est avantageuse. Au-delà, l'externalisation pour tirer parti du cache navigateur accélère considérablement les visites suivantes."
    - question: Pourquoi Google Fonts CDN est-il lent ?
      answer: "PageSpeed Insights simule une connexion slow 4G (~1,6 Mbps, RTT 150ms). La connexion à un domaine externe nécessite DNS lookup + connexion TCP + handshake TLS, ce qui bloque le rendu. Avec l'auto-hébergement, la distribution se fait depuis le même domaine, éliminant cette latence."
    - question: Que faire si wsrv.nl est lent ?
      answer: "wsrv.nl est distribué via le CDN Cloudflare et est généralement rapide. Cependant, si le cache CDN ne répond pas lors de la mesure PageSpeed, le LCP peut se dégrader. Pour les images critiques, ajoutez <link rel=\"preload\"> pour demander au navigateur un chargement anticipé."
    - question: Le chargement différé d'AdSense affecte-t-il les revenus ?
      answer: "Si aucune publicité n'est présente dans le premier écran, le chargement au premier défilement donne un timing d'affichage quasi identique. L'amélioration SEO liée à la vitesse de page a un impact positif plus important."
---

## Introduction

Le site officiel d'Acecore est construit avec Astro 6 + UnoCSS + Cloudflare Pages. Cet article présente les techniques d'optimisation mises en œuvre pour atteindre **un score mobile de 99 et desktop de 100** sur PageSpeed Insights.

Voici les scores finaux obtenus :

| Indicateur | Mobile | Desktop |
| --- | --- | --- |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

---

## Pourquoi avoir choisi Astro

Un site d'entreprise exige avant tout « rapidité » et « SEO ». Astro est spécialisé dans la génération de sites statiques (SSG) et atteint le zéro JavaScript par défaut. Contrairement aux frameworks comme React ou Vue, aucun code de framework n'est envoyé au client, ce qui rend l'affichage initial extrêmement rapide.

Pour le framework CSS, nous avons choisi UnoCSS. Cette approche utility-first, similaire à Tailwind CSS, extrait uniquement les classes utilisées lors du build, minimisant ainsi la taille du CSS. Depuis la v66, `presetWind3()` est recommandé — pensez à migrer.

---

## Stratégie de distribution CSS : en ligne vs fichier externe

La stratégie de distribution CSS a eu le plus grand impact sur le score PageSpeed.

### Quand le CSS est petit (~20 Kio)

Avec le paramètre `build.inlineStylesheets: 'always'` d'Astro, tout le CSS est directement intégré dans le HTML. Cela supprime les requêtes HTTP vers des fichiers CSS externes et améliore le FCP (First Contentful Paint).

Cette approche est optimale jusqu'à environ 20 Kio de CSS.

### Quand le CSS est volumineux (20 Kio+)

Cependant, l'utilisation de la police web japonaise (`@fontsource-variable/noto-sans-jp`) change la donne. Ce package contient **124 déclarations `@font-face`** (~96,7 Kio), portant le CSS total à environ 190 Kio.

Intégrer 190 Kio de CSS en ligne dans chaque HTML fait gonfler la page d'accueil à **225 Kio**. En slow 4G, le transfert du seul HTML prend environ 1 seconde.

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

Ce changement a réduit la taille du HTML de **84 à 91 %** (ex : index.html de 225 Kio → 35 Kio), faisant passer le score PageSpeed de **96 à 99**.

---

## Optimisation des polices : configuration correcte de l'auto-hébergement

### Éviter Google Fonts CDN

Google Fonts CDN est pratique mais fatal pour les tests mobiles de PageSpeed Insights. Nos tests ont montré un **FCP de 6,1 secondes et un score de 62** avec Google Fonts CDN.

En slow 4G, la connexion à un domaine externe déclenche une chaîne DNS lookup → connexion TCP → handshake TLS → téléchargement CSS → téléchargement de police, retardant considérablement le rendu.

### Mise en place de l'auto-hébergement

Il suffit d'installer `@fontsource-variable/noto-sans-jp` et de l'importer dans le fichier de layout.

```bash
npm install @fontsource-variable/noto-sans-jp
```

```javascript
// BaseLayout.astro
import '@fontsource-variable/noto-sans-jp'
```

### Attention : incohérence du nom de police

Un piège inattendu se cache ici. Le nom de police enregistré par `@fontsource-variable/noto-sans-jp` via `@font-face` est **`Noto Sans JP Variable`**. Cependant, beaucoup écrivent `Noto Sans JP` dans leur CSS.

Cette incohérence signifie que **la police n'est pas correctement appliquée et le navigateur continue d'utiliser la police de repli**. On charge 96,7 Kio de données de police pour rien.

Spécifiez le nom de famille de police correct dans la configuration UnoCSS.

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP Variable', 'Hiragino Kaku Gothic ProN', 'メイリオ', sans-serif",
  },
}
```

En cas d'erreur de type TypeScript, ajoutez une déclaration de module dans `src/env.d.ts`.

```typescript
declare module '@fontsource-variable/noto-sans-jp';
```

---

## Optimisation des images : wsrv.nl + srcset + sizes

### Proxy wsrv.nl

Les images externes sont distribuées via [wsrv.nl](https://images.weserv.nl/). L'ajout de paramètres URL effectue automatiquement les traitements suivants :

- **Conversion de format** : `output=auto` pour la sélection automatique AVIF / WebP selon le navigateur
- **Ajustement de qualité** : `q=50` pour maintenir une qualité suffisante tout en réduisant la taille d'environ 10 %
- **Redimensionnement** : paramètre `w=` pour redimensionner à la largeur spécifiée

### Configuration srcset et sizes

Configurez `srcset` et `sizes` sur toutes les images pour distribuer la taille optimale selon la largeur d'écran.

```html
<img
  src="https://wsrv.nl/?url=...&w=800&output=auto&q=50"
  srcset="
    https://wsrv.nl/?url=...&w=480&output=auto&q=50 480w,
    https://wsrv.nl/?url=...&w=640&output=auto&q=50 640w,
    https://wsrv.nl/?url=...&w=960&output=auto&q=50 960w,
    https://wsrv.nl/?url=...&w=1280&output=auto&q=50 1280w,
    https://wsrv.nl/?url=...&w=1600&output=auto&q=50 1600w
  "
  sizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  loading="lazy"
  decoding="async"
/>
```

### Précision de `sizes`

Si l'attribut `sizes` reste à `100vw` (largeur totale de l'écran), le navigateur sélectionne une image plus grande que nécessaire. Spécifiez selon la mise en page réelle : `calc(100vw - 2rem)` ou `(max-width: 768px) 100vw, 50vw`.

### Amélioration du LCP : preload

Pour les images impactant le LCP (Largest Contentful Paint), ajoutez `<link rel="preload">`. Ajoutez une prop `preloadImage` au composant de layout d'Astro pour spécifier les images prioritaires comme l'image hero.

```html
<link rel="preload" as="image" href="..." />
```

### Prévention du CLS (décalage de mise en page)

Spécifiez les attributs `width` et `height` sur toutes les images. Le navigateur réserve ainsi l'espace d'affichage à l'avance, évitant le décalage de mise en page (CLS) au chargement.

Les images souvent oubliées sont les avatars (32×32, 48×48, 64×64px) et les miniatures YouTube (480×360px).

---

## Chargement différé de la publicité et de l'analytique

### AdSense

Le script Google AdSense pèse environ 100 Kio et impacte fortement l'affichage initial. Injectez dynamiquement le script lors du premier défilement de l'utilisateur.

```javascript
window.addEventListener('scroll', () => {
  const script = document.createElement('script')
  script.src = 'https://pagead2.googlesyndication.com/...'
  script.async = true
  document.head.appendChild(script)
}, { once: true })
```

`{ once: true }` garantit que l'écouteur d'événement ne se déclenche qu'une seule fois. Cela réduit le JavaScript transféré au premier affichage à quasi-zéro.

### GA4

Google Analytics 4 est également injecté de façon différée avec `requestIdleCallback`. Le script est injecté lorsque le navigateur est inactif, sans perturber les interactions utilisateur.

---

## Stratégie de cache

Configurez les politiques de cache optimales pour chaque type de ressource dans le fichier `_headers` de Cloudflare Pages.

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
- `/pagefind/*` : cache d'une semaine + stale-while-revalidate d'un jour
- HTML : toujours récupérer la dernière version

---

## Checklist d'optimisation de la performance

1. **La stratégie de distribution CSS est-elle appropriée** : en ligne en dessous de 20 Kio, fichier externe au-dessus
2. **Les polices sont-elles auto-hébergées** : les CDN externes sont fatals en slow 4G
3. **Le nom de police est-il correct** : vérifier le nom enregistré par `@fontsource-variable` (`*Variable`)
4. **Toutes les images ont-elles srcset + sizes** : prévoir des tailles mobiles petites
5. **L'élément LCP a-t-il un preload** : images hero et images du premier écran
6. **Les images ont-elles width / height** : prévention du CLS
7. **AdSense / GA4 sont-ils en chargement différé** : réduire le JS au premier écran à zéro
8. **Les en-têtes de cache sont-ils configurés** : cache immutable pour accélérer les visites suivantes

---

## Conclusion

Le principe de l'optimisation de la performance se résume en un mot : **« ne pas envoyer ce qui est inutile »**. L'intégration CSS en ligne semble rapide à première vue, mais devient contre-productive à 190 Kio. L'auto-hébergement des polices est indispensable, mais le piège de l'incohérence du nom de police existe.

En partant de l'architecture zéro JS d'Astro et en minimisant le transfert pour le CSS, les polices, les images et les scripts publicitaires, un score mobile de 99 est tout à fait atteignable.

---

## Série d'articles associée

Cet article fait partie de la série « [Guide d'amélioration de la qualité d'un site Astro](/blog/website-improvement-batches/) ». Les améliorations du SEO, de l'accessibilité et de l'UX sont présentées dans des articles dédiés.
