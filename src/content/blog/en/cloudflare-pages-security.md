---
title: 'Achieving Secure Static Site Delivery with Cloudflare Pages'
description: 'A practical guide to static site deployment on Cloudflare Pages and security header/CSP configuration using _headers. Also covers why we switched back from Workers to Pages.'
date: 2026-03-15
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ']
image: https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop&q=80
processFigure:
  title: Deployment Architecture Evolution
  steps:
    - title: Initial Setup
      description: Delivered the static site on Cloudflare Pages.
      icon: i-lucide-cloud
    - title: Worker Migration
      description: Migrated to Workers for contact form processing.
      icon: i-lucide-server
    - title: Return to Pages
      description: Switched back to static delivery by adopting an external form service.
      icon: i-lucide-rotate-ccw
    - title: Security Hardening
      description: Configured CSP and security headers via _headers.
      icon: i-lucide-shield-check
callout:
  type: info
  title: Workers vs Pages
  text: Cloudflare Workers are flexible, but for static sites, Pages excels in cache efficiency and deployment simplicity. Choose Pages if you don't need server-side processing.
faq:
  title: Frequently Asked Questions
  items:
    - question: Should I choose Cloudflare Pages or Workers?
      answer: For static sites that don't require server-side processing, Pages is optimal. CDN integration is seamless and deployment is straightforward. Form processing can be handled by external services.
    - question: What security headers should be set in the _headers file?
      answer: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy are the essentials. Adjust CSP according to the external resources your site uses.
    - question: How do I allow AdSense and Analytics in CSP settings?
      answer: Add googletagmanager.com and googlesyndication.com domains to script-src. You may also need to allow related domains in img-src and connect-src.
---

Cloudflare Pages is an excellent platform for hosting static sites. This article covers our actual deployment setup and security configuration using the `_headers` file.

## Deployment Architecture: Why We Left Workers and Returned to Pages

Initially, we planned to use Cloudflare Workers for backend processing of the contact form. Workers allow server-side email sending and validation.

However, we encountered the following challenges during implementation:

- **Build complexity**: Serving Astro's build output through Workers required additional configuration
- **Debugging overhead**: Behavioral differences between local `wrangler dev` and production
- **Cache control**: Pages integrates more naturally with Cloudflare's CDN

Ultimately, we adopted [ssgform.com](https://ssgform.com/) as an external service for the contact form, completely eliminating server-side processing. This removed the need for Workers, allowing us to deploy as a pure static site on Pages.

## Security Configuration with \_headers

On Cloudflare Pages, you can specify HTTP response headers in the `public/_headers` file. Below is an excerpt of the configuration we actually use.

### Content-Security-Policy (CSP)

CSP is a critical header for preventing cross-site scripting (XSS) attacks. It specifies allowed resource origins using a whitelist approach.

```text
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://acecore.net https://images.unsplash.com data:;
  connect-src 'self' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  frame-src https://challenges.cloudflare.com https://googleads.g.doubleclick.net;
  form-action https://ssgform.com;
```

Key points:

- **script-src**: Allow Cloudflare Turnstile (`challenges.cloudflare.com`) and AdSense
- **img-src**: Allow the same-origin Cloudflare Images endpoint and Unsplash
- **form-action**: Restrict form submissions to ssgform.com only
- **frame-src**: Allow Turnstile iframes and AdSense ad frames

### Other Security Headers

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- **X-Content-Type-Options**: Prevent MIME sniffing
- **X-Frame-Options**: Prevent iframe embedding as a clickjacking countermeasure
- **Referrer-Policy**: Send only the origin for cross-origin requests
- **Permissions-Policy**: Disable unnecessary browser APIs (camera, microphone, geolocation)

## Cache Control

We set long-term caching for static assets and shorter caching for HTML.

```text
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=3600
```

Files in the `_astro/` directory output by Astro include content hashes, making it safe to cache them for one year with `immutable`. HTML has a moderate update frequency, so we limit it to a one-hour cache.

## Pages Deployment Configuration

Cloudflare Pages project settings are simple:

| Setting | Value |
| --- | --- |
| Build command | `npx astro build` |
| Output directory | `dist` |
| Node.js version | 22 |

Once you connect a GitHub repository, pushes to the `main` branch trigger automatic deploys. Preview deployments are also auto-generated per PR, making reviews smoother.

## Summary

The key is asking yourself: "Do I really need server-side processing?" By leveraging external services to eliminate Workers, both deployment and security management became simpler. CSP configuration via `_headers` takes some initial effort, but once written, it applies to all pages — making it a highly cost-effective security measure.
