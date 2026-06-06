---
title: 'Guía de mejora de calidad del sitio Astro, continuación - Ajustes finales para lograr 100 en todos los apartados de PageSpeed Insights'
description: 'Seguimiento del artículo anterior con el ajuste final: desactivar Cloudflare Web Analytics, diferir la carga de GA4 y de la interfaz de búsqueda, alcanzar 100 en las cuatro métricas de PageSpeed Insights tanto en móvil como en escritorio, ordenar breadcrumbs e indexación en Search Console, migrar a iconos SVG compartidos y explicar qué optimizaciones adicionales se probaron pero no se adoptaron.'
date: 2026-03-29T02:30
author: gui
tags:
  ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: /uploads/acecore-generated/performance-seo-dashboard.webp
callout:
  type: tip
  title: Continuación del artículo anterior
  text: 'Como continuación del artículo anterior, "Guía de mejora de calidad del sitio Astro", este post documenta el ajuste final que llevó al sitio a 100 en las cuatro métricas de PageSpeed Insights. Además, explica la carga diferida de GA4 y de la búsqueda, la limpieza en Search Console, cómo se interpretaron los diagnósticos restantes y qué optimizaciones adicionales se probaron pero no se adoptaron.'
insightGrid:
  eyebrow: Por qué importa
  title: Por qué lograr 100 en todos los apartados de PageSpeed sigue siendo un nivel alto
  description: 100 no significa que todo en el sitio real sea perfecto, pero sí indica que no hay carencias importantes en las auditorías principales que evalúa Lighthouse.
  variant: card
  items:
    - title: Bajo condiciones slow 4G
      description: La medición móvil se realiza con slow 4G y CPU ralentizada. Incluso un sitio estático ligero no llega fácilmente a 100.
      icon: i-lucide-gauge
      tone: brand
    - title: Pleno en las 4 categorías
      description: No basta con optimizar solo Performance. Accessibility, Best Practices y SEO también deben quedar perfectamente alineados.
      icon: i-lucide-shield-check
      tone: emerald
    - title: Hubo que ordenar los terceros
      description: Hace falta reducir beacons externos y dependencias innecesarias sin perder elementos realmente necesarios como GA4 o los anuncios.
      icon: i-lucide-sparkles
      tone: amber
    - title: Los diagnósticos deben leerse bien
      description: No se trata de llevar todos los insights a cero, sino de decidir si los diagnósticos restantes son aceptables.
      icon: i-lucide-search
      tone: slate
processFigure:
  title: Pasos del ajuste final
  steps:
    - title: Medir
      description: Revisar tanto PageSpeed Insights como Search Console para separar problemas reales de simple información diagnóstica.
      icon: i-lucide-gauge
    - title: Reorganizar
      description: Replantear el papel de Cloudflare Web Analytics y decidir qué debe quedarse entre GA4, anuncios y búsqueda.
      icon: i-lucide-shield-check
    - title: Diferir
      description: Sacar GA4 y la búsqueda basada en Pagefind de la carga inicial y moverlos al momento en que realmente se necesiten.
      icon: i-lucide-timer-reset
    - title: Corregir
      description: Limpiar breadcrumbs, canonical, reglas noindex, salida del sitemap y renderizado de iconos.
      icon: i-lucide-wrench
    - title: Decidir
      description: Comparar más división de CSS y más recortes de terceros, y descartar las opciones cuyo beneficio no compensa.
      icon: i-lucide-scale-3d
compareTable:
  title: Lo que cambió con el ajuste final
  before:
    label: Antes
    items:
      - La puntuación móvil ya era alta, pero el beacon de Cloudflare Web Analytics seguía presente
      - GA4 y la interfaz de búsqueda seguían demasiado cerca de la carga inicial, así que la línea entre funciones necesarias y momento de carga era difusa
      - El significado de los diagnósticos restantes de PageSpeed era ambiguo y costaba decidir cuándo dejar de optimizar
      - Algunos artículos podían mostrar círculos vacíos por restos de icon class de UnoCSS
      - Search Console seguía mostrando breadcrumbs inválidos y ruido de indexación en páginas de listado
  after:
    label: Después
    items:
      - Las cuatro métricas marcaron 100 tanto en móvil como en escritorio
      - Cloudflare Web Analytics se desactivó, mientras que GA4 se mantuvo y pasó a carga diferida
      - La búsqueda y Pagefind se movieron a carga bajo demanda, reduciendo el peso inicial
      - La renderización se unificó en el SVG compartido Icon y los nombres legacy se absorbieron mediante alias
      - Breadcrumb, noindex, sitemap y canonical quedaron alineados para Search Console
      - Se descartaron optimizaciones adicionales de poco retorno y quedó claro dónde conviene detenerse
checklist:
  title: Qué quedó resuelto
  items:
    - text: Se desactivó Cloudflare Web Analytics y se detuvo la inyección del beacon
      checked: true
    - text: Se mantuvo GA4, pero se movió a carga diferida con requestIdleCallback y disparadores por interacción
      checked: true
    - text: La interfaz de búsqueda y los recursos de Pagefind salieron de la ruta de carga inicial
      checked: true
    - text: Se confirmaron 100 puntos en las cuatro métricas de PageSpeed Insights tanto en móvil como en escritorio
      checked: true
    - text: Se interpretó el árbol de dependencias de red y se ordenó que BaseLayout.css es el único cuello de botella principal restante
      checked: true
    - text: Se corrigieron los errores de breadcrumbs en Search Console y se alinearon breadcrumb, canonical y trailing slash
      checked: true
    - text: Se aclaró la estrategia de indexación para etiquetas, archivos, autores y paginación con noindex y exclusión del sitemap
      checked: true
    - text: Se migraron las icon class dinámicas de ProcessFigure y StatBar al componente compartido Icon
      checked: true
    - text: Se añadió compatibilidad mediante alias para el nombre legacy check-circle
      checked: true
    - text: Se compararon más divisiones de CSS y más recortes de terceros, pero se descartaron porque añadían más complejidad que beneficio
      checked: true
linkCards:
  - href: /blog/website-improvement-batches/
    title: 'Artículo anterior: panorama general de las mejoras'
    description: Empieza por el artículo hub anterior para captar la visión global de las más de 150 mejoras.
    icon: i-lucide-book-open
  - href: /blog/astro-performance-tuning/
    title: Artículo de optimización de rendimiento
    description: Explica en detalle la estrategia de entrega CSS, fuentes, imágenes y optimización de scripts de terceros.
    icon: i-lucide-gauge
  - href: /blog/astro-accessibility-guide/
    title: Artículo de accesibilidad
    description: Organiza las medidas concretas para alcanzar conformidad WCAG AA y Accessibility 100.
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: Artículo de UX y calidad de código
    description: Resume mejoras de calidad relacionadas con View Transitions, búsqueda y seguridad de tipos.
    icon: i-lucide-sparkles
faq:
  title: Preguntas frecuentes
  items:
    - question: Si un sitio obtiene 100 en PageSpeed Insights, ¿puede decirse que es el sitio más rápido posible?
      answer: 'No en sentido absoluto. PageSpeed Insights es una medición de laboratorio basada en Lighthouse y no representa por completo las redes reales de los usuarios, sus dispositivos ni la congestión del servidor. Aun así, 100 puntos significan que el sitio está en un estado de altísima calidad, con muy pocas carencias en las auditorías principales de Lighthouse.'
    - question: ¿Por qué pueden seguir apareciendo el árbol de dependencias de red o el CSS render-blocking si la puntuación es 100?
      answer: 'Esos elementos no siempre son auditorías fallidas. También pueden mostrarse como información de diagnóstico. En este caso, solo BaseLayout.css permanece en la ruta crítica, pero el 100 móvil sigue estable, así que el coste-beneficio actual es aceptable.'
    - question: ¿Por qué se desactivó Cloudflare Web Analytics?
      answer: 'GA4 ya cubría suficientemente la medición de eventos como CTA, búsqueda y contacto, mientras que el lado de Cloudflare había quedado limitado sobre todo a observación de rendimiento. Esta vez también se tuvo en cuenta el efecto del beacon en PageSpeed, por lo que la medición se reorganizó alrededor de GA4.'
    - question: ¿Qué se arregló exactamente para Search Console?
      answer: 'La salida de BreadcrumbList se ajustó para que las páginas de listado emitan elementos de breadcrumb explícitos con item válidos. Al mismo tiempo, se alinearon los trailing slash, canonical, reglas noindex y sitemap para que páginas como etiquetas, archivos, autores y paginación tengan un papel de indexación más claro.'
    - question: ¿Hubo optimizaciones que se probaron pero no se adoptaron?
      answer: 'Sí. Se compararon ideas como dividir aún más BaseLayout.css, intentar hacer desaparecer por completo la visualización del network dependency tree, o incluso recortar todavía más los terceros hasta afectar a GA4. Con el móvil ya estable en 100, esas opciones aportaban menos valor práctico que la complejidad o la pérdida de medición que introducían, así que se descartaron.'
---

## Introducción

En la anterior [Guía de mejora de calidad del sitio Astro](/blog/website-improvement-batches/), resumí el amplio conjunto de mejoras aplicadas al sitio renovado de Acecore. Este artículo es su continuación.

Este artículo cierra los pequeños temas que quedaron pendientes tras publicar el artículo anterior y lleva el sitio a un estado en el que **las cuatro métricas de PageSpeed Insights marcan 100 tanto en móvil como en escritorio**. Además, no fue solo un ajuste de puntuación: también se sacaron GA4 y la búsqueda de la carga inicial, se reorganizaron breadcrumbs e indexación en Search Console, se estabilizó la renderización de iconos y se dejó claro dónde ya no tenía sentido seguir optimizando.

## Resultado de 100 en todos los apartados de PageSpeed Insights

A fecha del 29 de marzo de 2026, la página principal de Acecore mostraba los siguientes resultados.

| Entorno    | Performance | Accessibility | Best Practices | SEO     |
| ---------- | ----------- | ------------- | -------------- | ------- |
| Móvil      | **100**     | **100**       | **100**        | **100** |
| Escritorio | **100**     | **100**       | **100**        | **100** |

Debajo quedan las capturas reales de PageSpeed Insights junto con las URLs de los informes. En la ronda anterior consideraba que “móvil 99 / el resto 100” era el techo realista. Esta vez, al retirar beacons de terceros innecesarios y revisar con cuidado el significado de los diagnósticos restantes, se pudo llegar a 100.

### URLs de los informes

Para dejar juntas las capturas y una evidencia que pueda reabrirse después, también dejo aquí las URLs directas de los informes usados en esta medición.

- [Informe móvil](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile)
- [Informe de escritorio](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop)

<figure class="not-prose my-8">
  <figcaption class="text-base font-700 text-slate-800 mb-3">Capturas medidas</figcaption>
  <p class="text-sm text-slate-500 mb-4">Haz clic en cada imagen para abrir el informe correspondiente de PageSpeed Insights.</p>
  <div class="grid gap-4 md:grid-cols-2">
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-mobile-summary-20260329.webp" alt="Resultado móvil de PageSpeed Insights de la página principal de Acecore a fecha del 29 de marzo de 2026. Performance, Accessibility, Best Practices y SEO están todos en 100." class="w-full rounded-lg border border-slate-200" width="1160" height="340" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">Móvil</span>
    </a>
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-desktop-summary-20260329.webp" alt="Resultado de escritorio de PageSpeed Insights de la página principal de Acecore a fecha del 29 de marzo de 2026. Performance, Accessibility, Best Practices y SEO están todos en 100." class="w-full rounded-lg border border-slate-200" width="1190" height="270" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">Escritorio</span>
    </a>
  </div>
</figure>

## Qué tan impresionante es un 100

Al oír “100”, se puede pensar que Performance siempre sube si uno sigue quitando funciones, simplificando el diseño y recortando elementos externos. En parte es verdad: en un sitio estático, cuanto más se quita, más fácil resulta ganar velocidad.

Pero aquí no se trataba de construir una página de demostración vacía. Había que mantener GA4, anuncios, búsqueda, ClientRouter y CSS compartido, y aun así alinear las cuatro métricas a 100 en móvil y escritorio. El trabajo no consistió solo en aligerar la página, sino en decidir qué debía quedarse, qué podía salir y qué ya no merecía tocarse más.

Por supuesto, 100 no significa que sea absolutamente el sitio más rápido del mundo real. La experiencia de los usuarios depende de la red, los dispositivos, la región y el estado de caché. Aun así, sí puede decirse que el sitio ha alcanzado un nivel muy alto en el sentido de que **las auditorías principales de Lighthouse no muestran carencias importantes mientras los elementos operativos necesarios siguen presentes**.

## Ajustes finales para llegar a 100

### 1. Desactivar Cloudflare Web Analytics y aclarar el papel de la medición

Cloudflare Web Analytics es útil como producto RUM ligero y privacy-first, pero en Acecore la parte de GA4 ya estaba ampliamente instrumentada para clics en CTA, búsquedas, acciones de contacto, generación de leads y otros eventos.

Al revisar de nuevo el papel de cada herramienta, concluí que, del lado de Cloudflare, el coste de seguir inyectando un beacon innecesario en PageSpeed ya era mayor que el valor que aportaba. Desactivé RUM desde el panel y confirmé que `static.cloudflareinsights.com/beacon.min.js` había desaparecido del HTML de producción.

Pero esto no significaba abandonar la medición por completo. Seguía siendo importante conservar la medición de CTA, enlaces externos, búsqueda y conversiones de contacto, así que el siguiente paso fue mantener GA4 cambiando el momento en que se carga.

### 2. Mantener GA4, pero sacarlo de la carga inicial

La distinción importante aquí no era solo entre “dejar GA4” o “quitarlo”, sino entre “dejarlo” y “cargarlo desde el primer momento”.

En la práctica, el punto de entrada de `gtag` siguió disponible desde el inicio para poder recibir eventos, pero el script real `gtag/js` se movió a `requestIdleCallback` y a la interacción del usuario. Además, según la página se mantiene un fallback distinto para evitar que analytics quede sin cargar si no hay interacción.

Con ese cambio, la medición de CTA, enlaces externos, búsqueda y contacto siguió intacta, pero sin meter ejecución de scripts de terceros en la fase más temprana del render. El resultado de 100, por tanto, no vino solo de quitar el beacon de Cloudflare, sino también de cargar GA4 de una forma más inteligente.

### 3. Mover la búsqueda y Pagefind a carga bajo demanda

La búsqueda es otra función que puede pesar en silencio sobre la carga inicial aunque el usuario no la abra enseguida. Acecore usa Pagefind para la búsqueda de texto completo, y en esta ronda se aplicó la misma lógica: mantener la funcionalidad, pero no pagar su coste por adelantado.

El modal de búsqueda ahora carga `pagefind-ui.js` y su CSS solo cuando la búsqueda se abre de verdad. La promesa se almacena para evitar dobles cargas, y los atajos de teclado o la apertura mediante query string siguen funcionando normalmente.

Esto no solo favorece la puntuación de Lighthouse. También hace más ligera la primera visualización cotidiana. La búsqueda sigue presente, pero ya no necesita ir montada en la carga crítica de cada página.

### 4. Interpretar los diagnósticos restantes de PageSpeed

Incluso después de llegar a 100, PageSpeed puede seguir mostrando diagnósticos como `Network dependency tree` o `render-blocking resources`. Si se malinterpretan como avisos que siempre deben eliminarse, es fácil acabar persiguiendo optimizaciones de bajo valor.

La cadena crítica en este caso era aproximadamente la siguiente:

1. `/en/`
2. `ClientRouter.js`
3. `BaseLayout.css`
4. `BaseLayout.js`

De esos elementos, el único que seguía siendo verdaderamente render-blocking era `BaseLayout.css`. Sin embargo, su tamaño ya es lo bastante pequeño y el 100 móvil se mantiene, así que por ahora lo clasifiqué como “diagnóstico restante aceptable”. Poder expresar ese juicio con palabras fue en sí mismo una ganancia importante, porque deja una regla clara para decidir cuándo detener futuras optimizaciones.

### 5. Ordenar breadcrumbs e indexación en Search Console

Cuando PageSpeed ya estaba estable en 100, volví a revisar el sitio desde el lado de búsqueda. Ahí seguía quedando una incoherencia real: Search Console mostraba breadcrumbs inválidos, aunque el marcado FAQ ya estaba en buen estado.

Para corregirlo, la salida de `BreadcrumbList` en páginas de listado se rehízo para permitir pasar elementos explícitos en lugar de deducirlos demasiado libremente desde la URL. Al mismo tiempo, se alineó el manejo de trailing slash para que canonical, hreflang y breadcrumbs dejaran de divergir.

También se aclaró el papel de indexación de etiquetas, archivos, autores y paginación. Son páginas útiles como navegación, pero es fácil que se comporten como objetivos de indexación delgados o duplicados. Por eso se alinearon con `noindex, follow` y exclusión del sitemap. Esto no borra de inmediato todos los informes de “rastreada, actualmente sin indexar”, pero sí significa que la intención de indexación ahora está expresada directamente en el código.

### 6. Unificar la renderización de iconos en un componente SVG compartido

Como parte del ajuste final, el proyecto ya estaba migrando desde las utilidades de iconos de UnoCSS hacia un componente `Icon` basado en SVG compartido. En esa transición, quedaron restos de icon class dinámicas en `ProcessFigure` y `StatBar`, lo que provocaba que en algunos artículos aparecieran solo círculos vacíos.

Unifiqué la renderización del lado del componente mediante `Icon` y además añadí un alias para absorber el nombre legacy `check-circle` dentro de `circle-check`.

Como resultado, se obtuvieron tres beneficios prácticos:

- Resulta mucho más difícil que un icono desaparezca por haberse dejado una class dinámica
- Los atributos de accesibilidad como `aria-hidden` pueden unificarse en el lado SVG
- La operación se vuelve más estable porque la renderización deja de depender del análisis estático de UnoCSS

Al mismo tiempo, el análisis y la visualización de fechas del blog también se normalizaron alrededor del horario JST. No es el punto central de este artículo, pero sí mejora la estabilidad del orden de publicaciones del mismo día y la precisión temporal del marcado estructurado.

### 7. Lo que se probó pero no se adoptó

Cuando aparece un 100, la tentación natural es seguir persiguiendo cada diagnóstico restante hasta que ya no quede nada en pantalla. Comparé varias opciones en esa dirección, pero no adopté las siguientes.

- Dividir todavía más `BaseLayout.css`: podría hacer que los diagnósticos se vieran algo más limpios, pero el 100 móvil ya se mantiene y el beneficio práctico no justificaba la complejidad extra.
- Tomar como objetivo que desapareciera la mera visualización del `network dependency tree`: que un diagnóstico siga visible no significa automáticamente que exista un problema real para los usuarios.
- Reducir aún más los terceros hasta afectar incluso a GA4: quizá dejaría la página algo más ligera, pero a cambio se perdería medición clave del negocio.

Esa comparación fue importante. El ajuste final quedó cerrado no porque se hubiera quitado todo lo imaginable, sino porque los trade-offs restantes ya podían explicarse con claridad.

## Aprendizajes prácticos del ajuste final

La mayor ganancia de esta vez no fue simplemente obtener 100 puntos. Fue haber llegado a un punto en el que **puedo explicar qué debe eliminarse y qué es razonable dejar**.

Por ejemplo, Cloudflare Web Analytics merece retirarse si solo sigue presente por inercia, mientras que GA4 debe mantenerse porque es el núcleo de la medición de eventos de negocio. Pero si GA4 se queda, eso no significa que tenga que ir en la carga inicial. La mejor solución es conservar la medición y cambiar el momento en que se carga.

La misma lógica aplica a la búsqueda y al SEO. La búsqueda debe quedarse, pero no hace falta montarla en el payload inicial. Las páginas de listado siguen siendo útiles para navegar, pero no tienen por qué tratarse como objetivos principales de indexación. Y `network dependency tree` no es un fallo por sí mismo; hay que mirar dentro y juzgar si la cadena restante es razonable.

También utilicé IA para ampliar el abanico de cambios candidatos, pero los criterios finales siguieron siendo tres preguntas muy concretas: si las mediciones mejoraban de verdad, si el coste operativo seguía siendo razonable y si las capacidades de medición necesarias permanecían intactas. La IA ayudó a abrir opciones; la decisión final siguió dependiendo de la medición y del juicio.

Si se optimiza pensando solo en la puntuación, el ajuste acaba yéndose demasiado lejos. Esta vez pude ordenar no solo las correcciones, sino también la línea a partir de la cual conviene detenerse, así que es razonable decir que las mejoras del sitio de Acecore han alcanzado, por ahora, un estado completo.

## Resumen

Como continuación del artículo anterior, el ajuste final dejó resuelto lo siguiente:

- Confirmar 100 puntos en las cuatro métricas de PageSpeed Insights tanto en móvil como en escritorio
- Desactivar Cloudflare Web Analytics, manteniendo GA4 pero pasándolo a carga diferida
- Mover la búsqueda y Pagefind a carga bajo demanda y reducir el peso inicial
- Interpretar los diagnósticos de red restantes y aclarar qué problemas residuales son aceptables
- Limpiar la salida de breadcrumbs en Search Console y las reglas de indexación para páginas de listado
- Eliminar la falta de renderización de iconos al unificar en el SVG compartido `Icon`
- Descartar optimizaciones adicionales de poco retorno y dejar claro el punto razonable de parada

Al menos desde la perspectiva de Lighthouse y PageSpeed Insights, el sitio de Acecore ya se ha afinado hasta un punto en el que puede aspirar legítimamente a estar entre los más rápidos. Al mismo tiempo, la puntuación no es el objetivo, sino solo el resultado. A partir de aquí, seguiré manteniendo tanto la operación como las mejoras para que este estado no se deteriore.
