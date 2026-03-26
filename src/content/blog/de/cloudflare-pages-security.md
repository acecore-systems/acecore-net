---
title: 'Sichere statische Website-Bereitstellung mit Cloudflare Pages erreichen'
description: 'Ein Praxisleitfaden zum statischen Website-Deployment auf Cloudflare Pages und zur Konfiguration von Sicherheitsheadern/CSP mittels _headers. Behandelt auch, warum wir von Workers zurück zu Pages gewechselt sind.'
date: 2026-03-15
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ']
image: https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop&q=80
processFigure:
  title: Entwicklung der Deployment-Architektur
  steps:
    - title: Ersteinrichtung
      description: Die statische Website auf Cloudflare Pages bereitgestellt.
      icon: i-lucide-cloud
    - title: Worker-Migration
      description: Für die Kontaktformularverarbeitung zu Workers migriert.
      icon: i-lucide-server
    - title: Rückkehr zu Pages
      description: Durch Einführung eines externen Formulardienstes zur statischen Bereitstellung zurückgewechselt.
      icon: i-lucide-rotate-ccw
    - title: Sicherheitshärtung
      description: CSP und Sicherheitsheader über _headers konfiguriert.
      icon: i-lucide-shield-check
callout:
  type: info
  title: Workers vs. Pages
  text: Cloudflare Workers sind flexibel, aber für statische Websites überzeugt Pages bei Cache-Effizienz und Deployment-Einfachheit. Wählen Sie Pages, wenn Sie keine serverseitige Verarbeitung benötigen.
faq:
  title: Häufig gestellte Fragen
  items:
    - question: Sollte ich Cloudflare Pages oder Workers wählen?
      answer: Für statische Websites ohne serverseitige Verarbeitung ist Pages optimal. Die CDN-Integration ist nahtlos und das Deployment unkompliziert. Formularverarbeitung kann über externe Dienste abgewickelt werden.
    - question: Welche Sicherheitsheader sollten in der _headers-Datei gesetzt werden?
      answer: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy und Permissions-Policy sind die wesentlichen. Passen Sie die CSP entsprechend den externen Ressourcen an, die Ihre Website verwendet.
    - question: Wie erlaubt man AdSense und Analytics in den CSP-Einstellungen?
      answer: Fügen Sie die Domains googletagmanager.com und googlesyndication.com zu script-src hinzu. Möglicherweise müssen Sie auch verwandte Domains in img-src und connect-src erlauben.
---

Cloudflare Pages ist eine hervorragende Plattform für das Hosting statischer Websites. Dieser Artikel behandelt unser tatsächliches Deployment-Setup und die Sicherheitskonfiguration mittels der `_headers`-Datei.

## Deployment-Architektur: Warum wir Workers verlassen und zu Pages zurückgekehrt sind

Ursprünglich hatten wir geplant, Cloudflare Workers für die Backend-Verarbeitung des Kontaktformulars zu verwenden. Workers ermöglichen serverseitigen E-Mail-Versand und Validierung.

Allerdings stießen wir bei der Implementierung auf folgende Herausforderungen:

- **Build-Komplexität**: Die Bereitstellung von Astros Build-Ausgabe über Workers erforderte zusätzliche Konfiguration
- **Debugging-Aufwand**: Verhaltensunterschiede zwischen lokalem `wrangler dev` und der Produktionsumgebung
- **Cache-Kontrolle**: Pages integriert sich natürlicher in Cloudflares CDN

Letztlich haben wir [ssgform.com](https://ssgform.com/) als externen Dienst für das Kontaktformular eingeführt und damit die serverseitige Verarbeitung vollständig eliminiert. Dadurch entfiel der Bedarf an Workers, und wir konnten als rein statische Website auf Pages deployen.

## Sicherheitskonfiguration mit \_headers

Auf Cloudflare Pages können HTTP-Antwort-Header in der Datei `public/_headers` angegeben werden. Im Folgenden ein Auszug aus der tatsächlich verwendeten Konfiguration.

### Content-Security-Policy (CSP)

CSP ist ein kritischer Header zur Verhinderung von Cross-Site-Scripting (XSS)-Angriffen. Er spezifiziert erlaubte Ressourcen-Ursprünge nach dem Whitelist-Ansatz.

```text
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://acecore.net https://images.unsplash.com data:;
  connect-src 'self' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  frame-src https://challenges.cloudflare.com https://googleads.g.doubleclick.net;
  form-action https://ssgform.com;
```

Wichtige Punkte:

- **script-src**: Cloudflare Turnstile (`challenges.cloudflare.com`) und AdSense erlauben
- **img-src**: Den same-origin-Endpunkt von Cloudflare Images und Unsplash erlauben
- **form-action**: Formulareinsendungen ausschließlich auf ssgform.com beschränken
- **frame-src**: Turnstile-Iframes und AdSense-Werbeframes erlauben

### Weitere Sicherheitsheader

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- **X-Content-Type-Options**: MIME-Sniffing verhindern
- **X-Frame-Options**: Iframe-Einbettung als Clickjacking-Gegenmaßnahme verhindern
- **Referrer-Policy**: Bei Cross-Origin-Anfragen nur den Origin senden
- **Permissions-Policy**: Unnötige Browser-APIs (Kamera, Mikrofon, Geolokalisierung) deaktivieren

## Cache-Steuerung

Wir setzen langfristiges Caching für statische Assets und kürzeres Caching für HTML.

```text
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=3600
```

Die von Astro ausgegebenen Dateien im `_astro/`-Verzeichnis enthalten Content-Hashes, sodass sie sicher für ein Jahr mit `immutable` gecacht werden können. HTML hat eine moderate Aktualisierungshäufigkeit, daher begrenzen wir es auf einen einstündigen Cache.

## Pages Deployment-Konfiguration

Die Cloudflare Pages-Projekteinstellungen sind einfach:

| Einstellung | Wert |
| --- | --- |
| Build-Befehl | `npx astro build` |
| Ausgabeverzeichnis | `dist` |
| Node.js-Version | 22 |

Sobald Sie ein GitHub-Repository verbinden, lösen Pushes auf den `main`-Branch automatische Deployments aus. Preview-Deployments werden ebenfalls automatisch pro PR generiert, was Reviews erleichtert.

## Zusammenfassung

Der Schlüssel liegt in der Frage: „Brauche ich wirklich serverseitige Verarbeitung?" Durch den Einsatz externer Dienste zur Eliminierung von Workers wurden sowohl Deployment als auch Sicherheitsmanagement einfacher. Die CSP-Konfiguration über `_headers` erfordert anfänglich etwas Aufwand, aber einmal geschrieben, gilt sie für alle Seiten — was sie zu einer hocheffizienten Sicherheitsmaßnahme macht.
