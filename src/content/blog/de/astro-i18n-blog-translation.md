---
title: 'Astro 6 Website für 9 Sprachen fit machen ― Automatische Übersetzung von 136 Blogartikeln und mehrsprachige Architektur'
description: 'Dokumentation der Internationalisierung einer Astro 6 + UnoCSS + Cloudflare Pages Website auf 9 Sprachen. Vom UI-i18n über die Übersetzung von 136 Blogartikeln bis zur mehrsprachigen Pages CMS-Konfiguration.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'i18n', 'Webサイト']
image: https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop&q=80
processFigure:
  title: Mehrsprachiger Workflow
  steps:
    - title: i18n-Grundlage
      description: Astros integriertes i18n-Routing und Übersetzungsutilities einrichten.
      icon: i-lucide-globe
    - title: UI-Textübersetzung
      description: Anzeigetexte in Header, Footer und allen Komponenten übersetzen.
      icon: i-lucide-languages
    - title: Blogartikel-Übersetzung
      description: 136 Übersetzungsdateien generieren (17 Artikel × 8 Sprachen).
      icon: i-lucide-file-text
    - title: CMS und Build-Verifizierung
      description: Mehrsprachige Pages CMS-Konfiguration und Verifizierung aller Seitenbuilds.
      icon: i-lucide-check-circle
compareTable:
  title: Vorher-Nachher-Vergleich
  before:
    label: Nur Japanisch
    items:
      - Nur 1 Sprache (Japanisch)
      - 17 Blogartikel
      - 523 Seiten generiert (nach UI-Mehrsprachigkeit)
      - Pages CMS mit 1 Blog-Kollektion
      - Tags und Autorendaten nur auf Japanisch
      - 1 RSS-Feed
  after:
    label: 9 Sprachen
    items:
      - Japanisch + 8 Sprachen (en, zh-cn, es, pt, fr, ko, de, ru)
      - 17 Blogartikel + 136 Übersetzungen = 153 insgesamt
      - 541 Seiten generiert (übersetzte Artikel mit Fallback)
      - Pages CMS mit 9 sprachspezifischen Kollektionen
      - 25 Tags und Autorendaten je Sprache übersetzt
      - Mehrsprachige RSS-Feeds (9 Sprachen)
callout:
  type: info
  title: Unterstützte Sprachen
  text: 'Unterstützt 9 Sprachen: Japanisch (Standard), Englisch, Vereinfachtes Chinesisch, Spanisch, Portugiesisch, Französisch, Koreanisch, Deutsch und Russisch.'
statBar:
  items:
    - value: '9'
      label: Unterstützte Sprachen
    - value: '136'
      label: Übersetzte Artikel
    - value: '541'
      label: Generierte Seiten
faq:
  title: Häufig gestellte Fragen
  items:
    - question: Warum wurden 9 Sprachen gewählt?
      answer: 'Um die globale Reichweite zu maximieren, haben wir die wichtigsten Sprachmärkte abgedeckt. Englisch, Chinesisch, Spanisch und Portugiesisch decken die Mehrheit der Internetnutzer ab, während Französisch, Deutsch, Russisch und Koreanisch die restlichen Hauptmärkte ergänzen.'
    - question: Wie wird die Übersetzungsqualität sichergestellt?
      answer: 'Wir nutzen KI-Übersetzung mit GitHub Copilot. Zuerst wird die englische Version als Zwischensprache erstellt, dann vom Englischen in jede Zielsprache übersetzt, um Qualitätsschwankungen zu reduzieren. Tag-Werte im Frontmatter bleiben auf Japanisch, URLs, Codeblöcke und Bildpfade werden nicht verändert.'
    - question: Was passiert, wenn ein übersetzter Artikel nicht existiert?
      answer: 'Die Fallback-Funktion zeigt den japanischen Originalartikel an, wenn keine Übersetzung vorhanden ist. Übersetzungen können schrittweise hinzugefügt werden.'
    - question: Muss beim Hinzufügen eines neuen Artikels übersetzt werden?
      answer: 'Übersetzung ist nicht zwingend erforderlich — wenn keine Übersetzungsdatei existiert, wird die japanische Version als Fallback angezeigt. Um eine Übersetzung hinzuzufügen, genügt es, eine Markdown-Datei mit dem gleichen Namen im entsprechenden Sprachverzeichnis zu erstellen.'
---

Wir haben die offizielle Acecore-Website von reinem Japanisch auf Unterstützung für 9 Sprachen erweitert. Dieser Artikel beschreibt den gesamten Prozess: UI-Internationalisierung, Übersetzung von 17 Blogartikeln × 8 Sprachen = 136 Dateien und mehrsprachige Pages CMS-Konfiguration.

## Mehrsprachigkeitsstrategie

### Umfangsdefinition

Wir haben die Mehrsprachigkeit in drei Phasen umgesetzt:

1. **i18n-Grundlage**: Astros integrierte i18n-Routing-Konfiguration, Übersetzungsutilities und Übersetzungs-JSON-Dateien für 9 Sprachen
2. **UI-Textübersetzung**: Komponententexte in Header, Footer, Seitenleiste und auf allen Seiten
3. **Blogartikel-Übersetzung**: Alle 17 Artikel in 8 Sprachen übersetzt (136 Dateien generiert)

### URL-Design

Wir nutzen Astros `prefixDefaultLocale: false`, wobei Japanisch unter dem Root-Pfad (`/blog/...`) und andere Sprachen mit Präfixen (`/en/blog/...`, `/zh-cn/blog/...` usw.) bereitgestellt werden.

```
# Japanisch (Standard)
/blog/astro-performance-tuning/

# Englisch
/en/blog/astro-performance-tuning/

# Vereinfachtes Chinesisch
/zh-cn/blog/astro-performance-tuning/
```

Durch die Verwendung des gleichen Slugs in allen Sprachen bleibt das URL-Mapping beim Sprachwechsel einfach.

## i18n-Grundlagen-Implementierung

### Astro i18n-Konfiguration

Das i18n-Routing wird in `astro.config.mjs` konfiguriert.

```javascript
// astro.config.mjs
export default defineConfig({
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
})
```

### Übersetzungsutilities

Konfigurationsdateien, Utility-Funktionen und Übersetzungs-JSON-Dateien sind in `src/i18n/` zusammengefasst.

```typescript
// src/i18n/utils.ts
export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key]
    ?? translations[defaultLocale][key]
    ?? key
}
```

Die Übersetzungsdateien liegen im JSON-Format unter `src/i18n/locales/` und verwalten etwa 100 Schlüssel für Navigation, Footer, Blog-UI und Metadaten.

### View-Component-Pattern

Die Seitenimplementierung nutzt das **View-Component-Pattern**. Layout und Logik sind in `src/views/` zentralisiert, während die Routendateien (`src/pages/`) leichtgewichtige Wrapper sind, die nur das Locale weiterreichen.

```astro
---
// src/pages/[locale]/about.astro (Routendatei)
import AboutPage from '../../views/AboutPage.astro'
const { locale } = Astro.params
---
<AboutPage locale={locale} />
```

Dieses Design eliminiert die Logik-Duplizierung zwischen der japanischen Route (`/about`) und den mehrsprachigen Routen (`/en/about`).

## Mehrsprachige Blog-Inhalte

### Verzeichnisstruktur

Übersetzte Artikel werden in Unterverzeichnissen mit Sprachcode abgelegt. Astros Glob-Loader erkennt sie automatisch rekursiv mit dem Pattern `**/*.md`.

```
src/content/blog/
  astro-performance-tuning.md          # Japanisch (Basis)
  website-renewal.md
  en/
    astro-performance-tuning.md        # Englische Version
    website-renewal.md
  zh-cn/
    astro-performance-tuning.md        # Chinesische Version (vereinfacht)
    website-renewal.md
  es/
    ...
```

### Content-Resolution-Utilities

In `src/utils/blog-i18n.ts` wurden 3 Funktionen implementiert.

```typescript
// Prüfen ob es ein Basisartikel ist (kein Slash in der ID = Basis)
export function isBasePost(post: CollectionEntry<'blog'>): boolean {
  return !post.id.includes('/')
}

// Locale-Präfix aus der ID entfernen, um den Basis-Slug zu erhalten
export function getBaseSlug(postId: string): string {
  const idx = postId.indexOf('/')
  return idx !== -1 ? postId.slice(idx + 1) : postId
}

// Lokalisierte Version eines Basisartikels abrufen (Fallback auf Original)
export function localizePost(
  post: CollectionEntry<'blog'>,
  allPosts: CollectionEntry<'blog'>[],
  locale: Locale,
): CollectionEntry<'blog'> {
  if (locale === defaultLocale) return post
  return allPosts.find((p) => p.id === `${locale}/${post.id}`) ?? post
}
```

Der entscheidende Punkt: **Das bestehende Content-Collection-Schema wird nicht verändert.** Astros Glob-Loader erkennt Dateien in Unterverzeichnissen automatisch mit IDs wie `en/astro-performance-tuning`, sodass keine Konfigurationsänderungen notwendig sind.

### Regeln für Übersetzungsdateien

Übersetzungsdateien wurden nach folgenden Regeln erstellt:

- **Frontmatter-Schlüssel** bleiben auf Englisch (`title`, `description`, `date` usw.)
- **Tag-Werte** bleiben auf Japanisch (`['技術', 'Astro']` usw.)
- **URLs, Bildpfade, Codeblöcke und HTML** werden nicht verändert
- **Datum und Autor** bleiben unverändert
- **Fließtext und Frontmatter-Textwerte** (title, description, callout, FAQ usw.) werden übersetzt

### Übersetzungs-Workflow

Der Übersetzungsprozess folgt diesen Schritten:

1. **Englisch als Zwischensprache erstellen**: Vom japanischen Original ins Englische übersetzen
2. **Vom Englischen in jede Sprache übersetzen**: Vom Englischen in 7 Sprachen erweitern
3. **Stapelverarbeitung**: 5–6 Artikel auf einmal mit GitHub Copilot verarbeiten

Die zweistufige Übersetzung (Japanisch → Englisch → Zielsprachen) reduziert Qualitätsschwankungen. Der Umweg über Englisch als Zwischensprache liefert stabilere Qualität als die direkte Übersetzung vom Japanischen in jede Sprache.

## Mehrsprachige View Components

### BlogPostPage-Implementierung

Die Blogartikel-Seite ruft die Locale-Version des Inhalts mit `localizePost()` ab und weist sie einer Template-Variable zu.

```astro
---
// src/views/BlogPostPage.astro
const localizedPost = localizePost(basePost, allPosts, locale)
const post = localizedPost // bestehende Template-Referenzen funktionieren weiterhin
---
```

Dieser Ansatz ermöglicht Mehrsprachigkeit, ohne Referenzen auf `post.data.title` oder `post.body` im Template zu ändern.

### Listenseiten-Implementierung

Blog-Listen, Tag-Listen, Autoren-Listen und Archivseiten filtern nur Basisartikel mit `isBasePost()` und tauschen sie bei der Anzeige mittels `localizePost()` gegen übersetzte Versionen aus.

```astro
---
const allPosts = await getCollection('blog')
const basePosts = allPosts.filter(isBasePost)
const displayPosts = basePosts.map(p => localizePost(p, allPosts, locale))
---
```

## Build-Hinweise

### YAML-Frontmatter-Escaping

Französische Übersetzungen verursachten Probleme, weil Apostrophe (`l'atelier`, `qu'on` usw.) mit YAML-Einzelanführungszeichen kollidierten.

```yaml
# NG: YAML-Parse-Fehler
title: 'Le métavers est plus proche qu'on ne le pense'

# OK: Auf doppelte Anführungszeichen wechseln
title: "Le métavers est plus proche qu'on ne le pense"
```

Ein Node.js-Skript wurde für die Massenkorrektur aller Dateien eingesetzt. Englischer Text wie `Acecore's` hat das gleiche Problem, daher muss der Anführungszeichentyp bei der Generierung von Übersetzungsdateien beachtet werden.

### OG-Bild-Routen-Filterung

`/blog/og/[slug].png.ts` erfasste auch Slugs übersetzter Artikel (`en/aceserver-hijacked` usw.), was zu Parameterfehlern führte. Gelöst durch Filterung mit `isBasePost()`.

```typescript
export const getStaticPaths: GetStaticPaths = async () => {
  const allPosts = await getCollection('blog')
  const posts = allPosts.filter(isBasePost)
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title },
  }))
}
```

## Mehrsprachige Pages CMS-Unterstützung

Pages CMS (`.pages.yml`) zielt nur auf Dateien direkt im angegebenen `path`-Verzeichnis, daher wurden die Übersetzungs-Unterverzeichnisse als einzelne Kollektionen registriert.

```yaml
content:
  - name: blog
    label: ブログ（日本語）
    path: src/content/blog
  - name: blog-en
    label: Blog（English）
    path: src/content/blog/en
  - name: blog-zh-cn
    label: 博客（简体中文）
    path: src/content/blog/zh-cn
  # ... für jede Sprache konfiguriert
```

Die Labels sind in der jeweiligen Sprache verfasst, damit im CMS sofort erkennbar ist, welche Kollektion welcher Sprache entspricht.

## Sprachwechsel-UI

Eine `LanguageSwitcher`-Komponente wurde im Header hinzugefügt und bietet eine Sprachwechsel-UI für Desktop und Mobile. Beim Sprachwechsel navigieren Benutzer zum entsprechenden Locale derselben Seite. Beim ersten Besuch wird `navigator.language` des Browsers erkannt und automatisch weitergeleitet.

## Mehrsprachige Tag-Anzeige

Artikel-Tags behalten ihre japanischen Slugs in den URLs, während **nur der Anzeigename übersetzt wird**. Dies vermeidet Routing-Komplexität und zeigt Tags in der Muttersprache des Benutzers an.

```typescript
// src/i18n/utils.ts
export function translateTag(tag: string, locale: Locale): string {
  return t(locale, `tags.${tag}`) !== `tags.${tag}`
    ? t(locale, `tags.${tag}`)
    : tag
}
```

In jeder Übersetzungs-JSON wurde ein `tags`-Abschnitt hinzugefügt, der Übersetzungen für alle 25 Tag-Typen definiert.

```json
// en.json (Auszug)
{
  "tags": {
    "技術": "Technology",
    "セキュリティ": "Security",
    "パフォーマンス": "Performance",
    "アクセシビリティ": "Accessibility"
  }
}
```

`translateTag()` wird an 6 Stellen eingesetzt — Artikelkarten, Seitenleiste, Tag-Index und Artikeldetails — und stellt sicher, dass alle Tags einheitlich in der passenden Sprache angezeigt werden.

## Mehrsprachige Autorendaten

Auch Autorenbiografien und Skill-Listen wechseln je nach Sprache. In `src/data/authors.json` wurde ein `i18n`-Feld hinzugefügt, das die Übersetzungen für jede Sprache enthält.

```json
{
  "id": "hatt",
  "name": "hatt",
  "bio": "代表取締役。Web制作・システム開発…",
  "skills": ["TypeScript", "Astro", "..."]
  "i18n": {
    "en": {
      "bio": "CEO and representative director. Web development...",
      "skills": ["TypeScript", "Astro", "..."]
    }
  }
}
```

Das Utility `getLocalizedAuthor()` ruft die zum Locale passenden Autoreninformationen ab.

```typescript
// src/utils/blog-i18n.ts
export function getLocalizedAuthor(author: Author, locale: Locale) {
  const localized = author.i18n?.[locale]
  return localized ? { ...author, ...localized } : author
}
```

## SEO für mehrsprachige Websites

Um die SEO-Vorteile der Mehrsprachigkeit zu maximieren, haben wir Mechanismen implementiert, mit denen Suchmaschinen jede Sprachversion korrekt erkennen und indexieren können.

### Sitemap hreflang-Unterstützung

Die `i18n`-Option von `@astrojs/sitemap` wurde konfiguriert, um automatisch `xhtml:link rel="alternate"`-Tags in der Sitemap auszugeben.

```javascript
// astro.config.mjs
sitemap({
  i18n: {
    defaultLocale: 'ja',
    locales: {
      ja: 'ja',
      en: 'en',
      'zh-cn': 'zh-CN',
      es: 'es',
      pt: 'pt',
      fr: 'fr',
      ko: 'ko',
      de: 'de',
      ru: 'ru',
    },
  },
})
```

Dies gibt hreflang-Links für alle 9 Sprachen auf jeder URL aus und ermöglicht Google, die Zuordnung zwischen den Sprachversionen genau zu verstehen.

### JSON-LD Strukturierte Daten – Sprachunterstützung

Ein `inLanguage`-Feld wurde den strukturierten `BlogPosting`-Daten hinzugefügt, um Suchmaschinen mitzuteilen, in welcher Sprache jeder Artikel verfasst ist.

```javascript
// BlogPostPage.astro (JSON-LD-Auszug)
{
  "@type": "BlogPosting",
  "inLanguage": htmlLangMap[locale],  // "ja", "en", "zh-CN" usw.
  "headline": post.data.title,
  // ...
}
```

### Mehrsprachige RSS-Feeds

Zusätzlich zum japanischen `/rss.xml` werden RSS-Feeds für jede Sprachversion generiert (`/en/rss.xml`, `/zh-cn/rss.xml` usw.). Feed-Titel und -Beschreibungen werden je Sprache übersetzt, und das `<language>`-Tag gibt BCP47-konforme Sprachcodes aus.

```typescript
// src/pages/[locale]/rss.xml.ts
export const getStaticPaths = () =>
  locales.filter((l) => l !== defaultLocale).map((l) => ({ params: { locale: l } }))
```

Der `<link rel="alternate" type="application/rss+xml">` in `BaseLayout.astro` setzt automatisch die zum Locale passende RSS-URL.

## Zusammenfassung

Durch die Nutzung der integrierten i18n-Funktionen von Astro 6 haben wir hochwertige Mehrsprachigkeit auch auf einer statischen Website erreicht.

- **i18n-Grundlage**: Kein Präfix für Japanisch mit Astros `prefixDefaultLocale: false`
- **UI-Übersetzung**: Null Logik-Duplizierung dank View-Component-Pattern
- **Inhaltsübersetzung**: Unterverzeichnis-Ansatz ohne Schema-Änderungen
- **Tag-Übersetzung**: Japanische Slugs in URLs, Anzeigenamen je Sprache übersetzt
- **Autorendaten-Übersetzung**: Bio und Skills wechseln je Sprache
- **SEO**: Sitemap hreflang, JSON-LD `inLanguage`, mehrsprachige RSS-Feeds
- **Fallback**: Nicht übersetzte Artikel zeigen automatisch die japanische Version
- **CMS-Unterstützung**: Artikel jeder Sprache einzeln in Pages CMS bearbeitbar

Künftig werden Übersetzungsdateien inkrementell hinzugefügt, sobald neue Artikel veröffentlicht werden. Dank der Fallback-Funktion wird die japanische Version angezeigt, bis Übersetzungen fertiggestellt sind, wodurch die Website-Qualität erhalten bleibt.
