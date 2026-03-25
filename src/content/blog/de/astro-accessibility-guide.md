---
title: 'Praktischer Leitfaden zur WCAG-AA-Konformität Ihrer Astro-Website'
description: 'Ein umfassender Leitfaden zu Barrierefreiheitsverbesserungen, die auf einer Astro + UnoCSS-Website implementiert wurden. Behandelt aria-Attribute, Kontrast, Fokusverwaltung, Formularvalidierung, Screenreader-Unterstützung und alles Nötige für die WCAG-AA-Konformität.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'アクセシビリティ']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: Barrierefreiheit verbessert die UX für alle
  text: 'Barrierefreiheit ist nicht nur für Menschen mit Behinderungen. Tastaturnavigation, Kontrast und Fokusindikatoren verbessern direkt die Benutzerfreundlichkeit für alle Nutzer. Je mehr Sie in Barrierefreiheit investieren, desto besser wird die Gesamtqualität Ihrer Website.'
processFigure:
  title: Workflow zur Verbesserung der Barrierefreiheit
  steps:
    - title: Automatisierte Tests
      description: axe DevTools und Lighthouse verwenden, um maschinell erkennbare Probleme zu identifizieren.
      icon: i-lucide-scan
    - title: Manuelle Tests
      description: Selbst mit Tastatur und Screenreader navigieren.
      icon: i-lucide-hand
    - title: Behebung
      description: aria-Attribute hinzufügen, Kontrast korrigieren und Fokus-Styles ergänzen.
      icon: i-lucide-wrench
    - title: Erneuter Test
      description: Eine Punktzahl von 100 bei PageSpeed Accessibility bestätigen.
      icon: i-lucide-check-circle
checklist:
  title: WCAG-AA-Konformitäts-Checkliste
  items:
    - text: Textkontrastverhältnis ist 4,5:1 oder höher (3:1 für großen Text)
      checked: true
    - text: Alle interaktiven Elemente haben focus-visible-Styles
      checked: true
    - text: Dekorative Icons haben aria-hidden="true"
      checked: true
    - text: Externe Links haben Screenreader-Benachrichtigungen
      checked: true
    - text: Formulare haben Inline-Validierung mit aria-invalid-Integration
      checked: true
    - text: Bilder haben width/height-Attribute (CLS-Prävention)
      checked: true
    - text: Listen-Elemente haben role="list" (list-style:none-Workaround)
      checked: true
faq:
  title: Häufig gestellte Fragen
  items:
    - question: Was ist der Unterschied zwischen axe DevTools und Lighthouse?
      answer: 'Lighthouse ist ein umfassendes Audit-Tool, das auch Performance und SEO abdeckt und nur eine Teilmenge der Barrierefreiheits-Punkte prüft. axe DevTools ist auf Barrierefreiheit spezialisiert und führt detailliertere Prüfungen mit einem größeren Regelsatz durch. Die Verwendung beider zusammen wird empfohlen.'
    - question: Sollten aria-Attribute zu jedem Element hinzugefügt werden?
      answer: 'Nein. Wenn die HTML-Semantik korrekt ist, ist aria unnötig. aria-Attribute sollen „Informationen ergänzen, die HTML allein nicht vermitteln kann." Übermäßige Verwendung kann die Screenreader-Ausgabe zu ausführlich machen.'
    - question: Bedeutet ein PageSpeed-Accessibility-Score von 100 WCAG-Konformität?
      answer: 'Auch ein Score von 100 garantiert keine vollständige WCAG-Konformität. Lighthouse hat begrenzte Prüfpunkte, und einige Kriterien können nur manuell überprüft werden (logische Lesereihenfolge, angemessener Alt-Text usw.). Sowohl automatisierte als auch manuelle Tests sind notwendig.'
---

## Einführung

„Barrierefreiheit" mag wie etwas erscheinen, das man leicht aufschieben kann. Aber wenn man sich tatsächlich damit befasst, stellt man fest, dass die Verbesserung von Kontrast, Tastaturnavigation und Fokusindikatoren die Benutzerfreundlichkeit für jeden Nutzer direkt verbessert.

Dieser Artikel stellt die Verbesserungen vor, die implementiert wurden, um einen PageSpeed-Accessibility-Score von 100 auf einer Astro + UnoCSS-Website zu erreichen, gegliedert nach Kategorien.

---

## aria-hidden für dekorative Icons

UnoCSS-Iconify-Icons (`i-lucide-*`) werden oft als visuelle Dekoration verwendet, aber wenn Screenreader sie vorlesen, geben sie „Bild" oder „unbekanntes Bild" aus, was für Verwirrung sorgt.

### Lösung

`aria-hidden="true"` zu dekorativen Icons hinzufügen.

```html
<span class="i-lucide-mail" aria-hidden="true"></span>
Kontakt
```

Dies wurde auf über 30 Icons auf der gesamten Website angewendet. Achten Sie darauf, Icons innerhalb von Komponenten wie StatBar, Callout, ServiceCard und ProcessFigure nicht zu übersehen.

---

## Screenreader-Benachrichtigungen für externe Links

Externe Links, die mit `target="_blank"` geöffnet werden, zeigen visuell an, dass sie in einem neuen Tab geöffnet werden, aber diese Information wird Screenreader-Nutzern nicht mitgeteilt.

### Lösung

Visuell versteckten Ergänzungstext zu externen Links hinzufügen.

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  Beispiel
  <span class="sr-only">(öffnet in einem neuen Tab)</span>
</a>
```

Mit dem `rehype-external-links`-Plugin können `target="_blank"` und `rel` automatisch zu externen Links in Markdown hinzugefügt werden. Der SR-Benachrichtigungstext wird auf der Template-Seite ergänzt.

---

## Kontrast sicherstellen

Unzureichender Kontrast ist das häufigste von PageSpeed Insights gemeldete Problem.

### Häufiges Problem

Die Verwendung von `text-slate-400` aus UnoCSS's Farbpalette ergibt ein Kontrastverhältnis von etwa 3:1 gegenüber einem weißen Hintergrund und erfüllt nicht die WCAG-AA-Anforderung von 4,5:1.

### Lösung

Die Änderung von `text-slate-400` → `text-slate-500` (Kontrastverhältnis 4,6:1) erfüllt die Anforderung. Dies wird häufig für Ergänzungstext wie Daten und Bildunterschriften verwendet, also prüfen Sie die gesamte Website.

---

## focus-visible-Styles

Für Nutzer, die Websites mit der Tastatur navigieren, sind Fokusindikatoren die einzige Möglichkeit zu wissen, „wo ich mich gerade befinde." WCAG 2.4.7 erfordert Fokuserkennung.

### Implementierung mit UnoCSS

Gemeinsame Fokus-Styles für Buttons und Links setzen. Mit der Shortcut-Funktion von UnoCSS können Sie es an einer Stelle definieren und überall anwenden.

```typescript
shortcuts: {
  'ac-btn': '... focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none',
}
```

`focus-visible` ist eine Pseudoklasse, die den Ring nur bei Tastaturnavigation und nicht bei Mausklicks anzeigt. Sie bietet eine bessere UX als `focus`, daher verwenden Sie diese.

### Häufig übersehene Elemente

- Kopier-Buttons
- Scroll-nach-oben-Button
- Schließen-Button für Ankeranzeigen
- Schließen-Buttons für Modals

---

## Unterstreichungen bei Inline-Links

PageSpeed kann melden: „Links sind nur durch Farbe erkennbar." Dies ist ein Problem für Nutzer mit Farbsehschwäche, die Links nicht unterscheiden können.

### Lösung

Unterstreichungen immer sichtbar machen, anstatt nur beim Hover. Die Verwendung von UnoCSS-Shortcuts für Konsistenz wird empfohlen.

```typescript
shortcuts: {
  'ac-link': 'underline decoration-brand-300 underline-offset-2 hover:decoration-brand-500 transition-colors',
}
```

---

## Formular-Barrierefreiheit

Barrierefreiheit ist besonders dort wichtig, wo Nutzer Eingaben machen, wie bei Kontaktformularen.

### Inline-Validierung

Fehlermeldungen sofort bei `blur`/`input`-Events anzeigen, koordiniert mit folgenden aria-Attributen:

- `aria-invalid="true"` — Benachrichtigt, dass die Eingabe ungültig ist
- `aria-describedby` — Referenziert die ID der Fehlermeldung

```html
<input
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<p id="email-error" role="alert">Bitte geben Sie eine gültige E-Mail-Adresse ein</p>
```

### Pflichtfeld-Markierungen

Ein visuelles `*`-Zeichen allein ist unzureichend. Ergänzungstext für Screenreader hinzufügen.

```html
<span aria-hidden="true">*</span>
<span class="sr-only">(Pflichtfeld)</span>
```

---

## role-Attribut bei figure-Elementen

Die Einstellung `role="img"` auf `<figure>`-Elementen verbirgt untergeordnete Elemente vor Screenreadern. Bei Komponenten, die Icons und beschreibenden Text enthalten (InsightGrid, ProcessFigure, Timeline), zu `role="group"` wechseln, um den internen Inhalt zugänglich zu halten.

---

## role-Attribut bei Listen-Elementen

Wenn CSS `list-style: none` angewendet wird, hat Safaris Screenreader (VoiceOver) einen bekannten Fehler, bei dem das Element nicht mehr als Liste erkannt wird.

`role="list"` zu `<ol>` / `<ul>`-Elementen in Breadcrumbs, Sidebars und Footer hinzufügen. Alle Listen mit angepasstem Erscheinungsbild prüfen.

---

## Weitere Verbesserungen

### width/height-Attribute bei Bildern

Bilder ohne explizite `width` und `height` verursachen Layout-Verschiebungen (CLS — Cumulative Layout Shift), wenn das Laden abgeschlossen ist. Größen für alle Bilder angeben, einschließlich Avatare (32×32, 48×48, 64×64px) und YouTube-Thumbnails (480×360px).

### aria-live beim Hero-Slider

Automatisch rotierende Slider kommunizieren Änderungen nicht an Screenreader-Nutzer. Einen `aria-live="polite"`-Bereich vorbereiten und mit Text wie „Folie 1 / 4: [Titel]" benachrichtigen.

### aria-labelledby bei dialog

Die ID des Titelelements mit `aria-labelledby` auf `<dialog>`-Elementen referenzieren, damit Screenreader den Zweck des Modals ansagen können.

### aria-current bei der Paginierung

`aria-current="page"` auf die aktuelle Seitennummer setzen, um Screenreader zu benachrichtigen, dass es „die aktuelle Seite" ist.

### aria-label-Aktualisierung beim Kopier-Button

Wenn das Kopieren in die Zwischenablage erfolgreich ist, `aria-label` dynamisch auf „Kopiert" aktualisieren, um Screenreader über die Statusänderung zu informieren.

---

## Zusammenfassung

Barrierefreiheitsverbesserungen sind einzeln kleine Änderungen, verbessern aber zusammen die Gesamtqualität der Website erheblich. Die drei wirkungsvollsten Änderungen waren:

1. **Globale Anwendung von focus-visible**: Tastaturnavigation wurde dramatisch verbessert
2. **Korrektur der Kontrastverhältnisse**: Einfach `text-slate-400` → `text-slate-500` ändern, um WCAG AA zu erfüllen
3. **SR-Benachrichtigungen für externe Links**: In Kombination mit `rehype-external-links` für automatische Abdeckung aller Links

Beginnen Sie damit, Ihre Website mit axe DevTools zu scannen und die automatisch erkennbaren Probleme zuerst anzugehen.

---

## Teil einer Serie

Dieser Artikel ist Teil der Serie „[Leitfaden zur Qualitätsverbesserung von Astro-Websites](/blog/website-improvement-batches/)". Separate Artikel behandeln Verbesserungen in den Bereichen Performance, SEO und UX.
