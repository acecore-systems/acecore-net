---
title: 'Cómo gestionar un blog en 9 idiomas publicando solo un artículo en japonés'
description: 'Una guía sobre cómo actualizar solo artículos en japonés en Pages CMS y generar automáticamente traducciones en japonés + 8 idiomas usando GitHub Actions y GitHub Copilot, incluyendo la construcción y fusión automática.'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: La conclusión primero
  text: 'Con el sitio actual de Acecore, puedes automatizar la operación de un blog en japonés + 8 idiomas usando GitHub Actions y GitHub Copilot, con los artículos en japonés como fuente de traducción.'
processFigure:
  title: Flujo de 1 artículo japonés a operación en 9 idiomas
  steps:
    - title: Actualizar la fuente en japonés
      description: Editar solo el artículo japonés mediante Pages CMS o Markdown y enviarlo a main.
      icon: i-lucide-pencil-line
    - title: Crear issues de traducción automáticamente
      description: GitHub Actions crea issues con la ruta de origen y los idiomas objetivo incorporados.
      icon: i-lucide-ticket
    - title: Copilot crea PRs de traducción
      description: Al recibir el issue, genera los archivos de traducción y abre un PR de traducción.
      icon: i-lucide-git-pull-request
    - title: Construir, fusionar y cerrar issues
      description: Tras una construcción exitosa, se realiza la fusión automática y se cierra automáticamente el issue de traducción principal.
      icon: i-lucide-check-check
compareTable:
  title: Comparación entre operación manual y automática
  before:
    label: Operación de traducción manual
    items:
      - Alguien crea manualmente las tareas de traducción tras publicar un artículo
      - Se asigna una persona por idioma
      - Las decisiones de construcción y fusión también son manuales
      - Los issues principales quedan fácilmente sin cerrar
  after:
    label: Operación de traducción automática
    items:
      - Un push del artículo en japonés desencadena todo
      - Se asigna automáticamente a Copilot
      - Los PRs de traducción se fusionan automáticamente tras una construcción exitosa
      - Los issues principales también se cierran automáticamente tras la fusión
checklist:
  title: Requisitos previos antes de empezar
  items:
    - text: Estructura de contenido usando el japonés como fuente de traducción
    - text: Una regla de ubicación de archivos de traducción como src/content/blog/{locale}/{slug}.md
    - text: GitHub Actions con permiso de escritura en issues
    - text: COPILOT_AGENT_TOKEN que pueda llamar a la API de asignación de Copilot
    - text: Un comando de construcción estable como npm run build
faq:
  title: Preguntas frecuentes
  items:
    - question: Si publico un artículo en japonés, ¿se crearán automáticamente artículos en otros idiomas?
      answer: 'Sí. El sitio actual de Acecore admite 9 idiomas — ja, en, zh-cn, es, pt, fr, ko, de, ru — por lo que publicar un artículo en japonés desencadena automáticamente la creación de issues de traducción para los 8 idiomas restantes, la asignación a Copilot, la creación de PRs de traducción, la construcción, la fusión automática y el cierre de issues. Incluso si los archivos de traducción aún no existen, cada URL de idioma puede servirse con japonés como alternativa, por lo que puedes publicar primero y reemplazar con traducciones reales después.'
    - question: ¿Por qué crear un issue en lugar de crear directamente un PR?
      answer: 'Porque puedes fijar la ruta de origen, los idiomas objetivo y las condiciones de traducción en el issue. Cuando aparece una diferencia después, la re-ejecución, la verificación del historial y la recuperación de fallos se vuelven mucho más fáciles.'
    - question: ¿Es segura la fusión automática?
      answer: 'La fusión automática incondicional es peligrosa. Al restringirla solo a PRs de traducción y requerir que todos los siguientes condiciones se cumplan: creado por Copilot, título que comience con [translation], construcción exitosa y no ser un borrador, se puede hacer bastante seguro.'
---

En pocas palabras, en este sitio puedes publicar un artículo en japonés una vez a través de Pages CMS y tener artículos del blog en japonés + 8 idiomas más alineados secuencialmente. GitHub Actions y GitHub Copilot se encargan de la creación de issues de traducción, la creación de PRs de traducción, la construcción, la fusión automática y el cierre de issues principales.

Las operaciones diarias solo requieren trabajar con artículos en japonés e información de autores. Como ya no necesitas crear manualmente tareas de traducción ni ordenar PRs cada vez, la carga de gestionar un blog multilingüe se reduce significativamente.

## Requisitos previos para este enfoque

Como requisito previo, este enfoque asume que ya tienes la siguiente infraestructura en el lado de Astro.

- Enrutamiento en 9 idiomas (ja, en, zh-cn, es, pt, fr, ko, de, ru)
- Alternativa para mostrar japonés en páginas sin traducción
- Operaciones para actualizar artículos en japonés e información de autores desde Pages CMS

Cómo construir la infraestructura en sí está cubierto en [Haciendo que un sitio Astro 6 admita 9 idiomas — Traducción automática de 136 artículos de blog y arquitectura multilingüe](/blog/astro-i18n-blog-translation/). Este artículo se enfoca únicamente en cómo superponer las operaciones de traducción automática con Copilot sobre eso.

## Qué puedes hacer

Desde el lado de las operaciones, normalmente hay dos pantallas con las que interactúas. Esta vez usamos la pantalla de Pages CMS tal como está, dejando inmediatamente claro **dónde interactuar en las operaciones diarias**.

![Pantalla de lista de blog japonés de Pages CMS](/uploads/pagescms-blog-ja-live-20260329.png)

La primera pantalla es la lista de blog japonés de Pages CMS. Aquí ves las fechas de publicación y los autores mientras añades y actualizas solo los artículos en japonés. La clave es orientar las operaciones hacia **tocar solo la fuente de traducción japonesa**, sin tener que entrar en la pantalla de edición de múltiples idiomas cada vez.

![Pantalla del formulario de información de autores de Pages CMS](/uploads/pagescms-authors-live-20260329.png)

La segunda pantalla es el formulario de información de autores. Al actualizar solo los campos basados en japonés en el CMS para los datos de autor y dejar la traducción `i18n` al flujo de automatización de GitHub, la separación de responsabilidades operativas se vuelve bastante limpia.

## Cuándo funciona mejor este enfoque

Como premisa, este enfoque es especialmente efectivo para equipos o sitios como los siguientes.

- Quieren usar el japonés como fuente de traducción
- El blog se gestiona en Markdown
- Crear manualmente tareas de traducción cada vez es engorroso
- Están dispuestos a confiar en la IA para la calidad de traducción en cierta medida
- Pero quieren detener los PRs que fallan en la construcción o permanecen como borradores

Por el contrario, si cada idioma tiene una estructura de edición completamente independiente, puede ser más adecuado un enfoque diferente.

## Paso 1. Fijar la fuente de traducción a los artículos en japonés

Lo primero que hay que decidir es "qué archivo usar como fuente de traducción." Si esto es ambiguo, la automatización se rompe.

La "fuente de traducción" en este artículo significa **el archivo japonés que se edita primero y sirve como estándar para los artículos y datos derivados en cada idioma**.

En esta configuración, los siguientes se dividen en fuente de traducción y destino de traducción.

- Fuente de traducción de artículos del blog: `src/content/blog/{slug}.md`
- Destino de traducción de artículos del blog: `src/content/blog/{locale}/{slug}.md`
- Fuente de traducción de información de autores: `src/data/authors.json`
- Destino de traducción de información de autores: `i18n` en `src/data/authors.json`

La estructura de directorios es más fácil de manejar si se ve aproximadamente así.

```text
src/content/blog/
  my-post.md
  another-post.md
  en/
    my-post.md
  zh-cn/
    my-post.md
  fr/
    my-post.md
```

La clave es **alinear el slug de los archivos de traducción con el artículo japonés original**. Solo esto facilita la identificación automática del objetivo de traducción desde la ruta de origen.

En este repo, incluso si los archivos de traducción aún no existen, las URLs de los idiomas en sí se generan con el japonés como alternativa. Esto significa que puedes operar con "publicar el artículo japonés primero, luego dejar que los PRs de traducción lo alcancen después."

## Paso 2. Convertir los pushes de artículos japoneses en issues de traducción

El siguiente paso es detectar cambios en los artículos japoneses con GitHub Actions y crear automáticamente issues de traducción.

Como mínimo, necesitas lo siguiente.

- Monitorear pushes a `main`
- Dirigirse solo a `src/content/blog/*.md` y `src/data/authors.json`
- Actualizar un issue abierto existente con la misma ruta de origen en lugar de crear uno nuevo
- Incorporar la ruta de origen como marcador en el cuerpo del issue

Por ejemplo, insertar un comentario como este en el cuerpo del issue permite reutilizarlo en la automatización downstream.

```md
<!-- translation-source:src/content/blog/my-post.md -->
<!-- translation-kind:blog-post -->
```

El filtrado básico en el lado del workflow se ve así.

```yaml
on:
  push:
    branches:
      - main
    paths:
      - src/content/blog/*.md
      - src/data/authors.json
```

Lo importante aquí no es "crear traducciones directamente" sino **crear un issue primero**. Al insertar un paso de issue, puedes fijar la ruta de origen, los idiomas objetivo y las condiciones de traducción de una forma visible tanto para humanos como para la IA.

## Paso 3. Asignar automáticamente issues de traducción a Copilot

Crear solo un issue aún deja trabajo manual, por lo que aquí se asigna automáticamente a Copilot.

Hay dos cosas que hacer.

1. Añadir `COPILOT_AGENT_TOKEN` a los secrets del repositorio
2. Llamar a la API de asignación después de crear el issue

Conceptualmente, parcheas el issue y estableces Copilot como assignee.

```json
{
  "assignees": ["copilot-swe-agent[bot]"],
  "agent_assignment": {
    "target_repo": "OWNER/REPO",
    "base_branch": "main",
    "custom_instructions": "Translate the Japanese source article..."
  }
}
```

En este punto, mantener las `custom_instructions` separadas para artículos vs. información de autores estabiliza la precisión. Especificar que la información de autores solo debe tocar `i18n` en `src/data/authors.json`, y que los artículos deben crear un archivo con el mismo nombre en `src/content/blog/{locale}/`, reduce los errores.

## Paso 4. Construir PRs de traducción y fusionar automáticamente

Esta parte es más segura si no la conviertes en automatización incondicional. La recomendación es fusionar solo los PRs que satisfacen todas las siguientes condiciones.

- El PR fue creado por Copilot
- El título comienza con `[translation]`
- Está dirigido a `main`
- No es un borrador
- La construcción fue exitosa

En esta configuración, está dividido en dos etapas.

1. `Translation PR Build`
2. `Merge Translation PR`

Cuando un PR se convierte en listo para revisión, construye su head, y si tiene éxito, realiza un squash merge. Como esto no depende de la protección de ramas de GitHub, es fácil de manejar incluso para repos pequeños.

### Condiciones para restringir la fusión automática

Al agregar la fusión automática, las siguientes condiciones son las mínimas recomendadas.

- Excluir todo excepto los PRs de traducción
- Detener si la construcción falla
- Detener mientras esté en estado borrador
- Excluir PRs creados por alguien que no sea Copilot

Con estos cuatro en su lugar, puedes evitar en gran medida los accidentes donde los PRs de desarrollo normal también se ven involucrados.

## Paso 5. Cerrar automáticamente los issues de traducción principales después de la fusión

Lo último que se agrega para que las operaciones estén limpias es el cierre automático de los issues principales.

El método es simple — para los PRs de traducción fusionados, haz lo siguiente.

1. Obtener los archivos cambiados en el PR
2. Leer la ruta de origen en el cuerpo del PR
3. Buscar issues abiertos correspondientes al marcador `translation-source:`
4. Agregar un comentario y cerrar

La razón para también ver la ruta de origen en el cuerpo del PR es que, dependiendo de la situación, mirar solo los archivos cambiados de los PRs creados por Copilot puede hacer que la búsqueda inversa de la fuente sea débil. **Usar tanto los archivos cambiados como el cuerpo del PR** da resultados estables.

## Notas suplementarias

### Orientar el texto de los PRs e issues de Copilot hacia el japonés

Si quieres estabilizar el idioma de salida de Copilot en el lado de GitHub, usar instrucciones a nivel de repo es el enfoque más directo.

Simplemente coloca un `.github/copilot-instructions.md`.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

Con solo este archivo, el idioma predeterminado y el contexto cuando el agente de codificación Copilot crea issues y PRs se estabiliza considerablemente.

## Resumen

La clave de esta configuración es convertir la traducción de "algo que la gente pide cada vez" en **un proceso rutinario dependiente de enviar la fuente japonesa**.

Aquí está el flujo una vez más.

1. Escribir solo el artículo en japonés
2. El push crea automáticamente un issue de traducción
3. Asignar automáticamente a Copilot
4. Construir el PR de traducción y fusionar automáticamente
5. Cerrar automáticamente el issue principal también

Una vez que tengas esto en su lugar, la sensación operativa es bastante directa. **Solo envía un artículo en japonés, y los artículos en otros idiomas se completarán en secuencia en el lado de GitHub**.

Por supuesto, en la práctica el flujo asíncrono de creación de issues, ejecución de Copilot, creación de PRs, construcción y fusión toma tiempo, por lo que no todo sucede "instantáneamente." Sin embargo, el personal de operaciones ya no necesita crear manualmente tareas de traducción cada vez ni olvidar cerrar PRs.

Este artículo en sí está estructurado para que pueda alimentarse a este flujo con la versión japonesa como base. Si estás operando continuamente un sitio multilingüe, comenzar con este nivel de automatización es probablemente lo más adecuado.
