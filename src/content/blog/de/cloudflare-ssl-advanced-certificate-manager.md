---
title: 'Was war die frühere kostenpflichtige SSL-Option von Cloudflare? Von Dedicated SSL zu Advanced Certificate Manager'
description: 'Die früher kostenpflichtige Cloudflare-Option „Dedicated SSL Certificates“ wurde 2021 in „Advanced Certificate Manager (ACM)“ umbenannt und erweitert. Dieser Artikel erklärt die Unterschiede zu Universal SSL und wann ACM erforderlich ist.'
date: 2026-03-31T00:00
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ', 'インフラ']
image: https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=400&fit=crop&q=80
compareTable:
  title: Universal SSL vs Advanced Certificate Manager
  before:
    label: Universal SSL (Kostenlos)
    items:
      - Deckt nur Root-Domain + Subdomains der ersten Ebene ab
      - CA, Laufzeit und Cipher Suites sind nicht auswählbar
      - '*.example.com funktioniert, aber dev.staging.example.com ist nicht abgedeckt'
      - Cloudflare-Branding kann im Zertifikats-CN erscheinen
  after:
    label: Advanced Certificate Manager (Kostenpflichtig, 10 USD/Monat/Zone)
    items:
      - Unterstützt mehrstufige Subdomains, bis zu 50 Hostnamen
      - CA frei wählbar (Let's Encrypt / Google Trust Services usw.)
      - Gültigkeitsdauer zwischen 14 und 365 Tagen konfigurierbar
      - 'Eigene Domain als CN, Cloudflare-Branding wird ausgeblendet'
callout:
  type: info
  title: Hintergrund der Umbenennung
  text: 'Die frühere Bezeichnung „Dedicated SSL Certificates“ wurde 2021 als Advanced Certificate Manager (ACM) neu aufgelegt. Es war nicht nur ein neuer Name: Funktionen wie mehrstufige Subdomains, CA-Auswahl und Laufzeitsteuerung wurden deutlich erweitert.'
faq:
  title: Häufige Fragen
  items:
    - question: Kann ich mit Universal SSL ein Wildcard-Zertifikat (*.example.com) nutzen?
      answer: Ja, aber es deckt nur Subdomains der ersten Ebene wie www.example.com ab. Für Subdomains der zweiten Ebene oder tiefer wie dev.staging.example.com gilt es nicht, wodurch Zertifikatsfehler auftreten können. Dafür ist ACM nötig.
    - question: Kann ich Advanced Certificate Manager auch im Free-Plan nutzen?
      answer: Ja. Auch im kostenlosen Cloudflare-Plan kann ACM über das ACM-Add-on (10 USD/Monat/Zone) genutzt werden. Ein Upgrade auf einen höheren Plan ist nicht erforderlich.
    - question: Wann reicht Universal SSL aus?
      answer: Für die meisten privaten Websites und KMU-Seiten reicht Universal SSL aus. Wenn nur Root-Domain und Subdomains der ersten Ebene wie www genutzt werden, ist ACM nicht nötig.
    - question: Was passiert mit Universal SSL, wenn ACM aktiviert wird?
      answer: Universal SSL und ACM können parallel bestehen. Für dieselbe Subdomain wird das ACM-Zertifikat bevorzugt verwendet.
linkCards:
  - href: https://developers.cloudflare.com/ssl/edge-certificates/advanced-certificate-manager/
    title: Advanced Certificate Manager Dokumentation
    description: Offizieller Cloudflare-Leitfaden zur ACM-Konfiguration
    icon: i-lucide-file-text
  - href: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/
    title: Universal SSL Einschränkungen
    description: Offizielle Dokumentation zu nicht abgedeckten Universal-SSL-Fällen
    icon: i-lucide-alert-circle
  - href: https://www.cloudflare.com/ja-jp/application-services/products/advanced-certificate-manager/
    title: Advanced Certificate Manager Produktseite
    description: Funktionsübersicht und Kaufinformationen zu ACM (Japanisch)
    icon: i-lucide-shield-check
---

„Wie hieß nochmal die frühere kostenpflichtige SSL-Option bei Cloudflare?“ — das fragen sich viele. In diesem Artikel klären wir die genaue Bezeichnung sowie die heutigen Funktionen.

Für die Auslieferung statischer Websites mit Cloudflare Pages und die Umsetzung von CSP siehe auch [Sichere Auslieferung statischer Websites mit Cloudflare Pages](/blog/cloudflare-pages-security/).

## Fazit: „Dedicated SSL“ → „Advanced Certificate Manager (ACM)“

Die frühere kostenpflichtige SSL-Option bei Cloudflare hieß **Dedicated SSL Certificates**. Sie wurde **2021 überarbeitet und in „Advanced Certificate Manager (ACM)“ umbenannt**.

Der Preis ist wie damals: **10 USD pro Monat und Zone (Domain)**.

---

## Warum der Name geändert wurde

In der „Dedicated SSL“-Phase lag der Fokus auf der Ausstellung eines dedizierten Zertifikats für eine Domain. Während Universal SSL kostenlos Zertifikate mit anderen Sites teilte, bot das dedizierte Zertifikat einen eigenen Common Name (CN).

Mit dem Wechsel zu **Advanced Certificate Manager** kamen folgende Funktionen hinzu, und der Name betont stärker den „Manager“-Aspekt.

- **Mehrstufige Subdomains**: Schutz für Subdomains ab zweiter Ebene wie `dev.staging.example.com`
- **CA-Auswahl**: Auswahl zwischen Let's Encrypt, Google Trust Services usw.
- **Laufzeit festlegen**: Konfigurierbar von 14 bis 365 Tagen
- **Bis zu 50 Hostnamen**: Ein Zertifikat kann mehrere Hostnamen abdecken
- **Total TLS**: Automatischer Schutz aller proxied Subdomains in der Zone

---

## Unterschiede zu Universal SSL

Cloudflare bietet **Universal SSL** kostenlos an, und für die meisten Websites reicht das für HTTPS aus. Es gibt jedoch einige Einschränkungen.

### Fälle, die Universal SSL nicht abdeckt

```
# Von Universal SSL abgedeckt
example.com
www.example.com
blog.example.com

# Nicht von Universal SSL abgedeckt (ACM erforderlich)
dev.staging.example.com
api.v2.example.com
deep.sub.domain.example.com
```

Der Wildcard-Eintrag `*.example.com` funktioniert, aber **nur für Subdomains der ersten Ebene**. Mehrstufige Muster wie `*.staging.example.com` werden nicht unterstützt.

### Cloudflare-Branding im Zertifikat

Bei Universal SSL kann der Zertifikats-CN eine Cloudflare-Domain wie `sni.cloudflaressl.com` enthalten. Mit ACM wird die eigene Domain zum CN und Cloudflare-Branding ausgeblendet.

---

## Wann ACM erforderlich ist

Prüfen Sie ACM, wenn einer der folgenden Punkte zutrifft:

1. **Sie nutzen mehrstufige Subdomains**  
   Sie möchten SSL für Subdomains ab zweiter Ebene wie `api.staging.example.com` oder `dev.app.example.com`.

2. **Sie möchten die eigene Domain als CN**  
   Sie möchten Cloudflare-Branding aus dem Zertifikat entfernen (typisch bei Unternehmensseiten und B2B-Services).

3. **Sie möchten CA oder Laufzeit festlegen**  
   Ihre Sicherheitsrichtlinie verlangt eine bestimmte CA oder Sie benötigen kurzlebige Zertifikate (z. B. 14 Tage).

4. **Sie möchten alle Subdomains per Total TLS schützen**  
   Sie möchten automatische Zertifikatsabdeckung für alle proxied Subdomains der Zone.

---

## Kauf- und Aktivierungsschritte

Die Aktivierung erfolgt in wenigen Schritten im Cloudflare-Dashboard:

1. Öffnen Sie die Ziel-Domain im Cloudflare-Dashboard
2. Gehen Sie zu **SSL/TLS** → **Edge Certificates**
3. Klicken Sie im Abschnitt **Advanced Certificate Manager** auf **Enable**
4. Bestätigen und kaufen Sie das Abonnement (10 USD/Monat)
5. Erstellen Sie ein Zertifikat und fügen Sie die zu schützenden Hostnamen hinzu

Wenn Sie Total TLS aktivieren möchten, schalten Sie im Abschnitt **Total TLS** auf derselben Seite einfach auf On.

---

## Zusammenfassung

| Punkt | Universal SSL (Kostenlos) | Advanced Certificate Manager (10 USD/Monat/Zone) |
|---|---|---|
| Mehrstufige Subdomains | ✗ | ✓ |
| CA-Auswahl | ✗ | ✓ |
| Laufzeit festlegen | ✗ | ✓ |
| CN mit eigener Domain | △ | ✓ |
| Total TLS | ✗ | ✓ |
| Geeignet für | Private/allgemeine Sites | Unternehmen/komplexe Subdomain-Strukturen |

Die „frühere kostenpflichtige SSL-Option“ von Cloudflare ist **Advanced Certificate Manager (ehemals Dedicated SSL Certificates)**. Das ist besonders dann sinnvoll, wenn Universal SSL nicht ausreicht — insbesondere für mehrstufige Subdomains und feinere Zertifikatskontrolle.
