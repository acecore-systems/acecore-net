---
title: 'Headless CMS-Auswahltagebuch — Warum wir Pages CMS gewählt haben und Bot-Schutz mit Turnstile'
description: 'Ein Bericht über die Evaluierung von Keystatic, Sveltia CMS und Pages CMS, die letztliche Einführung von Pages CMS sowie die Implementierung von Spam-Schutz für das Kontaktformular mit Cloudflare Turnstile.'
date: 2026-03-15
author: gui
tags: ['技術', 'CMS', 'セキュリティ']
image: https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&h=400&fit=crop&q=80
compareTable:
  title: CMS-Vergleich
  before:
    label: Keystatic / Sveltia CMS
    items:
      - Keystatic erfordert eine serverseitige Laufzeitumgebung
      - Sveltia CMS ist funktionsreich, hat aber eine hohe Lernkurve
      - Beide sind für ein Astro + Pages-Setup überdimensioniert
      - Die Einrichtung nimmt erheblich viel Zeit in Anspruch
  after:
    label: Pages CMS
    items:
      - Markdown direkt im GitHub-Repository bearbeiten
      - GUI-Editor ermöglicht Nicht-Entwicklern die Artikelaktualisierung
      - Kein Server erforderlich — perfekte Kompatibilität mit Pages
      - Konfiguration komplett mit nur .pages.yml
callout:
  type: tip
  title: Vorteile von Turnstile
  text: Im Gegensatz zu reCAPTCHA erfordert Cloudflare Turnstile keine Benutzeraktionen wie die Bildauswahl. Die Verifizierung erfolgt automatisch im Hintergrund und ermöglicht Bot-Schutz ohne UX-Einbußen.
faq:
  title: Häufig gestellte Fragen
  items:
    - question: Was ist Pages CMS?
      answer: Ein leichtgewichtiges CMS, mit dem Sie Markdown-Dateien in einem GitHub-Repository direkt über eine GUI bearbeiten können. Es benötigt keinen Server, die Konfiguration ist mit nur .pages.yml abgeschlossen, und auch Nicht-Entwickler können Artikel aktualisieren.
    - question: Wie unterscheidet sich Cloudflare Turnstile von reCAPTCHA?
      answer: Turnstile erfordert keine Benutzeraktionen wie Bildauswahl und verifiziert automatisch im Hintergrund. Es beeinträchtigt die UX nicht, respektiert die Privatsphäre und ist kostenlos verfügbar.
    - question: Wie kann man Formulareinsendungen auf einer statischen Website verarbeiten?
      answer: Durch die Verwendung externer Formulardienste wie ssgform.com oder Formspree können Formulareinsendungen ohne serverseitigen Code verarbeitet werden. Sie können auch mit Turnstile für Spam-Schutz kombiniert werden.
---

CMS-Auswahl ist eine unspektakuläre, aber wichtige Entscheidung. Dieser Artikel behandelt den Prozess der Evaluierung von drei CMS-Optionen und die Implementierung von Bot-Schutz mit Cloudflare Turnstile für das Kontaktformular.

## Der CMS-Auswahlprozess

Bei der Einführung eines CMS für unsere mit Astro gebaute statische Website haben wir die folgenden drei Kandidaten in die engere Auswahl genommen.

### Keystatic: Der erste Kandidat

Wir hatten Keystatic als typsicheres CMS beobachtet. Es unterstützt offiziell die Astro-Integration. Im lokalen Modus erfordert es jedoch eine serverseitige Laufzeitumgebung, die sich nicht gut mit dem statischen Deployment von Cloudflare Pages verträgt.

### Sveltia CMS: Funktionsreich, aber schwer

Sveltia CMS ist ein Fork von Decap CMS (ehemals Netlify CMS) mit einer modernen UI und umfangreichen Funktionen. Es war jedoch für die aktuelle Projektgröße (nur einige Blog-Einträge und eine Handvoll statischer Seiten) überdimensioniert. Wir planen eine Neubewertung, wenn die Inhalte in Zukunft wachsen.

### Pages CMS: Der Gewinner

[Pages CMS](https://pagescms.org/) ist ein leichtgewichtiges CMS, das Markdown-Dateien direkt im GitHub-Repository bearbeitet.

Die entscheidenden Faktoren waren:

- **Einfache Einrichtung**: Nur eine einzige `.pages.yml`-Datei hinzufügen
- **Kein Server erforderlich**: Funktioniert über die GitHub API ohne zusätzliche Infrastruktur
- **Markdown-nativ**: Integriert sich direkt mit Astros Content Collections
- **GUI-Editor**: Nicht-Entwickler im Team können Artikel im Browser bearbeiten

```yaml
# .pages.yml
content:
  - name: blog
    label: ブログ
    path: src/content/blog
    type: collection
    fields:
      - name: title
        label: タイトル
        type: string
      - name: date
        label: 公開日
        type: date
      - name: tags
        label: タグ
        type: string
        list: true
```

## Einführung von Cloudflare Turnstile

Wir haben Cloudflare Turnstile als Spam-Schutz für das Kontaktformular eingeführt.

### Warum Turnstile statt reCAPTCHA

Google reCAPTCHA v2 zwingt Benutzer zur Bildauswahl, und v3 ist punktebasiert, wirft aber Datenschutzbedenken auf. Cloudflare Turnstile ist in folgenden Punkten überlegen:

| Vergleich | reCAPTCHA v2 | reCAPTCHA v3 | Turnstile |
| --- | --- | --- | --- |
| Benutzeraktion | Bildauswahl erforderlich | Nicht erforderlich | Nicht erforderlich |
| Datenschutz | Cookie-basiertes Tracking | Verhaltensanalyse | Minimale Datenerfassung |
| Performance | Schwer | Mittel | Leicht |
| Preis | Kostenlos (begrenzt) | Kostenlos (begrenzt) | Kostenlos (unbegrenzt) |

### Implementierung

Die Einführung von Turnstile ist überraschend einfach.

#### 1. Widget im Cloudflare-Dashboard erstellen

Erstellen Sie ein Widget im Bereich „Turnstile" des Cloudflare-Dashboards und registrieren Sie die Ziel-Hostnamen (Produktionsdomain und `localhost`). Ein Site-Key wird ausgestellt.

#### 2. Widget zum Formular hinzufügen

```html
<!-- Load the Turnstile script -->
<script
  src="https://challenges.cloudflare.com/turnstile/v0/api.js"
  async
  defer
></script>

<!-- Place the widget inside the form -->
<form action="https://ssgform.com/s/your-form-id" method="POST">
  <!-- Form fields -->
  <input type="text" name="name" required />
  <textarea name="message" required></textarea>

  <!-- Turnstile widget -->
  <div
    class="cf-turnstile"
    data-sitekey="your-site-key"
    data-language="ja"
    data-theme="light"
  ></div>

  <button type="submit">Submit</button>
</form>
```

Die Einstellung `data-language="ja"` zeigt bei erfolgreicher Verifizierung „成功しました！" (Erfolg!) auf Japanisch an. `data-theme="light"` steuert die Hintergrundfarbe passend zum Website-Design.

#### 3. CSP-Header aktualisieren

Da Turnstile Iframes verwendet, muss es in der CSP ordnungsgemäß erlaubt werden.

```text
script-src: https://challenges.cloudflare.com
connect-src: https://challenges.cloudflare.com
frame-src: https://challenges.cloudflare.com
```

### Hinweis: Propagierungsverzögerung nach Widget-Erstellung

Unmittelbar nach der Erstellung eines Widgets im Cloudflare-Dashboard dauert es 1–2 Minuten, bis der Site-Key global propagiert ist. Während dieses Zeitraums tritt ein `400020`-Fehler auf, der sich jedoch nach kurzer Wartezeit von selbst löst.

## Verwendung von ssgform.com

Wir verwenden [ssgform.com](https://ssgform.com/) als Endpunkt für Formulareinsendungen. Es ist ein Formulardienst für statische Websites mit folgenden Vorteilen:

- Kein serverseitiger Code erforderlich
- Automatische E-Mail-Benachrichtigungen
- Unterstützt Turnstile-Token-Verifizierung
- Ausreichendes Sendevolumen im kostenlosen Plan

## Zusammenfassung

Sowohl bei der CMS- als auch bei der Bot-Schutz-Auswahl haben wir uns am Prinzip „das Minimum wählen" orientiert. Pages CMS kann in 5 Minuten eingerichtet werden, und Turnstile kann durch Hinzufügen weniger HTML-Zeilen implementiert werden. Gerade weil die Architektur einfach ist, bleiben die Betriebskosten niedrig.
