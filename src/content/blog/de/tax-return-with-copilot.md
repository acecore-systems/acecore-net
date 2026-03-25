---
title: 'Ich habe meine gesamte Steuererklärung von GitHub Copilot erledigen lassen — Von 837 Buchungseinträgen bis zur Abgabe'
description: 'Von der Klassifizierung und Überprüfung von 837 Buchungseinträgen, die durch Cloud-Buchhaltungsdatensynchronisierung angesammelt wurden, über den Abgleich von Sozialversicherungsbeiträgen, die Eingabe von Abzügen bis zur Abgabe der Erklärung. Ein vollständiger Bericht über eine Steuererklärung, bei der GitHub Copilot Agent Mode × Simple Browser praktisch die gesamte eigentliche Arbeit übernommen hat.'
date: 2026-03-17
author: gui
tags: ['技術', 'GitHub Copilot', 'VS Code']
image: https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=400&fit=crop&q=80
processFigure:
  title: Gesamtablauf der Copilot-Steuererklärung
  steps:
    - title: Datensynchronisierung & Ansammlung
      description: Automatische Synchronisierung von Bank-, Kreditkarten- und Suica-Daten über MF Cloud, wobei 837 Buchungseinträge angesammelt wurden.
      icon: i-lucide-database
    - title: Buchungsklassifizierung & Überprüfung
      description: Copilot hat das Richtliniendokument mit dem Buchungsjournal abgeglichen und 8 Unstimmigkeiten erkannt und behoben.
      icon: i-lucide-search
    - title: Abzüge & Steuerformulareingabe
      description: Beträge aus mehreren Diensten gesammelt und in das Steuerformular eingetragen.
      icon: i-lucide-file-text
    - title: Überprüfung & Abgabe
      description: Formular 1 und Formular 2 gegengeprüft, dann Erklärung über MF Cloud abgegeben.
      icon: i-lucide-check-circle
compareTable:
  title: Vor und nach Copilot
  before:
    label: Traditionelle Steuererklärung
    items:
      - Zwischen mehreren Webdiensten in Browser-Tabs wechseln
      - Beträge manuell ablesen und in Tabellen kopieren
      - Kontokategorien einzeln für jeden Buchungseintrag prüfen
      - Umschläge nach Abzugsbescheinigungen durchsuchen
      - Sich auf sich selbst verlassen, um Eingabefehler im Steuerformular zu erkennen
  after:
    label: Copilot × Simple Browser
    items:
      - Alle Dienste innerhalb von VS Codes Simple Browser bedienen
      - Copilot liest Seiten und extrahiert & summiert automatisch Beträge
      - Unstimmigkeiten mechanisch erkennen durch Abgleich des Richtliniendokuments mit dem Buchungsjournal
      - Copilot durchsucht Cloud Box und E-Mails nach Dokumenten per Stichwort
      - Copilot führt Gegenprüfungen zwischen Formular 1 und Formular 2 durch
callout:
  type: tip
  title: Wichtigste Erkenntnis
  text: Der größte Erfolgsfaktor war die tägliche Ansammlung von Buchungsdaten durch MoneyForwards Datensynchronisierung. Copilot übernahm den Teil „angesammelte Daten organisieren, überprüfen und eintragen", während sich der Mensch ausschließlich auf Richtlinienentscheidungen und abschließende Genehmigungen konzentrierte, um die gesamte Steuererklärung abzuschließen.
faq:
  title: FAQ
  items:
    - question: Kann man wirklich eine Steuererklärung mit GitHub Copilot abgeben?
      answer: Ja. Durch die Kombination von Agent Mode und Simple Browser können Buchungsklassifizierung, Abzugseingabe und Steuerformularerstellung vollständig in VS Code erledigt werden. Die endgültige Abgabe erfordert jedoch eine My Number Card-Authentifizierung, die von einem Menschen durchgeführt werden muss.
    - question: Was sind die Voraussetzungen für die Nutzung von Copilot auf diese Weise?
      answer: Die wichtigste Voraussetzung sind täglich über Cloud-Buchhaltungssoftware wie MoneyForward angesammelte Buchungsdaten. Copilot übernimmt die Organisation und Überprüfung der angesammelten Daten und kann daher ohne Daten nicht funktionieren.
    - question: Wie wurden Buchungsinkonsistenzen erkannt?
      answer: Copilot erhielt das Richtliniendokument (Kontokategorieregeln) und das Buchungsjournal zum Abgleich und erkannte mechanisch Einträge, die nicht den Regeln entsprachen. Von 837 Einträgen wurden 8 Unstimmigkeiten gefunden und korrigiert.
---

Ich habe praktisch die gesamte eigentliche Arbeit der Steuererklärung an GitHub Copilots Agent Mode delegiert. Das Ergebnis: Alles von der Klassifizierung von 837 Buchungseinträgen bis zur Erstellung und Überprüfung der Steuerformulare wurde innerhalb von VS Code abgeschlossen. Das Einzige, was noch übrig blieb, war die Authentifizierung mit der My Number Card über die Smartphone-App und die Übermittlung — und die Steuererklärung war erledigt.

Dieser Artikel ist ein ehrlicher Bericht darüber, „wie viel Copilot übernehmen konnte" und „was der Mensch tatsächlich getan hat."

## Voraussetzung: MF Clouds Datensynchronisierung war das Fundament

Vorab möchte ich klarstellen: Der bei weitem größte Grund, warum dies funktioniert hat, war, **dass MoneyForward Clouds Datensynchronisierung das ganze Jahr über eingerichtet war**.

Anstatt zur Steuerzeit hektisch Belege zusammenzusuchen, waren das ganze Jahr über folgende Dienste für die automatische Synchronisierung verbunden, sodass sich Buchungseinträge von selbst ansammelten:

- **Geschäftskonto** — Umsatzeingänge, Überweisungsgebühren
- **Privatkonto** — Hypothek, J-Coin Pay, Sortierung der Lebenshaltungskosten
- **Online-Bank** — Sozialversicherungsbeitrags-Lastschriften
- **Geschäftskreditkarte** — Kommunikationskosten, Werbeausgaben, Reisekosten, Bücher & Abonnements
- **[Mobile Suica](https://www.jreast.co.jp/suica/)** — Zug- und Busfahrpreise (mit der Vorschussmethode zur Vermeidung von Doppelzählungen)
- **E-Commerce-Seiten** — Verbrauchsmaterialeinkäufe
- **[My Number Portal](https://myna.go.jp/)** — Renten- und Lebensversicherungsprämien-Abzugsbescheinigungen

Dank dieser Synchronisierung lagen zum Zeitpunkt des Abschlusses bereits **837 Buchungseinträge** in der Cloud. Copilots Aufgabe war es, diese Rohdaten korrekt zu klassifizieren und in eine Steuererklärung umzuwandeln.

## Verwendete Werkzeuge

### Editor & KI

- **[VS Code](https://code.visualstudio.com/)** — Editor, Browser, Terminal und Chat-Oberfläche. Alles passierte hier
- **[GitHub Copilot](https://github.com/features/copilot) Agent Mode ([Claude Opus 4.6](https://www.anthropic.com/claude))** — Das Hauptmodell für dieses Projekt. Es kombinierte autonom Dateibearbeitung (Lesen und Schreiben von Markdown), Terminalbefehlsausführung und Weboperationen über Simple Browser
- **[Simple Browser](https://code.visualstudio.com/docs/editor/simple-browser) (VS Codes eingebauter Browser)** — Copilot liest das DOM über [MCP (Model Context Protocol)](https://modelcontextprotocol.io/)-Tools, klickt Buttons und Links mit `click_element`, füllt Formulare mit `type_in_page` und erhält den vollständigen Seitentext mit `read_page`. Er dient als Copilots „Augen und Hände"

### Webdienste

- **[MoneyForward Cloud Steuererklärung](https://biz.moneyforward.com/tax_return/)** — Buchungsjournal, Finanzberichte und Steuerformularverwaltung
- **[MoneyForward Cloud Box](https://biz.moneyforward.com/box/)** — Dokumentenverwaltung für Belege und Buchungsbelege
- **[MoneyForward ME](https://moneyforward.com/)** — Persönliches Vermögensmanagement (Abgleich von Ein- und Auszahlungen über mehrere Konten)

### Warum GitHub Copilot statt Computer Use?

Wenn man möchte, dass KI Bildschirmoperationen übernimmt, gibt es Screenshot-basierte Tools wie Anthropics Computer Use. Was diese Steuererklärung jedoch erforderte, war nicht nur „einen Bildschirm bedienen" — es war **Dateien lesen und schreiben, dabei Entscheidungen treffen und den Verlauf mit einem Menschen teilen**.

Warum GitHub Copilot Agent Mode gewählt wurde:

- **Arbeitsteilung: Mensch loggt ein, KI arbeitet** — Der Mensch loggt sich bei Banken und Buchhaltungssoftware ein und öffnet Seiten. Alles darüber hinaus (Suchen, Eingeben, Überprüfen) wird von Copilot über Simple Browser erledigt. Computer Use ist darauf ausgelegt, den gesamten Desktop der KI zu übergeben, sodass die gleiche Bildschirmaufteilung „Mensch loggt ein, KI erledigt den Rest" nicht möglich ist
- **Dateibearbeitung und Browseroperationen in derselben Umgebung** — policy.md lesen, um die Genauigkeit von Buchungen zu beurteilen, Ergebnisse in inconsistency-check.md schreiben, dann das Journal über Simple Browser korrigieren. Dieser gesamte Ablauf bleibt ununterbrochen in VS Code
- **Markdown-Dateien dienen als gemeinsamer Arbeitsbereich** — Computer Use ist Screenshot-basiert und eignet sich nicht für die Ansammlung und Referenzierung von strukturiertem Wissen. Mit Copilot ermöglichen .md-Dateien den bidirektionalen Austausch von „was war die Grundlage und wie wurde entschieden"
- **Chat-Protokolle werden zu Arbeitsnachweisen** — Austausch wie „Sollen wir diesen Abzug einbeziehen?" „Kein Beleg, lassen wir es" werden im Chat-Verlauf bewahrt. Die Nachvollziehbarkeit der Argumentation ist besonders bei Steuererklärungen wichtig

Kurz gesagt, Bildschirmbedienung allein können auch andere Tools, aber **die Fähigkeit, dass Mensch und KI denselben Bildschirm und dieselben Dateien teilen und dabei die Arbeit aufteilen**, ist die Stärke von Copilot Agent Mode.

### Der zentrale Arbeitsablauf: Markdown-Dateien

Das wichtigste Element der Zusammenarbeit mit Copilot war **die Strukturierung von Wissen und Aufgaben in Markdown-Dateien**. Die verwendete Dateistruktur:

| Datei | Rolle |
| --- | --- |
| `policy.md` | Beschreibungsmuster → Kontokategorie-Zuordnungsregeln (insgesamt 16 Abschnitte). Die Kriterien, die Copilot bei der Klassifizierung von Buchungseinträgen verwendet |
| `tasks.md` | Fortschrittsverwaltungszentrale für die gesamte Steuererklärung. Status von 38 Belegen mit ✅ in einer Tabelle verfolgen |
| `filing-tasks.md` | Ungelöste Fragen und Recherchenotizen für die Steuerformulareingabephase. Fakten und Schlussfolgerungen separat erfasst |
| `filing-tasks_completed.md` | Abgeschlossene/aufgeschobene Punkte hierhin verschoben, um das Wachstum der aktiven Datei zu verhindern |
| `inconsistency-check.md` | Bericht über die Ergebnisse des Abgleichs Richtlinie vs. Buchungsjournal. Verweist auf Korrekturen in policy.md mit §-Nummern |
| `mf-review-report.md` | BS/PL-Zahlenprüfung. Systematisch verwaltet mit Problem-IDs (A1, B1, etc.) und Schweregrad-Stufen |
| `journal-mapping.md` | Alle 837 MF-Buchungseinträge in kategoriebezogenen Tabellen organisiert |

Copilot **liest diese .md-Dateien, um Entscheidungen zu treffen, und schreibt hinein, um Ergebnisse festzuhalten**. Der Mensch liest genau dieselben Dateien, um die Situation zu verstehen. Mit anderen Worten: Markdown-Dateien fungieren als gemeinsamer Arbeitsbereich zwischen Mensch und KI.

Der grundlegende Ansatz war, 5–6 Simple Browser-Tabs gleichzeitig geöffnet zu haben und sich bei der Bearbeitung mit Copilot abzustimmen.

## Phase 1: Erstellung der Buchungsrichtlinie mit Copilot

### Festlegung der Kategorisierungsregeln

Der erste Schritt war die Dokumentation der Klassifizierungsregeln in `policy.md`. Im Gespräch mit Copilot über Fragen wie „Unter welches Konto fällt diese Transaktion?" und „Ist das geschäftlich oder privat?" haben wir die Kontokategorien für jedes Transaktionsmuster zusammengestellt.

Die Struktur dieses Richtliniendokuments ist entscheidend. Jeder Abschnitt folgt dem Format `### Beschreibungsmuster → Kontokategorie`, mit Markdown-Tabellen, die Beschreibung, Inhalt und Kategorie definieren. Zweideutige Fälle enthalten Begründungen in `> Hinweis:`-Blockzitaten. Da MF Cloud Beschreibungen in Halbbreiten-Katakana erfasst (z.B. `ﾃｽｳﾘｮｳ`), bewahrt das Richtliniendokument diese für die Copy-Paste-Suche unverändert.

Die festgelegten Klassifizierungsregeln umfassen 15 Abschnitte:

| Kategorie | Konto | Beispiele |
| --- | --- | --- |
| Kundeneinzahlungen | Umsatz | Monatliche Überweisungseingänge |
| Hypothekenzahlungen | Privatentnahmen | Automatische Abbuchung vom Privatkonto |
| QR-Code-Zahlungsaufladungen | Privatentnahmen/Kapital | Aufladungen und Erstattungen vom Privatkonto |
| Kontenüberträge | Sparkonto | Geschäftskonto ↔ Privatkonto |
| ISP & SaaS | Kommunikationskosten | GitHub, Cloudflare, ChatGPT, Canva, etc. |
| Webanzeigen & Social Media | Werbeausgaben | Google Ads, X Premium, SocialDog, etc. |
| Transport | Reisekosten | Shinkansen, Taxis, Telearbeitskabinen |
| Suica-Nutzung | Reisekosten | Vorschussmethode für einzelne Zug-/Bus-Einträge |
| E-Commerce-Einkäufe | Verbrauchsmaterial | PC-Peripherie, Werkzeuge |

## Phase 2: Klassifizierung von 837 Buchungseinträgen & Unstimmigkeitsprüfungen

### Vollständiger Abgleich durch Copilot

Mit dem fertiggestellten Richtliniendokument war der nächste logische Schritt „Lass uns gegen das Journal abgleichen." Damit begann der Prozess des Abgleichs mit den tatsächlichen Buchungsdaten.

Der konkrete Ansatz: Copilot öffnete den MF Cloud-Buchungsbildschirm in Simple Browser und verwendete `read_page`, um den Seiteninhalt zu erhalten. Es wendete Beschreibungs-Stichwortfilter an und glich gegen die Tabellen in policy.md ab. Wenn Abweichungen gefunden wurden, fügte es Tabellenzeilen in `inconsistency-check.md` hinzu und bearbeitete gleichzeitig den entsprechenden Abschnitt in policy.md (z.B. `§13`). Da die Regel „Das Buchungsjournal als Quelle der Wahrheit behandeln und policy.md korrigieren" am Anfang von `inconsistency-check.md` deklariert war, korrigierte Copilot ohne Zögern die Richtlinienseite.

Ergebnis: **8 Unstimmigkeiten** erkannt:

| Beschreibung | Richtlinien-Kategorie | Tatsächlicher Eintrag | Maßnahme |
| --- | --- | --- | --- |
| Social-Media-Premium | Privatentnahmen (privat) | Werbeausgaben | Geschäftliches SNS, daher sind Werbeausgaben korrekt |
| Designtool | Privatentnahmen (privat) | Kommunikationskosten | Geschäftliches Tool, daher sind Kommunikationskosten korrekt |
| KI-Chatdienst | Privatentnahmen (privat) | Kommunikationskosten | Geschäftliches Tool, daher sind Kommunikationskosten korrekt |
| Mobiler Batterieverleih | Kommunikationskosten | Privatentnahmen | Privatnutzung, daher sind Privatentnahmen korrekt |
| App-Gebühren (gemischte Apps) | Alle Kommunikationskosten | Aufgeteilt nach App | Transit-App → Kommunikation, Werbeblocker → Privatentnahmen, etc. |
| Videoanzeigen (Schwellenwertabrechnung) | Im privaten Bereich platziert | Werbeausgaben | Falsche Platzierung im Richtliniendokument korrigiert |
| E-Commerce (PC-Peripherie) | Bücher & Abonnements | Verbrauchsmaterial | Falsche Kategorie korrigiert |
| Social-Media-Management-Tool | Kommunikationskosten | Werbeausgaben | Für SNS-Betrieb, daher sind Werbeausgaben korrekt |

„Richtlinie erstellen, gegen das Journal abgleichen, Richtlinie korrigieren wo sie falsch ist" — dies automatisch von Copilot erledigen zu lassen, während Dateien bearbeitet werden, war ein völlig anderes Effizienzniveau im Vergleich zur manuellen Überprüfung von 837 Einträgen.

### Buchungsübersicht

Die endgültig sortierten Buchungseinträge verteilten sich wie folgt:

- **Banksynchronisierung** (Geschäftskonto, Privatkonten, Online-Bank — insgesamt 4 Banken) — Umsatzeingänge, Hypothek, Kontenüberträge
- **Kreditkartensynchronisierung** (Sumitomo Mitsui Card + Apple Pay aufgeteilt) — Kommunikationskosten 116, Werbeausgaben 21, Reisekosten 24, Bücher & Abonnements 27, Privatnutzung 29 usw.
- **Mobile Suica-Synchronisierung** — Zug 248, Bus 130, Aufladungen 21, Einzelhandel 4
- **E-Commerce-Synchronisierung** — Verbrauchsmaterial 5
- **KI-OCR & Rechnungen** — 16

## Phase 3: Belegorganisation in Cloud Box

### Upload und automatische Erkennung

Im nächsten Schritt zur Belegorganisation wurden Belege und Kreditkartenabrechnungen über Copilot in die Box-Funktion der Buchhaltungssoftware hochgeladen. KI-OCR las automatisch Transaktionsdaten, Gegenparteien und Beträge, wobei Copilot fehlende Informationen manuell ergänzte.

Einzelbelege wurden vollständig mit Transaktionsdaten, Gegenparteien und Beträgen ergänzt. Abrechnungsartige Dokumente (Kartenabrechnungen, Suica-Nutzungshistorie, Banktransaktionsprotokolle) wurden einfach als Referenzmaterial hochgeladen.

## Phase 4: Sozialversicherungsbeitragsabgleich — Die Stärke dienstübergreifender Operationen

Diese Phase begann mit der Frage „Wie finalisieren wir die Sozialversicherungsbeiträge?" Im Gespräch mit Copilot ergab sich der Ansatz, **5 Webdienste gleichzeitig für den Abgleich zu öffnen**.

### Rentenversicherungsbeiträge

Automatisch importierte Daten aus der My Number Portal-Synchronisierung sind nicht immer vollständig. Wenn z.B. die Rente eines Ehepartners von einem separaten Konto bezahlt wird, erscheint sie nicht in den synchronisierten Daten.

Der Ablauf bei der Bearbeitung mit Copilot:

1. „Lass uns Kreditkartenabrechnungen nach Rentenzahlungen durchsuchen" → In Simple Browser geöffnet, nach „Japan Pension Service" gesucht, Zahlungsbeträge extrahiert
2. „Es könnten auch Zahlungen von einem anderen Konto kommen" → Ausgabenaufzeichnungen in der Haushalts-App geprüft, Lastschriften gefunden, die nicht von der Synchronisierung abgedeckt waren
3. „Lass uns auch die angrenzenden Monate prüfen" → Zahlungsmuster identifiziert (vierteljährlich, monatlich usw.)
4. „Lass uns abgleichen und die Summe berechnen" → Beträge aus mehreren Quellen gegengeprüft, um den Jahresgesamtbetrag zu finalisieren

Der Kernpunkt ist, dass kein einzelner Dienst ein vollständiges Bild liefert. Das Grundmuster in dieser Phase war, mit Copilot zwischen mehreren Tabs hin und her zu wechseln und zu fragen „Wo sollten wir als nächstes schauen?" und „Sollten wir das auch prüfen?"

### Krankenversicherungsbeiträge

Im Simple Browser-Tab der Online-Bank haben wir die Lastschriftaufzeichnungen nach Versicherungsprämienabzügen durchsucht. Suchbegriffe wurden je nach spezifischem Versicherungssystem (Arbeitsgeberversicherung, Nationale Krankenversicherung usw.) angepasst, und die Anzahl der Jahreszahlungen und Beträge wurden überprüft.

### Kommunale Zahlungen (Fallstrick)

Auch wenn die Haushalts-App Zahlungsaufzeichnungen an eine Kommune zeigt, lässt sich allein aus den Aufzeichnungen möglicherweise nicht unterscheiden, ob eine Zahlung für „Nationale Krankenversicherung", „Einwohnersteuer" oder „Grundsteuer" ist.

Der Untersuchungsablauf mit Copilot für „Was ist diese Zahlung?":

1. „Lass uns den Zahlungsplan der Kommune nachschlagen" → Kommunale Bekanntmachungen und Websites auf Einzugszeiträume nach Steuerart geprüft
2. „Stimmen die Zahlungsmonate überein?" → Steuerart-Kandidaten durch Vergleich eingegrenzt
3. „Haben wir ungefähr zur gleichen Zeit andere Versicherungen bezahlt?" → Überprüft, dass keine Überschneidung mit anderen Programmen vorliegt

Wenn der Originalzahlungsbeleg nicht verfügbar ist und die Steuerart nicht bestätigt werden kann, ist der sichere Ansatz, **es nicht als Abzug einzubeziehen (auf der konservativen Seite bleiben)**. Der Mensch trifft die Entscheidung „einbeziehen oder nicht", während Copilot die Beweissammlung übernimmt — diese Aufgabenteilung ist entscheidend.

### Entdeckung von Fehlklassifizierungen

Die automatische Kategorisierung in Haushalts-Apps ist nicht perfekt. In einem Fall wurde eine Zahlung automatisch als „Rentenversicherungsbeiträge" klassifiziert, aber bei Copilots Überprüfung gegen die Kreditkartenabrechnung stellte sich heraus, dass es eine völlig andere Nebenkosten-Rechnung war. Ohne Überprüfung wären die Sozialversicherungsbeiträge zu hoch ausgewiesen worden.

**Immer so vorgehen**: Vertraue nicht der Klassifizierung der Haushalts-App — überprüfe mit Copilot: „Ist dieser Betrag wirklich Rente? Lass uns die Kreditkartenabrechnung prüfen." Der dienstübergreifende Abgleich ist der Bereich, in dem Copilot × Simple Browser wirklich glänzt.

## Phase 5: Eingabe der Abzüge

Über die Sozialversicherung hinaus wurden weitere Abzüge durch Simple Browser-Formulare zusammen mit Copilot eingegeben.

### Eingegebene Abzüge

| Abzugsart | Übersicht | Copilots Arbeit |
| --- | --- | --- |
| Lebensversicherungsprämienabzug | My Number Portal synchronisierte Einträge + manuelle Eingaben | Optionen in Formular-Dropdown-Menüs ausgewählt und Einträge einzeln eingegeben |
| Erdbebenversicherungsprämienabzug | Genossenschafts- & Sachversicherungsprämien | Beträge ins Formular eingegeben |
| Ehegattenabzug | Gesamteinkommen aus dem Verdienst des Ehepartners berechnet | Einkommen nach Arbeitnehmerabzug berechnet, Abzugsbetrag bestätigt |
| Sozialversicherungsprämienabzug | Rente + Krankenversicherung (in Phase 4 finalisierte Beträge) | Typen auf dem Sozialversicherungsbildschirm ausgewählt → Beträge eingegeben |
| Unterhaltsabzug (unter 16) | Keine steuerliche Auswirkung, aber relevant für die Einwohnersteuer | Registrierungsstatus auf dem Bildschirm Grunddaten → Familienmitglieder geprüft |

### Erwogene, aber aufgeschobene Punkte

Punkte, die mit Copilot als „Könnte man das abziehen?" diskutiert und bewusst aufgeschoben wurden:

- **Hypothekenabzug** — Aufgeschoben wegen nicht verfügbarer Jahresendsaldobescheinigung
- **Krankheitskostenabzug** — My Number Portal-Synchronisierungsdaten geprüft, aber die Beträge hätten den Abzug nicht wesentlich beeinflusst
- **Stromkostenaufteilung** — Heimserver für geschäftliche Nutzung, aber die Aufteilungsgrundlage war nicht rechtzeitig organisiert
- **Heimatsteuerspenden & iDeCo** — Für das laufende Jahr nicht zutreffend

## Phase 6: ISP-Gebühren Geschäftsnutzungsaufteilung

ISP (Internet)-Monatsgebühren wurden im Journal vollständig als Kommunikationskosten erfasst, aber da die Wohnung auch als Büro dient, wäre eine 100%ige Geschäftsnutzung nicht haltbar.

Auf die Frage „Wie sollen wir das aufteilen?" präsentierte Copilot Optionen, und wir diskutierten den Ansatz:

1. Alle ISP-bezogenen Einträge im Journal suchen → Jahressumme berechnen
2. Den Geschäftsnutzungsanteil bestimmen (50% ist ein üblicher Richtwert für Heimbüros)
3. Statt einzelne Einträge zu ändern, einen **einzelnen Korrekturbeleg mit Datum 31.12.** hinzufügen mit „Privatentnahmen / Kommunikationskosten"
4. Copilot hat den Eintrag ins Journal gebucht

Dass Copilot praktische Optionen wie „Sollen wir jede Zeile auf 50% anpassen oder eine einzige Jahresendkorrektur machen?" präsentiert, ist eine weitere Stärke des Gesprächsansatzes.

## Phase 7: Steuerformulareingabe und Überprüfung

### Formularbedienung in Simple Browser

Mit dem geöffneten Steuerformularbildschirm der Buchhaltungssoftware in Simple Browser wurden Formulareingaben im Gespräch mit Copilot vorgenommen.

Was Copilot tatsächlich tat:

1. `read_page` verwendet, um die aktuelle Seitenstruktur zu erhalten und zu bestimmen, welches Menü angeklickt werden soll
2. `click_element` verwendet, um Seitenmenüs und Links wie „Sozialversicherung" zum Navigieren anzuklicken
3. Bei Select-Boxen `click_element` zum Öffnen des Dropdowns verwendet, dann erneut `click_element` zur Auswahl einer Option
4. `type_in_page` zur Eingabe von Beträgen verwendet, direkt aus in `filing-tasks.md` erfassten Werten übertragen
5. `click_element` zum Klicken der „Speichern"-Schaltfläche und Absenden des Formulars verwendet

Die Seite des Menschen im Gespräch beschränkte sich auf Dinge wie „Lass uns den Sozialversicherungsbereich ausfüllen", „Fang mit der Rentenversicherung an", „Da ist noch einer", „Lass uns Formular 1 prüfen, ob die Summen stimmen." Spezifische Selektor-Referenzen oder Schritt-für-Schritt-Bedienungsanweisungen waren nicht nötig — Copilot las das DOM und handelte autonom.

Über die Tatsache hinaus, dass es einfacher ist, als die Browseroperationen selbst durchzuführen, **ist der Umstand, dass diese Gesprächsaustausche in Chat-Protokollen bewahrt werden**, ein großer Vorteil. Man kann später nachschauen, was in welcher Reihenfolge eingegeben wurde.

### Gegenprüfung von Formular 1 und Formular 2

Nach Abschluss der Eingaben wurde die Konsistenz zwischen Formular 1 und Formular 2 von Copilot überprüft:

- **Formular 1** — Einkommensbeträge, Gesamteinkommensabzüge, steuerpflichtiges Einkommen, Steuerbeträge
- **Formular 2** — Aufschlüsselung der Sozialversicherungsprämienabzüge, Lebensversicherungsprämienabzüge, Ehegattenabzug, Angaben zu Unterhaltsberechtigten

Beide Tabs wurden von Copilot gelesen, um zu überprüfen, „ob die Aufschlüsselungssummen in Formular 2 mit den Abzugsbeträgen in Formular 1 übereinstimmen." Unstimmigkeiten würden sofort gemeldet, was die Früherkennung von Eingabefehlern effektiv unterstützt.

Hinweis: MoneyForward hat kein Eingabefeld für Unterhaltsberechtigte unter 16 auf dem Bildschirm Einwohnersteuer & Gewerbesteuer. Angaben zu Unterhaltsberechtigten werden auf dem Bildschirm „Grunddaten → Familienmitglieder" verwaltet, daher sollte der Registrierungsstatus dort geprüft werden.

## Phase 8: Abgabe der Erklärung

Die endgültige Abgabe erfolgte über die MoneyForward Cloud Steuerklärungs-Smartphone-App. Die Authentifizierung wurde per NFC-Lesung der My Number Card durchgeführt, und die Steuerdaten wurden direkt übermittelt. Kein separates Öffnen von e-Tax nötig — die Abgabe wurde direkt aus MF Cloud abgeschlossen.

Überprüfungspunkte nach der Abgabe:

- Ist das Empfangsdatum/-zeit erfasst?
- Wurde eine Empfangsnummer ausgestellt?
- Erscheint die Nachricht „Ihre übermittelten Daten wurden akzeptiert"?

Dies wurde überprüft, indem Copilot den Übermittlungsbestätigungsbildschirm las.

### Umgang mit vertraulichen Informationen

Bank- und Buchhaltungssoftware-Bildschirme zeigen naturgemäß persönliche Informationen an. Es ist wichtig, sich bewusst zu sein, dass Copilots Chat-Verlauf diese Daten enthalten wird. GitHub Copilot for Business hat eine Richtlinie, Code-Completion-Daten nicht für das Training zu verwenden, aber dies sollte gegen die Sicherheitsrichtlinien der eigenen Organisation abgewogen werden.

## Was hat der Mensch tatsächlich getan?

Rückblickend war das, was der Mensch getan hat, erstaunlich wenig:

1. **Richtlinienentscheidungen** — „Das als Ausgabe zählen / nicht zählen", „Nehmen wir 50% für die Aufteilung", „Kein Beleg, also diesen Abzug nicht einbeziehen"
2. **Beratung mit Copilot** — „Sollen wir das als nächstes machen?" „Sollten wir das auch prüfen?" „Was denkst du?"
3. **Abschließende Genehmigung** — „Die Zahlen sehen gut aus", „Mach weiter und übermittle"
4. **Physische Operationen** — NFC-Lesung der My Number Card (nur für die Smartphone-Übermittlung)

Es war fast nie nötig, bestimmte Bildschirme zu öffnen oder detaillierte Bedienungsanweisungen zu geben. Eine Richtung mit „Lass uns das als nächstes machen" vorzugeben, reichte aus, damit Copilot autonom Bildschirmnavigation, Suche, Dateneingabe und Überprüfung übernahm.

Möglich wurde dies durch die Markdown-Dateien. Weil policy.md Klassifizierungsregeln enthielt, konnte Copilot beurteilen, ob Buchungseinträge korrekt waren. Weil filing-tasks.md Recherchenotizen enthielt, konnte die Herkunft von Beträgen nachverfolgt werden. Dass der Mensch nur „das nächste" sagen konnte und die Dinge vorangingen, lag daran, dass die Kriterien und Arbeitsprotokolle als .md-Dateien geteilt wurden.

## Rückblick: Was ich beim nächsten Mal anders machen würde

Basierend auf dieser Erfahrung gibt es Verbesserungspotenzial:

- **Abzugsbescheinigungen vorab in Cloud Box hochladen** — Diesmal wurden sie nur als Papierkopien aufbewahrt, aber Copilot schaffte es, Beträge aus Transaktionsaufzeichnungen zu identifizieren. Digitale Daten würden es Copilot ermöglichen, sie direkt zu lesen und den Prozess noch reibungsloser zu gestalten
- **Notizen führen, wofür kommunale Zahlungen bestimmt sind** — Ohne Belege ist es unmöglich, zwischen Nationaler Krankenversicherung, Einwohnersteuer und Grundsteuer zu unterscheiden
- **Das Richtliniendokument für Copilot aktuell halten** — Je genauer die Richtlinie, desto höher die Arbeitspräzision von Copilot
- **.md-Dateien von Anfang an besser strukturieren** — Die Dateien sind in diesem Projekt organisch gewachsen, aber die Definition von Rollen und Formaten im Voraus würde Copilots Lesegenauigkeit verbessern und es dem Menschen erleichtern, den Überblick zu behalten

## Zusammenfassung

Was diese Steuererklärung deutlich gemacht hat, ist, dass die Kombination von **„Datenansammlung" und „KI erledigt die eigentliche Arbeit"** extrem leistungsfähig ist.

MoneyForwards Datensynchronisierung sammelt automatisch das ganze Jahr über Bank-, Kreditkarten- und Suica-Transaktionsdaten an. Wenn die Steuersaison kommt, arbeitet man sie mit GitHub Copilot Agent Mode im Gespräch durch: „Sollen wir das als nächstes machen?" „Sollten wir das auch prüfen?" Der Mensch trifft nur Richtlinienentscheidungen und gibt abschließende Genehmigungen, aber der Prozess läuft nicht ohne Begleitung — es ist ein kontinuierlicher Dialog.

Code zu schreiben ist nicht der einzige Anwendungsfall für Copilot. „Mehrere Webdienste überqueren, um Daten zu sammeln, zu organisieren, einzugeben und zu überprüfen" — diese Art von allgemeiner Büroarbeit kann gemeinsam über Chat bewältigt werden. Agent Mode × Simple Browser funktioniert auch jenseits des Programmierens einwandfrei.
