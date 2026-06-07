---
title: 'Diseñar un sitio Astro + Cloudflare que crece función por función'
description: 'Cómo combinamos Astro y Cloudflare Pages con chat de contacto con IA, Sveltia CMS, blog multilingüe, CTA de servicios, renderizado seguro de Markdown y comentarios sin servicios externos.'
date: 2026-06-07T19:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'Astro', 'Cloudflare', 'Webサイト', 'AI', 'CMS']
image: /uploads/acecore-generated/work-acecore-net-website.webp
callout:
  type: tip
  title: Define límites antes de añadir funciones
  text: 'El chat con IA, el CMS, la localización y los comentarios son útiles, pero en un mismo sitio corporativo necesitan límites claros. Astro genera HTML estático, Cloudflare entrega el sitio y procesa APIs pequeñas, y GitHub mantiene los cambios revisables.'
processFigure:
  eyebrow: Site Architecture
  title: Capas para ampliar el sitio
  description: Mantener el sitio estático por defecto y añadir dinamismo solo donde hace falta.
  variant: inline
  steps:
    - title: Entregar
      description: Generar HTML con Astro y servirlo en Cloudflare Pages.
      icon: i-lucide-rocket
      accent: brand
    - title: Editar
      description: Editar el contenido japonés en Sveltia CMS y revisarlo con PRs.
      icon: i-lucide-file-pen-line
      accent: emerald
    - title: Traducir
      description: Separar las traducciones en PRs, no dentro de toda la interfaz del CMS.
      icon: i-lucide-languages
      accent: amber
    - title: Guiar
      description: Usar chat con IA y CTA de servicios para llevar al usuario al formulario correcto.
      icon: i-lucide-route
      accent: slate
linkCards:
  - href: /es/blog/astro-ai-contact-chat/
    title: Diseño técnico del chat de contacto con IA
    description: Límites de API y control de respuestas para guiar visitantes con información del sitio.
    icon: i-lucide-bot
  - href: /es/blog/cms-selection-and-turnstile/
    title: Guía de instalación de Sveltia CMS
    description: CMS, GitHub backend, OAuth y operación basada en PRs para sitios estáticos.
    icon: i-lucide-badge-check
  - href: /es/blog/copilot-translation-pipeline/
    title: Operar un blog multilingüe con Sveltia CMS
    description: Publicar páginas estáticas localizadas, no solo traducción de interfaz.
    icon: i-lucide-languages
  - href: /es/blog/service-cta-contact-prefill/
    title: Pasar contexto del CTA al formulario
    description: Llevar el contexto del servicio leído hasta la categoría y el asunto del formulario.
    icon: i-lucide-route
  - href: /es/blog/ai-chat-markdown-link-safety/
    title: Renderizado seguro de enlaces Markdown en IA
    description: Renderizar enlaces permitidos sin tratar la salida de IA como HTML confiable.
    icon: i-lucide-shield-check
  - href: /es/blog/cloudflare-only-blog-comments/
    title: Comentarios de blog usando solo Cloudflare
    description: Comentarios sin servicio externo, con Pages Functions, D1 y Turnstile.
    icon: i-lucide-message-square-text
---

En los últimos artículos cubrimos el chat de contacto con IA, Sveltia CMS, publicación multilingüe, CTA de servicios, renderizado seguro de Markdown y comentarios usando solo Cloudflare.

Faltaba una pieza: el mapa que explica cómo se conectan.

## Resumen

La arquitectura divide responsabilidades:

| Capa        | Responsabilidad                                  |
| ----------- | ------------------------------------------------ |
| Astro       | Páginas, blog, OGP, RSS, sitemap y UI            |
| Cloudflare  | Pages, Pages Functions, D1 y Turnstile           |
| GitHub      | PRs, diferencias de CMS, traducciones, historial |
| Sveltia CMS | Fuente japonesa, autores, etiquetas, imágenes    |
| OpenAI API  | Respuestas del chat de contacto                  |
| Pagefind    | Índice de búsqueda para HTML revisado            |

Lo que puede ser estático se mantiene estático. Lo dinámico pasa a APIs pequeñas.

## Por qué hace falta un artículo hub

Ya había artículos sobre rendimiento, SEO, accesibilidad, i18n y renovación del sitio. Pero esos no reunían las funciones añadidas recientemente.

Este artículo sirve como entrada: primero entender la arquitectura y después leer cada implementación.

## APIs pequeñas en Cloudflare

El chat de IA y los comentarios comparten patrón.

Astro muestra la interfaz. Pages Functions maneja la frontera de API. Secrets, D1 bindings, Turnstile, Origin checks y límites de frecuencia no salen al navegador.

Así el sitio no se convierte en un servidor de aplicación completo.

## CMS como interfaz de edición

Sveltia CMS no es una base de datos en runtime. Crea cambios en Git.

El contenido japonés, autores, etiquetas, imágenes y textos JSON se editan desde el CMS, pasan por PR, build y review, y luego llegan a producción.

## Traducción como contenido estático

La localización no depende de traducir la interfaz en el navegador.

Cada idioma genera su propia URL, title, description, OGP, JSON-LD, RSS, sitemap y hreflang.

## Canales de contacto separados

El chat con IA ayuda cuando el visitante todavía no sabe qué servicio necesita. El CTA de servicio conserva el contexto. El formulario registra la consulta formal.

No son el mismo botón repetido.

## La salida de IA no es HTML confiable

El chat puede devolver enlaces Markdown, pero no se insertan con `innerHTML`.

Solo se parsean expresiones necesarias, se valida el href con allowlist y se crean nodos DOM seguros.

## Comentarios dentro de Cloudflare

Los comentarios no usan un widget externo.

Pages Functions recibe GET/POST, D1 guarda comentarios y Turnstile protege envíos. Para un blog corporativo pequeño, ese alcance es suficiente.

## Orden recomendado

1. [Guía de instalación de Sveltia CMS](/es/blog/cms-selection-and-turnstile/)
2. [Cómo operar un blog multilingüe con Sveltia CMS](/es/blog/copilot-translation-pipeline/)
3. [Diseño técnico del chat de contacto con IA](/es/blog/astro-ai-contact-chat/)
4. [Renderizado seguro de enlaces Markdown en respuestas de IA](/es/blog/ai-chat-markdown-link-safety/)
5. [Pasar contexto del CTA al formulario](/es/blog/service-cta-contact-prefill/)
6. [Comentarios de blog Astro usando solo Cloudflare](/es/blog/cloudflare-only-blog-comments/)

## Cierre

Astro + Cloudflare permite ampliar un sitio corporativo sin abandonar las ventajas de la entrega estática.

Los artículos individuales explican cómo se hizo cada función. Este artículo explica por qué esas funciones encajan en una sola arquitectura.
