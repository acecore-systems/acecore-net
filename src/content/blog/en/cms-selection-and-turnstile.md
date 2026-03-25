---
title: 'Headless CMS Selection Journal — Why We Chose Pages CMS and Bot Protection with Turnstile'
description: 'A record of evaluating Keystatic, Sveltia CMS, and Pages CMS, ultimately adopting Pages CMS, and implementing spam protection for the contact form using Cloudflare Turnstile.'
date: 2026-03-15
author: gui
tags: ['技術', 'CMS', 'セキュリティ']
image: https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&h=400&fit=crop&q=80
compareTable:
  title: CMS Comparison
  before:
    label: Keystatic / Sveltia CMS
    items:
      - Keystatic requires a server-side runtime
      - Sveltia CMS is feature-rich but has a high learning curve
      - Both are overkill for an Astro + Pages setup
      - Setup takes significant time
  after:
    label: Pages CMS
    items:
      - Directly edit Markdown in the GitHub repository
      - GUI editor enables non-engineers to update articles
      - No server-side required — perfect compatibility with Pages
      - Configuration complete with just .pages.yml
callout:
  type: tip
  title: Benefits of Turnstile
  text: Unlike reCAPTCHA, Cloudflare Turnstile doesn't require users to perform actions like image selection. Verification happens automatically in the background, enabling bot protection without degrading UX.
faq:
  title: Frequently Asked Questions
  items:
    - question: What is Pages CMS?
      answer: A lightweight CMS that lets you directly edit Markdown files in a GitHub repository via a GUI. It requires no server, configuration is complete with just .pages.yml, and non-engineers can update articles.
    - question: How does Cloudflare Turnstile differ from reCAPTCHA?
      answer: Turnstile doesn't require user actions like image selection and verifies automatically in the background. It doesn't degrade UX, respects privacy, and is available for free.
    - question: How can I process form submissions on a static site?
      answer: By using external form services like ssgform.com or Formspree, you can process form submissions without server-side code. They can also be combined with Turnstile for spam protection.
---

CMS selection is an unglamorous but important decision. This article covers the process of evaluating three CMS options and implementing bot protection with Cloudflare Turnstile for the contact form.

## The CMS Selection Process

When introducing a CMS to our Astro-built static site, we shortlisted the following three candidates.

### Keystatic: The First Candidate

We had been watching Keystatic as a type-safe CMS. It officially supports Astro integration. However, operating in local mode requires a server-side runtime, which didn't pair well with Cloudflare Pages' static deployment.

### Sveltia CMS: Feature-Rich but Heavy

Sveltia CMS is a fork of Decap CMS (formerly Netlify CMS) with a modern UI and rich features. However, it was overkill for the current project size (just a few blog posts and a handful of static pages). We plan to re-evaluate it as content grows in the future.

### Pages CMS: The Winner

[Pages CMS](https://pagescms.org/) is a lightweight CMS that directly edits Markdown files in a GitHub repository.

The deciding factors were:

- **Easy setup**: Just add a single `.pages.yml` file
- **No server required**: Operates via GitHub API, requiring no additional infrastructure
- **Markdown native**: Integrates directly with Astro's content collections
- **GUI editor**: Non-engineer team members can edit articles from the browser

```yaml
# .pages.yml
content:
  - name: blog
    label: ブログ
    path: src/content/blog
    type: collection
    fields:
      - name: title
        label: タイトル
        type: string
      - name: date
        label: 公開日
        type: date
      - name: tags
        label: タグ
        type: string
        list: true
```

## Introducing Cloudflare Turnstile

We introduced Cloudflare Turnstile as spam protection for the contact form.

### Why Turnstile Over reCAPTCHA

Google reCAPTCHA v2 forces users to select images, and v3 is score-based but raises privacy concerns. Cloudflare Turnstile is superior in the following ways:

| Comparison | reCAPTCHA v2 | reCAPTCHA v3 | Turnstile |
| --- | --- | --- | --- |
| User action | Image selection required | Not required | Not required |
| Privacy | Cookie-based tracking | Behavior analysis | Minimal data collection |
| Performance | Heavy | Moderate | Light |
| Pricing | Free (limited) | Free (limited) | Free (unlimited) |

### Implementation

Introducing Turnstile is surprisingly simple.

#### 1. Create a Widget in the Cloudflare Dashboard

Create a widget in the "Turnstile" section of the Cloudflare Dashboard and register target hostnames (production domain and `localhost`). A site key will be issued.

#### 2. Add the Widget to Your Form

```html
<!-- Load the Turnstile script -->
<script
  src="https://challenges.cloudflare.com/turnstile/v0/api.js"
  async
  defer
></script>

<!-- Place the widget inside the form -->
<form action="https://ssgform.com/s/your-form-id" method="POST">
  <!-- Form fields -->
  <input type="text" name="name" required />
  <textarea name="message" required></textarea>

  <!-- Turnstile widget -->
  <div
    class="cf-turnstile"
    data-sitekey="your-site-key"
    data-language="ja"
    data-theme="light"
  ></div>

  <button type="submit">Submit</button>
</form>
```

Setting `data-language="ja"` displays "成功しました！" (Success!) in Japanese upon verification. `data-theme="light"` controls the background color to match the site design.

#### 3. Update CSP Headers

Since Turnstile uses iframes, it needs to be properly allowed in CSP.

```text
script-src: https://challenges.cloudflare.com
connect-src: https://challenges.cloudflare.com
frame-src: https://challenges.cloudflare.com
```

### Note: Propagation Delay After Widget Creation

Immediately after creating a widget in the Cloudflare Dashboard, it takes 1–2 minutes for the site key to propagate globally. A `400020` error will occur during this period, but it resolves after a short wait.

## Using ssgform.com

We use [ssgform.com](https://ssgform.com/) as the form submission endpoint. It's a form submission service for static sites with the following benefits:

- No server-side code required
- Automatic email notifications
- Supports Turnstile token verification
- Sufficient submission volume on the free plan

## Summary

For both CMS and bot protection, we unified around the principle of "choose the bare minimum." Pages CMS can be set up in 5 minutes, and Turnstile can be implemented by adding just a few lines of HTML. It's precisely because the architecture is simple that operational costs stay low.
