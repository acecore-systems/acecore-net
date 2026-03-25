---
title: 'A Practical Guide to Making Your Astro Site WCAG AA Compliant'
description: 'A comprehensive guide to accessibility improvements implemented on an Astro + UnoCSS site. Covers aria attributes, contrast, focus management, form validation, screen reader support, and everything needed for WCAG AA compliance.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'アクセシビリティ']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: Accessibility Is UX Improvement for Everyone
  text: 'Accessibility is not just for people with disabilities. Keyboard navigation, contrast, and focus indicators directly improve usability for all users. The more you invest in accessibility, the better your overall site quality becomes.'
processFigure:
  title: Accessibility Improvement Workflow
  steps:
    - title: Automated Testing
      description: Use axe DevTools and Lighthouse to identify machine-detectable issues.
      icon: i-lucide-scan
    - title: Manual Testing
      description: Try navigating with keyboard and screen reader yourself.
      icon: i-lucide-hand
    - title: Fix
      description: Add aria attributes, fix contrast, and add focus styles.
      icon: i-lucide-wrench
    - title: Re-test
      description: Confirm a score of 100 on PageSpeed Accessibility.
      icon: i-lucide-check-circle
checklist:
  title: WCAG AA Compliance Checklist
  items:
    - text: Text contrast ratio is 4.5:1 or higher (3:1 for large text)
      checked: true
    - text: All interactive elements have focus-visible styles
      checked: true
    - text: Decorative icons have aria-hidden="true"
      checked: true
    - text: External links have screen reader notifications
      checked: true
    - text: Forms have inline validation with aria-invalid integration
      checked: true
    - text: Images have width/height attributes (CLS prevention)
      checked: true
    - text: List elements have role="list" (list-style:none workaround)
      checked: true
faq:
  title: Frequently Asked Questions
  items:
    - question: What's the difference between axe DevTools and Lighthouse?
      answer: 'Lighthouse is a comprehensive audit tool covering performance and SEO as well, checking only a subset of accessibility items. axe DevTools specializes in accessibility and performs more detailed checks with a larger rule set. Using both together is recommended.'
    - question: Should aria attributes be added to every element?
      answer: 'No. If HTML semantics are correct, aria is unnecessary. Aria attributes are meant to supplement "information that HTML alone cannot convey." Overusing them can make screen reader output overly verbose.'
    - question: Does a PageSpeed Accessibility score of 100 mean WCAG compliance?
      answer: 'Even a score of 100 doesn''t guarantee full WCAG compliance. Lighthouse has limited check items, and some criteria can only be verified manually (logical reading order, appropriate alt text, etc.). Both automated and manual testing are necessary.'
---

## Introduction

"Accessibility" might seem like something easy to put off. But when you actually work on it, you realize that improving contrast, keyboard navigation, and focus indicators directly enhances usability for every user.

This article introduces the improvements made to achieve a PageSpeed Accessibility score of 100 on an Astro + UnoCSS site, organized by category.

---

## aria-hidden for Decorative Icons

UnoCSS Iconify icons (`i-lucide-*`) are often used as visual decoration, but when screen readers read them aloud, they announce "image" or "unknown image," which causes confusion.

### Solution

Add `aria-hidden="true"` to decorative icons.

```html
<span class="i-lucide-mail" aria-hidden="true"></span>
Contact
```

This was applied to over 30 icons across the site. Be careful not to miss icons inside components like StatBar, Callout, ServiceCard, and ProcessFigure.

---

## Screen Reader Notifications for External Links

External links opened with `target="_blank"` visually indicate they open in a new tab, but this isn't communicated to screen reader users.

### Solution

Add visually hidden supplementary text to external links.

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  Example
  <span class="sr-only">(opens in a new tab)</span>
</a>
```

Using the `rehype-external-links` plugin, `target="_blank"` and `rel` can be automatically added to external links in Markdown. The SR notification text is added on the template side.

---

## Ensuring Contrast

Insufficient contrast is the most common issue flagged by PageSpeed Insights.

### Common Problem

Using `text-slate-400` from UnoCSS's color palette results in a contrast ratio of about 3:1 against a white background, failing the WCAG AA requirement of 4.5:1.

### Solution

Changing `text-slate-400` → `text-slate-500` (contrast ratio 4.6:1) clears the requirement. This is commonly used for supplementary text like dates and captions, so check across the entire site.

---

## focus-visible Styles

For users who navigate sites with a keyboard, focus indicators are the only way to know "where I am now." WCAG 2.4.7 requires focus visibility.

### Implementation with UnoCSS

Set common focus styles for buttons and links. Using UnoCSS's shortcut feature, you can define it in one place and apply it everywhere.

```typescript
shortcuts: {
  'ac-btn': '... focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none',
}
```

`focus-visible` is a pseudo-class that shows the ring only during keyboard navigation, not on mouse clicks. It provides better UX than `focus`, so use this one.

### Elements Often Overlooked

- Copy buttons
- Scroll-to-top button
- Anchor ad close button
- Modal close buttons

---

## Underlines on Inline Links

PageSpeed may flag "Links are identifiable only by color." This is a problem for users with color vision deficiencies who cannot distinguish links.

### Solution

Make underlines always visible instead of only on hover. Using UnoCSS shortcuts for consistency is recommended.

```typescript
shortcuts: {
  'ac-link': 'underline decoration-brand-300 underline-offset-2 hover:decoration-brand-500 transition-colors',
}
```

---

## Form Accessibility

Accessibility is especially important where users provide input, such as contact forms.

### Inline Validation

Display error messages immediately on `blur`/`input` events, coordinating with the following aria attributes:

- `aria-invalid="true"` — Notifies that the input is invalid
- `aria-describedby` — References the error message's ID

```html
<input
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<p id="email-error" role="alert">Please enter a valid email address</p>
```

### Required Field Markers

A visual `*` mark alone is insufficient. Add supplementary text for screen readers.

```html
<span aria-hidden="true">*</span>
<span class="sr-only">(required)</span>
```

---

## role Attribute on figure Elements

Setting `role="img"` on `<figure>` elements hides child elements from screen readers. For components containing icons and descriptive text (InsightGrid, ProcessFigure, Timeline), change to `role="group"` to keep internal content accessible.

---

## role Attribute on List Elements

When CSS `list-style: none` is applied, Safari's screen reader (VoiceOver) has a known bug where it no longer recognizes the element as a list.

Add `role="list"` to `<ol>` / `<ul>` elements in breadcrumbs, sidebars, and footers. Check all lists with customized appearance.

---

## Other Improvements

### width/height Attributes on Images

Images without explicit `width` and `height` cause layout shifts (CLS — Cumulative Layout Shift) when loading completes. Specify sizes for all images, including avatars (32×32, 48×48, 64×64px) and YouTube thumbnails (480×360px).

### aria-live on Hero Slider

Auto-rotating sliders don't communicate changes to screen reader users. Prepare an `aria-live="polite"` region and notify with text like "Slide 1 / 4: [title]."

### aria-labelledby on dialog

Reference the title element's ID with `aria-labelledby` on `<dialog>` elements so screen readers can announce the modal's purpose.

### aria-current on Pagination

Set `aria-current="page"` on the current page number to notify screen readers that it is "the current page."

### Copy Button aria-label Update

When clipboard copy succeeds, dynamically update `aria-label` to "Copied" to notify screen readers of the state change.

---

## Summary

Accessibility improvements are small individual changes, but together they significantly improve overall site quality. The three most impactful changes were:

1. **Applying focus-visible globally**: Dramatically improved keyboard navigation
2. **Fixing contrast ratios**: Simply changing `text-slate-400` → `text-slate-500` cleared WCAG AA
3. **SR notifications for external links**: Combined with `rehype-external-links` for automated coverage of all links

Start by scanning your site with axe DevTools and tackling the automatically detectable issues first.

---

## Part of a Series

This article is part of the "[Astro Site Quality Improvement Guide](/blog/website-improvement-batches/)" series. Separate articles cover performance, SEO, and UX improvements as well.
