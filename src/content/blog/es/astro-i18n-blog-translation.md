---
title: "Cómo hacer que un sitio Astro 6 soporte 9 idiomas ― Traducción automática de 136 artículos y arquitectura multilingüe"
description: "Registro de la internacionalización de un sitio Astro 6 + UnoCSS + Cloudflare Pages a 9 idiomas. Cubre todo el proceso desde la internacionalización de la UI hasta la traducción de 136 artículos y la configuración multilingüe de Pages CMS."
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'i18n', 'Webサイト']
image: https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop&q=80
processFigure:
  title: Flujo de trabajo multilingüe
  steps:
    - title: Base i18n
      description: Configurar el enrutamiento i18n integrado de Astro y las utilidades de traducción.
      icon: i-lucide-globe
    - title: Traducción de textos UI
      description: Traducir los textos de encabezado, pie de página y todos los componentes.
      icon: i-lucide-languages
    - title: Traducción de artículos
      description: Generar 136 archivos de traducción (17 artículos × 8 idiomas).
      icon: i-lucide-file-text
    - title: CMS y verificación de build
      description: Configurar Pages CMS multilingüe y verificar la generación de todas las páginas.
      icon: i-lucide-check-circle
compareTable:
  title: Comparación antes y después
  before:
    label: Solo japonés
    items:
      - Solo 1 idioma (japonés)
      - 17 artículos de blog
      - 523 páginas generadas (tras soporte multilingüe de UI)
      - Pages CMS con 1 colección de blog
      - Etiquetas y datos de autor solo en japonés
      - 1 solo feed RSS
  after:
    label: 9 idiomas
    items:
      - Japonés + 8 idiomas (en, zh-cn, es, pt, fr, ko, de, ru)
      - 17 artículos + 136 traducciones = 153 en total
      - 541 páginas generadas (artículos traducidos con fallback)
      - Pages CMS con 9 colecciones por idioma
      - 25 etiquetas y datos de autor traducidos por idioma
      - Feeds RSS multilingües (9 idiomas)
callout:
  type: info
  title: Idiomas soportados
  text: "Soporta 9 idiomas: japonés (predeterminado), inglés, chino simplificado, español, portugués, francés, coreano, alemán y ruso."
statBar:
  items:
    - value: '9'
      label: Idiomas soportados
    - value: '136'
      label: Artículos traducidos
    - value: '541'
      label: Páginas generadas
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Por qué se eligieron 9 idiomas?
      answer: "Para maximizar el alcance global, cubrimos los principales mercados lingüísticos. Inglés, chino, español y portugués cubren la mayoría de los usuarios de internet, mientras que francés, alemán, ruso y coreano complementan los mercados principales restantes."
    - question: ¿Cómo se garantiza la calidad de la traducción?
      answer: "Usamos traducción por IA con GitHub Copilot. Primero se crea la versión en inglés como idioma intermedio, luego se traduce desde el inglés a cada idioma destino para reducir la variación de calidad. Los valores de etiquetas en frontmatter se mantienen en japonés, y las URLs, bloques de código y rutas de imágenes no se modifican."
    - question: ¿Qué ocurre cuando no existe un artículo traducido?
      answer: "La función de fallback muestra el artículo original en japonés cuando no existe traducción. Las traducciones pueden añadirse de forma incremental."
    - question: ¿Es necesario traducir al añadir un nuevo artículo?
      answer: "No es obligatorio — si no existe archivo de traducción, se muestra la versión japonesa como fallback. Para añadir una traducción, basta con colocar un archivo Markdown con el mismo nombre en el directorio del idioma correspondiente."
---

Actualizamos el sitio web oficial de Acecore de solo japonés a soporte para 9 idiomas. Este artículo cubre todo el proceso: internacionalización de la UI, traducción de 17 artículos × 8 idiomas = 136 archivos, y configuración multilingüe de Pages CMS.

## Estrategia multilingüe

### Definición del alcance

Abordamos el soporte multilingüe en tres fases:

1. **Base i18n**: Configuración de enrutamiento i18n integrado de Astro, utilidades de traducción y archivos JSON de traducción para 9 idiomas
2. **Traducción de textos UI**: Textos de componentes en encabezado, pie de página, barra lateral y todas las páginas
3. **Traducción de artículos**: Los 17 artículos traducidos a 8 idiomas (136 archivos generados)

### Diseño de URLs

Adoptamos `prefixDefaultLocale: false` de Astro, sirviendo japonés en la raíz (`/blog/...`) y otros idiomas con prefijos (`/en/blog/...`, `/zh-cn/blog/...`, etc.).

```
# Japonés (predeterminado)
/blog/astro-performance-tuning/

# Inglés
/en/blog/astro-performance-tuning/

# Chino simplificado
/zh-cn/blog/astro-performance-tuning/
```

Usar el mismo slug en todos los idiomas mantiene simple el mapeo de URLs al cambiar de idioma.

## Implementación de la base i18n

### Configuración i18n de Astro

Se configura el enrutamiento i18n en `astro.config.mjs`.

```javascript
// astro.config.mjs
export default defineConfig({
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
})
```

### Utilidades de traducción

Los archivos de configuración, funciones utilitarias y archivos JSON de traducción se consolidan en `src/i18n/`.

```typescript
// src/i18n/utils.ts
export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key]
    ?? translations[defaultLocale][key]
    ?? key
}
```

Los archivos de traducción están en formato JSON bajo `src/i18n/locales/`, gestionando aproximadamente 100 claves para navegación, pie de página, UI del blog y metadatos.

### Patrón View Component

La implementación de páginas usa el **Patrón View Component**. El diseño y la lógica se centralizan en `src/views/`, mientras los archivos de ruta (`src/pages/`) son wrappers ligeros que simplemente pasan el locale.

```astro
---
// src/pages/[locale]/about.astro (archivo de ruta)
import AboutPage from '../../views/AboutPage.astro'
const { locale } = Astro.params
---
<AboutPage locale={locale} />
```

Este diseño elimina la duplicación de lógica entre la ruta japonesa (`/about`) y las rutas multilingües (`/en/about`).

## Soporte multilingüe del contenido del blog

### Estructura de directorios

Los artículos traducidos se colocan en subdirectorios con código de idioma. El loader glob de Astro los detecta automáticamente de forma recursiva con el patrón `**/*.md`.

```
src/content/blog/
  astro-performance-tuning.md          # Japonés (base)
  website-renewal.md
  en/
    astro-performance-tuning.md        # Versión en inglés
    website-renewal.md
  zh-cn/
    astro-performance-tuning.md        # Versión en chino simplificado
    website-renewal.md
  es/
    ...
```

### Utilidades de resolución de contenido

Se implementaron 3 funciones en `src/utils/blog-i18n.ts`.

```typescript
// Determinar si es un artículo base (sin barra en el ID = base)
export function isBasePost(post: CollectionEntry<'blog'>): boolean {
  return !post.id.includes('/')
}

// Eliminar prefijo de locale del ID para obtener el slug base
export function getBaseSlug(postId: string): string {
  const idx = postId.indexOf('/')
  return idx !== -1 ? postId.slice(idx + 1) : postId
}

// Obtener la versión localizada de un artículo base (fallback al original)
export function localizePost(
  post: CollectionEntry<'blog'>,
  allPosts: CollectionEntry<'blog'>[],
  locale: Locale,
): CollectionEntry<'blog'> {
  if (locale === defaultLocale) return post
  return allPosts.find((p) => p.id === `${locale}/${post.id}`) ?? post
}
```

El punto clave es **no modificar el esquema existente de la colección de contenido**. El loader glob de Astro reconoce automáticamente los archivos en subdirectorios con IDs como `en/astro-performance-tuning`, sin necesidad de cambios de configuración.

### Reglas de los archivos de traducción

Los archivos de traducción se generaron siguiendo estas reglas:

- Las **claves del frontmatter** permanecen en inglés (`title`, `description`, `date`, etc.)
- Los **valores de etiquetas** se mantienen en japonés (`['技術', 'Astro']`, etc.)
- **URLs, rutas de imágenes, bloques de código y HTML** no se modifican
- **Fecha y autor** permanecen sin cambios
- **Texto del cuerpo y valores de texto del frontmatter** (title, description, callout, FAQ, etc.) se traducen

### Flujo de trabajo de traducción

El proceso de traducción sigue estos pasos:

1. **Crear inglés como idioma intermedio**: Traducir del japonés original al inglés
2. **Traducir del inglés a cada idioma**: Expandir desde el inglés a 7 idiomas
3. **Procesamiento por lotes**: Procesar 5-6 artículos a la vez con GitHub Copilot

La traducción en dos etapas (japonés → inglés → idiomas destino) reduce la variación de calidad. Pasar por el inglés como idioma intermedio produce calidad más estable que traducir directamente del japonés a cada idioma.

## View Components multilingües

### Implementación de BlogPostPage

La página de artículos obtiene la versión locale del contenido usando `localizePost()` y la asigna a una variable de plantilla.

```astro
---
// src/views/BlogPostPage.astro
const localizedPost = localizePost(basePost, allPosts, locale)
const post = localizedPost // las referencias existentes de la plantilla funcionan tal cual
---
```

Este enfoque permite el soporte multilingüe sin cambiar ninguna referencia a `post.data.title` o `post.body` en la plantilla.

### Implementación de páginas de lista

Las listas de blog, etiquetas, autores y archivos filtran solo artículos base con `isBasePost()`, y luego sustituyen con versiones traducidas usando `localizePost()` al momento de mostrar.

```astro
---
const allPosts = await getCollection('blog')
const basePosts = allPosts.filter(isBasePost)
const displayPosts = basePosts.map(p => localizePost(p, allPosts, locale))
---
```

## Consideraciones de build

### Escape en frontmatter YAML

Las traducciones al francés causaron problemas donde los apóstrofos (`l'atelier`, `qu'on`, etc.) conflictuaban con las comillas simples de YAML.

```yaml
# NG: Error de análisis YAML
title: 'Le métavers est plus proche qu'on ne le pense'

# OK: Cambiar a comillas dobles
title: "Le métavers est plus proche qu'on ne le pense"
```

Se usó un script Node.js para corregir todos los archivos en lote. Texto en inglés como `Acecore's` tiene el mismo problema, por lo que el tipo de comillas debe considerarse al generar archivos de traducción.

### Filtrado de rutas de imágenes OG

`/blog/og/[slug].png.ts` también capturaba slugs de artículos traducidos (`en/aceserver-hijacked`, etc.), causando errores de parámetros. Se resolvió filtrando con `isBasePost()`.

```typescript
export const getStaticPaths: GetStaticPaths = async () => {
  const allPosts = await getCollection('blog')
  const posts = allPosts.filter(isBasePost)
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title },
  }))
}
```

## Soporte multilingüe de Pages CMS

Pages CMS (`.pages.yml`) solo apunta a archivos directamente bajo el directorio `path` especificado, por lo que los subdirectorios de traducción se registraron como colecciones individuales.

```yaml
content:
  - name: blog
    label: ブログ（日本語）
    path: src/content/blog
  - name: blog-en
    label: Blog（English）
    path: src/content/blog/en
  - name: blog-zh-cn
    label: 博客（简体中文）
    path: src/content/blog/zh-cn
  # ... configurado para cada idioma
```

Las etiquetas se escriben en cada idioma para que sea inmediatamente claro qué colección corresponde a qué idioma en el CMS.

## UI de cambio de idioma

Se añadió un componente `LanguageSwitcher` al encabezado, proporcionando una UI de cambio de idioma para escritorio y móvil. Al cambiar de idioma, los usuarios navegan al locale correspondiente de la misma página. En la primera visita, se detecta el `navigator.language` del navegador para redirección automática.

## Visualización multilingüe de etiquetas

Las etiquetas de los artículos mantienen sus slugs en japonés en las URLs mientras **solo se traduce el nombre visible**. Esto evita la complejidad de enrutamiento mientras muestra las etiquetas en el idioma nativo del usuario.

```typescript
// src/i18n/utils.ts
export function translateTag(tag: string, locale: Locale): string {
  return t(locale, `tags.${tag}`) !== `tags.${tag}`
    ? t(locale, `tags.${tag}`)
    : tag
}
```

Se añadió una sección `tags` a cada JSON de traducción, definiendo traducciones para los 25 tipos de etiquetas.

```json
// en.json (extracto)
{
  "tags": {
    "技術": "Technology",
    "セキュリティ": "Security",
    "パフォーマンス": "Performance",
    "アクセシビリティ": "Accessibility"
  }
}
```

`translateTag()` se usa en 6 ubicaciones — tarjetas de artículos, barra lateral, índice de etiquetas y detalle de artículos — asegurando que todas las etiquetas se muestren unificadas en el idioma apropiado.

## Datos de autor multilingües

Las biografías y listas de habilidades de los autores también cambian según el idioma. Se añadió un campo `i18n` a `src/data/authors.json` para almacenar las traducciones de cada idioma.

```json
{
  "id": "hatt",
  "name": "hatt",
  "bio": "代表取締役。Web制作・システム開発…",
  "skills": ["TypeScript", "Astro", "..."]
  "i18n": {
    "en": {
      "bio": "CEO and representative director. Web development...",
      "skills": ["TypeScript", "Astro", "..."]
    }
  }
}
```

La utilidad `getLocalizedAuthor()` obtiene la información del autor apropiada para el locale.

```typescript
// src/utils/blog-i18n.ts
export function getLocalizedAuthor(author: Author, locale: Locale) {
  const localized = author.i18n?.[locale]
  return localized ? { ...author, ...localized } : author
}
```

## SEO para sitio multilingüe

Para maximizar los beneficios SEO del soporte multilingüe, implementamos mecanismos para que los motores de búsqueda identifiquen e indexen correctamente cada versión de idioma.

### Soporte hreflang en sitemap

Se configuró la opción `i18n` de `@astrojs/sitemap` para generar automáticamente etiquetas `xhtml:link rel="alternate"` en el sitemap.

```javascript
// astro.config.mjs
sitemap({
  i18n: {
    defaultLocale: 'ja',
    locales: {
      ja: 'ja',
      en: 'en',
      'zh-cn': 'zh-CN',
      es: 'es',
      pt: 'pt',
      fr: 'fr',
      ko: 'ko',
      de: 'de',
      ru: 'ru',
    },
  },
})
```

Esto genera enlaces hreflang para los 9 idiomas en cada URL, permitiendo que Google comprenda con precisión la correspondencia entre versiones de idioma.

### Soporte de idioma en datos estructurados JSON-LD

Se añadió el campo `inLanguage` a los datos estructurados `BlogPosting` de los artículos, informando a los motores de búsqueda en qué idioma está escrito cada artículo.

```javascript
// BlogPostPage.astro (extracto JSON-LD)
{
  "@type": "BlogPosting",
  "inLanguage": htmlLangMap[locale],  // "ja", "en", "zh-CN", etc.
  "headline": post.data.title,
  // ...
}
```

### Feeds RSS multilingües

Además del `/rss.xml` en japonés, se generan feeds RSS para cada versión de idioma (`/en/rss.xml`, `/zh-cn/rss.xml`, etc.). Los títulos y descripciones de los feeds se traducen por idioma, y la etiqueta `<language>` genera códigos de idioma compatibles con BCP47.

```typescript
// src/pages/[locale]/rss.xml.ts
export const getStaticPaths = () =>
  locales.filter((l) => l !== defaultLocale).map((l) => ({ params: { locale: l } }))
```

El `<link rel="alternate" type="application/rss+xml">` en `BaseLayout.astro` también configura automáticamente la URL RSS apropiada para el locale.

## Resumen

Aprovechando las funcionalidades i18n integradas de Astro 6, logramos soporte multilingüe de alta calidad incluso en un sitio estático.

- **Base i18n**: Sin prefijo para japonés con `prefixDefaultLocale: false` de Astro
- **Traducción de UI**: Cero duplicación de lógica mediante el Patrón View Component
- **Traducción de contenido**: Enfoque de subdirectorios sin cambios de esquema
- **Traducción de etiquetas**: Slugs en japonés en URLs, nombres visibles traducidos por idioma
- **Traducción de datos de autor**: Bio y habilidades cambian según el idioma
- **SEO**: Hreflang en sitemap, `inLanguage` en JSON-LD, feeds RSS multilingües
- **Fallback**: Los artículos sin traducción muestran automáticamente la versión japonesa
- **Soporte CMS**: Los artículos de cada idioma son editables individualmente en Pages CMS

En adelante, los archivos de traducción se añadirán de forma incremental a medida que se publiquen nuevos artículos. Gracias a la función de fallback, la versión japonesa se muestra hasta que las traducciones estén completas, manteniendo la calidad del sitio.
