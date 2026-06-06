---
title: 'What Cloudflare’s Former Paid SSL Option Really Is — From Dedicated SSL to Advanced Certificate Manager'
description: 'Cloudflare’s former paid option "Dedicated SSL Certificates" was renamed and expanded in 2021 as "Advanced Certificate Manager (ACM)." This article explains the differences from free Universal SSL and when ACM is needed.'
date: 2026-03-31T00:00
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ', 'インフラ']
image: /uploads/acecore-generated/security-operations.webp
compareTable:
  title: Universal SSL vs Advanced Certificate Manager
  before:
    label: Universal SSL (Free)
    items:
      - Covers only the root domain + first-level subdomains
      - Cannot choose CA, validity period, or cipher suites
      - '*.example.com works, but dev.staging.example.com is not covered'
      - Cloudflare branding appears in the certificate CN
  after:
    label: Advanced Certificate Manager (Paid, $10/month/zone)
    items:
      - Supports multi-level subdomains, up to 50 hostnames
      - Can choose CA (Let's Encrypt / Google Trust Services, etc.)
      - Certificate validity can be set from 14 to 365 days
      - 'Your own domain becomes the CN and Cloudflare branding is hidden'
callout:
  type: info
  title: Why the name changed
  text: The former "Dedicated SSL Certificates" was revamped in 2021 as Advanced Certificate Manager (ACM). It was not just a rename—major capabilities were added, including multi-level subdomain support, CA selection, and validity period control.
faq:
  title: Frequently Asked Questions
  items:
    - question: Can I use a wildcard certificate (*.example.com) with Universal SSL?
      answer: Yes, but it only covers first-level subdomains such as www.example.com. It does not apply to second-level or deeper subdomains like dev.staging.example.com, which causes certificate errors. ACM is required in that case.
    - question: Can I use Advanced Certificate Manager on the free plan?
      answer: Yes. Even on Cloudflare’s free plan, you can use ACM by purchasing the ACM add-on ($10/month/zone). Upgrading to a higher plan is not required.
    - question: When is Universal SSL sufficient?
      answer: For most personal and small business sites, Universal SSL is enough. If you only use the root domain and first-level subdomains like www, ACM is not necessary.
    - question: What happens to Universal SSL after enabling ACM?
      answer: Universal SSL and ACM can coexist. For the same subdomain, ACM certificates are used with priority.
linkCards:
  - href: https://developers.cloudflare.com/ssl/edge-certificates/advanced-certificate-manager/
    title: Advanced Certificate Manager Documentation
    description: Official Cloudflare guide for ACM configuration
    icon: i-lucide-file-text
  - href: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/
    title: Universal SSL Limitations
    description: Official documentation on cases not covered by Universal SSL
    icon: i-lucide-alert-circle
  - href: https://www.cloudflare.com/ja-jp/application-services/products/advanced-certificate-manager/
    title: Advanced Certificate Manager Product Page
    description: Feature list and purchasing information for ACM (Japanese)
    icon: i-lucide-shield-check
---

“Wait, what was Cloudflare’s paid SSL option called again?” — many people have wondered this. In this article, we’ll clarify what it is and what it’s called today.

## Conclusion: “Dedicated SSL” → “Advanced Certificate Manager (ACM)”

Cloudflare’s former paid SSL option was **Dedicated SSL Certificates**. In **2021, it was revamped and renamed as “Advanced Certificate Manager (ACM)”**.

The price remains the same as before: **$10/month per zone (domain)**.

---

## Why the name changed

In the “Dedicated SSL” era, the feature focused on issuing certificates dedicated to a specific domain. While free Universal SSL shared certificates across multiple sites, dedicated certificates offered your own common name (CN).

With the transition to **Advanced Certificate Manager**, the following capabilities were added, and the name shifted to emphasize certificate “management.”

- **Multi-level subdomain support**: Protect deeper subdomains such as `dev.staging.example.com`
- **CA selection**: Choose from Let's Encrypt, Google Trust Services, and more
- **Custom validity period**: Configure from 14 to 365 days
- **Up to 50 hostnames**: Cover multiple hostnames with one certificate
- **Total TLS**: Automatically protect all proxied subdomains in the zone

---

## Differences from Universal SSL

Cloudflare provides free **Universal SSL**, and for most sites this alone enables HTTPS. However, there are some limitations.

### Cases Universal SSL cannot cover

```
# Covered by Universal SSL
example.com
www.example.com
blog.example.com

# Not covered by Universal SSL (ACM required)
dev.staging.example.com
api.v2.example.com
deep.sub.domain.example.com
```

The wildcard `*.example.com` works, but **it only applies to first-level subdomains**. Multi-level patterns like `*.staging.example.com` are not supported.

### Cloudflare branding in certificates

With Universal SSL, the certificate CN may include a Cloudflare domain such as `sni.cloudflaressl.com`. With ACM, your own domain becomes the CN and Cloudflare branding is hidden.

---

## When ACM is needed

Consider ACM if any of the following applies:

1. **You use multi-level subdomains**  
   You need SSL for second-level or deeper subdomains, such as `api.staging.example.com` or `dev.app.example.com`.

2. **You want your own domain as the certificate CN**  
   You want to remove Cloudflare branding from certificates (common for corporate and B2B services).

3. **You want to specify CA or validity period**  
   Your security policy requires a specific CA, or you need short-lived certificates (e.g., 14 days).

4. **You want to protect all subdomains at once with Total TLS**  
   You want automatic certificate coverage for all proxied subdomains in the zone.

---

## Purchase and activation steps

You can enable it in a few steps from the Cloudflare dashboard:

1. Open the target domain in the Cloudflare dashboard
2. Go to **SSL/TLS** → **Edge Certificates**
3. In the **Advanced Certificate Manager** section, click **Enable**
4. Confirm and purchase the subscription ($10/month)
5. Create a certificate and add hostnames you want to protect

If you want to enable Total TLS, simply turn it On in the **Total TLS** section on the same Edge Certificates page.

---

## Summary

| Item                    | Universal SSL (Free)     | Advanced Certificate Manager ($10/month/zone) |
| ----------------------- | ------------------------ | --------------------------------------------- |
| Multi-level subdomains  | ✗                        | ✓                                             |
| CA selection            | ✗                        | ✓                                             |
| Validity period control | ✗                        | ✓                                             |
| CN as your own domain   | △                        | ✓                                             |
| Total TLS               | ✗                        | ✓                                             |
| Best for                | Personal / general sites | Enterprise / complex subdomain setups         |

Cloudflare’s “former paid SSL option” is **Advanced Certificate Manager (formerly Dedicated SSL Certificates)**. It is especially useful when free Universal SSL is not enough—particularly for protecting multi-level subdomains and gaining fine-grained certificate control.
