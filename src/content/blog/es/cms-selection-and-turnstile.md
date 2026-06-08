---
title: 'Guía de instalación de Sveltia CMS'
description: 'Guía práctica para añadir Sveltia CMS a un sitio Astro o estático, con GitHub backend, OAuth Worker, subida de imágenes, operación multilingüe, PRs de CMS y lecciones aprendidas.'
date: 2026-06-07T16:00
lastUpdated: 2026-06-07T00:00
author: gui
tags: ['技術', 'CMS', 'Astro', 'Cloudflare', 'セキュリティ']
image: /uploads/acecore-generated/blog-cms-selection-and-turnstile.webp
processFigure:
  title: Flujo de instalación de Sveltia CMS
  description: La pantalla de administración, autenticación, contenido editable, medios y flujo de PR deben diseñarse por separado.
  steps:
    - title: Añadir la pantalla admin
      description: Coloca index.html y config.yml en public/admin y carga Sveltia CMS.
      icon: i-lucide-layout
      accent: brand
    - title: Configurar GitHub
      description: Define repo, branch, OAuth Worker y mensajes de commit antes de usar el CMS.
      icon: i-lucide-git-branch
      accent: emerald
    - title: Limitar el alcance editable
      description: Expón solo blog, autores, etiquetas y JSON fuente japonés que realmente deban editarse.
      icon: i-lucide-file-text
      accent: amber
    - title: Automatizar la operación
      description: Conecta la rama cms-content, los PRs de CMS y las tareas de traducción sin mezclarlas con desarrollo normal.
      icon: i-lucide-git-pull-request
      accent: slate
compareTable:
  title: Antes y después de añadir CMS
  before:
    label: Markdown editado a mano
    items:
      - Solo quienes usan GitHub o un editor pueden actualizar fácilmente
      - Rutas de imagen, IDs de autor y etiquetas se escriben a mano
      - Cambios de fuente japonesa y traducciones se mezclan con facilidad
      - El preview puede leer contenido de main por error
  after:
    label: Edición con Sveltia CMS
    items:
      - Markdown y JSON se editan desde formularios del navegador
      - relation, image y select reducen valores inválidos
      - Solo commits de CMS disparan tareas de traducción
      - runtime config cambia la rama del CMS entre preview y producción
callout:
  type: note
  title: Supuesto de esta guía
  text: Sveltia CMS es una aplicación de administración que corre en el navegador y edita Markdown y JSON mediante un backend Git. Usamos Acecore como ejemplo concreto, pero el patrón se puede aplicar a muchos sitios Astro.
checklist:
  title: Lista de verificación
  items:
    - text: Cargar Sveltia CMS desde public/admin/index.html
      checked: true
    - text: Definir GitHub backend y collections en public/admin/config.yml
      checked: true
    - text: Usar OAuth Worker para edición multiusuario
      checked: true
    - text: Alinear media_folder y public_folder con el directorio public de Astro
      checked: true
    - text: Decidir cómo los commits CMS activan traducción o publicación
      checked: true
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Para qué sitios sirve Sveltia CMS?
      answer: Funciona bien en sitios estáticos donde Markdown o JSON viven en el repositorio, como Astro, Hugo o VitePress. Permite añadir CMS sin una base de datos externa.
    - question: ¿Puedo usar solo un Personal Access Token de GitHub?
      answer: Sí, pero para varios editores o personas no técnicas, un OAuth Worker es más seguro y fácil de explicar. Acecore lo ejecuta en Cloudflare Workers y lo configura como backend.base_url.
    - question: ¿Conviene editar todos los idiomas en el CMS?
      answer: En equipos pequeños es más seguro editar solo la fuente japonesa y actualizar las traducciones mediante PRs. Exponer todos los idiomas complica revisión y detección de traducciones obsoletas.
---

Sveltia CMS encaja cuando quieres añadir una pantalla de edición a un sitio estático sin mover el contenido a una base de datos externa. Esta guía resume cómo lo incorporamos en el sitio Astro de Acecore y qué corregimos después al revisar PRs y commits reales.

El título es simple a propósito: **Guía de instalación de Sveltia CMS**. No es una comparación de CMS, sino una referencia práctica para quien quiera introducirlo en su propio sitio.

## Cuándo usar Sveltia CMS

Sveltia CMS no es un CMS que posea una base de datos y sirva contenido por API. Es una aplicación de una sola página que edita archivos del repositorio mediante GitHub backend.

Es buena opción cuando:

- el contenido está en Markdown o JSON dentro del repositorio
- quieres revisar artículos, autores, etiquetas y textos de página como diffs de Git
- no quieres añadir base de datos ni servicio de administración separado
- las imágenes pueden guardarse bajo `public/uploads`
- los cambios del CMS deben pasar por Pull Request antes de producción

Si necesitas permisos editoriales complejos, publicación programada avanzada, mucha gestión de medios o edición de datos en tiempo real, puede convenir un headless CMS completo o un panel propio.

## Arquitectura general

La configuración de Acecore se organiza así:

```text
public/admin/index.html
  -> carga @sveltia/cms desde CDN

public/admin/config.yml
  -> define GitHub backend, collections y carpetas de medios

workers/sveltia-cms-auth
  -> Cloudflare Worker para GitHub OAuth

cms-content branch
  -> rama donde el CMS guarda cambios

.github/workflows/cms-content-pr.yml
  -> crea PR desde cms-content hacia main

.github/workflows/create-translation-prs.yml
  -> crea tareas de traducción solo para commits cms:
```

Instalar la pantalla admin es solo el inicio. Autenticación, rutas de imágenes, preview branches, traducciones y estrategia de merge forman parte del diseño.

## 1. Colocar el admin en `public/admin`

En Astro, `public` se sirve como archivos estáticos. La documentación de Sveltia CMS también indica `public` como carpeta estática para Astro, Next.js, Nuxt, Remix y VitePress.

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex,nofollow" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CMS</title>
  </head>
  <body>
    <script src="https://unpkg.com/@sveltia/cms@0.166.0/dist/sveltia-cms.js"></script>
  </body>
</html>
```

No añadas una hoja CSS extra ni `type="module"` sin necesidad. La UI ya viene empaquetada en el JavaScript de Sveltia CMS.

Acecore usa inicialización manual para poder cambiar la rama en preview.

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
    },
  },
})
```

## 2. Configurar GitHub backend

Lo mínimo es `backend.name` y `backend.repo`, pero en producción conviene definir también branch, OAuth y mensajes de commit.

```yaml
backend:
  name: github
  repo: owner/repository
  branch: cms-content
  base_url: https://your-sveltia-cms-auth-worker.example.workers.dev
  auth_methods: [oauth]
  commit_messages:
    create: 'cms: create {{collection}} "{{slug}}"'
    update: 'cms: update {{collection}} "{{slug}}"'
    delete: 'cms: delete {{collection}} "{{slug}}"'
    uploadMedia: 'cms: upload "{{path}}"'
    deleteMedia: 'cms: delete media "{{path}}"'
```

Para un sitio personal, guardar en `main` puede bastar. Para un sitio corporativo o multilingüe, una rama dedicada como `cms-content` facilita revisión y rollback.

## 3. Añadir OAuth Worker

Un Personal Access Token sirve para probar, pero no es ideal para varios editores. Acecore usa Sveltia CMS Authenticator en Cloudflare Workers y lo configura en `base_url`.

La aplicación OAuth de GitHub apunta su callback a `/callback` del Worker. El Worker recibe `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` y opcionalmente `ALLOWED_DOMAINS`.

Esto no sustituye a Turnstile. OAuth protege el inicio de sesión del CMS; Turnstile protege formularios o APIs de comentarios frente a bots.

## 4. Fijar la carpeta de medios desde el principio

Sveltia CMS puede guardar medios dentro del repositorio. En Astro, lo práctico es usar `public/uploads` y publicarlo como `/uploads`.

```yaml
media_folder: public/uploads
public_folder: /uploads
```

Acecore corrigió este punto después en [PR #116](https://github.com/acecore-systems/acecore-net/pull/116). La lección es decidir juntos la ubicación en el repositorio y la URL pública antes de que editores empiecen a subir imágenes.

## 5. Separar el alcance en collections

| collection | Objetivo                       | Política                                   |
| ---------- | ------------------------------ | ------------------------------------------ |
| `blog`     | `src/content/blog/*.md`        | Editar solo artículos fuente en japonés    |
| `authors`  | `src/content/authors/*.json`   | Editar perfiles y nombres localizados      |
| `tags`     | `src/content/tags/*.json`      | Editar etiquetas y nombres localizados     |
| page text  | `src/i18n/source/ja/**/*.json` | Editar textos fuente de páginas y UI común |

No expongas todos los Markdown traducidos si no es necesario. Acecore trata el japonés como fuente canónica y actualiza traducciones mediante [Cómo gestionar un blog multilingüe con Sveltia CMS](/es/blog/copilot-translation-pipeline/).

## 6. Reducir errores con relation y select

Las etiquetas son relation fields, no texto libre.

```yaml
- name: tags
  label: Etiquetas
  widget: relation
  collection: tags
  value_field: name
  display_fields: ['{{name}} ({{id}})']
  search_fields: [name, id]
  multiple: true
  required: false
```

Autores, iconos y tonos de anuncios siguen la misma idea. Un buen CMS no solo permite editar; dificulta guardar valores inválidos.

## 7. Editar también JSON fuente japonés

Los textos fijos de páginas pueden gestionarse igual. Acecore reúne la fuente japonesa en `src/i18n/source/ja/**/*.json` y la expone por página.

La advertencia es no añadir todos los campos de golpe. `config.yml` crece rápido y se vuelve difícil de revisar. Empieza por blog, autores, etiquetas, avisos y páginas que cambian a menudo.

## 8. Mantener coherentes las ramas de preview

Si el CMS abierto en una preview de Cloudflare Pages sigue leyendo `main`, el editor verá contenido distinto al preview. Acecore genera `public/admin/runtime-config.js` antes del build e inyecta la rama actual.

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
    },
  },
})
```

## 9. Crear PRs desde una rama CMS

Guardar cambios en `cms-content` y crear PR hacia `main` conserva revisión y trazabilidad.

```yaml
on:
  push:
    branches:
      - cms-content
```

La forma de merge importa. Las tareas de traducción dependen de subjects como `cms: create ...` o `cms: update ...`. Si se hace squash y se pierden, la automatización puede no detectar el cambio. Para PRs CMS, conviene merge commit o rebase merge.

## 10. Activar traducción solo con commits CMS

[PR #98](https://github.com/acecore-systems/acecore-net/pull/98) añadió `--cms-only` para que las tareas de traducción por push solo se creen con commits de CMS.

```javascript
function isCmsCommitSubject(subject) {
  return /^cms: (create|update|delete) /.test(subject || '')
}
```

`cms:` es parte del contrato de workflow, no un prefijo decorativo.

## 11. Usar CSP propio para `/admin`

La pantalla admin necesita conectar con CDN, GitHub API, OAuth Worker y blob URLs. Por eso Acecore separa el CSP de `/admin/*` y además lo marca como `noindex`.

## Separar Turnstile

La versión antigua mezclaba selección de CMS y Cloudflare Turnstile. Eso confundía el foco.

Sveltia CMS trata de GitHub backend, OAuth, collections, medios y PRs. Turnstile trata de reducir bots en formularios o APIs. Ambos ayudan a la operación, pero viven en capas distintas.

## Lecciones de PRs y commits

- Al cambiar de CMS, también hay que actualizar artículos, screenshots y enlaces internos.
- OAuth debe formar parte del setup real, no quedar para después.
- Las rutas de medios deben fijarse antes de subir imágenes.
- `config.yml` debe crecer por etapas.
- `cms:` es un contrato para automatización.
- En preview debe estar claro qué branch lee el CMS.

## Punto de partida mínimo

```text
public/admin/index.html
public/admin/config.yml
public/admin/init.js
public/admin/runtime-config.js
```

Desde ahí, añade relations de autores y etiquetas, imágenes, JSON fuente, PRs automáticos de CMS y tareas de traducción.

## Referencias

- [Sveltia CMS Getting Started](https://sveltiacms.app/en/docs/start)
- [Sveltia CMS GitHub Backend](https://sveltiacms.app/en/docs/backends/github)
- [Sveltia CMS Internal Media Storage](https://sveltiacms.app/en/docs/media/internal)
- [Sveltia CMS Manual Initialization](https://sveltiacms.app/en/docs/api/initialization)
- [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth)

## Resumen

Sveltia CMS es fácil de colocar bajo `public/admin`, pero la instalación productiva requiere definir branch, OAuth, carpetas de medios, política de idioma fuente, workflow de traducción y estrategia de merge. Con esas reglas claras, un sitio Astro puede seguir siendo estático y ligero, pero mucho más fácil de actualizar.
