---
title: 'From VitePress to Starlight — Unifying Documentation Site Frameworks'
description: 'A record of migrating a business plan document built with VitePress + UnoCSS to Astro + Starlight, unifying the framework across two projects. Also covers migrating Mermaid diagrams to CDN.'
date: 2026-03-15
author: gui
tags: ['技術', 'Astro', 'Starlight']
image: https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?w=800&h=400&fit=crop&q=80
processFigure:
  title: Migration Flow
  steps:
    - title: Current State Analysis
      description: Assessed the VitePress + UnoCSS configuration.
      icon: i-lucide-search
    - title: Starlight Setup
      description: Restructured the project with Astro + Starlight.
      icon: i-lucide-star
    - title: Content Migration
      description: Adjusted Markdown file placement and frontmatter.
      icon: i-lucide-file-text
    - title: Mermaid CDN Migration
      description: Eliminated plugin dependency by rendering diagrams via CDN.
      icon: i-lucide-git-branch
compareTable:
  title: Before and After Migration
  before:
    label: VitePress + UnoCSS
    items:
      - Vue-based SSG
      - Styled with UnoCSS
      - Mermaid via plugin
      - Separate tech stack from the Astro project
  after:
    label: Astro + Starlight
    items:
      - Astro-based SSG
      - Starlight's built-in styling
      - Mermaid via CDN
      - Unified framework with the main site
faq:
  title: FAQ
  items:
    - question: What are the benefits of migrating from VitePress to Starlight?
      answer: If your main site runs on Astro, unifying the framework reduces learning costs, simplifies dependency management, and improves configuration consistency. You can also consolidate build pipelines.
    - question: How are Mermaid diagrams rendered?
      answer: We switched from plugin dependency to loading Mermaid via CDN (jsdelivr). This eliminates build dependencies entirely and delivers stable diagram rendering.
    - question: How much effort does the migration take?
      answer: The main tasks are converting the directory structure (docs/ → src/content/docs/) and adjusting frontmatter. Since the content itself is Markdown, it can be reused as-is, making the migration relatively quick.
---

Here's a walkthrough of migrating a VitePress documentation site to Astro + Starlight. If your main site runs on Astro, unifying your docs under Starlight simplifies operations. We also cover migrating Mermaid diagrams to CDN.

## Why Unify Frameworks?

Using different frameworks for the main site and documentation site creates the following problems:

- **Doubled learning costs**: You need to understand both VitePress and Astro specifications
- **Scattered dependencies**: npm package updates managed across two separate systems
- **Configuration inconsistency**: ESLint, Prettier, deploy settings, etc. maintained independently

Unifying on Astro + Starlight enables sharing configuration file patterns and troubleshooting knowledge.

## Migration Steps: VitePress to Starlight

### 1. Project Structure Conversion

VitePress places documents in the `docs/` directory, while Starlight uses `src/content/docs/`.

```
# Before (VitePress)
docs/
  pages/
    index.md
    business-overview.md
    market-analysis.md

# After (Starlight)
src/
  content/
    docs/
      index.md
      business-overview.md
      market-analysis.md
```

### 2. Frontmatter Adjustments

VitePress and Starlight have slightly different frontmatter formats. We migrated VitePress's `sidebar` configuration to Starlight's frontmatter `sidebar` field.

```yaml
# Starlight frontmatter
---
title: Business Overview
sidebar:
  order: 1
---
```

### 3. astro.config.mjs Configuration

```javascript
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  integrations: [
    starlight({
      title: 'Acecore Business Plan',
      defaultLocale: 'ja',
      sidebar: [
        {
          label: 'Business Plan',
          autogenerate: { directory: '/' },
        },
      ],
    }),
  ],
})
```

### 4. Removing UnoCSS

In the VitePress environment, UnoCSS was used for custom styles, but Starlight comes with sufficient built-in default styles. We removed `uno.config.ts` and related packages, slimming down the dependencies.

## Mermaid Diagram CDN Migration

The business plan documents use Mermaid for flowcharts and organizational diagrams. In VitePress, Mermaid was integrated via a plugin (`vitepress-plugin-mermaid`), but no such plugin exists for Starlight.

So we switched to loading Mermaid from a CDN on the browser side.

### Implementation

Add the Mermaid CDN script to Starlight's custom head:

```javascript
// astro.config.mjs
starlight({
  head: [
    {
      tag: 'script',
      attrs: { type: 'module' },
      content: `
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'
        mermaid.initialize({ startOnLoad: true })
      `,
    },
  ],
})
```

Standard Mermaid syntax works as-is in Markdown:

````markdown
```mermaid
graph TD
    A[Business Plan] --> B[Market Analysis]
    A --> C[Sales Strategy]
    A --> D[Financial Plan]
```
````

### Benefits of the CDN Approach

- **Zero build dependencies**: Mermaid as an npm package is no longer needed
- **Always up to date**: Fetches the latest version from CDN
- **No SSR required**: Rendered in the browser, so no impact on build time

## Migration Results

| Item | Before | After |
| --- | --- | --- |
| Framework | VitePress 1.x | Astro 6 + Starlight |
| CSS | UnoCSS | Starlight built-in |
| Mermaid | vitepress-plugin-mermaid | CDN (jsdelivr) |
| Build output | `docs/.vitepress/dist` | `dist` |
| Deployment | Cloudflare Pages | Cloudflare Pages (unchanged) |

By unifying frameworks, `astro.config.mjs` configuration patterns and deployment settings can be shared across multiple projects.

## Conclusion

Framework unification may not be "urgent," but the longer you operate, the more it pays off. The migration from VitePress to Starlight itself can be completed in a few hours, and the CDN approach for Mermaid is actually a liberation from plugin management. If you're running multiple projects, consider unifying your tech stack.
