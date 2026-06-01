---
title: 'Cómo gestionar un blog en 9 idiomas publicando solo un artículo en japonés'
description: 'Una guía del flujo de trabajo que genera automáticamente artículos traducidos en japonés + 8 idiomas, ejecuta compilaciones y gestiona la fusión automática, todo desencadenado con solo actualizar un artículo en japonés en Pages CMS mediante GitHub Actions y GitHub Copilot.'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: Conclusión primero
  text: 'Con el sitio actual de Acecore, puedes automatizar la gestión de un blog en japonés + 8 idiomas usando GitHub Actions y GitHub Copilot, tratando los artículos en japonés como la fuente canónica.'
processFigure:
  title: El flujo de 1 artículo en japonés a operación en 9 idiomas
  steps:
    - title: Actualizar la fuente en japonés
      description: Edita solo el artículo en japonés mediante Pages CMS o Markdown y súbelo a main.
      icon: i-lucide-pencil-line
    - title: Crear directamente una tarea de PR de traducción
      description: GitHub Actions crea una tarea de Copilot con la ruta de origen y los idiomas de destino incrustados.
      icon: i-lucide-git-branch
    - title: Copilot crea PRs de traducción
      description: Al recibir la tarea, Copilot genera los archivos de traducción y abre un PR de traducción.
      icon: i-lucide-git-pull-request
    - title: Compilar y fusionar automáticamente
      description: Tras una compilación exitosa, el PR de traducción que cumple todas las condiciones se fusiona automáticamente.
      icon: i-lucide-check-check
compareTable:
  title: Flujo de trabajo de traducción manual vs. automatizado
  before:
    label: Flujo de trabajo de traducción manual
    items:
      - Alguien crea manualmente las tareas de traducción después de publicar un artículo
      - Los responsables se asignan por idioma
      - Las compilaciones y las decisiones de fusión las gestionan personas
      - Las tareas duplicadas y la limpieza de PRs tienden a acumularse
  after:
    label: Flujo de trabajo de traducción automatizado
    items:
      - Un push al artículo en japonés desencadena todo el flujo
      - Se crea directamente una tarea de PR de traducción de Copilot
      - Los PRs de traducción se fusionan automáticamente tras una compilación exitosa
      - La creación duplicada se previene con un marcador en el cuerpo del PR
checklist:
  title: Lo que necesitas antes de empezar
  items:
    - text: Una estructura de contenido con el japonés como fuente de traducción
    - text: Una regla de disposición de archivos de traducción como src/content/blog/{locale}/{slug}.md
    - text: GitHub Actions con permiso de lectura en pull requests
    - text: Un COPILOT_AGENT_TOKEN que pueda llamar a la API del agente de codificación de Copilot
    - text: Un comando de compilación estable como npm run build
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Al subir un artículo en japonés se crearán automáticamente artículos en otros idiomas?
      answer: 'Sí. El sitio actual de Acecore admite 9 idiomas — `ja`, `en`, `zh-cn`, `es`, `pt`, `fr`, `ko`, `de`, `ru` — por lo que subir un artículo en japonés puede desencadenar la creación de tareas de PR de traducción de Copilot para los 8 idiomas restantes, la creación de PRs de traducción, la compilación y la fusión automática. Incluso sin archivos de traducción, cada URL de idioma se sirve con un respaldo en japonés, por lo que puedes publicar primero y reemplazar con traducciones reales después.'
    - question: ¿Por qué crear una tarea de PR directamente sin pasar por un issue?
      answer: 'Dado que el resultado del trabajo de traducción es un PR, fijar la ruta de origen, el idioma de destino y las condiciones de traducción directamente en el enunciado del problema de la tarea de Copilot y el marcador del cuerpo del PR hace que el flujo sea más corto. Buscando PRs abiertos con el marcador, también puedes prevenir la creación duplicada para la misma ruta de origen.'
    - question: ¿No es arriesgado el auto-merge?
      answer: 'El auto-merge incondicional es arriesgado. Al limitarlo solo a los PRs de traducción — requiriendo que Copilot haya creado el PR, que el título comience con [translation], que la compilación sea exitosa y que no sea un borrador — se puede mantener de forma bastante segura.'
---

Yendo directamente al grano: con este sitio, publicar solo un artículo en japonés en Pages CMS es suficiente para eventualmente tener ese artículo disponible en japonés más 8 otros idiomas. GitHub Actions y GitHub Copilot se encargan de la creación de tareas de PR de traducción, la creación de PRs de traducción, la compilación y la fusión automática.

El operador solo necesita gestionar los artículos en japonés y la información de los autores en el día a día. Como ya no es necesario presentar manualmente tareas de traducción o clasificar PRs cada vez, esto reduce significativamente la carga de gestionar un blog multilingüe.

## Requisitos previos para este enfoque

Este enfoque asume que la siguiente infraestructura ya está en su lugar en el lado de Astro.

- Enrutamiento en 9 idiomas (ja, en, zh-cn, es, pt, fr, ko, de, ru)
- Un respaldo que sirva contenido en japonés para páginas sin traducciones
- Una configuración operativa donde los artículos en japonés y la información de los autores se puedan actualizar mediante Pages CMS

Para saber cómo configurar esta infraestructura, consulta [Hacer que un sitio Astro 6 admita 9 idiomas — Traducción automática de 136 artículos de blog y arquitectura multilingüe](/blog/astro-i18n-blog-translation/). Este artículo se centra únicamente en cómo superponer el flujo de trabajo de traducción automática de Copilot sobre esa base.

## Qué permite esto

Desde la perspectiva del operador, solo hay 2 pantallas con las que interactúas regularmente. En este artículo, usamos las pantallas de Pages CMS tal como están, dejando inmediatamente claro **qué pantallas se tocan en las operaciones diarias**.

![Pantalla de lista de blog en japonés de Pages CMS](/uploads/pagescms-blog-ja-live-20260329.png)

La primera pantalla es la lista de blog en japonés de Pages CMS. Aquí puedes ver las fechas de publicación y la información de los autores mientras añades o actualizas solo los artículos en japonés. La clave es mantenerse en el modo de "solo tocar el japonés fuente", sin tener que entrar en las pantallas de edición de cada idioma cada vez.

![Pantalla de formulario de información de autor de Pages CMS](/uploads/pagescms-authors-live-20260329.png)

La segunda pantalla es el formulario de información de autor. Al actualizar solo los campos base en japonés en el CMS para los datos de autor, y dejar que el flujo automatizado de GitHub gestione el `i18n` para las traducciones, la separación de las responsabilidades operativas queda bastante limpia.

## Casos en los que este enfoque funciona mejor

Como requisito previo, esto es especialmente efectivo para equipos y sitios como los siguientes.

- Quieres que el japonés sea la fuente de traducción
- Tu blog se gestiona en Markdown
- Presentar manualmente tareas de traducción cada vez es una molestia
- Estás cómodo dejando que la IA gestione un buen grado de calidad de traducción
- Pero quieres detener los PRs que fallan en la compilación o que permanecen como borradores

Por el contrario, si tienes una configuración editorial completamente independiente por idioma, un flujo de trabajo diferente puede ser más adecuado.

## Paso 1. Fijar los artículos en japonés como fuente de traducción

Lo primero que hay que decidir es "qué archivo es la fuente de traducción". La ambigüedad aquí romperá tu automatización.

La "fuente de traducción" en este artículo se refiere al **archivo en japonés que se edita primero y sirve como base para los artículos y datos derivados en cada idioma**.

En esta configuración, la fuente y el destino se dividen de la siguiente manera.

- Fuente del artículo de blog: `src/content/blog/{slug}.md`
- Destino del artículo de blog: `src/content/blog/{locale}/{slug}.md`
- Fuente de información del autor: `src/content/authors/{authorId}.json`
- Destino de información del autor: el campo `i18n` en `src/content/authors/{authorId}.json`
- Fuente de definición de etiqueta: `src/content/tags/{tagId}.json`
- Destino de definición de etiqueta: el campo `i18n` en `src/content/tags/{tagId}.json`

Una estructura de directorio aproximadamente como la siguiente es fácil de manejar.

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

La clave es **mantener el slug del archivo de traducción alineado con el slug del artículo fuente en japonés**. Esto solo hace que sea fácil identificar automáticamente el objetivo de traducción a partir de la ruta de origen.

En este repo, incluso cuando los archivos de traducción aún no existen, la URL de cada idioma todavía se genera usando un respaldo en japonés. Esto significa que puedes operar en un modo de "publicar el artículo en japonés primero, y dejar que los PRs de traducción se pongan al día después".

## Paso 2. Convertir los push de artículos en japonés en tareas de PR de traducción

El siguiente paso es usar GitHub Actions para detectar cambios en los artículos en japonés y crear directamente tareas de PR de traducción de Copilot.

Los requisitos mínimos son:

- Monitorizar los push a `main`
- Solo crear tareas automáticamente para `src/content/blog/*.md`
- Solo crear tareas cuando cambia el cuerpo del artículo, no solo el frontmatter
- Si existe un PR abierto con la misma ruta de origen, no crear uno nuevo
- Incrustar la ruta de origen como marcador en la tarea de Copilot y el cuerpo del PR

La información de los autores y las definiciones de etiquetas son objetivos de traducción, pero no crear tareas automáticamente en los push normales. Ejecutarlos solo mediante `workflow_dispatch` cuando sea explícitamente necesario evita que se acumulen PRs innecesarios.

Por ejemplo, incluir comentarios como este en el cuerpo del PR lo hace reutilizable para la detección de duplicados posterior.

```md
<!-- translation-source:src/content/blog/my-post.md -->
<!-- translation-kind:blog-post -->
```

El filtrado básico en el lado del workflow tiene este aspecto.

```yaml
on:
  push:
    branches:
      - main
    paths:
      - src/content/blog/*.md
```

Además, comparando solo el cuerpo de Markdown para decidir cuándo crear tareas de PR de traducción, puedes evitar generar accidentalmente una avalancha de PRs a partir de pequeños ajustes como actualizar una fecha de publicación o una etiqueta.

Lo importante aquí es **fijar las condiciones de traducción en la entrada de la tarea de PR y el marcador del cuerpo del PR**. Incluso sin pasar por un issue, puedes transmitir la ruta de origen, el idioma de destino y las condiciones de traducción a Copilot, y usar la búsqueda de PRs abiertos para evitar duplicados para la misma ruta de origen.

## Paso 3. Crear tareas de PR mediante la API del agente de codificación de Copilot

En el lado de GitHub Actions, después de detectar un cambio, se lanza una tarea a la API del agente de codificación de Copilot.

Hay 2 cosas que hacer.

1. Añadir `COPILOT_AGENT_TOKEN` como secreto del repositorio
2. Llamar a la API de trabajos de Copilot para cada ruta de origen modificada

Conceptualmente, pasas un título y un enunciado del problema a la API de trabajos de Copilot.

```json
{
  "title": "[translation] Translate my-post.md",
  "problem_statement": "Translate src/content/blog/my-post.md into all requested locales...",
  "event_type": "translation-pr"
}
```

En este punto, mantén la auto-creación regular limitada solo a artículos, y ejecuta la información de autores y las definiciones de etiquetas solo mediante dispatch manual cuando sea necesario, para mantener las operaciones estables. Indicar explícitamente las reglas — campos `i18n` en `src/content/authors/{authorId}.json` para información de autores, `i18n.name` en `src/content/tags/{tagId}.json` para definiciones de etiquetas, y archivos de mismo nombre bajo `src/content/blog/{locale}/` para artículos — reduce los errores.

## Paso 4. Compilar los PRs de traducción y fusionarlos automáticamente

La automatización incondicional no es segura aquí. La recomendación es hacer que solo los PRs que cumplan todas las siguientes condiciones sean elegibles para la fusión.

- El PR fue creado por Copilot
- El título comienza con `[translation]`
- Apunta a `main`
- No es un borrador
- La compilación fue exitosa

En esta configuración, el proceso se divide en 2 etapas.

1. `Translation PR Build`
2. `Merge Translation PR`

El head del PR se compila cuando pasa a estar listo para revisión, y si tiene éxito, se fusiona inmediatamente mediante squash. Como no depende de la protección de ramas de GitHub, es fácil de gestionar incluso en repositorios pequeños.

### Condiciones a imponer para el auto-merge

Al añadir auto-merge, estas son las condiciones mínimas recomendadas.

- Excluir cualquier cosa que no sea un PR de traducción
- Detener en caso de fallo de compilación
- Detener mientras sea un borrador
- Excluir los PRs no creados por Copilot

Con estas 4 condiciones en su lugar, puedes evitar en gran medida el accidente de incluir PRs de desarrollo normal en la red de auto-merge.

## Paso 5. Prevenir duplicados con marcadores en el cuerpo del PR

Cuando no se pasa por issues, el control de duplicados se traslada al lado del PR.

El enfoque es simple: antes de crear una tarea, haz lo siguiente.

1. Derivar un marcador `translation-source:` de la ruta de origen
2. Buscar en GitHub PRs abiertos con ese mismo marcador
3. Si existe un PR abierto, no crear una tarea
4. Si no existe un PR abierto, crear una tarea de PR de traducción de Copilot

La razón para incrustar la ruta de origen en el cuerpo del PR es que mirar solo los archivos modificados de un PR de traducción hace difícil hacer una búsqueda inversa confiable del archivo japonés original. **Hacer explícita la ruta de origen como marcador** evita crear múltiples PRs de traducción para el mismo artículo.

## Notas

### Dirigir el idioma de salida de Copilot hacia el japonés

Si quieres estabilizar el idioma de salida de Copilot en el lado de GitHub, usar instrucciones a nivel de repositorio es el enfoque más directo.

Eso significa colocar `.github/copilot-instructions.md`.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

Con solo este archivo en su lugar, el idioma predeterminado y el contexto cuando el agente de codificación de Copilot crea PRs se vuelve considerablemente más estable.

## Resumen

El núcleo de esta configuración es convertir la traducción de "algo que los humanos solicitan cada vez" en **un proceso rutinario subordinado a los push de fuentes en japonés**.

Aquí está el flujo una vez más.

1. Escribir solo el artículo en japonés
2. Un push crea directamente una tarea de PR de traducción
3. Copilot crea un PR de traducción
4. Compilar el PR de traducción y fusionarlo automáticamente
5. Prevenir duplicados con marcadores en el cuerpo del PR

Una vez que esto está completamente ensamblado, la sensación desde el lado del operador es bastante natural. **Una vez que subes el artículo en japonés, los artículos en otros idiomas se van creando uno por uno en el lado de GitHub**.

Por supuesto, en la práctica pasa por pasos asíncronos — creación de tareas, creación de PRs, compilación y fusión — por lo que no todo sucede "instantáneamente". Pero el operador ya no necesita presentar manualmente tareas de traducción o clasificar PRs cada vez.

Este artículo en sí está estructurado de modo que la versión en japonés pueda alimentarse en este flujo como punto de partida. Si estás ejecutando un sitio multilingüe de forma continua, empezar con aproximadamente este nivel de automatización es probablemente lo más adecuado.
