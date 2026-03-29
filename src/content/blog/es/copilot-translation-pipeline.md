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
    - title: Crear issues de traducción automáticamente
      description: GitHub Actions crea issues con la ruta de origen y los idiomas de destino incrustados.
      icon: i-lucide-ticket
    - title: Copilot crea PRs de traducción
      description: Al recibir el issue, Copilot genera los archivos de traducción y abre un PR de traducción.
      icon: i-lucide-git-pull-request
    - title: Compilar, fusionar y cerrar el issue
      description: Tras una compilación exitosa, el PR se fusiona automáticamente y el issue de traducción padre se cierra automáticamente.
      icon: i-lucide-check-check
compareTable:
  title: Flujo de trabajo de traducción manual vs. automatizado
  before:
    label: Flujo de trabajo de traducción manual
    items:
      - Alguien crea manualmente las tareas de traducción después de publicar un artículo
      - Los responsables se asignan por idioma
      - Las compilaciones y las decisiones de fusión las gestionan personas
      - Los issues padre a menudo se olvidan y quedan abiertos
  after:
    label: Flujo de trabajo de traducción automatizado
    items:
      - Un push al artículo en japonés desencadena todo el flujo
      - Se asigna automáticamente a Copilot
      - Los PRs de traducción se fusionan automáticamente tras una compilación exitosa
      - Los issues padre se cierran automáticamente después de la fusión
checklist:
  title: Lo que necesitas antes de empezar
  items:
    - text: Una estructura de contenido con el japonés como fuente de traducción
    - text: Una regla de disposición de archivos de traducción como src/content/blog/{locale}/{slug}.md
    - text: GitHub Actions con permisos de escritura en issues
    - text: Un COPILOT_AGENT_TOKEN que pueda llamar a la API de asignación de Copilot
    - text: Un comando de compilación estable como npm run build
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Al subir un artículo en japonés se crearán automáticamente artículos en otros idiomas?
      answer: 'Sí. El sitio actual de Acecore admite 9 idiomas — `ja`, `en`, `zh-cn`, `es`, `pt`, `fr`, `ko`, `de`, `ru` — por lo que subir un artículo en japonés puede desencadenar la creación de issues de traducción para los 8 idiomas restantes, la asignación a Copilot, la creación de PRs de traducción, la compilación, la fusión automática y el cierre de issues. Incluso sin archivos de traducción, cada URL de idioma se sirve con un respaldo en japonés, por lo que puedes publicar primero y reemplazar con traducciones reales después.'
    - question: ¿Por qué crear primero un issue en lugar de abrir directamente un PR?
      answer: 'Porque permite fijar la ruta de origen, el idioma de destino y las condiciones de traducción en el issue. Esto facilita mucho la re-ejecución, la revisión del historial y la recuperación ante fallos.'
    - question: ¿No es arriesgado el auto-merge?
      answer: 'El auto-merge incondicional es arriesgado. Al limitarlo solo a los PRs de traducción — requiriendo que Copilot haya creado el PR, que el título comience con [translation], que la compilación sea exitosa y que no sea un borrador — se puede mantener de forma bastante segura.'
---

Yendo directamente al grano: con este sitio, publicar solo un artículo en japonés en Pages CMS es suficiente para eventualmente tener ese artículo disponible en japonés más 8 otros idiomas. GitHub Actions y GitHub Copilot se encargan de la creación de issues de traducción, la creación de PRs de traducción, la compilación, la fusión automática y el cierre del issue padre.

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

## Paso 2. Convertir los push de artículos en japonés en issues de traducción

El siguiente paso es usar GitHub Actions para detectar cambios en los artículos en japonés y crear automáticamente issues de traducción.

Los requisitos mínimos son:

- Monitorizar los push a `main`
- Solo crear issues automáticamente para `src/content/blog/*.md`
- Solo crear issues cuando cambia el cuerpo del artículo, no solo el frontmatter
- Si existe un issue abierto con la misma ruta de origen, actualizarlo en lugar de crear uno nuevo
- Incrustar la ruta de origen como marcador en el cuerpo del issue

La información de los autores y las definiciones de etiquetas son objetivos de traducción, pero no crear issues automáticamente en los push normales. Ejecutarlos solo mediante `workflow_dispatch` cuando sea explícitamente necesario evita que se acumulen issues innecesarios.

Por ejemplo, incluir comentarios como este en el cuerpo del issue lo hace reutilizable en la automatización posterior.

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

Además, comparando solo el cuerpo de Markdown para decidir cuándo crear issues de traducción, puedes evitar generar accidentalmente una avalancha de issues a partir de pequeños ajustes como actualizar una fecha de publicación o una etiqueta.

Lo importante aquí no es "crear traducciones directamente", sino **crear primero un issue**. Al insertar un issue, la ruta de origen, el idioma de destino y las condiciones de traducción quedan fijadas de una forma visible tanto para humanos como para la IA.

## Paso 3. Asignar automáticamente los issues de traducción a Copilot

Solo crear el issue todavía deja trabajo manual, por lo que aquí es donde se asigna automáticamente Copilot.

Hay 2 cosas que hacer.

1. Añadir `COPILOT_AGENT_TOKEN` como secreto del repositorio
2. Llamar a la API de asignación después de crear el issue

Conceptualmente, parcheas el issue para establecer Copilot como asignado.

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

## Paso 5. Cerrar automáticamente el issue de traducción padre después de la fusión

La última pieza que mantiene las operaciones limpias es cerrar automáticamente el issue padre después de una fusión.

El enfoque es simple: para los PRs de traducción fusionados, haz lo siguiente.

1. Obtener los archivos modificados del PR
2. También leer la ruta de origen del cuerpo del PR
3. Buscar issues abiertos correspondientes al marcador `translation-source:`
4. Añadir un comentario y cerrar

La razón para también mirar la ruta de origen del cuerpo del PR es que depender únicamente de los archivos modificados de los PRs creados por Copilot a veces puede hacer que la búsqueda inversa de la fuente sea poco confiable. **Usar tanto los archivos modificados como el cuerpo del PR** mantiene la estabilidad.

## Notas

### Dirigir el idioma de los PRs e issues de Copilot hacia el japonés

Si quieres estabilizar el idioma de salida de Copilot en el lado de GitHub, usar instrucciones a nivel de repositorio es el enfoque más directo.

Eso significa colocar `.github/copilot-instructions.md`.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

Con solo este archivo en su lugar, el idioma predeterminado y el contexto cuando el agente de codificación de Copilot crea issues y PRs se vuelve considerablemente más estable.

## Resumen

El núcleo de esta configuración es convertir la traducción de "algo que los humanos solicitan cada vez" en **un proceso rutinario subordinado a los push de fuentes en japonés**.

Aquí está el flujo una vez más.

1. Escribir solo el artículo en japonés
2. Un push crea automáticamente issues de traducción
3. Asignar automáticamente a Copilot
4. Compilar el PR de traducción y fusionarlo automáticamente
5. Cerrar automáticamente el issue padre

Una vez que esto está completamente ensamblado, la sensación desde el lado del operador es bastante natural. **Una vez que subes el artículo en japonés, los artículos en otros idiomas se van creando uno por uno en el lado de GitHub**.

Por supuesto, en la práctica pasa por pasos asíncronos — creación de issues, ejecución de Copilot, creación de PRs, compilación y fusión — por lo que no todo sucede "instantáneamente". Pero el operador ya no necesita presentar manualmente tareas de traducción o olvidarse de cerrar PRs cada vez.

Este artículo en sí está estructurado de modo que la versión en japonés pueda alimentarse en este flujo como punto de partida. Si estás ejecutando un sitio multilingüe de forma continua, empezar con aproximadamente este nivel de automatización es probablemente lo más adecuado.
