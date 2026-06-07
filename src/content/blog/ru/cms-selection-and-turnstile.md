---
title: 'Руководство по внедрению Sveltia CMS'
description: 'Практическое руководство по добавлению Sveltia CMS в Astro или другой статический сайт: GitHub backend, OAuth Worker, загрузка изображений, многоязычная эксплуатация, CMS PR и выводы из реальных исправлений.'
date: 2026-06-07T16:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'CMS', 'Astro', 'Cloudflare', 'セキュリティ']
image: /uploads/acecore-generated/blog-cms-selection-and-turnstile.webp
processFigure:
  title: Поток внедрения Sveltia CMS
  description: Админку, аутентификацию, редактируемый контент, медиа и PR-процесс стоит проектировать отдельно.
  steps:
    - title: Добавить админку
      description: Разместить index.html и config.yml в public/admin и загрузить Sveltia CMS.
      icon: i-lucide-layout
      accent: brand
    - title: Настроить GitHub
      description: Заранее определить repo, branch, OAuth Worker и сообщения commit для CMS.
      icon: i-lucide-git-branch
      accent: emerald
    - title: Ограничить область редактирования
      description: Открыть в CMS только блог, авторов, теги и японские source JSON, которые действительно нужно редактировать.
      icon: i-lucide-file-text
      accent: amber
    - title: Автоматизировать эксплуатацию
      description: Связать ветку cms-content, CMS PR и задачи перевода, не смешивая их с обычной разработкой.
      icon: i-lucide-git-pull-request
      accent: slate
compareTable:
  title: До и после CMS
  before:
    label: Ручное редактирование Markdown
    items:
      - Обновлять удобно только тем, кто уверенно пользуется GitHub или редактором
      - Пути изображений, ID авторов и теги вводятся вручную
      - Изменения японского source и переводов легко смешать
      - Preview может случайно читать main
  after:
    label: Редактирование в Sveltia CMS
    items:
      - Markdown и JSON редактируются через формы в браузере
      - relation, image и select уменьшают число некорректных значений
      - Только CMS commits запускают задачи перевода
      - runtime config переключает CMS branch между preview и production
callout:
  type: note
  title: Предпосылка статьи
  text: Sveltia CMS — это браузерное приложение администрирования, которое редактирует Markdown и JSON через Git backend. Пример взят из сайта Acecore, но подход применим ко многим Astro-сайтам.
checklist:
  title: Чеклист внедрения
  items:
    - text: Загрузить Sveltia CMS из public/admin/index.html
      checked: true
    - text: Описать GitHub backend и collections в public/admin/config.yml
      checked: true
    - text: Использовать OAuth Worker для нескольких редакторов
      checked: true
    - text: Согласовать media_folder и public_folder с каталогом public в Astro
      checked: true
    - text: Определить, как CMS commits запускают перевод или публикацию
      checked: true
faq:
  title: Частые вопросы
  items:
    - question: Для каких сайтов подходит Sveltia CMS?
      answer: Для статических сайтов, где Markdown или JSON находятся в репозитории, например Astro, Hugo или VitePress. CMS можно добавить без внешней базы данных.
    - question: Можно ли использовать только GitHub Personal Access Token?
      answer: Для теста можно. Но для нескольких редакторов или нетехнических пользователей OAuth Worker безопаснее и понятнее.
    - question: Нужно ли редактировать все языки в CMS?
      answer: Для небольшой команды безопаснее редактировать в CMS только японский source, а переводы обновлять через PR.
---

Sveltia CMS полезна, когда статическому сайту нужна удобная админка, но переносить контент во внешнюю базу данных не хочется. В этой статье описано, как мы внедрили Sveltia CMS на Astro-сайте Acecore и какие проблемы исправили позже по итогам PR и commit.

Заголовок намеренно простой: **Руководство по внедрению Sveltia CMS**. Это не сравнение CMS, а практический ориентир для внедрения на другом сайте.

## Когда Sveltia CMS подходит

Sveltia CMS не владеет отдельной базой данных и не отдаёт контент через отдельный API. Это SPA в браузере, которое редактирует файлы репозитория через GitHub backend.

Она хорошо подходит, если:

- контент хранится как Markdown или JSON в репозитории
- изменения статей, авторов, тегов и текстов страниц нужно ревьюить как Git diff
- не хочется добавлять базу данных или отдельный сервис администрирования
- изображения можно хранить в `public/uploads`
- CMS-изменения должны проходить через Pull Request перед production

Если нужны сложные права, развитое планирование публикаций, большая медиатека или редактирование realtime-данных, лучше рассмотреть полноценную headless CMS.

## Общая архитектура

```text
public/admin/index.html
  -> загружает @sveltia/cms из CDN

public/admin/config.yml
  -> описывает GitHub backend, collections и media folders

workers/sveltia-cms-auth
  -> Cloudflare Worker для GitHub OAuth

cms-content branch
  -> ветка, куда CMS сохраняет изменения

.github/workflows/cms-content-pr.yml
  -> открывает PR из cms-content в main

.github/workflows/create-translation-prs.yml
  -> создаёт задачи перевода только для cms: commits
```

Админская страница — только начало. Аутентификация, пути медиа, preview branches, переводы и стратегия merge тоже становятся частью CMS-дизайна.

## 1. Разместить админку в `public/admin`

В Astro каталог `public` публикуется как статические файлы. Документация Sveltia CMS также указывает `public` как static folder для Astro, Next.js, Nuxt, Remix и VitePress.

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex,nofollow" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CMS</title>
  </head>
  <body>
    <script src="https://unpkg.com/@sveltia/cms@0.166.0/dist/sveltia-cms.js"></script>
  </body>
</html>
```

Не стоит добавлять лишний CSS или `type="module"` без причины. Стили интерфейса уже включены в JavaScript bundle.

Acecore использует ручную инициализацию, чтобы preview мог подставлять нужную ветку.

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
    },
  },
})
```

## 2. Настроить GitHub backend

Минимум — `backend.name` и `backend.repo`. Для production также стоит заранее определить branch, OAuth и сообщения commit.

```yaml
backend:
  name: github
  repo: owner/repository
  branch: cms-content
  base_url: https://your-sveltia-cms-auth-worker.example.workers.dev
  auth_methods: [oauth]
  commit_messages:
    create: 'cms: create {{collection}} "{{slug}}"'
    update: 'cms: update {{collection}} "{{slug}}"'
    delete: 'cms: delete {{collection}} "{{slug}}"'
    uploadMedia: 'cms: upload "{{path}}"'
    deleteMedia: 'cms: delete media "{{path}}"'
```

Для личного сайта можно сохранять прямо в `main`. Для корпоративного или многоязычного сайта удобнее сохранять в отдельную ветку `cms-content` и создавать PR.

## 3. Добавить OAuth Worker

Personal Access Token подходит для теста, но не для нескольких редакторов. Acecore использует Sveltia CMS Authenticator на Cloudflare Workers и указывает его как `base_url`.

Callback URL в GitHub OAuth App указывает на `/callback` Worker. В Worker задаются `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` и при необходимости `ALLOWED_DOMAINS`.

Это не то же самое, что Turnstile. OAuth защищает вход в CMS, а Turnstile защищает формы или API комментариев от ботов.

## 4. Заранее определить папку медиа

Sveltia CMS может сохранять медиа в репозитории. Для Astro практичная настройка такая:

```yaml
media_folder: public/uploads
public_folder: /uploads
```

Acecore позже исправила этот момент в [PR #116](https://github.com/acecore-systems/acecore-net/pull/116). Путь в репозитории и публичный URL нужно выбирать одновременно при внедрении CMS.

## 5. Разделить collections

| collection | Цель                           | Правило                                           |
| ---------- | ------------------------------ | ------------------------------------------------- |
| `blog`     | `src/content/blog/*.md`        | Редактировать только японские source-статьи       |
| `authors`  | `src/content/authors/*.json`   | Редактировать профили и локализованные имена      |
| `tags`     | `src/content/tags/*.json`      | Редактировать теги и локализованные имена         |
| page text  | `src/i18n/source/ja/**/*.json` | Редактировать японские source-тексты страниц и UI |

Не обязательно открывать в CMS все переведённые Markdown-файлы. Acecore считает японский source каноническим, а переводы обновляет через [pipeline GitHub Copilot](/ru/blog/copilot-translation-pipeline/).

## 6. Использовать relation и select

Теги лучше выбирать через relation, а не вводить свободным текстом.

```yaml
- name: tags
  label: Теги
  widget: relation
  collection: tags
  value_field: name
  display_fields: ['{{name}} ({{id}})']
  search_fields: [name, id]
  multiple: true
  required: false
```

Авторы, иконки и стили уведомлений работают по той же логике. Хорошая CMS не только позволяет редактировать, но и мешает сохранить плохие значения.

## 7. Редактировать японские source JSON

Тексты фиксированных страниц тоже можно отдать в CMS. Acecore хранит японский source в `src/i18n/source/ja/**/*.json`.

Урок простой: не добавлять все поля сразу. `config.yml` быстро растёт. Начните с блога, авторов, тегов, объявлений и часто меняющихся страниц.

## 8. Preview должен читать правильную ветку

Если CMS в preview Cloudflare Pages всё ещё читает `main`, редактор видит не тот контент, что preview. Acecore перед build создаёт `public/admin/runtime-config.js` и передаёт текущий branch.

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
    },
  },
})
```

## 9. Создавать PR из CMS-ветки

Сохранение в `cms-content` и PR в `main` сохраняют ревью контента.

```yaml
on:
  push:
    branches:
      - cms-content
```

Способ merge важен. Задачи перевода зависят от commit subjects вроде `cms: create ...`. Если squash merge их удалит, автоматизация может не увидеть изменение source. Для CMS PR лучше merge commit или rebase merge.

## 10. Перевод только для CMS commits

[PR #98](https://github.com/acecore-systems/acecore-net/pull/98) добавил `--cms-only`, чтобы push-triggered задачи перевода создавались только для CMS commits.

```javascript
function isCmsCommitSubject(subject) {
  return /^cms: (create|update|delete) /.test(subject || '')
}
```

`cms:` — это контракт workflow, а не декоративный префикс.

## 11. Отдельный CSP для `/admin`

Админка подключается к CDN, GitHub API, OAuth Worker и blob URL. Поэтому Acecore задаёт отдельный CSP для `/admin/*` и помечает эту область как `noindex`.

## Turnstile отдельно

Старая версия статьи смешивала CMS и Cloudflare Turnstile. Это размывало тему.

Sveltia CMS — про GitHub backend, OAuth, collections, медиа и PR. Turnstile — про защиту форм или API от ботов. Это разные уровни.

## Уроки из PR и commit

- При смене CMS нужно обновлять статьи и внутренние ссылки.
- OAuth должен быть частью реального setup, а не задачей на потом.
- Пути медиа нужно зафиксировать до загрузок.
- `config.yml` лучше расширять постепенно.
- `cms:` — контракт автоматизации.
- В preview должно быть ясно, какой branch читает CMS.

## Минимальная отправная точка

```text
public/admin/index.html
public/admin/config.yml
public/admin/init.js
public/admin/runtime-config.js
```

Затем добавляйте relation для авторов и тегов, изображения, source JSON, автоматические CMS PR и задачи перевода.

## Ссылки

- [Sveltia CMS Getting Started](https://sveltiacms.app/en/docs/start)
- [Sveltia CMS GitHub Backend](https://sveltiacms.app/en/docs/backends/github)
- [Sveltia CMS Internal Media Storage](https://sveltiacms.app/en/docs/media/internal)
- [Sveltia CMS Manual Initialization](https://sveltiacms.app/en/docs/api/initialization)
- [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth)

## Итог

Sveltia CMS легко положить в `public/admin`, но production-внедрение требует решений о branch, OAuth, media folders, source language, workflow переводов и merge strategy. Когда эти правила понятны, Astro-сайт остаётся статическим и лёгким, но получает рабочий процесс обновления контента.
