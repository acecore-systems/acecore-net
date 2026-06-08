---
title: 'Как развивать сайт на Astro + Cloudflare по функциям'
description: 'Как мы объединили Astro и Cloudflare Pages с AI-чатом для обращений, Sveltia CMS, многоязычным блогом, CTA услуг, безопасным Markdown-рендерингом и комментариями без внешнего сервиса.'
date: 2026-06-07T19:00
lastUpdated: 2026-06-07T00:00
author: gui
tags: ['技術', 'Astro', 'Cloudflare', 'Webサイト', 'AI', 'CMS']
image: /uploads/acecore-generated/work-acecore-net-website.webp
callout:
  type: tip
  title: Сначала определить границы
  text: 'AI-чат, CMS, локализация и комментарии полезны сами по себе, но на одном корпоративном сайте им нужны четкие границы. Astro создает статический HTML, Cloudflare доставляет сайт и обрабатывает небольшие API, GitHub сохраняет проверяемую историю изменений.'
processFigure:
  eyebrow: Site Architecture
  title: Слои расширения сайта
  description: По умолчанию оставлять сайт статическим и добавлять динамику только там, где она нужна.
  variant: inline
  steps:
    - title: Доставка
      description: Генерировать HTML в Astro и отдавать через Cloudflare Pages.
      icon: i-lucide-rocket
      accent: brand
    - title: Редактирование
      description: Редактировать японский source в Sveltia CMS и проверять через PR.
      icon: i-lucide-file-pen-line
      accent: emerald
    - title: Перевод
      description: Держать переводы в PR, а не показывать все языки в CMS.
      icon: i-lucide-languages
      accent: amber
    - title: Навигация
      description: AI-чат и CTA услуг ведут посетителя к правильной форме.
      icon: i-lucide-route
      accent: slate
linkCards:
  - href: /ru/blog/astro-ai-contact-chat/
    title: Технический дизайн AI-чата для обращений
    description: API-границы и контроль ответов на основе информации сайта.
    icon: i-lucide-bot
  - href: /ru/blog/cms-selection-and-turnstile/
    title: Руководство по внедрению Sveltia CMS
    description: CMS, GitHub backend, OAuth и PR-процесс для статического сайта.
    icon: i-lucide-badge-check
  - href: /ru/blog/copilot-translation-pipeline/
    title: Многоязычный блог с Sveltia CMS
    description: Публикация локализованных статических страниц вместо перевода только в UI.
    icon: i-lucide-languages
  - href: /ru/blog/service-cta-contact-prefill/
    title: Передача контекста CTA в форму
    description: Передать контекст услуги в категорию и тему формы обращения.
    icon: i-lucide-route
  - href: /ru/blog/ai-chat-markdown-link-safety/
    title: Безопасный Markdown-рендеринг ссылок AI-чата
    description: Рендерить только разрешенные ссылки и не считать вывод AI доверенным HTML.
    icon: i-lucide-shield-check
  - href: /ru/blog/cloudflare-only-blog-comments/
    title: Комментарии блога только на Cloudflare
    description: Комментарии без внешнего сервиса, с Pages Functions, D1 и Turnstile.
    icon: i-lucide-message-square-text
---

Когда сайт начинается с Astro и Cloudflare Pages, обычно достаточно быстрой и безопасной статической публикации.

Со временем появляются новые задачи: редактирование из браузера, локализованные страницы, навигация через AI-чат, передача контекста услуги в форму и комментарии.

Эта статья служит индексом внедрения: помогает решить, к какому слою относится функция, в каком порядке ее добавлять и какую подробную статью читать дальше. Пример взят с сайта Acecore, но подход переносится на другие сайты Astro + Cloudflare.

## Кратко

Роли разделены так:

| Слой        | Ответственность                            |
| ----------- | ------------------------------------------ |
| Astro       | Страницы, блог, OGP, RSS, sitemap и UI     |
| Cloudflare  | Pages, Pages Functions, D1 и Turnstile     |
| GitHub      | PR, CMS-diff, переводы и история           |
| Sveltia CMS | Японский source, авторы, теги, изображения |
| OpenAI API  | Ответы AI-чата                             |
| Pagefind    | Индекс поиска для проверенного HTML        |

То, что можно сделать статическим, остается статическим. Runtime нужен только для небольших API.

## Маленькие API на Cloudflare

AI-чат и комментарии используют один паттерн.

Astro рисует UI. Pages Functions держит API-границу. Secrets, D1 bindings, Turnstile, Origin checks и rate limits остаются на серверной стороне.

## CMS как интерфейс редактирования

Sveltia CMS не является runtime-базой данных. Он создает Git-изменения.

Японские статьи, авторы, теги, изображения и JSON-тексты проходят через PR, build и review.

## Перевод как статический контент

Локализация не сводится к переводу интерфейса в браузере.

Каждый язык получает URL, title, description, OGP, JSON-LD, RSS, sitemap и hreflang.

## Каналы обращения разделены

AI-чат помогает выбрать услугу. CTA услуги сохраняет контекст. Форма фиксирует официальное обращение.

## Вывод AI не является доверенным HTML

Markdown-ссылки из AI сначала валидируются.

Только ссылки из allowlist становятся DOM-элементами.

## Комментарии остаются в Cloudflare

Комментарии не используют внешний виджет.

Pages Functions принимает GET/POST, D1 хранит комментарии, Turnstile защищает отправку.

## Читать по цели

Не нужно сначала читать все подряд. Начните с функции, которую хотите добавить.

| Цель                                            | Что читать первым                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Редактировать статьи и изображения из браузера  | [Руководство по внедрению Sveltia CMS](/ru/blog/cms-selection-and-turnstile/)                    |
| Публиковать индексируемые многоязычные страницы | [Как вести многоязычный блог с Sveltia CMS](/ru/blog/copilot-translation-pipeline/)              |
| Направлять посетителей через AI-чат             | [Технический дизайн AI-чата для обращений](/ru/blog/astro-ai-contact-chat/)                      |
| Безопасно рендерить ссылки в ответах AI         | [Безопасный рендеринг Markdown-ссылок в ответах AI-чата](/ru/blog/ai-chat-markdown-link-safety/) |
| Передавать контекст услуги в форму              | [Передача контекста CTA услуги в форму обращения](/ru/blog/service-cta-contact-prefill/)         |
| Добавить комментарии без внешнего сервиса       | [Комментарии блога Astro только на Cloudflare](/ru/blog/cloudflare-only-blog-comments/)          |

## Порядок внедрения

Для похожего сайта практичный порядок такой:

1. Закрепить статические страницы, блог, RSS, sitemap и OGP в Astro.
2. Добавить Sveltia CMS для редактирования японского source.
3. Генерировать локализованные страницы как статический HTML.
4. Добавить навигацию через AI-чат и CTA услуг.
5. Зафиксировать безопасные границы для Markdown-ссылок, prefill формы, Origin checks и rate limits.
6. Добавить комментарии внутри Cloudflare только тогда, когда они действительно нужны.

## Итог

Astro + Cloudflare позволяют расширять корпоративный сайт, не теряя преимуществ статической доставки.

Используйте эту страницу как входную точку и добавляйте только те части, которые нужны вашему сайту, не ослабляя статическую основу.
