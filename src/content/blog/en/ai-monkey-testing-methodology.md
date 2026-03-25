---
title: 'Monkey Testing Your Website with GitHub Copilot × Playwright: A Practical Guide'
description: 'A hands-on guide to systematically monkey testing a static site using VS Code Agent Mode (GitHub Copilot) combined with Playwright browser tools. Covers test design methodology, discovered bugs and their fixes, and improvement recommendations.'
date: 2026-03-25
author: gui
tags: ['技術', 'GitHub Copilot', 'VS Code', 'Astro', 'Webサイト']
image: https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Who This Article Is For
  text: 'This article is for those interested in AI-powered test automation, improving website quality assurance efficiency, and leveraging GitHub Copilot Agent Mode.'
processFigure:
  title: How to Conduct AI Monkey Testing
  steps:
    - title: Inventory
      description: Read all source code to identify routes, components, and interactions to test.
      icon: i-lucide-clipboard-list
    - title: Crawl Testing
      description: Send HTTP requests to all routes and detect status codes, broken images, and empty links.
      icon: i-lucide-globe
    - title: Interaction Verification
      description: Operate JS-driven elements like FAQ toggles, copy buttons, search modals, and YouTube embeds.
      icon: i-lucide-mouse-pointer-click
    - title: Structure & SEO Audit
      description: Verify structured data, OGP, meta tags, heading hierarchy, and accessibility across all pages.
      icon: i-lucide-shield-check
compareTable:
  title: Comparison with Manual Testing
  before:
    label: Traditional Manual Testing
    items:
      - Visually check each page one by one in a browser
      - Manually create and manage checklists
      - Prone to oversight and missed checks
      - Recording reproduction steps is time-consuming
  after:
    label: AI Monkey Testing
    items:
      - Automatically crawl all routes to verify HTTP status and DOM structure
      - AI automatically extracts test targets from source code
      - Zero-miss detection of broken images, empty links, and JS errors
      - Discovery → root cause → fix → retest all completed within a single session
faq:
  title: Frequently Asked Questions
  items:
    - question: Is GitHub Copilot Agent Mode free to use?
      answer: 'The GitHub Copilot Free plan has monthly usage limits for Agent Mode. Pro and Business plans have relaxed limits. The latest features are available early in VS Code Insiders.'
    - question: Can the same approach be used with browser tools other than Playwright?
      answer: 'We use VS Code''s built-in browser tools (Simple Browser + Playwright integration). Since Copilot directly operates the browser via the run_playwright_code tool, there''s no need to install Playwright separately.'
    - question: Can this be applied to non-static sites?
      answer: 'Yes. The same approach works for SPAs and SSR sites. However, pages requiring login authentication need a mechanism to securely manage test credentials.'
    - question: Can the AI also fix bugs it discovers?
      answer: 'In Agent Mode, file read/write is possible, so the entire flow from bug detection to fixing and build verification can be completed within a single session. In this article, we discovered 2 bugs and fixed them on the spot.'
---

## Introduction

Website quality assurance is not sufficient with a one-time check before release. Unexpected issues can arise at any point—content additions, library updates, CDN configuration changes, and more.

This article documents a hands-on monkey testing session where **VS Code Agent Mode (GitHub Copilot)** directly operated a browser to test an entire site. We've systematized the testing methodology that AI consistently executed, from static source code analysis to dynamic browser verification.

---

## Test Environment

| Item | Details |
|------|---------|
| Editor | VS Code + GitHub Copilot (Agent Mode) |
| AI Model | Claude Opus 4.6 |
| Browser Control | VS Code built-in Playwright tools |
| Test Target | Static site built with Astro + UnoCSS + Cloudflare Pages |
| Preview | `npm run preview` (local) + production URL |

In Agent Mode, Copilot autonomously executes terminal commands, reads/writes files, and operates the browser. The tester simply instructs "please test," and the AI automatically executes the entire process below.

---

## Phase 1: Test Target Inventory

### Full Source Code Read

The AI first scans the project's directory structure and reads all source code for components, pages, and utilities.

```
src/
├── components/    ← All 28 components read
├── content/blog/  ← Frontmatter of 16 articles parsed
├── pages/         ← All routing files identified
├── layouts/       ← BaseLayout structure understood
└── utils/         ← rehype plugins & OG image generation reviewed
```

At this stage, the AI automatically identifies:

- **Full route list**: 7 static pages + blog-related routes (articles, tags, archive, authors, pagination)
- **Interactive elements**: Search modal, FAQ toggles, copy buttons, YouTube facade, scroll-to-top, hero slider
- **External integrations**: ssgform.com (forms), Cloudflare Turnstile (bot protection), Google AdSense, GA4

### Automatic Test Plan Generation

From the source code analysis results, the AI automatically generates a test plan as a Todo list. No need for humans to create checklists.

---

## Phase 2: Full Route Crawl Testing

### HTTP Status Verification

The built site is launched with `npm run preview`, and Playwright accesses all routes.

```
Test targets: 31 routes
├── Static pages       7 (/, /about/, /services/, etc.)
├── Blog posts        16
├── Tag pages         24
├── Archive            4
├── Pagination         2 (/blog/page/2/, /blog/page/3/)
├── Author pages       2
├── RSS                1
└── 404 test           1

Result: All routes 200 OK (except intentional 404)
```

### DOM Structure Check

The following are automatically verified on each page:

| Check Item | Verification Method | Result |
|-----------|---------------------|--------|
| Broken images | `img.complete && img.naturalWidth === 0` | 0 found |
| Empty links | `href` is empty, `#`, or unset | 0 found |
| Unsafe external links | `target="_blank"` without `rel="noopener"` | 0 found |
| H1 count | `document.querySelectorAll('h1').length === 1` | All pages OK |
| Skip link | Presence of "Skip to content" | All pages OK |
| lang attribute | `html[lang="ja"]` | All pages OK |

### Dead Link Check

Internal links were recursively collected from the entry page, confirming reachability of all 55 unique URLs. **0 dead links** were found.

---

## Phase 3: Interaction Verification

The AI directly manipulates browser elements with Playwright to verify JavaScript-powered functionality.

### FAQ (`<details>` elements)

```javascript
// Example test code executed by the AI
const details = document.querySelectorAll('details');
// Initial state: all closed → OK
// Click to open → OK
// Click again to close → OK
```

### Search Modal (Pagefind)

1. Open search dialog with `window.openSearch()`
2. Wait for Pagefind UI to finish loading
3. Enter "Astro" and confirm search results appear
4. Confirm closing with ESC key

### YouTube Facade Pattern

1. Click the `.yt-facade` element
2. Confirm an iframe for `youtube-nocookie.com/embed/` is dynamically generated
3. Confirm the `autoplay=1` parameter is included

### Copy Button (After View Transitions)

Confirmed that code block copy buttons are re-initialized and functional **after** page transitions via View Transitions. The re-registration via the `astro:page-load` event was working correctly.

### ScrollToTop Button

Scroll to the bottom of the page → button appears → click → confirm `window.scrollY` returns to 0.

---

## Phase 4: SEO & Structured Data Audit

### OGP Meta Tags

The following were verified on all pages:

- `og:title` / `og:description` / `og:image` / `og:url` / `og:type` are set
- `twitter:card` is set to `summary_large_image`
- `canonical` URL is correct
- OG image URL exists and is the recommended size (1200×630)

### Structured Data (JSON-LD)

JSON-LD on each page was parsed to verify schema types and content.

| Page Type | Structured Data |
|-----------|----------------|
| All pages | Organization, WebSite |
| Blog posts | BreadcrumbList, BlogPosting, FAQPage |
| Articles with FAQ | FAQPage (mainEntity contains questions and answers) |

### Sitemap

Confirmed that `sitemap-index.xml` → `sitemap-0.xml` contains all 57 URLs. The sitemap reference from `robots.txt` was also working correctly.

---

## Phase 5: Accessibility Verification

AXE engine-equivalent checks were run via Playwright on multiple pages.

| Check Item | Pages Tested | Violations |
|-----------|-------------|------------|
| img alt attributes | 4 | 0 |
| button labels | 4 | 0 |
| Heading hierarchy (h1→h2→h3 order) | 4 | 0 |
| Form input labels | 1 (Contact) | 0 |
| Landmark elements | 4 | 0 |
| External link rel attributes | 4 | 0 |
| tabindex values | 4 | 0 |

**Zero violations across all 4 pages and all check items.**

---

## Phase 6: View Transitions Navigation Testing

With Astro View Transitions, the DOM is differentially updated, making JavaScript re-initialization a challenge. The following transition patterns were verified:

```
Home → Blog List → Article → Tag → Author → Contact → Services → Home
```

Items confirmed after each transition:

- URL, title, and H1 are correctly updated
- Search button works
- Copy buttons are re-initialized
- Breadcrumb navigation is updated
- **Zero JS errors**

---

## Phase 7: Security Header Verification

Verification of response headers on the production site:

| Header | Value | Rating |
|--------|-------|--------|
| Content-Security-Policy | Fully configured | ◎ |
| X-Frame-Options | SAMEORIGIN | ◎ |
| X-Content-Type-Options | nosniff | ◎ |
| Strict-Transport-Security | max-age=15552000 | ○ |
| Referrer-Policy | strict-origin-when-cross-origin | ◎ |
| Permissions-Policy | geolocation=(), camera=(), etc. | ◎ |

---

## Discovered Bugs and Fixes

This test session uncovered 2 bugs, both fixed within the same session.

### Bug 1: Search Modal Lacks Resilience

**Symptom**: If the search button is pressed before the Pagefind script finishes loading, the UI becomes unresponsive.

**Cause**: `loadPagefindScript()` had no retry mechanism after an initial failure.

**Fix**: Implemented clearing the Promise cache on failure and displaying a "Reload" button as fallback UI.

### Bug 2: Missing Google Origins in CSP Header

**Symptom**: Google AdSense-related resources are blocked by CSP, causing console errors.

**Cause**: `connect-src` and `frame-src` did not include `https://www.google.com` / `https://www.google.co.jp`.

**Fix**: Added Google-related origins to the CSP directives in `public/_headers`.

---

## Systematizing the Testing Methodology

Organizing this AI monkey testing approach, it can be classified into the following layers:

### Layer 1: Static Analysis (Source Code Reading)

- Directory structure scanning
- Component dependency mapping
- Frontmatter schema (Zod) analysis
- CSP and redirect configuration review

### Layer 2: HTTP Layer Testing (Full Route Crawl)

- Status code verification (200/404/301)
- Response header audit (security, cache)
- Sitemap, robots.txt, ads.txt consistency

### Layer 3: DOM Layer Testing (Structure Verification)

- Broken images, empty links, unsafe external links
- H1 uniqueness and heading hierarchy
- Meta tags (OGP, canonical, description)
- Structured data (JSON-LD)

### Layer 4: Interaction Layer Testing (Behavior Verification)

- Click, input, keyboard operations
- Modal open/close, form validation
- JS re-initialization after View Transitions
- Scroll events, lazy loading

### Layer 5: Accessibility Layer Testing

- alt attributes, labels, ARIA
- Heading hierarchy, landmarks
- Focus management, tabindex
- Skip links

---

## Limitations and Constraints

AI monkey testing has several limitations:

| Constraint | Details |
|-----------|---------|
| Viewport emulation | Mobile-width emulation doesn't work in VS Code's built-in browser. CSS validity was verified through static analysis of build output instead |
| Network conditions | Offline and slow connection simulation not possible. Service Worker testing also not covered |
| User "feel" | Design beauty, readability, and brand consistency require human judgment |
| Authentication flows | Pages requiring login need separate secure credential management |

For CSS responsive design, we substituted by directly analyzing CSS files in the build output, confirming that `@media(min-width:768px)` media queries were correctly generated.

---

## Summary

GitHub Copilot Agent Mode can complete an entire QA cycle—from source code analysis → test planning → automated browser operation → bug fixing → re-verification—starting from a single instruction: "please test."

Here's a summary of this session's results:

- **Test targets**: 31 routes + 24 tags + 4 archives + 2 pagination = 61 routes
- **Test items**: HTTP status, DOM structure, interactions, SEO, accessibility, security, View Transitions
- **Bugs found**: 2 (search modal, CSP header) → fixed on the spot
- **Accessibility violations**: 0
- **Dead links**: 0

Combining human visual inspection with AI automated verification achieves both test coverage and efficiency.
