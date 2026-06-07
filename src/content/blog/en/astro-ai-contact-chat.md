---
title: 'Technical Design for Adding an AI Contact Chat to an Astro Site'
description: 'A practical design guide for adding an AI contact chat to a static Astro + Cloudflare Pages site with the OpenAI Responses API. It covers API boundaries, site context, prompt controls, locale-aware URLs, Origin checks, rate limiting, and safe Markdown link rendering.'
date: 2026-06-07T12:00
author: gui
tags: ['技術', 'Cloudflare', 'Webサイト', 'AI', 'サービス']
image: https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: Key Point
  text: The AI contact chat is not a free-form answer box. It is a small application that uses public site information to guide visitors to the right next step. API keys, prompts, contact details, and Markdown rendering are controlled through the server side and allowlists.
processFigure:
  title: Reference Architecture
  steps:
    - title: Widget
      description: The Astro chat UI sends only the question, current locale, and minimal history.
      icon: i-lucide-message-circle
      accent: brand
    - title: Function
      description: The Cloudflare Pages Function handles validation, Origin checks, rate limiting, and prompt construction.
      icon: i-lucide-shield-check
      accent: amber
    - title: Model
      description: The OpenAI Responses API receives public site context and conversation state, then returns the answer.
      icon: i-lucide-sparkles
      accent: emerald
    - title: Renderer
      description: The client renders only allowed Markdown and sends users to internal links or approved contact channels.
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: Responsibilities to Separate
  before:
    label: When Everything Is Mixed
    items:
      - Calling the AI API directly from the browser
      - Mixing site context, API keys, UI display, and link rendering
      - Letting the AI make firm statements about pricing, contracts, or schedules
      - Rendering Markdown and URLs directly as HTML
  after:
    label: When Responsibilities Are Split
    items:
      - Keep API keys and model calls on the server side
      - Manage public site information as explicit context
      - Control answer scope and contact routing through prompts
      - Render Markdown and URLs through allowlists
checklist:
  title: Design Checklist for Other Sites
  items:
    - text: Define the chat as route guidance, not as a complete inquiry replacement
    - text: Create a server-side API boundary and never expose the API key to the browser
    - text: Restrict answers to public site information
    - text: Decide what the AI must not assert, such as pricing, contracts, schedules, and guarantees
    - text: Define when to use forms, LINE, email, and phone
    - text: Generate locale-aware URLs so multilingual navigation stays intact
    - text: Add Origin checks, input length limits, history limits, and rate limiting
    - text: Trim Markdown link URLs before allowlist validation
linkCards:
  - href: /contact/
    title: Contact
    description: The page that organizes the AI chat, LINE, contact form, and direct contact options.
    icon: i-lucide-message-square
  - href: /blog/cloudflare-pages-security/
    title: Cloudflare Pages Security
    description: A related article on CSP and security headers for static site delivery.
    icon: i-lucide-shield
  - href: /blog/cms-selection-and-turnstile/
    title: CMS Selection and Turnstile
    description: A related article on form operations and bot protection.
    icon: i-lucide-badge-check
faq:
  title: Frequently Asked Questions
  items:
    - question: Do I need RAG or a vector database to build an AI contact chat?
      answer: For a small corporate site, structured public site context in the prompt is often enough. Search indexes or vector databases can be added later when page count or update frequency grows.
    - question: Is the OpenAI API key exposed to the browser?
      answer: No. The browser only sends the question to /api/ai-contact. The Cloudflare Pages Function calls the OpenAI Responses API and manages the API key.
    - question: Can the AI output any link it wants?
      answer: No. Links are restricted to internal paths, the current origin, acecore.net, the official LINE URL, and specific mailto or tel links when needed. Markdown URLs are trimmed before safety checks.
---

Adding an AI chat to a website is easy. Running it responsibly is where the design matters. The difficult parts are not only model quality, but deciding what the AI may answer, where it should send visitors, which URLs may be displayed, and how API cost is controlled.

Acecore added an AI contact chat to a static Astro + Cloudflare Pages site. The main implementation is in [the PR that added the contact AI and CMS-scoped translation flow](https://github.com/acecore-systems/acecore-net/pull/98). We later tightened safe Markdown link rendering in [a separate PR](https://github.com/acecore-systems/acecore-net/pull/99). The link-rendering details are covered separately in [Safely Rendering Markdown Links in AI Chat Answers](/blog/ai-chat-markdown-link-safety/).

This article explains the design as a reusable pattern for other static sites. The same structure works beyond Astro: split the responsibilities between the client widget, server-side API boundary, prompt construction, and renderer.

## Overall Structure

The architecture has three simple layers.

| Layer                | Responsibility                                                          |
| -------------------- | ----------------------------------------------------------------------- |
| Chat widget          | UI, input, current locale, minimal history, and Markdown rendering      |
| `/api/ai-contact`    | Validation, Origin checks, rate limiting, prompt construction, AI calls |
| OpenAI Responses API | Generate an answer from public site context and conversation state      |

The browser should not call the OpenAI API directly. Keeping the model call behind a server-side endpoint prevents key exposure, lets you update prompts and site context without redeploying the UI, and centralizes input limits and error handling.

On Astro + Cloudflare Pages, the API boundary can be a Pages Function at `/api/ai-contact`. In Next.js it could be a Route Handler; in Hono or Express it can be a normal API route.

## Keep the Endpoint Contract Small

The request payload should stay narrow.

```ts
type ContactAiRequest = {
  message: string
  locale: 'ja' | 'en' | 'zh-cn' | 'es' | 'pt' | 'fr' | 'ko' | 'de' | 'ru'
  history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

type ContactAiResponse = {
  answer: string
}
```

Names, email addresses, phone numbers, company names, and detailed form fields do not need to go through the AI chat. The chat is an entry point for helping users decide which service to read about and which contact route to use.

History should also be limited. Send only recent turns and enforce a character limit per message. This keeps prompts smaller and controls API cost.

## Control Validation and Model Calls on the Server

The Pages Function owns the safety and execution boundary.

```ts
export async function onRequestPost({ request, env }: PagesFunction<Env>) {
  assertSameOrigin(request)
  assertRateLimit(request)

  const body = await request.json()
  const message = validateMessage(body.message)
  const locale = validateLocale(body.locale)
  const history = trimHistory(body.history)

  const prompt = buildContactPrompt({
    locale,
    message,
    history,
    siteContext: buildPublicSiteContext(locale),
  })

  const answer = await callOpenAIResponsesApi({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    prompt,
  })

  return Response.json({ answer })
}
```

The important point is to reduce and validate input before calling the AI API. Long messages, unlimited history, and uncontrolled cross-site traffic can make operations unstable before the feature itself becomes useful.

`OPENAI_MODEL` should be configurable through environment variables so the model can be changed in preview or production without touching the frontend. `OPENAI_API_KEY` must stay server-side.

See also [Secure Static Site Delivery with Cloudflare Pages](/blog/cloudflare-pages-security/) for the surrounding delivery and CSP setup.

## Make Site Information Explicit Context

For a site of this size, you do not need to start with a vector database. A structured prompt context made from public site information is easier to operate.

Useful context includes:

- Company and service summaries
- Target users, example consultations, and related URLs for each service
- FAQ content that already answers common questions
- Rules for forms, LINE, email, and phone
- Areas the AI must not assert, such as pricing, contracts, or schedules
- Internal URLs for each locale

The goal is not to let the model answer from what it generally knows. The goal is to tell it what this site is allowed to say.

```ts
function buildPublicSiteContext(locale: Locale) {
  return {
    services: [
      {
        name: 'Web production',
        summary: 'Corporate sites, recruiting sites, and landing pages',
        url: localizePath('/services/web-production/', locale),
      },
      {
        name: 'Business systems',
        summary: 'Reservation, inventory, and customer management systems',
        url: localizePath('/services/business-system/', locale),
      },
    ],
    contact: {
      form: localizePath('/contact/', locale),
      line: 'https://lin.ee/...',
      emailPolicy:
        'Show email only when the form cannot be used or follow-up is needed',
      phonePolicy: 'Show phone only for urgent confirmation',
    },
  }
}
```

When the site grows, this layer can evolve toward Pagefind, CMS JSON, D1, Vectorize, or another retrieval mechanism.

## Write Rules, Not Only Tone Instructions

The prompt should define answer boundaries and restrictions more than writing style.

```txt
You are the contact guidance AI for this website.
Answer only from public site information.

Rules:
- Do not make firm statements about pricing, contracts, schedules, or guarantees
- Send formal consultations and estimates to the contact form
- Also suggest LINE for short questions and school-related inquiries
- Show email and phone only when the user asks for direct contact
- Use URLs that match the current locale
- If unsure, do not guess; guide the user to the form
```

The common failure mode is that the AI tries to be helpful by over-committing. Questions about cost, delivery dates, and guarantees should lead to general guidance and then the form, because those answers require human confirmation.

## Split the Contact Routes

The AI chat should not replace the contact form. The contact page works better when each route has a clear role.

| Route          | Role                                                             |
| -------------- | ---------------------------------------------------------------- |
| FAQ            | Resolve common questions on the page                             |
| AI chat        | Help visitors choose services, contact routes, and related pages |
| LINE           | Short questions, school-related topics, and lightweight checks   |
| Form           | Estimates, production inquiries, partnerships, and recruiting    |
| Direct contact | Follow-up after the form or urgent confirmation only             |

The AI connects broad service content such as the [service overview article](/blog/service-introduction/) with concrete routes on the [contact page](/contact/). This pattern works for B2B sites, agencies, schools, and SaaS support pages.

## Preserve Locale-Aware URLs

On a multilingual site, the answer language is not enough. URLs also need to match the current locale.

If a user asks from an English page, the answer should be in English and service links should point to paths such as `/en/services/`. Japanese can use `/services/`.

```ts
function localizePath(path: string, locale: Locale) {
  if (locale === 'ja') return path
  return `/${locale}${path}`
}
```

This is more reliable as server-side URL generation than as a loose instruction in the prompt. For more on the translation setup, see [the Copilot translation pipeline article](/blog/copilot-translation-pipeline/).

## Add Origin Checks and Rate Limiting

Because `/api/ai-contact` is public, it should have at least Origin checks, input length limits, history limits, and rate limiting.

```ts
function assertSameOrigin(request: Request) {
  const origin = request.headers.get('Origin')
  if (!origin) return

  const requestUrl = new URL(request.url)
  const originUrl = new URL(origin)

  if (originUrl.host !== requestUrl.host) {
    throw new Response('Forbidden', { status: 403 })
  }
}
```

IP-based rate limiting is a useful first brake. In Cloudflare, you can derive identifiers from headers such as `CF-Connecting-IP`, `X-Forwarded-For`, or `CF-Ray`.

In-memory limits are not persistent across isolates or restarts, so they are only an initial layer. For heavier traffic, move enforcement toward Cloudflare WAF, Turnstile, KV, D1, or Durable Objects. See [the CMS and Turnstile article](/blog/cms-selection-and-turnstile/) for form-side bot protection.

## Render Markdown Links with an Allowlist

Links make the chat useful, but Markdown should not be passed directly to HTML. The client renderer should only support the small subset you need:

- Paragraphs
- Lists
- Bold text
- Inline code
- Markdown links

Then restrict link targets:

- Internal paths such as `/services/`
- The current origin
- `https://acecore.net`
- Official LINE URLs
- `mailto:info@acecore.net` when needed
- `tel:05088902788` when needed

Always `trim()` the URL before validation. AI output can contain spaces such as `[Services]( /services/ )`.

```ts
function sanitizeHref(rawHref: string, currentOrigin: string) {
  const href = rawHref.trim()

  if (href.startsWith('/')) return href
  if (href.startsWith(`${currentOrigin}/`)) return href
  if (href.startsWith('https://acecore.net/')) return href
  if (href.startsWith('https://lin.ee/')) return href
  if (href === 'mailto:info@acecore.net') return href
  if (href === 'tel:05088902788') return href

  return null
}
```

A small, strict renderer is easier to reason about than a full Markdown implementation. If you allow more external links, at least use a domain allowlist and `rel="noopener noreferrer"`.

## Test Local, Preview, and Production Separately

Astro dev or preview is not identical to the Cloudflare Pages Functions environment. Without `OPENAI_API_KEY`, local testing should focus on UI fallback and error states.

In Pages preview or production, check:

- `/api/ai-contact` accepts POST requests
- `OPENAI_API_KEY` and `OPENAI_MODEL` are configured
- Cross-origin requests are rejected
- Input length and history count are limited
- Answers match the current locale
- Internal links use locale-aware URLs
- The AI does not assert estimates or contracts
- Email and phone are not shown by default
- Markdown links are converted only when the URL is allowed

Do not finish validation after one successful question. Test long input, unexpected questions, English pages, direct-contact requests, and pricing questions separately.

## Watch the Right Operational Signals

After release, watch more than page views.

- API error rate
- Rate-limit hits
- Average messages per inquiry
- Clicks to the form and LINE
- Cases where the AI could not answer and guided users to the form
- Usage by locale

If you store conversation text, define the privacy rules first. A safer first step is to store event counts and errors without message bodies.

## What Is Left for Another Article

This article focuses only on the technical design of the AI contact chat. Passing service-page context into the contact form is also implemented, and that is covered in [Technical design for passing context from a service CTA to the contact form](/blog/service-cta-contact-prefill/).

- AI chat: organize uncertainty through conversation and guide users safely
- Service CTA: pass the service context a visitor is reading into the form

Keeping these topics separate makes both articles easier to read and easier to cross-link later.

## Summary

When adding an AI contact chat to a static site, design the API boundary and answer controls before polishing the UI.

The key decisions were:

- Call OpenAI from a Cloudflare Pages Function, not the browser
- Keep endpoint input small and limit history and message length
- Build site context and locale-aware URLs on the server side
- Put clear boundaries in the prompt for what the AI may not assert
- Split the roles of forms, LINE, and direct contact
- Add Origin checks and rate limiting
- Render Markdown links through a trimmed allowlist

Static sites can support useful AI contact chats. The point is not to make the AI visible, but to help visitors choose their next action safely.
