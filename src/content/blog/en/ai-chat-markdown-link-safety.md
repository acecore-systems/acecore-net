---
title: 'Safely Rendering Markdown Links in AI Chat Answers'
description: 'An implementation note on converting Markdown links in AI chat answers into safe HTML. By separating whitespace-tolerant parsing, href trimming, allowlist validation, DOM rendering, fallbacks, and test cases, the same pattern can be reused on other sites.'
date: 2026-06-07T14:30
author: gui
tags: ['技術', 'Webサイト', 'AI', 'セキュリティ', 'Astro']
image: https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Key Point
  text: AI answers are not trusted HTML. Even when Markdown links are useful, trim the URL first, validate it through an allowlist, and leave disallowed links as text instead of turning them into anchors.
processFigure:
  title: Link Rendering Flow for AI Answers
  steps:
    - title: Text
      description: Treat the model answer as plain text first.
      icon: i-lucide-message-square-text
      accent: brand
    - title: Parse
      description: Detect only the Markdown features the chat actually supports.
      icon: i-lucide-brackets
      accent: amber
    - title: Validate
      description: Trim href values and allow only internal URLs or approved domains.
      icon: i-lucide-shield-check
      accent: emerald
    - title: Render
      description: Create safe elements with the DOM API instead of using innerHTML.
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: Rendering Decisions to Separate
  before:
    label: Loose Rendering
    items:
      - Putting AI answers directly into innerHTML
      - Trying to implement the whole Markdown specification at once
      - Failing to link URLs with spaces around them
      - 'Treating external URLs and javascript: URLs the same way'
  after:
    label: Small and Safe Rendering
    items:
      - Receive answers as text and turn only needed features into DOM nodes
      - Support only the Markdown subset used in chat
      - Validate URLs after trimming
      - Leave disallowed URLs as plain text
checklist:
  title: Implementation Checklist
  items:
    - text: Do not trust AI answers as HTML
    - text: Accept whitespace around Markdown link URLs
    - text: Always trim href values before validation
    - text: Allow only internal paths, the current origin, and required external domains
    - text: Set target and rel explicitly for external links
    - text: Preserve disallowed links as text
    - text: Test dangerous URLs and broken Markdown, not only happy paths
linkCards:
  - href: /blog/astro-ai-contact-chat/
    title: AI Contact Chat Technical Design
    description: The parent article covering AI answers, API boundaries, and prompt controls.
    icon: i-lucide-sparkles
  - href: /blog/cloudflare-pages-security/
    title: Cloudflare Pages Security
    description: A related article on CSP and security headers.
    icon: i-lucide-shield
  - href: /contact/
    title: Contact
    description: The actual page where the AI chat and form are placed.
    icon: i-lucide-message-square
faq:
  title: FAQ
  items:
    - question: Is using markdown-it or marked enough?
      answer: Even with a library, you still need to decide how HTML output is handled, which link targets are allowed, whether target and rel are added, and how dangerous URLs are rejected. For chat, a small custom renderer can be enough.
    - question: Does allowing whitespace around URLs make it unsafe?
      answer: The whitespace itself is not the risk. The important part is validating the trimmed href. That makes the renderer tolerant of model formatting while keeping the allowlist strict.
    - question: Should disallowed URLs be removed?
      answer: Usually keeping them as text is easier to debug and preserves context for the user. If your policy requires hiding suspicious strings, dropping the whole link is also valid.
---

When an AI chat returns `See [Services]( /services/ ) for details`, the link can fail to render and the raw Markdown can remain on screen.

Acecore hit this in the contact AI chat and adjusted the renderer in [the PR that fixed Markdown link rendering](https://github.com/acecore-systems/acecore-net/pull/99).

This article uses that small fix as a starting point for safely converting AI answers into DOM nodes.

## AI Answers Are Not Trusted HTML

Start by treating AI output as text, not HTML.

Links, bold text, and lists are useful in a chat UI, but placing the answer directly into `innerHTML` lets the browser interpret whatever string the model produced.

You do not need a complete Markdown implementation. You need a small renderer that detects the few features the chat supports and creates only safe DOM nodes.

## The Problem Is Not Only Whitespace

The immediate bug was a link like this:

```md
[Services](/services/)
```

A human can read it, but a regular expression that treats the URL as a string without whitespace will not match it.

The stricter pattern looked like this:

```js
;/\[([^\]]+)\]\(([^)\s]+)\)/
```

`[^)\s]+` rejects spaces, so `( /services/ )` is not parsed as a link. The fix is to tolerate whitespace inside the parentheses and normalize the URL afterward.

```js
;/\[([^\]]+)\]\(\s*([^)]+?)\s*\)/
```

Do not stop at loosening the pattern. The next steps must normalize and validate the href.

## Trim href Before Validation

The order should be fixed:

1. Extract the label and raw href from Markdown
2. `trim()` the raw href
3. Validate the trimmed href through an allowlist
4. Create an anchor only when the href is allowed

```js
const href = String(rawHref || '').trim()

if (label && isSafeMarkdownHref(href)) {
  const link = document.createElement('a')
  link.href = href
  link.rel = 'noopener noreferrer'

  if (/^https?:\/\//i.test(href)) {
    link.target = '_blank'
  }

  link.textContent = label
  parent.appendChild(link)
}
```

Validate the same value you render. If validation checks one value and the DOM receives another, the safety check becomes weaker.

## Make the Allowlist Product-Specific

Each site should decide which URLs its AI may show.

For Acecore's contact AI, the allowed set is roughly:

| Type           | Example                   | Decision                           |
| -------------- | ------------------------- | ---------------------------------- |
| Internal path  | `/services/`              | Allow                              |
| Same origin    | `https://acecore.net/...` | Allow                              |
| Official LINE  | `https://lin.ee/...`      | Allow because the purpose is clear |
| mailto         | `mailto:info@acecore.net` | Allow only the fixed address       |
| tel            | `tel:05088902788`         | Allow only the fixed number        |
| Other external | Any URL                   | Usually do not link                |

The implementation can look like this:

```js
function isSafeMarkdownHref(href) {
  if (href.startsWith('/')) return true

  try {
    const url = new URL(href, window.location.origin)
    if (url.origin === window.location.origin) return true
    if (url.hostname === 'acecore.net') return true
    if (url.hostname === 'lin.ee') return true
  } catch {
    return false
  }

  return href === 'mailto:info@acecore.net' || href === 'tel:05088902788'
}
```

This function should change by product. A recruiting site may allow job boards, an ecommerce site may allow payment or tracking domains, and a SaaS product may allow documentation and status pages.

## Fall Back to Text for Disallowed Links

Decide what happens when a link fails validation.

For a contact AI, preserving the original Markdown as text is usually better than deleting it. The user keeps the context, and developers can see what the model tried to output.

The renderer is responsible not only for creating safe links, but also for failing safely when a link cannot be created.

## Prepare Test Cases Early

This kind of renderer is easy to under-test if you only check happy paths.

At minimum, test these cases:

| Input                                | Expected Result                         |
| ------------------------------------ | --------------------------------------- |
| `[Services](/services/)`             | Internal link                           |
| `[Services]( /services/ )`           | Trimmed internal link                   |
| `[LINE]( https://lin.ee/example )`   | External approved link                  |
| `[Bad](javascript:alert(1))`         | Not linked                              |
| `[External](https://example.com/)`   | Not linked if the domain is not allowed |
| `[Broken](/services/`                | Rendered as text                        |
| `` `code` and [link]( /contact/ ) `` | Code and link both render correctly     |

In PR #99, we confirmed that `[Services]( /services/ )`, `[Services](/services/)`, and `[LINE]( https://lin.ee/DjIrdqj )` resolve to the same intended URLs.

## Do Not Implement All of Markdown by Default

The Markdown subset for an AI chat can stay small:

- Paragraphs
- Lists
- Bold text
- Inline code
- Links

Tables, images, raw HTML, footnotes, and deep heading structures expand the renderer's responsibility quickly. A chat UI only needs readable guidance.

If you use a mature Markdown library later, still decide separately whether HTML is allowed, how URLs are restricted, and which attributes are added to external links.

## Summary

Markdown link rendering in AI chat looks like a small UI fix, but it is really a boundary decision about how much AI output is trusted.

The important points are:

- Treat AI answers as text, not HTML
- Convert only the required Markdown subset into DOM nodes
- Accept whitespace around Markdown link URLs
- Trim href values before safety checks
- Allow only internal URLs and required external domains
- Preserve disallowed links as text
- Test broken Markdown and dangerous URLs

The more AI is used in site navigation, the more link rendering matters. Convenient Markdown support and strict link control should be designed together.
