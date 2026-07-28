---
title: 'Sveltia CMS Einrichtungsleitfaden'
description: 'Praktischer Leitfaden zum Einbau von Sveltia CMS in Astro- und statische Websites: GitHub Backend, OAuth Worker, Medien-Uploads, Mehrsprachigkeit, CMS-PRs und Lessons Learned.'
date: 2026-06-07T16:00
lastUpdated: 2026-07-28T12:00
author: gui
tags: ['技術', 'CMS', 'Astro', 'Cloudflare', 'セキュリティ']
image: /uploads/acecore-generated/blog-cms-selection-and-turnstile.webp
processFigure:
  title: Ablauf der Sveltia-CMS-Einrichtung
  description: Admin-App, Authentifizierung, editierbare Inhalte, Medien und PR-Prozess sollten getrennt entworfen werden.
  steps:
    - title: Admin-App hinzufügen
      description: index.html und config.yml unter public/admin ablegen und Sveltia CMS laden.
      icon: i-lucide-layout
      accent: brand
    - title: GitHub konfigurieren
      description: Repo, Branch, OAuth Worker und CMS-Commit-Messages vor der Nutzung festlegen.
      icon: i-lucide-git-branch
      accent: emerald
    - title: Editierbaren Bereich begrenzen
      description: Nur Blog, Autoren, Tags und japanische Source-JSONs als Collections freigeben.
      icon: i-lucide-file-text
      accent: amber
    - title: Betrieb automatisieren
      description: main als Veröffentlichungsbranch nutzen und validierte Save-Proxy-Branches, CMS-PRs und Übersetzungs-Tasks verbinden.
      icon: i-lucide-git-pull-request
      accent: slate
compareTable:
  title: Vor und nach dem CMS
  before:
    label: Markdown manuell bearbeiten
    items:
      - Aktualisierungen sind vor allem für GitHub- oder Editor-Nutzer einfach
      - Bildpfade, Autoren-IDs und Tags werden leicht falsch getippt
      - Japanische Source und Übersetzungen können vermischt werden
      - Speicherziel und beschreibbare Pfade können unklar sein
  after:
    label: Bearbeitung mit Sveltia CMS
    items:
      - Markdown und JSON lassen sich im Browserformular bearbeiten
      - relation, image und select reduzieren ungültige Werte
      - Nur CMS-Commits lösen Übersetzungs-Tasks aus
      - Ein Same-Origin-Proxy schreibt nur erlaubte Pfade in einen kurzlebigen Branch und PR
callout:
  type: note
  title: Annahme dieses Leitfadens
  text: Sveltia CMS ist eine Browser-Admin-App, die Markdown und JSON über ein Git-Backend bearbeitet. Das Beispiel stammt von Acecore, ist aber auf viele Astro-Websites übertragbar.
checklist:
  title: Einrichtungs-Checklist
  items:
    - text: Sveltia CMS aus public/admin/index.html laden
      checked: true
    - text: GitHub Backend und Collections in public/admin/config.yml definieren
      checked: true
    - text: OAuth Worker für mehrere Editoren verwenden
      checked: true
    - text: media_folder und public_folder mit Astros public-Verzeichnis abgleichen
      checked: true
    - text: Festlegen, wie CMS-Commits Übersetzung oder Veröffentlichung auslösen
      checked: true
faq:
  title: Häufige Fragen
  items:
    - question: Für welche Websites eignet sich Sveltia CMS?
      answer: Für statische Websites, deren Markdown oder JSON im Repository liegt, etwa Astro, Hugo oder VitePress. Man ergänzt ein CMS ohne externe Datenbank.
    - question: Reicht ein GitHub Personal Access Token?
      answer: Zum Testen ja. Für mehrere oder nicht-technische Editoren ist ein OAuth Worker sicherer und leichter zu erklären.
    - question: Sollten alle Sprachen im CMS editierbar sein?
      answer: Für kleine Teams ist es sicherer, nur die japanische Source im CMS zu bearbeiten und Übersetzungen per PR zu aktualisieren.
---

Sveltia CMS ist nützlich, wenn eine statische Website eine Editieroberfläche erhalten soll, ohne Inhalte in eine externe Datenbank zu verschieben. Dieser Leitfaden beschreibt den Einbau in die Acecore-Astro-Website und die Korrekturen, die sich später aus echten PRs und Commits ergeben haben.

> **Aktualisiert am 28. Juli 2026:** CMS-Saves werden jetzt nach synchroner Prüfung direkt als einzelner `cms:`-Commit nach `main` geschrieben. GitHub OAuth prüft Editor und aktuelle Schreibberechtigung; eine nur für `acecore-net` installierte GitHub App führt Repository-Zugriffe aus. JSON-/Markdown-Schema, Bildsignatur, aktive HTML/URLs und erwarteter HEAD werden vor dem Schreiben geprüft.

Der Titel ist bewusst schlicht: **Sveltia CMS Einrichtungsleitfaden**. Es geht nicht um einen allgemeinen CMS-Vergleich, sondern um eine übertragbare Umsetzung.

## Wann Sveltia CMS passt

Sveltia CMS besitzt keine eigene Inhaltsdatenbank und stellt keine separate Content-API bereit. Es ist eine SPA im Browser, die Dateien im Repository über das GitHub Backend bearbeitet.

Es passt gut, wenn:

- Inhalte als Markdown oder JSON im Repository liegen
- Änderungen an Artikeln, Autoren, Tags und Seitentexten als Git-Diffs reviewbar bleiben sollen
- keine zusätzliche Datenbank oder Admin-Anwendung eingeführt werden soll
- Uploads unter `public/uploads` liegen können
- CMS-Saves die Veröffentlichung sofort starten sollen, während Codeänderungen weiter per Pull Request geschützt bleiben

Für komplexe Rollen, große Mediatheken, umfangreiche Freigabeprozesse oder Echtzeitdaten ist ein vollständiges Headless CMS sinnvoller.

## Gesamtarchitektur

```text
public/admin/index.html
  -> lädt @sveltia/cms per CDN

public/admin/config.yml
  -> definiert GitHub Backend, Collections und Medienordner

workers/sveltia-cms-auth
  -> Cloudflare Worker für GitHub OAuth

main branch
  -> einzige Quelle für die Produktion

CMS save proxy
  -> validiert Pfade und Inhalte und schreibt einen expected-HEAD cms:-Commit nach main

.github/workflows/create-translation-prs.yml
  -> erzeugt Übersetzungs-Tasks nur für cms:-Commits
```

Die Admin-Seite ist nur der Anfang. Authentifizierung, Medienpfade, Preview-Branches, Übersetzungen und Merge-Strategie gehören zur CMS-Architektur.

## 1. Admin unter `public/admin` ablegen

In Astro wird `public` unverändert statisch ausgeliefert. Auch die Sveltia-CMS-Dokumentation nennt `public` als Static-Folder für Astro, Next.js, Nuxt, Remix und VitePress.

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex,nofollow" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CMS</title>
  </head>
  <body>
    <script src="https://unpkg.com/@sveltia/cms@0.172.4/dist/sveltia-cms.js"></script>
  </body>
</html>
```

Zusätzliche CSS-Dateien oder `type="module"` sind nicht nötig. Die UI-Styles stecken im JavaScript-Bundle.

Acecore nutzt manuelle Initialisierung für explizite Backend-Konfiguration. Der Veröffentlichungsbranch bleibt in jeder Umgebung `main`.

```javascript
CMS.init({
  config: {
    backend: {
      branch: 'main',
    },
  },
})
```

## 2. GitHub Backend konfigurieren

Minimal braucht man `backend.name` und `backend.repo`. Für den Betrieb sollten Branch, OAuth und Commit-Messages ebenfalls feststehen.

```yaml
backend:
  name: github
  repo: owner/repository
  branch: main
  base_url: https://your-sveltia-cms-auth-worker.example.workers.dev
  api_root: /admin/api/github
  graphql_api_root: /admin/api/graphql
  auth_methods: [oauth]
  commit_messages:
    create: 'cms: create {{collection}} "{{slug}}"'
    update: 'cms: update {{collection}} "{{slug}}"'
    delete: 'cms: delete {{collection}} "{{slug}}"'
    uploadMedia: 'cms: upload "{{path}}"'
    deleteMedia: 'cms: delete media "{{path}}"'
```

`main` bleibt der Veröffentlichungsbranch. Reads und Saves laufen über einen Same-Origin-Proxy, der Repository, Schreibberechtigung des GitHub-Users, Änderungspfade und den aktuellen `main`-HEAD prüft und danach einen kurzlebigen Branch mit PR erstellt.

Mit Stand vom 20. Juli 2026 ist Editorial Workflow in Sveltia CMS nicht implementiert. Die Decap-CMS-Einstellung `publish_mode: editorial_workflow` lässt Sveltia CMS nicht automatisch kurzlebige Branches oder PRs erstellen.

Ein dauerhafter Branch wie `cms-content` erfordert laufende Synchronisierung und erhöht das Risiko für Konflikte oder eine falsche Deployment-Quelle. Kurzlebige Branches halten `main` als einzige Quelle der Wahrheit.

## 3. OAuth Worker ergänzen

Ein Personal Access Token reicht zum Testen, ist aber kein gutes Mehrbenutzer-Setup. Acecore verwendet Sveltia CMS Authenticator auf Cloudflare Workers und setzt dessen URL als `base_url`.

Der Callback der GitHub OAuth App zeigt auf `/callback` des Workers. Der Worker erhält `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` und optional `ALLOWED_DOMAINS`.

Das ist getrennt von Turnstile: OAuth schützt den CMS-Login, Turnstile schützt Formulare oder APIs gegen Bots.

## 4. Medienordner früh festlegen

Sveltia CMS speichert interne Medien im Repository. Für Astro ist diese Zuordnung praktikabel:

```yaml
media_folder: public/uploads
public_folder: /uploads
```

Acecore hat diesen Punkt später in [PR #116](https://github.com/acecore-systems/acecore-net/pull/116) korrigiert. Speicherpfad und öffentliche URL sollten direkt bei der CMS-Einführung gemeinsam festgelegt werden.

## 5. Collections trennen

| collection | Ziel                           | Regel                                                |
| ---------- | ------------------------------ | ---------------------------------------------------- |
| `blog`     | `src/content/blog/*.md`        | Nur japanische Source-Artikel bearbeiten             |
| `authors`  | `src/content/authors/*.json`   | Autorenprofile und lokalisierte Namen bearbeiten     |
| `tags`     | `src/content/tags/*.json`      | Tags und lokalisierte Namen bearbeiten               |
| page text  | `src/i18n/source/ja/**/*.json` | Japanische Source-Texte für Seiten und UI bearbeiten |

Nicht alle übersetzten Markdown-Dateien müssen im CMS editierbar sein. Acecore behandelt Japanisch als kanonische Source und aktualisiert Übersetzungen über [Mehrsprachige Blogs mit Sveltia CMS betreiben](/de/blog/copilot-translation-pipeline/).

## 6. relation und select verwenden

Tags sollten über relation gewählt werden, nicht als Freitext.

```yaml
- name: tags
  label: Tags
  widget: relation
  collection: tags
  value_field: name
  display_fields: ['{{name}} ({{id}})']
  search_fields: [name, id]
  multiple: true
  required: false
```

Dasselbe gilt für Autoren, Icons und Hinweisstile. Ein gutes CMS macht nicht nur Bearbeitung möglich, sondern verhindert kaputte Werte.

## 7. Japanische Source-JSONs editierbar machen

Feste Seitentexte lassen sich ebenfalls im CMS pflegen. Acecore bündelt sie unter `src/i18n/source/ja/**/*.json`.

Die Lehre: Nicht alle Felder auf einmal hinzufügen. `config.yml` wächst schnell. Besser mit Blog, Autoren, Tags, Hinweisen und häufig geänderten Seiten starten.

## 8. Auch in Preview `main` als Veröffentlichungsbranch behalten

Der Backend-Branch bleibt auch in Preview `main`. Ein erfolgreicher CMS-Save schreibt direkt nach `main` und startet sofort das GitHub-verbundene Production-Deployment. Pages-Previews bleiben für normale Code- und Konfigurations-PRs.

```javascript
CMS.init({
  config: {
    backend: {
      branch: 'main',
    },
  },
})
```

## 9. Mit dem Save-Proxy prüfen und direkt veröffentlichen

Ein Same-Origin-Save-Proxy prüft den erlaubten Umfang und den Inhalt synchron und erstellt genau einen Commit auf `main`.

```yaml
backend:
  name: github
  repo: owner/repository
  branch: main
  api_root: /admin/api/github
  graphql_api_root: /admin/api/graphql
```

GitHub OAuth prüft direkt vor dem Save den Editor und dessen Schreibberechtigung. Ein kurzlebiges Installation-Token der nur für `acecore-net` installierten GitHub App übernimmt Repository-Lese- und Schreibzugriffe. Erlaubt sind nur freigegebene Inhalte und Bildformate; SVG und PDF werden abgewiesen.

Der Save verwendet den Start-HEAD als `expectedHeadOid`; konkurrierende Änderungen liefern 409. Bei verlorener GitHub-Antwort gilt der Save nur dann als erfolgreich, wenn Request-Marker, Parent-SHA, alle Pfade und Blob-SHAs übereinstimmen.

Der direkte Commit behält ein Subject wie `cms: create ...` oder `cms: update ...`. Derselbe GitHub-App-Push startet Pages Deployment und Übersetzungs-Task. Code, Schema, Workflows, CMS-Konfiguration und Übersetzungsdateien bleiben PR- und CI-pflichtig.

## 10. Übersetzung nur durch CMS-Commits auslösen

[PR #98](https://github.com/acecore-systems/acecore-net/pull/98) fügte `--cms-only` hinzu, damit Push-basierte Übersetzungs-Tasks nur auf CMS-Commits reagieren.

```javascript
function isCmsCommitSubject(subject) {
  return /^cms: (create|update|delete) /.test(subject || '')
}
```

`cms:` ist ein Workflow-Vertrag, kein dekoratives Präfix.

## 11. Eigenes CSP für `/admin`

Die Admin-App verbindet sich mit CDN, GitHub API, OAuth Worker und blob URLs. Daher trennt Acecore die CSP für `/admin/*` und setzt diesen Bereich auf `noindex`.

## Turnstile trennen

Die alte Fassung mischte CMS und Cloudflare Turnstile. Das war thematisch unscharf.

Sveltia CMS betrifft GitHub Backend, OAuth, Collections, Medien und PRs. Turnstile betrifft Bot-Schutz für Formulare oder APIs. Beides unterstützt sicheren Betrieb, liegt aber auf unterschiedlichen Ebenen.

## Lessons Learned aus PRs und Commits

- Wenn das CMS wechselt, müssen Artikel und interne Links mitziehen.
- OAuth ist Teil des echten Setups, kein späteres Extra.
- Medienpfade sollten vor den Uploads feststehen.
- `config.yml` sollte schrittweise wachsen.
- `cms:` ist ein Automatisierungsvertrag.
- Der Veröffentlichungsbranch bleibt `main`; Preview dient normalen Code- und Konfigurations-PRs.

## Minimaler Startpunkt

```text
public/admin/index.html
public/admin/config.yml
public/admin/init.js
public/admin/runtime-config.js
```

Danach folgen Autoren-Relationen, Tag-Relationen, Bilder, Source-JSONs, synchrone Direct-Publish-Prüfung und Übersetzungs-Tasks.

## Referenzen

- [Sveltia CMS Getting Started](https://sveltiacms.app/en/docs/start)
- [Sveltia CMS GitHub Backend](https://sveltiacms.app/en/docs/backends/github)
- [Sveltia CMS Editorial Workflow (nicht implementiert)](https://sveltiacms.app/en/docs/workflows/editorial)
- [Sveltia CMS Internal Media Storage](https://sveltiacms.app/en/docs/media/internal)
- [Sveltia CMS Manual Initialization](https://sveltiacms.app/en/docs/api/initialization)
- [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth)

## Fazit

Sveltia CMS lässt sich leicht unter `public/admin` ablegen. Für Produktion müssen aber Branch, OAuth, Medienordner, Source-Sprache, Übersetzungs-Workflow und Merge-Strategie geklärt sein. Dann bleibt eine Astro-Website statisch und leichtgewichtig, bekommt aber einen brauchbaren Inhaltsprozess.
