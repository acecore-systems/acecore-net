---
title: 'Mehrsprachige Blogs mit Sveltia CMS betreiben'
description: 'Ein praktischer Workflow: japanische Quellartikel in Sveltia CMS bearbeiten, Übersetzungs-PRs mit GitHub Actions und GitHub Copilot erstellen und lokalisierte statische Seiten veröffentlichen, die für Suchmaschinen klarer sind als reine UI-Übersetzung.'
date: 2026-06-07T17:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS', 'SEO']
image: /uploads/acecore-generated/blog-copilot-translation-pipeline.webp
callout:
  type: tip
  title: UI-Übersetzung ist keine mehrsprachige Veröffentlichung
  text: 'Browser-Übersetzung oder Widgets helfen beim Lesen, erzeugen aber keine sprachspezifischen URLs, Title, Description, internen Links, RSS, Sitemap oder hreflang. Für Suchmaschinen sollten übersetzte statische HTML-Seiten veröffentlicht werden.'
linkCards:
  - href: /de/blog/cms-selection-and-turnstile/
    title: Sveltia CMS Einrichtungsleitfaden
    description: Sveltia CMS in einer statischen Astro-Website einrichten.
    icon: i-lucide-badge-check
  - href: /de/blog/astro-i18n-blog-translation/
    title: Mehrsprachige Astro-Architektur
    description: Routen, Fallback, hreflang, RSS und Sitemap für 9 Sprachen.
    icon: i-lucide-globe-2
faq:
  title: FAQ
  items:
    - question: Reicht UI-Übersetzung?
      answer: 'Zum Lesen kann sie reichen. Für SEO, RSS, Sitemap und interne Links pro Sprache braucht man echte lokalisierte Seiten.'
    - question: Ist KI-Übersetzung schlecht für SEO?
      answer: 'Nicht die KI ist das Problem, sondern viele wertlose Seiten ohne Prüfung. Terminologie, Fakten, Links und Natürlichkeit müssen geprüft werden.'
    - question: Sind übersetzte Seiten Duplicate Content?
      answer: 'Google betrachtet lokalisierte Seiten nur dann als Duplikate, wenn der Hauptinhalt nicht übersetzt ist. Varianten sollten mit hreflang verbunden werden.'
---

Acecore bearbeitet Inhalte hauptsächlich auf Japanisch, veröffentlicht den Blog aber in 9 Sprachen. Entscheidend ist: **Text in der Oberfläche übersetzen** und **lokalisierte Seiten veröffentlichen** sind verschiedene Dinge.

Browser-Übersetzung hilft Nutzern beim Lesen. Sie erzeugt aber keine `/de/blog/.../` URL, keine lokalisierten Metadaten, kein RSS, keine Sitemap und kein hreflang.

Wenn mehrsprachiger Content auch Suchtraffic bringen soll, muss Übersetzung Teil des Veröffentlichungsprozesses sein.

## Struktur

- Japanische Quelle: `src/content/blog/{slug}.md`
- Übersetzungen: `src/content/blog/{locale}/{slug}.md`
- URLs: `/blog/{slug}/`, `/en/blog/{slug}/`, `/de/blog/{slug}/`
- Bearbeitung: Sveltia CMS
- Übersetzung: GitHub-Copilot-PRs
- Veröffentlichung: Build und Review

Sveltia CMS ist die Oberfläche für die japanische Quelle. Übersetzungen laufen über Pull Requests, damit Review, Historie und CI erhalten bleiben.

## Wann UI-Übersetzung reicht

Sie eignet sich für interne Lektüre, einmalige Recherche, Admin-Seiten oder Inhalte ohne Suchstrategie.

Das ist leichtgewichtig, erzeugt aber keine indexierbaren Sprachseiten.

## SEO-Vorteile statischer Sprachseiten

Suchmaschinen, Social Previews und RSS-Reader arbeiten mit URLs und HTML.

Wenn nur die japanische Seite existiert, bleiben `title`, `description`, strukturierte Daten, RSS und Sitemap japanisch, auch wenn der Browser dem Nutzer eine Übersetzung zeigt.

Mit statischen Übersetzungen erhält jede Sprache eine URL.

```txt
/blog/copilot-translation-pipeline/
/en/blog/copilot-translation-pipeline/
/de/blog/copilot-translation-pipeline/
/fr/blog/copilot-translation-pipeline/
```

### 1. Jede Sprache ist direkt crawlbar

Google kann JavaScript verarbeiten, dokumentiert aber auch Einschränkungen und empfiehlt statisches oder serverseitiges Rendering als stabilere Lösung. Andere Crawler und RSS-Reader sind oft weniger leistungsfähig.

### 2. Metadaten sind lokalisiert

Frontmatter kann pro Sprache übersetzt werden:

```yaml
title: 'Mehrsprachige Blogs mit Sveltia CMS betreiben'
description: 'Workflow für Übersetzungs-PRs mit Sveltia CMS und GitHub Copilot.'
```

Das wirkt auf Suchergebnisse, OGP, Related Cards und RSS.

### 3. hreflang verbindet Varianten

Google empfiehlt `hreflang`, wenn verschiedene URLs verschiedene Sprachen oder Regionen bedienen. Ohne lokalisierte URL gibt es nichts zu verbinden.

### 4. RSS und Sitemap werden mehrsprachig

Mit Übersetzungsdateien kann die Website `/de/rss.xml` und lokalisierte Sitemap-URLs ausgeben.

## Rolle von Sveltia CMS

Sveltia CMS übersetzt nicht. Es hält die Bearbeitung der japanischen Quelle schlank:

- japanische Artikel
- Autoren
- Tags
- japanische Source-JSON
- Bilder
- Frontmatter wie date, FAQ und linkCards

Die CMS-Einrichtung steht im [Sveltia CMS Einrichtungsleitfaden](/de/blog/cms-selection-and-turnstile/).

## Regeln für Copilot

Der Übersetzungs-PR muss klar trennen, was erhalten bleibt und was lokalisiert wird.

```md
Keep:

- slug
- image path
- author id
- tag ids
- external URLs
- code blocks

Localize:

- title
- description
- FAQ
- body text
- internal blog URLs when locale-specific URLs exist
```

## Lehren aus den PRs

- Alte Artikel nannten noch Pages CMS, obwohl die Implementierung Sveltia CMS nutzt.
- Bleibt `date` alt, erscheint ein neu geschriebener Artikel nicht oben im Blog.
- Slugs müssen über Sprachen hinweg stabil bleiben.
- Interne Links sollten zur Locale des Lesers führen.
- KI-Übersetzung spart Zeit, braucht aber Review.

## Quellen

- [Google Search Central: Localized Versions of your Pages](https://developers.google.com/search/docs/advanced/crawling/localized-versions?hl=en&rd=1&visit_id=638856769088389068-716743185)
- [Google Search Central: Managing Multi-Regional and Multilingual Sites](https://developers.google.com/search/docs/advanced/crawling/managing-multi-regional-sites)
- [Google Search Central: JavaScript SEO Basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google Search Central: Spam Policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [Sveltia CMS Einrichtungsleitfaden](/de/blog/cms-selection-and-turnstile/)

## Fazit

UI-Übersetzung hilft beim Lesen. Lokalisierte statische Seiten machen jede Sprache zu echtem Website-Content.

Sveltia CMS bearbeitet Japanisch, GitHub Copilot erstellt Übersetzungs-PRs, und Astro build prüft das Ergebnis vor der Veröffentlichung.
