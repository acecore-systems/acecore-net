---
title: 'SEO Improvement Guide: Implementing Structured Data and OGP on Your Astro Site'
description: 'A step-by-step guide to properly implementing JSON-LD structured data, OGP, sitemaps, and RSS on an Astro + Cloudflare Pages site. Covers everything from Google rich result support to RSS feed optimization with practical SEO improvements.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'SEO']
image: https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Who This Article Is For
  text: 'For those looking to systematically improve their Astro site''s SEO. Covers the types and implementation patterns of structured data, OGP configuration, sitemap optimization, and more — all with practical, ready-to-apply steps.'
processFigure:
  title: SEO Improvement Workflow
  steps:
    - title: Meta Tags
      description: Set title, description, canonical, and OGP on every page.
      icon: i-lucide-file-text
    - title: Structured Data
      description: Communicate page meaning to Google using JSON-LD.
      icon: i-lucide-braces
    - title: Sitemap
      description: Configure priority and update frequency per page type.
      icon: i-lucide-map
    - title: RSS
      description: Deliver high-quality feeds with author and category information.
      icon: i-lucide-rss
insightGrid:
  title: Implemented Structured Data
  items:
    - title: Organization
      description: Display company name, URL, logo, and contact info in search results.
      icon: i-lucide-building
    - title: BlogPosting
      description: Enable rich results for articles with author, publish date, update date, and images.
      icon: i-lucide-pen-line
    - title: BreadcrumbList
      description: Output the hierarchical structure of all pages as breadcrumb lists.
      icon: i-lucide-chevrons-right
    - title: FAQPage
      description: Enable FAQ rich results for articles that include FAQ sections.
      icon: i-lucide-help-circle
    - title: WebPage / ContactPage
      description: Assign dedicated types to the top page and contact page.
      icon: i-lucide-layout
    - title: SearchAction
      description: Enable direct site search execution from Google search results.
      icon: i-lucide-search
faq:
  title: Frequently Asked Questions
  items:
    - question: Will search results change immediately after adding structured data?
      answer: 'No. It takes days to weeks for Google to crawl and re-index. You can check the reflection status in the "Rich results" report in Google Search Console.'
    - question: What is the recommended OGP image size?
      answer: '1200×630px is recommended. This ratio is optimal for X (Twitter) when using summary_large_image.'
    - question: Does sitemap priority affect SEO?
      answer: 'Google has officially stated that it ignores priority, but other search engines may reference it. It doesn''t hurt to set it.'
---

## Introduction

When people think of SEO, they might imagine "keyword stuffing," but modern SEO is fundamentally about **accurately conveying your site's structure and content to search engines**.

This article explains SEO measures to implement on an Astro site, divided into four categories. Each one provides ongoing benefits once configured.

---

## Setting Up OGP and Meta Tags

OGP and meta tags handle the appearance when shared on social media and the delivery of information to search engines.

### Basic Meta Tags

In your Astro layout component, output the following for each page:

- `og:title` / `og:description` / `og:image` — Title, description, and image when shared on social media
- `twitter:card` = `summary_large_image` — Display a large image card on X (Twitter)
- `rel="canonical"` — Specify the canonical URL for duplicate pages
- `rel="prev"` / `rel="next"` — Indicate pagination relationships

### Blog Post Meta Tags

Set the following additional tags on article pages:

- `article:published_time` / `article:modified_time` — Publish and update dates
- `article:tag` — Article tag information
- `article:section` — Content category

### Implementation Tips

By accepting `title` / `description` / `image` as props in the layout component and passing them from each page, you can ensure consistent meta tag output across all pages. For the homepage `og:title`, use a specific title that includes the site name and tagline rather than just "Home."

---

## Implementing Structured Data (JSON-LD)

Structured data is a mechanism that allows search engines to mechanically understand page content. When implemented correctly, rich results (FAQs, breadcrumbs, author information, etc.) may appear in search results.

### Organization

Convey company information to Google. It may appear in the Knowledge Panel.

```json
{
  "@type": "Organization",
  "name": "Acecore",
  "url": "https://acecore.net",
  "logo": "https://acecore.net/logo.png",
  "contactPoint": { "@type": "ContactPoint", "telephone": "..." }
}
```

You can also add a `knowsAbout` field to the about page to specify business domains.

### BlogPosting

Set `BlogPosting` for blog articles. Including author, publish date, update date, and featured image enables author information display in Google Discover and search results.

### BreadcrumbList

Breadcrumb structured data should be set on all pages. An important implementation note: verify that intermediate paths (like listing pages such as `/blog/tags/`) actually exist, and don't output the `item` property for non-existent paths.

### FAQPage

Output `FAQPage` structured data for articles with FAQ sections. In Astro, defining an `faq` field in the frontmatter and detecting/outputting it on the template side is a convenient approach.

### WebSite + SearchAction

If you have site search, setting `SearchAction` may display a site search box in Google search results. Combined with a search engine like Pagefind, implementing an auto-launch mechanism for the search modal via `?q=` parameter improves the user experience.

---

## Sitemap Optimization

You can auto-generate a sitemap using Astro's `@astrojs/sitemap` plugin, but the default settings are insufficient.

### Per-Page-Type Configuration

Use the `serialize()` function to set `changefreq` and `priority` based on URL patterns.

| Page Type | changefreq | priority |
| --- | --- | --- |
| Homepage | daily | 1.0 |
| Blog Posts | weekly | 0.8 |
| Other | monthly | 0.6 |

### Setting lastmod

Set `lastmod` to the build date to communicate content freshness to search engines. If a blog post has a `lastUpdated` field in its frontmatter, prioritize that.

---

## Enhancing the RSS Feed

RSS tends to be a "set it and forget it" task, but improving feed quality enhances display in RSS readers and improves the subscriber experience.

### Information to Add

- **author**: Include the per-article author name
- **categories**: Add tag information as categories to improve classification in RSS readers

```typescript
items: posts.map(post => ({
  title: post.data.title,
  description: post.data.description,
  link: `/blog/${post.id}/`,
  pubDate: post.data.date,
  author: post.data.author,
  categories: post.data.tags,
}))
```

---

## SEO Improvement Checklist

Finally, here's a summary of the key points to verify for Astro site SEO improvement:

1. **Is a canonical URL set on every page?**
2. **Is a unique OGP image prepared for each page?**
3. **Structured data validation**: Check with [Google Rich Results Test](https://search.google.com/test/rich-results)
4. **Do intermediate paths in breadcrumb lists point to actual URLs?**
5. **Does the sitemap exclude unnecessary pages (like 404)?**
6. **Does the RSS feed include author and categories?**
7. **Does robots.txt exclude search indexes (like `/pagefind/`) from crawling?**

Once you've configured all these, your SEO foundation is in place. From there, search rankings are determined by content quality and update frequency.

---

## Series This Article Belongs To

This article is part of the "[Astro Site Quality Improvement Guide](/blog/website-improvement-batches/)" series. Separate articles cover performance, accessibility, and UX improvements.
