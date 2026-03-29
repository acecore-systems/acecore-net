---
title: 'Astro-Website-Qualitätsverbesserungsleitfaden, Fortsetzung - Letzte Anpassungen für 100 Punkte in allen PageSpeed-Insights-Kategorien'
description: 'Dokumentation der finalen Optimierungsrunde nach dem vorherigen Artikel: Cloudflare Web Analytics deaktivieren, 100 Punkte in allen vier PageSpeed-Insights-Kategorien auf Mobile und Desktop erreichen, den Netzwerk-Abhängigkeitsbaum einordnen, auf gemeinsame SVG-Icons umstellen und auch begründen, welche zusätzlichen Optimierungen bewusst nicht übernommen wurden.'
date: 2026-03-29T02:30
author: gui
tags: ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Fortsetzung des vorherigen Artikels
  text: 'Als Fortsetzung des vorherigen „Astro-Website-Qualitätsverbesserungsleitfadens“ hält dieser Beitrag die letzten Anpassungen fest, mit denen die Website 100 Punkte in allen PageSpeed-Insights-Kategorien erreicht hat. Zusätzlich werden die verbleibenden Diagnosen eingeordnet und die zusätzlichen Optimierungen erklärt, die bewusst nicht übernommen wurden.'
insightGrid:
  eyebrow: Warum das wichtig ist
  title: Warum 100 Punkte in allen PageSpeed-Kategorien weiterhin ein hohes Niveau bedeuten
  description: 100 bedeutet nicht, dass auf der Live-Website alles perfekt ist, zeigt aber, dass in den wichtigsten von Lighthouse geprüften Audits keine großen Lücken mehr vorhanden sind.
  variant: card
  items:
    - title: Gemessen unter slow 4G
      description: Die Mobile-Messung erfolgt unter slow 4G mit CPU-Verlangsamung. Selbst eine leichte statische Website erreicht 100 nicht ohne Weiteres.
      icon: i-lucide-gauge
      tone: brand
    - title: Volle Punktzahl in 4 Kategorien
      description: Es reicht nicht, nur Performance zu optimieren. Accessibility, Best Practices und SEO müssen gleichzeitig ebenfalls voll erfüllt sein.
      icon: i-lucide-shield-check
      tone: emerald
    - title: Drittanbieter-Elemente wurden bereinigt
      description: Externe Beacons und unnötige Abhängigkeiten müssen reduziert werden, ohne wirklich benötigte Elemente wie GA4 oder Werbung zu verlieren.
      icon: i-lucide-sparkles
      tone: amber
    - title: Diagnosen müssen eingeordnet werden
      description: Ziel ist nicht, jeden Insight-Wert auf null zu bringen, sondern zu entscheiden, ob die verbleibenden Diagnosen akzeptabel sind.
      icon: i-lucide-search
      tone: slate
processFigure:
  title: Schritte der letzten Anpassung
  steps:
    - title: Messen
      description: Die Mobile- und Desktop-Ergebnisse von PageSpeed Insights sowie die verbliebenen Diagnosen prüfen.
      icon: i-lucide-gauge
    - title: Ordnen
      description: Die Rolle von Cloudflare Web Analytics neu bewerten und das unnötige Beacon stoppen.
      icon: i-lucide-shield-check
    - title: Beheben
      description: Das dynamische Icon-Rendering auf das gemeinsame SVG-Icon-Component vereinheitlichen und fehlende Icons beseitigen.
      icon: i-lucide-wrench
    - title: Entscheiden
      description: Zusätzliche CSS-Aufteilung und weitere Kürzungen bei Drittanbietern vergleichen und Varianten mit geringem Gegenwert verwerfen.
      icon: i-lucide-scale-3d
compareTable:
  title: Was die letzten Anpassungen verändert haben
  before:
    label: Vorher
    items:
      - Der Mobile-Score war bereits hoch, aber das Cloudflare-Web-Analytics-Beacon war noch vorhanden
      - Die Bedeutung der verbleibenden PageSpeed-Diagnosen war unklar, daher fehlte ein Kriterium, wann man aufhören sollte
      - In manchen Artikeln konnten wegen verbliebener UnoCSS-Icon-Klassen leere Kreise erscheinen
      - Beiträge vom selben Tag wurden nur über das Datum verwaltet, sodass die Reihenfolge schwanken konnte
  after:
    label: Nachher
    items:
      - Alle vier Kennzahlen stehen auf Mobile und Desktop bei 100
      - Cloudflare Web Analytics wurde deaktiviert und die Messung auf GA4 fokussiert
      - Das Rendering wurde auf das gemeinsame SVG Icon vereinheitlicht, alte Icon-Namen werden per Alias abgefangen
      - Zusätzliche Optimierungen mit geringem Gegenwert wurden bewusst verworfen, und der sinnvolle Stoppunkt ist jetzt klar
checklist:
  title: Abgeschlossene Punkte
  items:
    - text: Cloudflare Web Analytics deaktiviert und Beacon-Injektion gestoppt
      checked: true
    - text: 100 Punkte in allen PageSpeed-Insights-Kategorien auf Mobile und Desktop bestätigt
      checked: true
    - text: Den Netzwerk-Abhängigkeitsbaum eingeordnet und festgehalten, dass BaseLayout.css der einzige größere verbleibende Engpass ist
      checked: true
    - text: Die dynamischen Icon-Klassen in ProcessFigure und StatBar auf das gemeinsame Icon-Component migriert
      checked: true
    - text: Alias-Kompatibilität für den alten Namen check-circle hinzugefügt
      checked: true
    - text: Blog-Daten um Stunden und Minuten erweitert, einschließlich Zeiteingabe in Pages CMS
      checked: true
linkCards:
  - href: /blog/website-improvement-batches/
    title: 'Vorheriger Artikel: Gesamtüberblick der Qualitätsverbesserungen'
    description: Beginnen Sie mit dem vorherigen Hub-Artikel, um das Gesamtbild der mehr als 150 Verbesserungen zu erfassen.
    icon: i-lucide-book-open
  - href: /blog/astro-performance-tuning/
    title: Artikel zur Performance-Optimierung
    description: Erklärt ausführlich CSS-Auslieferung, Schriften, Bilder und die Optimierung externer Skripte.
    icon: i-lucide-gauge
  - href: /blog/astro-accessibility-guide/
    title: Artikel zur Barrierefreiheit
    description: Ordnet die konkreten Maßnahmen zur Erreichung von WCAG AA und Accessibility 100.
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: Artikel zu UX und Codequalität
    description: Fasst Qualitätsverbesserungen rund um View Transitions, Suche und Typsicherheit zusammen.
    icon: i-lucide-sparkles
faq:
  title: Häufige Fragen
  items:
    - question: Wenn eine Website bei PageSpeed Insights 100 Punkte erreicht, kann man sie dann als die schnellste mögliche Website bezeichnen?
      answer: 'Nicht im absoluten Sinn. PageSpeed Insights ist eine Labor-Messung auf Basis von Lighthouse und bildet reale Nutzernetzwerke, Geräte und Server-Auslastung nicht vollständig ab. Dennoch bedeuten 100 Punkte, dass sich die Website in einem sehr hohen Qualitätszustand mit nur wenigen Lücken in den wichtigsten Lighthouse-Audits befindet.'
    - question: Warum können der Netzwerk-Abhängigkeitsbaum oder render-blocking CSS noch sichtbar sein, obwohl der Score 100 beträgt?
      answer: 'Diese Punkte sind nicht immer fehlgeschlagene Audits. Sie können auch als Diagnoseinformationen erscheinen. In diesem Fall verbleibt nur BaseLayout.css auf dem kritischen Pfad, doch Mobile 100 bleibt stabil, daher ist das aktuelle Kosten-Nutzen-Verhältnis akzeptabel.'
    - question: Warum wurde Cloudflare Web Analytics deaktiviert?
      answer: 'GA4 deckte die Event-Messung für CTA, Suche und Kontakt bereits ausreichend ab, während die Cloudflare-Seite weitgehend auf Performance-Beobachtung beschränkt war. Dieses Mal wurde auch der Einfluss des Beacons auf PageSpeed berücksichtigt, weshalb die Messung um GA4 herum neu geordnet wurde.'
    - question: Gab es Optimierungen, die geprüft, aber nicht übernommen wurden?
      answer: 'Ja. Verglichen wurden unter anderem eine weitere Aufteilung von BaseLayout.css, Anpassungen nur mit dem Ziel, die Anzeige des network dependency tree verschwinden zu lassen, und sogar eine stärkere Reduktion von Drittanbietern bis hin zu GA4. Da Mobile 100 bereits stabil war, hätten diese Varianten mehr Komplexität oder Messverlust als echten Nutzen gebracht und wurden daher verworfen.'
---

## Einleitung

Im vorherigen [Astro-Website-Qualitätsverbesserungsleitfaden](/blog/website-improvement-batches/) habe ich die große Menge an Verbesserungen zusammengefasst, die auf die erneuerte Acecore-Website angewendet wurden. Dieser Artikel ist die direkte Fortsetzung.

Dieser Artikel schließt die kleineren Punkte ab, die nach der Veröffentlichung des vorherigen Beitrags noch offen waren, und bringt die Website in einen Zustand, in dem **alle vier PageSpeed-Insights-Kategorien sowohl auf Mobile als auch auf Desktop 100 Punkte erreichen**. Es ging dabei nicht nur um den Score: Auch die Messbasis wurde neu geordnet, das Icon-Rendering stabilisiert und der sinnvolle Stoppunkt für weitere Optimierungen wurde ausdrücklich festgehalten.

## Ergebnis: 100 Punkte in allen PageSpeed-Insights-Kategorien

Zum 29. März 2026 zeigte die Acecore-Startseite die folgenden Ergebnisse.

| Bereich | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| Mobile | **100** | **100** | **100** | **100** |
| Desktop | **100** | **100** | **100** | **100** |

Unten stehen die tatsächlichen PageSpeed-Insights-Screenshots zusammen mit den Report-URLs. In der vorherigen Runde sah ich „Mobile 99 / alles andere 100“ als realistische Obergrenze an. Dieses Mal ließ sich durch das Entfernen unnötiger Drittanbieter-Beacons und das sorgfältige Einordnen der verbleibenden Diagnosen die 100 erreichen.

### Bericht-URLs

Damit nicht nur Screenshots, sondern auch direkt wieder aufrufbare Nachweise erhalten bleiben, lasse ich hier auch die Report-URLs dieser Messung stehen.

- [Mobile-Bericht](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile)
- [Desktop-Bericht](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop)

<figure class="not-prose my-8">
  <figcaption class="text-base font-700 text-slate-800 mb-3">Gemessene Screenshots</figcaption>
  <p class="text-sm text-slate-500 mb-4">Ein Klick auf das Bild öffnet direkt den passenden PageSpeed-Insights-Bericht.</p>
  <div class="grid gap-4 md:grid-cols-2">
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-mobile-summary-20260329.webp" alt="PageSpeed-Insights-Mobile-Ergebnis der Acecore-Startseite vom 29. März 2026. Performance, Accessibility, Best Practices und SEO stehen alle auf 100." class="w-full rounded-lg border border-slate-200" width="1160" height="340" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">Mobile</span>
    </a>
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-desktop-summary-20260329.webp" alt="PageSpeed-Insights-Desktop-Ergebnis der Acecore-Startseite vom 29. März 2026. Performance, Accessibility, Best Practices und SEO stehen alle auf 100." class="w-full rounded-lg border border-slate-200" width="1190" height="270" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">Desktop</span>
    </a>
  </div>
</figure>

## Wie bemerkenswert ist eine 100?

Bei 100 Punkten könnte man schnell denken, dass Performance immer weiter steigt, wenn man nur genug Funktionen entfernt, das Erscheinungsbild vereinfacht und externe Elemente streicht. Ein Stück weit stimmt das sogar: Eine statische Website wird oft schneller, je mehr man herausnimmt.

Hier ging es aber nicht darum, eine möglichst leere Demo-Seite zu bauen. GA4, Werbung, Suche, ClientRouter und gemeinsames CSS mussten im produktiven Betrieb erhalten bleiben, und trotzdem sollten Mobile und Desktop in allen vier Kategorien bei 100 landen. Entscheidend war also nicht nur, die Website leichter zu machen, sondern festzulegen, was bleiben muss, was entfernt werden kann und was man bewusst nicht weiter anfasst.

Natürlich bedeutet eine 100 nicht, dass dies absolut die schnellste Website der realen Welt ist. Die tatsächliche Nutzererfahrung hängt von Netzwerk, Geräten, Region und Cache-Status ab. Trotzdem kann man sagen, dass die Website ein sehr hohes Niveau erreicht hat, weil **die wichtigsten Lighthouse-Audits keine größeren Lücken mehr zeigen, obwohl die nötigen Betriebselemente erhalten blieben**.

## Die letzten Anpassungen bis 100 Punkte

### 1. Cloudflare Web Analytics deaktiviert und die Messung auf GA4 ausgerichtet

Cloudflare Web Analytics ist als privacy-first und leichtgewichtiges RUM-Produkt nützlich, doch auf Acecore war die GA4-Seite bereits breit für CTA-Klicks, Suche, Kontaktaktionen, Lead-Generierung und weitere Events instrumentiert.

Nach einer erneuten Rollenprüfung kam ich zu dem Schluss, dass auf der Cloudflare-Seite die Kosten eines unnötigen Beacons in PageSpeed inzwischen höher waren als sein Nutzen. Ich deaktivierte daher RUM im Dashboard und bestätigte, dass `static.cloudflareinsights.com/beacon.min.js` nicht mehr im Produktions-HTML auftauchte.

### 2. Die verbleibenden PageSpeed-Diagnosen eingeordnet

Selbst wenn der Score 100 erreicht, kann PageSpeed weiterhin Diagnosen wie `Network dependency tree` oder `render-blocking resources` anzeigen. Wenn man diese pauschal als Warnungen interpretiert, die vollständig verschwinden müssen, jagt man schnell Optimierungen mit geringem Gegenwert hinterher.

Die kritische Kette sah in diesem Fall ungefähr so aus:

1. `/en/`
2. `ClientRouter.js`
3. `BaseLayout.css`
4. `BaseLayout.js`

Von diesen Punkten blieb tatsächlich nur `BaseLayout.css` als render-blocking übrig. Die Datei ist inzwischen jedoch klein genug, und Mobile 100 bleibt stabil, daher habe ich sie vorerst als „verbleibende, aber akzeptable Diagnose“ eingeordnet. Diese Einschätzung ausdrücklich zu formulieren war bereits ein wichtiger Gewinn, weil sie eine klare Stoppregel für spätere Optimierungen liefert.

### 3. Icon-Rendering auf ein gemeinsames SVG-Component vereinheitlicht

Im Zuge der letzten Anpassungen befand sich das Projekt bereits im Übergang von UnoCSS-Icon-Utilities zum gemeinsamen SVG-basierten `Icon`-Component. In diesem Prozess blieben einige dynamische Icon-Klassen in `ProcessFigure` und `StatBar` zurück, wodurch in manchen Artikeln nur leere Kreise angezeigt wurden.

Ich habe das Rendering auf der Komponenten-Seite über `Icon` vereinheitlicht und zusätzlich einen Alias ergänzt, der den alten Namen `check-circle` in `circle-check` aufnimmt.

Dadurch ergaben sich drei praktische Vorteile:

- Icons verschwinden deutlich seltener, weil eine dynamische Klasse übersehen wurde
- Barrierefreiheitsattribute wie `aria-hidden` lassen sich auf der SVG-Seite vereinheitlichen
- Der Betrieb wird stabiler, weil das Rendering nicht mehr von der statischen Analyse von UnoCSS abhängt

### 4. Geprüft, aber nicht übernommen

Sobald 100 Punkte erreicht sind, liegt die Versuchung nahe, jede verbleibende Diagnose noch um jeden Preis verschwinden zu lassen. Einige Richtungen habe ich dafür verglichen, aber nicht übernommen.

- `BaseLayout.css` noch weiter aufzuteilen: Das könnte die Diagnosen optisch etwas sauberer wirken lassen, doch Mobile 100 bleibt bereits stabil und der praktische Nutzen rechtfertigt die zusätzliche Komplexität nicht.
- Die bloße Anzeige des `network dependency tree` vollständig verschwinden zu lassen: Eine angezeigte Diagnose ist nicht automatisch ein echtes Problem für Nutzerinnen und Nutzer.
- Selbst GA4 zu streichen, um Drittanbieter noch stärker zu reduzieren: Das würde die Seite zwar etwas leichter machen, aber zugleich wichtige Business-Messungen opfern.

Gerade dieser Vergleich war wichtig. Die letzten Anpassungen waren nicht deshalb abgeschlossen, weil alles nur Denkbare entfernt wurde, sondern weil die verbleibenden Abwägungen nun klar und belastbar benannt werden konnten.

## Praktische Erkenntnisse aus den letzten Anpassungen

Der größte Gewinn bestand dieses Mal nicht nur darin, 100 Punkte zu erreichen. Entscheidend war, einen Zustand zu erreichen, in dem **ich erklären kann, was entfernt werden sollte und was sinnvollerweise bleiben darf**.

Cloudflare Web Analytics lohnt sich zum Beispiel zu entfernen, wenn es nur noch aus Gewohnheit vorhanden ist, während GA4 bleiben sollte, weil es den Kern der Business-Event-Messung bildet. Ebenso ist `network dependency tree` nicht automatisch ein Fehler; man muss den Inhalt betrachten und beurteilen, ob die verbleibende Kette angemessen ist.

Ich habe außerdem KI genutzt, um das Feld möglicher Änderungen breiter zu öffnen. Die endgültigen Kriterien blieben aber drei sehr konkrete Fragen: Verbessern sich die Messwerte tatsächlich, steigen die Betriebskosten nicht übermäßig, und bleiben die nötigen Messfunktionen erhalten? KI war hilfreich für die Breite der Optionen, entschieden wurde am Ende dennoch anhand von Messung und Urteil.

Wenn man nur dem Score hinterheroptimiert, geht die Abstimmung schnell zu weit. Dieses Mal konnte ich nicht nur die Korrekturen, sondern auch die Grenze zum sinnvollen Stopp klar ordnen. Daher kann man sagen, dass die Verbesserungen der Acecore-Website vorerst einen abgeschlossenen Zustand erreicht haben.

## Zusammenfassung

Als Fortsetzung des vorherigen Artikels wurden mit den letzten Anpassungen die folgenden Punkte abgeschlossen:

- 100 Punkte in allen PageSpeed-Insights-Kategorien auf Mobile und Desktop bestätigt
- Cloudflare Web Analytics deaktiviert und die Messung auf GA4 ausgerichtet
- Verbleibende Netzwerk-Diagnosen eingeordnet und akzeptable Restpunkte klar benannt
- Fehlende Icon-Darstellung durch Vereinheitlichung auf das gemeinsame SVG `Icon` beseitigt
- Zusätzliche Optimierungen mit geringem Gegenwert verworfen und den sinnvollen Stoppunkt klar benannt

Zumindest aus Sicht von Lighthouse und PageSpeed Insights wurde die Acecore-Website auf ein Niveau gebracht, das legitimerweise Spitzengeschwindigkeit anstreben kann. Gleichzeitig ist der Score nicht das Ziel, sondern nur das Ergebnis. Ich werde daher sowohl den Betrieb als auch weitere Verbesserungen fortführen, damit dieser Zustand nicht wieder verloren geht.
