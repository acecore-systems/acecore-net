---
title: 'Renderizar con seguridad enlaces Markdown en respuestas de chat con IA'
description: 'Nota técnica sobre cómo convertir enlaces Markdown de respuestas de IA en HTML seguro. Separar parseo tolerante a espacios, trim de href, allowlist, DOM rendering, fallback y pruebas hace que el patrón sea reutilizable en otros sitios.'
date: 2026-06-07T14:30
author: gui
tags: ['技術', 'Webサイト', 'AI', 'セキュリティ', 'Astro']
image: https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Punto clave
  text: Las respuestas de IA no son HTML confiable. Aunque uses enlaces Markdown, recorta primero la URL, valídala con una allowlist y deja como texto los enlaces no permitidos.
processFigure:
  title: Flujo de renderizado de enlaces
  steps:
    - title: Text
      description: Tratar la respuesta del modelo como texto plano.
      icon: i-lucide-message-square-text
      accent: brand
    - title: Parse
      description: Detectar solo el Markdown que el chat realmente soporta.
      icon: i-lucide-brackets
      accent: amber
    - title: Validate
      description: Recortar href y permitir solo URLs internas o dominios aprobados.
      icon: i-lucide-shield-check
      accent: emerald
    - title: Render
      description: Crear elementos seguros con DOM API, no con innerHTML.
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: Decisiones que conviene separar
  before:
    label: Renderizado laxo
    items:
      - Poner respuestas de IA directamente en innerHTML
      - Intentar implementar todo Markdown de una vez
      - Fallar cuando la URL tiene espacios alrededor
      - 'Tratar URLs externas y javascript: como si fueran iguales'
  after:
    label: Renderizado pequeño y seguro
    items:
      - Recibir respuestas como texto y convertir solo lo necesario en DOM
      - Soportar solo el subconjunto usado por el chat
      - Validar URLs después de trim
      - Mantener URLs no permitidas como texto
checklist:
  title: Checklist de implementación
  items:
    - text: No confiar en respuestas de IA como HTML
    - text: Aceptar espacios alrededor de URLs Markdown
    - text: Hacer trim de href antes de validar
    - text: Permitir solo rutas internas, origin actual y dominios necesarios
    - text: Definir target y rel en enlaces externos
    - text: Conservar enlaces no permitidos como texto
    - text: Probar URLs peligrosas y Markdown roto
linkCards:
  - href: /blog/astro-ai-contact-chat/
    title: Diseño técnico del chat de contacto con IA
    description: Artículo base sobre respuestas de IA, API boundary y control de prompts.
    icon: i-lucide-sparkles
  - href: /blog/cloudflare-pages-security/
    title: Seguridad en Cloudflare Pages
    description: Artículo relacionado sobre CSP y cabeceras de seguridad.
    icon: i-lucide-shield
  - href: /contact/
    title: Contacto
    description: Página real donde se ubican el chat de IA y el formulario.
    icon: i-lucide-message-square
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Basta con usar markdown-it o marked?
      answer: Incluso usando una librería, hay que decidir cómo tratar HTML, qué destinos de enlace permitir, cómo añadir target y rel, y cómo rechazar URLs peligrosas. Para chat, un renderizador pequeño puede ser suficiente.
    - question: ¿Permitir espacios alrededor de la URL es peligroso?
      answer: El riesgo no está en los espacios. Lo importante es validar el href después de trim. Así toleras variaciones del modelo sin relajar la allowlist.
    - question: ¿Hay que eliminar las URLs no permitidas?
      answer: Normalmente dejarlas como texto facilita depurar y conserva contexto. Si la política exige ocultarlas, también puedes eliminar el enlace completo.
---

Si un chat con IA responde `Consulta [Servicios]( /services/ )`, el enlace puede no renderizarse y el Markdown bruto puede quedar visible.

Acecore encontró este caso en el chat de contacto y ajustó el renderizador en [el PR que corrigió el renderizado de enlaces Markdown](https://github.com/acecore-systems/acecore-net/pull/99).

Este artículo toma esa corrección pequeña como punto de partida para convertir respuestas de IA en DOM de forma segura.

## Las respuestas de IA no son HTML confiable

La salida del modelo debe tratarse como texto.

En un chat son útiles los enlaces, negritas y listas, pero poner la respuesta en `innerHTML` permite que el navegador interprete cualquier cadena generada por el modelo.

No necesitas implementar Markdown completo. Necesitas detectar solo las expresiones que el chat soporta y crear nodos DOM seguros.

## El problema no es solo el espacio

El bug concreto era un enlace como:

```md
[Servicios](/services/)
```

Una expresión regular estricta suele asumir que la URL no contiene espacios:

```js
;/\[([^\]]+)\]\(([^)\s]+)\)/
```

`[^)\s]+` rechaza espacios, por lo que `( /services/ )` no se reconoce. La solución es tolerar espacios dentro del paréntesis y normalizar después.

```js
;/\[([^\]]+)\]\(\s*([^)]+?)\s*\)/
```

Pero relajar el parser no basta. Después hay que validar el valor normalizado.

## Recorta href antes de validar

El orden debe ser estable:

1. Extraer label y raw href
2. Ejecutar `trim()` sobre raw href
3. Validar el href recortado con una allowlist
4. Crear `<a>` solo si está permitido

```js
const href = String(rawHref || '').trim()

if (label && isSafeMarkdownHref(href)) {
  const link = document.createElement('a')
  link.href = href
  link.rel = 'noopener noreferrer'

  if (/^https?:\/\//i.test(href)) {
    link.target = '_blank'
  }

  link.textContent = label
  parent.appendChild(link)
}
```

Valida exactamente el mismo valor que insertas en el DOM. Si no, el control pierde fuerza.

## La allowlist depende del producto

Cada sitio decide qué URLs puede mostrar su IA.

| Tipo           | Ejemplo                   | Decisión                        |
| -------------- | ------------------------- | ------------------------------- |
| Ruta interna   | `/services/`              | Permitir                        |
| Mismo origin   | `https://acecore.net/...` | Permitir                        |
| LINE oficial   | `https://lin.ee/...`      | Permitir si es el canal oficial |
| mailto         | `mailto:info@acecore.net` | Solo dirección fija             |
| tel            | `tel:05088902788`         | Solo número fijo                |
| Otros externos | Cualquier URL             | No enlazar por defecto          |

```js
function isSafeMarkdownHref(href) {
  if (href.startsWith('/')) return true

  try {
    const url = new URL(href, window.location.origin)
    if (url.origin === window.location.origin) return true
    if (url.hostname === 'acecore.net') return true
    if (url.hostname === 'lin.ee') return true
  } catch {
    return false
  }

  return href === 'mailto:info@acecore.net' || href === 'tel:05088902788'
}
```

Un sitio de empleo puede permitir portales de reclutamiento; un SaaS puede permitir documentación y página de estado. La función debe ser propia de cada producto.

## Fallback a texto para enlaces no permitidos

Cuando un enlace no pasa la validación, no siempre conviene borrarlo.

En un chat de contacto, dejar el Markdown como texto conserva contexto para el usuario y ayuda a depurar qué intentó emitir el modelo.

El renderizador debe saber crear enlaces seguros y también fallar de forma segura.

## Pruebas mínimas

Prueba más que el caso feliz.

| Entrada                            | Resultado esperado                           |
| ---------------------------------- | -------------------------------------------- |
| `[Servicios](/services/)`          | Enlace interno                               |
| `[Servicios]( /services/ )`        | Enlace interno después de trim               |
| `[LINE]( https://lin.ee/example )` | Enlace externo permitido                     |
| `[Malo](javascript:alert(1))`      | No se enlaza                                 |
| `[Externo](https://example.com/)`  | No se enlaza si el dominio no está permitido |
| `[Roto](/services/`                | Se muestra como texto                        |

En PR #99 se confirmó que las variantes con y sin espacios producen la misma URL esperada.

## No implementes todo Markdown por defecto

Para un chat suele bastar con:

- Párrafos
- Listas
- Negrita
- Código inline
- Enlaces

Tablas, imágenes, HTML crudo y notas al pie amplían demasiado la responsabilidad. Si usas una librería más adelante, la política de HTML y URLs sigue siendo una decisión separada.

## Resumen

Renderizar enlaces Markdown en respuestas de IA parece un detalle de UI, pero define cuánto confías en la salida del modelo.

La pauta es simple: texto primero, subconjunto pequeño, trim antes de validar, allowlist estricta y fallback seguro.
