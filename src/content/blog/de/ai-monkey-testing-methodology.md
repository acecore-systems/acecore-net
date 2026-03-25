---
title: 'Monkey-Testing Ihrer Website mit GitHub Copilot × Playwright: Ein praktischer Leitfaden'
description: 'Ein praxisnaher Leitfaden zum systematischen Monkey-Testing einer statischen Website mit dem VS Code Agent Mode (GitHub Copilot) in Kombination mit den Playwright-Browsertools. Behandelt die Testdesign-Methodik, entdeckte Fehler und deren Behebung sowie Verbesserungsempfehlungen.'
date: 2026-03-25
author: gui
tags: ['技術', 'GitHub Copilot', 'VS Code', 'Astro', 'Webサイト']
image: https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Für wen dieser Artikel gedacht ist
  text: 'Dieser Artikel richtet sich an alle, die sich für KI-gestützte Testautomatisierung, die Verbesserung der Effizienz bei der Website-Qualitätssicherung und die Nutzung des GitHub Copilot Agent Mode interessieren.'
processFigure:
  title: So führen Sie KI-Monkey-Testing durch
  steps:
    - title: Bestandsaufnahme
      description: Gesamten Quellcode lesen, um Routen, Komponenten und zu testende Interaktionen zu identifizieren.
      icon: i-lucide-clipboard-list
    - title: Crawl-Testing
      description: HTTP-Anfragen an alle Routen senden und Statuscodes, fehlerhafte Bilder und leere Links erkennen.
      icon: i-lucide-globe
    - title: Interaktionsüberprüfung
      description: JS-gesteuerte Elemente wie FAQ-Toggles, Kopier-Buttons, Such-Modals und YouTube-Embeds testen.
      icon: i-lucide-mouse-pointer-click
    - title: Struktur- & SEO-Audit
      description: Strukturierte Daten, OGP, Meta-Tags, Überschriftenhierarchie und Barrierefreiheit auf allen Seiten überprüfen.
      icon: i-lucide-shield-check
compareTable:
  title: Vergleich mit manuellem Testen
  before:
    label: Traditionelles manuelles Testen
    items:
      - Jede Seite einzeln visuell im Browser prüfen
      - Checklisten manuell erstellen und verwalten
      - Anfällig für Übersehen und vergessene Prüfungen
      - Die Dokumentation von Reproduktionsschritten ist zeitaufwändig
  after:
    label: KI-Monkey-Testing
    items:
      - Automatisches Crawlen aller Routen zur Überprüfung von HTTP-Status und DOM-Struktur
      - KI extrahiert Testziele automatisch aus dem Quellcode
      - Lückenlose Erkennung von fehlerhaften Bildern, leeren Links und JS-Fehlern
      - Entdeckung → Ursachenanalyse → Behebung → erneuter Test – alles in einer einzigen Sitzung
faq:
  title: Häufig gestellte Fragen
  items:
    - question: Ist der GitHub Copilot Agent Mode kostenlos nutzbar?
      answer: 'Der kostenlose GitHub Copilot-Plan hat monatliche Nutzungslimits für den Agent Mode. Pro- und Business-Pläne bieten erweiterte Limits. Die neuesten Funktionen sind in VS Code Insiders frühzeitig verfügbar.'
    - question: Kann der gleiche Ansatz mit anderen Browser-Tools als Playwright verwendet werden?
      answer: 'Wir verwenden die in VS Code integrierten Browser-Tools (Simple Browser + Playwright-Integration). Da Copilot den Browser direkt über das run_playwright_code-Tool steuert, ist keine separate Playwright-Installation erforderlich.'
    - question: Kann dies auch auf nicht-statische Websites angewendet werden?
      answer: 'Ja. Der gleiche Ansatz funktioniert für SPAs und SSR-Websites. Bei Seiten, die eine Anmelde-Authentifizierung erfordern, wird jedoch ein Mechanismus zur sicheren Verwaltung von Testanmeldedaten benötigt.'
    - question: Kann die KI entdeckte Fehler auch selbst beheben?
      answer: 'Im Agent Mode ist das Lesen und Schreiben von Dateien möglich, sodass der gesamte Ablauf von der Fehlererkennung über die Behebung bis zur Build-Überprüfung in einer einzigen Sitzung abgeschlossen werden kann. In diesem Artikel haben wir 2 Fehler entdeckt und sofort behoben.'
---

## Einführung

Die Qualitätssicherung einer Website ist mit einer einmaligen Prüfung vor dem Release nicht ausreichend. Unerwartete Probleme können jederzeit auftreten – bei Inhaltserweiterungen, Bibliotheks-Updates, CDN-Konfigurationsänderungen und mehr.

Dieser Artikel dokumentiert eine praxisnahe Monkey-Testing-Sitzung, bei der der **VS Code Agent Mode (GitHub Copilot)** direkt einen Browser steuerte, um eine gesamte Website zu testen. Wir haben die Testmethodik systematisiert, die die KI konsistent ausführte – von der statischen Quellcode-Analyse bis zur dynamischen Browser-Überprüfung.

---

## Testumgebung

| Element | Details |
|---------|---------|
| Editor | VS Code + GitHub Copilot (Agent Mode) |
| KI-Modell | Claude Opus 4.6 |
| Browsersteuerung | In VS Code integrierte Playwright-Tools |
| Testobjekt | Statische Website gebaut mit Astro + UnoCSS + Cloudflare Pages |
| Vorschau | `npm run preview` (lokal) + Produktions-URL |

Im Agent Mode führt Copilot selbstständig Terminal-Befehle aus, liest/schreibt Dateien und steuert den Browser. Der Tester gibt lediglich die Anweisung „bitte testen", und die KI führt den gesamten nachfolgenden Prozess automatisch aus.

---

## Phase 1: Bestandsaufnahme der Testziele

### Vollständiges Lesen des Quellcodes

Die KI scannt zunächst die Verzeichnisstruktur des Projekts und liest den gesamten Quellcode aller Komponenten, Seiten und Hilfsfunktionen.

```
src/
├── components/    ← Alle 28 Komponenten gelesen
├── content/blog/  ← Frontmatter von 16 Artikeln analysiert
├── pages/         ← Alle Routing-Dateien identifiziert
├── layouts/       ← BaseLayout-Struktur verstanden
└── utils/         ← rehype-Plugins & OG-Bildgenerierung geprüft
```

In dieser Phase identifiziert die KI automatisch:

- **Vollständige Routenliste**: 7 statische Seiten + Blog-bezogene Routen (Artikel, Tags, Archiv, Autoren, Paginierung)
- **Interaktive Elemente**: Such-Modal, FAQ-Toggles, Kopier-Buttons, YouTube-Fassade, Scroll-nach-oben, Hero-Slider
- **Externe Integrationen**: ssgform.com (Formulare), Cloudflare Turnstile (Bot-Schutz), Google AdSense, GA4

### Automatische Testplan-Erstellung

Aus den Analyseergebnissen des Quellcodes generiert die KI automatisch einen Testplan als Todo-Liste. Menschen müssen keine Checklisten erstellen.

---

## Phase 2: Vollständiges Routen-Crawl-Testing

### HTTP-Status-Überprüfung

Die gebaute Website wird mit `npm run preview` gestartet, und Playwright greift auf alle Routen zu.

```
Testziele: 31 Routen
├── Statische Seiten    7 (/, /about/, /services/, etc.)
├── Blog-Beiträge      16
├── Tag-Seiten         24
├── Archiv              4
├── Paginierung         2 (/blog/page/2/, /blog/page/3/)
├── Autorenseiten       2
├── RSS                 1
└── 404-Test            1

Ergebnis: Alle Routen 200 OK (außer beabsichtigter 404)
```

### DOM-Strukturprüfung

Folgendes wird auf jeder Seite automatisch überprüft:

| Prüfpunkt | Überprüfungsmethode | Ergebnis |
|-----------|---------------------|----------|
| Fehlerhafte Bilder | `img.complete && img.naturalWidth === 0` | 0 gefunden |
| Leere Links | `href` ist leer, `#` oder nicht gesetzt | 0 gefunden |
| Unsichere externe Links | `target="_blank"` ohne `rel="noopener"` | 0 gefunden |
| H1-Anzahl | `document.querySelectorAll('h1').length === 1` | Alle Seiten OK |
| Skip-Link | Vorhandensein von „Zum Inhalt springen" | Alle Seiten OK |
| lang-Attribut | `html[lang="ja"]` | Alle Seiten OK |

### Dead-Link-Prüfung

Interne Links wurden rekursiv von der Einstiegsseite gesammelt und die Erreichbarkeit aller 55 eindeutigen URLs bestätigt. **0 tote Links** wurden gefunden.

---

## Phase 3: Interaktionsüberprüfung

Die KI manipuliert Browserelemente direkt mit Playwright, um JavaScript-gesteuerte Funktionalität zu überprüfen.

### FAQ (`<details>`-Elemente)

```javascript
// Beispiel-Testcode, der von der KI ausgeführt wird
const details = document.querySelectorAll('details');
// Anfangszustand: alle geschlossen → OK
// Klicken zum Öffnen → OK
// Erneut klicken zum Schließen → OK
```

### Such-Modal (Pagefind)

1. Such-Dialog mit `window.openSearch()` öffnen
2. Warten, bis die Pagefind-UI vollständig geladen ist
3. „Astro" eingeben und bestätigen, dass Suchergebnisse angezeigt werden
4. Schließen mit ESC-Taste bestätigen

### YouTube-Fassaden-Muster

1. Das `.yt-facade`-Element anklicken
2. Bestätigen, dass ein iframe für `youtube-nocookie.com/embed/` dynamisch generiert wird
3. Bestätigen, dass der `autoplay=1`-Parameter enthalten ist

### Kopier-Button (nach View Transitions)

Bestätigt, dass Kopier-Buttons für Code-Blöcke nach Seitenübergängen via View Transitions neu initialisiert werden und funktionieren. Die Neuregistrierung über das `astro:page-load`-Event funktionierte korrekt.

### ScrollToTop-Button

Zum Seitenende scrollen → Button erscheint → klicken → bestätigen, dass `window.scrollY` auf 0 zurückkehrt.

---

## Phase 4: SEO- & Strukturierte-Daten-Audit

### OGP-Meta-Tags

Folgendes wurde auf allen Seiten überprüft:

- `og:title` / `og:description` / `og:image` / `og:url` / `og:type` sind gesetzt
- `twitter:card` ist auf `summary_large_image` gesetzt
- `canonical`-URL ist korrekt
- OG-Bild-URL existiert und hat die empfohlene Größe (1200×630)

### Strukturierte Daten (JSON-LD)

JSON-LD auf jeder Seite wurde geparst, um Schema-Typen und Inhalte zu überprüfen.

| Seitentyp | Strukturierte Daten |
|-----------|---------------------|
| Alle Seiten | Organization, WebSite |
| Blog-Beiträge | BreadcrumbList, BlogPosting, FAQPage |
| Artikel mit FAQ | FAQPage (mainEntity enthält Fragen und Antworten) |

### Sitemap

Bestätigt, dass `sitemap-index.xml` → `sitemap-0.xml` alle 57 URLs enthält. Die Sitemap-Referenz aus `robots.txt` funktionierte ebenfalls korrekt.

---

## Phase 5: Barrierefreiheits-Überprüfung

AXE-Engine-äquivalente Prüfungen wurden via Playwright auf mehreren Seiten durchgeführt.

| Prüfpunkt | Getestete Seiten | Verstöße |
|-----------|------------------|----------|
| img alt-Attribute | 4 | 0 |
| Button-Labels | 4 | 0 |
| Überschriftenhierarchie (h1→h2→h3 Reihenfolge) | 4 | 0 |
| Formular-Input-Labels | 1 (Kontakt) | 0 |
| Landmark-Elemente | 4 | 0 |
| Externe Link rel-Attribute | 4 | 0 |
| tabindex-Werte | 4 | 0 |

**Keine Verstöße auf allen 4 Seiten und allen Prüfpunkten.**

---

## Phase 6: View-Transitions-Navigationstests

Bei Astro View Transitions wird das DOM differenziell aktualisiert, was die JavaScript-Neuinitialisierung zur Herausforderung macht. Folgende Übergangsmuster wurden überprüft:

```
Startseite → Blog-Liste → Artikel → Tag → Autor → Kontakt → Dienstleistungen → Startseite
```

Nach jedem Übergang bestätigte Punkte:

- URL, Titel und H1 werden korrekt aktualisiert
- Such-Button funktioniert
- Kopier-Buttons werden neu initialisiert
- Breadcrumb-Navigation wird aktualisiert
- **Keine JS-Fehler**

---

## Phase 7: Sicherheitsheader-Überprüfung

Überprüfung der Antwort-Header auf der Produktions-Website:

| Header | Wert | Bewertung |
|--------|------|-----------|
| Content-Security-Policy | Vollständig konfiguriert | ◎ |
| X-Frame-Options | SAMEORIGIN | ◎ |
| X-Content-Type-Options | nosniff | ◎ |
| Strict-Transport-Security | max-age=15552000 | ○ |
| Referrer-Policy | strict-origin-when-cross-origin | ◎ |
| Permissions-Policy | geolocation=(), camera=(), etc. | ◎ |

---

## Entdeckte Fehler und Korrekturen

Diese Testsitzung deckte 2 Fehler auf, die beide in derselben Sitzung behoben wurden.

### Fehler 1: Fehlende Resilienz beim Such-Modal

**Symptom**: Wird der Such-Button gedrückt, bevor das Pagefind-Skript vollständig geladen ist, reagiert die Oberfläche nicht mehr.

**Ursache**: `loadPagefindScript()` hatte keinen Retry-Mechanismus nach einem anfänglichen Fehler.

**Behebung**: Implementierung des Löschens des Promise-Caches bei Fehler und Anzeige eines „Neu laden"-Buttons als Fallback-UI.

### Fehler 2: Fehlende Google-Ursprünge im CSP-Header

**Symptom**: Google AdSense-bezogene Ressourcen werden durch CSP blockiert, was Konsolenfehler verursacht.

**Ursache**: `connect-src` und `frame-src` enthielten nicht `https://www.google.com` / `https://www.google.co.jp`.

**Behebung**: Hinzufügen der Google-bezogenen Ursprünge zu den CSP-Direktiven in `public/_headers`.

---

## Systematisierung der Testmethodik

Wenn man diesen KI-Monkey-Testing-Ansatz organisiert, lässt er sich in folgende Schichten einteilen:

### Schicht 1: Statische Analyse (Quellcode lesen)

- Verzeichnisstruktur scannen
- Komponentenabhängigkeiten kartieren
- Frontmatter-Schema (Zod) analysieren
- CSP- und Weiterleitungskonfiguration prüfen

### Schicht 2: HTTP-Schicht-Tests (vollständiges Routen-Crawling)

- Statuscode-Überprüfung (200/404/301)
- Antwort-Header-Audit (Sicherheit, Cache)
- Konsistenz von Sitemap, robots.txt, ads.txt

### Schicht 3: DOM-Schicht-Tests (Strukturüberprüfung)

- Fehlerhafte Bilder, leere Links, unsichere externe Links
