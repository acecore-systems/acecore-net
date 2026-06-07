---
title: 'Qué era realmente la opción SSL de pago de Cloudflare: de Dedicated SSL a Advanced Certificate Manager'
description: 'La opción antes de pago de Cloudflare, "Dedicated SSL Certificates", fue renombrada y ampliada en 2021 como "Advanced Certificate Manager (ACM)". Explicamos las diferencias con Universal SSL gratuito y en qué casos necesitas ACM.'
date: 2026-03-31T00:00
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ', 'インフラ']
image: /uploads/acecore-generated/blog-cloudflare-ssl-advanced-certificate-manager.webp
compareTable:
  title: Universal SSL vs Advanced Certificate Manager
  before:
    label: Universal SSL (Gratis)
    items:
      - Solo cubre el dominio raíz + subdominios de primer nivel
      - No permite elegir CA, vigencia ni cifrados
      - '*.example.com funciona, pero dev.staging.example.com queda fuera'
      - La marca Cloudflare puede aparecer en el CN del certificado
  after:
    label: Advanced Certificate Manager (De pago, $10/mes/zona)
    items:
      - Soporta subdominios multinivel, hasta 50 hostnames
      - Permite elegir CA (Let's Encrypt / Google Trust Services, etc.)
      - Permite definir vigencia entre 14 y 365 días
      - 'Tu propio dominio pasa a ser el CN y se oculta la marca Cloudflare'
callout:
  type: info
  title: Motivo del cambio de nombre
  text: 'El antiguo "Dedicated SSL Certificates" se renovó en 2021 como Advanced Certificate Manager (ACM). No fue solo un cambio de nombre: se añadieron funciones como soporte de subdominios multinivel, elección de CA y control de vigencia.'
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Se puede usar un certificado wildcard (*.example.com) con Universal SSL?
      answer: Sí, pero solo cubre subdominios de primer nivel como www.example.com. No aplica a subdominios de segundo nivel o más, como dev.staging.example.com, y puede generar errores de certificado. En ese caso necesitas ACM.
    - question: ¿Se puede usar Advanced Certificate Manager en el plan gratuito?
      answer: Sí. Incluso en el plan gratuito de Cloudflare puedes usar ACM comprando el complemento ACM ($10/mes/zona). No hace falta subir de plan.
    - question: ¿Cuándo es suficiente Universal SSL?
      answer: Para la mayoría de sitios personales o de pequeñas empresas, Universal SSL es suficiente. Si solo usas el dominio raíz y subdominios de primer nivel como www, no necesitas ACM.
    - question: ¿Qué pasa con Universal SSL al activar ACM?
      answer: Universal SSL y ACM pueden coexistir. Para el mismo subdominio, el certificado de ACM tiene prioridad.
linkCards:
  - href: https://developers.cloudflare.com/ssl/edge-certificates/advanced-certificate-manager/
    title: Documentación de Advanced Certificate Manager
    description: Guía oficial de Cloudflare para configurar ACM
    icon: i-lucide-file-text
  - href: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/
    title: Limitaciones de Universal SSL
    description: Documentación oficial de los casos no cubiertos por Universal SSL
    icon: i-lucide-alert-circle
  - href: https://www.cloudflare.com/ja-jp/application-services/products/advanced-certificate-manager/
    title: Página de producto de Advanced Certificate Manager
    description: Lista de funciones y método de compra de ACM (en japonés)
    icon: i-lucide-shield-check
---

“¿Cómo se llamaba aquella opción SSL de pago que tenía Cloudflare?” — mucha gente se lo ha preguntado. En este artículo aclaramos su identidad, su nombre actual y sus funciones.

## Conclusión: “Dedicated SSL” → “Advanced Certificate Manager (ACM)”

La opción SSL de pago que Cloudflare ofrecía antes era **Dedicated SSL Certificates**. En **2021 se renovó y pasó a llamarse “Advanced Certificate Manager (ACM)”**.

El precio sigue siendo el mismo: **$10 al mes por zona (dominio)**.

---

## Por qué cambió el nombre

En la etapa de “Dedicated SSL”, la función estaba centrada en emitir un certificado dedicado para ese dominio. Mientras Universal SSL gratuito compartía certificado con otros sitios, el certificado dedicado permitía tener un CN propio.

Con la transición a **Advanced Certificate Manager**, se añadieron estas funciones y el nombre pasó a enfatizar la parte de “gestión”:

- **Soporte para subdominios multinivel**: protege subdominios de segundo nivel o más, como `dev.staging.example.com`
- **Selección de CA**: puedes elegir entre Let's Encrypt, Google Trust Services, etc.
- **Definición de vigencia**: configurable entre 14 y 365 días
- **Hasta 50 hostnames**: un certificado puede cubrir varios hostnames
- **Total TLS**: protege automáticamente todos los subdominios proxied de la zona

---

## Diferencias frente a Universal SSL

Cloudflare ofrece **Universal SSL** gratis, y para la mayoría de sitios es suficiente para habilitar HTTPS. Aun así, tiene algunas limitaciones.

### Casos que Universal SSL no cubre

```
# Cubiertos por Universal SSL
example.com
www.example.com
blog.example.com

# No cubiertos por Universal SSL (requiere ACM)
dev.staging.example.com
api.v2.example.com
deep.sub.domain.example.com
```

El wildcard `*.example.com` funciona, pero **solo para subdominios de primer nivel**. No cubre patrones multinivel como `*.staging.example.com`.

### Presencia de marca Cloudflare

Con Universal SSL, el CN del certificado puede incluir un dominio de Cloudflare como `sni.cloudflaressl.com`. Con ACM, el CN pasa a ser tu dominio y la marca Cloudflare queda oculta.

---

## Cuándo necesitas ACM

Considera ACM si se cumple cualquiera de estos casos:

1. **Usas subdominios multinivel**  
   Quieres SSL para subdominios de segundo nivel o más, como `api.staging.example.com` o `dev.app.example.com`.

2. **Quieres que el CN sea tu propio dominio**  
   Quieres eliminar la marca Cloudflare del certificado (común en sitios corporativos y servicios B2B).

3. **Quieres especificar CA o vigencia**  
   Tu política de seguridad exige una CA específica o necesitas certificados de vida corta (p. ej., 14 días).

4. **Quieres proteger todos los subdominios con Total TLS**  
   Quieres cobertura automática de certificados para todos los subdominios proxied de la zona.

---

## Pasos de compra y activación

Puedes activarlo en pocos pasos desde el panel de Cloudflare:

1. Abre el dominio objetivo en el panel de Cloudflare
2. Ve a **SSL/TLS** → **Edge Certificates**
3. En la sección **Advanced Certificate Manager**, haz clic en **Enable**
4. Confirma y compra la suscripción ($10/mes)
5. Crea el certificado y añade los hostnames que quieras proteger

Si quieres activar Total TLS, solo tienes que poner en On la sección **Total TLS** en la misma página.

---

## Resumen

| Elemento               | Universal SSL (Gratis)        | Advanced Certificate Manager ($10/mes/zona)     |
| ---------------------- | ----------------------------- | ----------------------------------------------- |
| Subdominios multinivel | ✗                             | ✓                                               |
| Selección de CA        | ✗                             | ✓                                               |
| Control de vigencia    | ✗                             | ✓                                               |
| CN con dominio propio  | △                             | ✓                                               |
| Total TLS              | ✗                             | ✓                                               |
| Uso recomendado        | Sitios personales / generales | Empresas / estructuras complejas de subdominios |

La “opción SSL de pago de antes” en Cloudflare es **Advanced Certificate Manager (antes Dedicated SSL Certificates)**. Es especialmente útil cuando Universal SSL gratuito no alcanza, sobre todo si necesitas proteger subdominios multinivel y controlar finamente los certificados.
