---
title: 'Practical Techniques for Improving PageSpeed on an Astro Site'
description: 'Practical optimization techniques for an Astro + UnoCSS + Cloudflare Pages site. Covers CSS delivery, font configuration, responsive images, AdSense load control, deferred GA4 loading, and cache settings.'
date: 2026-03-15T00:00
lastUpdated: '2026-07-29T00:28:23+09:00'
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: /uploads/acecore-generated/blog-astro-performance-tuning.webp
callout:
  type: tip
  title: Who This Article Is For
  text: "For those looking to improve their Astro site's PageSpeed score. Covers practical, ready-to-apply techniques for optimizing CSS, fonts, images, and ad scripts."
processFigure:
  title: Optimization Workflow
  steps:
    - title: CSS Delivery Strategy
      description: Understand the tradeoffs between inline and external CSS.
      icon: i-lucide-file-code
    - title: Font Optimization
      description: Verify which fonts are fetched and used for rendering.
      icon: i-lucide-type
    - title: Image Optimization
      description: Optimize external images with Cloudflare Images + srcset + sizes.
      icon: i-lucide-image
    - title: Load Control
      description: Check the initial AdSense attempt and retries, plus deferred GA4 loading.
      icon: i-lucide-timer
compareTable:
  title: Before and After Optimization
  before:
    label: Before Optimization
    items:
      - Font connections and rendered results left unchecked
      - CSS output and caching left unchecked
      - Images served at fixed sizes
      - AdSense script loaded immediately
      - Fixed scores tracked without recording test conditions
  after:
    label: After Optimization
    items:
      - Font network requests and rendered fonts verified
      - Larger CSS externalized, with hashed assets cached as immutable
      - srcset + sizes for screen-width-optimized delivery
      - AdSense checks displayability for an initial attempt and retries through observers; GA4 loads after interaction or a timer
      - PageSpeed Insights rechecked under consistent conditions
faq:
  title: Frequently Asked Questions
  items:
    - question: Is inline CSS or external CSS faster?
      answer: "It depends on CSS size, page structure, and cache state. Use the current build.inlineStylesheets: 'auto' setting, inspect the generated HTML and CSS files, and measure under consistent conditions."
    - question: Why is Google Fonts CDN slow?
      answer: 'An external domain can add DNS lookup, TCP connection, and TLS handshake work. The impact varies with the network and cache state, so inspect actual requests and rendered fonts before deciding.'
    - question: What if Cloudflare Images is slow?
      answer: 'Cloudflare Images performance varies with the source, transformation, and cache state. First-time transformations and cache misses still fetch the source image, so measure the LCP candidate under consistent conditions and consider responsive preload only where needed.'
    - question: Does AdSense load control affect revenue?
      answer: 'The effect varies with ad placement and visitor behavior. Compare viewability, ad requests, and revenue before and after the change, and evaluate them separately from performance metrics.'
---

## Introduction

Acecore's official website is built with Astro 7.1.3 + UnoCSS + Cloudflare Pages. This article covers optimization settings verified in the repository as of July 29, 2026.

PageSpeed Insights results vary by test time, device, and network conditions, so this article does not present a fixed score. Measure before and after changes under the same conditions and review Core Web Vitals and transfer size.

---

## Why Astro?

Astro supports static site generation (SSG) and lets the site add client-side JavaScript only where it is needed. The current site still ships ClientRouter, search, ad, and analytics scripts, so treat the delivered JavaScript and rendering metrics as measurements rather than assuming a script-free page.

The site uses UnoCSS with `presetWind3()`. It generates CSS from utilities detected at build time, which can reduce delivery size, but the result still needs measurement. Inspect the generated CSS and the classes that are actually used.

---

## CSS Delivery Strategy: Inline vs External

CSS delivery affects generated HTML size, additional requests, and browser caching.

### When Inlining CSS

Setting `build.inlineStylesheets: 'always'` in Astro embeds all CSS directly into HTML. It removes requests for external CSS files and may improve FCP (First Contentful Paint), depending on the page.

The favorable conditions depend on CSS size and page structure, so do not decide from a fixed threshold alone.

### When Using External CSS

External files let pages reuse shared, hashed CSS through the browser cache.

The current site uses `build.inlineStylesheets: 'auto'` and verifies the generated output when tuning this behavior.

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

After changing this setting, inspect the generated HTML, CSS files, and cache behavior, then rerun PageSpeed Insights under the same conditions.

---

## Font Optimization: Verify Actual Delivery

### Compare External and Local Delivery

External fonts may add a connection to the critical path. Local delivery also sends font CSS and files from the site, so compare both approaches under the same conditions.

Use the network panel to inspect font requests, caching, and transfer size, and check Rendered Fonts to see what the browser actually used.

### Current Repository State

`package.json` includes `@fontsource/noto-sans-jp`, but as of July 29, 2026, it is not imported anywhere under `src`. A dependency alone does not prove that the font is delivered.

The current UnoCSS font stack is:

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', 'Yu Gothic', 'Meiryo', system-ui, sans-serif",
  },
}
```

This declaration does not download a web font by itself. If self-hosting is adopted, verify the explicit import, generated CSS and font files, and the rendered result together.

---

## Image Optimization: Cloudflare Images + srcset + sizes

### Cloudflare Images Transformations

The current utility sends only external images through Cloudflare Images transformation URLs under `/cdn-cgi/image/`. Root-relative `/uploads/...` files and managed `asv.acecore.net/uploads/...` images are served directly.

- **Format conversion**: `format=auto` automatically selects AVIF/WebP based on browser support
- **Quality adjustment**: The current utility defaults to `quality=75`; inspect actual images before overriding it
- **Resizing**: `width=` / `height=` parameters transform the image to the required size

### srcset and sizes Configuration

For external images that need responsive delivery, generate `srcset` and set `sizes` through the utility.

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

### sizes Precision

If the `sizes` attribute is left as `100vw` (full screen width), the browser will select larger images than necessary. Specify according to actual layout, such as `calc(100vw - 2rem)` or `(max-width: 768px) 100vw, 50vw`.

### LCP Improvement: preload

Preload only the image that is actually an LCP candidate. For a responsive image, keep the layout's `href`, `imagesrcset`, and `imagesizes` aligned with the image itself and set `fetchpriority="high"`. Preloading extra candidates can create contention, so confirm the choice with measurements.

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

### CLS Prevention (Layout Shift)

Specify accurate `width` and `height` values whose ratio matches the source image. Correct values let the browser reserve space, but the attributes alone do not guarantee that CLS is eliminated. The current hero and Markdown rewrite paths also add fixed dimensions, so verify their ratio against each source image and measure CLS.

Commonly overlooked images include avatars (32×32, 48×48, 64×64px) and YouTube thumbnails (480×360px).

---

## Ad Load Control and Deferred Analytics

### AdSense

The current runtime, enabled on Japanese `/blog/` pages, registers `IntersectionObserver` (`rootMargin: 200px`) and `ResizeObserver` for each slot, then checks displayability and runs an initial `attemptInit()`. That first attempt does not wait for intersection, so a slot with usable width may request an ad immediately. The observers provide retries on intersection or size changes. Locale-prefixed translated URLs receive ad slots but do not currently load this runtime.

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
void attemptInit() // initial attempt does not wait for intersection
```

`attemptInit()` checks slot width and visibility, while state attributes prevent duplicate requests.

### GA4

Google Analytics 4 is queued by `pointerdown`, `keydown`, `touchstart`, or `scroll`. It uses `requestIdleCallback` when available and `setTimeout` otherwise; if there is no interaction, a timer queues it after 12 seconds on the home page or 4 seconds on other pages.

---

## Cache Strategy

The block below records the current Cloudflare Pages `_headers` settings. These values are not a blanket recommendation for every file.

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
- `/pagefind/*` currently gets a 1-week cache + 1-day stale-while-revalidate. Because the fixed-name `pagefind-entry.json` references hashed metadata, revalidate the entry/bootstrap files to avoid generation mismatches and reserve long caching for hashed chunks
- HTML uses `max-age=0, must-revalidate` and is revalidated before a cached response is reused

---

## Performance Optimization Checklist

1. **Is the CSS delivery strategy appropriate?**: Check the `auto` output and measurements under the same conditions
2. **Has font delivery been compared?**: Measure self-hosting and an external CDN under the same conditions
3. **Was actual font delivery verified?**: Check network requests and Rendered Fonts
4. **Do responsive-delivery images have srcset + sizes?**: Especially prepare smaller sizes for mobile
5. **Is only the actual LCP candidate preloaded?**: Keep responsive srcset, sizes, and priority aligned
6. **Are image width/height values accurate?**: Match the source aspect ratio and measure CLS
7. **Are AdSense/GA4 controls appropriate?**: Check the initial AdSense attempt and observer retries, plus GA4 interactions and timer fallback
8. **Are cache headers configured?**: Limit immutable caching to hashed assets

---

## Summary

The principle of performance optimization is **"Don't send what's unnecessary."** Check CSS delivery in the actual output; font self-hosting is one option when it fits the site's measurements and operations.

Rather than treating a fixed score as the outcome, recheck Core Web Vitals and transfer size under consistent conditions, including the behavior of ads and analytics.

---

## Part of a Series

This article is part of the "[Astro Site Quality Improvement Guide](/blog/website-improvement-batches/)" series. Separate articles cover SEO, accessibility, and UX improvements as well.
