---
title: 'Diseño técnico para añadir un chat de IA de consultas a un sitio Astro'
description: 'Diseño práctico para incorporar un chat de IA de consultas en un sitio estático Astro + Cloudflare Pages con OpenAI Responses API. Cubre límites de API, contexto del sitio, control de prompt, URLs por locale, verificación de Origin, rate limit y renderizado seguro de enlaces Markdown.'
date: 2026-06-07T12:00
author: gui
tags: ['技術', 'Cloudflare', 'Webサイト', 'AI', 'サービス']
image: https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: Punto clave
  text: El chat de IA de consultas no es una caja de respuestas libres. Es una pequeña aplicación que usa información pública del sitio para guiar al visitante hacia el siguiente paso correcto. API keys, prompts, datos de contacto y Markdown se controlan desde el servidor y mediante listas permitidas.
processFigure:
  title: Arquitectura de referencia
  steps:
    - title: Widget
      description: La UI de chat en Astro envía solo la pregunta, el locale actual y el historial mínimo necesario.
      icon: i-lucide-message-circle
      accent: brand
    - title: Function
      description: Cloudflare Pages Function valida entradas, comprueba Origin, aplica rate limit y construye el prompt.
      icon: i-lucide-shield-check
      accent: amber
    - title: Model
      description: OpenAI Responses API recibe el contexto público del sitio y el estado de la conversación.
      icon: i-lucide-sparkles
      accent: emerald
    - title: Renderer
      description: El cliente renderiza solo Markdown permitido y guía a enlaces internos o canales de contacto aprobados.
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: Responsabilidades que conviene separar
  before:
    label: Cuando todo está mezclado
    items:
      - La API de IA se llama directamente desde el navegador
      - Contexto del sitio, API key, UI y renderizado de enlaces quedan acoplados
      - La IA puede afirmar precios, contratos o plazos con demasiada seguridad
      - Markdown y URLs pueden terminar renderizados como HTML sin control
  after:
    label: Cuando las responsabilidades se separan
    items:
      - API keys y llamadas al modelo permanecen en el servidor
      - La información pública del sitio se gestiona como contexto explícito
      - El prompt controla el alcance de respuesta y las rutas de contacto
      - Markdown y URLs se renderizan con listas permitidas
checklist:
  title: Checklist de diseño para otros sitios
  items:
    - text: Definir el chat como guía de rutas, no como reemplazo total del formulario
    - text: Crear un límite de API en servidor y no exponer la API key al navegador
    - text: Limitar respuestas a información pública del sitio
    - text: Decidir qué no debe afirmar la IA, como precios, contratos, plazos y garantías
    - text: Definir cuándo usar formulario, LINE, correo y teléfono
    - text: Generar URLs por locale para no romper la navegación multilingüe
    - text: Añadir Origin check, límites de longitud, límites de historial y rate limiting
    - text: Hacer trim de URLs Markdown antes de validarlas con la lista permitida
linkCards:
  - href: /contact/
    title: Contacto
    description: Página que organiza chat de IA, LINE, formulario y contacto directo.
    icon: i-lucide-message-square
  - href: /blog/cloudflare-pages-security/
    title: Seguridad en Cloudflare Pages
    description: Artículo relacionado sobre CSP y cabeceras de seguridad para sitios estáticos.
    icon: i-lucide-shield
  - href: /blog/cms-selection-and-turnstile/
    title: CMS y Turnstile
    description: Artículo relacionado sobre operación de formularios y protección contra bots.
    icon: i-lucide-badge-check
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Hace falta RAG o una base vectorial para crear este chat?
      answer: Para un sitio corporativo pequeño, suele bastar con pasar al prompt un contexto estructurado a partir de páginas públicas. La búsqueda o la base vectorial pueden añadirse cuando crezcan las páginas o la frecuencia de actualización.
    - question: ¿La API key de OpenAI queda expuesta en el navegador?
      answer: No. El navegador solo envía la pregunta a /api/ai-contact. Cloudflare Pages Function llama a OpenAI Responses API y gestiona la API key.
    - question: ¿La IA puede devolver cualquier enlace?
      answer: No. Los enlaces se limitan a rutas internas, el origin actual, acecore.net, LINE oficial y, cuando haga falta, mailto o tel específicos. Las URLs Markdown se recortan antes de la comprobación de seguridad.
---

Añadir un chat de IA a un sitio web es sencillo. Lo que requiere diseño es hacerlo operable: qué puede responder la IA, a dónde debe dirigir al visitante, qué URLs se pueden mostrar y cómo se controla el coste de API.

Acecore añadió un chat de IA de consultas a un sitio estático con Astro + Cloudflare Pages. La implementación principal está en [el PR que incorporó la IA de contacto y el flujo de traducción limitado al CMS](https://github.com/acecore-systems/acecore-net/pull/98). Más tarde ajustamos el renderizado seguro de enlaces Markdown en [otro PR](https://github.com/acecore-systems/acecore-net/pull/99).

Este artículo no es solo una bitácora del proyecto. Resume el diseño técnico como patrón reutilizable para otros sitios estáticos. Fuera de Astro, la idea sigue siendo la misma: separar widget cliente, límite de API, prompt y renderer.

## Estructura general

La arquitectura tiene tres capas simples.

| Capa                 | Responsabilidad                                                     |
| -------------------- | ------------------------------------------------------------------- |
| Chat widget          | UI, entrada, locale actual, historial mínimo y renderizado Markdown |
| `/api/ai-contact`    | Validación, Origin check, rate limit, prompt y llamada a OpenAI     |
| OpenAI Responses API | Generar respuesta desde contexto público y estado de conversación   |

El navegador no debe llamar directamente a OpenAI. Mantener la llamada detrás de un endpoint evita exponer claves, permite actualizar prompt y contexto desde servidor, y centraliza límites de entrada y errores.

En Astro + Cloudflare Pages, este límite puede ser una Pages Function en `/api/ai-contact`. En Next.js sería un Route Handler; en Hono o Express, una ruta API normal.

## Mantener pequeño el contrato del endpoint

El payload debe ser estrecho.

```ts
type ContactAiRequest = {
  message: string
  locale: 'ja' | 'en' | 'zh-cn' | 'es' | 'pt' | 'fr' | 'ko' | 'de' | 'ru'
  history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

type ContactAiResponse = {
  answer: string
}
```

Nombre, correo, teléfono, empresa y otros campos del formulario no necesitan pasar por el chat. Su rol es ayudar a decidir qué servicio ver y qué vía de contacto usar, no recoger datos personales.

El historial también debe limitarse a los últimos turnos y con tamaño máximo por mensaje. Así se evita que el prompt crezca y se controla el coste.

## Controlar validación y modelo en el servidor

La Pages Function concentra el límite de seguridad y ejecución.

```ts
export async function onRequestPost({ request, env }: PagesFunction<Env>) {
  assertSameOrigin(request)
  assertRateLimit(request)

  const body = await request.json()
  const message = validateMessage(body.message)
  const locale = validateLocale(body.locale)
  const history = trimHistory(body.history)

  const prompt = buildContactPrompt({
    locale,
    message,
    history,
    siteContext: buildPublicSiteContext(locale),
  })

  const answer = await callOpenAIResponsesApi({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    prompt,
  })

  return Response.json({ answer })
}
```

El punto importante es validar y reducir la entrada antes de llamar a la IA. Mensajes largos, historial ilimitado o tráfico externo repetido vuelven inestable la operación antes de que la función aporte valor.

`OPENAI_MODEL` debe poder configurarse por variable de entorno. `OPENAI_API_KEY` permanece solo en servidor. Para el entorno de distribución y CSP, vea [distribución segura con Cloudflare Pages](/blog/cloudflare-pages-security/).

## Hacer explícito el contexto del sitio

Para sitios de este tamaño no hace falta empezar con una base vectorial. Un contexto estructurado con información pública suele ser suficiente.

Incluya:

- Resumen de la empresa y servicios
- Público objetivo, ejemplos de consulta y URLs de cada servicio
- Preguntas frecuentes ya respondidas
- Reglas para formulario, LINE, correo y teléfono
- Áreas que la IA no debe afirmar, como precios, contratos o plazos
- URLs internas por locale

La idea no es que el modelo conteste desde su conocimiento general, sino decirle qué está autorizado a decir este sitio.

```ts
function buildPublicSiteContext(locale: Locale) {
  return {
    services: [
      {
        name: 'Web production',
        summary: 'Corporate sites, recruiting sites, and landing pages',
        url: localizePath('/services/web-production/', locale),
      },
      {
        name: 'Business systems',
        summary: 'Reservation, inventory, and customer management systems',
        url: localizePath('/services/business-system/', locale),
      },
    ],
    contact: {
      form: localizePath('/contact/', locale),
      line: 'https://lin.ee/...',
      emailPolicy:
        'Show email only when the form cannot be used or follow-up is needed',
      phonePolicy: 'Show phone only for urgent confirmation',
    },
  }
}
```

Cuando aumenten páginas y frecuencia de actualización, esta capa puede evolucionar hacia Pagefind, CMS JSON, D1, Vectorize u otro mecanismo de recuperación.

## Escribir reglas en el prompt

En un chat de consultas, el prompt debe definir límites y prohibiciones más que solo tono.

```txt
You are the contact guidance AI for this website.
Answer only from public site information.

Rules:
- Do not make firm statements about pricing, contracts, schedules, or guarantees
- Send formal consultations and estimates to the contact form
- Also suggest LINE for short questions and school-related inquiries
- Show email and phone only when the user asks for direct contact
- Use URLs that match the current locale
- If unsure, do not guess; guide the user to the form
```

El fallo típico es que la IA intenta ser demasiado útil y promete demasiado. Costes, fechas de entrega y garantías deben resolverse con una guía general y derivación al formulario.

## Separar las rutas de contacto

El chat no reemplaza al formulario. Cada ruta tiene un papel.

| Ruta             | Papel                                                       |
| ---------------- | ----------------------------------------------------------- |
| FAQ              | Resolver dudas comunes dentro de la página                  |
| Chat de IA       | Ordenar servicios, rutas de contacto y páginas relacionadas |
| LINE             | Preguntas breves, temas de escuela y verificaciones ligeras |
| Formulario       | Presupuestos, producción, alianzas y reclutamiento          |
| Contacto directo | Complementos tras el formulario o confirmación urgente      |

La IA conecta contenidos generales como [la introducción de servicios](/blog/service-introduction/) con rutas concretas de la [página de contacto](/contact/). Es un patrón útil para B2B, agencias, escuelas y soporte SaaS.

## No romper URLs por locale

En un sitio multilingüe no basta con responder en el idioma correcto. Las URLs también deben coincidir con el locale.

```ts
function localizePath(path: string, locale: Locale) {
  if (locale === 'ja') return path
  return `/${locale}${path}`
}
```

Es más estable generarlo en servidor que dejarlo solo como instrucción del prompt. La base de traducción está resumida en [el artículo del pipeline con Copilot](/blog/copilot-translation-pipeline/).

## Añadir Origin check y rate limit

`/api/ai-contact` es una API pública, por lo que necesita Origin check, límites de longitud, límite de historial y rate limit.

```ts
function assertSameOrigin(request: Request) {
  const origin = request.headers.get('Origin')
  if (!origin) return

  const requestUrl = new URL(request.url)
  const originUrl = new URL(origin)

  if (originUrl.host !== requestUrl.host) {
    throw new Response('Forbidden', { status: 403 })
  }
}
```

El rate limit por IP sirve como primer freno. En Cloudflare puede apoyarse en `CF-Connecting-IP`, `X-Forwarded-For` o `CF-Ray`. Para más tráfico, conviene mover el control a Cloudflare WAF, Turnstile, KV, D1 o Durable Objects. Para formularios, vea [CMS y Turnstile](/blog/cms-selection-and-turnstile/).

## Renderizar enlaces Markdown con lista permitida

Los enlaces son útiles, pero el Markdown no debe pasar directo a HTML. Permita solo el subconjunto necesario:

- Párrafos
- Listas
- Negrita
- Código en línea
- Enlaces Markdown

Luego limite los destinos a rutas internas, origin actual, `https://acecore.net`, LINE oficial y los `mailto:` o `tel:` necesarios.

```ts
function sanitizeHref(rawHref: string, currentOrigin: string) {
  const href = rawHref.trim()

  if (href.startsWith('/')) return href
  if (href.startsWith(`${currentOrigin}/`)) return href
  if (href.startsWith('https://acecore.net/')) return href
  if (href.startsWith('https://lin.ee/')) return href
  if (href === 'mailto:info@acecore.net') return href
  if (href === 'tel:05088902788') return href

  return null
}
```

Hacer `trim()` es importante porque la IA puede devolver `[Services]( /services/ )`. Un renderer pequeño y estricto es más mantenible que implementar Markdown completo.

## Probar local, preview y producción

Astro dev o preview no es idéntico al entorno de Cloudflare Pages Functions. Sin `OPENAI_API_KEY`, localmente conviene revisar fallback y errores de UI.

En Pages preview o producción, revise:

- `/api/ai-contact` acepta POST
- `OPENAI_API_KEY` y `OPENAI_MODEL` están configurados
- Se rechazan solicitudes de otro Origin
- Hay límites de longitud e historial
- La respuesta coincide con el locale
- Los enlaces internos usan URLs por locale
- La IA no afirma presupuestos ni contratos
- Correo y teléfono no se muestran por defecto
- Markdown solo se convierte cuando la URL está permitida

No valide solo con una pregunta. Pruebe entradas largas, preguntas inesperadas, páginas en inglés, solicitudes de contacto directo y preguntas sobre precios.

## Señales operativas

Después de publicar, mire:

- Tasa de errores de API
- Veces que se aplicó rate limit
- Mensajes promedio por consulta
- Transiciones a formulario y LINE
- Casos en que la IA derivó al formulario
- Uso por locale

Si guarda conversaciones, defina primero las reglas de privacidad. Un inicio más seguro es guardar solo eventos y errores, sin texto de mensajes.

## Alcance separado

Este artículo trata solo el diseño técnico del chat de IA. Pasar contexto de una página de servicio al formulario es otro tema.

- Chat de IA: ordenar dudas en conversación y guiar con seguridad
- CTA de servicio: pasar al formulario el contexto que el visitante estaba leyendo

Separarlos mejora la lectura y facilita enlaces internos posteriores.

## Resumen

Para añadir un chat de IA a un sitio estático, diseñe primero el límite de API y el control de respuestas, antes de pulir la UI.

Las decisiones clave fueron:

- Llamar a OpenAI desde Cloudflare Pages Function, no desde el navegador
- Mantener pequeño el input y limitar historial y longitud
- Construir contexto y URLs por locale en servidor
- Escribir en el prompt lo que la IA no debe afirmar
- Separar formulario, LINE y contacto directo
- Añadir Origin check y rate limit
- Renderizar enlaces Markdown tras `trim()` y con lista permitida

Un sitio estático puede tener un chat de consultas útil. Lo importante no es destacar la IA, sino ayudar al visitante a elegir el siguiente paso con seguridad.
