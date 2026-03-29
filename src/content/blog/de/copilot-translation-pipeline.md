---
title: 'Wie man einen 9-sprachigen Blog mit nur einem japanischen Artikel betreibt'
description: 'Eine Anleitung zum Aktualisieren nur japanischer Artikel in Pages CMS und zur automatischen Generierung von Übersetzungen in Japanisch + 8 Sprachen mit GitHub Actions und GitHub Copilot, einschließlich Build und automatischem Merge.'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: Fazit zuerst
  text: 'Mit der aktuellen Acecore-Website können Sie den Betrieb eines Blogs in Japanisch + 8 Sprachen mit GitHub Actions und GitHub Copilot automatisieren, wobei japanische Artikel als Übersetzungsquelle dienen.'
processFigure:
  title: Ablauf von 1 japanischem Artikel zu 9-sprachigem Betrieb
  steps:
    - title: Japanische Quelle aktualisieren
      description: Nur den japanischen Artikel über Pages CMS oder Markdown bearbeiten und nach main pushen.
      icon: i-lucide-pencil-line
    - title: Übersetzungs-Issues automatisch erstellen
      description: GitHub Actions erstellt Issues mit eingebettetem Quellpfad und Zielsprachen.
      icon: i-lucide-ticket
    - title: Copilot erstellt Übersetzungs-PRs
      description: Nach Empfang des Issues werden Übersetzungsdateien generiert und ein Übersetzungs-PR geöffnet.
      icon: i-lucide-git-pull-request
    - title: Build, Merge und Issues schließen
      description: Nach erfolgreichem Build wird automatisch gemergt und das übergeordnete Übersetzungs-Issue automatisch geschlossen.
      icon: i-lucide-check-check
compareTable:
  title: Vergleich manueller vs. automatischer Betrieb
  before:
    label: Manueller Übersetzungsbetrieb
    items:
      - Jemand erstellt nach der Veröffentlichung manuell Übersetzungsaufgaben
      - Pro Sprache wird eine Person zugewiesen
      - Build- und Merge-Entscheidungen sind ebenfalls manuell
      - Übergeordnete Issues bleiben leicht ungeschlossen
  after:
    label: Automatischer Übersetzungsbetrieb
    items:
      - Ein Push des japanischen Artikels löst alles aus
      - Automatisch Copilot zugewiesen
      - Übersetzungs-PRs werden nach erfolgreichem Build automatisch gemergt
      - Übergeordnete Issues werden nach dem Merge ebenfalls automatisch geschlossen
checklist:
  title: Voraussetzungen vor dem Start
  items:
    - text: Inhaltsstruktur mit Japanisch als Übersetzungsquelle
    - text: Eine Übersetzungsdatei-Platzierungsregel wie src/content/blog/{locale}/{slug}.md
    - text: GitHub Actions mit Schreibberechtigung für Issues
    - text: COPILOT_AGENT_TOKEN, das die Copilot-Zuweisungs-API aufrufen kann
    - text: Ein stabiler Build-Befehl wie npm run build
faq:
  title: Häufig gestellte Fragen
  items:
    - question: Wenn ich einen japanischen Artikel pushe, werden dann Artikel in anderen Sprachen automatisch erstellt?
      answer: 'Ja. Die aktuelle Acecore-Website unterstützt 9 Sprachen — ja, en, zh-cn, es, pt, fr, ko, de, ru — daher löst das Pushen eines japanischen Artikels automatisch die Erstellung von Übersetzungs-Issues für die verbleibenden 8 Sprachen, die Zuweisung an Copilot, die Erstellung von Übersetzungs-PRs, den Build, den automatischen Merge und das Schließen von Issues aus. Selbst wenn die Übersetzungsdateien noch nicht existieren, kann jede Sprach-URL mit Japanisch als Fallback bedient werden, sodass Sie zuerst veröffentlichen und später durch echte Übersetzungen ersetzen können.'
    - question: Warum ein Issue erstellen statt direkt einen PR zu erstellen?
      answer: 'Weil Sie den Quellpfad, die Zielsprachen und die Übersetzungsbedingungen im Issue festlegen können. Wenn später eine Differenz auftritt, werden Neuausführung, Verlaufsprüfung und Wiederherstellung nach Fehlern viel einfacher.'
    - question: Ist das automatische Mergen sicher?
      answer: 'Bedingungsloses automatisches Mergen ist gefährlich. Indem Sie es auf Übersetzungs-PRs beschränken und alle folgenden Bedingungen erfordern: von Copilot erstellt, Titel beginnt mit [translation], erfolgreichem Build und kein Entwurf, kann es recht sicher gemacht werden.'
---

Kurz gesagt, auf dieser Website können Sie einen japanischen Artikel einmal über Pages CMS veröffentlichen und Blog-Artikel in Japanisch + 8 anderen Sprachen sequenziell bereitstellen. GitHub Actions und GitHub Copilot kümmern sich um die Erstellung von Übersetzungs-Issues, die Erstellung von Übersetzungs-PRs, den Build, das automatische Mergen und das Schließen übergeordneter Issues.

Für den täglichen Betrieb müssen nur japanische Artikel und Autorinformationen bearbeitet werden. Da Sie keine Übersetzungsaufgaben mehr manuell erstellen oder PRs jedes Mal ordnen müssen, wird der Aufwand für den Betrieb eines mehrsprachigen Blogs erheblich reduziert.

## Voraussetzungen für diesen Ansatz

Als Voraussetzung setzt dieser Ansatz voraus, dass Sie bereits über die folgende Infrastruktur auf der Astro-Seite verfügen.

- 9-sprachiges Routing (ja, en, zh-cn, es, pt, fr, ko, de, ru)
- Fallback zur Anzeige von Japanisch auf Seiten ohne Übersetzung
- Betrieb zum Aktualisieren japanischer Artikel und Autorinformationen über Pages CMS

Wie die Infrastruktur selbst aufgebaut wird, ist in [Eine Astro 6-Website auf 9 Sprachen umstellen — Automatische Übersetzung von 136 Blog-Artikeln und mehrsprachige Architektur](/blog/astro-i18n-blog-translation/) beschrieben. Dieser Artikel konzentriert sich nur darauf, wie Copilot-automatisierte Übersetzungsoperationen darauf aufgesetzt werden.

## Was Sie tun können

Auf der Betriebsseite gibt es normalerweise zwei Bildschirme, mit denen Sie interagieren. Diesmal verwenden wir den Pages CMS-Bildschirm wie er ist, um sofort klar zu machen, **wo im täglichen Betrieb interagiert wird**.

![Pages CMS japanisches Blog-Listenbildschirm](/uploads/pagescms-blog-ja-live-20260329.png)

Der erste Bildschirm ist die japanische Blog-Liste von Pages CMS. Hier sehen Sie Veröffentlichungsdaten und Autoren, während Sie nur japanische Artikel hinzufügen und aktualisieren. Der Schlüssel ist, den Betrieb darauf auszurichten, **nur die japanische Übersetzungsquelle zu berühren**, ohne jedes Mal in den Bearbeitungsbildschirm für mehrere Sprachen einzutreten.

![Pages CMS Autorinformations-Formularbildschirm](/uploads/pagescms-authors-live-20260329.png)

Der zweite Bildschirm ist das Autorinformationsformular. Indem nur japanisch-basierte Felder im CMS für Autordaten aktualisiert werden und die `i18n`-Übersetzung dem GitHub-Automatisierungsfluss überlassen wird, wird die Trennung der Betriebsverantwortlichkeiten recht sauber.

## Wann dieser Ansatz am besten funktioniert

Als Voraussetzung ist dieser Ansatz besonders effektiv für Teams oder Websites wie die folgenden.

- Möchten Japanisch als Übersetzungsquelle verwenden
- Der Blog wird in Markdown verwaltet
- Übersetzungsaufgaben jedes Mal manuell zu erstellen ist mühsam
- Sind bereit, bis zu einem gewissen Grad auf KI für die Übersetzungsqualität zu vertrauen
- Möchten aber PRs stoppen, die beim Build fehlschlagen oder als Entwürfe verbleiben

Umgekehrt kann ein anderer Ansatz besser geeignet sein, wenn jede Sprache eine völlig unabhängige Bearbeitungsstruktur hat.

## Schritt 1. Die Übersetzungsquelle auf japanische Artikel festlegen

Das Erste, was entschieden werden muss, ist "welche Datei als Übersetzungsquelle zu verwenden ist." Wenn dies unklar ist, bricht die Automatisierung zusammen.

Die "Übersetzungsquelle" in diesem Artikel bedeutet **die japanische Datei, die zuerst bearbeitet wird und als Standard für Artikel und abgeleitete Daten in jeder Sprache dient**.

In dieser Konfiguration sind folgende Elemente in Übersetzungsquelle und Übersetzungsziel aufgeteilt.

- Übersetzungsquelle für Blog-Artikel: `src/content/blog/{slug}.md`
- Übersetzungsziel für Blog-Artikel: `src/content/blog/{locale}/{slug}.md`
- Übersetzungsquelle für Autorinformationen: `src/data/authors.json`
- Übersetzungsziel für Autorinformationen: `i18n` in `src/data/authors.json`

Die Verzeichnisstruktur ist einfacher zu handhaben, wenn sie ungefähr so aussieht.

```text
src/content/blog/
  my-post.md
  another-post.md
  en/
    my-post.md
  zh-cn/
    my-post.md
  fr/
    my-post.md
```

Der Schlüssel ist, **den Slug der Übersetzungsdateien mit dem ursprünglichen japanischen Artikel abzugleichen**. Allein das erleichtert die automatische Identifizierung des Übersetzungsziels aus dem Quellpfad.

In diesem Repo werden, selbst wenn die Übersetzungsdateien noch nicht existieren, die Sprach-URLs selbst mit Japanisch als Fallback generiert. Das bedeutet, Sie können mit "zuerst den japanischen Artikel veröffentlichen und dann Übersetzungs-PRs nachkommen lassen" arbeiten.

## Schritt 2. Pushes japanischer Artikel in Übersetzungs-Issues umwandeln

Der nächste Schritt besteht darin, Änderungen an japanischen Artikeln mit GitHub Actions zu erkennen und automatisch Übersetzungs-Issues zu erstellen.

Mindestens benötigen Sie Folgendes.

- Pushes zu `main` überwachen
- Nur `src/content/blog/*.md` und `src/data/authors.json` anvisieren
- Ein vorhandenes offenes Issue mit demselben Quellpfad aktualisieren statt ein neues zu erstellen
- Den Quellpfad als Marker im Issue-Text einbetten

Zum Beispiel ermöglicht das Einfügen eines solchen Kommentars in den Issue-Text die Wiederverwendung in der nachgelagerten Automatisierung.

```md
<!-- translation-source:src/content/blog/my-post.md -->
<!-- translation-kind:blog-post -->
```

Die grundlegende Filterung auf der Workflow-Seite sieht so aus.

```yaml
on:
  push:
    branches:
      - main
    paths:
      - src/content/blog/*.md
      - src/data/authors.json
```

Wichtig hier ist nicht "Übersetzungen direkt erstellen", sondern **zuerst ein Issue erstellen**. Durch das Einfügen eines Issue-Schritts können Sie den Quellpfad, die Zielsprachen und die Übersetzungsbedingungen in einer Form festlegen, die sowohl für Menschen als auch für KI sichtbar ist.

## Schritt 3. Übersetzungs-Issues automatisch Copilot zuweisen

Nur ein Issue zu erstellen hinterlässt noch manuelle Arbeit, daher weisen Sie hier automatisch Copilot zu.

Es gibt zwei Dinge zu tun.

1. `COPILOT_AGENT_TOKEN` zu Repository-Secrets hinzufügen
2. Die Zuweisungs-API nach der Issue-Erstellung aufrufen

Konzeptionell patchen Sie das Issue und setzen Copilot als Assignee.

```json
{
  "assignees": ["copilot-swe-agent[bot]"],
  "agent_assignment": {
    "target_repo": "OWNER/REPO",
    "base_branch": "main",
    "custom_instructions": "Translate the Japanese source article..."
  }
}
```

Zu diesem Zeitpunkt stabilisiert das Trennen der `custom_instructions` für Artikel vs. Autorinformationen die Genauigkeit. Das Angeben, dass Autorinformationen nur `i18n` in `src/data/authors.json` berühren sollen und Artikel eine Datei mit demselben Namen in `src/content/blog/{locale}/` erstellen sollen, reduziert Fehler.

## Schritt 4. Übersetzungs-PRs builden und automatisch mergen

Dieser Teil ist sicherer, wenn Sie ihn nicht zu bedingungsloser Automatisierung machen. Die Empfehlung ist, nur PRs zu mergen, die alle folgenden Bedingungen erfüllen.

- PR wurde von Copilot erstellt
- Titel beginnt mit `[translation]`
- Zielt auf `main`
- Kein Entwurf
- Build war erfolgreich

In dieser Konfiguration ist es in zwei Stufen aufgeteilt.

1. `Translation PR Build`
2. `Merge Translation PR`

Wenn ein PR zur Überprüfung bereit ist, wird sein Head gebaut, und bei Erfolg ein Squash-Merge durchgeführt. Da dies nicht von GitHub-Branch-Protection abhängt, ist es auch für kleine Repos einfach zu handhaben.

### Bedingungen für den automatischen Merge einschränken

Beim Hinzufügen des automatischen Merge sind folgende Bedingungen die Mindestempfehlung.

- Alles außer Übersetzungs-PRs ausschließen
- Stoppen, wenn der Build fehlschlägt
- Stoppen, während es ein Entwurf ist
- PRs ausschließen, die von jemand anderem als Copilot erstellt wurden

Mit diesen vier können Unfälle, bei denen normale Entwicklungs-PRs ebenfalls einbezogen werden, weitgehend vermieden werden.

## Schritt 5. Übergeordnete Übersetzungs-Issues nach dem Merge automatisch schließen

Das Letzte, was den Betrieb ordentlich macht, ist das automatische Schließen übergeordneter Issues.

Die Methode ist einfach — für gemergte Übersetzungs-PRs folgendes tun.

1. Die geänderten Dateien im PR abrufen
2. Den Quellpfad im PR-Text lesen
3. Offene Issues suchen, die dem `translation-source:`-Marker entsprechen
4. Einen Kommentar hinzufügen und schließen

Der Grund, auch den Quellpfad im PR-Text zu betrachten, ist, dass je nach Situation die Rückwärtssuche der Quelle schwach sein kann, wenn man nur auf die geänderten Dateien von Copilot-erstellten PRs schaut. **Sowohl geänderte Dateien als auch den PR-Text zu verwenden** gibt stabile Ergebnisse.

## Ergänzende Hinweise

### Den Text von Copilot-PRs und -Issues auf Japanisch ausrichten

Wenn Sie die Ausgabesprache von Copilot auf der GitHub-Seite stabilisieren möchten, ist die Verwendung von Repository-weiten Anweisungen der direkteste Ansatz.

Platzieren Sie einfach eine `.github/copilot-instructions.md`.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

Mit nur dieser einen Datei stabilisiert sich die Standardsprache und der Kontext, wenn der Copilot-Coding-Agent Issues und PRs erstellt, erheblich.

## Zusammenfassung

Der Schlüssel dieser Konfiguration ist es, die Übersetzung von "etwas, um das die Leute jedes Mal bitten" in **einen Routineprozess zu verwandeln, der vom Pushen der japanischen Quelle abhängt**.

Hier ist der Ablauf noch einmal.

1. Nur den japanischen Artikel schreiben
2. Der Push erstellt automatisch ein Übersetzungs-Issue
3. Automatisch Copilot zuweisen
4. Den Übersetzungs-PR bauen und automatisch mergen
5. Das übergeordnete Issue ebenfalls automatisch schließen

Wenn dies einmal eingerichtet ist, ist das Betriebsgefühl recht unkompliziert. **Schieben Sie einfach einen japanischen Artikel, und Artikel in anderen Sprachen werden nach und nach auf der GitHub-Seite fertiggestellt**.

Natürlich braucht der asynchrone Ablauf von Issue-Erstellung, Copilot-Ausführung, PR-Erstellung, Build und Merge in der Praxis Zeit, sodass nicht alles "sofort" passiert. Allerdings müssen Betriebsmitarbeiter nicht mehr jedes Mal manuell Übersetzungsaufgaben erstellen oder vergessen, PRs zu schließen.

Dieser Artikel selbst ist so strukturiert, dass er mit der japanischen Version als Basis in diesen Ablauf eingespeist werden kann. Wenn Sie eine mehrsprachige Website kontinuierlich betreiben, ist es wahrscheinlich genau richtig, mit diesem Automatisierungsgrad zu beginnen.
