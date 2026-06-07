---
title: 'Technisches Design für einen KI-Kontaktchat in einer Astro-Website'
description: 'Ein praktischer Leitfaden für einen KI-Kontaktchat in einer statischen Astro + Cloudflare Pages Website mit der OpenAI Responses API. Behandelt werden API-Grenzen, Website-Kontext, Prompt-Steuerung, locale-bezogene URLs, Origin-Prüfung, Rate Limiting und sicheres Rendern von Markdown-Links.'
date: 2026-06-07T12:00
author: gui
tags: ['技術', 'Cloudflare', 'Webサイト', 'AI', 'サービス']
image: https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: Kernpunkt
  text: Der KI-Kontaktchat ist kein freies Antwortfeld. Er ist eine kleine Anwendung, die öffentliche Website-Informationen nutzt, um Besucher zum passenden nächsten Schritt zu führen. API-Schlüssel, Prompts, Kontaktdaten und Markdown-Rendering werden serverseitig und über Allow-Lists gesteuert.
processFigure:
  title: Referenzarchitektur
  steps:
    - title: Widget
      description: Das Astro-Chat-UI sendet nur Frage, aktuellen locale und minimalen Verlauf.
      icon: i-lucide-message-circle
      accent: brand
    - title: Function
      description: Die Cloudflare Pages Function validiert Eingaben, prüft Origin, begrenzt Anfragen und baut den Prompt.
      icon: i-lucide-shield-check
      accent: amber
    - title: Model
      description: Die OpenAI Responses API erhält öffentlichen Website-Kontext und Gesprächszustand.
      icon: i-lucide-sparkles
      accent: emerald
    - title: Renderer
      description: Der Client rendert nur erlaubtes Markdown und führt zu internen Links oder freigegebenen Kontaktwegen.
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: Verantwortlichkeiten trennen
  before:
    label: Alles vermischt
    items:
      - Die KI-API wird direkt aus dem Browser aufgerufen
      - Website-Kontext, API-Schlüssel, UI und Link-Rendering sind gekoppelt
      - Die KI kann Preise, Verträge oder Termine zu bestimmt formulieren
      - Markdown und URLs können direkt als HTML gerendert werden
  after:
    label: Getrennte Verantwortlichkeiten
    items:
      - API-Schlüssel und Modellaufrufe bleiben serverseitig
      - Öffentliche Website-Informationen werden als expliziter Kontext gepflegt
      - Der Prompt steuert Antwortumfang und Kontaktwege
      - Markdown und URLs werden über Allow-Lists gerendert
checklist:
  title: Design-Checkliste für andere Websites
  items:
    - text: Den Chat als Orientierungshilfe definieren, nicht als vollständigen Formularersatz
    - text: Eine serverseitige API-Grenze schaffen und den API-Schlüssel nicht im Browser ausgeben
    - text: Antworten auf öffentliche Website-Informationen beschränken
    - text: Festlegen, was die KI nicht behaupten darf, etwa Preise, Verträge, Fristen und Garantien
    - text: Rollen von Formular, LINE, E-Mail und Telefon definieren
    - text: URLs nach locale erzeugen, damit mehrsprachige Navigation intakt bleibt
    - text: Origin-Prüfung, Längenlimits, Verlaufslimits und Rate Limiting einbauen
    - text: Markdown-Link-URLs vor der Allow-List-Prüfung trimmen
linkCards:
  - href: /contact/
    title: Kontakt
    description: Seite mit KI-Chat, LINE, Formular und direkten Kontaktoptionen.
    icon: i-lucide-message-square
  - href: /blog/cloudflare-pages-security/
    title: Cloudflare Pages Sicherheit
    description: Verwandter Artikel zu CSP und Sicherheits-Headern für statische Sites.
    icon: i-lucide-shield
  - href: /blog/cms-selection-and-turnstile/
    title: Sveltia CMS Einrichtungsleitfaden
    description: Verwandter Artikel zum Hinzufügen einer CMS-Editieroberfläche zu statischen Websites.
    icon: i-lucide-badge-check
faq:
  title: Häufige Fragen
  items:
    - question: Braucht man RAG oder eine Vektordatenbank für einen KI-Kontaktchat?
      answer: Für eine kleine Unternehmenswebsite reicht oft strukturierter Kontext aus öffentlichen Seiten im Prompt. Suche oder Vektordatenbank kann man später ergänzen, wenn Umfang oder Aktualisierungsfrequenz wachsen.
    - question: Wird der OpenAI API-Schlüssel im Browser sichtbar?
      answer: Nein. Der Browser sendet nur die Frage an /api/ai-contact. Die Cloudflare Pages Function ruft die OpenAI Responses API auf und verwaltet den Schlüssel.
    - question: Darf die KI beliebige Links ausgeben?
      answer: Nein. Links sind auf interne Pfade, den aktuellen Origin, acecore.net, die offizielle LINE-URL sowie notwendige mailto- und tel-Links beschränkt. Markdown-URLs werden vor der Prüfung getrimmt.
---

Einen KI-Chat auf eine Website zu setzen, ist einfach. Entscheidend ist der Betrieb: Was darf die KI beantworten, wohin soll sie Besucher führen, welche URLs dürfen erscheinen und wie bleiben API-Kosten kontrollierbar?

Acecore hat einen KI-Kontaktchat in eine statische Astro + Cloudflare Pages Website integriert. Die Hauptimplementierung steht im [PR für Kontakt-KI und CMS-begrenzten Übersetzungsfluss](https://github.com/acecore-systems/acecore-net/pull/98). Das sichere Rendering von Markdown-Links wurde anschließend in [einem weiteren PR](https://github.com/acecore-systems/acecore-net/pull/99) verbessert. Die Details dazu sind in [Markdown-Links in KI-Chat-Antworten sicher rendern](/blog/ai-chat-markdown-link-safety/) separat beschrieben.

Dieser Artikel beschreibt das Design als wiederverwendbares Muster für andere statische Websites. Auch außerhalb von Astro gilt: Client-Widget, API-Grenze, Prompt und Renderer sollten getrennte Verantwortlichkeiten haben.

## Gesamtstruktur

| Schicht              | Verantwortung                                                        |
| -------------------- | -------------------------------------------------------------------- |
| Chat widget          | UI, Eingabe, aktueller locale, minimaler Verlauf, Markdown-Rendering |
| `/api/ai-contact`    | Validierung, Origin-Prüfung, Rate Limit, Prompt, OpenAI-Aufruf       |
| OpenAI Responses API | Antwort aus öffentlichem Kontext und Gesprächszustand erzeugen       |

Der Browser sollte OpenAI nicht direkt aufrufen. Ein serverseitiger Endpoint verhindert Schlüssel-Leaks, erlaubt Anpassungen von Prompt und Kontext und bündelt Limits sowie Fehlerbehandlung.

Bei Astro + Cloudflare Pages kann die Grenze eine Pages Function unter `/api/ai-contact` sein. In Next.js wäre es ein Route Handler, in Hono oder Express eine normale API-Route.

## Den Endpoint-Vertrag klein halten

```ts
type ContactAiRequest = {
  message: string
  locale: 'ja' | 'en' | 'zh-cn' | 'es' | 'pt' | 'fr' | 'ko' | 'de' | 'ru'
  history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

type ContactAiResponse = {
  answer: string
}
```

Name, E-Mail, Telefonnummer, Firma und detaillierte Formularfelder müssen nicht durch den Chat laufen. Der Chat hilft bei der Wahl von Service und Kontaktweg, er sammelt keine personenbezogenen Daten.

Auch der Verlauf wird auf wenige aktuelle Nachrichten und eine maximale Länge begrenzt. Das reduziert Prompt-Größe und Kosten.

## Validierung und Modellaufruf auf dem Server steuern

```ts
export async function onRequestPost({ request, env }: PagesFunction<Env>) {
  assertSameOrigin(request)
  assertRateLimit(request)

  const body = await request.json()
  const message = validateMessage(body.message)
  const locale = validateLocale(body.locale)
  const history = trimHistory(body.history)

  const prompt = buildContactPrompt({
    locale,
    message,
    history,
    siteContext: buildPublicSiteContext(locale),
  })

  const answer = await callOpenAIResponsesApi({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    prompt,
  })

  return Response.json({ answer })
}
```

Wichtig ist, Eingaben vor dem KI-Aufruf zu verkleinern und zu validieren. Lange Texte, unbegrenzter Verlauf und fremde wiederholte Aufrufe destabilisieren den Betrieb.

`OPENAI_MODEL` sollte eine Umgebungsvariable sein, `OPENAI_API_KEY` bleibt ausschließlich serverseitig. Für Auslieferung und CSP siehe [Cloudflare Pages Sicherheit](/blog/cloudflare-pages-security/).

## Website-Informationen als expliziten Kontext pflegen

Für eine Website dieser Größe ist eine Vektordatenbank nicht der erste Schritt. Strukturierter Kontext aus öffentlichen Seiten ist oft ausreichend.

Dazu gehören Unternehmens- und Service-Übersichten, Zielgruppen, Beispielanfragen, URLs, FAQ, Regeln für Formular/LINE/E-Mail/Telefon, nicht zu behauptende Bereiche wie Preise oder Verträge, und interne URLs pro locale.

```ts
function buildPublicSiteContext(locale: Locale) {
  return {
    services: [
      {
        name: 'Web production',
        summary: 'Corporate sites, recruiting sites, and landing pages',
        url: localizePath('/services/web-production/', locale),
      },
      {
        name: 'Business systems',
        summary: 'Reservation, inventory, and customer management systems',
        url: localizePath('/services/business-system/', locale),
      },
    ],
    contact: {
      form: localizePath('/contact/', locale),
      line: 'https://lin.ee/...',
      emailPolicy:
        'Show email only when the form cannot be used or follow-up is needed',
      phonePolicy: 'Show phone only for urgent confirmation',
    },
  }
}
```

Das Modell soll nicht aus allgemeinem Wissen antworten, sondern aus dem, was diese Website sagen darf. Bei Wachstum kann diese Schicht zu Pagefind, CMS JSON, D1, Vectorize oder anderer Suche erweitert werden.

## Im Prompt Regeln schreiben

```txt
You are the contact guidance AI for this website.
Answer only from public site information.

Rules:
- Do not make firm statements about pricing, contracts, schedules, or guarantees
- Send formal consultations and estimates to the contact form
- Also suggest LINE for short questions and school-related inquiries
- Show email and phone only when the user asks for direct contact
- Use URLs that match the current locale
- If unsure, do not guess; guide the user to the form
```

Ein typischer Fehler ist eine zu hilfsbereite KI, die zu viel zusichert. Preise, Termine und Garantien sollten allgemein erklärt und dann ans Formular verwiesen werden.

## Kontaktwege trennen

| Weg           | Rolle                                                |
| ------------- | ---------------------------------------------------- |
| FAQ           | Häufige Fragen direkt auf der Seite klären           |
| KI-Chat       | Services, Kontaktwege und verwandte Seiten sortieren |
| LINE          | Kurze Fragen, Schul-Themen und leichte Rückfragen    |
| Formular      | Angebote, Produktion, Partnerschaften und Recruiting |
| Direktkontakt | Ergänzungen nach Formular oder dringende Bestätigung |

Die KI verbindet Inhalte wie [die Service-Übersicht](/blog/service-introduction/) mit konkreten Wegen auf der [Kontaktseite](/contact/). Das Muster passt zu B2B-Websites, Agenturen, Schulen und SaaS-Support.

## Locale-URLs bewahren

Bei mehrsprachigen Websites reicht die richtige Antwortsprache nicht. Auch URLs müssen zum locale passen.

```ts
function localizePath(path: string, locale: Locale) {
  if (locale === 'ja') return path
  return `/${locale}${path}`
}
```

Serverseitige URL-Erzeugung ist stabiler als nur eine Prompt-Anweisung. Der Übersetzungsbetrieb wird in [Mehrsprachige Blogs mit Sveltia CMS betreiben](/de/blog/copilot-translation-pipeline/) beschrieben.

## Origin-Prüfung und Rate Limit

```ts
function assertSameOrigin(request: Request) {
  const origin = request.headers.get('Origin')
  if (!origin) return

  const requestUrl = new URL(request.url)
  const originUrl = new URL(origin)

  if (originUrl.host !== requestUrl.host) {
    throw new Response('Forbidden', { status: 403 })
  }
}
```

IP-basiertes Rate Limiting ist eine erste Bremse. In Cloudflare können `CF-Connecting-IP`, `X-Forwarded-For` oder `CF-Ray` genutzt werden. Bei höherem Traffic sind Cloudflare WAF, Turnstile, KV, D1 oder Durable Objects stabiler. Den CMS-Betrieb für Content-Updates beschreibt der [Sveltia CMS Einrichtungsleitfaden](/blog/cms-selection-and-turnstile/); Bot-Schutz für Formulare und Kommentare ist eine eigene Ebene.

## Markdown-Links per Allow-List rendern

Erlauben Sie nur Absätze, Listen, Fettdruck, Inline-Code und Markdown-Links. Linkziele werden auf interne Pfade, aktuellen Origin, `https://acecore.net`, offizielle LINE-URLs und notwendige `mailto:` oder `tel:` beschränkt.

```ts
function sanitizeHref(rawHref: string, currentOrigin: string) {
  const href = rawHref.trim()

  if (href.startsWith('/')) return href
  if (href.startsWith(`${currentOrigin}/`)) return href
  if (href.startsWith('https://acecore.net/')) return href
  if (href.startsWith('https://lin.ee/')) return href
  if (href === 'mailto:info@acecore.net') return href
  if (href === 'tel:05088902788') return href

  return null
}
```

`trim()` ist wichtig, weil KI-Ausgaben wie `[Services]( /services/ )` vorkommen können. Ein kleiner, strenger Renderer ist leichter zu pflegen als vollständiges Markdown.

## Local, Preview und Produktion testen

Astro dev oder preview entspricht nicht vollständig Cloudflare Pages Functions. Ohne `OPENAI_API_KEY` sollten lokal Fallback und Fehleranzeige geprüft werden.

In Preview oder Produktion prüfen Sie POST auf `/api/ai-contact`, `OPENAI_API_KEY` und `OPENAI_MODEL`, Ablehnung fremder Origins, Eingabelimits, Antworten im richtigen locale, lokalisierte URLs, keine Zusagen zu Angebot oder Vertrag, keine Standardanzeige von E-Mail und Telefon, sowie Markdown-Links nur bei erlaubter URL.

Testen Sie außerdem lange Eingaben, unerwartete Fragen, englische Seiten, Direktkontakt-Wünsche und Preisfragen.

## Betriebsmetriken

Beobachten Sie API-Fehlerquote, Rate-Limit-Treffer, durchschnittliche Nachrichten pro Anfrage, Übergänge zu Formular und LINE, Weiterleitungen zum Formular bei fehlender Antwort und Nutzung pro locale.

Wenn Gesprächsinhalte gespeichert werden, müssen Datenschutzregeln zuerst feststehen. Ein sicherer Start ist, nur Ereignisse und Fehler ohne Nachrichtentext zu speichern.

## Abgegrenzter Umfang

Dieser Artikel behandelt nur das technische Design des KI-Chats. Die Strecke, die den Beratungsgegenstand von der Service-Seite ins Formular übergibt, ist ebenfalls implementiert und in [Technisches Design zur Kontextübergabe vom Service-CTA zum Kontaktformular](/blog/service-cta-contact-prefill/) beschrieben.

- KI-Chat: Unsicherheit im Gespräch ordnen und sicher führen
- Service-CTA: Den gelesenen Service-Kontext ins Formular übergeben

Getrennt bleiben beide Artikel lesbarer und lassen sich später besser verlinken.

## Zusammenfassung

Bei einem KI-Kontaktchat für eine statische Website sollten API-Grenze und Antwortkontrolle vor der UI gestaltet werden.

Die wichtigsten Entscheidungen: OpenAI über Cloudflare Pages Function aufrufen, Eingabe und Verlauf klein halten, Kontext und locale-URLs serverseitig bauen, Grenzen im Prompt formulieren, Formular/LINE/Direktkontakt trennen, Origin-Prüfung und Rate Limit einbauen, Markdown-Links nach `trim()` per Allow-List rendern.

Statische Websites können sinnvolle KI-Kontaktchats haben. Entscheidend ist nicht, die KI sichtbar zu machen, sondern Besucher sicher zur nächsten Aktion zu führen.
