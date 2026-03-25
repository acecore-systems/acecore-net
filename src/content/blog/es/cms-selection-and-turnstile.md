---
title: 'Crónica de selección de CMS headless — Por qué elegimos Pages CMS y protección anti-bot con Turnstile'
description: 'Registro del proceso de evaluación y comparación entre Keystatic, Sveltia CMS y Pages CMS, la elección de Pages CMS, y la implementación de protección anti-spam en el formulario de contacto con Cloudflare Turnstile.'
date: 2026-03-15
author: gui
tags: ['技術', 'CMS', 'セキュリティ']
image: https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&h=400&fit=crop&q=80
compareTable:
  title: Comparación de CMS
  before:
    label: Keystatic / Sveltia CMS
    items:
      - Keystatic requiere un runtime del lado del servidor
      - Sveltia CMS es muy funcional pero tiene alta curva de aprendizaje
      - Ambos son excesivos para la configuración Astro + Pages
      - La configuración inicial lleva tiempo
  after:
    label: Pages CMS
    items:
      - Edición directa de Markdown del repositorio GitHub
      - Editor GUI permite que no-ingenieros actualicen artículos
      - Sin necesidad de servidor, perfecta compatibilidad con Pages
      - 'Configuración completa solo con .pages.yml'
callout:
  type: tip
  title: Ventajas de Turnstile
  text: Cloudflare Turnstile, a diferencia de reCAPTCHA, no requiere que los usuarios seleccionen imágenes ni realicen otras operaciones. La verificación se realiza automáticamente en segundo plano, proporcionando protección anti-bot sin afectar la UX.
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Qué es Pages CMS?
      answer: Es un CMS ligero que permite editar directamente archivos Markdown del repositorio GitHub a través de una GUI. Sin necesidad de servidor, se configura solo con .pages.yml, y permite que no-ingenieros actualicen artículos.
    - question: ¿Cuál es la diferencia entre Cloudflare Turnstile y reCAPTCHA?
      answer: Turnstile no requiere que los usuarios seleccionen imágenes, verificando automáticamente en segundo plano. Respeta la privacidad, no afecta la UX y es gratuito.
    - question: ¿Cómo procesar envíos de formularios en un sitio estático?
      answer: Usando servicios externos de formularios como ssgform.com o Formspree, se pueden procesar envíos sin código del lado del servidor. También se puede combinar con Turnstile para protección anti-spam.
---

La selección de un CMS es una decisión discreta pero importante. En este artículo, presentamos el proceso de evaluación real de 3 CMS y la protección anti-bot implementada con Cloudflare Turnstile en el formulario de contacto.

## Proceso de selección del CMS

Al implementar un CMS en un sitio estático construido con Astro, consideramos los siguientes 3 candidatos.

### Keystatic: El primer candidato

Keystatic nos llamó la atención como un CMS type-safe. La integración con Astro también tiene soporte oficial. Sin embargo, para la operación en modo local se requiere un runtime del lado del servidor, lo que presentaba dificultades de compatibilidad con el despliegue estático en Cloudflare Pages.

### Sveltia CMS: Potente pero pesado

Sveltia CMS es un fork de Decap CMS (anteriormente Netlify CMS), con una UI moderna y muchas funcionalidades. Sin embargo, para la escala actual del proyecto (unos pocos artículos de blog + algunas páginas fijas), resultaba excesivo. Planeamos reevaluarlo cuando el contenido crezca en el futuro.

### Pages CMS: Adoptado

[Pages CMS](https://pagescms.org/) es un CMS ligero que edita directamente los archivos Markdown del repositorio GitHub.

Los factores decisivos para su adopción fueron:

- **Configuración sencilla**: Solo necesita agregar 1 archivo `.pages.yml`
- **Sin servidor**: Funciona a través de la API de GitHub, sin necesidad de infraestructura adicional
- **Nativo de Markdown**: Se integra directamente con las colecciones de contenido de Astro
- **Editor GUI**: Los miembros del equipo no-ingenieros también pueden editar artículos desde el navegador

```yaml
# .pages.yml
content:
  - name: blog
    label: Blog
    path: src/content/blog
    type: collection
    fields:
      - name: title
        label: Título
        type: string
      - name: date
        label: Fecha de publicación
        type: date
      - name: tags
        label: Etiquetas
        type: string
        list: true
```

## Implementación de Cloudflare Turnstile

Se implementó Cloudflare Turnstile como protección anti-spam para el formulario de contacto.

### Por qué Turnstile en lugar de reCAPTCHA

Google reCAPTCHA v2 obliga a los usuarios a seleccionar imágenes, y v3 es basado en puntuación pero tiene preocupaciones de privacidad. Cloudflare Turnstile es superior en los siguientes aspectos:

| Comparación | reCAPTCHA v2 | reCAPTCHA v3 | Turnstile |
| --- | --- | --- | --- |
| Operación del usuario | Requiere selección de imágenes | No requiere | No requiere |
| Privacidad | Seguimiento basado en cookies | Análisis de comportamiento | Recopilación mínima de datos |
| Rendimiento | Pesado | Moderado | Ligero |
| Precio | Gratuito (con límites) | Gratuito (con límites) | Gratuito (ilimitado) |

### Método de implementación

La implementación de Turnstile es sorprendentemente sencilla.

#### 1. Crear widget en Cloudflare Dashboard

Crear un widget en la sección "Turnstile" del Cloudflare Dashboard y registrar los hostname objetivo (dominio de producción y `localhost`). Se emite una site key.

#### 2. Agregar el widget al formulario

```html
<!-- Carga del script de Turnstile -->
<script
  src="https://challenges.cloudflare.com/turnstile/v0/api.js"
  async
  defer
></script>

<!-- Colocar el widget dentro del formulario -->
<form action="https://ssgform.com/s/your-form-id" method="POST">
  <!-- Campos del formulario -->
  <input type="text" name="name" required />
  <textarea name="message" required></textarea>

  <!-- Widget de Turnstile -->
  <div
    class="cf-turnstile"
    data-sitekey="your-site-key"
    data-language="ja"
    data-theme="light"
  ></div>

  <button type="submit">Enviar</button>
</form>
```

Al especificar `data-language="ja"`, se muestra "成功しました！" (¡Éxito!) en japonés al completar la verificación. `data-theme="light"` controla el color de fondo según el diseño del sitio.

#### 3. Actualización de cabeceras CSP

Turnstile usa iframes, por lo que debe permitirse adecuadamente en CSP.

```text
script-src: https://challenges.cloudflare.com
connect-src: https://challenges.cloudflare.com
frame-src: https://challenges.cloudflare.com
```

### Nota: Retraso de propagación justo después de crear el widget

Justo después de crear un widget en Cloudflare Dashboard, la site key tarda 1-2 minutos en propagarse globalmente. Durante ese tiempo ocurren errores `400020`, pero se resuelven esperando un poco.

## Uso de ssgform.com

Como destino de envío de formularios se usa [ssgform.com](https://ssgform.com/). Es un servicio de envío de formularios utilizable desde sitios estáticos, con las siguientes ventajas:

- Sin necesidad de código del lado del servidor
- Notificaciones por email automáticas
- Compatible con verificación de tokens de Turnstile
- Suficiente volumen de envíos en el plan gratuito

## Resumen

Tanto para el CMS como para la protección anti-bot, unificamos la política de "elegir lo mínimo necesario". Pages CMS se implementa en 5 minutos y Turnstile solo requiere agregar pocas líneas de HTML. Precisamente porque la configuración es simple, los costos de operación se mantienen bajos.
