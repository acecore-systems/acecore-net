---
title: 'Praktische Techniken zur Verbesserung von PageSpeed auf einer Astro-Website'
description: 'Praktische Optimierungstechniken für eine Website mit Astro, UnoCSS und Cloudflare Pages. Behandelt CSS-Bereitstellung, Schriftkonfiguration, responsive Bilder, AdSense-Ladesteuerung, verzögertes GA4-Laden und Cache-Einstellungen.'
date: 2026-03-15T00:00
lastUpdated: '2026-07-29T00:28:23+09:00'
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: /uploads/acecore-generated/blog-astro-performance-tuning.webp
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
      description: Prüfen, welche Schriften geladen und für die Darstellung verwendet werden.
      icon: i-lucide-type
    - title: Bildoptimierung
      description: Externe Bilder mit Cloudflare Images + srcset + sizes optimieren.
      icon: i-lucide-image
    - title: Ladesteuerung
      description: Ersten AdSense-Versuch und Wiederholungen sowie verzögertes GA4-Laden prüfen.
      icon: i-lucide-timer
compareTable:
  title: Vor und nach der Optimierung
  before:
    label: Vor der Optimierung
    items:
      - Schriftverbindungen und Rendering-Ergebnis nicht geprüft
      - CSS-Output und Cache-Verhalten nicht geprüft
      - Bilder in festen Größen bereitgestellt
      - AdSense-Skript sofort geladen
      - Feste Scores ohne dokumentierte Testbedingungen verfolgen
  after:
    label: Nach der Optimierung
    items:
      - Schriftanfragen und tatsächlich gerenderte Schriften geprüft
      - Größeres CSS externalisiert; gehashte Assets immutable gecacht
      - srcset + sizes für bildschirmbreitenoptimierte Bereitstellung
      - AdSense prüft die Darstellbarkeit beim ersten Versuch und wiederholt über Observer; GA4 lädt nach Interaktion oder Timer
      - PageSpeed Insights unter gleichen Bedingungen erneut prüfen
faq:
  title: Häufig gestellte Fragen
  items:
    - question: Ist Inline-CSS oder externes CSS schneller?
      answer: "Das hängt von CSS-Größe, Seitenstruktur und Cache-Zustand ab. Nutzen Sie die aktuelle Einstellung build.inlineStylesheets: 'auto', prüfen Sie HTML- und CSS-Ausgabe und messen Sie unter gleichen Bedingungen."
    - question: Warum ist Google Fonts CDN langsam?
      answer: 'Eine externe Domain kann DNS-Lookup, TCP-Verbindung und TLS-Handshake hinzufügen. Die Auswirkung hängt von Netzwerk und Cache ab; prüfen Sie daher reale Anfragen und gerenderte Schriften.'
    - question: Was tun, wenn Cloudflare Images langsam ist?
      answer: 'Die Leistung von Cloudflare Images hängt von Quelle, Transformation und Cache-Zustand ab. Erste Transformationen und Cache-Misses laden das Quellbild; messen Sie daher den LCP-Kandidaten unter gleichen Bedingungen und erwägen Sie responsive preload nur bei Bedarf.'
    - question: Beeinflusst die AdSense-Ladesteuerung die Einnahmen?
      answer: 'Die Auswirkung hängt von Anzeigenposition und Besucherverhalten ab. Sichtbarkeit, Anzeigenanfragen und Einnahmen sollten vor und nach der Änderung verglichen und getrennt von den Leistungswerten bewertet werden.'
---

## Einführung

Die offizielle Website von Acecore ist mit Astro 7.1.3 + UnoCSS + Cloudflare Pages gebaut. Dieser Artikel behandelt Optimierungseinstellungen, die am 29. Juli 2026 im Repository überprüft wurden.

PageSpeed-Insights-Ergebnisse variieren je nach Testzeitpunkt, Gerät und Netzwerk. Daher wird kein fester Score angegeben; Änderungen werden unter gleichen Bedingungen anhand von Core Web Vitals und Übertragungsgröße verglichen.

---

## Warum Astro?

Astro unterstützt statische Seitengenerierung (SSG) und erlaubt clientseitiges JavaScript nur dort, wo es benötigt wird. Die aktuelle Website liefert dennoch ClientRouter-, Such-, Anzeigen- und Analytics-Skripte aus. Gehen Sie daher nicht von null JavaScript aus, sondern messen Sie die ausgelieferte Menge und die Rendering-Metriken.

Die Website verwendet UnoCSS mit `presetWind3()`. Daraus wird CSS für die beim Build erkannten Utilities erzeugt, was die Auslieferungsgröße reduzieren kann; die kleinstmögliche Größe ist damit jedoch nicht belegt. Prüfen Sie das generierte CSS und die tatsächlich verwendeten Klassen.

---

## CSS-Bereitstellungsstrategie: Inline vs. Extern

Die CSS-Bereitstellung beeinflusst HTML-Größe, zusätzliche Anfragen und Browser-Caching.

### Beim Inlining von CSS

Die Einstellung `build.inlineStylesheets: 'always'` in Astro bettet alles CSS direkt ins HTML ein. Sie entfernt Anfragen für externe CSS-Dateien und kann je nach Seite den FCP (First Contentful Paint) verbessern.

Die günstigen Bedingungen hängen von CSS-Größe und Seitenstruktur ab; ein fester Grenzwert allein reicht nicht aus.

### Bei externem CSS

Externe Dateien ermöglichen es, gemeinsames, gehashtes CSS über den Browser-Cache wiederzuverwenden.

Die aktuelle Website nutzt `build.inlineStylesheets: 'auto'` und prüft beim Tuning den erzeugten Output.

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

Prüfen Sie nach der Änderung das erzeugte HTML, die CSS-Dateien und das Cache-Verhalten und führen Sie PageSpeed Insights unter denselben Bedingungen erneut aus.

---

## Schriftoptimierung: Tatsächliche Bereitstellung prüfen

### Externe und lokale Bereitstellung vergleichen

Externe Schriften können eine Verbindung zum kritischen Pfad hinzufügen. Lokale Bereitstellung sendet ebenfalls Schrift-CSS und Dateien von der Website; vergleichen Sie beide Ansätze unter gleichen Bedingungen.

Prüfen Sie im Netzwerk-Panel Schriftanfragen, Cache und Übertragungsgröße sowie unter Rendered Fonts die tatsächlich verwendeten Schriften.

### Aktueller Repository-Stand

`package.json` enthält `@fontsource/noto-sans-jp`, doch am 29. Juli 2026 wird es unter `src` nirgends importiert. Eine Abhängigkeit allein belegt keine Schriftauslieferung.

Der aktuelle UnoCSS-Schriftstapel lautet:

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', 'Yu Gothic', 'Meiryo', system-ui, sans-serif",
  },
}
```

Diese Deklaration lädt allein keine Web-Schrift. Wenn Self-Hosting eingeführt wird, prüfen Sie den expliziten Import, erzeugtes CSS und Schriftdateien sowie das Rendering gemeinsam.

---

## Bildoptimierung: Cloudflare Images + srcset + sizes

### Cloudflare Images Transformations

Das aktuelle Hilfsmodul leitet nur externe Bilder über die `/cdn-cgi/image/`-Transformation von Cloudflare Images. Root-relative `/uploads/...`-Dateien und verwaltete Bilder unter `asv.acecore.net/uploads/...` werden direkt bereitgestellt.

- **Formatkonvertierung**: `output=auto` wählt automatisch AVIF/WebP basierend auf der Browser-Unterstützung
- **Qualitätsanpassung**: Das aktuelle Hilfsmodul verwendet standardmäßig `quality=75`; prüfen Sie das tatsächliche Bild vor einer Abweichung
- **Größenänderung**: `w=`-Parameter ändert die Größe auf die angegebene Breite

### srcset- und sizes-Konfiguration

Erzeugen Sie für externe Bilder mit responsiver Bereitstellung `srcset` und setzen Sie `sizes` über das Hilfsmodul.

```astro
---
import { generateSrcSet, optimizeImage } from '../utils/image'

const remoteImage =
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop'
---

<img
  src={optimizeImage(remoteImage, { width: 800, height: 400, quality: 75 })}
  srcset={generateSrcSet(remoteImage, [480, 640, 960, 1280, 1600], {
    quality: 75,
    aspectRatio: 2,
  })}
  sizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  width="800"
  height="400"
  loading="lazy"
  decoding="async"
/>
```

### sizes-Präzision

Wenn das `sizes`-Attribut auf `100vw` (volle Bildschirmbreite) belassen wird, wählt der Browser größere Bilder als nötig. Geben Sie gemäß dem tatsächlichen Layout an, z.B. `calc(100vw - 2rem)` oder `(max-width: 768px) 100vw, 50vw`.

### LCP-Verbesserung: preload

Laden Sie nur das Bild vor, das tatsächlich ein LCP-Kandidat ist. Bei responsiven Bildern müssen `href`, `imagesrcset` und `imagesizes` des Layouts zum Bild passen; setzen Sie außerdem `fetchpriority="high"`. Zusätzliche Preloads können konkurrieren, deshalb sollte die Auswahl gemessen werden.

```html
<link
  rel="preload"
  as="image"
  href="..."
  imagesrcset="..."
  imagesizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  fetchpriority="high"
/>
```

### CLS-Prävention (Layout-Verschiebung)

Geben Sie genaue `width`- und `height`-Werte an, deren Verhältnis dem Quellbild entspricht. Korrekte Werte lassen den Browser Platz reservieren; die Attribute allein garantieren jedoch nicht, dass CLS entfällt. Die aktuellen Hero- und Markdown-Rewrite-Pfade setzen ebenfalls feste Abmessungen. Prüfen Sie deren Verhältnis gegen jedes Quellbild und messen Sie CLS.

Häufig übersehene Bilder sind Avatare (32×32, 48×48, 64×64px) und YouTube-Thumbnails (480×360px).

---

## Anzeigen-Ladesteuerung und verzögertes Analytics-Laden

### AdSense

Die aktuelle Runtime, die auf japanischen `/blog/`-Seiten aktiv ist, registriert für jeden Anzeigenplatz `IntersectionObserver` (`rootMargin: 200px`) und `ResizeObserver`, prüft danach die Darstellbarkeit und führt einen ersten `attemptInit()` aus. Dieser erste Versuch wartet nicht auf eine Intersection; bei nutzbarer Breite kann daher sofort eine Anzeigenanfrage erfolgen. Die Observer dienen Wiederholungen bei Intersection oder Größenänderung. Übersetzte URLs mit Locale-Präfix erhalten Anzeigenplätze, laden diese Runtime derzeit aber nicht.

```javascript
const retry = () => void attemptInit()
const intersectionObserver = new IntersectionObserver(
  (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      retry()
    }
  },
  { rootMargin: '200px' },
)
const resizeObserver = new ResizeObserver(retry)

intersectionObserver.observe(container)
resizeObserver.observe(container)
void attemptInit() // erster Versuch wartet nicht auf Intersection
```

`attemptInit()` prüft Breite und Sichtbarkeit; Statusattribute verhindern doppelte Anfragen.

### GA4

Google Analytics 4 wird durch `pointerdown`, `keydown`, `touchstart` oder `scroll` eingeplant. Wenn verfügbar, wird `requestIdleCallback` verwendet, andernfalls `setTimeout`; ohne Interaktion plant ein Timer den Ladevorgang nach 12 Sekunden auf der Startseite beziehungsweise 4 Sekunden auf anderen Seiten ein.

---

## Cache-Strategie

Der folgende Block dokumentiert die aktuellen Einstellungen in der Cloudflare-Pages-Datei `_headers`. Diese Werte sind keine pauschale Empfehlung für jede Datei.

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
- `/pagefind/*` erhält derzeit einen 1-Wochen-Cache + 1-Tag stale-while-revalidate. Da die fest benannte `pagefind-entry.json` auf gehashte Metadaten verweist, sollten Entry-/Bootstrap-Dateien zur Vermeidung unterschiedlicher Generationen revalidiert und nur gehashte Chunks lange gecacht werden
- HTML verwendet `max-age=0, must-revalidate` und wird vor der Wiederverwendung aus dem Cache revalidiert

---

## Checkliste zur Performance-Optimierung

1. **Ist die CSS-Bereitstellungsstrategie angemessen?**: `auto`-Output und Messung unter gleichen Bedingungen prüfen
2. **Wurde die Schriftbereitstellung verglichen?**: Self-Hosting und externes CDN unter gleichen Bedingungen messen
3. **Wurde die tatsächliche Schriftbereitstellung geprüft?**: Netzwerkanfragen und Rendered Fonts prüfen
4. **Haben Bilder mit responsiver Bereitstellung srcset + sizes?**: Besonders kleinere Größen für Mobile vorbereiten
5. **Wird nur der tatsächliche LCP-Kandidat vorgeladen?**: Responsive srcset, sizes und Priorität abgleichen
6. **Sind width/height der Bilder korrekt?**: Verhältnis zum Quellbild abgleichen und CLS messen
7. **Ist die AdSense/GA4-Steuerung passend?**: Ersten AdSense-Versuch und Observer-Wiederholungen sowie GA4-Interaktionen und Timer-Fallback prüfen
8. **Sind Cache-Header konfiguriert?**: Immutable-Cache auf gehashte Assets beschränken

---

## Zusammenfassung

Das Prinzip der Performance-Optimierung lautet: **„Sende nichts Unnötiges."** Prüfen Sie die CSS-Bereitstellung am tatsächlichen Output; Schrift-Self-Hosting ist eine Option, wenn es zu Messung und Betrieb der Website passt.

Behandeln Sie keinen festen Score als Ergebnis. Prüfen Sie Core Web Vitals und Übertragungsgröße unter gleichen Bedingungen und beziehen Sie das Verhalten von Anzeigen und Analytics ein.

---

## Teil einer Serie

Dieser Artikel ist Teil der Serie „[Leitfaden zur Qualitätsverbesserung von Astro-Websites](/blog/website-improvement-batches/)". Separate Artikel behandeln Verbesserungen in den Bereichen SEO, Barrierefreiheit und UX.
