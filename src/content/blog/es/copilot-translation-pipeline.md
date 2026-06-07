---
title: 'Cómo gestionar un blog multilingüe con Sveltia CMS'
description: 'Flujo práctico para editar artículos fuente en japonés con Sveltia CMS, generar PRs de traducción con GitHub Actions y GitHub Copilot, y publicar páginas estáticas localizadas con ventajas frente a la traducción solo en la UI.'
date: 2026-06-07T17:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS', 'SEO']
image: /uploads/acecore-generated/blog-copilot-translation-pipeline.webp
callout:
  type: tip
  title: Traducir la UI no es publicar contenido multilingüe
  text: 'La traducción del navegador o de un widget ayuda a leer una página, pero no crea URLs, title, description, enlaces internos, RSS, sitemap ni hreflang por idioma. Para que los buscadores vean páginas localizadas, conviene publicar HTML estático traducido.'
linkCards:
  - href: /es/blog/cms-selection-and-turnstile/
    title: Guía de instalación de Sveltia CMS
    description: Implementación de Sveltia CMS en un sitio estático Astro.
    icon: i-lucide-badge-check
  - href: /es/blog/astro-i18n-blog-translation/
    title: Arquitectura multilingüe con Astro
    description: Rutas, fallback, hreflang, RSS y sitemap para 9 idiomas.
    icon: i-lucide-globe-2
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Basta con traducir la interfaz?
      answer: 'Sirve para que una persona lea la página, pero no crea activos SEO por idioma. Si necesitas URLs, metadatos, RSS, sitemap y enlaces internos localizados, necesitas páginas traducidas reales.'
    - question: ¿La traducción con IA perjudica el SEO?
      answer: 'El problema no es usar IA, sino publicar muchas páginas sin valor. Hay que revisar terminología, enlaces, datos y naturalidad antes de publicar.'
    - question: ¿Las páginas traducidas son contenido duplicado?
      answer: 'Google indica que las versiones localizadas solo son duplicadas si el contenido principal no está traducido. Mantén las variantes conectadas con hreflang.'
---

Acecore edita su contenido principalmente en japonés, pero publica el blog en 9 idiomas. La diferencia importante es que **traducir texto en la pantalla** y **publicar páginas localizadas** no son lo mismo.

La traducción del navegador o un widget puede ayudar al lector. Pero no genera `/en/blog/.../`, `/es/blog/.../`, metadatos localizados, RSS, sitemap ni enlaces `hreflang`.

Si el objetivo incluye tráfico de búsqueda, la traducción debe formar parte del proceso de publicación, no solo de la capa visual.

## Estructura usada

El sitio sigue esta convención:

- Fuente japonesa: `src/content/blog/{slug}.md`
- Traducciones: `src/content/blog/{locale}/{slug}.md`
- URLs: `/blog/{slug}/`, `/en/blog/{slug}/`, `/es/blog/{slug}/`, etc.
- Edición: Sveltia CMS
- Traducción: PRs de GitHub Copilot
- Publicación: build y revisión

Sveltia CMS es la entrada para editar el contenido japonés. Las traducciones se gestionan como pull requests para conservar historial, revisión y CI.

## Cuándo sirve la traducción de UI

La traducción de UI es suficiente para lectura interna, consultas puntuales, pantallas de administración, páginas que no buscan SEO o contenidos cuya calidad de traducción no se mantiene como parte del sitio.

Es ligera porque no crea archivos traducidos. Justamente por eso tampoco crea páginas indexables por idioma.

## Ventajas SEO de las páginas estáticas localizadas

Los buscadores y las previsualizaciones sociales trabajan principalmente con URLs y HTML.

Si solo existe la página japonesa, el title, description, datos estructurados, RSS y sitemap seguirán perteneciendo a esa página, aunque el navegador traduzca el texto al usuario.

Con páginas estáticas localizadas, cada idioma tiene una URL:

```txt
/blog/copilot-translation-pipeline/
/en/blog/copilot-translation-pipeline/
/es/blog/copilot-translation-pipeline/
/fr/blog/copilot-translation-pipeline/
```

### 1. Cada idioma se puede rastrear directamente

Google puede procesar JavaScript, pero su documentación también explica que JavaScript tiene limitaciones y recomienda renderizado estático o del lado servidor como opciones más estables. Además, otros crawlers, lectores RSS o vistas previas pueden ser menos capaces.

### 2. Los metadatos se traducen

El frontmatter también puede localizarse:

```yaml
title: 'Cómo gestionar un blog multilingüe con Sveltia CMS'
description: 'Flujo para generar PRs de traducción con GitHub Copilot.'
```

Esto afecta resultados de búsqueda, OGP, tarjetas relacionadas y RSS.

### 3. hreflang puede conectar variantes

Google recomienda `hreflang` cuando diferentes URLs representan diferentes idiomas o regiones. Con solo traducción de UI no hay URL localizada que conectar.

### 4. RSS y sitemap también son multilingües

Al existir archivos por idioma, el sitio puede generar `/es/rss.xml` y entradas localizadas en sitemap. Esto ayuda a buscadores, lectores RSS y servicios externos.

## Papel de Sveltia CMS

Sveltia CMS no es el motor de traducción. En este flujo, mantiene limpio el punto de edición del contenido japonés:

- artículos japoneses
- autores
- etiquetas
- JSON fuente en japonés
- imágenes
- frontmatter como fecha, FAQ y linkCards

La instalación de CMS está explicada en [Guía de instalación de Sveltia CMS](/es/blog/cms-selection-and-turnstile/).

## Reglas para Copilot

La tarea de traducción debe separar qué se traduce y qué se conserva.

```md
Keep:

- slug
- image path
- author id
- tag ids
- external URLs
- code blocks

Localize:

- title
- description
- FAQ
- link card text
- body text
- internal blog URLs when locale-specific URLs exist
```

Markdown mezcla texto, URLs, código y frontmatter. Sin reglas, se rompen enlaces o taxonomías.

## Lecciones de los PRs

- El sitio ya usaba Sveltia CMS, pero artículos antiguos seguían mencionando Pages CMS.
- Si `date` queda viejo, el artículo no sube al inicio del blog aunque se reescriba.
- El slug traducido debe coincidir con el original.
- Los enlaces internos en una traducción deben apuntar al locale correcto.
- La IA acelera, pero la revisión humana sigue siendo necesaria.

## Referencias

- [Google Search Central: Localized Versions of your Pages](https://developers.google.com/search/docs/advanced/crawling/localized-versions?hl=en&rd=1&visit_id=638856769088389068-716743185)
- [Google Search Central: Managing Multi-Regional and Multilingual Sites](https://developers.google.com/search/docs/advanced/crawling/managing-multi-regional-sites)
- [Google Search Central: JavaScript SEO Basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google Search Central: Spam Policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [Guía de instalación de Sveltia CMS](/es/blog/cms-selection-and-turnstile/)

## Resumen

La traducción de UI ayuda a leer una página. Las páginas estáticas localizadas convierten cada idioma en un activo real del sitio.

La separación es sencilla: Sveltia CMS edita el japonés, Copilot genera PRs de traducción y Astro build verifica que las páginas localizadas funcionen.
