---
title: 'De VitePress a Starlight ― Unificación del framework para sitios de documentación'
description: 'Registro de la migración de un sitio de documentación de plan de negocios construido con VitePress + UnoCSS a Astro + Starlight, unificando el framework entre dos proyectos. También se presenta la migración de diagramas Mermaid a CDN.'
date: 2026-03-15
author: gui
tags: ['技術', 'Astro', 'Starlight']
image: https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?w=800&h=400&fit=crop&q=80
processFigure:
  title: Flujo de la migración
  steps:
    - title: Análisis del estado actual
      description: Revisión de la configuración VitePress + UnoCSS.
      icon: i-lucide-search
    - title: Introducción de Starlight
      description: Reestructuración del proyecto con Astro + Starlight.
      icon: i-lucide-star
    - title: Migración de contenido
      description: Ajuste de ubicación de archivos Markdown y frontmatter.
      icon: i-lucide-file-text
    - title: Mermaid vía CDN
      description: Eliminación de dependencias de plugins y renderizado de diagramas vía CDN.
      icon: i-lucide-git-branch
compareTable:
  title: Comparación antes y después de la migración
  before:
    label: VitePress + UnoCSS
    items:
      - SSG basado en Vue
      - Estilizado con UnoCSS
      - Mermaid funciona mediante plugin
      - Stack técnico diferente al proyecto Astro
  after:
    label: Astro + Starlight
    items:
      - SSG basado en Astro
      - Estilizado integrado en Starlight
      - Mermaid funciona vía CDN
      - Framework unificado con el sitio principal
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Cuáles son las ventajas de migrar de VitePress a Starlight?
      answer: Si el sitio principal usa Astro, unificar el framework mejora el costo de aprendizaje, la gestión de dependencias y la consistencia de configuración. Además, se puede unificar el pipeline de build.
    - question: ¿Cómo se muestran los diagramas de Mermaid?
      answer: Se abandonó la dependencia del plugin y se cambió a cargar Mermaid vía CDN (jsdelivr). Esto elimina dependencias de build y estabiliza el renderizado de los diagramas.
    - question: ¿Cuánto trabajo implica la migración?
      answer: El trabajo principal es la conversión de la estructura de directorios (docs/ → src/content/docs/) y el ajuste del frontmatter. Como el contenido en sí es Markdown, se reutiliza directamente, por lo que se completa en un tiempo relativamente corto.
---

En este artículo resumimos los pasos para migrar un sitio de documentación creado con VitePress a Astro + Starlight. Cuando el sitio principal funciona con Astro, unificar la documentación también en Starlight simplifica la operación. También presentamos la migración de diagramas Mermaid a CDN.

## ¿Por qué unificar el framework?

Cuando el sitio principal y el sitio de documentación usan frameworks diferentes, surgen los siguientes problemas:

- **Duplicación del costo de aprendizaje**: Es necesario conocer las especificaciones tanto de VitePress como de Astro
- **Dispersión de dependencias**: Gestión de actualizaciones de paquetes npm en dos sistemas
- **Inconsistencia de configuración**: Mantenimiento individual de ESLint, Prettier, configuraciones de despliegue, etc.

Al unificar con Astro + Starlight, se pueden compartir patrones de archivos de configuración y conocimientos de resolución de problemas.

## Pasos de migración de VitePress a Starlight

### 1. Conversión de la estructura del proyecto

VitePress coloca los documentos en el directorio `docs/`, mientras que Starlight los coloca en `src/content/docs/`.

```
# Antes (VitePress)
docs/
  pages/
    index.md
    business-overview.md
    market-analysis.md

# Después (Starlight)
src/
  content/
    docs/
      index.md
      business-overview.md
      market-analysis.md
```

### 2. Ajuste del frontmatter

El formato del frontmatter difiere ligeramente entre VitePress y Starlight. Se migró la configuración de `sidebar` de VitePress al campo `sidebar` del frontmatter.

```yaml
# Frontmatter de Starlight
---
title: Resumen del negocio
sidebar:
  order: 1
---
```

### 3. Configuración de astro.config.mjs

```javascript
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  integrations: [
    starlight({
      title: 'Plan de negocios Acecore',
      defaultLocale: 'ja',
      sidebar: [
        {
          label: 'Plan de negocios',
          autogenerate: { directory: '/' },
        },
      ],
    }),
  ],
})
```

### 4. Eliminación de UnoCSS

En el entorno de VitePress se aplicaban estilos personalizados con UnoCSS, pero Starlight incluye estilos predeterminados suficientes. Se eliminó `uno.config.ts` y los paquetes relacionados, reduciendo las dependencias.

## Migración de diagramas Mermaid a CDN

Los documentos del plan de negocios incluyen diagramas de flujo y organigramas escritos con Mermaid. En VitePress se integraba Mermaid mediante un plugin (`vitepress-plugin-mermaid`), pero Starlight no cuenta con un plugin equivalente.

Por ello, se cambió a cargar Mermaid desde CDN en el lado del navegador.

### Implementación

Se añade el script CDN de Mermaid al head personalizado de Starlight.

```javascript
// astro.config.mjs
starlight({
  head: [
    {
      tag: 'script',
      attrs: { type: 'module' },
      content: `
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'
        mermaid.initialize({ startOnLoad: true })
      `,
    },
  ],
})
```

En Markdown se puede usar la sintaxis de Mermaid tal cual:

````markdown
```mermaid
graph TD
    A[Plan de negocios] --> B[Análisis de mercado]
    A --> C[Estrategia de ventas]
    A --> D[Plan financiero]
```
````

### Ventajas del método CDN

- **Cero dependencias de build**: No se necesita Mermaid como paquete npm
- **Siempre la última versión**: Se obtiene la versión más reciente desde el CDN
- **Sin necesidad de SSR**: Se renderiza en el navegador, sin impacto en el tiempo de build

## Resultado de la migración

| Elemento | Antes | Después |
| --- | --- | --- |
| Framework | VitePress 1.x | Astro 6 + Starlight |
| CSS | UnoCSS | Integrado en Starlight |
| Mermaid | vitepress-plugin-mermaid | CDN (jsdelivr) |
| Directorio de build | `docs/.vitepress/dist` | `dist` |
| Destino de despliegue | Cloudflare Pages | Cloudflare Pages (sin cambios) |

La unificación del framework permite compartir patrones de configuración de `astro.config.mjs` y configuraciones de despliegue entre múltiples proyectos.

## Conclusión

La unificación de frameworks no es algo "urgentemente necesario", pero su beneficio crece cuanto más tiempo dure la operación. La migración de VitePress a Starlight se completa en unas pocas horas, y la migración de Mermaid a CDN incluso supone una liberación de la gestión de plugins. Si opera múltiples proyectos, considere la unificación del stack tecnológico.
