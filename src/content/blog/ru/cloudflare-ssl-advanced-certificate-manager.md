---
title: 'Что представляла собой прежняя платная SSL-опция Cloudflare — от Dedicated SSL к Advanced Certificate Manager'
description: 'Ранее платная опция Cloudflare «Dedicated SSL Certificates» в 2021 году была переименована и расширена до «Advanced Certificate Manager (ACM)». В статье разбираются отличия от бесплатного Universal SSL и случаи, когда нужен ACM.'
date: 2026-03-31T00:00
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ', 'インフラ']
image: https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop&q=80
compareTable:
  title: Universal SSL vs Advanced Certificate Manager
  before:
    label: Universal SSL (бесплатно)
    items:
      - Покрывает только корневой домен и поддомены первого уровня
      - Нельзя выбрать CA, срок действия и наборы шифров
      - '*.example.com работает, но dev.staging.example.com не покрывается'
      - В CN сертификата может отображаться брендинг Cloudflare
  after:
    label: Advanced Certificate Manager (платно, $10/мес/зона)
    items:
      - Поддержка многоуровневых поддоменов, до 50 хостов
      - Выбор CA (Let's Encrypt / Google Trust Services и др.)
      - Срок действия сертификата можно задать от 14 до 365 дней
      - 'Ваш домен становится CN, брендинг Cloudflare скрывается'
callout:
  type: info
  title: Причина смены названия
  text: 'Прежнее название «Dedicated SSL Certificates» в 2021 году было переработано в Advanced Certificate Manager (ACM). Это не просто переименование: значительно расширились функции — поддержка многоуровневых поддоменов, выбор CA и настройка срока действия.'
faq:
  title: Часто задаваемые вопросы
  items:
    - question: Можно ли использовать wildcard-сертификат (*.example.com) в Universal SSL?
      answer: Да, но он покрывает только поддомены первого уровня, например www.example.com. Для поддоменов второго уровня и глубже, таких как dev.staging.example.com, он не действует и вызывает ошибки сертификата. В таком случае нужен ACM.
    - question: Можно ли использовать Advanced Certificate Manager на бесплатном тарифе?
      answer: Да. Даже на бесплатном тарифе Cloudflare можно подключить ACM, купив add-on ACM ($10/мес/зона). Переход на более высокий тариф не обязателен.
    - question: Когда Universal SSL достаточно?
      answer: Для большинства личных сайтов и сайтов малого бизнеса Universal SSL достаточно. Если используются только корневой домен и поддомены первого уровня вроде www, ACM не нужен.
    - question: Что будет с Universal SSL после включения ACM?
      answer: Universal SSL и ACM могут сосуществовать. Для одного и того же поддомена приоритет получает сертификат ACM.
linkCards:
  - href: https://developers.cloudflare.com/ssl/edge-certificates/advanced-certificate-manager/
    title: Документация Advanced Certificate Manager
    description: Официальное руководство Cloudflare по настройке ACM
    icon: i-lucide-file-text
  - href: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/
    title: Ограничения Universal SSL
    description: Официальная документация по случаям, которые не покрывает Universal SSL
    icon: i-lucide-alert-circle
  - href: https://www.cloudflare.com/ja-jp/application-services/products/advanced-certificate-manager/
    title: Страница продукта Advanced Certificate Manager
    description: Список возможностей ACM и способ покупки (на японском)
    icon: i-lucide-shield-check
---

«Как называлась прежняя платная SSL-опция Cloudflare?» — этим вопросом задаются многие. В этой статье разберём, что это за опция, как она называется сейчас и какие у неё функции.

## Вывод: «Dedicated SSL» → «Advanced Certificate Manager (ACM)»

Прежняя платная SSL-опция Cloudflare называлась **Dedicated SSL Certificates**. В **2021 году она была обновлена и переименована в «Advanced Certificate Manager (ACM)»**.

Цена осталась прежней: **$10 в месяц за зону (домен)**.

---

## Почему изменили название

Во времена «Dedicated SSL» функция была сосредоточена на выпуске сертификата, выделенного под конкретный домен. Бесплатный Universal SSL использует общий сертификат для разных сайтов, тогда как выделенный сертификат позволял иметь собственный Common Name (CN).

При переходе к **Advanced Certificate Manager** были добавлены следующие возможности, а название стало подчёркивать аспект «управления».

- **Поддержка многоуровневых поддоменов**: защита поддоменов второго уровня и глубже, например `dev.staging.example.com`
- **Выбор CA**: можно выбрать Let's Encrypt, Google Trust Services и др.
- **Настройка срока действия**: от 14 до 365 дней
- **До 50 хостов**: один сертификат может покрывать несколько hostnames
- **Total TLS**: автоматическая защита всех проксируемых поддоменов в зоне

---

## Отличия от Universal SSL

Cloudflare предоставляет бесплатный **Universal SSL**, и для большинства сайтов этого достаточно для HTTPS. Но есть ряд ограничений.

### Случаи, которые Universal SSL не покрывает

```
# Покрываются Universal SSL
example.com
www.example.com
blog.example.com

# Не покрываются Universal SSL (нужен ACM)
dev.staging.example.com
api.v2.example.com
deep.sub.domain.example.com
```

Wildcard `*.example.com` работает, но **только для поддоменов первого уровня**. Многоуровневые шаблоны вроде `*.staging.example.com` не поддерживаются.

### Наличие брендинга Cloudflare

В Universal SSL в CN сертификата может присутствовать домен Cloudflare, например `sni.cloudflaressl.com`. В ACM CN становится вашим доменом, и брендинг Cloudflare скрывается.

---

## Когда нужен ACM

Рассмотрите ACM, если выполняется хотя бы один из пунктов:

1. **Вы используете многоуровневые поддомены**  
   Нужно включить SSL для поддоменов второго уровня и глубже, например `api.staging.example.com` или `dev.app.example.com`.

2. **Вы хотите, чтобы CN сертификата был вашим доменом**  
   Нужно убрать брендинг Cloudflare из сертификата (часто актуально для корпоративных сайтов и B2B-сервисов).

3. **Вы хотите выбирать CA или срок действия**  
   Политика безопасности требует конкретный CA, либо нужны короткоживущие сертификаты (например, 14 дней).

4. **Вы хотите защитить все поддомены через Total TLS**  
   Нужна автоматическая сертификационная защита всех проксируемых поддоменов в зоне.

---

## Покупка и активация

В Cloudflare Dashboard это включается за несколько шагов:

1. Откройте нужный домен в Cloudflare Dashboard
2. Перейдите в **SSL/TLS** → **Edge Certificates**
3. В секции **Advanced Certificate Manager** нажмите **Enable**
4. Подтвердите и купите подписку ($10/мес)
5. Создайте сертификат и добавьте хосты, которые нужно защитить

Чтобы включить Total TLS, достаточно переключить в On секцию **Total TLS** на той же странице Edge Certificates.

---

## Итоги

| Пункт | Universal SSL (бесплатно) | Advanced Certificate Manager ($10/мес/зона) |
|---|---|---|
| Многоуровневые поддомены | ✗ | ✓ |
| Выбор CA | ✗ | ✓ |
| Настройка срока действия | ✗ | ✓ |
| CN = ваш домен | △ | ✓ |
| Total TLS | ✗ | ✓ |
| Сценарий использования | Личные / обычные сайты | Корпоративные / сложные структуры поддоменов |

«Прежняя платная SSL-опция» Cloudflare — это **Advanced Certificate Manager (бывший Dedicated SSL Certificates)**. Это полезный выбор, когда бесплатного Universal SSL недостаточно — особенно при защите многоуровневых поддоменов и необходимости тонкой настройки сертификатов.
