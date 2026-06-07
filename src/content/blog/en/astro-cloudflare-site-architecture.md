---
title: 'Designing an Astro + Cloudflare Website That Can Grow Feature by Feature'
description: 'How we combined Astro and Cloudflare Pages with an AI contact chat, Sveltia CMS, multilingual blog publishing, service CTA handoff, safe Markdown rendering, and Cloudflare-only comments as one extensible website architecture.'
date: 2026-06-07T19:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'Astro', 'Cloudflare', 'Webサイト', 'AI', 'CMS']
image: /uploads/acecore-generated/work-acecore-net-website.webp
callout:
  type: tip
  title: Decide boundaries before adding features
  text: 'AI chat, CMS editing, localization, and comments are useful on their own, but they need clear boundaries when they live on the same company website. Astro generates static HTML, Cloudflare handles delivery and small API edges, and GitHub keeps changes reviewable.'
processFigure:
  eyebrow: Site Architecture
  title: Feature Layers for a Growing Website
  description: Keep the site static by default, then add dynamic behavior only where it belongs.
  variant: inline
  steps:
    - title: Deliver
      description: Generate static HTML with Astro and serve it on Cloudflare Pages.
      icon: i-lucide-rocket
      accent: brand
    - title: Edit
      description: Edit Japanese source content in Sveltia CMS and review it through GitHub PRs.
      icon: i-lucide-file-pen-line
      accent: emerald
    - title: Localize
      description: Keep translation work in PRs instead of exposing every locale in the CMS UI.
      icon: i-lucide-languages
      accent: amber
    - title: Guide
      description: Use AI chat and service CTAs to guide visitors toward the right form.
      icon: i-lucide-route
      accent: slate
    - title: Accept
      description: Use Pages Functions for APIs, with D1 and Turnstile only where needed.
      icon: i-lucide-cloud
      accent: brand
    - title: Protect
      description: Control Markdown rendering, Origin checks, rate limits, noindex areas, and Pagefind indexing.
      icon: i-lucide-shield-check
      accent: emerald
compareTable:
  title: Adding isolated features vs designing layers
  before:
    label: Feature by feature
    items:
      - 'AI, CMS, comments, and forms each get their own design assumptions'
      - 'External scripts and admin tools spread operational responsibility'
      - 'Localized URLs, search indexes, and preview environments drift easily'
      - 'It becomes harder to explain how the whole website works'
  after:
    label: Layer by layer
    items:
      - 'Astro, Cloudflare, GitHub, and OpenAI API each have a clear role'
      - 'Dynamic APIs are kept at Pages Functions, while storage stays in D1 where it fits'
      - 'CMS updates, localization, RSS, sitemap, and search share one content model'
      - 'Detailed articles become spokes connected by a readable architecture hub'
linkCards:
  - href: /en/blog/astro-ai-contact-chat/
    title: Technical Design for an AI Contact Chat
    description: API boundaries and response controls for guiding visitors with site information.
    icon: i-lucide-bot
  - href: /en/blog/cms-selection-and-turnstile/
    title: Sveltia CMS Setup Guide
    description: Adding CMS editing, GitHub backend, OAuth, and PR-based operations to a static site.
    icon: i-lucide-badge-check
  - href: /en/blog/copilot-translation-pipeline/
    title: Running a Multilingual Blog with Sveltia CMS
    description: Generating localized static pages instead of relying on UI-only translation.
    icon: i-lucide-languages
  - href: /en/blog/service-cta-contact-prefill/
    title: Passing Service CTA Context to a Contact Form
    description: Carrying service context from a service page into form category and subject fields.
    icon: i-lucide-route
  - href: /en/blog/ai-chat-markdown-link-safety/
    title: Safe Markdown Link Rendering for AI Chat
    description: Rendering only trusted Markdown links instead of treating AI output as HTML.
    icon: i-lucide-shield-check
  - href: /en/blog/cloudflare-only-blog-comments/
    title: Build Astro Blog Comments with Cloudflare Only
    description: Comments without a third-party comment service, using Pages Functions, D1, and Turnstile.
    icon: i-lucide-message-square-text
faq:
  title: FAQ
  items:
    - question: How is this different from the detailed feature posts?
      answer: 'The detailed posts explain each feature. This article explains how AI, CMS, localization, forms, comments, and search fit into one website architecture.'
    - question: Should every feature be Cloudflare-only?
      answer: 'No. The AI contact chat uses the OpenAI API. The point is to keep delivery, API boundaries, storage, and bot protection inside a clear Cloudflare-centered architecture, while being deliberate about outside services.'
    - question: Is this necessary for a small site?
      answer: 'Not all at once. But if a site may later add CMS editing, localization, contact automation, or comments, it helps to decide URLs, storage, preview behavior, and search indexing early.'
---

Over the last few articles, we wrote about the AI contact chat, Sveltia CMS, multilingual publishing, service CTA handoff, safe Markdown rendering, and Cloudflare-only comments.

Those work as detailed feature posts. What was missing was the article that ties them together.

This article frames the Acecore website as an **Astro + Cloudflare static site that grows feature by feature**. It is not just a link list; it is the architectural view behind those features.

## The Short Version

The important split is this:

| Layer       | Responsibility                                   |
| ----------- | ------------------------------------------------ |
| Astro       | Pages, blog, OGP, RSS, sitemap, UI               |
| Cloudflare  | Pages delivery, Pages Functions, D1, Turnstile   |
| GitHub      | PR review, CMS diffs, translation diffs, history |
| Sveltia CMS | Japanese source content, authors, tags, images   |
| OpenAI API  | AI contact chat responses                        |
| Pagefind    | Search indexing for reviewed static HTML         |

Static content stays static. Dynamic behavior is added only where a request-time boundary is actually useful.

## Existing Summary Posts Were Not This

We already had posts about performance, SEO, accessibility, localization, and the website renewal.

Those are related, but they do not tie together the recent feature work: AI contact chat, CMS editing, multilingual publishing, form context, and comments.

That is why this architecture hub is useful.

## Start With Static Strength

Most of a company website does not need a server on every request.

Services, company information, case studies, blog posts, author pages, tag pages, RSS, sitemap, and OGP can all be generated at build time.

Astro owns that static surface. Cloudflare Pages delivers it.

Only features such as AI chat and comment posting need runtime APIs. Those go to Cloudflare Pages Functions.

## Keep Dynamic Features at Small API Boundaries

The AI contact chat and the comment API share the same pattern:

| Feature    | UI    | API Boundary      | Storage or External API |
| ---------- | ----- | ----------------- | ----------------------- |
| AI chat    | Astro | `/api/ai-contact` | OpenAI API              |
| Comments   | Astro | `/api/comments`   | Cloudflare D1           |
| Bot checks | UI    | Pages Functions   | Cloudflare Siteverify   |

Astro renders the interface. Secrets, API keys, D1 bindings, Turnstile secrets, hash salts, Origin checks, and rate limits stay server-side.

The site does not become a full application server. It remains static by default.

## CMS Is an Editing Surface, Not the Runtime Database

Sveltia CMS was added so content can be edited in a browser, but the CMS is not the runtime database.

It creates Git changes:

- Japanese blog source
- authors
- tags
- Japanese source JSON
- images

Those changes go through GitHub PRs, build checks, and review before reaching production.

That design keeps static-site operations reviewable.

## Localization Is Generated Content, Not UI Translation

The multilingual workflow keeps Japanese as the source and generates localized Markdown through PRs.

This creates actual URLs, titles, descriptions, OGP metadata, JSON-LD, RSS entries, sitemap entries, and hreflang links for each locale.

That is different from translating the UI at display time.

## Contact Paths Have Different Jobs

The contact area is not one button repeated in several places.

| Visitor state                      | Path        |
| ---------------------------------- | ----------- |
| Unsure which service fits          | AI chat     |
| Already reading a specific service | Service CTA |
| Ready to submit details            | Form        |
| Wants a lightweight conversation   | LINE        |

The AI chat helps visitors choose. Service CTAs preserve context. The form records the actual request.

## AI Output Is Not Trusted HTML

The AI chat can return Markdown-like text, but that output is not trusted HTML.

The renderer only supports the Markdown needed for the chat, trims href values, checks them against an allowlist, and creates links through DOM APIs. Unsafe links fall back to text.

This is part of the architecture, not a cosmetic detail.

## Comments Stay Inside Cloudflare

The blog comments are intentionally not an embedded third-party widget.

Cloudflare Pages Functions handle GET and POST, D1 stores comments, Turnstile protects submissions, and host allowlists/rate limits decide what is accepted.

For a small company blog, that is enough without turning the site into a community platform.

## Searchable Content and Interaction Are Separate

Reviewed article content is indexed. Comments are not included in Pagefind.

That separation matters. User submissions, AI chat logs, forms, and admin screens are not the same thing as reviewed public content.

The architecture decides what is part of the public knowledge surface and what remains interaction or operation.

## Recommended Reading Order

1. [Sveltia CMS Setup Guide](/en/blog/cms-selection-and-turnstile/)
2. [How to Run a Multilingual Blog with Sveltia CMS](/en/blog/copilot-translation-pipeline/)
3. [Technical Design for Adding an AI Contact Chat to an Astro Site](/en/blog/astro-ai-contact-chat/)
4. [Safe Markdown Link Rendering for AI Chat Answers](/en/blog/ai-chat-markdown-link-safety/)
5. [Passing Service CTA Context to a Contact Form](/en/blog/service-cta-contact-prefill/)
6. [Build Astro Blog Comments with Cloudflare Only](/en/blog/cloudflare-only-blog-comments/)

## Summary

Astro + Cloudflare can support much more than a simple company brochure without giving up the strengths of static delivery.

The key is to split responsibilities clearly: Astro builds reviewed public HTML, Cloudflare owns delivery and small API boundaries, Sveltia CMS edits source content, GitHub PRs review changes, OpenAI helps with contact guidance, and comments stay within Cloudflare when that is enough.

Once the feature articles exist, a hub article like this gives readers the missing map.
