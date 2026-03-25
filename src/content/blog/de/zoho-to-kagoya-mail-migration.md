---
title: 'Zoho Mail zu KAGOYA MAIL Migrationsleitfaden — DNS, Authentifizierung & Datenprüfung in der Praxis'
description: 'Ein Praxisleitfaden für die vollständige Migration von Zoho Workplace zu KAGOYA MAIL, einschließlich Schritt-für-Schritt-Anleitungen, DNS-Konfiguration, SPF/DKIM-Authentifizierung und einer umfassenden Datenprüfung aller Zoho Workplace-Dienste.'
date: 2026-03-16
author: gui
tags: ['技術', 'メール', 'DNS', 'インフラ']
image: https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=800&h=400&fit=crop&q=80
processFigure:
  title: Gesamtablauf der Migration
  steps:
    - title: KAGOYA-Einrichtung
      description: Domain hinzufügen und E-Mail-Konten erstellen.
      icon: i-lucide-server
    - title: E-Mail-Datenmigration
      description: Export von Zoho → IMAP-Import nach KAGOYA.
      icon: i-lucide-hard-drive-download
    - title: DNS-Umstellung
      description: MX, SPF und DKIM auf KAGOYA umstellen.
      icon: i-lucide-globe
    - title: Authentifizierungstest
      description: SPF und DKIM PASS verifizieren, dann Sende-/Empfangstest durchführen.
      icon: i-lucide-shield-check
    - title: Zoho-Datenprüfung
      description: Verbleibende Daten in allen Workplace-Diensten überprüfen und auswerten.
      icon: i-lucide-clipboard-check
    - title: Zoho-Kündigung
      description: Das Abonnement kündigen.
      icon: i-lucide-log-out
callout:
  type: warning
  title: DNS-Umstellungswarnung
  text: Nach der Änderung der MX-Einträge gibt es einen Zeitraum von mehreren Stunden bis zu 48 Stunden, in dem E-Mails möglicherweise noch an den alten Server zugestellt werden. Bei Verwaltung über Cloudflare sollte die TTL vor der Umstellung auf 2 Minuten verkürzt werden, um die Auswirkungen zu minimieren.
compareTable:
  title: Konfiguration vorher und nachher
  before:
    label: Zoho Workplace Standard
    items:
      - Zoho Mail (30 GB-Plan)
      - WorkDrive / Cliq / Calendar gebündelt (nach Nextcloud-Migration ungenutzt)
      - ¥1.440/Monat (3 Benutzer, Pro-Benutzer-Preismodell)
      - SPF verwendet include:zoho.jp
      - DKIM verwendet zmail._domainkey
  after:
    label: KAGOYA MAIL Bronze
    items:
      - KAGOYA MAIL (virtueller dedizierter Server mit dedizierter IP)
      - Reiner E-Mail-Server, unbegrenzte Benutzer
      - ¥3.300/Monat (¥2.640/Monat bei Jahresabrechnung)
      - SPF verwendet include:kagoya.net
      - DKIM verwendet kagoya._domainkey
checklist:
  title: Migrations-Checkliste
  items:
    - text: Domain hinzufügen und Konten bei KAGOYA erstellen
      checked: true
    - text: Zoho E-Mail-Daten als ZIP exportieren
      checked: true
    - text: IMAP-Import nach KAGOYA
      checked: true
    - text: MX-Einträge in Cloudflare DNS umstellen
      checked: true
    - text: SPF-Eintrag auf kagoya.net aktualisieren
      checked: true
    - text: DKIM-Eintrag auf kagoya._domainkey aktualisieren
      checked: true
    - text: DMARC-Richtlinie konfigurieren
      checked: true
    - text: Sende-/Empfangstest und SPF/DKIM PASS-Verifizierung
      checked: true
    - text: Alle Zoho Workplace-Dienstdaten prüfen
      checked: true
    - text: Zoho-Abonnement kündigen
      checked: true
faq:
  title: Häufige Fragen
  items:
    - question: Gibt es während der Migration einen Zeitraum, in dem E-Mails nicht ankommen?
      answer: Bei kurz eingestellter DNS-TTL beträgt dieser nur wenige Minuten bis einige Stunden. Bei Verwaltung über Cloudflare ist die Umstellung auf 2 Minuten TTL vor dem Wechsel die beste Methode zur Minimierung der Auswirkungen. Überprüfen Sie den alten Server nach der Umstellung noch einige Tage.
    - question: Wie exportiert man E-Mail-Daten aus Zoho?
      answer: Gehen Sie zu Zoho Mail Admin-Panel → Datenverwaltung → Postfach exportieren. Sie können pro Konto im ZIP-Format exportieren, das EML-Dateien enthält.
    - question: Was passiert, wenn man nur SPF oder DKIM einrichtet, aber nicht beides?
      answer: Die Wahrscheinlichkeit steigt, dass empfangende Mailserver Ihre E-Mails als Spam markieren. Gmail ist dabei besonders streng geworden und erfordert in immer mehr Fällen, dass sowohl SPF als auch DKIM PASS erreichen.
    - question: Was passiert mit den Daten, wenn man Zoho Workplace kündigt?
      answer: Nach Ablauf des kostenpflichtigen Plans erfolgt ein Übergang zum kostenlosen Plan. Auch der kostenlose Plan hat Speichergrenzen, daher sollten notwendige Daten vorher exportiert werden. Das Löschen des Kontos selbst entfernt alle Daten dauerhaft.
---

Sie möchten von Zoho Workplace zu einem anderen E-Mail-Dienst migrieren, machen sich aber Sorgen über DNS- und E-Mail-Authentifizierungseinstellungen? Dieser Praxisleitfaden führt Sie durch den Prozess. Am Beispiel der Migration von Zoho Mail zu KAGOYA MAIL behandeln wir die DNS-Umstellung, SPF/DKIM-Authentifizierung und die Datenprüfung des alten Dienstes.

## Kommt Ihnen das bekannt vor?

Zoho Workplace ist eine Groupware-Suite, die Mail, WorkDrive, Cliq, Calendar und viele weitere Dienste bündelt. Aber befinden Sie sich vielleicht in einer solchen Situation?

- Sie nutzen nur die E-Mail-Funktion, zahlen aber für die gesamte Groupware-Suite
- Der Dateispeicher wurde bereits zu einem anderen Dienst migriert (Nextcloud, Google Drive usw.)
- Das Pro-Benutzer-Preismodell wird mit wachsendem Team zur Belastung

In solchen Fällen wird die Migration zu einem reinen E-Mail-Dienst zu einer sinnvollen Option.

## Warum KAGOYA MAIL?

KAGOYA MAIL ist ein reiner E-Mail-Dienst für geschäftliche Nutzung. Folgende Punkte sind zu beachten:

- **Dedizierter virtueller Server mit dedizierter IP** — Im Gegensatz zu Shared Hosting mit WordPress sind Zustellrate und Stabilität Ihrer E-Mails höher
- **Pauschalpreismodell mit unbegrenzten Benutzern** — Im Gegensatz zu Zohos Pro-Benutzer-Preismodell können Konten frei hinzugefügt werden
- **Inlandsserver** mit starker Erfolgsbilanz im Unternehmenseinsatz, standardmäßiger SPF/DKIM/DMARC-Unterstützung
- IMAP/SMTP-Unterstützung ermöglicht die weitere Nutzung bestehender E-Mail-Clients

Der Bronze-Plan kostet ¥3.300/Monat (¥2.640/Monat bei Jahresabrechnung). Im Vergleich zu Zoho Workplace Standard (¥1.440/Monat für 3 Benutzer) sind die reinen Kosten höher, aber unter Berücksichtigung der dedizierten E-Mail-Umgebung, der dedizierten IP und der unbegrenzten Benutzer lohnt sich die Investition in E-Mail-Zuverlässigkeit.

## SCHRITT 1: Ziel vorbereiten

Fügen Sie Ihre benutzerdefinierte Domain hinzu und erstellen Sie E-Mail-Konten im KAGOYA-Kontrollpanel.

1. **Domaineinstellungen → Benutzerdefinierte Domain hinzufügen** zur Registrierung Ihrer Domain
2. Standardzustellungseinstellung auf „Als Fehler behandeln" setzen (für E-Mails an nicht vorhandene Adressen)
3. Die benötigten E-Mail-Konten erstellen

## SCHRITT 2: Zoho E-Mail-Daten exportieren

Exportieren Sie E-Mail-Daten aus dem Zoho Mail Admin-Panel, Konto für Konto.

1. Gehen Sie zu **Admin-Panel → Datenverwaltung → Postfach exportieren**
2. Zielmailbox auswählen und Export starten
3. ZIP-Datei nach Erstellung herunterladen

Die ZIP-Datei enthält E-Mail-Dateien im EML-Format. Je nach Anzahl der Konten und E-Mail-Volumen kann der Export mehrere zehn Minuten dauern, planen Sie entsprechend.

## SCHRITT 3: IMAP-Import

Importieren Sie die exportierten EML-Dateien auf den Ziel-IMAP-Server. Die manuelle Durchführung ist mühsam, daher wird die Automatisierung mit einem Python-Skript empfohlen.

```python
import imaplib
import email
import glob

# KAGOYA IMAP connection
imap = imaplib.IMAP4_SSL("mail-server-name", 993)
imap.login("account-name", "password")
imap.select("INBOX")

# Bulk upload EML files
for eml_path in glob.glob("export/**/*.eml", recursive=True):
    with open(eml_path, "rb") as f:
        msg = f.read()
    imap.append("INBOX", None, None, msg)

imap.logout()
```

## SCHRITT 4: DNS-Umstellung

Ändern Sie die DNS-Einträge, um die E-Mail-Zustellung umzuleiten. Dieses Beispiel verwendet Cloudflare, die Einstellungen sind jedoch unabhängig vom DNS-Anbieter identisch.

### MX-Einträge

Löschen Sie die Zoho MX-Einträge (`mx.zoho.jp` / `mx2.zoho.jp` / `mx3.zoho.jp`) und registrieren Sie den neuen Mailserver. Für KAGOYA MAIL:

| Typ | Name | Wert | Priorität |
| --- | --- | --- | --- |
| MX | (Ihre Domain) | dmail.kagoya.net | 10 |

### SPF-Eintrag

```
v=spf1 include:kagoya.net ~all
```

Ändern Sie das alte `include:zoho.jp` zu `include:kagoya.net`.

### DKIM-Eintrag

Beziehen Sie den öffentlichen Schlüssel aus den **DKIM-Einstellungen** im KAGOYA-Kontrollpanel und registrieren Sie ihn als TXT-Eintrag.

| Typ | Name | Wert |
| --- | --- | --- |
| TXT | kagoya.\_domainkey.(Ihre Domain) | v=DKIM1;k=rsa;p=(öffentlicher Schlüssel) |

Löschen Sie den alten `zmail._domainkey` (Zoho)-Eintrag.

### DMARC-Eintrag

```
v=DMARC1; p=quarantine; rua=mailto:(Berichtsadresse)
```

Die Aktualisierung der Richtlinie von `none` auf `quarantine` stärkt den Spoofing-Schutz.

## SCHRITT 5: Sende-/Empfangstest

Überprüfen Sie nach der DNS-Umstellung immer diese vier Punkte:

1. **Können Sie von extern empfangen?** — Senden Sie eine Test-E-Mail von Gmail usw.
2. **Können Sie nach extern senden?** — Senden Sie von KAGOYA an Gmail usw.
3. **SPF PASS** — Prüfen Sie in den empfangenen E-Mail-Headern auf `spf=pass`
4. **DKIM PASS** — Prüfen Sie in den empfangenen E-Mail-Headern auf `dkim=pass`

Die E-Mail-Header-Überprüfung kann mit Python automatisiert werden. Insbesondere die SPF/DKIM PASS-Bestätigung ist visuell leicht zu übersehen, daher ist die Extraktion per Skript zuverlässiger.

```python
import imaplib
import email

imap = imaplib.IMAP4_SSL("mail-server-name", 993)
imap.login("account-name", "password")
imap.select("INBOX")
_, data = imap.search(None, "ALL")

for num in data[0].split()[-3:]:  # Latest 3 emails
    _, msg_data = imap.fetch(num, "(RFC822)")
    msg = email.message_from_bytes(msg_data[0][1])
    auth = msg.get("Authentication-Results", "")
    print(f"Subject: {msg['Subject']}")
    print(f"Auth: {auth[:200]}")
    print()

imap.logout()
```

## SCHRITT 6: Datenprüfung des alten Dienstes

Zoho Workplace bündelt neben E-Mail viele Dienste, darunter WorkDrive, Cliq, Calendar und Contacts. Überprüfen Sie vor der Kündigung, dass in jedem Dienst keine Daten verbleiben.

### Zu prüfende Dienste und Entscheidungskriterien

| Dienst | Was zu prüfen ist |
| --- | --- |
| Zoho Mail | Wurden die Daten in den neuen Dienst importiert? |
| Zoho WorkDrive | Ist die Speichernutzung bei 0? Auch Papierkorb prüfen |
| Zoho Contacts | Anzahl der Kontakte. Bei Bedarf als CSV/VCF exportieren |
| Zoho Calendar | Verbleibende Termine oder Erinnerungen |
| Zoho Cliq | Ob der Chatverlauf aufbewahrt werden muss |
| Andere (Notebook, Writer, Sheet usw.) | Erstellte Dokumente |

### WorkDrive-Fallstrick: Papierkorb verbraucht Speicher

Ein leicht zu übersehendes Problem ist der Papierkorb von WorkDrive. In unserem Fall zeigte das Admin-Panel etwa 45 GB Speichernutzung an, aber beim Öffnen der Ordner stand „Keine Elemente."

Die Ursache: **Alle Daten befanden sich im Papierkorb des Team-Ordners**. Daten, die während der vorherigen Nextcloud-Migration gelöscht wurden, waren die ganze Zeit im Papierkorb verblieben.

Die Speicheranzeige im Admin-Panel berücksichtigt Daten im Papierkorb. „Belegter Speicher ≠ Daten, die gesichert werden müssen", prüfen Sie daher vor der Entscheidung den Papierkorb.

## SCHRITT 7: Zoho-Abonnement kündigen

Sobald die Datenprüfung abgeschlossen ist und Senden/Empfangen beim neuen Dienst ordnungsgemäß funktioniert, fahren Sie mit der Kündigung fort.

1. Öffnen Sie **Zoho Mail Admin-Panel → Abonnementverwaltung → Übersicht**
2. Klicken Sie auf den Link **Abonnementverwaltung**, um zum Zoho Store zu gelangen
3. Klicken Sie auf **Plan ändern**
4. Klicken Sie unten auf der Seite auf **Abonnement kündigen**
5. Wählen Sie einen Grund und bestätigen Sie **Zum kostenlosen Plan wechseln**

Wenn „Am Ende des aktuellen Abrechnungszeitraums automatisch herabstufen" aktiviert ist, können Sie die Funktionen des kostenpflichtigen Plans bis zum Periodenende weiter nutzen, danach erfolgt automatisch der Übergang zum kostenlosen Plan. Um ein Sicherheitsnetz für Rollbacks zu behalten, empfehlen wir, nicht sofort zu löschen und den kostenlosen Plan eine Weile zu beobachten.

## Erkenntnisse

1. **DNS-TTL im Voraus verkürzen**, um die Auswirkungen während der Umstellung zu minimieren
2. **Sowohl SPF als auch DKIM sind unverzichtbar**. Nur eines zu haben erhöht das Risiko, als Spam markiert zu werden, insbesondere bei Gmail
3. **Vorsicht vor „sichtbaren, aber unnötigen" Daten** bei der Prüfung des alten Dienstes. Papierkorb und Versionshistorie können stillschweigend Speicher belegen
4. **Belege und Rechnungen vor der Kündigung sichern**. Nach der Kontolöschung können sie nicht mehr abgerufen werden
5. **Wählen Sie nach dem Grundsatz „was getrennt werden muss", nicht „was am günstigsten ist."** E-Mail ist eine geschäftliche Lebensader, und die Investition in eine dedizierte Umgebung lohnt sich

E-Mail-Migration berührt viele Bereiche — DNS, E-Mail-Authentifizierung — was sie psychologisch einschüchternd macht. Aber letztlich geht es nur darum, vier Arten von Einträgen korrekt zu setzen: MX, SPF, DKIM und DMARC. Folgen Sie den Schritten in diesem Leitfaden und prüfen Sie jeden einzelnen.
