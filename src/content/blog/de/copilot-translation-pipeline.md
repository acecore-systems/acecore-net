---
title: 'Wie man einen Blog in 9 Sprachen betreibt, indem man nur einen japanischen Artikel veröffentlicht'
description: 'Ein Leitfaden zum Arbeitsablauf, der automatisch übersetzte Artikel auf Japanisch + 8 Sprachen generiert, Builds ausführt und automatisches Merging verwaltet — alles ausgelöst durch das Aktualisieren eines japanischen Artikels in Pages CMS über GitHub Actions und GitHub Copilot.'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
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
    - title: Übersetzungs-Issues automatisch erstellen
      description: GitHub Actions erstellt Issues mit dem Quellpfad und den Zielsprachen eingebettet.
      icon: i-lucide-ticket
    - title: Copilot erstellt Übersetzungs-PRs
      description: Nach Erhalt des Issues generiert Copilot Übersetzungsdateien und öffnet einen Übersetzungs-PR.
      icon: i-lucide-git-pull-request
    - title: Bauen, zusammenführen und Issue schließen
      description: Nach einem erfolgreichen Build wird der PR automatisch zusammengeführt und das übergeordnete Übersetzungs-Issue automatisch geschlossen.
      icon: i-lucide-check-check
compareTable:
  title: Manueller vs. automatisierter Übersetzungsworkflow
  before:
    label: Manueller Übersetzungsworkflow
    items:
      - Jemand erstellt manuell Übersetzungsaufgaben nach der Veröffentlichung eines Artikels
      - Verantwortliche werden pro Sprache zugewiesen
      - Builds und Merge-Entscheidungen werden von Menschen verwaltet
      - Übergeordnete Issues werden oft vergessen und bleiben offen
  after:
    label: Automatisierter Übersetzungsworkflow
    items:
      - Ein Push zum japanischen Artikel löst den gesamten Ablauf aus
      - Wird automatisch Copilot zugewiesen
      - Übersetzungs-PRs werden nach einem erfolgreichen Build automatisch zusammengeführt
      - Übergeordnete Issues werden nach dem Merge automatisch geschlossen
checklist:
  title: Was Sie vor dem Start benötigen
  items:
    - text: Eine Inhaltsstruktur mit Japanisch als Übersetzungsquelle
    - text: Eine Übersetzungsdatei-Layoutregel wie src/content/blog/{locale}/{slug}.md
    - text: GitHub Actions mit Issues-Schreibberechtigung
    - text: Ein COPILOT_AGENT_TOKEN, der die Copilot-Zuweisungs-API aufrufen kann
    - text: Ein stabiler Build-Befehl wie npm run build
faq:
  title: Häufig gestellte Fragen
  items:
    - question: Werden beim Pushen eines japanischen Artikels automatisch Artikel in anderen Sprachen erstellt?
      answer: 'Ja. Die aktuelle Acecore-Website unterstützt 9 Sprachen — `ja`, `en`, `zh-cn`, `es`, `pt`, `fr`, `ko`, `de`, `ru` — daher kann das Pushen eines japanischen Artikels die Erstellung von Übersetzungs-Issues für die verbleibenden 8 Sprachen, die Copilot-Zuweisung, die Erstellung von Übersetzungs-PRs, den Build, das automatische Merging und das Schließen von Issues auslösen. Auch ohne Übersetzungsdateien wird jede Sprach-URL mit einem japanischen Fallback bereitgestellt, sodass Sie zuerst veröffentlichen und später durch echte Übersetzungen ersetzen können.'
    - question: Warum zuerst ein Issue erstellen, anstatt direkt einen PR zu öffnen?
      answer: 'Weil es ermöglicht, den Quellpfad, die Zielsprache und die Übersetzungsbedingungen im Issue zu fixieren. Dies erleichtert das erneute Ausführen, die Überprüfung des Verlaufs und die Wiederherstellung nach Fehlern erheblich.'
    - question: Ist automatisches Merging nicht riskant?
      answer: 'Bedingungsloses automatisches Merging ist riskant. Indem man es nur auf Übersetzungs-PRs beschränkt — Copilot muss den PR erstellt haben, der Titel beginnt mit [translation], der Build ist erfolgreich und es ist kein Entwurf — kann man es recht sicher halten.'
---

Um direkt zum Punkt zu kommen: Mit dieser Website reicht es aus, nur einen japanischen Artikel in Pages CMS zu veröffentlichen, damit dieser Artikel schließlich auf Japanisch plus 8 anderen Sprachen verfügbar ist. GitHub Actions und GitHub Copilot kümmern sich um die Erstellung von Übersetzungs-Issues, die Erstellung von Übersetzungs-PRs, das Bauen, das automatische Merging und das Schließen des übergeordneten Issues.

Der Betreiber muss im Alltag nur japanische Artikel und Autoreninformationen verwalten. Da es nicht mehr notwendig ist, jedes Mal manuell Übersetzungsaufgaben einzureichen oder PRs zu sortieren, reduziert dies die Last des Betriebs eines mehrsprachigen Blogs erheblich.

## Voraussetzungen für diesen Ansatz

Dieser Ansatz setzt voraus, dass die folgende Infrastruktur auf der Astro-Seite bereits vorhanden ist.

- 9-Sprachen-Routing (ja, en, zh-cn, es, pt, fr, ko, de, ru)
- Ein Fallback, der japanische Inhalte für Seiten ohne Übersetzungen bereitstellt
- Eine Betriebskonfiguration, bei der japanische Artikel und Autoreninformationen über Pages CMS aktualisiert werden können

Wie man diese Infrastruktur einrichtet, erfahren Sie unter [Eine Astro 6-Website auf 9 Sprachen umstellen — Automatische Übersetzung von 136 Blog-Artikeln und mehrsprachige Architektur](/blog/astro-i18n-blog-translation/). Dieser Artikel konzentriert sich ausschließlich darauf, wie man den automatischen Copilot-Übersetzungsworkflow auf dieser Basis aufbaut.

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

## Schritt 2. Pushes japanischer Artikel in Übersetzungs-Issues umwandeln

Der nächste Schritt ist die Verwendung von GitHub Actions, um Änderungen an japanischen Artikeln zu erkennen und automatisch Übersetzungs-Issues zu erstellen.

Die Mindestanforderungen sind:

- Pushes zu `main` überwachen
- Issues nur automatisch für `src/content/blog/*.md` erstellen
- Issues nur erstellen, wenn sich der Artikeltext ändert, nicht nur das Frontmatter
- Wenn ein offenes Issue mit demselben Quellpfad existiert, es aktualisieren, anstatt ein neues zu erstellen
- Den Quellpfad als Marker in den Issue-Body einbetten

Autoreninformationen und Tag-Definitionen sind Übersetzungsziele, aber bei normalen Pushes werden keine Issues automatisch erstellt. Sie nur über `workflow_dispatch` auszuführen, wenn es explizit notwendig ist, verhindert, dass sich unnötige Issues ansammeln.

Zum Beispiel macht das Einfügen von Kommentaren wie diesem in den Issue-Body ihn in der nachgelagerten Automatisierung wiederverwendbar.

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

Darüber hinaus können Sie durch den Vergleich nur des Markdown-Körpers bei der Entscheidung, wann Übersetzungs-Issues erstellt werden sollen, vermeiden, versehentlich eine Flut von Issues durch kleine Anpassungen wie das Aktualisieren eines Veröffentlichungsdatums oder eines Tags zu generieren.

Das Wichtige hier ist nicht "Übersetzungen direkt zu erstellen", sondern **zuerst ein Issue zu erstellen**. Durch das Einfügen eines Issues werden der Quellpfad, die Zielsprache und die Übersetzungsbedingungen in einer Form fixiert, die sowohl für Menschen als auch für KI sichtbar ist.

## Schritt 3. Übersetzungs-Issues automatisch Copilot zuweisen

Das bloße Erstellen des Issues lässt noch manuelle Arbeit übrig, daher ist dies der Punkt, an dem Sie Copilot automatisch zuweisen.

Es gibt 2 Dinge zu tun.

1. `COPILOT_AGENT_TOKEN` als Repository-Secret hinzufügen
2. Nach der Issue-Erstellung die Zuweisungs-API aufrufen

Konzeptionell patchen Sie das Issue, um Copilot als Beauftragten festzulegen.

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

## Schritt 5. Das übergeordnete Übersetzungs-Issue nach dem Merge automatisch schließen

Das letzte Stück, das den Betrieb sauber hält, ist das automatische Schließen des übergeordneten Issues nach einem Merge.

Der Ansatz ist einfach: Für zusammengeführte Übersetzungs-PRs tun Sie Folgendes.

1. Die geänderten Dateien des PRs abrufen
2. Auch den Quellpfad aus dem PR-Body lesen
3. Offene Issues suchen, die dem `translation-source:`-Marker entsprechen
4. Einen Kommentar hinzufügen und schließen

Der Grund, auch nach dem Quellpfad im PR-Body zu schauen, ist, dass sich das ausschließliche Verlassen auf die geänderten Dateien von Copilot-erstellten PRs manchmal als unzuverlässig erweisen kann. **Sowohl die geänderten Dateien als auch den PR-Body zu verwenden** hält es stabil.

## Hinweise

### Die Sprache der PRs und Issues von Copilot auf Japanisch ausrichten

Wenn Sie die Ausgabesprache von Copilot auf der GitHub-Seite stabilisieren möchten, ist die Verwendung von repository-weiten Anweisungen der direkteste Ansatz.

Das bedeutet, `.github/copilot-instructions.md` zu platzieren.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

Allein mit dieser einen Datei wird die Standardsprache und der Kontext, wenn der Copilot-Coding-Agent Issues und PRs erstellt, erheblich stabiler.

## Zusammenfassung

Der Kern dieser Konfiguration ist es, die Übersetzung von "etwas, das Menschen jedes Mal anfordern" in **einen Routineprozess zu verwandeln, der japanischen Quell-Pushes untergeordnet ist**.

Hier ist der Ablauf noch einmal.

1. Nur den japanischen Artikel schreiben
2. Ein Push erstellt automatisch Übersetzungs-Issues
3. Automatisch Copilot zuweisen
4. Den Übersetzungs-PR bauen und automatisch zusammenführen
5. Das übergeordnete Issue automatisch schließen

Sobald dies vollständig zusammengestellt ist, fühlt sich der Betrieb vom Betreiberstandpunkt aus recht natürlich an. **Sobald Sie den japanischen Artikel pushen, werden die Artikel in anderen Sprachen nach und nach auf der GitHub-Seite erstellt**.

Natürlich geht es in der Praxis durch asynchrone Schritte — Issue-Erstellung, Copilot-Ausführung, PR-Erstellung, Build und Merge — sodass nicht alles "sofort" passiert. Aber der Betreiber muss nicht mehr jedes Mal manuell Übersetzungsaufgaben einreichen oder vergessen, PRs zu schließen.

Dieser Artikel selbst ist so strukturiert, dass die japanische Version als Ausgangspunkt in diesen Ablauf eingespeist werden kann. Wenn Sie eine mehrsprachige Website kontinuierlich betreiben, ist es wahrscheinlich am besten, mit etwa diesem Automatisierungsgrad zu beginnen.
