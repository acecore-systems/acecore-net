---
title: 'Astro Site Quality Improvement Guide, Part 2 - Final Adjustments That Achieved Perfect 100s Across All PageSpeed Insights Categories'
description: 'A follow-up to the previous article covering the final refinements: disabling Cloudflare Web Analytics, reaching perfect 100s across all PageSpeed Insights categories on both mobile and desktop, interpreting the network dependency tree, migrating to shared SVG icons, and documenting the optimizations that were tried but not adopted.'
date: 2026-03-29T02:30
author: gui
tags: ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: This is a follow-up to the previous article
  text: 'As a continuation of the earlier "Astro Site Quality Improvement Guide," this post documents the final adjustment process that brought the site to perfect 100s across all PageSpeed Insights categories. It also explains how the remaining diagnostics were interpreted and which extra optimizations were examined but ultimately not adopted.'
insightGrid:
  eyebrow: Why it matters
  title: Why perfect 100s across all PageSpeed categories still represent a high bar
  description: 100 does not mean every aspect of the live site is perfect, but it does show that there are no major misses in the core audits Lighthouse evaluates.
  variant: card
  items:
    - title: Measured under slow 4G
      description: Mobile scoring is tested under slow 4G with CPU slowdown. Even a lightweight static site does not reach 100 easily.
      icon: i-lucide-gauge
      tone: brand
    - title: Perfect across 4 categories
      description: It is not enough to optimize Performance alone. Accessibility, Best Practices, and SEO all have to clear the bar at the same time.
      icon: i-lucide-shield-check
      tone: emerald
    - title: Third-party elements were trimmed
      description: You need to reduce external beacons and unnecessary dependencies while still keeping essential elements such as GA4 and ads.
      icon: i-lucide-sparkles
      tone: amber
    - title: Diagnostics must be interpreted
      description: The goal is not to force every insight to zero, but to judge whether the diagnostics that remain are acceptable.
      icon: i-lucide-search
      tone: slate
processFigure:
  title: Steps in the final adjustment
  steps:
    - title: Measure
      description: Review the mobile and desktop PageSpeed Insights results and the diagnostics that remained.
      icon: i-lucide-gauge
    - title: Reorganize
      description: Reassess the role of Cloudflare Web Analytics and stop the unnecessary beacon.
      icon: i-lucide-shield-check
    - title: Fix
      description: Unify dynamic icon rendering on the shared SVG Icon component and resolve the missing icon cases.
      icon: i-lucide-wrench
    - title: Decide
      description: Compare extra CSS splitting and third-party reduction ideas, then reject the options whose payoff is too small.
      icon: i-lucide-scale-3d
compareTable:
  title: What the final adjustment changed
  before:
    label: Before
    items:
      - Mobile scoring was already high, but the Cloudflare Web Analytics beacon still remained
      - The meaning of the remaining PageSpeed diagnostics was unclear, so it was hard to decide when to stop tuning
      - Some articles could show empty circles because of leftover UnoCSS icon classes
      - It was hard to tell when the remaining diagnostics should be accepted instead of chased further
  after:
    label: After
    items:
      - All four categories scored 100 on both mobile and desktop
      - Cloudflare Web Analytics was disabled and measurement was consolidated around GA4
      - Rendering was standardized on the shared SVG Icon component, with legacy icon names absorbed by aliases
      - Low-value extra optimizations were explicitly rejected, so the stopping point became clear
checklist:
  title: What was addressed
  items:
    - text: Disabled Cloudflare Web Analytics and stopped beacon injection
      checked: true
    - text: Confirmed perfect 100s across all PageSpeed Insights categories on both mobile and desktop
      checked: true
    - text: Interpreted the network dependency tree and concluded that BaseLayout.css is the only major remaining bottleneck
      checked: true
    - text: Migrated the dynamic icon classes in ProcessFigure and StatBar to the shared Icon component
      checked: true
    - text: Added alias compatibility for the legacy check-circle name
      checked: true
    - text: Compared further CSS splitting and extra third-party reduction ideas, then rejected them because complexity outweighed the gain
      checked: true
linkCards:
  - href: /blog/website-improvement-batches/
    title: 'Previous article: overall quality improvement overview'
    description: Start with the previous hub article to grasp the full picture of the 150+ improvements.
    icon: i-lucide-book-open
  - href: /blog/astro-performance-tuning/
    title: Performance optimization article
    description: A detailed explanation of CSS delivery strategy, fonts, images, and third-party script optimization.
    icon: i-lucide-gauge
  - href: /blog/astro-accessibility-guide/
    title: Accessibility article
    description: An article that organizes the concrete steps used to achieve WCAG AA compliance and Accessibility 100.
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: UX and code quality article
    description: A summary of quality improvements such as View Transitions, search, and type safety.
    icon: i-lucide-sparkles
faq:
  title: Frequently asked questions
  items:
    - question: If a site gets 100 on PageSpeed Insights, can it be called the fastest possible site?
      answer: 'Not in an absolute sense. PageSpeed Insights is a lab measurement driven by Lighthouse, so it does not fully capture real user networks, devices, or server congestion. Still, a 100 means the site is in a very high-quality state with few misses in the primary Lighthouse audits.'
    - question: Why can the network dependency tree or render-blocking CSS still appear when the score is 100?
      answer: 'Those items are not always failed audits. They can also appear as diagnostic information. In this case, only BaseLayout.css remains on the critical path, but mobile 100 is still maintained, so the current cost-benefit tradeoff is acceptable.'
    - question: Why was Cloudflare Web Analytics disabled?
      answer: 'GA4 was already sufficient for event measurement such as CTA clicks, search, and contact actions, while the Cloudflare side had become limited mainly to performance observation. This time I also considered the effect of the beacon on PageSpeed and consolidated measurement around GA4.'
    - question: Were there any optimizations that were tried but not adopted?
      answer: 'Yes. I compared ideas such as splitting BaseLayout.css further, trying to remove the network dependency tree display itself, and cutting even GA4 to minimize third-party weight. In the current state, however, mobile 100 is already maintained, and those options would add more complexity or measurement loss than practical value, so they were not adopted.'
---

## Introduction

In the previous [Astro Site Quality Improvement Guide](/blog/website-improvement-batches/), I summarized the large set of improvements applied to the renewed Acecore site. This article is the follow-up.

This article closes the smaller issues that remained after the previous article was published and brings the site to a state where **all four PageSpeed Insights categories scored 100 on both mobile and desktop**. Beyond score tuning, the work also included reorganizing the measurement stack, stabilizing icon rendering, and defining where further optimization was no longer worth adopting.

## Perfect 100s Across All PageSpeed Insights Categories

As of March 29, 2026, the Acecore home page produced the following results.

| Surface | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| Mobile | **100** | **100** | **100** | **100** |
| Desktop | **100** | **100** | **100** | **100** |

Below are the actual PageSpeed Insights screenshots together with the report URLs. In the previous round, I regarded “mobile 99 / everything else 100” as the realistic ceiling. This time, by removing unnecessary third-party beacons and carefully interpreting the meaning of the remaining diagnostics, I was able to reach 100.

### Report URLs

To keep the screenshots and directly reopenable evidence together, I am also leaving the report URLs used for this measurement here.

- [Mobile report](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile)
- [Desktop report](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop)

<figure class="not-prose my-8">
  <figcaption class="text-base font-700 text-slate-800 mb-3">Measured screenshots</figcaption>
  <p class="text-sm text-slate-500 mb-4">Click each image to open the corresponding PageSpeed Insights report.</p>
  <div class="grid gap-4 md:grid-cols-2">
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-mobile-summary-20260329.webp" alt="PageSpeed Insights mobile result for the Acecore top page as of March 29, 2026. Performance, Accessibility, Best Practices, and SEO are all 100." class="w-full rounded-lg border border-slate-200" width="1160" height="340" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">Mobile</span>
    </a>
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-desktop-summary-20260329.webp" alt="PageSpeed Insights desktop result for the Acecore top page as of March 29, 2026. Performance, Accessibility, Best Practices, and SEO are all 100." class="w-full rounded-lg border border-slate-200" width="1190" height="270" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">Desktop</span>
    </a>
  </div>
</figure>

## How impressive is a perfect 100?

A score of 100 can invite the reaction that Performance will always go up if you keep stripping features away, simplifying the UI, and removing outside dependencies. There is some truth in that: a static site often does get faster as you cut more things out.

But this case was not about building the thinnest possible demo page. The site still had to keep GA4, ads, search, ClientRouter, and shared CSS in place while aligning all four categories to 100 on both mobile and desktop. The work was not only about making the site lighter, but about deciding what to keep, what to remove, and what not to touch further.

Of course, a score of 100 does not mean it is absolutely the fastest site in the real world. Real user experience depends on network conditions, devices, regions, and cache state. Even so, it is fair to say that the site has reached a very high level in the sense that **the primary Lighthouse audits show no major misses while the required operational pieces are still in place**.

## Final adjustments that led to perfect 100s

### 1. Disabled Cloudflare Web Analytics and consolidated measurement around GA4

Cloudflare Web Analytics is useful as a privacy-first and lightweight RUM product, but on Acecore the GA4 side had already been broadly instrumented for CTA clicks, search, contact actions, lead generation, and other events.

After reviewing the roles again, I concluded that on the Cloudflare side the cost of injecting an unnecessary beacon into PageSpeed was now higher than the value it provided. I disabled RUM from the dashboard and confirmed that `static.cloudflareinsights.com/beacon.min.js` no longer appeared in the production HTML.

### 2. Interpreted the remaining PageSpeed diagnostics

Even after the score reaches 100, PageSpeed can still show diagnostics such as `Network dependency tree` and `render-blocking resources`. If you misread these as warnings that must always be eliminated, you can end up chasing low-value optimizations.

The critical chain in this case was roughly:

1. `/en/`
2. `ClientRouter.js`
3. `BaseLayout.css`
4. `BaseLayout.js`

Of these, the only item that still remained genuinely render-blocking was `BaseLayout.css`. However, the size is small enough that mobile 100 is still maintained, so for now I categorized it as “a remaining diagnostic that is acceptable.” Putting that judgment into words was itself an important gain, because it gives a clear stopping rule for future tuning.

### 3. Standardized icon rendering on a shared SVG component

As part of the final adjustment, the project was already moving from UnoCSS icon utilities to a shared SVG-based `Icon` component. In that transition, dynamic icon classes that remained in `ProcessFigure` and `StatBar` were left behind, which caused some places in articles to render as empty circles.

I unified rendering on the component side through `Icon` and also added an alias that maps the legacy name `check-circle` to `circle-check`.

As a result, three practical benefits were obtained:

- It becomes harder for icons to disappear because a dynamic class was missed
- Accessibility attributes such as `aria-hidden` can be standardized on the SVG side
- Operations become more stable because rendering no longer depends on UnoCSS static analysis

### 4. What I tested but did not adopt

Once a score of 100 appears, the easy trap is to keep chasing every remaining diagnostic until nothing is left on the screen. I compared several options in that direction, but did not adopt the following ones.

- Splitting `BaseLayout.css` even further: it might make the diagnostics look slightly cleaner, but mobile 100 is already maintained and the practical gain did not justify the extra complexity.
- Treating the mere presence of `network dependency tree` as something that had to disappear: a diagnostic being shown is not the same thing as a meaningful user-facing problem.
- Cutting even GA4 to minimize third-party weight: that could make the page slightly lighter, but the loss of business event measurement would be a worse trade-off.

That comparison mattered. It meant the final adjustment was complete not because everything possible had been removed, but because the remaining trade-offs were now explicit and defensible.

## Practical lessons from the final adjustment

The biggest gain this time was not simply getting a score of 100. It was reaching a state where **I can explain what should be removed and what is acceptable to leave in place**.

For example, Cloudflare Web Analytics is worth removing if it is only present by inertia, while GA4 should remain because it is central to business event measurement. And `network dependency tree` is not a failure by itself; you have to look inside it and decide whether the remaining chain is reasonable.

I also used AI to widen the set of candidate changes, but the final acceptance criteria stayed grounded in three things: whether measured results actually improved, whether operational cost stayed reasonable, and whether required measurement capabilities remained intact. AI helped broaden the search space; the final call still had to come from measurement and judgment.

If you optimize only for the score, tuning quickly goes too far. This time I was able to organize not only the fixes but also the boundary line for stopping, so it feels fair to say that the Acecore site improvements have, for now, reached a complete state.

## Summary

As a continuation of the previous article, the final adjustment covered the following work:

- Confirmed perfect 100s across all PageSpeed Insights categories on both mobile and desktop
- Disabled Cloudflare Web Analytics and consolidated measurement around GA4
- Interpreted the remaining network diagnostics and clarified which residual issues are acceptable
- Eliminated missing icon rendering by standardizing on a shared SVG `Icon`
- Rejected low-value extra optimizations and made the stopping point explicit

At least from the perspective of Lighthouse and PageSpeed Insights, the Acecore site has been tuned to the point where it can legitimately aim for top-tier speed. At the same time, the score is not the goal, only the result. Going forward, I will keep both operations and improvements in place so this state does not regress.
