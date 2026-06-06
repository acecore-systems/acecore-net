---
title: 'Wie man einen Blog in 9 Sprachen betreibt, indem man nur einen japanischen Artikel veröffentlicht'
description: 'Ein Leitfaden zum Arbeitsablauf, der automatisch übersetzte Artikel auf Japanisch + 8 Sprachen generiert, Builds ausführt und automatisches Merging verwaltet — alles ausgelöst durch das Aktualisieren eines japanischen Artikels in Pages CMS über GitHub Actions und GitHub Copilot.'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: /uploads/acecore-generated/i18n-localization-workbench.webp
callout:
  type: info
  title: Fazit zuerst
  text: 'Mit der aktuellen Acecore-Website können Sie mithilfe von GitHub Actions und GitHub Copilot den Betrieb eines Japanisch + 8-Sprachen-Blogs automatisieren, indem Sie japanische Artikel als kanonische Quelle behandeln.'
processFigure:
  title: Der Ablauf von 1 japanischen Artikel zum 9-Sprachen-Betrieb
  steps:
    - title: Japanische Quelle aktualisieren
      description: Bearbeiten Sie nur den japanischen Artikel über Pages CMS oder Markdown und pushen Sie ihn nach main.
      icon: i-lucide-pencil-line
    - title: Direkte Erstellung eines Übersetzungs-PR-Tasks
      description: GitHub Actions erstellt direkt einen Copilot-Task mit dem Quellpfad und den Zielsprachen eingebettet.
      icon: i-lucide-git-branch
    - title: Copilot erstellt Übersetzungs-PRs
      description: Nach Erhalt des Tasks generiert Copilot Übersetzungsdateien und öffnet einen Übersetzungs-PR.
      icon: i-lucide-git-pull-request
    - title: Erfolgreich bauen und automatisch zusammenführen
      description: Nach einem erfolgreichen Build wird der Übersetzungs-PR automatisch zusammengeführt.
      icon: i-lucide-check-check
compareTable:
  title: Manueller vs. automatisierter Übersetzungsworkflow
  before:
    label: Manueller Übersetzungsworkflow
    items:
      - Jemand erstellt manuell Übersetzungsaufgaben nach der Veröffentlichung eines Artikels
      - Verantwortliche werden pro Sprache zugewiesen
      - Builds und Merge-Entscheidungen werden von Menschen verwaltet
      - Doppelte Tasks und PR-Bereinigung häufen sich an
  after:
    label: Automatisierter Übersetzungsworkflow
    items:
      - Ein Push zum japanischen Artikel löst den gesamten Ablauf aus
      - Ein Copilot-Übersetzungs-PR-Task wird direkt erstellt
      - Übersetzungs-PRs werden nach einem erfolgreichen Build automatisch zusammengeführt
      - Doppelte Erstellung wird durch einen Marker im PR-Body verhindert
checklist:
  title: Was Sie vor dem Start benötigen
  items:
    - text: Eine Inhaltsstruktur mit Japanisch als Übersetzungsquelle
    - text: Eine Übersetzungsdatei-Layoutregel wie src/content/blog/{locale}/{slug}.md
    - text: GitHub Actions mit Pull-Requests-Leseberechtigung
    - text: Ein COPILOT_AGENT_TOKEN, der die Copilot-Coding-Agent-API aufrufen kann
    - text: Ein stabiler Build-Befehl wie npm run build
faq:
  title: Häufig gestellte Fragen
  items:
    - question: Werden beim Pushen eines japanischen Artikels automatisch Artikel in anderen Sprachen erstellt?
      answer: 'Ja. Die aktuelle Acecore-Website unterstützt 9 Sprachen — `ja`, `en`, `zh-cn`, `es`, `pt`, `fr`, `ko`, `de`, `ru` — daher kann das Pushen eines japanischen Artikels die direkte Erstellung von Copilot-Übersetzungs-PR-Tasks für die verbleibenden 8 Sprachen, die Erstellung von Übersetzungs-PRs, den Build und das automatische Merging auslösen. Auch ohne Übersetzungsdateien wird jede Sprach-URL mit einem japanischen Fallback bereitgestellt, sodass Sie zuerst veröffentlichen und später durch echte Übersetzungen ersetzen können.'
    - question: Warum einen PR-Task direkt erstellen, anstatt zuerst über ein Issue zu gehen?
      answer: 'Da das Ergebnis der Übersetzungsarbeit ein PR ist, wird der Ablauf kürzer, wenn man den Quellpfad, die Zielsprache und die Übersetzungsbedingungen direkt im Problem-Statement des Copilot-Tasks und im PR-Body-Marker fixiert. Durch die Suche nach offenen PRs mit dem Marker kann man auch die Doppelerstellung für denselben Quellpfad vermeiden.'
    - question: Ist automatisches Merging nicht riskant?
      answer: 'Bedingungsloses automatisches Merging ist riskant. Indem man es nur auf Übersetzungs-PRs beschränkt — Copilot muss den PR erstellt haben, der Titel beginnt mit [translation], der Build ist erfolgreich und es ist kein Entwurf — kann man es recht sicher halten.'
---

Um direkt zum Punkt zu kommen: Mit dieser Website reicht es aus, nur einen japanischen Artikel in Pages CMS zu veröffentlichen, damit dieser Artikel schließlich auf Japanisch plus 8 anderen Sprachen verfügbar ist. GitHub Actions und GitHub Copilot kümmern sich um die Erstellung von Übersetzungs-PR-Tasks, die Erstellung von Übersetzungs-PRs, das Bauen und das automatische Merging.

Der Betreiber muss im Alltag nur japanische Artikel und Autoreninformationen verwalten. Da es nicht mehr notwendig ist, jedes Mal manuell Übersetzungsaufgaben einzureichen oder PRs zu sortieren, reduziert dies die Last des Betriebs eines mehrsprachigen Blogs erheblich.

## Voraussetzungen für diesen Ansatz

Dieser Ansatz setzt voraus, dass die folgende Infrastruktur auf der Astro-Seite bereits vorhanden ist.

- 9-Sprachen-Routing (ja, en, zh-cn, es, pt, fr, ko, de, ru)
- Ein Fallback, der japanische Inhalte für Seiten ohne Übersetzungen bereitstellt
- Eine Betriebskonfiguration, bei der japanische Artikel und Autoreninformationen über Pages CMS aktualisiert werden können

Wie man diese Infrastruktur einrichtet, erfahren Sie unter [Eine Astro 6-Website auf 9 Sprachen umstellen — Automatische Übersetzung von 168 Blog-Artikeln und mehrsprachige Architektur](/blog/astro-i18n-blog-translation/). Dieser Artikel konzentriert sich ausschließlich darauf, wie man den automatischen Copilot-Übersetzungsworkflow auf dieser Basis aufbaut.

## Was dies ermöglicht

Aus Sicht des Betreibers gibt es nur 2 Bildschirme, mit denen Sie regelmäßig interagieren. In diesem Artikel verwenden wir die Pages CMS-Bildschirme wie sie sind, sodass sofort klar ist, **welche Bildschirme im täglichen Betrieb verwendet werden**.

![Pages CMS Japanische Blog-Listenseite](/uploads/pagescms-blog-ja-live-20260329.png)

Der erste Bildschirm ist die japanische Blog-Liste in Pages CMS. Hier können Sie Veröffentlichungsdaten und Autoreninformationen sehen, während Sie nur japanische Artikel hinzufügen oder aktualisieren. Der Schlüssel ist, im Modus "nur die japanische Quelle anfassen" zu bleiben, ohne jedes Mal in die Bearbeitungsbildschirme jeder Sprache eintauchen zu müssen.

![Pages CMS Autoreninformations-Formularbildschirm](/uploads/pagescms-authors-live-20260329.png)

Der zweite Bildschirm ist das Autoreninformationsformular. Indem man im CMS nur die japanischsprachigen Basisfelder für Autorendaten aktualisiert und den automatisierten GitHub-Ablauf das `i18n` für Übersetzungen verwalten lässt, wird die Trennung der betrieblichen Verantwortlichkeiten recht sauber.

## Fälle, in denen dieser Ansatz am besten funktioniert

Als Voraussetzung ist dies besonders effektiv für Teams und Websites wie die folgenden.

- Sie möchten Japanisch als Übersetzungsquelle verwenden
- Ihr Blog wird in Markdown verwaltet
- Jedes Mal manuell Übersetzungsaufgaben einzureichen ist lästig
- Sie sind damit einverstanden, dass KI einen guten Teil der Übersetzungsqualität übernimmt
- Sie möchten jedoch PRs stoppen, die beim Build scheitern oder als Entwürfe bestehen bleiben

Wenn Sie hingegen eine völlig unabhängige Redaktionskonfiguration pro Sprache haben, ist möglicherweise ein anderer Workflow besser geeignet.

## Schritt 1. Japanische Artikel als Übersetzungsquelle festlegen

Das erste, was entschieden werden muss, ist "welche Datei die Übersetzungsquelle ist." Unklarheit hier wird Ihre Automatisierung zum Scheitern bringen.

Die "Übersetzungsquelle" in diesem Artikel bezieht sich auf die **japanische Datei, die zuerst bearbeitet wird und als Grundlage für Artikel und abgeleitete Daten in jeder Sprache dient**.

In dieser Konfiguration sind Quelle und Ziel wie folgt aufgeteilt.

- Blog-Artikel-Quelle: `src/content/blog/{slug}.md`
- Blog-Artikel-Ziel: `src/content/blog/{locale}/{slug}.md`
- Autoreninformations-Quelle: `src/content/authors/{authorId}.json`
- Autoreninformations-Ziel: das `i18n`-Feld in `src/content/authors/{authorId}.json`
- Tag-Definitions-Quelle: `src/content/tags/{tagId}.json`
- Tag-Definitions-Ziel: das `i18n`-Feld in `src/content/tags/{tagId}.json`

Eine Verzeichnisstruktur ungefähr wie folgt ist einfach zu handhaben.

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

Der Schlüssel ist, **den Slug der Übersetzungsdatei mit dem Slug des japanischen Quellartikels abzugleichen**. Das allein macht es einfach, das Übersetzungsziel automatisch aus dem Quellpfad zu identifizieren.

In diesem Repo wird die URL jeder Sprache mit einem japanischen Fallback generiert, auch wenn Übersetzungsdateien noch nicht existieren. Das bedeutet, dass Sie im Modus "zuerst den japanischen Artikel veröffentlichen und Übersetzungs-PRs danach aufholen lassen" arbeiten können.

## Schritt 2. Pushes japanischer Artikel in Übersetzungs-PR-Tasks umwandeln

Der nächste Schritt ist die Verwendung von GitHub Actions, um Änderungen an japanischen Artikeln zu erkennen und direkt Copilot-Übersetzungs-PR-Tasks zu erstellen.

Die Mindestanforderungen sind:

- Pushes zu `main` überwachen
- Tasks nur automatisch für `src/content/blog/*.md` erstellen
- Tasks nur erstellen, wenn sich der Artikeltext ändert, nicht nur das Frontmatter
- Wenn ein offener PR mit demselben Quellpfad-Marker existiert, keine doppelten Tasks erstellen
- Den Quellpfad als Marker in den PR-Body einbetten

Autoreninformationen und Tag-Definitionen sind Übersetzungsziele, aber bei normalen Pushes werden keine Tasks automatisch erstellt. Sie nur über `workflow_dispatch` auszuführen, wenn es explizit notwendig ist, verhindert, dass sich unnötige Tasks ansammeln.

Zum Beispiel macht das Einfügen von Kommentaren wie diesem in den PR-Body ihn in der nachgelagerten Automatisierung wiederverwendbar.

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
```

Darüber hinaus können Sie durch den Vergleich nur des Markdown-Körpers bei der Entscheidung, wann Übersetzungs-Tasks erstellt werden sollen, vermeiden, versehentlich eine Flut von Tasks durch kleine Anpassungen wie das Aktualisieren eines Veröffentlichungsdatums oder eines Tags zu generieren.

## Schritt 3. PR-Tasks über die Copilot-Coding-Agent-API erstellen

Der Task wird direkt über die Copilot-Coding-Agent-API erstellt — nicht über die Issue-Erstellung.

Es gibt 2 Dinge zu tun.

1. `COPILOT_AGENT_TOKEN` als Repository-Secret hinzufügen
2. Nach der Erkennung einer Änderung die Job-Task-Erstellungs-API aufrufen

Konzeptionell rufen Sie den Task-Erstellungsendpunkt mit den entsprechenden Parametern auf.

```json
{
  "title": "[translation] Translate my-post.md",
  "problem_statement": "Translate the Japanese source article...",
  "event_type": "copilot_task"
}
```

Halten Sie zu diesem Zeitpunkt die reguläre automatische Erstellung nur auf Artikel beschränkt und führen Sie Autoreninformationen und Tag-Definitionen nur bei Bedarf über manuellen Dispatch aus, um den Betrieb stabil zu halten. Wenn Sie die Regeln explizit angeben — `i18n`-Felder in `src/content/authors/{authorId}.json` für Autoreninformationen, `i18n.name` in `src/content/tags/{tagId}.json` für Tag-Definitionen und Dateien mit demselben Namen unter `src/content/blog/{locale}/` für Artikel — werden Fehler reduziert.

## Schritt 4. Übersetzungs-PRs bauen und automatisch zusammenführen

Bedingungslose Automatisierung ist hier nicht sicher. Die Empfehlung ist, nur PRs, die alle folgenden Bedingungen erfüllen, für das Merging zuzulassen.

- Der PR wurde von Copilot erstellt
- Der Titel beginnt mit `[translation]`
- Er zielt auf `main` ab
- Er ist kein Entwurf
- Der Build war erfolgreich

In dieser Konfiguration ist der Prozess in 2 Stufen unterteilt.

1. `Translation PR Build`
2. `Merge Translation PR`

Der PR-Head wird gebaut, wenn er bereit zur Überprüfung ist, und wenn er erfolgreich ist, wird er sofort per Squash zusammengeführt. Da dies nicht von GitHubs Branch-Schutz abhängt, ist es auch in kleinen Repos einfach zu verwalten.

### Bedingungen, die für automatisches Merging durchgesetzt werden sollten

Beim Hinzufügen von automatischem Merging sind dies die empfohlenen Mindestbedingungen.

- Alles ausschließen, was kein Übersetzungs-PR ist
- Bei Build-Fehler stoppen
- Während es ein Entwurf ist, stoppen
- PRs ausschließen, die nicht von Copilot erstellt wurden

Mit diesen 4 Bedingungen können Sie den Unfall, normale Entwicklungs-PRs in das automatische Merge-Netz zu ziehen, weitgehend vermeiden.

## Schritt 5. Duplikate mit PR-Body-Markern verhindern

Das letzte Stück, das den Betrieb sauber hält, ist die Verhinderung von Duplikaten vor der Erstellung eines Übersetzungs-Tasks.

Der Ansatz ist einfach: Bevor ein Übersetzungs-PR-Task erstellt wird, tun Sie Folgendes.

1. Offene PRs suchen, die den `translation-source:`-Marker in ihrem Body enthalten
2. Wenn ein übereinstimmender PR existiert, ignorieren und keinen doppelten Task erstellen
3. Andernfalls mit der Erstellung des Übersetzungs-PR-Tasks fortfahren

Der Grund, den Marker im PR-Body zu verwenden, ist, dass sich das ausschließliche Verlassen auf den Titel manchmal als unzuverlässig für die Deduplizierung erweisen kann. **Die Verwendung eines eindeutigen Markers im PR-Body** hält es stabil und stellt sicher, dass nur ein Übersetzungs-Task pro Artikel erstellt wird.

## Hinweise

### Die Sprache der PRs von Copilot auf Japanisch ausrichten

Wenn Sie die Ausgabesprache von Copilot auf der GitHub-Seite stabilisieren möchten, ist die Verwendung von repository-weiten Anweisungen der direkteste Ansatz.

Das bedeutet, `.github/copilot-instructions.md` zu platzieren.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

Allein mit dieser einen Datei wird die Standardsprache und der Kontext, wenn der Copilot-Coding-Agent PRs erstellt, erheblich stabiler.

## Zusammenfassung

Der Kern dieser Konfiguration ist es, die Übersetzung von "etwas, das Menschen jedes Mal anfordern" in **einen Routineprozess zu verwandeln, der japanischen Quell-Pushes untergeordnet ist**.

Hier ist der Ablauf noch einmal.

1. Nur den japanischen Artikel schreiben
2. Ein Push erstellt direkt einen Copilot-Übersetzungs-PR-Task
3. Copilot erstellt den Übersetzungs-PR
4. Den Übersetzungs-PR bauen und automatisch zusammenführen
5. Duplikate durch Marker im PR-Body verhindern

Sobald dies vollständig zusammengestellt ist, fühlt sich der Betrieb vom Betreiberstandpunkt aus recht natürlich an. **Sobald Sie den japanischen Artikel pushen, werden die Artikel in anderen Sprachen nach und nach auf der GitHub-Seite erstellt**.

Natürlich geht es in der Praxis durch asynchrone Schritte — PR-Task-Erstellung, Copilot-Ausführung, PR-Erstellung, Build und Merge — sodass nicht alles "sofort" passiert. Aber der Betreiber muss nicht mehr jedes Mal manuell Übersetzungsaufgaben einreichen oder vergessen, PRs zu schließen.

Dieser Artikel selbst ist so strukturiert, dass die japanische Version als Ausgangspunkt in diesen Ablauf eingespeist werden kann. Wenn Sie eine mehrsprachige Website kontinuierlich betreiben, ist es wahrscheinlich am besten, mit etwa diesem Automatisierungsgrad zu beginnen.
