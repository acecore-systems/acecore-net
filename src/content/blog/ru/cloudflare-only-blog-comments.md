---
title: 'Как добавить комментарии в Astro-блог только на Cloudflare'
description: 'Как мы добавили комментарии в Astro-блог без внешнего сервиса: Cloudflare Pages Functions, D1, Turnstile и конфигурация Wrangler.'
date: 2026-06-07T18:00
lastUpdated: 2026-06-07T00:00
author: gui
tags: ['技術', 'Cloudflare', 'Astro', 'セキュリティ', 'Webサイト']
image: /uploads/acecore-generated/blog-cloudflare-pages-security.webp
callout:
  type: tip
  title: Без внешнего сервиса комментариев
  text: 'Статический Astro-сайт может иметь собственные комментарии. Pages Functions дает API, D1 хранит данные, Turnstile защищает отправку, а Wrangler управляет bindings.'
linkCards:
  - href: /ru/blog/cloudflare-pages-security/
    title: Безопасность Cloudflare Pages
    description: Заголовки безопасности и статическая доставка через Cloudflare Pages.
    icon: i-lucide-shield
  - href: /ru/blog/cms-selection-and-turnstile/
    title: Руководство по внедрению Sveltia CMS
    description: CMS и компоненты Cloudflare на сайте.
    icon: i-lucide-badge-check
  - href: /ru/blog/astro-ai-contact-chat/
    title: AI-чат для контактов на Astro
    description: Другой пример API на Pages Functions.
    icon: i-lucide-bot
faq:
  title: Вопросы
  items:
    - question: Почему не внешний виджет?
      answer: 'Внешний сервис быстро подключается, но UI, данные, скрипты, модерация и миграция зависят от него. Здесь все остается в сайте и Cloudflare.'
    - question: Достаточно ли D1?
      answer: 'Для выборки по post_slug, сортировки, soft delete, rate limit и дубликатов D1 хорошо подходит.'
    - question: Достаточно ли Turnstile в браузере?
      answer: 'Нет. Pages Function должна проверить token через Siteverify перед записью в D1.'
---

Комментарии добавляют состояние в статический сайт.

Acecore не стал подключать внешний сервис комментариев. В [PR #101](https://github.com/acecore-systems/acecore-net/pull/101) функция реализована только на Cloudflare.

- Astro показывает UI.
- Cloudflare Pages Functions предоставляет `/api/comments`.
- Cloudflare D1 хранит комментарии.
- Cloudflare Turnstile защищает POST.
- `wrangler.jsonc` разделяет preview и production.

Главное преимущество: комментарии не становятся сторонним виджетом внутри страницы.

## Архитектура

| Слой             | Файл или сервис                            |
| ---------------- | ------------------------------------------ |
| UI               | `src/components/BlogComments.astro`        |
| Вставка в статью | `src/views/BlogPostPage.astro`             |
| API              | `functions/api/comments.ts`                |
| Хранилище        | D1 binding `COMMENTS_DB`                   |
| Защита           | Cloudflare Turnstile                       |
| Schema           | `migrations/0001_create_blog_comments.sql` |

UI читает через `GET /api/comments?slug=...&locale=...` и отправляет через `POST /api/comments`.

Function проверяет origin, payload, Turnstile, лимиты, дубликаты и запрещенный контент.

## Почему D1

Комментарии удобно хранить в SQL: фильтр по статье, сортировка по времени, soft delete через `deleted_at`, дубликаты через `body_hash`, лимиты через `client_hash`.

Видимые строки имеют `deleted_at IS NULL`. Spam можно скрыть без физического удаления.

Запросы используют prepared statements и `bind()`, поэтому пользовательский ввод не склеивается с SQL.

## Wrangler и окружения

`COMMENTS_DB` задается в `wrangler.jsonc`. Preview пишет в `acecore-comments-preview`, production — в `acecore-comments-production`.

Это защищает production от случайных записей из PR preview.

## Turnstile на сервере

Widget в браузере недостаточен.

Pages Function отправляет token в Cloudflare Siteverify с `TURNSTILE_SECRET_KEY`, а также проверяет hostname из результата.

## Anti-spam

Первая версия строгая:

- без URL
- без email
- без HTML
- без Markdown-ссылок
- без длинных повторов
- без рекламных слов
- honeypot поле

Rate limit есть в памяти и в D1. IP не сохраняется напрямую; используется salted hash.

## SEO

Комментарии загружаются на клиенте, а блок помечен `data-pagefind-ignore`. Они не индексируются как основной текст статьи.

Для корпоративного блога это безопаснее: статья — редакционный контент, комментарии — взаимодействие.

## Итог

Внешний сервис комментариев удобен, но не обязателен.

Если сайт уже работает на Cloudflare Pages, Pages Functions + D1 + Turnstile + Wrangler достаточно для легкой системы комментариев.

## Ссылки

- [Cloudflare Pages: Configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Cloudflare Pages Functions: Bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare D1: Prepared statement methods](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [Cloudflare D1: Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Cloudflare Turnstile: Server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare Turnstile: Any Hostname](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/any-hostname/)
- [PR #101: комментарии на Cloudflare](https://github.com/acecore-systems/acecore-net/pull/101)
