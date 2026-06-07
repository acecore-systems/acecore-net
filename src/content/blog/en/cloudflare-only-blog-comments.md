---
title: 'Build Astro Blog Comments with Cloudflare Only'
description: 'How we added comments to an Astro blog without an external comment service, using only Cloudflare Pages Functions, D1, Turnstile, and Wrangler configuration.'
date: 2026-06-07T18:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'Cloudflare', 'Astro', 'セキュリティ', 'Webサイト']
image: /uploads/acecore-generated/blog-cloudflare-pages-security.webp
callout:
  type: tip
  title: No external comment service
  text: 'A static Astro site can still own its comment system. Cloudflare Pages Functions handle the API boundary, D1 stores comments, Turnstile protects submissions, and Wrangler keeps environment bindings reviewable.'
linkCards:
  - href: /en/blog/cloudflare-pages-security/
    title: Cloudflare Pages Security Settings
    description: 'Security headers and Cloudflare Pages delivery for a static site.'
    icon: i-lucide-shield
  - href: /en/blog/cms-selection-and-turnstile/
    title: Sveltia CMS Setup Guide
    description: 'How we added Sveltia CMS and related Cloudflare pieces.'
    icon: i-lucide-badge-check
  - href: /en/blog/astro-ai-contact-chat/
    title: AI Contact Chat on Astro
    description: 'Another Pages Functions API boundary used on the same site.'
    icon: i-lucide-bot
faq:
  title: FAQ
  items:
    - question: Why not use an external comment widget?
      answer: 'External widgets are quick, but UI, data ownership, script loading, moderation, and migration all depend on the service. This implementation keeps those decisions inside the site.'
    - question: Is D1 enough for comments?
      answer: 'For post_slug based reads, created_at ordering, duplicate checks, and soft deletion, D1 is a good fit. Larger community features need a broader design.'
    - question: Is client-side Turnstile enough?
      answer: 'No. The Pages Function must verify the Turnstile token with Cloudflare Siteverify before writing to D1.'
---

Static sites usually avoid server-side state. Comments are the moment that rule becomes inconvenient.

For Acecore, we did not add an external comment SaaS or embedded widget. The implementation in [PR #101](https://github.com/acecore-systems/acecore-net/pull/101) keeps the whole feature inside Cloudflare:

- Astro renders the comment UI.
- Cloudflare Pages Functions expose `/api/comments`.
- Cloudflare D1 stores comments.
- Cloudflare Turnstile protects POST requests.
- `wrangler.jsonc` defines production and preview bindings.

That is the main point: **the comment feature is not a third-party island inside the page**. It uses the same Cloudflare boundary as the rest of the static site.

## Architecture

The implementation has a small surface area.

| Layer          | File or service                            |
| -------------- | ------------------------------------------ |
| UI             | `src/components/BlogComments.astro`        |
| Page placement | `src/views/BlogPostPage.astro`             |
| API            | `functions/api/comments.ts`                |
| Storage        | D1 binding `COMMENTS_DB`                   |
| Bot protection | Cloudflare Turnstile                       |
| Schema         | `migrations/0001_create_blog_comments.sql` |

The UI fetches comments with `GET /api/comments?slug=...&locale=...` and submits with `POST /api/comments`.

The Pages Function validates origin, payload, Turnstile, rate limits, duplicates, and blocked content before inserting into D1.

## Why D1

Comments are relational enough to benefit from SQL:

- select by `post_slug`
- order by `created_at`
- hide rows with `deleted_at`
- count recent rows by `client_hash`
- detect duplicate `body_hash` values

The schema stores a soft delete timestamp instead of physically removing rows. That keeps moderation simple: visible comments are rows where `deleted_at IS NULL`.

Cloudflare D1 supports prepared statements from Workers and Pages Functions. Using `prepare(...).bind(...)` keeps comment input out of raw SQL strings.

## Wrangler As The Contract

Bindings are defined in `wrangler.jsonc`.

```jsonc
{
  "d1_databases": [
    {
      "binding": "COMMENTS_DB",
      "database_name": "acecore-comments-preview",
    },
  ],
  "env": {
    "production": {
      "d1_databases": [
        {
          "binding": "COMMENTS_DB",
          "database_name": "acecore-comments-production",
        },
      ],
    },
  },
}
```

The important part is separating preview and production. A PR preview should never write to the production comments database.

Cloudflare Pages documentation treats Wrangler configuration as the source of truth for a Pages project, which is exactly what we want for reviewable infrastructure changes.

## Turnstile Must Be Verified Server-Side

The widget in the browser is only the beginning. The Pages Function sends the token to Cloudflare Siteverify with the secret key.

It also checks the hostname returned by the verification result. This matters for preview URLs and for preventing tokens from an unexpected hostname from being accepted.

## Spam Controls

The first version is intentionally strict.

It rejects:

- URLs
- email addresses
- HTML tags
- Markdown links
- repeated-character spam
- common promotional terms
- honeypot field submissions

It also applies in-memory rate limits and persistent D1-backed limits. The persistent limit uses a salted hash of IP and User-Agent instead of storing raw values.

## SEO And Search

The comment UI is marked with `data-pagefind-ignore`, and comments are loaded client-side. That means comments are not treated as indexed article content.

For a corporate blog, that is intentional. The article body is reviewed content; comments are interaction. If comments should become searchable content, they need approval and static rendering as a separate design.

## Summary

External comment services are convenient, but they are not the only option.

If a site already runs on Cloudflare Pages, a lightweight comment feature can live entirely inside Cloudflare: Pages Functions for the API, D1 for storage, Turnstile for abuse prevention, and Wrangler for bindings.

That keeps UI, data, security boundaries, and preview/production separation under the same operational model as the site itself.

## References

- [Cloudflare Pages: Configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Cloudflare Pages Functions: Bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare D1: Prepared statement methods](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [Cloudflare D1: Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Cloudflare Turnstile: Server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare Turnstile: Any Hostname](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/any-hostname/)
- [PR #101: Cloudflare comments](https://github.com/acecore-systems/acecore-net/pull/101)
