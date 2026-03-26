---
title: 'Distribución segura de sitios estáticos con Cloudflare Pages'
description: 'Guía práctica de despliegue de sitios estáticos en Cloudflare Pages y configuración de cabeceras de seguridad y CSP mediante _headers. También presentamos la experiencia de volver de Worker a Pages.'
date: 2026-03-15
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ']
image: https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop&q=80
processFigure:
  title: Evolución de la configuración de despliegue
  steps:
    - title: Configuración inicial
      description: Distribución de sitio estático con Cloudflare Pages.
      icon: i-lucide-cloud
    - title: Migración a Worker
      description: Migración a Worker para el procesamiento de contacto.
      icon: i-lucide-server
    - title: Retorno a Pages
      description: Adopción de servicio de formularios externo para volver a estático.
      icon: i-lucide-rotate-ccw
    - title: Refuerzo de seguridad
      description: Configuración de CSP y cabeceras de seguridad con _headers.
      icon: i-lucide-shield-check
callout:
  type: info
  title: Worker vs Pages
  text: Cloudflare Worker es flexible, pero para sitios estáticos, Pages es superior en eficiencia de caché y simplicidad de despliegue. Si no se necesita procesamiento del lado del servidor, elija Pages.
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Cuándo elegir Cloudflare Pages y cuándo Workers?
      answer: Para sitios estáticos sin necesidad de procesamiento del lado del servidor, Pages es la mejor opción. La integración con CDN es perfecta y el despliegue es simple. El procesamiento de formularios se puede sustituir con servicios externos.
    - question: ¿Qué cabeceras de seguridad deben configurarse en el archivo _headers?
      answer: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy y Permissions-Policy son los básicos. CSP debe ajustarse según los recursos externos utilizados en el sitio.
    - question: ¿Cómo permitir AdSense o Analytics en la configuración CSP?
      answer: Se agregan los dominios googletagmanager.com y googlesyndication.com a script-src. También pueden necesitarse permisos en img-src y connect-src para dominios relacionados.
---

Cloudflare Pages es la plataforma óptima para el hosting de sitios estáticos. En este artículo, presentamos la configuración real de despliegue y la configuración de seguridad utilizando el archivo `_headers`.

## Configuración de despliegue: Por qué dejamos Worker y volvimos a Pages

Inicialmente, planeábamos realizar el procesamiento backend del formulario de contacto con Cloudflare Worker. Con Worker, es posible enviar emails y validar del lado del servidor.

Sin embargo, al configurar realmente, surgieron los siguientes desafíos:

- **Complejización del build**: Se necesita configuración adicional para servir la salida del build de Astro con Worker
- **Esfuerzo de depuración**: Diferencias de comportamiento entre `wrangler dev` local y producción
- **Control de caché**: Pages tiene una integración más natural con el CDN de Cloudflare

Finalmente, al utilizar el servicio externo [ssgform.com](https://ssgform.com/) para el formulario de contacto, eliminamos completamente el procesamiento del lado del servidor. Esto eliminó la necesidad de Worker y permitió desplegar en Pages como un sitio puramente estático.

## Configuración de seguridad con \_headers

En Cloudflare Pages, se pueden escribir headers de respuesta HTTP en el archivo `public/_headers`. A continuación se muestra un extracto de la configuración que utilizamos actualmente.

### Content-Security-Policy (CSP)

CSP es un header importante para prevenir ataques de cross-site scripting (XSS). Especifica los orígenes permitidos para la obtención de recursos en formato de lista blanca.

```text
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://acecore.net https://images.unsplash.com data:;
  connect-src 'self' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  frame-src https://challenges.cloudflare.com https://googleads.g.doubleclick.net;
  form-action https://ssgform.com;
```

Los puntos clave son:

- **script-src**: Permite Cloudflare Turnstile (`challenges.cloudflare.com`) y AdSense
- **img-src**: Permite el endpoint de Cloudflare Images en el mismo origen y Unsplash
- **form-action**: Restringe el envío de formularios solo a ssgform.com
- **frame-src**: Permite el iframe de Turnstile y los frames de publicidad de AdSense

### Otras cabeceras de seguridad

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- **X-Content-Type-Options**: Previene MIME sniffing
- **X-Frame-Options**: Prohíbe la incrustación en iframe como medida contra clickjacking
- **Referrer-Policy**: Envía solo el origen en cross-origin
- **Permissions-Policy**: Desactiva APIs del navegador innecesarias (cámara, micrófono, geolocalización)

## Control de caché

Se configura caché a largo plazo para assets estáticos y caché corto para HTML.

```text
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=3600
```

Los archivos del directorio `_astro/` generados por Astro incluyen un hash de contenido, por lo que un caché `immutable` de un año es seguro. El HTML tiene cierta frecuencia de actualización, por lo que se limita a un caché de 1 hora.

## Configuración de despliegue en Pages

La configuración del proyecto en Cloudflare Pages es simple:

| Elemento | Valor |
| --- | --- |
| Comando de build | `npx astro build` |
| Directorio de salida | `dist` |
| Versión de Node.js | 22 |

Al conectar el repositorio de GitHub, se despliega automáticamente con cada push a la rama `main`. Los despliegues de vista previa también se generan automáticamente por cada PR, facilitando la revisión.

## Resumen

Es importante evaluar si "¿realmente se necesita procesamiento del lado del servidor?". Al eliminar Worker mediante servicios externos, tanto el despliegue como la gestión de seguridad se simplificaron. La configuración de CSP con `_headers` requiere esfuerzo al principio, pero una vez escrita se aplica a todas las páginas, siendo una medida de seguridad con excelente relación coste-beneficio.
