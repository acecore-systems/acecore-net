---
title: 'Безопасная доставка статического сайта с помощью Cloudflare Pages'
description: 'Практическое руководство по деплою статического сайта на Cloudflare Pages и настройке заголовков безопасности/CSP через _headers. Также рассматривается, почему мы вернулись с Workers на Pages.'
date: 2026-03-15
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ']
image: https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop&q=80
processFigure:
  title: Эволюция архитектуры деплоя
  steps:
    - title: Начальная настройка
      description: Доставка статического сайта на Cloudflare Pages.
      icon: i-lucide-cloud
    - title: Миграция на Workers
      description: Переход на Workers для обработки контактной формы.
      icon: i-lucide-server
    - title: Возврат к Pages
      description: Возврат к статической доставке за счёт внедрения внешнего сервиса форм.
      icon: i-lucide-rotate-ccw
    - title: Укрепление безопасности
      description: Настройка CSP и заголовков безопасности через _headers.
      icon: i-lucide-shield-check
callout:
  type: info
  title: Workers vs Pages
  text: Cloudflare Workers гибки, но для статических сайтов Pages превосходит по эффективности кэширования и простоте деплоя. Выбирайте Pages, если серверная обработка не нужна.
faq:
  title: Часто задаваемые вопросы
  items:
    - question: Стоит ли выбрать Cloudflare Pages или Workers?
      answer: Для статических сайтов, не требующих серверной обработки, Pages оптимален. Интеграция с CDN безупречна, а деплой прост. Обработку форм можно отдать внешним сервисам.
    - question: Какие заголовки безопасности следует настроить в файле _headers?
      answer: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy и Permissions-Policy — обязательный минимум. Настройте CSP в соответствии с внешними ресурсами, используемыми вашим сайтом.
    - question: Как разрешить AdSense и Analytics в настройках CSP?
      answer: Добавьте домены googletagmanager.com и googlesyndication.com в script-src. Также может потребоваться разрешить связанные домены в img-src и connect-src.
---

Cloudflare Pages — отличная платформа для хостинга статических сайтов. В этой статье рассматривается наша фактическая настройка деплоя и конфигурация безопасности с помощью файла `_headers`.

## Архитектура деплоя: почему мы ушли с Workers и вернулись на Pages

Изначально мы планировали использовать Cloudflare Workers для серверной обработки контактной формы. Workers позволяют отправлять письма и выполнять валидацию на стороне сервера.

Однако в процессе реализации мы столкнулись со следующими проблемами:

- **Сложность сборки**: Для обслуживания выходных данных Astro через Workers требовалась дополнительная конфигурация
- **Накладные расходы на отладку**: Различия в поведении между локальным `wrangler dev` и продакшеном
- **Управление кэшем**: Pages естественнее интегрируется с CDN Cloudflare

В итоге мы приняли [ssgform.com](https://ssgform.com/) как внешний сервис для контактной формы, полностью устранив серверную обработку. Это сняло необходимость в Workers, позволив деплоить как чисто статический сайт на Pages.

## Конфигурация безопасности через \_headers

На Cloudflare Pages можно указать HTTP-заголовки ответа в файле `public/_headers`. Ниже приведён фрагмент конфигурации, которую мы фактически используем.

### Content-Security-Policy (CSP)

CSP — критически важный заголовок для предотвращения атак межсайтового скриптинга (XSS). Он определяет разрешённые источники ресурсов по принципу белого списка.

```text
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://acecore.net https://images.unsplash.com data:;
  connect-src 'self' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  frame-src https://challenges.cloudflare.com https://googleads.g.doubleclick.net;
  form-action https://ssgform.com;
```

Ключевые моменты:

- **script-src**: Разрешить Cloudflare Turnstile (`challenges.cloudflare.com`) и AdSense
- **img-src**: Разрешить same-origin endpoint Cloudflare Images и Unsplash
- **form-action**: Ограничить отправку форм только на ssgform.com
- **frame-src**: Разрешить iframe Turnstile и рекламные фреймы AdSense

### Другие заголовки безопасности

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- **X-Content-Type-Options**: Предотвращение MIME-сниффинга
- **X-Frame-Options**: Запрет встраивания в iframe как мера против clickjacking
- **Referrer-Policy**: Отправка только origin для кросс-доменных запросов
- **Permissions-Policy**: Отключение ненужных API браузера (камера, микрофон, геолокация)

## Управление кэшированием

Мы установили долгосрочное кэширование для статических ресурсов и более короткое — для HTML.

```text
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=3600
```

Файлы в каталоге `_astro/`, генерируемые Astro, содержат хэши контента, что позволяет безопасно кэшировать их на один год с `immutable`. HTML обновляется умеренно часто, поэтому мы ограничиваем кэш одним часом.

## Конфигурация деплоя Pages

Настройки проекта Cloudflare Pages просты:

| Параметр | Значение |
| --- | --- |
| Команда сборки | `npx astro build` |
| Выходной каталог | `dist` |
| Версия Node.js | 22 |

После подключения репозитория GitHub пуши в ветку `main` запускают автоматический деплой. Превью-деплои также генерируются автоматически для каждого PR, облегчая ревью.

## Итоги

Ключ в том, чтобы спросить себя: «Действительно ли мне нужна серверная обработка?» Использование внешних сервисов для устранения Workers упростило и деплой, и управление безопасностью. Настройка CSP через `_headers` требует начальных усилий, но однажды написанная применяется ко всем страницам — это высокоэффективная мера безопасности с точки зрения соотношения затрат и результата.
