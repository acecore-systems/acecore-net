---
title: 'Pitfalls and Solutions for Astro View Transitions — A UX and Code Quality Improvement Guide'
description: 'A practical guide covering solutions for scripts breaking with Astro View Transitions, introducing Pagefind full-text search, improving TypeScript type safety, centralizing constants, and more to improve UX and code quality.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'Webサイト']
image: https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&h=400&fit=crop&q=80
callout:
  type: warning
  title: Must-Read If You Use View Transitions
  text: 'When you adopt Astro''s ClientRouter (View Transitions), page transitions become smoother, but all inline scripts stop re-executing. This article covers the solution patterns and practical techniques for improving UX and code quality.'
processFigure:
  title: UX Improvement Workflow
  steps:
    - title: Discover Issues
      description: List all malfunctions after introducing View Transitions.
      icon: i-lucide-bug
    - title: Unify Patterns
      description: Convert all scripts to a unified initialization pattern.
      icon: i-lucide-repeat
    - title: Implement Search
      description: Introduce full-text search with Pagefind and set up navigation.
      icon: i-lucide-search
    - title: Ensure Type Safety
      description: Eliminate any types and centralize constants for better maintainability.
      icon: i-lucide-shield-check
compareTable:
  title: Before and After Comparison
  before:
    label: Before
    items:
      - Hamburger menu stops working after page transitions
      - No site search
      - any types and hardcoded constants scattered throughout
      - Inline onclick causing CSP violation risks
  after:
    label: After
    items:
      - All scripts work correctly with astro:after-swap
      - Full-text search with Pagefind including 3-axis filtering
      - TypeScript type safety and centralized constants
      - addEventListener + data attributes for CSP compliance
faq:
  title: Frequently Asked Questions
  items:
    - question: Are these improvements still effective without View Transitions?
      answer: 'All improvements except the script initialization pattern (Pagefind, TypeScript, constant management) are effective regardless of whether View Transitions are used.'
    - question: How large a site can Pagefind handle?
      answer: 'Pagefind is designed for static sites and operates fast even with thousands of pages. The search index is generated at build time and runs in the browser, so there is no server load.'
    - question: Will the code still work if I ignore TypeScript type errors?
      answer: 'It will work, but type errors are signs of potential bugs. Especially with Astro''s content schemas, making them type-safe enables IDE autocompletion for property access within templates, greatly improving development efficiency.'
---

## Introduction

Astro's View Transitions (ClientRouter) is a powerful feature that makes page transitions as smooth as an SPA. However, the moment you introduce it, you'll face issues — the hamburger menu won't open, the search button won't respond, the slider stops working...

This article covers the pitfalls of View Transitions and their solutions, along with practical techniques for improving UX and code quality.

---

## The Script Problem with View Transitions

### Why Scripts Stop Working

During normal page navigation, the browser re-parses the HTML and executes all scripts. However, View Transitions updates the page via DOM diffing, so **inline scripts are not re-executed**.

The following types of processing are affected:

- Hamburger menu open/close
- Search button click handlers
- Hero image sliders
- Table of contents scroll tracking
- YouTube embed facade patterns

### The Solution Pattern

Unify all scripts into a pattern that **wraps them in named functions and re-registers them on `astro:after-swap`**.

```html
<script>
  function initHeader() {
    const menuBtn = document.querySelector('[data-menu-toggle]')
    menuBtn?.addEventListener('click', () => { /* ... */ })
  }

  // Initial execution
  initHeader()

  // Re-execute after View Transitions
  document.addEventListener('astro:after-swap', initHeader)
</script>
```

### Choosing Between astro:after-swap and astro:page-load

- `astro:after-swap`: Fires immediately after the DOM is swapped. It does not fire on initial page load, so you need to call the function directly
- `astro:page-load`: Fires on **both** initial page load and after View Transitions. You can omit the initial call

For cases like YouTube embeds where you need reliable execution on initial load, `astro:page-load` is convenient.

---

## Introducing Pagefind Full-Text Search

If you want to implement full-text search on a static site, Pagefind is the way to go. It generates the index at build time and runs search in the browser, making it fast and server-free.

### Basic Setup

```json
{
  "scripts": {
    "build": "astro build && pagefind --site dist"
  }
}
```

Run Pagefind after the Astro build to output the index to `dist/pagefind/`.

### Faceted Search

Using `data-pagefind-filter` attributes, you can filter by three axes: author, year, and tag.

```html
<span data-pagefind-filter="author">gui</span>
<span data-pagefind-filter="year">2026</span>
<span data-pagefind-filter="tag">Astro</span>
```

### Search Modal

Implement a search modal that opens with the `Ctrl+K` shortcut. When there are zero results, display links to the article list, services page, and contact page to prevent user bounce.

### SearchAction Integration

By defining a `?q=` parameter in Google's `SearchAction` structured data, users can navigate directly from search results to your site search. Add logic to detect URL parameters and automatically launch the search modal.

### Cache Settings

Since Pagefind index files change infrequently, enable caching via Cloudflare Pages header settings.

```
/pagefind/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400
```

---

## Eliminating Inline onclick

Writing `onclick="..."` directly in HTML is convenient, but it causes CSP (Content Security Policy) to require `unsafe-inline`.

### Improvement Pattern

Replace `onclick` with `data-*` attributes + `addEventListener`.

```html
<!-- Before -->
<button onclick="window.openSearch?.()">Search</button>

<!-- After -->
<button data-search-trigger>Search</button>
```

```javascript
document.querySelectorAll('[data-search-trigger]').forEach(btn => {
  btn.addEventListener('click', () => window.openSearch?.())
})
```

---

## Building a Component Library

Having a set of components available for writing blog posts enhances the expressiveness of your articles.

| Component | Purpose |
| --- | --- |
| Callout | Four types of annotations: info / warning / tip / note |
| Timeline | Chronological event display |
| FAQ | Question and answer with structured data support |
| Gallery | Image gallery with lightbox |
| CompareTable | Before/after comparison table |
| ProcessFigure | Step-by-step process diagram |
| LinkCard | OGP-style external link card |
| YouTubeEmbed | Lazy loading with facade pattern |

All of these are designed to be invoked from Markdown frontmatter. The article template renders `<Callout>` when `data.callout` exists.

---

## Improving TypeScript Type Safety

### Eliminating any Types

Replace `any[]` with specific types like `CollectionEntry<'blog'>[]`. This enables IDE autocompletion and compile-time error detection, making property access in templates safe.

### Literal Types for Content Schemas

```typescript
type: z.enum(['info', 'warning', 'tip', 'note']).default('info')
```

Defining frontmatter values as literal type unions makes branches like `if (callout.type === 'info')` type-safe on the template side.

### as const Assertions

Adding `as const` to constant objects makes properties `readonly` and type inference use literal types. Always apply it to the `SITE` constant.

### Migrating Deprecated Imports

Change `import { z } from 'astro:content'` (scheduled for removal in Astro 7) to `import { z } from 'astro/zod'`.

---

## Centralizing Constants

Hardcoded values cause oversights during changes. The following values were consolidated in `src/data/site.ts`:

| Constant | Number of Locations Before Consolidation |
| --- | --- |
| AdSense Client ID | 4 files |
| GA4 Measurement ID | 2 locations |
| Ad Slot IDs | 4 files |
| Social URLs (X, GitHub, Discord, Aceserver) | 17 locations |
| Phone, Email, LINE | 3 files |

```typescript
export const SITE = {
  name: 'Acecore',
  url: 'https://acecore.net',
  ga4Id: 'G-XXXXXXXXXX',
  adsenseClientId: 'ca-pub-XXXXXXXXXXXXXXXX',
  social: {
    x: 'https://x.com/acecore',
    github: 'https://github.com/acecore-systems',
    discord: 'https://discord.gg/...',
  },
} as const
```

---

## Other UX Improvements

### Table of Contents Scroll Tracking

Use `IntersectionObserver` to monitor content headings and highlight the active heading in the sidebar table of contents. The key is to also scroll the table of contents itself with `scrollIntoView({ block: 'nearest', behavior: 'smooth' })`.

### Scroll Spy

For single-page layouts like the services page, use `IntersectionObserver` to automatically track the active navigation item.

### Pagination

Implement automatic pagination every 6 articles, navigation with ellipsis (`1 2 ... 9 10`), and "← Previous" / "Next →" text links. Centralize the pagination logic in `src/utils/pagination.ts`.

### Sticky Header Anchor Links

With a sticky header, anchor link destinations get hidden behind the header. Resolve this with the following UnoCSS preflight settings:

```css
[id] { scroll-margin-top: 5rem; }
html { scroll-behavior: smooth; }
```

---

## Summary

If you use View Transitions, **unifying the script initialization pattern** is the most important thing. Understand the distinction between `astro:after-swap` and `astro:page-load`, and test all interactions.

On the code quality side, TypeScript type safety and centralized constant management contribute significantly to long-term maintainability. It may feel tedious at first, but the benefits of IDE autocompletion are felt in daily development.

---

## Series This Article Belongs To

This article is part of the "[Astro Site Quality Improvement Guide](/blog/website-improvement-batches/)" series. Separate articles cover performance, SEO, and accessibility improvements.
