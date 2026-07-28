---
title: 'Técnicas prácticas para mejorar PageSpeed en sitios Astro'
description: 'Técnicas prácticas de optimización para un sitio con Astro, UnoCSS y Cloudflare Pages. Incluye distribución de CSS, fuentes, imágenes responsive, control de carga de AdSense, carga diferida de GA4 y caché.'
date: 2026-03-15T00:00
lastUpdated: '2026-07-29T00:28:23+09:00'
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: /uploads/acecore-generated/blog-astro-performance-tuning.webp
callout:
  type: tip
  title: Público objetivo de este artículo
  text: 'Dirigido a quienes desean mejorar la puntuación de PageSpeed de su sitio Astro. Presentamos técnicas concretas y directamente aplicables sobre optimización de CSS, fuentes, imágenes y scripts de publicidad.'
processFigure:
  title: Flujo de optimización
  steps:
    - title: Estrategia de distribución de CSS
      description: Comprender el equilibrio entre inlining y archivos externos.
      icon: i-lucide-file-code
    - title: Optimización de fuentes
      description: Verificar qué fuentes se cargan y se usan para renderizar.
      icon: i-lucide-type
    - title: Optimización de imágenes
      description: Optimizar imágenes externas con Cloudflare Images + srcset + sizes.
      icon: i-lucide-image
    - title: Control de carga
      description: Revisar el intento inicial y los reintentos de AdSense, más la carga diferida de GA4.
      icon: i-lucide-timer
compareTable:
  title: Comparación antes y después de la optimización
  before:
    label: Antes de la optimización
    items:
      - Conexiones de fuentes y resultado renderizado sin comprobar
      - Salida CSS y caché sin comprobar
      - Imágenes distribuidas con tamaño fijo
      - Script de AdSense cargado inmediatamente
      - Seguimiento de puntuaciones fijas sin registrar las condiciones
  after:
    label: Después de la optimización
    items:
      - Solicitudes y fuentes renderizadas comprobadas
      - CSS grande externalizado y assets con hash en caché immutable
      - Tamaño óptimo distribuido según ancho de pantalla con srcset + sizes
      - AdSense comprueba si puede mostrarse en el intento inicial y reintenta con observers; GA4 carga tras interacción o temporizador
      - PageSpeed Insights repetido en condiciones equivalentes
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Qué es más rápido, CSS inlineado o externalizado?
      answer: "Depende del tamaño del CSS, la estructura de la página y la caché. Use la configuración actual build.inlineStylesheets: 'auto', revise el HTML y CSS generados y mida en condiciones equivalentes."
    - question: ¿Por qué es lento el CDN de Google Fonts?
      answer: 'Un dominio externo puede añadir DNS lookup, conexión TCP y handshake TLS. El efecto depende de la red y la caché; revise las solicitudes reales y las fuentes renderizadas antes de decidir.'
    - question: ¿Qué hacer si Cloudflare Images es lento?
      answer: 'El rendimiento de Cloudflare Images depende del origen, la transformación y el estado de la caché. La primera transformación y los fallos de caché aún descargan la imagen original; mida el candidato LCP en condiciones iguales y considere responsive preload solo cuando sea necesario.'
    - question: ¿El control de carga de AdSense afecta los ingresos?
      answer: 'El efecto varía según la posición del anuncio y el comportamiento de los visitantes. Compare la visibilidad, las solicitudes de anuncios y los ingresos antes y después, y evalúelos por separado de las métricas de rendimiento.'
---

## Introducción

El sitio oficial de Acecore está construido con Astro 7.1.3 + UnoCSS + Cloudflare Pages. Este artículo recoge ajustes de optimización verificados en el repositorio el 29 de julio de 2026.

Los resultados de PageSpeed Insights varían según el momento, el dispositivo y la red. Por eso no se publica una puntuación fija: los cambios se comparan en las mismas condiciones mediante Core Web Vitals y tamaño transferido.

---

## Por qué elegimos Astro

Astro admite generación de sitios estáticos (SSG) y permite añadir JavaScript del lado del cliente solo donde se necesita. El sitio actual también distribuye scripts de ClientRouter, búsqueda, anuncios y analítica, así que no se asume una página sin JavaScript: se miden el volumen entregado y las métricas de renderizado.

El sitio usa UnoCSS con `presetWind3()`. Genera CSS a partir de las utilidades detectadas durante el build, lo que puede reducir el tamaño entregado, pero no garantiza un mínimo. Revise el CSS generado y las clases realmente utilizadas.

---

## Estrategia de distribución de CSS: Inline vs Archivo externo

La distribución de CSS afecta el tamaño del HTML, las solicitudes adicionales y la caché del navegador.

### Al insertar CSS inline

Al configurar `build.inlineStylesheets: 'always'` en Astro, todo el CSS se incrusta directamente en el HTML. Se eliminan las peticiones a CSS externo y, según la página, puede mejorar el FCP (First Contentful Paint).

Las condiciones favorables dependen del tamaño del CSS y de la página; no se decide solo con un umbral fijo.

### Al usar CSS externo

Los archivos externos permiten reutilizar CSS compartido con hash mediante la caché del navegador.

El sitio actual usa `build.inlineStylesheets: 'auto'` y revisa la salida generada al ajustar este comportamiento.

### Solución: Externalización + caché immutable

Cambiar la configuración de Astro a `build.inlineStylesheets: 'auto'`. Astro decide automáticamente según el tamaño del CSS, y el CSS grande se distribuye como archivo externo.

```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    inlineStylesheets: 'auto',
  },
})
```

Los archivos CSS externos se generan en el directorio `/_astro/`, por lo que se configura caché immutable en los headers de Cloudflare Pages.

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

Tras cambiar la opción, revise el HTML generado, los archivos CSS y el comportamiento de la caché, y vuelva a ejecutar PageSpeed Insights en las mismas condiciones.

---

## Optimización de fuentes: Verificar la distribución real

### Comparar distribución externa y local

Las fuentes externas pueden añadir una conexión a la ruta crítica. La distribución local también envía CSS y archivos de fuente desde el sitio; compare ambos enfoques en las mismas condiciones.

Use el panel de red para revisar solicitudes, caché y tamaño transferido, y Rendered Fonts para ver qué fuentes utilizó realmente el navegador.

### Estado actual del repositorio

`package.json` incluye `@fontsource/noto-sans-jp`, pero a 29 de julio de 2026 no se importa desde ningún archivo de `src`. Una dependencia por sí sola no demuestra que la fuente se distribuya.

La pila de fuentes actual de UnoCSS es:

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', 'Yu Gothic', 'Meiryo', system-ui, sans-serif",
  },
}
```

Esta declaración no descarga una fuente web por sí sola. Si se adopta self-hosting, compruebe juntos el import explícito, el CSS y los archivos de fuente generados y el resultado renderizado.

---

## Optimización de imágenes: Cloudflare Images + srcset + sizes

### Transformaciones de Cloudflare Images

La utilidad actual envía solo imágenes externas por la transformación `/cdn-cgi/image/` de Cloudflare Images. Los archivos root-relative `/uploads/...` y las imágenes gestionadas en `asv.acecore.net/uploads/...` se sirven directamente.

- **Conversión de formato**: `output=auto` selecciona automáticamente AVIF / WebP según la compatibilidad del navegador
- **Ajuste de calidad**: La utilidad actual usa `quality=75` por defecto; revise la imagen real antes de cambiarlo
- **Redimensionamiento**: Redimensiona al ancho especificado con el parámetro `w=`

### Configuración de srcset y sizes

Para imágenes externas con entrega responsive, genere `srcset` y configure `sizes` mediante la utilidad.

```astro
---
import { generateSrcSet, optimizeImage } from '../utils/image'

const remoteImage =
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop'
---

<img
  src={optimizeImage(remoteImage, { width: 800, height: 400, quality: 75 })}
  srcset={generateSrcSet(remoteImage, [480, 640, 960, 1280, 1600], {
    quality: 75,
    aspectRatio: 2,
  })}
  sizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  width="800"
  height="400"
  loading="lazy"
  decoding="async"
/>
```

### Precisión de `sizes`

Si el atributo `sizes` permanece como `100vw` (ancho completo de pantalla), el navegador selecciona imágenes más grandes de lo necesario. Especifique según el layout real, como `calc(100vw - 2rem)` o `(max-width: 768px) 100vw, 50vw`.

### Mejora del LCP: preload

Precargue únicamente la imagen que sea realmente candidata a LCP. En imágenes responsive, mantenga `href`, `imagesrcset` e `imagesizes` del layout alineados con la imagen y use `fetchpriority="high"`. Las precargas adicionales pueden competir entre sí, por lo que hay que confirmar la elección mediante mediciones.

```html
<link
  rel="preload"
  as="image"
  href="..."
  imagesrcset="..."
  imagesizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  fetchpriority="high"
/>
```

### Prevención de CLS (Layout Shift)

Especifique valores precisos de `width` y `height` cuya proporción coincida con la imagen original. Los valores correctos permiten reservar espacio, pero los atributos por sí solos no garantizan eliminar el CLS. Las rutas actuales de hero y reescritura de Markdown también añaden dimensiones fijas; compare su proporción con cada original y mida el CLS.

Es especialmente fácil olvidar las imágenes de avatar (32×32, 48×48, 64×64px) y las miniaturas de YouTube (480×360px).

---

## Control de carga publicitaria y analítica diferida

### AdSense

El runtime actual, activo en las páginas japonesas `/blog/`, registra `IntersectionObserver` (`rootMargin: 200px`) y `ResizeObserver` en cada bloque, comprueba si puede mostrarse y ejecuta un `attemptInit()` inicial. Ese primer intento no espera la intersección, por lo que un bloque con ancho utilizable puede solicitar un anuncio de inmediato. Los observers permiten reintentar por intersección o cambio de tamaño. Las URL traducidas con prefijo de locale reciben bloques, pero actualmente no cargan este runtime.

```javascript
const retry = () => void attemptInit()
const intersectionObserver = new IntersectionObserver(
  (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      retry()
    }
  },
  { rootMargin: '200px' },
)
const resizeObserver = new ResizeObserver(retry)

intersectionObserver.observe(container)
resizeObserver.observe(container)
void attemptInit() // el intento inicial no espera la intersección
```

`attemptInit()` comprueba ancho y visibilidad, y los atributos de estado evitan solicitudes duplicadas.

### GA4

Google Analytics 4 se programa mediante `pointerdown`, `keydown`, `touchstart` o `scroll`. Usa `requestIdleCallback` cuando está disponible y `setTimeout` en caso contrario; si no hay interacción, un temporizador lo programa a los 12 segundos en la portada o a los 4 segundos en las demás páginas.

---

## Estrategia de caché

El bloque siguiente documenta la configuración actual de `_headers` en Cloudflare Pages. Estos valores no son una recomendación general para todos los archivos.

```
# Salida del build (nombres de archivo con hash)
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

# Índice de búsqueda
/pagefind/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

# HTML
/*
  Cache-Control: public, max-age=0, must-revalidate
```

- `/_astro/*` incluye hash en el nombre de archivo, por lo que un año de caché immutable es seguro
- `/pagefind/*` tiene actualmente 1 semana de caché + 1 día de stale-while-revalidate. Como `pagefind-entry.json`, de nombre fijo, referencia metadata con hash, conviene revalidar los archivos entry/bootstrap para evitar generaciones mezcladas y reservar la caché larga para chunks con hash
- HTML usa `max-age=0, must-revalidate` y se revalida antes de reutilizar la caché

---

## Checklist de optimización de rendimiento

1. **¿La estrategia de distribución de CSS es apropiada?**: Revisar la salida de `auto` y medir en las mismas condiciones
2. **¿Se ha comparado la distribución de fuentes?**: Medir self-hosting y CDN externo en las mismas condiciones
3. **¿Se verificó la distribución real de fuentes?**: Revisar solicitudes de red y Rendered Fonts
4. **¿Las imágenes con entrega responsive tienen srcset + sizes?**: Preparar tamaños pequeños para móvil
5. **¿Solo se precarga el candidato LCP real?**: Alinear srcset, sizes y prioridad responsive
6. **¿Son precisos width / height?**: Igualar la proporción original y medir CLS
7. **¿Es adecuado el control de AdSense/GA4?**: Revisar intento inicial y reintentos de AdSense, más interacciones y fallback de GA4
8. **¿Están configurados los headers de caché?**: Limitar immutable a assets con hash

---

## Resumen

El principio de la optimización de rendimiento se resume en **"no enviar lo innecesario"**. La distribución de CSS debe comprobarse con la salida real, y el self-hosting es una opción para las fuentes cuando encaja con la medición y la operación del sitio.

No trate una puntuación fija como resultado. Vuelva a medir Core Web Vitals y tamaño transferido en condiciones consistentes, incluido el comportamiento de anuncios y Analytics.

---

## Serie a la que pertenece este artículo

Este artículo es parte de la serie "[Guía de mejora de calidad de sitios Astro](/blog/website-improvement-batches/)". Las mejoras de SEO, accesibilidad y UX también se presentan en artículos individuales.
