---
title: 'Guía práctica para lograr la conformidad WCAG AA en accesibilidad de sitios Astro'
description: 'Presentamos todos los pasos de mejora de accesibilidad realizados en un sitio con configuración Astro + UnoCSS. Abarcamos atributos aria, contraste, gestión de foco, validación de formularios, compatibilidad con lectores de pantalla y más medidas necesarias para la conformidad WCAG AA.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'アクセシビリティ']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: La accesibilidad es "mejora de UX para todos"
  text: 'La accesibilidad no es solo para personas con discapacidad. La operación por teclado, el contraste y la visualización del foco están directamente relacionados con la facilidad de uso para todos los usuarios. Cuanto más se trabaje en ello, mayor será la calidad general del sitio.'
processFigure:
  title: Proceso de mejora de accesibilidad
  steps:
    - title: Inspección automática
      description: Identificar problemas detectables mecánicamente con axe DevTools y Lighthouse.
      icon: i-lucide-scan
    - title: Inspección manual
      description: Probar el uso real con teclado y lector de pantalla.
      icon: i-lucide-hand
    - title: Corrección
      description: Añadir atributos aria, corregir contraste, agregar estilos de foco.
      icon: i-lucide-wrench
    - title: Re-inspección
      description: Confirmar la puntuación de 100 en Accessibility de PageSpeed.
      icon: i-lucide-check-circle
checklist:
  title: Checklist de conformidad WCAG AA
  items:
    - text: La relación de contraste del texto es 4.5:1 o superior (3:1 o superior para texto grande)
      checked: true
    - text: Todos los elementos interactivos tienen estilos focus-visible
      checked: true
    - text: Los iconos decorativos tienen aria-hidden="true"
      checked: true
    - text: Los enlaces externos tienen notificación para lectores de pantalla
      checked: true
    - text: Los formularios tienen validación inline con integración aria-invalid
      checked: true
    - text: Las imágenes tienen atributos width/height (prevención de CLS)
      checked: true
    - text: Los elementos de lista tienen role="list" (contramedida para list-style:none)
      checked: true
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Cuál es la diferencia entre axe DevTools y Lighthouse?
      answer: 'Lighthouse es una herramienta de auditoría integral que incluye rendimiento y SEO, y solo verifica algunos elementos de accesibilidad. axe DevTools está especializado en accesibilidad e inspecciona con más reglas y mayor detalle. Se recomienda usar ambos.'
    - question: ¿Se deben agregar atributos aria a todos los elementos?
      answer: 'No. Si la semántica HTML es correcta, aria no es necesario. Los atributos aria son para complementar "información que no se puede transmitir solo con HTML", y si se usan en exceso, la lectura del lector de pantalla se vuelve redundante.'
    - question: ¿Si PageSpeed Accessibility da 100 puntos, significa conformidad WCAG?
      answer: 'Incluso con 100 puntos, no se puede afirmar que hay conformidad completa con WCAG. Lighthouse tiene elementos de verificación limitados, y hay criterios que solo se pueden verificar manualmente (orden lógico de lectura, textos alt apropiados, etc.). Se necesitan tanto pruebas automáticas como manuales.'
---

## Introducción

"Mejora de accesibilidad" puede sonar como algo que se posterga fácilmente. Sin embargo, al trabajar en ello, las mejoras de contraste, operación por teclado y visualización de foco se traducen directamente en una mejor experiencia de uso para todos los usuarios.

En este artículo, presentamos las mejoras realizadas por categoría para alcanzar una puntuación de 100 en PageSpeed Accessibility en un sitio Astro + UnoCSS.

---

## aria-hidden para iconos decorativos

Los iconos de Iconify de UnoCSS (`i-lucide-*`) se usan frecuentemente como decoración visual, pero si el lector de pantalla los lee, notifica cosas como "imagen" o "imagen desconocida", causando confusión.

### Solución

Agregar `aria-hidden="true"` a los iconos de propósito decorativo.

```html
<span class="i-lucide-mail" aria-hidden="true"></span>
Contacto
```

Se aplicó esta medida en más de 30 iconos en todo el sitio. Hay que tener cuidado de no olvidar los iconos dentro de componentes como StatBar, Callout, ServiceCard y ProcessFigure.

---

## Notificación de lector de pantalla para enlaces externos

Los enlaces externos que se abren con `target="_blank"` son visualmente identificables como nuevas pestañas, pero los usuarios de lectores de pantalla no pueden saberlo.

### Solución

Agregar texto complementario visualmente oculto a los enlaces externos.

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  Example
  <span class="sr-only">(se abre en una nueva pestaña)</span>
</a>
```

Si se usa el plugin `rehype-external-links`, se puede agregar automáticamente `target="_blank"` y `rel` a los enlaces externos en Markdown. El texto de notificación para SR se agrega en la plantilla.

---

## Garantizar el contraste

La indicación más frecuente de PageSpeed Insights es el contraste insuficiente.

### Problemas comunes

Al usar `text-slate-400` de la paleta de colores de UnoCSS, la relación de contraste sobre fondo blanco es de aproximadamente 3:1, lo que no cumple el criterio de 4.5:1 de WCAG AA.

### Solución

Cambiar `text-slate-400` → `text-slate-500` (relación de contraste 4.6:1) para cumplir el criterio. Es común usar estos colores para texto auxiliar como fechas y captions, así que hay que verificar en todo el sitio.

---

## Estilos focus-visible

Para los usuarios que operan el sitio con teclado, el indicador de foco es la única pista para saber "dónde estoy". WCAG 2.4.7 requiere la visualización del foco.

### Implementación con UnoCSS

Configurar estilos de foco comunes para botones y enlaces. Con la función de shortcuts de UnoCSS, se puede aplicar a todo con una sola definición.

```typescript
shortcuts: {
  'ac-btn': '... focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none',
}
```

`focus-visible` es una pseudo-clase que no muestra el anillo al hacer clic con el ratón, solo al operar con teclado. Tiene mejor UX que `focus`, así que es preferible usarla.

### Elementos que se olvidan fácilmente

- Botón de copiar
- Botón de scroll to top
- Botón de cierre del anuncio ancla
- Botón de cierre del modal

---

## Subrayado de enlaces inline

PageSpeed indica que "los enlaces solo se identifican por color". Los usuarios con restricciones de visión de color no pueden distinguir los enlaces.

### Solución

Cambiar el subrayado, que solo aparecía al pasar el cursor, a visualización permanente. Se recomienda unificarlo con shortcuts de UnoCSS.

```typescript
shortcuts: {
  'ac-link': 'underline decoration-brand-300 underline-offset-2 hover:decoration-brand-500 transition-colors',
}
```

---

## Accesibilidad de formularios

En escenarios donde el usuario introduce datos, como formularios de contacto, la accesibilidad es especialmente importante.

### Validación inline

Mostrar mensajes de error inmediatamente en eventos `blur` / `input`, y vincular los siguientes atributos aria:

- `aria-invalid="true"` — notificar que la entrada es inválida
- `aria-describedby` — referenciar el ID del mensaje de error

```html
<input
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<p id="email-error" role="alert">Por favor, introduzca una dirección de correo electrónico válida</p>
```

### Marcado de campos obligatorios

Solo el marcador visual `*` no es suficiente. Hay que agregar texto complementario para lectores de pantalla.

```html
<span aria-hidden="true">*</span>
<span class="sr-only">(obligatorio)</span>
```

---

## Atributo role de elementos figure

Si se establece `role="img"` en un elemento `<figure>`, los elementos hijos quedan ocultos para el lector de pantalla. En componentes que contienen iconos y texto descriptivo (InsightGrid, ProcessFigure, Timeline), se cambia a `role="group"` para mantener accesible el contenido interno.

---

## Atributo role de elementos de lista

Al establecer `list-style: none` con CSS, hay un bug conocido donde el lector de pantalla de Safari (VoiceOver) deja de reconocer la lista como tal.

Se soluciona agregando `role="list"` a los `<ol>` / `<ul>` de breadcrumbs, sidebar y footer. Hay que verificar en todas las listas con apariencia personalizada.

---

## Otras mejoras

### Atributos width/height de imágenes

Las imágenes sin `width` y `height` explícitos causan CLS (Cumulative Layout Shift) cuando se completa la carga. Se deben especificar tamaños para todas las imágenes, incluyendo avatares (32×32, 48×48, 64×64px) y miniaturas de YouTube (480×360px).

### aria-live del slider Hero

Los sliders con cambio automático no transmiten los cambios a usuarios de lectores de pantalla. Se prepara una región `aria-live="polite"` y se notifica con texto como "Diapositiva 1 / 4: ○○".

### aria-labelledby de dialog

Los elementos `<dialog>` deben referenciar el ID del elemento título con `aria-labelledby`, para que el lector de pantalla pueda leer el propósito del modal.

### aria-current de paginación

Se establece `aria-current="page"` en el número de página actual para notificar al lector de pantalla que es "la página actual".

### Actualización de aria-label del botón de copiar

Al copiar exitosamente al portapapeles, se actualiza dinámicamente `aria-label` a "Copiado" para notificar el cambio de estado al lector de pantalla.

---

## Resumen

Las mejoras de accesibilidad son cambios pequeños individualmente, pero al acumularlos, la calidad general del sitio mejora significativamente. Las tres más efectivas fueron:

1. **Aplicación global de focus-visible**: La navegación por teclado mejoró drásticamente
2. **Corrección de contraste**: Solo cambiar `text-slate-400` → `text-slate-500` cumplió WCAG AA
3. **Notificación SR para enlaces externos**: Respuesta automática a todos los enlaces combinando con `rehype-external-links`

Se recomienda empezar escaneando el sitio con axe DevTools y abordar primero los problemas detectables automáticamente.

---

## Serie a la que pertenece este artículo

Este artículo es parte de la serie "[Guía de mejora de calidad de sitios Astro](/blog/website-improvement-batches/)". Las mejoras de rendimiento, SEO y UX también se presentan en artículos individuales.
