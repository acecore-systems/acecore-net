---
title: 'Trampas y soluciones de Astro View Transitions — Guía de mejora de UX y calidad de código'
description: 'Soluciones para el problema de scripts que dejan de funcionar con View Transitions de Astro, implementación de búsqueda de texto completo con Pagefind, mejora de seguridad de tipos TypeScript, gestión centralizada de constantes y más. Guía práctica de mejora de UX y calidad de código.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'Webサイト']
image: https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&h=400&fit=crop&q=80
callout:
  type: warning
  title: Lectura imprescindible si usas View Transitions
  text: 'Al implementar ClientRouter (View Transitions) de Astro, las transiciones de página se vuelven fluidas, pero todos los scripts inline dejan de re-ejecutarse. Este artículo resume los patrones de solución y las técnicas de mejora de UX y calidad de código.'
processFigure:
  title: Proceso de mejora de UX
  steps:
    - title: Descubrimiento de problemas
      description: Listar los fallos de funcionamiento tras implementar View Transitions.
      icon: i-lucide-bug
    - title: Unificación de patrones
      description: Convertir todos los scripts a un patrón de inicialización unificado.
      icon: i-lucide-repeat
    - title: Implementación de búsqueda
      description: Implementar búsqueda de texto completo con Pagefind y organizar las vías de acceso.
      icon: i-lucide-search
    - title: Garantía de seguridad de tipos
      description: Eliminar tipos any y gestión centralizada de constantes para mejorar la mantenibilidad.
      icon: i-lucide-shield-check
compareTable:
  title: Comparación antes y después de la mejora
  before:
    label: Antes de la mejora
    items:
      - El menú hamburguesa no funciona tras la transición de página
      - Sin búsqueda interna del sitio
      - Tipos any y constantes hardcodeadas dispersas
      - Riesgo de violación CSP con onclick inline
  after:
    label: Después de la mejora
    items:
      - Todos los scripts funcionan correctamente con astro:after-swap
      - Búsqueda de texto completo con filtros en 3 ejes con Pagefind
      - Seguridad de tipos TypeScript y gestión centralizada de constantes
      - Conformidad CSP con addEventListener + atributos data
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Estas mejoras son válidas sin View Transitions?
      answer: 'Las mejoras distintas al patrón de inicialización de scripts (Pagefind, TypeScript, gestión de constantes) son válidas independientemente de si se usa View Transitions o no.'
    - question: ¿Hasta qué escala de sitio puede manejar Pagefind?
      answer: 'Pagefind está diseñado para sitios estáticos y funciona rápidamente incluso con sitios de miles de páginas. El índice de búsqueda se genera en el build y se ejecuta en el navegador, por lo que no hay carga en el servidor.'
    - question: ¿Los errores de tipo TypeScript funcionan si se ignoran?
      answer: 'Funcionan, pero los errores de tipo son señales previas de bugs. Especialmente al hacer type-safe los esquemas de contenido de Astro, se habilita la autocompletación del IDE al acceder a propiedades en las plantillas, mejorando significativamente la eficiencia de desarrollo.'
---

## Introducción

View Transitions (ClientRouter) de Astro es una función potente que hace las transiciones de página tan fluidas como una SPA. Sin embargo, al implementarla, surgen problemas como que el menú hamburguesa no se abre, el botón de búsqueda no responde o el slider se detiene.

En este artículo, presentamos las trampas de View Transitions y sus soluciones, así como técnicas prácticas para mejorar la UX y la calidad del código.

---

## Problema de scripts con View Transitions

### Por qué los scripts dejan de funcionar

En una transición de página normal, el navegador re-analiza el HTML y ejecuta todos los scripts. Sin embargo, View Transitions actualiza la página por diferencias en el DOM, por lo que **los scripts inline no se re-ejecutan**.

Los siguientes tipos de procesamiento se ven afectados:

- Apertura/cierre del menú hamburguesa
- Handler de clic del botón de búsqueda
- Slider de imagen hero
- Seguimiento de scroll del índice de contenidos
- Patrón facade de embed de YouTube

### Patrón de solución

Unificar todos los scripts en **funciones con nombre y re-registrarlos con `astro:after-swap`**.

```html
<script>
  function initHeader() {
    const menuBtn = document.querySelector('[data-menu-toggle]')
    menuBtn?.addEventListener('click', () => { /* ... */ })
  }

  // Ejecución inicial
  initHeader()

  // Re-ejecución después de View Transitions
  document.addEventListener('astro:after-swap', initHeader)
</script>
```

### Diferencia entre astro:after-swap y astro:page-load

- `astro:after-swap`: Se dispara justo después del intercambio del DOM. No se dispara en la carga inicial, por lo que es necesario llamar directamente a la función
- `astro:page-load`: Se dispara tanto en la carga inicial **como** después de View Transitions. Se puede omitir la llamada inicial

Para casos como el embed de YouTube donde se necesita que funcione de forma segura también en la carga inicial, `astro:page-load` es conveniente.

---

## Implementación de búsqueda de texto completo con Pagefind

Para implementar búsqueda de texto completo en un sitio estático, Pagefind es recomendable. Genera el índice en el build y ejecuta la búsqueda en el navegador, siendo rápido y sin necesidad de servidor.

### Configuración básica

```json
{
  "scripts": {
    "build": "astro build && pagefind --site dist"
  }
}
```

Se ejecuta Pagefind después del build de Astro, generando el índice en `dist/pagefind/`.

### Búsqueda por facetas

Con el atributo `data-pagefind-filter`, se puede filtrar por los 3 ejes de autor, año y tag.

```html
<span data-pagefind-filter="author">gui</span>
<span data-pagefind-filter="year">2026</span>
<span data-pagefind-filter="tag">Astro</span>
```

### Modal de búsqueda

Se implementa un modal de búsqueda que se abre con el atajo `Ctrl+K`. Cuando no hay resultados, se muestran enlaces al listado de artículos, página de servicios y contacto, para prevenir la salida del usuario.

### Integración con SearchAction

Al definir el parámetro `?q=` con los datos estructurados `SearchAction` de Google, se puede navegar directamente a la búsqueda del sitio desde los resultados de búsqueda. Se agrega un proceso para detectar el parámetro URL y abrir automáticamente el modal de búsqueda.

### Configuración de caché

Los archivos del índice de Pagefind tienen baja frecuencia de cambio, por lo que se habilita la caché en los headers de Cloudflare Pages.

```
/pagefind/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400
```

---

## Eliminación de onclick inline

Escribir `onclick="..."` directamente en HTML es práctico, pero causa la necesidad de `unsafe-inline` en CSP (Content Security Policy).

### Patrón de mejora

Reemplazar `onclick` con atributos `data-*` + `addEventListener`.

```html
<!-- Antes -->
<button onclick="window.openSearch?.()">Buscar</button>

<!-- Después -->
<button data-search-trigger>Buscar</button>
```

```javascript
document.querySelectorAll('[data-search-trigger]').forEach(btn => {
  btn.addEventListener('click', () => window.openSearch?.())
})
```

---

## Organización de la biblioteca de componentes

Tener componentes listos para usar al escribir artículos de blog aumenta la expresividad.

| Componente | Uso |
| --- | --- |
| Callout | Anotaciones de 4 tipos: info / warning / tip / note |
| Timeline | Visualización cronológica de eventos |
| FAQ | Preguntas y respuestas con datos estructurados |
| Gallery | Galería de imágenes con Lightbox |
| CompareTable | Tabla de comparación antes/después |
| ProcessFigure | Diagrama de proceso paso a paso |
| LinkCard | Tarjeta de enlace externo estilo OGP |
| YouTubeEmbed | Carga diferida con patrón facade |

Todos están diseñados para ser invocados desde el frontmatter del Markdown. Si existe `data.callout` en la plantilla del artículo, se renderiza un `<Callout>`.

---

## Mejora de seguridad de tipos TypeScript

### Eliminación de tipos any

Cambiar `any[]` → `CollectionEntry<'blog'>[]` con tipos concretos. Se habilita la autocompletación del IDE y la detección de errores en compilación, haciendo seguros los accesos a propiedades en las plantillas.

### Tipos literales del esquema de contenido

```typescript
type: z.enum(['info', 'warning', 'tip', 'note']).default('info')
```

Al definir los valores del frontmatter como unión de tipos literales, las bifurcaciones como `if (callout.type === 'info')` en la plantilla se vuelven type-safe.

### Aserción as const

Al agregar `as const` a objetos constantes, las propiedades se vuelven `readonly` y la inferencia de tipos se convierte en tipo literal. Siempre agreguelo a la constante `SITE`.

### Migración de imports obsoletos

Cambiar `import { z } from 'astro:content'`, que será eliminado en Astro 7, a `import { z } from 'astro/zod'`.

---

## Gestión centralizada de constantes

Los valores hardcodeados causan omisiones al hacer cambios. Se consolidaron los siguientes valores en `src/data/site.ts`.

| Constante | Número de ubicaciones antes de centralizar |
| --- | --- |
| AdSense Client ID | 4 archivos |
| GA4 Measurement ID | 2 ubicaciones |
| ID de slot de publicidad | 4 archivos |
| URLs sociales (X, GitHub, Discord, Aceserver) | 17 ubicaciones |
| Teléfono, email, LINE | 3 archivos |

```typescript
export const SITE = {
  name: 'Acecore',
  url: 'https://acecore.net',
  ga4Id: 'G-XXXXXXXXXX',
  adsenseClientId: 'ca-pub-XXXXXXXXXXXXXXXX',
  social: {
    x: 'https://x.com/acecore',
    github: 'https://github.com/acecore-systems',
    discord: 'https://discord.gg/...',
  },
} as const
```

---

## Otras mejoras de UX

### Seguimiento de scroll del índice de contenidos

Con `IntersectionObserver` se monitorizan los encabezados del contenido y se resalta el encabezado activo en el índice del sidebar. El punto clave es también hacer scroll del índice mismo con `scrollIntoView({ block: 'nearest', behavior: 'smooth' })`.

### Scroll spy

En páginas con estructura single-page como la de servicios, el ítem activo de la navegación se sigue automáticamente con `IntersectionObserver`.

### Paginación

Paginación automática cada 6 artículos, navegación con puntos suspensivos (`1 2 ... 9 10`), y enlaces de texto "← Anterior" y "Siguiente →". La lógica de paginación se centraliza en `src/utils/pagination.ts`.

### Anchor links con header sticky

Con un header sticky, al navegar con anchor links el destino queda oculto bajo el header. Se resuelve configurando lo siguiente en el preflight de UnoCSS:

```css
[id] { scroll-margin-top: 5rem; }
html { scroll-behavior: smooth; }
```

---

## Resumen

Si se usa View Transitions, lo más importante es **unificar el patrón de inicialización de scripts**. Comprenda la diferencia entre `astro:after-swap` / `astro:page-load` y pruebe todas las interacciones.

En cuanto a calidad de código, la seguridad de tipos TypeScript y la gestión centralizada de constantes contribuyen enormemente a la mantenibilidad a largo plazo. Al principio puede parecer tedioso, pero los beneficios de la autocompletación del IDE se sienten en el desarrollo diario.

---

## Serie a la que pertenece este artículo

Este artículo es parte de la serie "[Guía de mejora de calidad de sitios Astro](/blog/website-improvement-batches/)". Las mejoras de rendimiento, SEO y accesibilidad también se presentan en artículos individuales.
