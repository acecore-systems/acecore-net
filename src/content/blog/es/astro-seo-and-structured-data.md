---
title: 'Guía de mejora SEO para implementar datos estructurados y OGP en sitios Astro'
description: 'Resumen de los pasos para implementar correctamente datos estructurados JSON-LD, OGP, sitemap y RSS en un sitio con configuración Astro + Cloudflare Pages. Desde la compatibilidad con Rich Results de Google hasta la optimización del feed RSS, presentamos mejoras SEO prácticas.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'SEO']
image: https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Público objetivo de este artículo
  text: 'Contenido dirigido a quienes desean mejorar sistemáticamente el SEO de su sitio Astro. Presentamos procedimientos prácticos y directamente aplicables sobre tipos e implementación de datos estructurados, configuración de OGP, optimización de sitemap y más.'
processFigure:
  title: Flujo de mejora SEO
  steps:
    - title: Preparación de meta tags
      description: Configurar title, description, canonical y OGP en todas las páginas.
      icon: i-lucide-file-text
    - title: Datos estructurados
      description: Transmitir el significado de las páginas a Google con JSON-LD.
      icon: i-lucide-braces
    - title: Sitemap
      description: Configurar prioridad y frecuencia de actualización por tipo de página.
      icon: i-lucide-map
    - title: RSS
      description: Distribuir un feed de alta calidad incluyendo información de autor y categoría.
      icon: i-lucide-rss
insightGrid:
  title: Datos estructurados implementados
  items:
    - title: Organization
      description: Mostrar nombre de empresa, URL, logo y contacto en resultados de búsqueda.
      icon: i-lucide-building
    - title: BlogPosting
      description: Rich Results de artículos con autor, fecha de publicación, fecha de actualización e imagen.
      icon: i-lucide-pen-line
    - title: BreadcrumbList
      description: Generar la estructura jerárquica de todas las páginas como breadcrumbs.
      icon: i-lucide-chevrons-right
    - title: FAQPage
      description: Activar Rich Results de preguntas frecuentes en artículos con FAQ.
      icon: i-lucide-help-circle
    - title: WebPage / ContactPage
      description: Asignar tipos específicos a la página principal y la de contacto.
      icon: i-lucide-layout
    - title: SearchAction
      description: Permitir la búsqueda interna del sitio directamente desde los resultados de Google.
      icon: i-lucide-search
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Al agregar datos estructurados, los resultados de búsqueda cambian inmediatamente?
      answer: 'No. Se necesitan de varios días a varias semanas hasta que Google rastree y re-indexe. Puede verificar el estado de la aplicación en el informe de "Rich Results" de Google Search Console.'
    - question: ¿Cuál es el tamaño adecuado para la imagen OGP?
      answer: '1200×630px es lo recomendado. Al mostrar con summary_large_image en X (Twitter), esta proporción es óptima.'
    - question: ¿El priority del sitemap afecta al SEO?
      answer: 'Google ha declarado oficialmente que ignora el priority, pero otros motores de búsqueda pueden tomarlo como referencia. No hay desventaja en configurarlo.'
---

## Introducción

Cuando se piensa en SEO, puede venir a la mente "rellenar con palabras clave", pero la esencia del SEO moderno es **transmitir con precisión la estructura y contenido del sitio a los motores de búsqueda**.

En este artículo, explicamos las medidas SEO que deben implementarse en un sitio Astro, divididas en 4 categorías. Todas son medidas que, una vez configuradas, proporcionan resultados continuos.

---

## Configuración de OGP y meta tags

El OGP y los meta tags son responsables de la apariencia al compartir en redes sociales y de transmitir información a los motores de búsqueda.

### Meta tags básicos

En el componente de layout de Astro, se generan los siguientes elementos para cada página:

- `og:title` / `og:description` / `og:image` — Título, descripción e imagen al compartir en redes sociales
- `twitter:card` = `summary_large_image` — Mostrar tarjeta con imagen grande en X (Twitter)
- `rel="canonical"` — Especificar la URL canónica de páginas duplicadas
- `rel="prev"` / `rel="next"` — Indicar la relación anterior/siguiente en la paginación

### Meta tags para artículos de blog

Las páginas de artículos tienen adicionalmente lo siguiente:

- `article:published_time` / `article:modified_time` — Fecha de publicación y actualización
- `article:tag` — Información de tags del artículo
- `article:section` — Categoría del contenido

### Puntos de implementación

Una configuración donde el componente de layout recibe `title` / `description` / `image` como props y cada página los pasa, permite generar meta tags consistentes en todas las páginas. El `og:title` de la página principal no debe ser "Inicio", sino un título concreto que incluya el nombre del sitio y el eslogan.

---

## Implementación de datos estructurados (JSON-LD)

Los datos estructurados son un mecanismo para que los motores de búsqueda comprendan mecánicamente el contenido de las páginas. Si se implementan correctamente, existe la posibilidad de que se muestren Rich Results (FAQ, breadcrumbs, información del autor, etc.) en los resultados de búsqueda.

### Organization

Transmite información de la empresa a Google. Existe la posibilidad de que se muestre en el Knowledge Panel.

```json
{
  "@type": "Organization",
  "name": "Acecore",
  "url": "https://acecore.net",
  "logo": "https://acecore.net/logo.png",
  "contactPoint": { "@type": "ContactPoint", "telephone": "..." }
}
```

En la página de información de la empresa, también se puede agregar el campo `knowsAbout` para especificar las áreas de negocio.

### BlogPosting

Se configura `BlogPosting` para artículos de blog. Al incluir autor, fecha de publicación, fecha de actualización e imagen de portada, se obtiene visualización con información del autor en Google Discover y resultados de búsqueda.

### BreadcrumbList

Los datos estructurados de breadcrumbs se configuran en todas las páginas. Un punto de atención en la implementación: verificar si las rutas intermedias (como `/blog/tags/`, una página de listado) realmente existen, y no generar la propiedad `item` para rutas que no existen.

### FAQPage

Se generan datos estructurados `FAQPage` para artículos con FAQ. En Astro, es conveniente definir un campo `faq` en el frontmatter y detectar/generar datos en la plantilla.

### WebSite + SearchAction

Si hay búsqueda interna en el sitio, al configurar `SearchAction`, puede aparecer un cuadro de búsqueda del sitio en los resultados de Google. Combinado con motores de búsqueda como Pagefind, y configurando un mecanismo donde el modal de búsqueda se abre automáticamente con el parámetro `?q=`, también se mejora la experiencia del usuario.

---

## Optimización del sitemap

Usando el plugin `@astrojs/sitemap` de Astro, el sitemap se genera automáticamente, pero con la configuración predeterminada no es suficiente.

### Configuración por tipo de página

Usando la función `serialize()`, se configuran `changefreq` y `priority` según el patrón de URL de cada página.

| Tipo de página | changefreq | priority |
| --- | --- | --- |
| Página principal | daily | 1.0 |
| Artículos de blog | weekly | 0.8 |
| Otros | monthly | 0.6 |

### Configuración de lastmod

Se establece la fecha/hora del build en `lastmod` para transmitir la frescura del contenido a los motores de búsqueda. Si el artículo de blog tiene un campo `lastUpdated` en el frontmatter, se le da prioridad.

---

## Expansión del feed RSS

RSS tiende a ser algo que se configura y se olvida, pero mejorar la calidad del feed mejora la visualización en lectores RSS y la experiencia de los suscriptores.

### Información a agregar

- **author**: Incluir el nombre del autor por artículo
- **categories**: Agregar información de tags como categorías para mejorar la clasificación en lectores RSS

```typescript
items: posts.map(post => ({
  title: post.data.title,
  description: post.data.description,
  link: `/blog/${post.id}/`,
  pubDate: post.data.date,
  author: post.data.author,
  categories: post.data.tags,
}))
```

---

## Checklist de mejora SEO

Finalmente, resumimos los puntos a verificar en la mejora SEO de un sitio Astro.

1. **¿Se ha configurado URL canonical en todas las páginas?**
2. **¿Se ha preparado una imagen OGP única para cada página?**
3. **Validación de datos estructurados**: Verificar con la [Prueba de Rich Results de Google](https://search.google.com/test/rich-results)
4. **¿Las rutas intermedias de breadcrumbs son URLs reales?**
5. **¿El sitemap no contiene páginas innecesarias (como 404)?**
6. **¿El feed RSS incluye autor y categorías?**
7. **¿Se excluyen del rastreo los índices de búsqueda (`/pagefind/`, etc.) en robots.txt?**

Si se configuran todos estos elementos, la base del SEO estará lista. Lo que determinará el ranking de búsqueda será la calidad del contenido y la frecuencia de actualización.

---

## Serie a la que pertenece este artículo

Este artículo es parte de la serie "[Guía de mejora de calidad de sitios Astro](/blog/website-improvement-batches/)". Las mejoras de rendimiento, accesibilidad y UX también se presentan en artículos individuales.
