---
title: 'Astro-Blogkommentare nur mit Cloudflare umsetzen'
description: 'Wie wir Kommentare in einem Astro-Blog ohne externen Kommentardienst umgesetzt haben: Cloudflare Pages Functions, D1, Turnstile und Wrangler.'
date: 2026-06-07T18:00
lastUpdated: 2026-06-07T00:00
author: gui
tags: ['技術', 'Cloudflare', 'Astro', 'セキュリティ', 'Webサイト']
image: /uploads/acecore-generated/blog-cloudflare-pages-security.webp
callout:
  type: tip
  title: Kein externer Kommentardienst
  text: 'Ein statischer Astro-Blog kann eigene Kommentare haben. Pages Functions bilden die API, D1 speichert die Daten, Turnstile schützt Einreichungen und Wrangler verwaltet die Bindings.'
linkCards:
  - href: /de/blog/cloudflare-pages-security/
    title: Cloudflare Pages Sicherheit
    description: Sicherheitsheader und statische Auslieferung mit Cloudflare Pages.
    icon: i-lucide-shield
  - href: /de/blog/cms-selection-and-turnstile/
    title: Sveltia CMS Einrichtungsleitfaden
    description: CMS und Cloudflare-Bausteine der Website.
    icon: i-lucide-badge-check
  - href: /de/blog/astro-ai-contact-chat/
    title: KI-Kontaktchat mit Astro
    description: Ein weiteres API-Beispiel mit Pages Functions.
    icon: i-lucide-bot
faq:
  title: FAQ
  items:
    - question: Warum kein externer Dienst?
      answer: 'Externe Dienste sind schnell integriert, aber UI, Daten, Scripts, Moderation und Migration hängen vom Dienst ab. Hier bleibt alles in der Website und bei Cloudflare.'
    - question: Reicht D1 für Kommentare?
      answer: 'Für post_slug-Abfragen, Sortierung, Soft Delete, Rate Limits und Duplikate passt D1 gut.'
    - question: Reicht Turnstile im Browser?
      answer: 'Nein. Die Pages Function muss den Token per Siteverify prüfen, bevor sie in D1 schreibt.'
---

Kommentare bringen Zustand in eine statische Website.

Acecore hat keinen externen Kommentardienst eingebettet. In [PR #101](https://github.com/acecore-systems/acecore-net/pull/101) wurde die Funktion nur mit Cloudflare umgesetzt.

- Astro rendert die UI.
- Cloudflare Pages Functions stellt `/api/comments` bereit.
- Cloudflare D1 speichert Kommentare.
- Cloudflare Turnstile schützt POST-Anfragen.
- `wrangler.jsonc` definiert das `COMMENTS_DB`-Binding.

Der Vorteil: Der Kommentarbereich bleibt Teil der bestehenden Cloudflare-Architektur.

## Aufbau

| Ebene      | Datei oder Dienst                          |
| ---------- | ------------------------------------------ |
| UI         | `src/components/BlogComments.astro`        |
| Einbindung | `src/views/BlogPostPage.astro`             |
| API        | `functions/api/comments.ts`                |
| Speicher   | D1-Binding `COMMENTS_DB`                   |
| Schutz     | Cloudflare Turnstile                       |
| Schema     | `migrations/0001_create_blog_comments.sql` |

Die UI lädt mit `GET /api/comments?slug=...&locale=...` und sendet mit `POST /api/comments`.

Die Function validiert Origin, Payload, Turnstile, Limits, Duplikate und blockierte Inhalte.

## Warum D1

Kommentare brauchen SQL-nahe Operationen: nach Artikel filtern, nach Zeit sortieren, mit `deleted_at` ausblenden, Duplikate finden und Clients begrenzen.

Sichtbar sind nur Zeilen mit `deleted_at IS NULL`. Spam kann so ausgeblendet werden, ohne die Zeile sofort zu löschen.

Prepared Statements mit `bind()` verhindern, dass Benutzereingaben direkt in SQL-Strings landen.

## Wrangler als Vertrag

`COMMENTS_DB` wird in `wrangler.jsonc` definiert und zeigt auf die einzige D1-Datenbank `acecore-comments`.

So bleibt der Binding-Name stabil, während Dashboard und Repository denselben Datenbanknamen verwenden.

## Turnstile serverseitig prüfen

Das Browser-Widget reicht nicht aus. Die Pages Function validiert den Token über Cloudflare Siteverify mit `TURNSTILE_SECRET_KEY`.

Außerdem wird der zurückgegebene Hostname gegen eine Allowlist geprüft.

## Spam-Schutz

Die erste Version ist bewusst streng:

- keine URLs
- keine E-Mail-Adressen
- kein HTML
- keine Markdown-Links
- keine langen Wiederholungen
- keine typischen Werbewörter
- Honeypot-Feld

Rate Limits laufen im Speicher und zusätzlich persistent über D1. Der Client wird als gesalzener Hash gespeichert, nicht als rohe IP.

## SEO

Kommentare werden clientseitig geladen und der Bereich nutzt `data-pagefind-ignore`. Sie werden also nicht als Hauptinhalt indexiert.

Für einen Unternehmensblog ist diese Trennung sinnvoll.

## Fazit

Externe Kommentardienste sind bequem, aber nicht zwingend.

Mit Cloudflare Pages, Pages Functions, D1, Turnstile und Wrangler lässt sich eine leichte Kommentarfunktion vollständig innerhalb von Cloudflare betreiben.

## Referenzen

- [Cloudflare Pages: Configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Cloudflare Pages Functions: Bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare D1: Prepared statement methods](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [Cloudflare D1: Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Cloudflare Turnstile: Server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare Turnstile: Any Hostname](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/any-hostname/)
- [PR #101: Cloudflare-Kommentare](https://github.com/acecore-systems/acecore-net/pull/101)
