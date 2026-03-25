---
title: 'Técnicas prácticas para lograr 99 puntos en PageSpeed móvil en sitios Astro'
description: 'Presentamos las técnicas de optimización realizadas para alcanzar 99 puntos móviles en PageSpeed Insights en un sitio con configuración Astro + UnoCSS + Cloudflare Pages. Desde la estrategia de distribución de CSS, trampas en la configuración de fuentes, imágenes responsive, carga diferida de AdSense hasta configuración de caché.'
date: 2026-03-15
lastUpdated: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80
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
      description: Eliminar la latencia de CDN externo con self-hosting.
      icon: i-lucide-type
    - title: Optimización de imágenes
      description: Distribuir el tamaño óptimo con wsrv.nl + srcset + sizes.
      icon: i-lucide-image
    - title: Carga diferida
      description: Inyectar AdSense y GA4 en la primera interacción.
      icon: i-lucide-timer
compareTable:
  title: Comparación antes y después de la optimización
  before:
    label: Antes de la optimización
    items:
      - Google Fonts CDN (bloqueo de renderizado)
      - 190 KiB de CSS inlineado en HTML
      - Imágenes distribuidas con tamaño fijo
      - Script de AdSense cargado inmediatamente
      - Puntuación móvil en los 70
  after:
    label: Después de la optimización
    items:
      - 'Self-hosting con @fontsource (referenciando el nombre correcto de fuente)'
      - CSS externalizado y distribuido con caché immutable
      - Tamaño óptimo distribuido según ancho de pantalla con srcset + sizes
      - AdSense y GA4 con carga diferida al primer scroll
      - Móvil 99 puntos, escritorio 100 puntos
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Qué es más rápido, CSS inlineado o externalizado?
      answer: 'Depende del tamaño total del CSS. Si es menos de 20 KiB, el inlining es ventajoso. Si es mayor, externalizar y aprovechar la caché del navegador hace que los accesos posteriores al primero sean significativamente más rápidos.'
    - question: ¿Por qué es lento el CDN de Google Fonts?
      answer: 'PageSpeed Insights simula slow 4G (aprox. 1.6 Mbps, RTT 150ms). La conexión a un dominio externo requiere DNS lookup + conexión TCP + handshake TLS, y esta latencia causa bloqueo de renderizado. Con self-hosting se distribuye desde el mismo dominio, eliminando esta latencia.'
    - question: ¿Qué hacer si wsrv.nl es lento?
      answer: 'wsrv.nl se distribuye a través del CDN de Cloudflare, por lo que normalmente es rápido. Sin embargo, si la caché del CDN no impacta durante la medición de PageSpeed, el LCP puede empeorar. Para imágenes importantes, configure <link rel="preload"> para indicar al navegador una obtención temprana.'
    - question: ¿La carga diferida de AdSense afecta los ingresos?
      answer: 'Si no hay publicidad en el primer pliegue, la carga al primer scroll tiene prácticamente el mismo momento de visualización. El efecto SEO de la mejora de velocidad de página tiene un impacto más positivo.'
---

## Introducción

El sitio oficial de Acecore está construido con Astro 6 + UnoCSS + Cloudflare Pages. En este artículo, presentamos las técnicas de optimización realizadas para alcanzar **99 puntos móviles y 100 puntos de escritorio** en PageSpeed Insights.

Las puntuaciones finales alcanzadas son las siguientes:

| Indicador | Móvil | Escritorio |
| --- | --- | --- |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

---

## Por qué elegimos Astro

Lo que se requiere de un sitio corporativo es "velocidad" y "SEO". Astro está especializado en la generación de sitios estáticos (SSG) y logra cero JavaScript por defecto. Como los componentes de frameworks como React o Vue no se envían al cliente, la visualización inicial es extremadamente rápida.

Como framework CSS adoptamos UnoCSS. Tiene un enfoque utility-first similar a Tailwind CSS, pero extrae solo las clases utilizadas en el build, minimizando el tamaño del CSS. Desde la v66 se recomienda `presetWind3()`, así que es recomendable migrar.

---

## Estrategia de distribución de CSS: Inline vs Archivo externo

Lo que tuvo mayor impacto en la puntuación de PageSpeed fue la estrategia de distribución de CSS.

### Cuando el tamaño de CSS es pequeño (~20 KiB)

Al configurar `build.inlineStylesheets: 'always'` en Astro, todo el CSS se incrusta directamente en el HTML. Al no requerir peticiones HTTP a archivos CSS externos, se mejora el FCP (First Contentful Paint).

Si el CSS es de hasta unos 20 KiB, este método es óptimo.

### Cuando el tamaño de CSS es grande (20 KiB~)

Sin embargo, al usar fuentes web japonesas (`@fontsource-variable/noto-sans-jp`), la situación cambia. Este paquete contiene **124 declaraciones `@font-face`** (aprox. 96.7 KiB), y el CSS total alcanza unos 190 KiB.

Si se inlinean los 190 KiB de CSS en todos los HTML, la página de inicio crece hasta **225 KiB**. En slow 4G, solo la transferencia de este HTML toma aproximadamente 1 segundo.

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

Con este cambio, el tamaño del HTML se **redujo un 84-91%** (ejemplo: index.html de 225 KiB → 35 KiB) y la puntuación de PageSpeed mejoró de **96 a 99 puntos**.

---

## Optimización de fuentes: Configuración correcta de self-hosting

### Evitar Google Fonts CDN

Google Fonts CDN es práctico, pero fatal en las pruebas móviles de PageSpeed Insights. En pruebas reales, con Google Fonts CDN la puntuación bajó hasta **FCP 6.1 segundos y 62 puntos**.

En slow 4G, la conexión a un dominio externo genera una cadena de DNS lookup → conexión TCP → handshake TLS → descarga CSS → descarga de fuente, retrasando significativamente el renderizado.

### Implementación de self-hosting

Simplemente instale `@fontsource-variable/noto-sans-jp` e impórtelo en el archivo de layout.

```bash
npm install @fontsource-variable/noto-sans-jp
```

```javascript
// BaseLayout.astro
import '@fontsource-variable/noto-sans-jp'
```

### Precaución: discrepancia en el nombre de la fuente

Aquí hay una trampa inesperada. El nombre de fuente que `@fontsource-variable/noto-sans-jp` registra en `@font-face` es **`Noto Sans JP Variable`**. Sin embargo, muchas personas escriben `Noto Sans JP` en CSS.

Si hay esta discrepancia, **la fuente no se aplica correctamente y el navegador sigue usando la fuente de respaldo**. A pesar de haber cargado 96.7 KiB de datos de fuente, no se utilizan en absoluto.

Especifique correctamente la familia de fuentes en la configuración de UnoCSS.

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP Variable', 'Hiragino Kaku Gothic ProN', 'メイリオ', sans-serif",
  },
}
```

Si aparecen errores de tipo TypeScript, agregue una declaración de módulo en `src/env.d.ts`.

```typescript
declare module '@fontsource-variable/noto-sans-jp';
```

---

## Optimización de imágenes: wsrv.nl + srcset + sizes

### Proxy wsrv.nl

Las imágenes externas se distribuyen a través de [wsrv.nl](https://images.weserv.nl/). Solo con agregar parámetros a la URL se realizan automáticamente los siguientes procesos:

- **Conversión de formato**: `output=auto` selecciona automáticamente AVIF / WebP según la compatibilidad del navegador
- **Ajuste de calidad**: `q=50` reduce el tamaño del archivo aproximadamente un 10% manteniendo calidad suficiente
- **Redimensionamiento**: Redimensiona al ancho especificado con el parámetro `w=`

### Configuración de srcset y sizes

Configure `srcset` y `sizes` en todas las imágenes para distribuir el tamaño óptimo según el ancho de pantalla.

```html
<img
  src="https://wsrv.nl/?url=...&w=800&output=auto&q=50"
  srcset="
    https://wsrv.nl/?url=...&w=480&output=auto&q=50 480w,
    https://wsrv.nl/?url=...&w=640&output=auto&q=50 640w,
    https://wsrv.nl/?url=...&w=960&output=auto&q=50 960w,
    https://wsrv.nl/?url=...&w=1280&output=auto&q=50 1280w,
    https://wsrv.nl/?url=...&w=1600&output=auto&q=50 1600w
  "
  sizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  loading="lazy"
  decoding="async"
/>
```

### Precisión de `sizes`

Si el atributo `sizes` permanece como `100vw` (ancho completo de pantalla), el navegador selecciona imágenes más grandes de lo necesario. Especifique según el layout real, como `calc(100vw - 2rem)` o `(max-width: 768px) 100vw, 50vw`.

### Mejora del LCP: preload

Para imágenes que afectan el LCP (Largest Contentful Paint), configure `<link rel="preload">`. Agregue props `preloadImage` al componente de layout de Astro y especifique las imágenes que deben cargarse con prioridad máxima, como la imagen hero de la página principal.

```html
<link rel="preload" as="image" href="..." />
```

### Prevención de CLS (Layout Shift)

Especifique explícitamente los atributos `width` y `height` en todas las imágenes. El navegador reserva previamente el área de visualización de la imagen, previniendo cambios de layout (CLS) al completarse la carga.

Es especialmente fácil olvidar las imágenes de avatar (32×32, 48×48, 64×64px) y las miniaturas de YouTube (480×360px).

---

## Carga diferida de publicidad y analítica

### AdSense

El script de Google AdSense pesa aproximadamente 100 KiB y afecta significativamente la visualización inicial. Se cambia a un método de inyección dinámica del script cuando el usuario hace scroll por primera vez.

```javascript
window.addEventListener('scroll', () => {
  const script = document.createElement('script')
  script.src = 'https://pagead2.googlesyndication.com/...'
  script.async = true
  document.head.appendChild(script)
}, { once: true })
```

Con `{ once: true }` el event listener se dispara solo una vez. Esto reduce a casi cero la transferencia de JavaScript en el primer pliegue.

### GA4

Google Analytics 4 también se inyecta de forma diferida con `requestIdleCallback`. El script se inyecta cuando el navegador está en estado idle, sin interferir con las operaciones del usuario.

---

## Estrategia de caché

Se configura la política de caché óptima para cada tipo de asset en el archivo `_headers` de Cloudflare Pages.

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
- `/pagefind/*` tiene 1 semana de caché + 1 día de stale-while-revalidate
- HTML siempre obtiene la última versión

---

## Checklist de optimización de rendimiento

1. **¿La estrategia de distribución de CSS es apropiada?**: Inline si es menos de 20 KiB, externo si es más
2. **¿Las fuentes están en self-hosting?**: CDN externo es fatal en slow 4G
3. **¿El nombre de la fuente es correcto?**: Verificar el nombre de registro de `@fontsource-variable` (`*Variable`)
4. **¿Todas las imágenes tienen srcset + sizes?**: Especialmente preparar tamaños pequeños para móvil
5. **¿El elemento LCP tiene preload?**: Imagen hero y de primer pliegue
6. **¿Las imágenes tienen width / height?**: Prevención de CLS
7. **¿AdSense / GA4 tienen carga diferida?**: Reducir a cero la transferencia de JS en el primer pliegue
8. **¿Están configurados los headers de caché?**: Acelerar los accesos posteriores con caché immutable

---

## Resumen

El principio de la optimización de rendimiento se resume en **"no enviar lo innecesario"**. El inlining de CSS parece rápido a primera vista, pero con 190 KiB se vuelve contraproducente. El self-hosting de fuentes es obligatorio, pero hay una trampa con la discrepancia de nombres de fuente.

Basándose en la arquitectura zero JS de Astro, y minimizando la transferencia en CSS, fuentes, imágenes y scripts de publicidad respectivamente, 99 puntos en móvil es perfectamente alcanzable.

---

## Serie a la que pertenece este artículo

Este artículo es parte de la serie "[Guía de mejora de calidad de sitios Astro](/blog/website-improvement-batches/)". Las mejoras de SEO, accesibilidad y UX también se presentan en artículos individuales.
