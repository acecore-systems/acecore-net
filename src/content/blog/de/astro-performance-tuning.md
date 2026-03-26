---
title: 'Praktische Techniken für PageSpeed Mobile 99 auf Ihrer Astro-Website'
description: 'Optimierungstechniken, die verwendet wurden, um PageSpeed Insights Mobile 99 auf einer Astro + UnoCSS + Cloudflare Pages-Website zu erreichen. Behandelt CSS-Bereitstellungsstrategie, Fallstricke bei der Schriftkonfiguration, responsive Bilder, AdSense-Lazy-Loading und Cache-Einstellungen.'
date: 2026-03-15
lastUpdated: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Für wen dieser Artikel gedacht ist
  text: 'Für alle, die den PageSpeed-Score ihrer Astro-Website verbessern möchten. Behandelt praktische, sofort anwendbare Techniken zur Optimierung von CSS, Schriften, Bildern und Werbeskripten.'
processFigure:
  title: Optimierungs-Workflow
  steps:
    - title: CSS-Bereitstellungsstrategie
      description: Die Kompromisse zwischen Inline- und externem CSS verstehen.
      icon: i-lucide-file-code
    - title: Schriftoptimierung
      description: Schriften selbst hosten, um externe CDN-Latenz zu eliminieren.
      icon: i-lucide-type
    - title: Bildoptimierung
      description: Optimale Größen über Cloudflare Images + srcset + sizes bereitstellen.
      icon: i-lucide-image
    - title: Lazy Loading
      description: AdSense und GA4 bei der ersten Benutzerinteraktion einbinden.
      icon: i-lucide-timer
compareTable:
  title: Vor und nach der Optimierung
  before:
    label: Vor der Optimierung
    items:
      - Google Fonts CDN (Render-Blocking)
      - 190 KiB CSS inline im HTML
      - Bilder in festen Größen bereitgestellt
      - AdSense-Skript sofort geladen
      - Mobile Score im 70er-Bereich
  after:
    label: Nach der Optimierung
    items:
      - Selbst gehostet via @fontsource (mit korrekter Schriftnamen-Referenz)
      - CSS externalisiert mit Immutable-Cache
      - srcset + sizes für bildschirmbreitenoptimierte Bereitstellung
      - AdSense und GA4 per Lazy Loading beim ersten Scrollen
      - Mobile 99 / Desktop 100
faq:
  title: Häufig gestellte Fragen
  items:
    - question: Ist Inline-CSS oder externes CSS schneller?
      answer: 'Es hängt von der gesamten CSS-Größe ab. Unter 20 KiB ist Inlining vorteilhaft. Darüber beschleunigt das Externalisieren und die Nutzung des Browser-Caches nachfolgende Besuche erheblich.'
    - question: Warum ist Google Fonts CDN langsam?
      answer: 'PageSpeed Insights simuliert langsames 4G (~1,6 Mbit/s, RTT 150ms). Die Verbindung zu einer externen Domain erfordert DNS-Lookup + TCP-Verbindung + TLS-Handshake, und diese Latenz wird zum Render-Blocking. Self-Hosting eliminiert diese Latenz durch Bereitstellung von derselben Domain.'
    - question: Was tun, wenn Cloudflare Images langsam ist?
      answer: 'Cloudflare Images ist normalerweise schnell, aber bei der ersten Transformation oder bei Cache-Misses muss das Quellbild erneut geladen werden. Wenn sich der LCP in PageSpeed verschlechtert, setzen Sie für kritische Bilder <link rel="preload">, damit der Browser früher mit dem Abruf beginnt.'
    - question: Beeinflusst Lazy Loading von AdSense die Einnahmen?
      answer: 'Wenn es keine Anzeigen im ersten Sichtbereich gibt, ist der Anzeigetiming beim Laden beim ersten Scrollen nahezu identisch. Die SEO-Vorteile durch verbesserte Seitengeschwindigkeit haben eine positivere Auswirkung.'
---

## Einführung

Die offizielle Website von Acecore ist mit Astro 6 + UnoCSS + Cloudflare Pages gebaut. Dieser Artikel stellt die Optimierungstechniken vor, die verwendet wurden, um **Mobile 99 / Desktop 100** bei PageSpeed Insights zu erreichen.

Die erreichten Endergebisse:

| Metrik | Mobile | Desktop |
| --- | --- | --- |
| Performance | **99** | **100** |
| Barrierefreiheit | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

---

## Warum Astro?

Unternehmenswebsites erfordern „Geschwindigkeit" und „SEO". Astro ist auf statische Seitengenerierung (SSG) spezialisiert und erreicht standardmäßig null JavaScript. Im Gegensatz zu Frameworks wie React oder Vue wird kein Framework-Code an den Client gesendet, was zu einer extrem schnellen initialen Darstellung führt.

UnoCSS wurde als CSS-Framework gewählt. Wie Tailwind CSS verfolgt es einen Utility-First-Ansatz, extrahiert aber zur Build-Zeit nur verwendete Klassen, um die CSS-Größe zu minimieren. Seit v66 wird `presetWind3()` empfohlen – stellen Sie sicher, dass Sie migrieren.

---

## CSS-Bereitstellungsstrategie: Inline vs. Extern

Die CSS-Bereitstellungsstrategie hatte den größten Einfluss auf die PageSpeed-Scores.

### Wenn CSS klein ist (~20 KiB)

Die Einstellung `build.inlineStylesheets: 'always'` in Astro bettet alles CSS direkt ins HTML ein. Dies eliminiert HTTP-Anfragen für externe CSS-Dateien und verbessert den FCP (First Contentful Paint).

Dieser Ansatz ist optimal, wenn CSS etwa 20 KiB oder weniger umfasst.

### Wenn CSS groß ist (20 KiB+)

Die Verwendung japanischer Web-Schriften (`@fontsource-variable/noto-sans-jp`) ändert jedoch die Gleichung. Dieses Paket enthält **124 `@font-face`-Deklarationen** (~96,7 KiB), was das Gesamt-CSS auf etwa 190 KiB bringt.

Das Inlining von 190 KiB CSS in jede HTML-Seite bläht das HTML der Startseite auf **225 KiB** auf. Bei langsamem 4G dauert allein die Übertragung dieses HTMLs etwa 1 Sekunde.

### Lösung: Externalisieren + Immutable-Cache

Ändern Sie die Astro-Einstellung zu `build.inlineStylesheets: 'auto'`. Astro entscheidet automatisch basierend auf der CSS-Größe und stellt großes CSS als externe Dateien bereit.

```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    inlineStylesheets: 'auto',
  },
})
```

Externe CSS-Dateien werden ins `/_astro/`-Verzeichnis ausgegeben, daher wenden Sie Immutable-Cache über die Cloudflare Pages-Header-Einstellungen an.

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

Diese Änderung reduzierte die HTML-Größe um **84–91%** (z.B. index.html von 225 KiB → 35 KiB) und verbesserte PageSpeed von **96 → 99**.

---

## Schriftoptimierung: Richtiges Self-Hosting-Setup

### Google Fonts CDN vermeiden

Google Fonts CDN ist praktisch, aber fatal in den PageSpeed Insights Mobile-Tests. Bei Tests ließ die Verwendung von Google Fonts CDN den **FCP auf 6,1 Sekunden fallen und den Score auf 62**.

Bei langsamem 4G löst die Verbindung zu einer externen Domain eine Kette von DNS-Lookup → TCP-Verbindung → TLS-Handshake → CSS-Download → Schrift-Download aus, was das Rendering erheblich verzögert.

### Self-Hosting einführen

Installieren Sie einfach `@fontsource-variable/noto-sans-jp` und importieren Sie es in die Layout-Datei.

```bash
npm install @fontsource-variable/noto-sans-jp
```

```javascript
// BaseLayout.astro
import '@fontsource-variable/noto-sans-jp'
```

### Vorsicht: Schriftnamen-Diskrepanz

Hier gibt es eine überraschende Falle. Der von `@fontsource-variable/noto-sans-jp` in `@font-face` registrierte Schriftname ist **`Noto Sans JP Variable`**. Viele Leute schreiben jedoch `Noto Sans JP` in ihrem CSS.

Diese Diskrepanz bedeutet, dass **die Schrift nicht korrekt angewendet wird und der Browser die Fallback-Schrift verwendet**. Obwohl 96,7 KiB an Schriftdaten geladen werden, wird nichts davon verwendet.

Geben Sie die korrekte Schriftfamilie in den UnoCSS-Einstellungen an:

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP Variable', 'Hiragino Kaku Gothic ProN', 'メイリオ', sans-serif",
  },
}
```

Wenn TypeScript-Typfehler auftreten, fügen Sie eine Moduldeklaration in `src/env.d.ts` hinzu:

```typescript
declare module '@fontsource-variable/noto-sans-jp';
```

---

## Bildoptimierung: Cloudflare Images + srcset + sizes

### Cloudflare Images Transformations

Externe Bilder werden über die `/cdn-cgi/image/`-Transformations-URLs von Cloudflare Images bereitgestellt. Durch Hinzufügen von Transformationsparametern erhalten Sie:

- **Formatkonvertierung**: `output=auto` wählt automatisch AVIF/WebP basierend auf der Browser-Unterstützung
- **Qualitätsanpassung**: `q=50` behält ausreichende Qualität bei und reduziert die Dateigröße um ~10%
- **Größenänderung**: `w=`-Parameter ändert die Größe auf die angegebene Breite

### srcset- und sizes-Konfiguration

Setzen Sie `srcset` und `sizes` auf alle Bilder, um optimale Größen basierend auf der Bildschirmbreite bereitzustellen.

```html
<img
  src="/cdn-cgi/image/width=800,fit=cover,format=auto,quality=50,metadata=none/https://images.unsplash.com/..."
  srcset="
    /cdn-cgi/image/width=480,fit=scale-down,format=auto,quality=50,metadata=none/https://images.unsplash.com/... 480w,
    /cdn-cgi/image/width=640,fit=scale-down,format=auto,quality=50,metadata=none/https://images.unsplash.com/... 640w,
    /cdn-cgi/image/width=960,fit=scale-down,format=auto,quality=50,metadata=none/https://images.unsplash.com/... 960w,
    /cdn-cgi/image/width=1280,fit=scale-down,format=auto,quality=50,metadata=none/https://images.unsplash.com/... 1280w,
    /cdn-cgi/image/width=1600,fit=scale-down,format=auto,quality=50,metadata=none/https://images.unsplash.com/... 1600w
  "
  sizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  loading="lazy"
  decoding="async"
/>
```

### sizes-Präzision

Wenn das `sizes`-Attribut auf `100vw` (volle Bildschirmbreite) belassen wird, wählt der Browser größere Bilder als nötig. Geben Sie gemäß dem tatsächlichen Layout an, z.B. `calc(100vw - 2rem)` oder `(max-width: 768px) 100vw, 50vw`.

### LCP-Verbesserung: preload

Setzen Sie `<link rel="preload">` für Bilder, die den LCP (Largest Contentful Paint) beeinflussen. Fügen Sie eine `preloadImage`-Prop zur Astro-Layout-Komponente hinzu, um Bilder anzugeben, die mit höchster Priorität geladen werden sollen, wie Hero-Bilder.

```html
<link rel="preload" as="image" href="..." />
```

### CLS-Prävention (Layout-Verschiebung)

Geben Sie `width`- und `height`-Attribute für alle Bilder an. Dies ermöglicht dem Browser, den Anzeigebereich im Voraus zu reservieren und Layout-Verschiebungen (CLS) beim Abschluss des Ladens zu verhindern.

Häufig übersehene Bilder sind Avatare (32×32, 48×48, 64×64px) und YouTube-Thumbnails (480×360px).

---

## Lazy Loading für Werbung und Analyse

### AdSense

Das Google AdSense-Skript ist etwa 100 KiB groß und beeinflusst die initiale Darstellung erheblich. Injizieren Sie das Skript dynamisch, wenn der Nutzer zum ersten Mal scrollt.

```javascript
window.addEventListener('scroll', () => {
  const script = document.createElement('script')
  script.src = 'https://pagead2.googlesyndication.com/...'
  script.async = true
  document.head.appendChild(script)
}, { once: true })
```

`{ once: true }` stellt sicher, dass der Event-Listener nur einmal auslöst. Dies bringt den JavaScript-Transfer im ersten Sichtbereich auf nahezu null.

### GA4

Google Analytics 4 wird ähnlich per Lazy Loading mit `requestIdleCallback` eingebunden. Das Skript wird injiziert, wenn der Browser im Leerlauf ist, und vermeidet Störungen der Benutzerinteraktionen.

---

## Cache-Strategie

Setzen Sie optimale Cache-Richtlinien pro Asset-Typ in der `_headers`-Datei von Cloudflare Pages.

```
# Build-Ausgabe (gehashte Dateinamen)
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

# Suchindex
/pagefind/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

# HTML
/*
  Cache-Control: public, max-age=0, must-revalidate
```

- `/_astro/*` enthält Content-Hashes in den Dateinamen, was einen 1-Jahres-Immutable-Cache sicher macht
- `/pagefind/*` erhält einen 1-Wochen-Cache + 1-Tag stale-while-revalidate
- HTML ruft immer die neueste Version ab

---

## Checkliste zur Performance-Optimierung

1. **Ist die CSS-Bereitstellungsstrategie angemessen?**: Unter 20 KiB inlinen, darüber externalisieren
2. **Sind Schriften selbst gehostet?**: Externes CDN ist bei langsamem 4G fatal
3. **Ist der Schriftname korrekt?**: Prüfen Sie den registrierten Namen von `@fontsource-variable` (`*Variable`)
4. **Haben alle Bilder srcset + sizes?**: Besonders kleinere Größen für Mobile vorbereiten
5. **Hat das LCP-Element ein preload?**: Hero-Bilder und Bilder im ersten Sichtbereich
6. **Haben Bilder width/height?**: CLS-Prävention
7. **Werden AdSense/GA4 per Lazy Loading geladen?**: Null JS-Transfer im ersten Sichtbereich
8. **Sind Cache-Header konfiguriert?**: Immutable-Cache für schnellere nachfolgende Besuche

---

## Zusammenfassung

Das Prinzip der Performance-Optimierung lässt sich in einem Satz zusammenfassen: **„Sende nichts Unnötiges."** CSS-Inlining sieht auf den ersten Blick schnell aus, aber bei 190 KiB wird es kontraproduktiv. Schrift-Self-Hosting ist essenziell, aber die Schriftnamen-Diskrepanz ist eine versteckte Falle.

Aufbauend auf Astros Zero-JS-Architektur und der Minimierung des Transfers für CSS, Schriften, Bilder und Werbeskripte ist ein Mobile-Score von 99 problemlos erreichbar.

---

## Teil einer Serie

Dieser Artikel ist Teil der Serie „[Leitfaden zur Qualitätsverbesserung von Astro-Websites](/blog/website-improvement-batches/)". Separate Artikel behandeln Verbesserungen in den Bereichen SEO, Barrierefreiheit und UX.
