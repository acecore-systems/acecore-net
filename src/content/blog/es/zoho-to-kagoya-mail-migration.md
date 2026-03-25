---
title: 'Guía de migración de Zoho Mail a KAGOYA MAIL ― DNS, autenticación y auditoría de datos en la práctica'
description: 'Explicación basada en la práctica del proceso de migración de Zoho Workplace a KAGOYA MAIL, incluyendo procedimientos, configuración DNS, autenticación SPF/DKIM y auditoría de datos completa de Zoho Workplace.'
date: 2026-03-16
author: gui
tags: ['技術', 'メール', 'DNS', 'インフラ']
image: https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=800&h=400&fit=crop&q=80
processFigure:
  title: Flujo completo de la migración
  steps:
    - title: Preparación de KAGOYA
      description: Agregar dominio y crear cuentas de correo.
      icon: i-lucide-server
    - title: Migración de datos de correo
      description: Exportar desde Zoho → importar por IMAP a KAGOYA.
      icon: i-lucide-hard-drive-download
    - title: Cambio de DNS
      description: Cambiar MX, SPF y DKIM hacia KAGOYA.
      icon: i-lucide-globe
    - title: Pruebas de autenticación
      description: Confirmar PASS de SPF y DKIM, y realizar pruebas de envío/recepción.
      icon: i-lucide-shield-check
    - title: Auditoría de datos de Zoho
      description: Evaluar y depurar los datos residuales de todos los servicios de Workplace.
      icon: i-lucide-clipboard-check
    - title: Cancelación de Zoho
      description: Cancelar la suscripción.
      icon: i-lucide-log-out
callout:
  type: warning
  title: Precaución al cambiar DNS
  text: Tras cambiar los registros MX, puede haber un periodo de varias horas hasta un máximo de 48 horas en el que los correos se entregan al servidor antiguo. Si se gestiona con Cloudflare, reducir el TTL a 2 minutos antes del cambio minimiza el impacto.
compareTable:
  title: Comparación de la configuración antes y después
  before:
    label: Zoho Workplace Standard
    items:
      - Zoho Mail (plan 30 GB)
      - WorkDrive / Cliq / Calendar incluidos (sin uso tras migración a Nextcloud)
      - ¥1,440/mes (3 usuarios, tarificación por usuario)
      - SPF con include:zoho.jp
      - DKIM con zmail._domainkey
  after:
    label: KAGOYA MAIL Bronce
    items:
      - KAGOYA MAIL (servidor virtual dedicado, IP dedicada)
      - Servidor exclusivo de correo, usuarios ilimitados
      - ¥3,300/mes (pago anual ¥2,640)
      - SPF con include:kagoya.net
      - DKIM con kagoya._domainkey
checklist:
  title: Lista de verificación de la migración
  items:
    - text: Agregar dominio y crear cuentas en KAGOYA
      checked: true
    - text: Exportar datos de correo de Zoho en ZIP
      checked: true
    - text: Importar por IMAP a KAGOYA
      checked: true
    - text: Cambiar registros MX en DNS de Cloudflare
      checked: true
    - text: Cambiar registro SPF a kagoya.net
      checked: true
    - text: Cambiar registro DKIM a kagoya._domainkey
      checked: true
    - text: Configurar política DMARC
      checked: true
    - text: Pruebas de envío/recepción y confirmación de PASS SPF/DKIM
      checked: true
    - text: Auditoría de datos de todos los servicios de Zoho Workplace
      checked: true
    - text: Cancelación de suscripción de Zoho
      checked: true
faq:
  title: Preguntas frecuentes
  items:
    - question: ¿Hay un periodo en que no se reciben correos durante la migración?
      answer: Si el TTL del DNS está configurado corto, el periodo es de unos minutos a unas pocas horas. Si se gestiona con Cloudflare, configurar el TTL a 2 minutos antes del cambio minimiza el impacto. También conviene verificar el servidor antiguo durante varios días.
    - question: ¿Cómo se exportan los datos de correo de Zoho?
      answer: Desde el panel de administración de Zoho Mail → Gestión de datos → Exportar buzón, se puede exportar por cuenta en formato ZIP. Los archivos incluyen correos en formato EML.
    - question: ¿Qué pasa si no se configuran tanto SPF como DKIM?
      answer: Aumenta la probabilidad de que el servidor de correo receptor clasifique el mensaje como spam. Especialmente Gmail es estricto, y cada vez son más los casos en que se requiere PASS en ambos, SPF y DKIM.
    - question: ¿Qué sucede con los datos al cancelar Zoho Workplace?
      answer: Cuando expira el plan de pago, se pasa automáticamente al plan gratuito. El plan gratuito también tiene límites de almacenamiento, por lo que es recomendable exportar los datos necesarios con anterioridad. Si se elimina la cuenta, se pierden todos los datos.
---

Si quiere migrar de Zoho Workplace a otro servicio de correo pero le preocupa la configuración de DNS y la autenticación de correo, esta guía práctica es para usted. En este artículo explicamos los pasos usando como ejemplo la migración de Zoho Mail a KAGOYA MAIL, cubriendo el cambio de DNS, autenticación SPF/DKIM y la auditoría de datos del servicio anterior.

## ¿Se identifica con alguna de estas situaciones?

Zoho Workplace es una suite que incluye Mail, WorkDrive, Cliq, Calendar y muchos otros servicios. Sin embargo, ¿no le ocurre algo así?

- Solo usa la función de correo pero paga por toda la suite
- El almacenamiento ya fue migrado a otro servicio (Nextcloud, Google Drive, etc.)
- La tarificación por usuario que aumenta con cada usuario adicional resulta una carga

En estos casos, migrar a un servicio exclusivo de correo es una opción válida.

## ¿Por qué KAGOYA MAIL?

KAGOYA MAIL es un servicio de correo exclusivo para empresas. Los puntos a considerar al evaluarlo como destino de migración son:

- **Servidor virtual dedicado exclusivo de correo con IP dedicada** — Al no compartir con servidores web como WordPress, la tasa de entrega y estabilidad del correo son altas
- **Tarifa plana con usuarios ilimitados** — A diferencia de la tarificación por usuario de Zoho, se pueden añadir cuentas sin restricciones
- **Servidores nacionales** con amplia trayectoria en uso corporativo, soporte estándar de SPF/DKIM/DMARC
- Compatible con IMAP/SMTP, permite seguir usando los clientes de correo existentes

El plan Bronce cuesta ¥3,300/mes (¥2,640 con pago anual). Comparado con Zoho Workplace Standard (¥1,440/mes por 3 usuarios), el costo simple aumenta, pero considerando el entorno exclusivo de correo, IP dedicada y usuarios ilimitados, vale la pena como inversión en la fiabilidad del correo.

## PASO 1: Preparación del destino de migración

En el panel de control de KAGOYA, se agrega el dominio propio y se crean las cuentas de correo.

1. **Configuración de dominio → Agregar dominio propio** para registrar el dominio
2. La configuración de entrega predeterminada se establece en "tratar como error" (para direcciones inexistentes)
3. Crear las cuentas de correo necesarias

## PASO 2: Exportación de datos de correo de Zoho

Desde el panel de administración de Zoho Mail, se exportan los datos de correo por cuenta.

1. Ir a **Panel de administración → Gestión de datos → Exportar buzón**
2. Seleccionar la cuenta objetivo e iniciar la exportación
3. Una vez generado el archivo ZIP, descargarlo

El ZIP contiene archivos de correo en formato EML. Según el número de cuentas y volumen de correo, puede tardar varias decenas de minutos, así que conviene ejecutarlo con tiempo.

## PASO 3: Importación IMAP

Los archivos EML exportados se importan al servidor IMAP de destino. Hacerlo manualmente es tedioso, por lo que se recomienda automatizar con un script Python.

```python
import imaplib
import email
import glob

# Conexión IMAP a KAGOYA
imap = imaplib.IMAP4_SSL("nombre-del-servidor", 993)
imap.login("nombre-de-cuenta", "contraseña")
imap.select("INBOX")

# Subida masiva de archivos EML
for eml_path in glob.glob("export/**/*.eml", recursive=True):
    with open(eml_path, "rb") as f:
        msg = f.read()
    imap.append("INBOX", None, None, msg)

imap.logout()
```

## PASO 4: Cambio de DNS

Para redirigir la entrega de correos, se modifican los registros DNS. Aquí usamos Cloudflare como ejemplo, pero el contenido de la configuración es el mismo para cualquier servicio DNS.

### Registros MX

Se eliminan los registros MX de Zoho (`mx.zoho.jp` / `mx2.zoho.jp` / `mx3.zoho.jp`) y se registra el servidor de correo de destino. Para KAGOYA MAIL:

| Tipo | Nombre | Valor | Prioridad |
| ---- | ------ | ----- | --------- |
| MX | (su dominio) | dmail.kagoya.net | 10 |

### Registro SPF

```
v=spf1 include:kagoya.net ~all
```

Se cambia el antiguo `include:zoho.jp` por `include:kagoya.net`.

### Registro DKIM

Se obtiene la clave pública desde **Configuración DKIM** en el panel de control de KAGOYA y se registra como registro TXT.

| Tipo | Nombre | Valor |
| ---- | ------ | ----- |
| TXT | kagoya.\_domainkey.(su dominio) | v=DKIM1;k=rsa;p=(clave pública) |

Se elimina el antiguo `zmail._domainkey` (de Zoho).

### Registro DMARC

```
v=DMARC1; p=quarantine; rua=mailto:(dirección de reportes)
```

Elevar la política de `none` a `quarantine` refuerza la protección contra suplantación de identidad.

## PASO 5: Pruebas de envío y recepción

Tras el cambio de DNS, es imprescindible verificar los siguientes 4 puntos:

1. **¿Se reciben correos del exterior?** — Enviar una prueba desde Gmail u otro servicio
2. **¿Se envían correos al exterior?** — Enviar desde KAGOYA a Gmail u otro servicio
3. **SPF PASS** — Verificar `spf=pass` en las cabeceras del correo recibido
4. **DKIM PASS** — Verificar `dkim=pass` en las cabeceras del correo recibido

La verificación de cabeceras se puede automatizar con Python. Especialmente la confirmación de PASS de SPF/DKIM es fácil de pasar por alto visualmente, por lo que es más fiable extraerla con un script.

```python
import imaplib
import email

imap = imaplib.IMAP4_SSL("nombre-del-servidor", 993)
imap.login("nombre-de-cuenta", "contraseña")
imap.select("INBOX")
_, data = imap.search(None, "ALL")

for num in data[0].split()[-3:]:  # últimos 3 correos
    _, msg_data = imap.fetch(num, "(RFC822)")
    msg = email.message_from_bytes(msg_data[0][1])
    auth = msg.get("Authentication-Results", "")
    print(f"Subject: {msg['Subject']}")
    print(f"Auth: {auth[:200]}")
    print()

imap.logout()
```

## PASO 6: Auditoría de datos del servicio anterior

Zoho Workplace incluye muchos servicios además de correo, como WorkDrive, Cliq, Calendar y Contacts. Antes de cancelar, verifique que no queden datos residuales en cada servicio.

### Servicios a verificar y criterios de evaluación

| Servicio | Qué verificar |
| --- | --- |
| Zoho Mail | ¿Ya se importó al destino? |
| Zoho WorkDrive | ¿El almacenamiento usado es 0? Verificar incluyendo la papelera |
| Zoho Contacts | Número de contactos. Si es necesario, exportar en CSV/VCF |
| Zoho Calendar | Existencia de citas o recordatorios |
| Zoho Cliq | Necesidad del historial de chat |
| Otros (Notebook, Writer, Sheet, etc.) | Existencia de documentos creados |

### La trampa de WorkDrive: la papelera consume almacenamiento

Un punto fácil de pasar por alto es la papelera de WorkDrive. Por ejemplo, en nuestro caso, el panel de administración mostraba un uso de almacenamiento de unos 45 GB, pero al abrir las carpetas aparecía "No hay elementos".

La causa era que **todos los datos estaban en la papelera de las carpetas de equipo**. Los datos eliminados cuando se migró a Nextcloud permanecían en la papelera.

El indicador de almacenamiento del panel incluye los datos de la papelera. "Hay capacidad usada = hay que respaldar" no siempre es cierto, así que verifique el contenido de la papelera antes de decidir.

## PASO 7: Cancelación de la suscripción de Zoho

Una vez completada la auditoría de datos y confirmado que el envío y recepción en el destino funcionan correctamente, se procede a la cancelación.

1. Abrir **Panel de administración de Zoho Mail → Gestión de suscripción → Resumen**
2. Ir a Zoho Store desde el enlace **Gestión de suscripción**
3. Hacer clic en **Cambiar plan**
4. Hacer clic en **Cancelar suscripción** en la parte inferior de la página
5. Seleccionar el motivo y confirmar **Cambiar al plan gratuito**

Si está marcada la opción "Se hará el downgrade automáticamente al final del periodo de facturación actual", las funciones del plan de pago seguirán disponibles hasta el final del periodo y luego se pasará automáticamente al plan gratuito. Como precaución ante una posible reversión, se recomienda no eliminar inmediatamente sino mantener un periodo de observación con el plan gratuito.

## Conclusión

1. **Reducir previamente el TTL del DNS** minimiza el impacto durante el cambio
2. **Tanto SPF como DKIM son obligatorios**. Con solo uno, hay riesgo de que Gmail y otros lo clasifiquen como spam
3. **En la auditoría de datos del servicio anterior, atención a lo "visible pero innecesario"**. La papelera y el historial de versiones pueden consumir almacenamiento
4. **Guardar facturas y recibos antes de cancelar**. Una vez eliminada la cuenta, no se pueden recuperar
5. **No decidir por "más barato" sino por "qué debe separarse"**. El correo es la línea vital del negocio, y vale la pena invertir en un entorno dedicado

La migración de servicio de correo abarca DNS y autenticación, lo que implica una barrera psicológica alta. Sin embargo, lo que hay que hacer es configurar correctamente 4 tipos de registros: MX, SPF, DKIM y DMARC. Use esta guía como referencia y avance verificando paso a paso.
