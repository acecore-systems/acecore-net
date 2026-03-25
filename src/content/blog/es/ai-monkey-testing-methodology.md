---
title: 'Metodología práctica de monkey testing para sitios web con GitHub Copilot × Playwright'
description: 'Registro práctico de monkey testing sistemático en un sitio estático combinando el modo agente de VS Code (GitHub Copilot) con las herramientas de navegador Playwright. Desde el diseño de pruebas hasta los bugs descubiertos y corregidos, y propuestas de mejora.'
date: 2026-03-25
author: gui
tags: ['技術', 'GitHub Copilot', 'VS Code', 'Astro', 'Webサイト']
image: https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Público objetivo de este artículo
  text: 'Dirigido a quienes están interesados en la automatización de pruebas con IA, quieren optimizar el aseguramiento de calidad de sitios web, o desean aprovechar el modo agente de GitHub Copilot.'
processFigure:
  title: Proceso del monkey testing con IA
  steps:
    - title: Inventario
      description: Leer todo el código fuente e identificar rutas, componentes e interacciones a probar.
      icon: i-lucide-clipboard-list
    - title: Prueba de recorrido
      description: Enviar peticiones HTTP a todas las rutas y detectar códigos de estado, imágenes rotas y enlaces vacíos.
      icon: i-lucide-globe
    - title: Verificación de interacciones
      description: Operar y verificar elementos con JS como apertura/cierre de FAQ, botón de copiar, modal de búsqueda y embeds de YouTube.
      icon: i-lucide-mouse-pointer-click
    - title: Auditoría de estructura y SEO
      description: Verificar datos estructurados, OGP, meta tags, jerarquía de encabezados y accesibilidad en todas las páginas.
      icon: i-lucide-shield-check
compareTable:
  title: Comparación con pruebas manuales
  before:
    label: Pruebas manuales tradicionales
    items:
      - Verificación visual página por página en el navegador
      - Creación y gestión manual de checklists
      - Propenso a omisiones en la verificación
      - Se requiere tiempo para documentar los pasos de reproducción
  after:
    label: Monkey testing con IA
    items:
      - Recorrido automático de todas las rutas verificando estado HTTP y estructura DOM
      - La IA extrae automáticamente los objetivos de prueba del código fuente
      - Detección sin omisiones de imágenes rotas, enlaces vacíos y errores JS
      - Descubrimiento → identificación de causa → corrección → re-verificación completados en una sola sesión
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿El modo agente de GitHub Copilot es gratuito?
      answer: 'El plan GitHub Copilot Free tiene un límite mensual de uso del modo agente. Los planes Pro o Business tienen límites más generosos. Las funciones más recientes están disponibles primero en VS Code Insiders.'
    - question: ¿Se puede hacer lo mismo con herramientas de navegador distintas a Playwright?
      answer: 'Se utilizan las herramientas de navegador integradas en VS Code (Simple Browser + integración con Playwright). Copilot opera el navegador directamente con la herramienta run_playwright_code, por lo que no es necesario instalar Playwright por separado.'
    - question: ¿Se puede aplicar a sitios que no son estáticos?
      answer: 'Sí. El mismo enfoque es posible con sitios SPA o SSR. Sin embargo, para páginas que requieren autenticación, es necesario contar con un mecanismo para gestionar credenciales de prueba de forma segura.'
    - question: ¿Se puede dejar que la IA también corrija los bugs encontrados?
      answer: 'En el modo agente es posible leer y escribir archivos, por lo que se puede completar todo el flujo desde la detección del bug hasta la corrección y verificación del build en una sola sesión. En este artículo se descubrieron 2 bugs y se corrigieron en el momento.'
---

## Introducción

El aseguramiento de calidad de un sitio web no es suficiente con una sola revisión antes del lanzamiento. Cada vez que se añade contenido, se actualizan librerías o se modifican configuraciones de CDN, pueden surgir problemas inesperados.

En este artículo, resumimos el registro práctico en el que **el modo agente de VS Code (GitHub Copilot)** operó directamente el navegador para realizar monkey testing en todo el sitio. Desde el análisis estático del código fuente hasta la verificación dinámica en el navegador, sistematizamos los métodos de prueba ejecutados de forma consistente por la IA.

---

## Entorno de pruebas

| Elemento | Detalle |
|------|------|
| Editor | VS Code + GitHub Copilot (modo agente) |
| Modelo de IA | Claude Opus 4.6 |
| Operación del navegador | Herramientas Playwright integradas en VS Code |
| Objetivo de prueba | Sitio estático con configuración Astro + UnoCSS + Cloudflare Pages |
| Vista previa | `npm run preview` (local) + URL de producción |

En el modo agente, Copilot ejecuta autónomamente comandos de terminal, lectura/escritura de archivos y operación del navegador. El tester solo necesita indicar "por favor, realiza las pruebas" y la IA ejecuta automáticamente todos los pasos siguientes.

---

## Fase 1: Inventario de objetivos de prueba

### Lectura completa del código fuente

La IA primero recorre la estructura de directorios del proyecto y lee todo el código fuente de componentes, páginas y utilidades.

```
src/
├── components/    ← Lectura completa de 28 componentes
├── content/blog/  ← Análisis del frontmatter de 16 artículos
├── pages/         ← Comprensión de todos los archivos de enrutamiento
├── layouts/       ← Comprensión de la estructura del BaseLayout
└── utils/         ← Verificación de plugins rehype y generación de imágenes OG
```

En esta etapa, la IA comprende automáticamente lo siguiente:

- **Lista completa de rutas**: 7 páginas estáticas + rutas de blog (artículos, tags, archivo, autores, paginación)
- **Elementos interactivos**: modal de búsqueda, acordeón FAQ, botón de copiar, facade de YouTube, scroll to top, slider hero
- **Integraciones externas**: ssgform.com (formulario), Cloudflare Turnstile (protección anti-bot), Google AdSense, GA4

### Generación automática del plan de pruebas

A partir del análisis del código fuente, la IA genera automáticamente un plan de pruebas como lista de tareas. No es necesario que un humano cree el checklist.

---

## Fase 2: Prueba de recorrido de todas las rutas

### Verificación de estado HTTP

Se inicia el sitio compilado con `npm run preview` y se accede a todas las rutas con Playwright.

```
Objetivos de prueba: 31 rutas
├── Páginas estáticas      7 (/, /about/, /services/, etc.)
├── Artículos de blog     16
├── Páginas de tags        24
├── Archivo                4
├── Paginación             2 (/blog/page/2/, /blog/page/3/)
├── Páginas de autores     2
├── RSS                    1
└── Prueba 404             1

Resultado: Todas las rutas 200 OK (excepto 404 intencional)
```

### Verificación de estructura DOM

Se verifican automáticamente los siguientes elementos en cada página:

| Elemento verificado | Método de verificación | Resultado |
|-------------|---------|------|
| Imágenes rotas | `img.complete && img.naturalWidth === 0` | 0 |
| Enlaces vacíos | `href` vacío, `#` o no establecido | 0 |
| Enlaces externos inseguros | `target="_blank"` sin `rel="noopener"` | 0 |
| Cantidad de H1 | `document.querySelectorAll('h1').length === 1` | Todas las páginas OK |
| Enlace de salto | Existencia de "Saltar al contenido" | Todas las páginas OK |
| Atributo lang | `html[lang="ja"]` | Todas las páginas OK |

### Verificación de enlaces muertos

Se recopilan recursivamente los enlaces internos desde la página de inicio y se confirma el acceso a las 55 URLs únicas. Los enlaces muertos fueron **0**.

---

## Fase 3: Verificación de interacciones

La IA opera directamente los elementos del navegador con Playwright para verificar las funciones que dependen de JavaScript.

### FAQ (elemento `<details>`)

```javascript
// Ejemplo de código de prueba ejecutado por la IA
const details = document.querySelectorAll('details');
// Estado inicial: todos cerrados → OK
// Clic para abrir → OK
// Segundo clic para cerrar → OK
```

### Modal de búsqueda (Pagefind)

1. Abrir el diálogo de búsqueda con `window.openSearch()`
2. Esperar a que se complete la carga de Pagefind UI
3. Escribir "Astro" y confirmar que aparecen resultados
4. Confirmar que se cierra con la tecla ESC

### Patrón facade de YouTube

1. Hacer clic en el elemento `.yt-facade`
2. Confirmar que se genera dinámicamente un iframe de `youtube-nocookie.com/embed/`
3. Confirmar que se incluye el parámetro `autoplay=1`

### Botón de copiar (después de View Transitions)

Confirmar que **después** de la navegación con View Transitions, el botón de copiar del bloque de código se reinicializa y funciona. El re-registro mediante el evento `astro:page-load` funcionaba correctamente.

### Botón ScrollToTop

Hacer scroll hasta el final de la página → el botón se muestra → clic → confirmar que `window.scrollY` vuelve a 0.

---

## Fase 4: Auditoría de SEO y datos estructurados

### Meta tags OGP

Se verificaron los siguientes elementos en todas las páginas:

- `og:title` / `og:description` / `og:image` / `og:url` / `og:type` están configurados
- `twitter:card` está configurado como `summary_large_image`
- La URL `canonical` es correcta
- La URL de la imagen OG existe y tiene el tamaño recomendado (1200×630)

### Datos estructurados (JSON-LD)

Se analizó el JSON-LD de cada página y se verificaron los tipos y contenidos del esquema.

| Tipo de página | Datos estructurados |
|-------------|-------------|
| Común a todas las páginas | Organization, WebSite |
| Artículos de blog | BreadcrumbList, BlogPosting, FAQPage |
| Artículos con FAQ | FAQPage (mainEntity contiene preguntas y respuestas) |

### Sitemap

Se confirmó que `sitemap-index.xml` → `sitemap-0.xml` registra las 57 URLs completas. La referencia al sitemap desde `robots.txt` también era correcta.

---

## Fase 5: Verificación de accesibilidad

Se ejecutaron verificaciones equivalentes al motor AXE con Playwright en múltiples páginas.

| Elemento verificado | Páginas verificadas | Violaciones |
|-------------|-------------|--------|
| Atributo alt de elementos img | 4 | 0 |
| Etiqueta de elementos button | 4 | 0 |
| Jerarquía de encabezados (orden h1→h2→h3) | 4 | 0 |
| Label de inputs de formulario | 1 (Contacto) | 0 |
| Elementos landmark | 4 | 0 |
| Atributo rel de enlaces externos | 4 | 0 |
| Valores apropiados de tabindex | 4 | 0 |

El resultado fue **cero violaciones en todas las páginas y todos los elementos verificados**.

---

## Fase 6: Prueba de transición con View Transitions

En las transiciones de página con Astro View Transitions, el DOM se actualiza de forma diferencial, por lo que la reinicialización de JavaScript se convierte en un desafío. Se verificaron los siguientes patrones de transición:

```
Inicio → Lista de blog → Artículo → Tag → Autor → Contacto → Servicios → Inicio
```

Elementos confirmados después de cada transición:

- URL, título y H1 se actualizan correctamente
- El botón de búsqueda funciona
- El botón de copiar se reinicializa
- La navegación breadcrumb se actualiza
- **Cero errores JS**

---

## Fase 7: Verificación de cabeceras de seguridad

Resultado de la verificación de las cabeceras de respuesta del sitio en producción:

| Cabecera | Valor | Evaluación |
|---------|-----|------|
| Content-Security-Policy | Configuración completa | ◎ |
| X-Frame-Options | SAMEORIGIN | ◎ |
| X-Content-Type-Options | nosniff | ◎ |
| Strict-Transport-Security | max-age=15552000 | ○ |
| Referrer-Policy | strict-origin-when-cross-origin | ◎ |
| Permissions-Policy | geolocation=(), camera=(), etc. | ◎ |

---

## Bugs descubiertos y correcciones

En estas pruebas se descubrieron 2 bugs y se completó la corrección dentro de la sesión.

### Bug 1: Falta de resiliencia en el modal de búsqueda

**Síntoma**: Si se presiona el botón de búsqueda antes de que se complete la carga del script de Pagefind, la UI no responde.

**Causa**: No había mecanismo de reintento después de que `loadPagefindScript()` fallara una vez.

**Corrección**: Se implementó la limpieza del caché de Promise en caso de fallo y una UI de respaldo que muestra un botón de "Recargar" al usuario.

### Bug 2: Falta de orígenes de Google en la cabecera CSP

**Síntoma**: Los recursos relacionados con Google AdSense son bloqueados por CSP, mostrando errores en la consola.

**Causa**: `connect-src` y `frame-src` no incluían `https://www.google.com` / `https://www.google.co.jp`.

**Corrección**: Se añadieron los orígenes de Google a las directivas CSP en `public/_headers`.

---

## Sistematización de la metodología de pruebas

Al organizar la metodología de este monkey testing con IA, se puede clasificar en las siguientes capas:

### Capa 1: Análisis estático (lectura del código fuente)

- Recorrido de la estructura de directorios
- Comprensión de dependencias entre componentes
- Análisis del esquema de frontmatter (Zod)
- Verificación de configuración CSP y redirecciones

### Capa 2: Pruebas de capa HTTP (recorrido de todas las rutas)

- Verificación de códigos de estado (200/404/301)
- Auditoría de cabeceras de respuesta (seguridad, caché)
- Coherencia de sitemap, robots.txt y ads.txt

### Capa 3: Pruebas de capa DOM (verificación estructural)

- Imágenes rotas, enlaces vacíos, enlaces externos inseguros
- Unicidad de H1 y jerarquía de encabezados
- Meta tags (OGP, canonical, description)
- Datos estructurados (JSON-LD)

### Capa 4: Pruebas de capa de interacción (verificación funcional)

- Clic, entrada, operación por teclado
- Apertura/cierre de modales, validación de formularios
- Reinicialización de JS después de View Transitions
- Eventos de scroll, carga diferida

### Capa 5: Pruebas de capa de accesibilidad

- Atributos alt, etiquetas, ARIA
- Jerarquía de encabezados, landmarks
- Gestión de foco, tabindex
- Enlace de salto

---

## Limitaciones y restricciones

El monkey testing con IA tiene algunas restricciones:

| Restricción | Detalle |
|------|------|
| Emulación de viewport | El navegador integrado de VS Code no puede emular el ancho móvil. La validez del CSS se sustituyó con análisis estático de la salida del build |
| Estado de red | No es posible simular red offline o de baja velocidad. Las pruebas de Service Worker tampoco son objetivo |
| "Sensación" del usuario | La belleza del diseño, legibilidad y coherencia con la marca requieren juicio humano |
| Flujo de autenticación | Las páginas que requieren login necesitan gestión segura de credenciales por separado |

La compatibilidad responsive de CSS se sustituyó analizando directamente el archivo CSS de la salida del build y confirmando que los media queries `@media(min-width:768px)` se generaban correctamente.

---

## Resumen

El modo agente de GitHub Copilot puede completar todo el ciclo de QA, desde un simple "por favor, realiza las pruebas", pasando por análisis del código fuente → plan de pruebas → operación automática del navegador → corrección de bugs → re-verificación.

Los resultados de esta vez se resumen a continuación:

- **Objetivos de prueba**: 31 rutas + 24 tags + 4 archivos + 2 paginaciones = 61 rutas
- **Elementos de prueba**: Estado HTTP, estructura DOM, interacciones, SEO, accesibilidad, seguridad, View Transitions
- **Bugs descubiertos**: 2 (modal de búsqueda, cabecera CSP) → corregidos en el momento
- **Violaciones de accesibilidad**: 0
- **Enlaces muertos**: 0

Combinando la verificación visual humana con la verificación automatizada por IA, se logra tanto la cobertura como la eficiencia de las pruebas.
