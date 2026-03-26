---
title: 'Astro-Website-Qualitätsverbesserungsleitfaden — PageSpeed Mobile Score von 99 erreichen'
description: 'Ein vollständiger Bericht über die Verbesserung einer Astro + UnoCSS + Cloudflare Pages-Website in vier Bereichen — Performance, SEO, Barrierefreiheit und UX — mit Erreichen eines PageSpeed Insights Mobile Scores von 99 und perfekten 100 Punkten bei allen Desktop-Metriken.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Zielgruppe
  text: 'Dieser Artikel richtet sich an alle, die an Website-Qualitätsverbesserungen arbeiten oder sich für den praktischen Betrieb von Astro + UnoCSS interessieren. Er dient als Übersichtsartikel, der das Gesamtbild zusammenfasst, wobei detaillierte Themen in einzelnen Artikeln verlinkt sind.'
processFigure:
  title: Verbesserungsprozess
  steps:
    - title: Messen
      description: Engpässe mit PageSpeed Insights und axe identifizieren.
      icon: i-lucide-gauge
    - title: Analysieren
      description: Die Bewertungsaufschlüsselung lesen und die wirkungsvollsten Verbesserungen identifizieren.
      icon: i-lucide-search
    - title: Umsetzen
      description: Änderungen einzeln anwenden und null Build-Fehler bestätigen.
      icon: i-lucide-code
    - title: Nachmessen
      description: Nach dem Deployment erneut messen und Ergebnisse mit Zahlen validieren.
      icon: i-lucide-check-circle
compareTable:
  title: Vor und nach den Verbesserungen
  before:
    label: Vorher
    items:
      - PageSpeed Mobile Score im 70er-Bereich
      - Keine strukturierten Daten oder OGP konfiguriert
      - Keine Unterstützung für Barrierefreiheit
      - Skripte brechen bei View Transitions
      - Hartcodierte Konstanten überall verstreut
  after:
    label: Nachher
    items:
      - Mobile 99 / 100 / 100 / 100 (alle Desktop-Metriken bei 100)
      - 7 Typen strukturierter Daten + OGP + canonical vollständig implementiert
      - WCAG AA-konform (Kontrast, aria, SR-Benachrichtigungen, focus-visible)
      - Alle Komponenten kompatibel mit View Transitions
      - SITE-Konstanten, Social-URLs und Ad-IDs zentral verwaltet
linkCards:
  - href: /blog/astro-performance-tuning/
    title: Performance-Optimierung
    description: Wie man PageSpeed 99 mit CSS-Lieferstrategien, Schriftarteinstellungen, responsiven Bildern und Caching erreicht.
    icon: i-lucide-gauge
  - href: /blog/astro-seo-and-structured-data/
    title: SEO & Strukturierte Daten
    description: Ein praktischer Leitfaden zur Implementierung von JSON-LD, OGP, Sitemaps und RSS.
    icon: i-lucide-search
  - href: /blog/astro-accessibility-guide/
    title: Barrierefreiheit
    description: Ein Leitfaden zur Erreichung der WCAG AA-Konformität durch aria-Attribute, Kontrast und Formularverbesserungen.
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: UX & Codequalität
    description: Praktische Ansätze für View Transitions-Fallstricke, Pagefind-Volltextsuche und TypeScript-Typsicherheit.
    icon: i-lucide-sparkles
faq:
  title: FAQ
  items:
    - question: Ist es möglich, 100 Punkte bei PageSpeed Insights Mobile zu erreichen?
      answer: 'Technisch ja, aber für Websites mit externen Diensten wie AdSense oder GA4 ist ein stabiler Wert von 100 extrem schwierig. Lighthouse simuliert langsames 4G (~1,6 Mbit/s), sodass das Laden externer Ressourcen eine erhebliche Strafe nach sich zieht. 99 ist der realistische Bestwert.'
    - question: In welcher Reihenfolge sollten Verbesserungen vorgenommen werden?
      answer: 'Beginnen Sie mit der Bewertung des aktuellen Zustands per PageSpeed Insights und beheben Sie dann zuerst die Punkte mit der größten Auswirkung. Generell empfiehlt sich die Reihenfolge Performance → SEO → Barrierefreiheit.'
    - question: Können diese Verbesserungstechniken auf andere Astro-Websites angewendet werden?
      answer: 'Ja. CSS-Lieferstrategien, Schriftart-Selbst-Hosting, strukturierte Daten und Barrierefreiheitsverbesserungen sind Best Practices, die für alle Astro-Websites gelten.'
    - question: Wurde GitHub Copilot für die Verbesserungen eingesetzt?
      answer: 'Ja. Nahezu alle Verbesserungen wurden in Zusammenarbeit mit GitHub Copilot durchgeführt. Details finden sich im Artikel „Entwicklungsworkflow mit GitHub Copilot".'
---

## Einleitung

Die offizielle Acecore-Website, die im März 2026 neu gestartet wurde, wurde mit Astro 6 + UnoCSS + Cloudflare Pages erstellt. Die frisch gestartete Website war jedoch bestenfalls auf dem Niveau „es funktioniert" — mit Verbesserungspotenzial in den Bereichen Performance, SEO, Barrierefreiheit und UX.

Dieser Artikel fasst den Weg durch über 150 Verbesserungen zusammen, um **PageSpeed Insights Mobile 99 und perfekte 100 Punkte bei allen Desktop-Metriken** zu erreichen.

---

## Die PageSpeed Mobile 99-Herausforderung

Zunächst ist festzuhalten, dass **ein hoher Score bei PageSpeed Insights Mobile viel schwieriger ist, als man erwarten würde**.

### Die Mobile-Simulation von Lighthouse

PageSpeed Insights führt im Hintergrund Lighthouse aus und wendet für Mobile-Tests folgendes Throttling an:

| Einstellung | Wert |
| --- | --- |
| Download-Geschwindigkeit | ~1,6 Mbit/s (langsames 4G) |
| Upload-Geschwindigkeit | ~0,75 Mbit/s |
| Latenz | 150 ms (RTT) |
| CPU | 4-fache Verlangsamung |

Das bedeutet, dass selbst eine Seite, die mit Glasfaserverbindung in 1 Sekunde lädt, unter Lighthouses Simulation **5–6 Sekunden** benötigt. Das Laden von 200 KiB CSS allein verursacht bei langsamem 4G etwa **1 Sekunde** Blockierung.

### Nichtlineare Bewertungsskalierung

PageSpeed-Bewertungen sind nicht linear:

- **50 → 90**: Erreichbar mit grundlegenden Optimierungen (Bildkomprimierung, Entfernung unnötiger Skripte)
- **90 → 95**: Erfordert strategische CSS-, Schrift- und Bildlieferung
- **95 → 99**: Tuning im Millisekundenbereich. Entscheidungen zwischen CSS-Inlining und externen Dateien werden kritisch
- **99 → 100**: Beeinflusst durch externe CDN-Antwortzeiten und Lighthouses eigene Messvarianz. Extrem schwierig für Websites mit AdSense oder GA4 konsistent zu erreichen

### Bewertungsvarianz

Selbst für dieselbe Website können die Bewertungen zwischen den Messungen um **2–5 Punkte** schwanken. Ursachen sind:

- Antwortzeiten von Bild-Transformationsdiensten (z.B. Cloudflare Images)
- Cloudflare Pages Edge-Server-Cache-Status
- Lighthouses eigener Messfehler

Aus diesem Grund sollte das Ziel „konsistent hohe Bewertungen bei wiederholten Messungen" sein, nicht „einmal 100 Punkte erzielen."

---

## Endergebnisse

Trotz dieser Herausforderungen konnten wir konsistent folgende Bewertungen erzielen:

| Metrik | Mobile | Desktop |
| --- | --- | --- |
| Performance | **99** | **100** |
| Barrierefreiheit | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

---

## Vier Säulen der Verbesserung

Die Verbesserungen wurden in vier Hauptkategorien organisiert, wobei jedes Thema in separaten Artikeln detailliert behandelt wird.

### 1. Performance

Die Performance-Optimierung trug am meisten zum Erreichen von Mobile 99 bei. Wir haben Engpässe systematisch beseitigt: CSS-Lieferstrategie (Inline vs. extern), Schriftart-Selbst-Hosting, responsive Bildoptimierung und verzögertes Laden von AdSense/GA4.

Die drei wirkungsvollsten Änderungen:

- **CSS-Externalisierung**: Der Wechsel von 190 KiB inline CSS zu einer externen Datei reduzierte die HTML-Übertragungsgröße um bis zu 91%
- **Behebung der Schriftart-Namensdiskrepanz**: `@fontsource-variable/noto-sans-jp` registriert den Schriftnamen `Noto Sans JP Variable`, aber CSS referenzierte `Noto Sans JP` — diese Diskrepanz wurde entdeckt und behoben
- **Responsive Bilder**: `srcset` + `sizes` auf allen Bildern gesetzt, um für Mobile angemessen dimensionierte Bilder auszuliefern

### 2. SEO

Zur Unterstützung von Googles Rich Results haben wir 7 Typen von JSON-LD strukturierten Daten implementiert. In Kombination mit OGP-Meta-Tags, kanonischen URLs, Sitemap-Optimierung und RSS-Feed-Verbesserungen haben wir eine Grundlage geschaffen, um die Website-Struktur akkurat an Suchmaschinen zu kommunizieren.

### 3. Barrierefreiheit

PageSpeed Barrierefreiheit 100 wurde durch das Bestehen von axe DevTools und Lighthouse-automatisierten Tests erreicht. Dies umfasste das Hinzufügen von `aria-hidden` bei dekorativen Icons (über 30 Instanzen), Screenreader-Benachrichtigungen bei externen Links, Kontrastkorrekturen (`text-slate-400` → `text-slate-500`) und die globale Anwendung von `focus-visible`-Stilen — stetige, inkrementelle Arbeit.

### 4. UX & Codequalität

Wir haben Skriptabbruch-Probleme gelöst, die durch View Transitions (ClientRouter) über alle Komponenten hinweg verursacht wurden, und eine Volltextsuche mit Pagefind implementiert. Auf der Code-Seite wurde die TypeScript-Typsicherheit verbessert und Konstanten zentralisiert (Social-URLs, Ad-IDs, GA4-ID in SITE-Konstanten konsolidiert), was die Wartbarkeit erheblich verbesserte.

---

## Tech-Stack

| Technologie | Zweck |
| --- | --- |
| Astro 6 | Statische Seitengenerierung (Zero-JS-Architektur) |
| UnoCSS (presetWind3) | Utility-First CSS |
| Cloudflare Pages | Hosting, CDN, Header-Steuerung |
| @fontsource-variable/noto-sans-jp | Selbst gehostete japanische Schriftart |
| Cloudflare Images | Bild-Transformationen (automatische AVIF/WebP-Konvertierung) |
| Pagefind | Volltextsuche für statische Websites |

---

## Fazit

PageSpeed Insights Mobile 99 zu erreichen, läuft darauf hinaus, das Prinzip „nichts senden, was nicht benötigt wird" konsequent zu befolgen. CSS-Lieferstrategie, Schriftart-Selbst-Hosting, Bildoptimierung, verzögertes Laden externer Skripte — jede Maßnahme ist für sich genommen einfach, aber in Kombination liefern sie erhebliche Wirkung.

Durch parallele Verfolgung von SEO-, Barrierefreiheits- und UX-Verbesserungen werden hohe Bewertungen in allen vier Kategorien erreichbar. Statt sich auf 100 zu fixieren, ist ein stabiler Wert von 95+ ein realistischeres Ziel.

Detaillierte Informationen zu den einzelnen Themen finden Sie in den Linkkarten oben. Informationen zum Verbesserungsworkflow und wie Änderungen im Code umgesetzt wurden, finden Sie auch im Artikel [Entwicklungsworkflow mit GitHub Copilot](/blog/tax-return-with-copilot/).
