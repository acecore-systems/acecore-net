---
title: 'Технический дизайн AI-чата для обращений на сайте Astro'
description: 'Практический дизайн AI-чата для обращений на статическом сайте Astro + Cloudflare Pages с OpenAI Responses API. Рассмотрены граница API, контекст сайта, управление prompt, URL по locale, проверка Origin, rate limit и безопасный рендеринг Markdown-ссылок.'
date: 2026-06-07T12:00
author: gui
tags: ['技術', 'Cloudflare', 'Webサイト', 'AI', 'サービス']
image: https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: Главное
  text: AI-чат для обращений не является свободным полем ответов. Это небольшое приложение, которое использует публичную информацию сайта и помогает посетителю выбрать следующий шаг. API keys, prompts, контакты и Markdown контролируются сервером и allowlist.
processFigure:
  title: Референсная архитектура
  steps:
    - title: Widget
      description: UI чата в Astro отправляет только вопрос, текущий locale и минимальную историю.
      icon: i-lucide-message-circle
      accent: brand
    - title: Function
      description: Cloudflare Pages Function проверяет ввод, Origin, rate limit и собирает prompt.
      icon: i-lucide-shield-check
      accent: amber
    - title: Model
      description: OpenAI Responses API получает публичный контекст сайта и состояние диалога.
      icon: i-lucide-sparkles
      accent: emerald
    - title: Renderer
      description: Клиент рендерит только разрешенный Markdown и ведет к внутренним ссылкам или одобренным контактам.
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: Ответственности, которые нужно разделить
  before:
    label: Если все смешано
    items:
      - AI API вызывается прямо из браузера
      - Контекст сайта, API key, UI и рендеринг ссылок смешаны
      - AI может слишком уверенно утверждать цены, договоры или сроки
      - Markdown и URL могут попасть в HTML без контроля
  after:
    label: Если ответственности разделены
    items:
      - API key и вызов модели остаются на сервере
      - Публичная информация сайта управляется как явный контекст
      - Prompt контролирует область ответа и маршруты контакта
      - Markdown и URL проходят через allowlist
checklist:
  title: Чеклист для внедрения на других сайтах
  items:
    - text: Определить чат как навигационную помощь, а не замену формы
    - text: Создать серверную границу API и не раскрывать API key в браузере
    - text: Ограничить ответы публичной информацией сайта
    - text: Определить, что AI не должен утверждать, например цены, договоры, сроки и гарантии
    - text: Разделить роли формы, LINE, email и телефона
    - text: Генерировать URL по locale, чтобы не ломать многоязычную навигацию
    - text: Добавить Origin check, лимиты длины, лимиты истории и rate limiting
    - text: Делать trim URL в Markdown-ссылках перед проверкой allowlist
linkCards:
  - href: /contact/
    title: Контакты
    description: Страница, где собраны AI-чат, LINE, форма и прямые контакты.
    icon: i-lucide-message-square
  - href: /blog/cloudflare-pages-security/
    title: Безопасность Cloudflare Pages
    description: Связанная статья о CSP и security headers для статических сайтов.
    icon: i-lucide-shield
  - href: /blog/cms-selection-and-turnstile/
    title: Руководство по внедрению Sveltia CMS
    description: Связанная статья о добавлении CMS-редактора к статическому сайту.
    icon: i-lucide-badge-check
faq:
  title: Частые вопросы
  items:
    - question: Нужны ли RAG или векторная база для такого AI-чата?
      answer: Для небольшого корпоративного сайта часто достаточно структурированного публичного контекста в prompt. Поиск или векторную базу можно добавить позже, когда вырастет число страниц или частота обновлений.
    - question: Видит ли браузер OpenAI API key?
      answer: Нет. Браузер отправляет вопрос только в /api/ai-contact. Cloudflare Pages Function вызывает OpenAI Responses API и хранит API key.
    - question: Может ли AI выводить любые ссылки?
      answer: Нет. Разрешены внутренние пути, текущий origin, acecore.net, официальный LINE и необходимые mailto или tel. Markdown URL очищаются через trim перед проверкой.
---

Добавить AI-чат на сайт несложно. Сложнее сделать это пригодным для эксплуатации: определить, что AI может отвечать, куда направлять посетителя, какие URL показывать и как контролировать стоимость API.

На сайте Acecore AI-чат для обращений был добавлен в статическую архитектуру Astro + Cloudflare Pages. Основная реализация находится в [PR с AI для контактов и CMS-ограниченным потоком переводов](https://github.com/acecore-systems/acecore-net/pull/98). Затем безопасный рендеринг Markdown-ссылок был доработан в [отдельном PR](https://github.com/acecore-systems/acecore-net/pull/99). Подробности вынесены в статью [Безопасный рендеринг Markdown-ссылок в ответах AI-чата](/blog/ai-chat-markdown-link-safety/).

Эта статья описывает не только конкретную работу, а повторно используемый технический дизайн для других статических сайтов. Даже вне Astro принцип тот же: разделить клиентский widget, API-границу, prompt и renderer.

## Общая структура

| Слой                 | Ответственность                                                   |
| -------------------- | ----------------------------------------------------------------- |
| Chat widget          | UI, ввод, текущий locale, минимальная история, Markdown rendering |
| `/api/ai-contact`    | Валидация, Origin check, rate limit, prompt, вызов OpenAI         |
| OpenAI Responses API | Генерация ответа из публичного контекста и состояния диалога      |

Браузер не должен вызывать OpenAI напрямую. Серверный endpoint скрывает ключ, позволяет менять prompt и контекст на сервере, а также централизует лимиты и ошибки.

В Astro + Cloudflare Pages это можно реализовать как Pages Function `/api/ai-contact`. В Next.js это был бы Route Handler, в Hono или Express обычный API route.

## Держать контракт endpoint небольшим

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

Имя, email, телефон, компания и подробные поля формы не должны проходить через чат. Его задача — помочь выбрать услугу и канал обращения, а не собирать персональные данные.

История тоже ограничивается несколькими последними сообщениями и максимальной длиной. Это уменьшает prompt и стоимость.

## Управлять валидацией и вызовом модели на сервере

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

Главное — уменьшить и проверить ввод до вызова AI API. Длинные сообщения, бесконечная история и внешние повторные запросы быстро делают эксплуатацию нестабильной.

`OPENAI_MODEL` лучше хранить в переменной окружения, а `OPENAI_API_KEY` только на сервере. Про доставку и CSP см. [статью о безопасности Cloudflare Pages](/blog/cloudflare-pages-security/).

## Сделать контекст сайта явным

Для сайта такого размера не обязательно начинать с векторной базы. Часто достаточно структурированного контекста из публичных страниц.

Контекст может включать описание компании и услуг, целевые аудитории, примеры обращений, URL, FAQ, правила для формы/LINE/email/телефона, области без утверждений вроде цены и договоров, а также внутренние URL по locale.

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

Цель не в том, чтобы модель отвечала из общих знаний, а в том, чтобы она знала, что этот сайт имеет право сказать. При росте сайта слой можно развить в Pagefind, CMS JSON, D1, Vectorize или другой retrieval.

## Писать правила в prompt

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

Типичная ошибка — слишком полезная AI, которая обещает слишком много. Вопросы о цене, сроках и гарантиях должны получать общую ориентацию и переход к форме.

## Разделить каналы обращения

| Канал          | Роль                                               |
| -------------- | -------------------------------------------------- |
| FAQ            | Ответить на частые вопросы прямо на странице       |
| AI-чат         | Помочь выбрать услуги, каналы и связанные страницы |
| LINE           | Короткие вопросы, темы школы и легкие уточнения    |
| Форма          | Оценки, производство, партнерства и найм           |
| Прямой контакт | Дополнение после формы или срочное подтверждение   |

AI соединяет общий контент вроде [обзора услуг](/blog/service-introduction/) с конкретными маршрутами на [странице контактов](/contact/). Это подходит для B2B, агентств, школ и SaaS support.

## Сохранять URL по locale

На многоязычном сайте важен не только язык ответа, но и URL.

```ts
function localizePath(path: string, locale: Locale) {
  if (locale === 'ja') return path
  return `/${locale}${path}`
}
```

Генерация на сервере надежнее, чем только инструкция в prompt. Основа переводов описана в статье [Как вести многоязычный блог с Sveltia CMS](/ru/blog/copilot-translation-pipeline/).

## Origin check и rate limit

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

IP-based rate limit — первая защита. В Cloudflare можно использовать `CF-Connecting-IP`, `X-Forwarded-For` или `CF-Ray`. При большем трафике лучше Cloudflare WAF, Turnstile, KV, D1 или Durable Objects. CMS-эксплуатация для обновления контента описана в [руководстве по внедрению Sveltia CMS](/blog/cms-selection-and-turnstile/); защита форм и комментариев от ботов относится к отдельному уровню.

## Рендерить Markdown-ссылки через allowlist

Поддерживайте только абзацы, списки, жирный текст, inline code и Markdown-ссылки. Цели ссылок ограничиваются внутренними путями, текущим origin, `https://acecore.net`, официальным LINE и нужными `mailto:` или `tel:`.

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

`trim()` важен, потому что AI может вернуть `[Services]( /services/ )`. Небольшой строгий renderer проще поддерживать, чем полный Markdown.

## Проверять local, preview и production

Astro dev или preview не полностью совпадает с Cloudflare Pages Functions. Без `OPENAI_API_KEY` локально проверяются fallback и ошибки UI.

В preview или production проверьте POST на `/api/ai-contact`, переменные `OPENAI_API_KEY` и `OPENAI_MODEL`, отказ для другого Origin, лимиты ввода, ответы в нужном locale, локализованные URL, отсутствие утверждений о смете или договоре, отсутствие email и телефона по умолчанию, а также Markdown-ссылки только при разрешенном URL.

Отдельно тестируйте длинный ввод, неожиданные вопросы, английские страницы, запрос прямого контакта и вопросы о цене.

## Операционные метрики

После релиза смотрите error rate API, срабатывания rate limit, среднее число сообщений на обращение, переходы к форме и LINE, случаи перевода на форму и использование по locale.

Если сохранять тексты диалогов, сначала определите правила приватности. Безопаснее начать с событий и ошибок без текста сообщений.

## Отдельный скоуп

Эта статья только о техническом дизайне AI-чата. Навигация, передающая предмет консультации со страницы услуги в форму, также реализована и описана в [Технический дизайн передачи контекста от CTA услуги в форму обратной связи](/blog/service-cta-contact-prefill/).

- AI-чат: через диалог убрать неопределенность и безопасно направить
- Service CTA: передать в форму контекст услуги, которую читал посетитель

Разделение делает статьи понятнее и облегчает внутренние ссылки.

## Итог

Для AI-чата на статическом сайте сначала проектируйте API-границу и контроль ответов.

Ключевые решения: вызывать OpenAI из Cloudflare Pages Function, держать ввод и историю маленькими, собирать контекст и locale URL на сервере, писать ограничения в prompt, разделить форму/LINE/прямой контакт, добавить Origin check и rate limit, а Markdown-ссылки рендерить после `trim()` через allowlist.

Статические сайты могут иметь полезный AI-чат для обращений. Цель не в том, чтобы выделить AI, а в том, чтобы посетитель безопасно выбрал следующий шаг.
