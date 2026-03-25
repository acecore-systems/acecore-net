---
title: 'Astro Site Quality Improvement Guide — Achieving PageSpeed Mobile Score of 99'
description: 'A complete record of improving an Astro + UnoCSS + Cloudflare Pages site across four axes — performance, SEO, accessibility, and UX — achieving a PageSpeed Insights mobile score of 99 and perfect 100 on all desktop metrics.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Target Audience
  text: 'This article is for anyone working on website quality improvements or interested in practical Astro + UnoCSS operations. It serves as a hub article summarizing the full picture, with detailed topics linked in individual articles.'
processFigure:
  title: Improvement Process
  steps:
    - title: Measure
      description: Identify bottlenecks using PageSpeed Insights and axe.
      icon: i-lucide-gauge
    - title: Analyze
      description: Read the score breakdown and identify the highest-impact improvements.
      icon: i-lucide-search
    - title: Implement
      description: Apply changes one at a time, confirming zero build errors.
      icon: i-lucide-code
    - title: Re-measure
      description: Re-measure after deployment and validate results with numbers.
      icon: i-lucide-check-circle
compareTable:
  title: Before and After Improvements
  before:
    label: Before
    items:
      - PageSpeed mobile score in the 70s
      - No structured data or OGP configured
      - No accessibility support
      - Scripts breaking with View Transitions
      - Hardcoded constants scattered throughout
  after:
    label: After
    items:
      - Mobile 99 / 100 / 100 / 100 (all desktop metrics at 100)
      - 7 types of structured data + OGP + canonical fully implemented
      - WCAG AA compliant (contrast, aria, SR notifications, focus-visible)
      - All components compatible with View Transitions
      - SITE constants, social URLs, and ad IDs centrally managed
linkCards:
  - href: /blog/astro-performance-tuning/
    title: Performance Optimization
    description: How to achieve PageSpeed 99 with CSS delivery strategies, font settings, responsive images, and caching.
    icon: i-lucide-gauge
  - href: /blog/astro-seo-and-structured-data/
    title: SEO & Structured Data
    description: A practical guide to implementing JSON-LD, OGP, sitemaps, and RSS.
    icon: i-lucide-search
  - href: /blog/astro-accessibility-guide/
    title: Accessibility
    description: A guide to achieving WCAG AA compliance through aria attributes, contrast, and form improvements.
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: UX & Code Quality
    description: Practical approaches to View Transitions pitfalls, Pagefind full-text search, and TypeScript type safety.
    icon: i-lucide-sparkles
faq:
  title: FAQ
  items:
    - question: Is it possible to score 100 on PageSpeed Insights mobile?
      answer: 'Technically yes, but for sites including external services like AdSense or GA4, maintaining a stable 100 is extremely difficult. Lighthouse simulates slow 4G (~1.6 Mbps), so loading external resources incurs a significant penalty. 99 is a realistic best-case score.'
    - question: In what order should improvements be made?
      answer: 'Start by assessing the current state with PageSpeed Insights, then address the highest-impact findings first. Generally, the recommended order is performance → SEO → accessibility.'
    - question: Can these improvement techniques be applied to other Astro sites?
      answer: 'Yes. CSS delivery strategies, font self-hosting, structured data, and accessibility improvements are best practices common to all Astro sites.'
    - question: Was GitHub Copilot used for the improvements?
      answer: 'Yes. Almost all improvements were carried out in collaboration with GitHub Copilot. Details are covered in the "Development Workflow with GitHub Copilot" article.'
---

## Introduction

The Acecore official site, relaunched in March 2026, was built with Astro 6 + UnoCSS + Cloudflare Pages. However, the newly launched site was at the "it works" level at best — with room for improvement across performance, SEO, accessibility, and UX.

This article summarizes the journey through 150+ improvements to achieve **PageSpeed Insights mobile 99 and perfect 100 on all desktop metrics**.

---

## The PageSpeed Mobile 99 Challenge

The first thing to communicate is that **achieving a high score on PageSpeed Insights mobile is much harder than you'd expect**.

### Lighthouse's Mobile Simulation

PageSpeed Insights runs Lighthouse under the hood, applying the following throttling for mobile tests:

| Setting | Value |
| --- | --- |
| Download speed | ~1.6 Mbps (slow 4G) |
| Upload speed | ~0.75 Mbps |
| Latency | 150 ms (RTT) |
| CPU | 4× slowdown |

This means that even a page that loads in 1 second on a fiber connection will take **5–6 seconds** under Lighthouse's simulation. Loading 200 KiB of CSS alone causes approximately **1 second** of blocking on slow 4G.

### Non-Linear Score Scaling

PageSpeed scores are not linear:

- **50 → 90**: Achievable with basic optimizations (image compression, removing unnecessary scripts)
- **90 → 95**: Requires strategic CSS, font, and image delivery
- **95 → 99**: Millisecond-level tuning. Decisions between CSS inlining vs. external files become critical
- **99 → 100**: Influenced by external CDN response times and Lighthouse's own measurement variance. Extremely difficult to achieve consistently for sites with AdSense or GA4

### Score Variance

Even for the same site, scores can fluctuate by **2–5 points** between measurements. Causes include:

- Image CDN response times (e.g., wsrv.nl)
- Cloudflare Pages edge server cache status
- Lighthouse's own measurement error

For this reason, the goal should be "consistently high scores across repeated measurements," not "scoring 100 once."

---

## Final Scores

Despite these challenges, we were able to consistently achieve the following scores:

| Metric | Mobile | Desktop |
| --- | --- | --- |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

---

## Four Pillars of Improvement

Improvements were organized into four major categories, with each topic detailed in separate articles.

### 1. Performance

Performance optimization contributed the most to achieving mobile 99. We systematically addressed bottlenecks: CSS delivery strategy (inline vs. external), font self-hosting, responsive image optimization, and deferred loading of AdSense/GA4.

The three most impactful changes:

- **CSS externalization**: Switching from inlining 190 KiB of CSS to an external file reduced HTML transfer size by up to 91%
- **Font name mismatch fix**: `@fontsource-variable/noto-sans-jp` registers the font name `Noto Sans JP Variable`, but CSS was referencing `Noto Sans JP` — this mismatch was discovered and fixed
- **Responsive images**: Set `srcset` + `sizes` on all images to serve appropriately sized images for mobile

### 2. SEO

To support Google's rich results, we implemented 7 types of JSON-LD structured data. Combined with OGP meta tags, canonical URLs, sitemap optimization, and RSS feed enhancements, we built a foundation for accurately communicating site structure to search engines.

### 3. Accessibility

PageSpeed Accessibility 100 was achieved by passing axe DevTools and Lighthouse automated tests. This involved adding `aria-hidden` to decorative icons (30+ instances), screen reader notifications for external links, contrast fixes (`text-slate-400` → `text-slate-500`), and applying `focus-visible` styles globally — steady, incremental work.

### 4. UX & Code Quality

We resolved script breakage issues caused by View Transitions (ClientRouter) across all components and implemented full-text search with Pagefind. On the code side, TypeScript type safety was improved and constants were centralized (social URLs, ad IDs, GA4 ID consolidated into SITE constants), significantly improving maintainability.

---

## Tech Stack

| Technology | Purpose |
| --- | --- |
| Astro 6 | Static site generation (zero-JS architecture) |
| UnoCSS (presetWind3) | Utility-first CSS |
| Cloudflare Pages | Hosting, CDN, header control |
| @fontsource-variable/noto-sans-jp | Self-hosted Japanese font |
| wsrv.nl | Image proxy (auto AVIF/WebP conversion) |
| Pagefind | Full-text search for static sites |

---

## Conclusion

Achieving PageSpeed Insights mobile 99 comes down to rigorously following the principle of "don't send what's not needed." CSS delivery strategy, font self-hosting, image optimization, deferred external script loading — each is a simple measure on its own, but combined they deliver significant impact.

By pursuing SEO, accessibility, and UX improvements in parallel, high scores across all four categories become achievable. Rather than obsessing over 100, aiming for a stable 95+ is a more realistic goal.

See the link cards above for detailed coverage of each topic. For information on the improvement workflow and how changes were reflected in code, also check out the [Development Workflow with GitHub Copilot](/blog/tax-return-with-copilot/).
