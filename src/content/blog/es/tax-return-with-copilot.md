---
title: 'Dejé toda mi declaración de impuestos a GitHub Copilot ― Desde 837 asientos contables hasta la presentación'
description: 'Clasificación y verificación de 837 asientos acumulados con datos sincronizados de contabilidad en la nube, conciliación de seguros sociales, entrada de deducciones y presentación de la declaración. Un registro completo de la declaración de impuestos delegando casi todo el trabajo operativo a GitHub Copilot Agent Mode × Simple Browser.'
date: 2026-03-17
author: gui
tags: ['技術', 'GitHub Copilot', 'VS Code']
image: https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop&q=80
processFigure:
  title: Flujo completo de la declaración con Copilot
  steps:
    - title: Sincronización y acumulación de datos
      description: Se sincronizaron automáticamente bancos, tarjetas y Suica con MF Cloud, acumulando 837 asientos.
      icon: i-lucide-database
    - title: Clasificación y verificación de asientos
      description: Copilot cotejó el documento de criterios con el libro contable y detectó 8 inconsistencias que fueron corregidas.
      icon: i-lucide-search
    - title: Deducciones y entrada en formularios
      description: Se recopilaron importes de múltiples servicios y se introdujeron en los formularios de la declaración.
      icon: i-lucide-file-text
    - title: Verificación y presentación
      description: Se realizó una verificación cruzada de la primera y segunda página, y se presentó la declaración desde MF Cloud.
      icon: i-lucide-check-circle
compareTable:
  title: Comparación antes y después de Copilot
  before:
    label: Declaración de impuestos tradicional
    items:
      - Alternar entre múltiples servicios web en pestañas del navegador
      - Copiar manualmente importes a una hoja de cálculo
      - Verificar manualmente la categoría de cada asiento uno por uno
      - Buscar certificados de deducción entre sobres físicos
      - Detectar errores de entrada por cuenta propia
  after:
    label: Copilot × Simple Browser
    items:
      - Todos los servicios operados desde Simple Browser dentro de VS Code
      - Copilot lee las páginas y extrae/suma importes automáticamente
      - Detección mecánica de inconsistencias cotejando criterios con el libro contable
      - Copilot busca por palabras clave en Cloud Box y correos
      - Copilot ejecuta la verificación cruzada entre primera y segunda página
callout:
  type: tip
  title: Punto clave de este artículo
  text: El principal factor de éxito fue haber acumulado datos de asientos contables rutinariamente mediante la sincronización de datos de Money Forward. Copilot se encargó de "organizar, verificar e introducir los datos acumulados", mientras que el humano solo tuvo que concentrarse en las decisiones de criterio y la aprobación final para completar la declaración.
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Realmente se puede hacer la declaración de impuestos con GitHub Copilot?
      answer: Sí, combinando Agent Mode y Simple Browser, se puede completar dentro de VS Code desde la clasificación de asientos, entrada de deducciones hasta la elaboración de la declaración. Sin embargo, la presentación final requiere autenticación con tarjeta My Number, por lo que la realiza el humano.
    - question: ¿Cuáles son los prerrequisitos para usar Copilot?
      answer: El requisito principal es haber acumulado datos de asientos contables de forma rutinaria con servicios de contabilidad en la nube como Money Forward. Copilot se encarga de organizar y verificar los datos acumulados, por lo que sin datos no puede funcionar.
    - question: ¿Cómo se detectaron las inconsistencias en los asientos?
      answer: Se hizo que Copilot cotejara el documento de criterios (reglas de cuentas contables) con el libro contable, detectando mecánicamente los asientos que no cumplían las reglas. Se encontraron 8 inconsistencias entre 837 asientos y se corrigieron.
---

Delegué prácticamente todo el trabajo operativo de la declaración de impuestos al Agent Mode de GitHub Copilot. Como resultado, desde la clasificación de 837 asientos contables hasta la elaboración y verificación de la declaración se completó dentro de VS Code. Solo la presentación final la hice desde la app del smartphone con autenticación por tarjeta My Number.

En este artículo registro sin reservas "hasta dónde pude delegar en Copilot" y "qué hizo el humano".

## Premisa: la sincronización de datos de MF Cloud como base

Lo primero que quiero dejar claro es que la principal razón del éxito fue **haber configurado previamente la sincronización de datos de Money Forward Cloud en el día a día**.

En lugar de apresurarse a reunir extractos cuando llega el periodo de declaración, tenía configurados los siguientes servicios con sincronización automática durante todo el año, acumulando datos de asientos automáticamente:

- **Cuenta bancaria empresarial** — Ingresos por ventas, comisiones de transferencia
- **Cuenta bancaria personal** — Hipoteca, J-Coin Pay, clasificación de gastos personales
- **Banco online** — Registros de domiciliación de seguros sociales
- **Tarjeta de crédito empresarial** — Gastos de comunicación, publicidad, viajes, libros y suscripciones
- **[Mobile Suica](https://www.jreast.co.jp/suica/)** — Gastos de transporte en tren y autobús (método de anticipo para evitar doble contabilización)
- **Sitio EC** — Registros de compra de materiales consumibles
- **[My Number Portal](https://myna.go.jp/)** — Certificados de deducción de pensiones y seguros de vida

Gracias a esta sincronización, al cierre del ejercicio había **837 asientos** acumulados en la nube. El trabajo de Copilot consistió en clasificar correctamente estos datos en bruto y convertirlos en la declaración tributaria.

## Entorno utilizado

### Editor e IA

- **[VS Code](https://code.visualstudio.com/)** — Editor, navegador, terminal y chat. Todo se completa aquí
- **[GitHub Copilot](https://github.com/features/copilot) Agent Mode ([Claude Opus 4.6](https://www.anthropic.com/claude))** — El modelo principal. Combina de forma autónoma edición de archivos (lectura/escritura de Markdown), ejecución de comandos de terminal y operación web a través de Simple Browser
- **[Simple Browser](https://code.visualstudio.com/docs/editor/simple-browser) (navegador integrado de VS Code)** — Copilot lee el DOM a través de herramientas [MCP (Model Context Protocol)](https://modelcontextprotocol.io/), hace clic en botones y enlaces con `click_element`, introduce datos en formularios con `type_in_page` y obtiene el texto completo de la página con `read_page`. Son los "ojos y manos" de Copilot

### Servicios web

- **[Money Forward Cloud Declaración de Impuestos](https://biz.moneyforward.com/tax_return/)** — Gestión de libro contable, estados financieros y declaración
- **[Money Forward Cloud Box](https://biz.moneyforward.com/box/)** — Gestión documental de recibos y comprobantes
- **[Money Forward ME](https://moneyforward.com/)** — Gestión de patrimonio personal (verificación cruzada de entradas/salidas en múltiples cuentas)

### ¿Por qué GitHub Copilot y no Computer Use?

Si queremos delegar operaciones de pantalla a una IA, existen herramientas basadas en capturas de pantalla como Computer Use de Anthropic. Sin embargo, lo que se requería en esta declaración no era solo "operar la pantalla", sino **leer y escribir archivos mientras se toman decisiones, y compartir ese registro con el humano**.

Razones para elegir GitHub Copilot Agent Mode:

- **División de trabajo donde el humano inicia sesión y la IA trabaja** — El humano inicia sesión en bancos y software contable y deja las páginas abiertas. Desde ahí, las operaciones (búsqueda, entrada, verificación) las realiza Copilot a través de Simple Browser. Computer Use está diseñado para entregar todo el escritorio a la IA, por lo que no permite esta división de trabajo en la misma pantalla
- **Edición de archivos y operación del navegador en el mismo entorno** — Leer criterios.md para juzgar la corrección de asientos, escribir resultados en verificación-inconsistencias.md y corregir directamente el libro contable en Simple Browser. Todo este flujo no se interrumpe dentro de VS Code
- **Los archivos Markdown funcionan como espacio de trabajo compartido entre humano e IA** — Computer Use se basa en capturas de pantalla, por lo que no es apto para acumular y consultar conocimiento estructurado. Con Copilot, a través de archivos .md se puede intercambiar bidireccionalmente "con qué base se tomó qué decisión"
- **El registro de conversación se convierte en registro de trabajo** — Intercambios como "¿Incluimos esta deducción?", "No hay documento original, mejor no" quedan en el historial del chat. Poder rastrear el proceso de decisiones es especialmente importante en declaraciones de impuestos

En resumen, la operación de pantalla se puede hacer con otras herramientas, pero la ventaja de Copilot Agent Mode es que **humano e IA comparten la misma pantalla y los mismos archivos mientras dividen el trabajo**.

### El núcleo del flujo de trabajo: archivos Markdown

Lo más importante en el trabajo colaborativo con Copilot fue **estructurar el conocimiento y las tareas en archivos Markdown**. La estructura de archivos utilizada:

| Archivo | Función |
| --- | --- |
| `criterios.md` | Reglas de mapeo: patrón de descripción → cuenta contable (16 secciones). Base de juicio de Copilot al clasificar asientos |
| `tareas.md` | Hub de gestión de progreso general. Estado de obtención de 38 comprobantes gestionado con tabla ✅ |
| `tareas-declaración.md` | Problemas pendientes y notas de investigación de la fase de entrada. Hechos y razonamientos separados |
| `tareas-declaración_completadas.md` | Ítems completados/en espera movidos aquí para evitar que el archivo de trabajo crezca demasiado |
| `verificación-inconsistencias.md` | Informe de cotejo criterios vs libro contable. Referencias a secciones de criterios.md por número § |
| `informe-revisión-MF.md` | Revisión numérica de BS/PL. Gestión sistemática por ID de problema (A1, B1, etc.) y severidad |
| `tabla-correspondencia-asientos.md` | Registro de los 837 asientos del libro contable organizados por categoría en tablas |

Copilot **lee estos archivos .md para tomar decisiones y escribe en ellos para registrar**. El humano lee exactamente los mismos archivos para comprender la situación. Es decir, los archivos Markdown funcionan como espacio de trabajo compartido entre humano e IA.

El uso básico es abrir 5-6 pestañas de Simple Browser simultáneamente y avanzar consultando con Copilot.

## Fase 1: Crear el documento de criterios de asientos junto con Copilot

### Definición de los criterios de asientos

Lo primero fue documentar las reglas de clasificación de asientos en `criterios.md`. Consultando con Copilot —"¿A qué cuenta va esta transacción?", "¿Esto es uso empresarial o personal?"—, fuimos organizando las cuentas contables por patrón de transacción.

La estructura de este documento de criterios es clave. Cada sección tiene el formato `### Patrón de descripción → Cuenta contable`, con tablas Markdown que definen descripción, contenido y cuenta. Los casos dudosos se acompañan de justificación en bloques `> Nota:`. Como el campo de descripción de MF Cloud registra en katakana de ancho medio (ej.: `ﾃｽｳﾘｮｳ`), se transcriben tal cual en el documento de criterios para poder buscar y copiar.

Las reglas de clasificación definidas abarcan 15 secciones:

| Categoría | Cuenta | Ejemplos concretos |
| --- | --- | --- |
| Ingresos de clientes | Ventas | Transferencias mensuales |
| Débito de hipoteca | Retiro del propietario | Débito automático de cuenta personal |
| Carga de pago QR | Retiro/Aporte del propietario | Cargas y devoluciones desde cuenta personal |
| Transferencia entre cuentas | Depósito ordinario | Cuenta empresarial ↔ cuenta personal |
| ISP・SaaS | Gastos de comunicación | GitHub, Cloudflare, ChatGPT, Canva, etc. |
| Publicidad web・Gestión SNS | Gastos de publicidad | Google Ads, X Premium, SocialDog, etc. |
| Transporte | Gastos de viaje | Shinkansen, taxi, espacio de teletrabajo |
| Uso de Suica | Gastos de viaje | Método de anticipo para registros individuales de tren/autobús |
| Compras EC | Materiales consumibles | Periféricos de PC, herramientas |

## Fase 2: Clasificación de 837 asientos y verificación de inconsistencias

### Cotejo completo por Copilot

Con el documento de criterios listo, pasamos naturalmente a "Ahora cotejemos con el libro contable".

Procedimiento concreto: Copilot abre la pantalla del libro contable de MF Cloud en Simple Browser, obtiene el contenido con `read_page`, filtra por palabras clave de descripción y coteja con la tabla de criterios.md. Cuando encuentra discrepancias, añade filas a `verificación-inconsistencias.md` y edita directamente la sección correspondiente de criterios.md (por ej., `§13`). Como la regla "el libro contable es la referencia y se corrige criterios.md" está declarada al inicio del archivo de verificación, Copilot corrige el documento de criterios sin dudar.

Resultado: **8 inconsistencias** detectadas:

| Descripción | Cuenta según criterios | Asiento real | Acción |
| --- | --- | --- | --- |
| Premium de SNS | Retiro del propietario (uso personal) | Gastos de publicidad | Es SNS empresarial, publicidad es correcto |
| Herramienta de diseño | Retiro del propietario (uso personal) | Gastos de comunicación | Es herramienta empresarial, comunicación es correcto |
| Servicio de chat IA | Retiro del propietario (uso personal) | Gastos de comunicación | Es herramienta empresarial, comunicación es correcto |
| Alquiler de batería portátil | Gastos de comunicación | Retiro del propietario | Es uso personal, retiro es correcto |
| Cargos de apps (mezcla de apps) | Comunicación uniformemente | Desglosado por app | App de transporte → comunicación, bloqueador de anuncios → retiro, etc. |
| Publicidad en video (facturación por umbral) | Ubicado en sección personal | Gastos de publicidad | Error de ubicación en criterios corregido |
| Compra EC (periféricos PC) | Libros y suscripciones | Materiales consumibles | Cuenta errónea corregida |
| Herramienta de gestión SNS | Gastos de comunicación | Gastos de publicidad | Es para gestión de SNS, publicidad es correcto |

"Crear documento de criterios, cotejar con el libro contable y corregir los criterios cuando hay discrepancias" — que Copilot avance automáticamente editando archivos representa una eficiencia de otro nivel comparado con revisar visualmente 837 registros.

### Panorama completo del libro contable

Los asientos finalmente organizados tuvieron el siguiente desglose:

- **Sincronización bancaria** (cuenta empresarial, personal y banco online, 4 entidades) — Ingresos por ventas, hipoteca, transferencias entre cuentas
- **Sincronización de tarjeta de crédito** (Sumitomo Mitsui Card titular + separación Apple Pay) — Comunicación 116, publicidad 21, viaje 24, libros 27, uso personal 29, etc.
- **Sincronización Mobile Suica** — Tren 248, autobús 130, cargas 21, compras en tienda 4
- **Sincronización EC** — Materiales consumibles 5
- **AI-OCR・Facturas** — 16

## Fase 3: Organización de comprobantes en Cloud Box

### Subida y lectura automática

Procedimos con "Organicemos también los comprobantes", subiendo recibos y extractos de tarjeta al Box del servicio contable en la nube a través de Copilot. El AI-OCR lee automáticamente fecha, proveedor e importe, y Copilot completa manualmente lo que falta.

Los comprobantes individuales (recibos uno a uno) se completaron hasta fecha, proveedor e importe. Los documentos de tipo extracto (listas de uso de tarjeta, historial de uso de Suica, extractos bancarios, etc.) se subieron simplemente como material de referencia.

## Fase 4: Conciliación de seguros sociales ― Lo mejor del cruce de múltiples servicios

Este apartado empezó con la consulta "¿Cómo determinamos el importe de los seguros sociales?". Conversando con Copilot, decidimos **abrir 5 servicios web simultáneamente para cotejar**.

### Pensión nacional

Los datos sincronizados automáticamente desde My Number Portal pueden ser insuficientes. Por ejemplo, cuando la pensión del cónyuge se paga desde otra cuenta, no aparece en los datos sincronizados.

En estos casos, el flujo de trabajo con Copilot fue:

1. "Busquemos pagos de pensión en el extracto de tarjeta" → Abrimos en Simple Browser y buscamos "Agencia de Pensiones de Japón", extrayendo importes
2. "Quizá también pagamos desde otra cuenta" → Verificamos registros de débitos en otra cuenta con la app de finanzas, descubriendo débitos no sincronizados
3. "Revisemos los meses anterior y posterior" → Identificamos el patrón de pago (trimestral, mensual, etc.)
4. "Entonces cotejemos y saquemos el total" → Cotejamos importes de múltiples fuentes y determinamos el total anual

El punto clave es que nada se completa con un solo servicio. El patrón básico de esta fase es ir y venir entre múltiples pestañas conversando con Copilot — "¿Qué vemos ahora?", "¿Comprobamos también aquello?"

### Seguro de salud

Abrimos la pestaña de Simple Browser del banco online y buscamos los débitos de seguros en los registros de domiciliación. Según el sistema al que se pertenezca (Kyokai Kenpo, seguro nacional de salud, etc.), se varía la palabra clave de búsqueda para confirmar el número de pagos y los importes anuales.

### Pagos a municipios (trampa)

Aunque existan registros de pago al municipio en la app de finanzas, solo con el registro no siempre se puede distinguir si se trata de "seguro nacional de salud", "impuesto de residencia" o "impuesto sobre la propiedad".

El flujo de investigación con Copilot:

1. "Veamos los plazos del municipio" → Verificamos los plazos de cobro ordinario de cada tributo en la web municipal
2. "¿Coincide con el mes de pago?" → Cotejamos para acotar los tributos candidatos
3. "¿Pagábamos otro seguro en la misma época?" → Verificamos que no haya duplicidad de sistemas

Cuando no se puede determinar el tributo por falta del documento original, lo más prudente es **no incluirlo en la deducción (optar por el lado seguro)**. Esta decisión de "incluir o no" la toma el humano, mientras que Copilot se encarga de recopilar el material para decidir — esta división de roles es crucial.

### Descubrimiento de clasificaciones erróneas

La clasificación automática de la app de finanzas no es infalible. De hecho, un gasto estaba clasificado automáticamente como "pensión", pero cuando Copilot lo verificó cruzando con el extracto de tarjeta, resultó ser un servicio público completamente diferente. De haberlo aceptado sin más, habríamos sobreestimado los seguros sociales.

**Lo que siempre debe hacerse**: No confiar en la clasificación de la app de finanzas, y verificar junto con Copilot — "¿Este importe es realmente pensión? Comprobemos con el extracto de tarjeta". La verificación cruzada entre servicios es el verdadero valor de Copilot × Simple Browser.

## Fase 5: Entrada de deducciones diversas

Continuamos con "Ahora vamos con las demás deducciones", introduciendo las deducciones distintas de seguros sociales también junto con Copilot a través de Simple Browser.

### Deducciones ingresadas

| Tipo de deducción | Descripción | Trabajo de Copilot |
| --- | --- | --- |
| Deducción de seguro de vida | Datos sincronizados de My Number Portal + entrada manual | Operó los selectores del formulario e ingresó uno por uno |
| Deducción de seguro de terremoto | Seguros de mutualidad y de daños | Ingresó importes en el formulario |
| Deducción por cónyuge | Cálculo del ingreso total a partir de los ingresos del cónyuge | Calculó el importe de ingresos aplicando la deducción de ingresos salariales y verificó la deducción |
| Deducción de seguros sociales | Pensión + seguro de salud (importes determinados en Fase 4) | Seleccionó el tipo en la pantalla de seguros sociales de la declaración → ingresó importes |
| Deducción por dependientes (menores de 16) | No afecta la deducción pero sí el impuesto de residencia | Verificó el estado de registro en la pantalla Información básica → Familia |

### Elementos evaluados y descartados

Elementos que evaluamos con Copilot preguntándonos "¿Esto también es deducible?" y decidimos "esta vez no":

- **Deducción por hipoteca** — No se disponía del certificado de saldo de fin de año
- **Deducción por gastos médicos** — Verificamos datos sincronizados de My Number Portal, pero los importes no eran lo suficientemente significativos
- **Prorrateo de electricidad** — Aunque el servidor doméstico se usa para el negocio, no se logró preparar la justificación del prorrateo a tiempo
- **Donaciones a municipios (furusato nozei)・iDeCo** — No aplicables este año

## Fase 6: Prorrateo del ISP para uso mixto

La cuota mensual del ISP (conexión a internet) estaba registrada íntegramente como gastos de comunicación, pero al ser oficina en casa, no procede al 100% como uso empresarial.

Cuando pregunté a Copilot "¿Cómo prorrateamos esto?", me presentó opciones y decidimos:

1. Buscar todos los registros de ISP en el libro contable → calcular el total anual
2. Determinar la tasa de prorrateo (para oficina en casa, 50% es la referencia habitual)
3. No tocar los asientos individuales, sino añadir **un asiento de ajuste global a fecha 31/12** "Retiro del propietario / Gastos de comunicación"
4. Copilot registró el asiento en el libro contable

"¿Ajustamos cada registro individual al 50% o hacemos un ajuste global a fin de año?" — que Copilot presente estas opciones prácticas es otro beneficio del trabajo dialogado.

## Fase 7: Entrada y verificación de la declaración

### Operación de formularios en Simple Browser

Abrimos la pantalla de la declaración del software contable en la nube en Simple Browser y avanzamos con la entrada de formularios conversando con Copilot.

Las operaciones que Copilot realiza concretamente son:

1. Obtiene la estructura actual de la página con `read_page` y decide qué menú hacer clic
2. Hace clic en el menú lateral o enlaces como "Seguros sociales" con `click_element` para navegar
3. Abre desplegables con `click_element` y selecciona opciones con otro `click_element`
4. Introduce importes en los campos con `type_in_page`, transcribiendo directamente importes registrados en `tareas-declaración.md`
5. Envía el formulario con `click_element` en el botón "Guardar"

La conversación del lado humano se limita a "Vamos con la parte de seguros sociales", "Empecemos con la pensión nacional", "Hay uno más", "¿Cuadra el total? Revisemos la primera página". No hace falta especificar selectores ni pasos de operación; Copilot lee el DOM y decide autónomamente.

No solo es más cómodo que operar el navegador uno mismo, sino que **esta conversación queda registrada en el log del chat**, que es una gran ventaja. Se puede verificar después qué se ingresó y en qué orden.

### Verificación cruzada de primera y segunda página

"Ya terminamos la entrada, verifiquemos que la primera y la segunda página cuadran", y pedimos a Copilot que verificara la coherencia:

- **Primera página** — Importe de ingresos, total de deducciones, base imponible, impuestos
- **Segunda página** — Desglose de deducciones de seguros sociales, seguro de vida, cónyuge, información de dependientes

Hacemos que Copilot lea ambas pestañas y verifique si "la suma de los desgloses de la segunda página coincide con el importe de deducciones de la primera". Si hay discrepancias, las señala de inmediato, lo que es eficaz para la detección temprana de errores de entrada.

Como nota, en Money Forward no hay campo para dependientes menores de 16 años en la pantalla de impuesto de residencia/impuesto empresarial. La información de dependientes se gestiona en la pantalla "Información básica → Familia", así que hay que verificar el estado de registro allí.

## Fase 8: Presentación de la declaración

La presentación final se realiza desde la app de smartphone de Money Forward Cloud Declaración de Impuestos. Se autentica con lectura NFC de la tarjeta My Number y se envían los datos de la declaración directamente. No es necesario abrir e-Tax por separado; la presentación se completa directamente desde MF Cloud.

Puntos a verificar tras la presentación:

- ¿Se registró la fecha y hora de recepción?
- ¿Se emitió un número de recepción?
- ¿Aparece el mensaje "Los datos enviados han sido recibidos"?

Le pedimos a Copilot que leyera la pantalla de confirmación de envío para verificar estos puntos.

### Manejo de información confidencial

Las pantallas de bancos y software contable muestran naturalmente información personal. Es necesario ser consciente de que estos datos quedan incluidos en el historial del chat de Copilot. GitHub Copilot for Business tiene una política de no usar los datos para entrenar el autocompletado de código, pero debe evaluarse en relación con las políticas de seguridad de cada organización.

## ¿Qué hizo el humano?

Al mirar atrás, lo que hizo el humano fue sorprendentemente poco:

1. **Decisiones de criterio** — "Esto sí/no es gasto deducible", "El prorrateo será del 50%", "No hay documento original, no lo incluimos"
2. **Consultas con Copilot** — "¿Seguimos con esto?", "¿Verificamos también aquello?", "¿Qué hacemos?"
3. **Aprobación final** — "Ese número está bien", "Adelante con la presentación"
4. **Operación física** — Lectura NFC de la tarjeta My Number (solo al presentar desde el smartphone)

Prácticamente no fue necesario abrir pantallas específicas ni dar instrucciones detalladas de operación. Bastaba con indicar la dirección — "Vamos con esto" — para que Copilot gestionara autónomamente la navegación, búsqueda, entrada y verificación.

Lo que hizo esto posible fue la existencia de los archivos Markdown. Porque criterios.md contiene las reglas de clasificación, Copilot puede juzgar si un asiento es correcto; porque tareas-declaración.md contiene las notas de investigación, puede rastrear las fuentes de los importes. Que el humano solo diga "ahora esto" y Copilot pueda actuar se debe a que los criterios de decisión y los registros de trabajo están compartidos como archivos .md.

## Retrospectiva: qué haría diferente la próxima vez

Puntos de mejora basados en la experiencia de esta vez:

- **Subir también los certificados de deducción a Cloud Box** — Esta vez solo se guardaron en papel, pero como Copilot pudo identificar importes desde registros bancarios, no hubo problema. De todos modos, con datos digitales Copilot podría leerlos directamente, haciéndolo aún más fluido
- **Anotar el tipo de tributo en los pagos al municipio** — Sin el documento original no se puede distinguir entre seguro nacional, impuesto de residencia e impuesto de propiedad
- **Mantener actualizado el documento de criterios entregado a Copilot** — Si el documento de criterios es preciso, la precisión del trabajo de Copilot también mejora
- **Organizar mejor la estructura de los archivos .md** — Esta vez los archivos fueron creciendo durante el trabajo, pero si se definen de antemano los roles y formatos de cada archivo, mejora tanto la precisión de lectura de Copilot como la comprensión del humano

## Conclusión

Lo que quedó claro con esta declaración de impuestos es que la combinación de **"acumulación de datos" + "delegación del trabajo operativo a la IA"** es extremadamente potente.

La sincronización de datos de Money Forward acumula automáticamente transacciones de bancos, tarjetas y Suica durante todo el año. Cuando llega el periodo de declaración, se avanza conversando con GitHub Copilot Agent Mode — "¿Seguimos con esto?", "¿Verificamos también aquello?". El humano solo decide los criterios y da la aprobación final, pero el proceso no es delegación total sino un diálogo continuo.

Escribir código no es el único uso de Copilot. "Cruzar múltiples servicios web, recopilar datos, organizarlos, introducirlos y verificarlos" — todo ese trabajo de oficina se puede resolver juntos conversando por chat. Agent Mode × Simple Browser funciona perfectamente también fuera de la programación.
