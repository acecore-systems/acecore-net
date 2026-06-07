---
title: 'Безопасный рендеринг Markdown-ссылок в ответах AI-чата'
description: 'Техническая заметка о том, как безопасно превращать Markdown-ссылки из ответов AI-чата в HTML. Парсинг с допуском пробелов, trim для href, allowlist, DOM-рендеринг, fallback и тесты рассматриваются отдельно.'
date: 2026-06-07T14:30
author: gui
tags: ['技術', 'Webサイト', 'AI', 'セキュリティ', 'Astro']
image: https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Главное
  text: Ответы AI не являются доверенным HTML. Даже если Markdown-ссылки удобны, URL нужно сначала trim, затем проверить по allowlist, а запрещенные ссылки оставить текстом.
processFigure:
  title: Поток рендеринга ссылок
  steps:
    - title: Text
      description: Сначала рассматривать ответ модели как обычный текст.
      icon: i-lucide-message-square-text
      accent: brand
    - title: Parse
      description: Находить только те Markdown-элементы, которые реально поддерживает чат.
      icon: i-lucide-brackets
      accent: amber
    - title: Validate
      description: Делать trim для href и разрешать только внутренние URL или одобренные домены.
      icon: i-lucide-shield-check
      accent: emerald
    - title: Render
      description: Создавать безопасные элементы через DOM API, не через innerHTML.
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: Какие решения нужно разделять
  before:
    label: Слабый рендеринг
    items:
      - Вставлять ответы AI прямо в innerHTML
      - Пытаться сразу реализовать весь Markdown
      - Не распознавать ссылки с пробелами вокруг URL
      - 'Обрабатывать внешние URL и javascript: одинаково'
  after:
    label: Малый и безопасный рендеринг
    items:
      - Принимать ответы как текст и превращать в DOM только нужное
      - Поддерживать только подмножество Markdown для чата
      - Проверять URL после trim
      - Оставлять запрещенные URL обычным текстом
checklist:
  title: Чеклист внедрения
  items:
    - text: Не доверять ответам AI как HTML
    - text: Разрешать пробелы вокруг URL в Markdown-ссылках
    - text: Всегда делать trim href перед проверкой
    - text: Разрешать только внутренние пути, текущий origin и нужные внешние домены
    - text: Явно задавать target и rel для внешних ссылок
    - text: Сохранять запрещенные ссылки как текст
    - text: Тестировать опасные URL и сломанный Markdown
linkCards:
  - href: /blog/astro-ai-contact-chat/
    title: Технический дизайн AI-чата для контактов
    description: Базовая статья об ответах AI, API-границе и управлении prompt.
    icon: i-lucide-sparkles
  - href: /blog/cloudflare-pages-security/
    title: Безопасность Cloudflare Pages
    description: Связанная статья про CSP и security headers.
    icon: i-lucide-shield
  - href: /contact/
    title: Контакты
    description: Реальная страница, где размещены AI-чат и форма.
    icon: i-lucide-message-square
faq:
  title: Частые вопросы
  items:
    - question: Достаточно ли markdown-it или marked?
      answer: Даже с библиотекой нужно отдельно решить, как обрабатывать HTML, какие цели ссылок разрешены, как добавлять target и rel и как отклонять опасные URL. Для чата небольшого собственного renderer может быть достаточно.
    - question: Опасно ли разрешать пробелы вокруг URL?
      answer: Риск не в пробелах, а в том, что разрешается после trim. Проверка нормализованного href сохраняет allowlist строгим.
    - question: Нужно ли удалять запрещенные URL?
      answer: Обычно текстовый fallback проще для отладки и сохраняет контекст. Более строгая политика может удалить всю ссылку.
---

Если AI-чат отвечает `Подробнее см. [Services]( /services/ )`, ссылка может не отрендериться, а исходный Markdown останется на экране.

Acecore столкнулся с этим в контактном AI-чате и поправил renderer в [PR с исправлением Markdown-ссылок](https://github.com/acecore-systems/acecore-net/pull/99).

Эта статья использует небольшое исправление как вход в тему безопасного превращения AI-ответов в DOM.

## Ответы AI не являются доверенным HTML

Вывод модели нужно считать текстом.

В чате полезны ссылки, жирный текст и списки. Но `innerHTML` заставляет браузер интерпретировать любую строку, которую произвела модель.

Не нужно реализовывать весь Markdown. Нужен небольшой renderer, который распознает только поддерживаемые элементы и создает безопасные DOM-узлы.

## Проблема не только в пробелах

Конкретная ошибка была в ссылке:

```md
[Services](/services/)
```

Строгая regex часто считает, что URL не содержит пробелов:

```js
;/\[([^\]]+)\]\(([^)\s]+)\)/
```

`[^)\s]+` отклоняет пробелы, поэтому `( /services/ )` не распознается. Исправление допускает пробелы внутри скобок, а затем нормализует значение.

```js
;/\[([^\]]+)\]\(\s*([^)]+?)\s*\)/
```

Но ослабить parser недостаточно. Нормализованное значение обязательно нужно проверить.

## Делайте trim перед проверкой href

Порядок должен быть таким:

1. Извлечь label и raw href из Markdown
2. Применить `trim()` к raw href
3. Проверить href по allowlist
4. Создать `<a>` только если href разрешен

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

Проверяемое значение должно быть тем же, что попадает в DOM.

## Allowlist зависит от продукта

Каждый сайт должен решить, какие URL может показывать AI.

| Тип              | Пример                    | Решение                         |
| ---------------- | ------------------------- | ------------------------------- |
| Внутренний путь  | `/services/`              | Разрешить                       |
| Тот же origin    | `https://acecore.net/...` | Разрешить                       |
| Официальный LINE | `https://lin.ee/...`      | Разрешить как официальный канал |
| mailto           | `mailto:info@acecore.net` | Только фиксированный адрес      |
| tel              | `tel:05088902788`         | Только фиксированный номер      |
| Другие внешние   | Любой URL                 | По умолчанию не ссылать         |

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

Рекрутинговый сайт может разрешать job boards, SaaS может разрешать документацию и status page. Функция должна отражать политику продукта.

## Fallback в текст

Если ссылка не проходит проверку, удаление не всегда лучший вариант.

В контактном AI-чате текстовый fallback сохраняет контекст для пользователя и помогает разработчикам увидеть, что модель пыталась вывести.

Renderer должен не только создавать безопасные ссылки, но и безопасно отказывать.

## Тестируйте плохие случаи

Минимальный набор:

| Ввод                               | Ожидаемый результат               |
| ---------------------------------- | --------------------------------- |
| `[Services](/services/)`           | Внутренняя ссылка                 |
| `[Services]( /services/ )`         | Внутренняя ссылка после trim      |
| `[LINE]( https://lin.ee/example )` | Разрешенная внешняя ссылка        |
| `[Bad](javascript:alert(1))`       | Не превращается в ссылку          |
| `[External](https://example.com/)` | Не ссылка, если домен не разрешен |
| `[Broken](/services/`              | Отображается как текст            |

В PR #99 было проверено, что варианты с пробелами и без них ведут к ожидаемому URL.

## Не реализуйте весь Markdown по умолчанию

Для чата обычно достаточно:

- Абзацы
- Списки
- Жирный текст
- Inline-code
- Ссылки

Таблицы, изображения, raw HTML и footnotes быстро расширяют ответственность renderer. Даже с библиотекой политика HTML и URL остается отдельным решением.

## Итог

Рендеринг Markdown-ссылок в AI-ответах выглядит как небольшая UI-правка, но на деле задает границу доверия к выводу модели.

Практическое правило: сначала текст, маленькое подмножество, trim перед проверкой, строгий allowlist и безопасный fallback.
