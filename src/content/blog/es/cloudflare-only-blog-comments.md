---
title: 'Cómo añadir comentarios a un blog Astro usando solo Cloudflare'
description: 'Implementación de comentarios en un blog Astro sin servicio externo: Cloudflare Pages Functions, D1, Turnstile y configuración con Wrangler.'
date: 2026-06-07T18:00
lastUpdated: 2026-06-07T00:00
author: gui
tags: ['技術', 'Cloudflare', 'Astro', 'セキュリティ', 'Webサイト']
image: /uploads/acecore-generated/blog-cloudflare-pages-security.webp
callout:
  type: tip
  title: Sin servicio externo de comentarios
  text: 'Un sitio Astro estático puede tener comentarios propios. Pages Functions define la API, D1 guarda los datos, Turnstile protege los envíos y Wrangler mantiene los bindings por entorno.'
linkCards:
  - href: /es/blog/cloudflare-pages-security/
    title: Seguridad en Cloudflare Pages
    description: Headers de seguridad y entrega estática con Cloudflare Pages.
    icon: i-lucide-shield
  - href: /es/blog/cms-selection-and-turnstile/
    title: Guía de instalación de Sveltia CMS
    description: CMS y piezas de Cloudflare usadas en el sitio.
    icon: i-lucide-badge-check
  - href: /es/blog/astro-ai-contact-chat/
    title: Chat de contacto con IA en Astro
    description: Otro ejemplo de API con Pages Functions.
    icon: i-lucide-bot
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Por qué no usar un widget externo?
      answer: 'Porque la UI, los datos, la carga de scripts, la moderación y la migración quedan bajo control del servicio. Aquí todo queda dentro del sitio y Cloudflare.'
    - question: ¿D1 basta para comentarios?
      answer: 'Para leer por post_slug, ordenar por created_at, ocultar con deleted_at, limitar por cliente y detectar duplicados, D1 encaja bien.'
    - question: ¿Turnstile en el cliente es suficiente?
      answer: 'No. La Function debe validar el token con Siteverify antes de escribir en D1.'
---

Los sitios estáticos son sencillos hasta que necesitan guardar estado. Un sistema de comentarios es un buen ejemplo.

En Acecore no usamos un servicio externo de comentarios. En [PR #101](https://github.com/acecore-systems/acecore-net/pull/101) lo resolvimos solo con Cloudflare:

- Astro muestra la UI.
- Cloudflare Pages Functions expone `/api/comments`.
- Cloudflare D1 guarda los comentarios.
- Cloudflare Turnstile protege el POST.
- `wrangler.jsonc` define el binding `COMMENTS_DB`.

La ventaja es que el comentario no queda como una isla de terceros dentro de la página.

## Arquitectura

| Capa                  | Archivo o servicio                         |
| --------------------- | ------------------------------------------ |
| UI                    | `src/components/BlogComments.astro`        |
| Inserción en artículo | `src/views/BlogPostPage.astro`             |
| API                   | `functions/api/comments.ts`                |
| Datos                 | D1 binding `COMMENTS_DB`                   |
| Protección            | Cloudflare Turnstile                       |
| Schema                | `migrations/0001_create_blog_comments.sql` |

La UI lee con `GET /api/comments?slug=...&locale=...` y publica con `POST /api/comments`.

La Function valida origin, payload, Turnstile, límites, duplicados y contenido bloqueado antes de insertar.

## D1 como almacenamiento

Los comentarios necesitan consultas simples pero relacionales:

- filtrar por `post_slug`
- ordenar por `created_at`
- ocultar con `deleted_at`
- detectar duplicados con `body_hash`
- limitar por `client_hash`

Por eso D1 es más cómodo que un almacén key-value. Además, las consultas usan prepared statements con `bind()`, evitando concatenar input del usuario en SQL.

## Configuración por Wrangler

El binding `COMMENTS_DB` se define en `wrangler.jsonc` y apunta a la única base D1 `acecore-comments`.

Así el nombre del binding se mantiene estable y el dashboard de Cloudflare coincide con el repositorio.

## Turnstile en servidor

El widget del navegador no basta. El token se envía a Pages Functions y allí se valida contra Cloudflare Siteverify con `TURNSTILE_SECRET_KEY`.

También se comprueba el hostname devuelto. Esto es importante para aceptar previews legítimas y rechazar tokens emitidos desde orígenes inesperados.

## Controles anti-spam

La primera versión es estricta:

- rechaza URLs
- rechaza emails
- rechaza HTML
- rechaza enlaces Markdown
- rechaza texto repetitivo
- rechaza palabras promocionales
- usa honeypot

También combina límites en memoria con límites persistentes en D1. El identificador del cliente se guarda como hash con salt, no como IP sin procesar.

## SEO

Los comentarios se cargan en cliente y la sección usa `data-pagefind-ignore`. Por tanto, no se indexan como contenido principal.

Para un blog corporativo, esto es razonable: el artículo es contenido revisado; los comentarios son interacción.

## Resumen

Un servicio externo puede ser práctico, pero si el sitio ya vive en Cloudflare Pages, una función de comentarios ligera puede vivir enteramente en Cloudflare.

Pages Functions, D1, Turnstile y Wrangler son suficientes para mantener UI, datos, seguridad y entornos bajo el mismo modelo operativo.

## Referencias

- [Cloudflare Pages: Configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Cloudflare Pages Functions: Bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare D1: Prepared statement methods](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [Cloudflare D1: Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Cloudflare Turnstile: Server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare Turnstile: Any Hostname](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/any-hostname/)
- [PR #101: Comentarios con Cloudflare](https://github.com/acecore-systems/acecore-net/pull/101)
