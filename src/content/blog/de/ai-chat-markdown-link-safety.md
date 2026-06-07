---
title: 'Markdown-Links in KI-Chat-Antworten sicher rendern'
description: 'Eine technische Notiz dazu, Markdown-Links aus KI-Chat-Antworten sicher in HTML zu überführen. Parsing mit Leerzeichen-Toleranz, href-trim, Allowlist, DOM-Rendering, Fallback und Tests werden getrennt betrachtet.'
date: 2026-06-07T14:30
author: gui
tags: ['技術', 'Webサイト', 'AI', 'セキュリティ', 'Astro']
image: https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Kernpunkt
  text: KI-Antworten sind kein vertrauenswürdiges HTML. Auch bei Markdown-Links sollte die URL zuerst getrimmt, per Allowlist validiert und bei Ablehnung als Text belassen werden.
processFigure:
  title: Rendering-Ablauf für Links
  steps:
    - title: Text
      description: Die Modellantwort zuerst als reinen Text behandeln.
      icon: i-lucide-message-square-text
      accent: brand
    - title: Parse
      description: Nur die Markdown-Ausdrücke erkennen, die der Chat wirklich nutzt.
      icon: i-lucide-brackets
      accent: amber
    - title: Validate
      description: href trimmen und nur interne URLs oder freigegebene Domains erlauben.
      icon: i-lucide-shield-check
      accent: emerald
    - title: Render
      description: Sichere Elemente mit der DOM API erzeugen, nicht mit innerHTML.
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: Entscheidungen, die getrennt bleiben sollten
  before:
    label: Lockeres Rendering
    items:
      - KI-Antworten direkt in innerHTML einsetzen
      - Die gesamte Markdown-Spezifikation auf einmal implementieren
      - Links mit Leerzeichen um die URL nicht erkennen
      - 'Externe URLs und javascript: gleich behandeln'
  after:
    label: Kleines und sicheres Rendering
    items:
      - Antworten als Text empfangen und nur Nötiges in DOM umwandeln
      - Nur die im Chat genutzte Markdown-Teilmenge unterstützen
      - URLs nach trim validieren
      - Nicht erlaubte URLs als Text belassen
checklist:
  title: Implementierungscheck
  items:
    - text: KI-Antworten nicht als HTML vertrauen
    - text: Leerzeichen um Markdown-Link-URLs akzeptieren
    - text: href immer vor der Validierung trimmen
    - text: Nur interne Pfade, aktuelle Origin und nötige externe Domains erlauben
    - text: target und rel für externe Links explizit setzen
    - text: Abgelehnte Links als Text erhalten
    - text: Gefährliche URLs und kaputtes Markdown testen
linkCards:
  - href: /blog/astro-ai-contact-chat/
    title: Technisches Design des KI-Kontaktchats
    description: Grundlagenartikel zu KI-Antworten, API-Grenze und Prompt-Steuerung.
    icon: i-lucide-sparkles
  - href: /blog/cloudflare-pages-security/
    title: Cloudflare Pages Sicherheit
    description: Verwandter Artikel zu CSP und Sicherheitsheadern.
    icon: i-lucide-shield
  - href: /contact/
    title: Kontakt
    description: Die tatsächliche Seite mit KI-Chat und Formular.
    icon: i-lucide-message-square
faq:
  title: Häufige Fragen
  items:
    - question: Reicht markdown-it oder marked?
      answer: Auch mit Bibliothek müssen HTML-Ausgabe, erlaubte Linkziele, target und rel sowie die Ablehnung gefährlicher URLs gestaltet werden. Für einen Chat kann ein kleiner eigener Renderer genügen.
    - question: Sind Leerzeichen um URLs gefährlich?
      answer: Nicht die Leerzeichen sind das Risiko, sondern was nach dem Trim erlaubt wird. Validierung des getrimmten href hält die Allowlist streng.
    - question: Sollte man abgelehnte URLs löschen?
      answer: Meist ist Text besser für Debugging und Kontext. Eine strengere Policy kann den gesamten Link entfernen.
---

Wenn ein KI-Chat `Siehe [Services]( /services/ )` ausgibt, kann der Link nicht gerendert werden und das rohe Markdown bleibt sichtbar.

Acecore traf diesen Fall im Kontakt-KI-Chat und passte den Renderer in [dem PR zur Korrektur des Markdown-Link-Renderings](https://github.com/acecore-systems/acecore-net/pull/99) an.

Dieser Artikel nutzt diese kleine Korrektur als Einstieg, um KI-Antworten sicher in DOM umzuwandeln.

## KI-Antworten sind kein vertrauenswürdiges HTML

Modellausgaben sollten als Text behandelt werden.

Links, Fettschrift und Listen sind in einem Chat nützlich. Aber `innerHTML` lässt den Browser beliebige Modellstrings interpretieren.

Es braucht keine komplette Markdown-Implementierung. Ein kleiner Renderer, der nur unterstützte Ausdrücke erkennt und sichere DOM-Knoten erzeugt, ist oft besser.

## Das Problem ist nicht nur Leerraum

Der konkrete Fehler war ein Link wie:

```md
[Services](/services/)
```

Eine strenge Regex geht oft von einer URL ohne Leerzeichen aus:

```js
;/\[([^\]]+)\]\(([^)\s]+)\)/
```

`[^)\s]+` lehnt Leerzeichen ab. Deshalb wird `( /services/ )` nicht erkannt. Die Korrektur toleriert Leerraum in den Klammern und normalisiert danach.

```js
;/\[([^\]]+)\]\(\s*([^)]+?)\s*\)/
```

Damit ist es aber nicht getan. Der normalisierte Wert muss validiert werden.

## href vor der Validierung trimmen

Der Ablauf sollte fest sein:

1. Label und raw href aus Markdown extrahieren
2. `trim()` auf raw href anwenden
3. Getrimmtes href per Allowlist validieren
4. `<a>` nur bei erlaubtem href erzeugen

```js
const href = String(rawHref || '').trim()

if (label && isSafeMarkdownHref(href)) {
  const link = document.createElement('a')
  link.href = href
  link.rel = 'noopener noreferrer'

  if (/^https?:\/\//i.test(href)) {
    link.target = '_blank'
  }

  link.textContent = label
  parent.appendChild(link)
}
```

Der validierte Wert muss derselbe sein, der ins DOM geschrieben wird.

## Die Allowlist ist produktspezifisch

Jede Site muss entscheiden, welche URLs ihre KI anzeigen darf.

| Typ              | Beispiel                  | Entscheidung                   |
| ---------------- | ------------------------- | ------------------------------ |
| Interner Pfad    | `/services/`              | Erlauben                       |
| Gleiche Origin   | `https://acecore.net/...` | Erlauben                       |
| Offizielles LINE | `https://lin.ee/...`      | Als offizieller Kanal erlauben |
| mailto           | `mailto:info@acecore.net` | Nur feste Adresse              |
| tel              | `tel:05088902788`         | Nur feste Nummer               |
| Andere externe   | Beliebige URL             | Standardmäßig nicht verlinken  |

```js
function isSafeMarkdownHref(href) {
  if (href.startsWith('/')) return true

  try {
    const url = new URL(href, window.location.origin)
    if (url.origin === window.location.origin) return true
    if (url.hostname === 'acecore.net') return true
    if (url.hostname === 'lin.ee') return true
  } catch {
    return false
  }

  return href === 'mailto:info@acecore.net' || href === 'tel:05088902788'
}
```

Eine Recruiting-Seite kann Jobportale erlauben, ein SaaS Dokumentation und Statusseite. Die Funktion muss zur Policy des Produkts passen.

## Fallback auf Text

Wenn ein Link die Validierung nicht besteht, ist Löschen nicht immer die beste Wahl.

Im Kontaktchat erhält Text den Kontext für Nutzer und zeigt Entwicklern, was das Modell ausgeben wollte. Der Renderer muss sichere Links erzeugen und sicher fehlschlagen können.

## Fehlerfälle testen

Mindestens diese Fälle sollten abgedeckt sein:

| Eingabe                            | Erwartung                            |
| ---------------------------------- | ------------------------------------ |
| `[Services](/services/)`           | Interner Link                        |
| `[Services]( /services/ )`         | Interner Link nach trim              |
| `[LINE]( https://lin.ee/example )` | Erlaubter externer Link              |
| `[Böse](javascript:alert(1))`      | Kein Link                            |
| `[Extern](https://example.com/)`   | Kein Link, wenn Domain nicht erlaubt |
| `[Kaputt](/services/`              | Anzeige als Text                     |

Im PR #99 wurde bestätigt, dass Varianten mit und ohne Leerzeichen auf dieselbe erwartete URL führen.

## Nicht ganz Markdown standardmäßig implementieren

Für Chat reicht meist:

- Absätze
- Listen
- Fett
- Inline-Code
- Links

Tabellen, Bilder, rohes HTML und Fußnoten vergrößern den Scope schnell. Selbst mit einer Bibliothek bleiben HTML- und URL-Policy eigene Entscheidungen.

## Zusammenfassung

Markdown-Link-Rendering in KI-Antworten wirkt wie ein kleines UI-Detail, legt aber die Vertrauensgrenze für Modellausgaben fest.

Praktisch heißt das: erst Text, kleine Teilmenge, trim vor Validierung, strenge Allowlist und sicherer Fallback.
