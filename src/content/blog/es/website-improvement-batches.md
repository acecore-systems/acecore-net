---
title: 'Guía de mejora de calidad del sitio Astro ― El camino hasta PageSpeed móvil 99 puntos'
description: 'Registro completo de la mejora del sitio con configuración Astro + UnoCSS + Cloudflare Pages en 4 ejes: rendimiento, SEO, accesibilidad y UX, logrando PageSpeed Insights móvil 99 puntos y escritorio 100 en todos los apartados.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Público objetivo de este artículo
  text: 'Dirigido a quienes están trabajando en la mejora de calidad de sitios web y a quienes tienen interés en la operación práctica de Astro + UnoCSS. Este artículo es un hub que resume la visión general de las mejoras, con enlaces a artículos individuales para cada tema en detalle.'
processFigure:
  title: Proceso de mejora
  steps:
    - title: Medición
      description: Identificar los cuellos de botella actuales con PageSpeed Insights y axe.
      icon: i-lucide-gauge
    - title: Análisis
      description: Leer el desglose de puntuaciones e identificar las mejoras de mayor impacto.
      icon: i-lucide-search
    - title: Implementación
      description: Aplicar cambios uno a uno y confirmar 0 errores en el build.
      icon: i-lucide-code
    - title: Remedición
      description: Remedir tras el despliegue y verificar el efecto con datos.
      icon: i-lucide-check-circle
compareTable:
  title: Comparación antes y después de las mejoras
  before:
    label: Antes de las mejoras
    items:
      - PageSpeed móvil en los 70 puntos
      - Sin datos estructurados ni OGP
      - Sin soporte de accesibilidad
      - Scripts detenidos con View Transitions
      - Constantes hardcodeadas dispersas
  after:
    label: Después de las mejoras
    items:
      - Móvil 99 / 100 / 100 / 100 (escritorio todo 100)
      - 7 tipos de datos estructurados + OGP + canonical completos
      - Cumplimiento WCAG AA (contraste, aria, notificación SR, focus-visible)
      - Todos los componentes compatibles con View Transitions
      - Constantes SITE, URLs sociales e IDs de anuncios centralizados
linkCards:
  - href: /blog/astro-performance-tuning/
    title: Optimización de rendimiento
    description: Cómo alcanzar PageSpeed 99 mediante estrategia de entrega CSS, configuración de fuentes, imágenes responsive y caché.
    icon: i-lucide-gauge
  - href: /blog/astro-seo-and-structured-data/
    title: SEO y datos estructurados
    description: Guía práctica de implementación de JSON-LD, OGP, sitemap y RSS.
    icon: i-lucide-search
  - href: /blog/astro-accessibility-guide/
    title: Accesibilidad
    description: Guía para alcanzar WCAG AA con atributos aria, contraste y mejoras de formularios.
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: UX y calidad de código
    description: Práctica de las trampas de View Transitions, búsqueda de texto completo con Pagefind y seguridad de tipos con TypeScript.
    icon: i-lucide-sparkles
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Es posible obtener 100 puntos en PageSpeed Insights móvil?
      answer: 'Técnicamente es posible, pero para sitios que incluyen servicios externos como AdSense o GA4, es extremadamente difícil mantener 100 puntos de forma estable. Lighthouse simula slow 4G (~1.6 Mbps), por lo que la carga de recursos externos genera una gran penalización. 99 puntos es el máximo realista alcanzable.'
    - question: ¿En qué orden se deben abordar las mejoras?
      answer: 'Primero hay que comprender el estado actual con PageSpeed Insights y abordar los problemas de mayor impacto. En general, se recomienda seguir el orden: rendimiento → SEO → accesibilidad.'
    - question: ¿Estas técnicas de mejora se aplican a otros sitios Astro?
      answer: 'Sí. La estrategia de entrega CSS, el self-hosting de fuentes, los datos estructurados y las mejoras de accesibilidad son mejores prácticas comunes a todos los sitios Astro.'
    - question: ¿Utilizaron GitHub Copilot para las mejoras?
      answer: 'Sí. Prácticamente todas las mejoras se realizaron en colaboración con GitHub Copilot. Los detalles se presentan en el artículo "Flujo de desarrollo con GitHub Copilot".'
---

## Introducción

El sitio oficial de Acecore, renovado en marzo de 2026, se publicó con la configuración Astro 6 + UnoCSS + Cloudflare Pages. Sin embargo, justo después de la renovación, el sitio estaba apenas en un nivel de "funciona". Había margen de mejora en rendimiento, SEO, accesibilidad y UX.

Este artículo resume la visión general del proceso de más de 150 mejoras hasta alcanzar **PageSpeed Insights móvil 99 puntos y escritorio 100 en todos los apartados**.

---

## La barrera del móvil 99 en PageSpeed

Lo primero que quiero transmitir es que **obtener una puntuación alta en el score móvil de PageSpeed Insights es más difícil de lo que se imagina**.

### Simulación móvil de Lighthouse

Lo que funciona detrás de PageSpeed Insights es una herramienta llamada Lighthouse, que aplica el siguiente throttling a las pruebas móviles:

| Elemento | Valor |
| --- | --- |
| Velocidad de descarga | ~1.6 Mbps (slow 4G) |
| Velocidad de subida | ~0.75 Mbps |
| Latencia | 150 ms (RTT) |
| CPU | 4x slowdown |

Es decir, una página que se abre en 1 segundo con fibra óptica, en la simulación de Lighthouse **tarda 5-6 segundos**. Cargar 200 KiB de CSS en slow 4G genera **~1 segundo** de bloqueo.

### No linealidad del score

El score de PageSpeed no es lineal.

- **50 → 90**: Alcanzable con optimizaciones básicas (compresión de imágenes, eliminación de scripts innecesarios)
- **90 → 95**: Requiere estrategias de entrega de CSS, fuentes e imágenes
- **95 → 99**: Ajustes al milisegundo. Se debe decidir entre CSS inline vs. archivo externo
- **99 → 100**: Depende de la velocidad de respuesta de CDN externo y la variabilidad de medición de Lighthouse. Extremadamente difícil de lograr de forma estable en sitios con AdSense o GA4

### Variabilidad del score

Incluso para el mismo sitio, el score puede variar **2-5 puntos** entre mediciones. Las causas son:

- Velocidad de respuesta de CDN de imágenes como wsrv.nl
- Estado de caché del edge server de Cloudflare Pages
- Error de medición propio de Lighthouse

Por eso, el objetivo no debe ser "obtener 100 en una medición", sino "obtener puntuaciones altas de forma estable en mediciones repetidas".

---

## Puntuación final

A pesar de las dificultades mencionadas, logramos alcanzar de forma estable las siguientes puntuaciones:

| Métrica | Móvil | Escritorio |
| --- | --- | --- |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

---

## Los 4 pilares de la mejora

Las mejoras se organizaron en 4 grandes categorías. Los detalles de cada una se explican en artículos individuales.

### 1. Rendimiento

Lo que más contribuyó a alcanzar 99 en móvil fue la optimización de rendimiento. Estrategias de entrega CSS (inline vs. archivo externo), self-hosting de fuentes, optimización de imágenes responsive, carga diferida de AdSense/GA4, eliminando cuellos de botella uno a uno.

Los 3 cambios de mayor impacto fueron:

- **CSS como archivo externo**: Se pasó de expandir 190 KiB de CSS inline a archivo externo, reduciendo hasta un 91% el tamaño de transferencia HTML
- **Corrección de nombre de fuente**: Se descubrió y corrigió la discrepancia entre el nombre registrado por `@fontsource-variable/noto-sans-jp` (`Noto Sans JP Variable`) y el referenciado en CSS (`Noto Sans JP`)
- **Imágenes responsive**: Se configuraron `srcset` + `sizes` en todas las imágenes para servir tamaños apropiados en móvil

### 2. SEO

Para soportar los resultados enriquecidos de Google, se implementaron 7 tipos de datos estructurados JSON-LD. También se optimizaron las meta tags OGP, canonical, sitemap y se amplió el feed RSS, estableciendo una base para comunicar con precisión la estructura del sitio a los motores de búsqueda.

### 3. Accesibilidad

Se alcanzaron 100 puntos en Accessibility de PageSpeed superando las pruebas automáticas de axe DevTools y Lighthouse. Se realizaron cambios constantes como `aria-hidden` en iconos decorativos (más de 30 ubicaciones), notificación SR para enlaces externos, corrección de contraste (`text-slate-400` → `text-slate-500`) y aplicación global de estilos `focus-visible`.

### 4. UX y calidad de código

Se resolvieron los problemas de scripts detenidos por la introducción de View Transitions (ClientRouter) en todos los componentes, y se implementó búsqueda de texto completo con Pagefind. En cuanto al código, se mejoró la seguridad de tipos con TypeScript, se centralizaron las constantes (URLs sociales, IDs de anuncios, GA4 ID en la constante SITE), mejorando significativamente la mantenibilidad.

---

## Stack tecnológico

| Tecnología | Uso |
| --- | --- |
| Astro 6 | Generación de sitio estático (arquitectura zero-JS) |
| UnoCSS (presetWind3) | CSS utility-first |
| Cloudflare Pages | Hosting, CDN, control de headers |
| @fontsource-variable/noto-sans-jp | Self-hosting de fuente japonesa |
| wsrv.nl | Proxy de imágenes (conversión automática AVIF/WebP) |
| Pagefind | Búsqueda de texto completo para sitios estáticos |

---

## Conclusión

Para alcanzar 99 en móvil en PageSpeed Insights, es crucial seguir el principio de "no enviar lo innecesario". Estrategia de entrega CSS, self-hosting de fuentes tipográficas, optimización de imágenes, carga diferida de scripts externos — cada medida es simple individualmente, pero combinadas producen un gran efecto.

Al mismo tiempo, mejorar en paralelo SEO, accesibilidad y UX permite alcanzar puntuaciones altas en los 4 apartados. En lugar de obsesionarse con 100 puntos, es más realista apuntar a mantener estables 95 puntos o más.

Para los detalles de cada tema, consulte las cards de enlace de arriba. Para conocer el proceso de mejora y su reflejo en el código, consulte también el artículo [Flujo de desarrollo con GitHub Copilot](/blog/tax-return-with-copilot/).
