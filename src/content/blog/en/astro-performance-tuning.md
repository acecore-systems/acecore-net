---
title: 'Practical Techniques for Achieving PageSpeed Mobile 99 on Your Astro Site'
description: 'Optimization techniques used to achieve PageSpeed Insights Mobile 99 on an Astro + UnoCSS + Cloudflare Pages site. Covers CSS delivery strategy, font configuration pitfalls, responsive images, AdSense lazy loading, and cache settings.'
date: 2026-03-15
lastUpdated: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Who This Article Is For
  text: 'For those looking to improve their Astro site''s PageSpeed score. Covers practical, ready-to-apply techniques for optimizing CSS, fonts, images, and ad scripts.'
processFigure:
  title: Optimization Workflow
  steps:
    - title: CSS Delivery Strategy
      description: Understand the tradeoffs between inline and external CSS.
      icon: i-lucide-file-code
    - title: Font Optimization
      description: Self-host fonts to eliminate external CDN latency.
      icon: i-lucide-type
    - title: Image Optimization
      description: Deliver optimal sizes via wsrv.nl + srcset + sizes.
      icon: i-lucide-image
    - title: Lazy Loading
      description: Inject AdSense and GA4 on first user interaction.
      icon: i-lucide-timer
compareTable:
  title: Before and After Optimization
  before:
    label: Before Optimization
    items:
      - Google Fonts CDN (render-blocking)
      - 190 KiB of CSS inlined into HTML
      - Images served at fixed sizes
      - AdSense script loaded immediately
      - Mobile score in the 70s
  after:
    label: After Optimization
    items:
      - Self-hosted via @fontsource (with correct font name reference)
      - CSS externalized with immutable cache
      - srcset + sizes for screen-width-optimized delivery
      - AdSense and GA4 lazy-loaded on first scroll
      - Mobile 99 / Desktop 100
faq:
  title: Frequently Asked Questions
  items:
    - question: Is inline CSS or external CSS faster?
      answer: 'It depends on total CSS size. Below 20 KiB, inlining is advantageous. Above that, externalizing and leveraging browser cache significantly speeds up subsequent visits.'
    - question: Why is Google Fonts CDN slow?
      answer: 'PageSpeed Insights simulates slow 4G (~1.6 Mbps, RTT 150ms). Connecting to an external domain requires DNS lookup + TCP connection + TLS handshake, and this latency becomes render-blocking. Self-hosting eliminates this latency by serving from the same domain.'
    - question: What if wsrv.nl is slow?
      answer: 'wsrv.nl is served via Cloudflare CDN and is usually fast. However, if the CDN cache misses during PageSpeed testing, LCP can degrade. Set <link rel="preload"> for critical images to instruct the browser to fetch them early.'
    - question: Does lazy-loading AdSense affect revenue?
      answer: 'If there are no ads in the first view, loading on first scroll results in nearly the same display timing. The SEO benefits from improved page speed have a more positive impact.'
---

## Introduction

Acecore's official website is built with Astro 6 + UnoCSS + Cloudflare Pages. This article introduces the optimization techniques used to achieve **Mobile 99 / Desktop 100** on PageSpeed Insights.

The final scores achieved:

| Metric | Mobile | Desktop |
| --- | --- | --- |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

---

## Why Astro?

Corporate sites demand "speed" and "SEO." Astro specializes in static site generation (SSG) and achieves zero JavaScript by default. Unlike frameworks like React or Vue, no framework code is shipped to the client, resulting in extremely fast initial rendering.

UnoCSS was chosen as the CSS framework. Like Tailwind CSS, it takes a utility-first approach, but extracts only used classes at build time to minimize CSS size. Since v66, `presetWind3()` is recommended, so be sure to migrate.

---

## CSS Delivery Strategy: Inline vs External

The CSS delivery strategy had the biggest impact on PageSpeed scores.

### When CSS Is Small (~20 KiB)

Setting `build.inlineStylesheets: 'always'` in Astro embeds all CSS directly into HTML. This eliminates HTTP requests for external CSS files, improving FCP (First Contentful Paint).

This approach is optimal when CSS is around 20 KiB or less.

### When CSS Is Large (20 KiB+)

However, using Japanese web fonts (`@fontsource-variable/noto-sans-jp`) changes the equation. This package contains **124 `@font-face` declarations** (~96.7 KiB), bringing total CSS to around 190 KiB.

Inlining 190 KiB of CSS into every HTML page inflates the homepage HTML to **225 KiB**. On slow 4G, transferring this HTML alone takes about 1 second.

### Solution: Externalize + Immutable Cache

Change the Astro setting to `build.inlineStylesheets: 'auto'`. Astro will automatically decide based on CSS size, serving large CSS as external files.

```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    inlineStylesheets: 'auto',
  },
})
```

External CSS files are output to the `/_astro/` directory, so apply immutable cache via Cloudflare Pages header settings.

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

This change reduced HTML size by **84–91%** (e.g., index.html from 225 KiB → 35 KiB) and improved PageSpeed from **96 → 99**.

---

## Font Optimization: Proper Self-Hosting Setup

### Avoid Google Fonts CDN

Google Fonts CDN is convenient but fatal in PageSpeed Insights mobile tests. When tested, using Google Fonts CDN dropped **FCP to 6.1 seconds and the score to 62**.

On slow 4G, connecting to an external domain triggers a chain of DNS lookup → TCP connection → TLS handshake → CSS download → font download, significantly delaying rendering.

### Introducing Self-Hosting

Simply install `@fontsource-variable/noto-sans-jp` and import it in the layout file.

```bash
npm install @fontsource-variable/noto-sans-jp
```

```javascript
// BaseLayout.astro
import '@fontsource-variable/noto-sans-jp'
```

### Caution: Font Name Mismatch

Here's a surprising pitfall. The font name registered by `@fontsource-variable/noto-sans-jp` in `@font-face` is **`Noto Sans JP Variable`**. However, many people write `Noto Sans JP` in their CSS.

This mismatch means **the font isn't properly applied, and the browser's fallback font is used instead**. Despite loading 96.7 KiB of font data, none of it is being used.

Specify the correct font family in UnoCSS settings:

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP Variable', 'Hiragino Kaku Gothic ProN', 'メイリオ', sans-serif",
  },
}
```

If TypeScript type errors occur, add a module declaration in `src/env.d.ts`:

```typescript
declare module '@fontsource-variable/noto-sans-jp';
```

---

## Image Optimization: wsrv.nl + srcset + sizes

### wsrv.nl Proxy

External images are served through [wsrv.nl](https://images.weserv.nl/). Simply adding URL parameters provides:

- **Format conversion**: `output=auto` automatically selects AVIF/WebP based on browser support
- **Quality adjustment**: `q=50` maintains sufficient quality while reducing file size by ~10%
- **Resizing**: `w=` parameter resizes to the specified width

### srcset and sizes Configuration

Set `srcset` and `sizes` on all images to deliver optimal sizes based on screen width.

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

### sizes Precision

If the `sizes` attribute is left as `100vw` (full screen width), the browser will select larger images than necessary. Specify according to actual layout, such as `calc(100vw - 2rem)` or `(max-width: 768px) 100vw, 50vw`.

### LCP Improvement: preload

Set `<link rel="preload">` for images that impact LCP (Largest Contentful Paint). Add a `preloadImage` prop to the Astro layout component to specify images that should be loaded with highest priority, like hero images.

```html
<link rel="preload" as="image" href="..." />
```

### CLS Prevention (Layout Shift)

Specify `width` and `height` attributes on all images. This lets the browser reserve display space in advance, preventing layout shifts (CLS) when loading completes.

Commonly overlooked images include avatars (32×32, 48×48, 64×64px) and YouTube thumbnails (480×360px).

---

## Lazy Loading Ads and Analytics

### AdSense

The Google AdSense script is approximately 100 KiB and significantly impacts initial rendering. Dynamically inject the script when the user first scrolls.

```javascript
window.addEventListener('scroll', () => {
  const script = document.createElement('script')
  script.src = 'https://pagead2.googlesyndication.com/...'
  script.async = true
  document.head.appendChild(script)
}, { once: true })
```

`{ once: true }` ensures the event listener fires only once. This brings first-view JavaScript transfer to near zero.

### GA4

Google Analytics 4 is similarly lazy-injected using `requestIdleCallback`. The script is injected when the browser is idle, avoiding interference with user interactions.

---

## Cache Strategy

Set optimal cache policies per asset type in Cloudflare Pages' `_headers` file.

```
# Build output (hashed filenames)
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

# Search index
/pagefind/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

# HTML
/*
  Cache-Control: public, max-age=0, must-revalidate
```

- `/_astro/*` includes content hashes in filenames, making 1-year immutable cache safe
- `/pagefind/*` gets a 1-week cache + 1-day stale-while-revalidate
- HTML always fetches the latest version

---

## Performance Optimization Checklist

1. **Is the CSS delivery strategy appropriate?**: Inline below 20 KiB, externalize above
2. **Are fonts self-hosted?**: External CDN is fatal on slow 4G
3. **Is the font name correct?**: Check `@fontsource-variable`'s registered name (`*Variable`)
4. **Do all images have srcset + sizes?**: Especially prepare smaller sizes for mobile
5. **Does the LCP element have preload?**: Hero images and first-view images
6. **Do images have width/height?**: CLS prevention
7. **Are AdSense/GA4 lazy-loaded?**: Zero JS transfer on first view
8. **Are cache headers configured?**: Immutable cache for faster subsequent visits

---

## Summary

The principle of performance optimization can be summed up in one phrase: **"Don't send what's unnecessary."** CSS inlining looks fast at first glance, but at 190 KiB it backfires. Font self-hosting is essential, but the font name mismatch is a hidden trap.

Building on Astro's zero-JS architecture and minimizing transfer for CSS, fonts, images, and ad scripts, a mobile score of 99 is well within reach.

---

## Part of a Series

This article is part of the "[Astro Site Quality Improvement Guide](/blog/website-improvement-batches/)" series. Separate articles cover SEO, accessibility, and UX improvements as well.
