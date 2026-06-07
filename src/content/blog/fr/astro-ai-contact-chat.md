---
title: 'Conception technique pour ajouter un chat IA de contact à un site Astro'
description: 'Guide de conception pour intégrer un chat IA de contact à un site statique Astro + Cloudflare Pages avec OpenAI Responses API. Il couvre la frontière API, le contexte du site, le contrôle du prompt, les URLs par locale, la vérification Origin, le rate limit et le rendu sécurisé des liens Markdown.'
date: 2026-06-07T12:00
author: gui
tags: ['技術', 'Cloudflare', 'Webサイト', 'AI', 'サービス']
image: https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: Point clé
  text: Le chat IA de contact n'est pas une zone de réponse libre. C'est une petite application qui utilise les informations publiques du site pour guider les visiteurs vers la bonne action. Les clés API, prompts, coordonnées et rendus Markdown sont contrôlés côté serveur et par listes d'autorisation.
processFigure:
  title: Architecture de référence
  steps:
    - title: Widget
      description: L'interface de chat Astro envoie seulement la question, le locale courant et un historique minimal.
      icon: i-lucide-message-circle
      accent: brand
    - title: Function
      description: La Cloudflare Pages Function valide l'entrée, vérifie Origin, applique le rate limit et construit le prompt.
      icon: i-lucide-shield-check
      accent: amber
    - title: Model
      description: OpenAI Responses API reçoit le contexte public du site et l'état de conversation.
      icon: i-lucide-sparkles
      accent: emerald
    - title: Renderer
      description: Le client rend uniquement le Markdown autorisé et dirige vers des liens internes ou contacts approuvés.
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: Responsabilités à séparer
  before:
    label: Tout mélanger
    items:
      - Appeler l'API IA directement depuis le navigateur
      - Mélanger contexte du site, clé API, UI et rendu de liens
      - Laisser l'IA affirmer prix, contrats ou délais
      - Injecter Markdown et URLs directement en HTML
  after:
    label: Responsabilités séparées
    items:
      - Garder clés API et appels modèle côté serveur
      - Gérer les informations publiques du site comme contexte explicite
      - Contrôler portée de réponse et parcours de contact dans le prompt
      - Rendre Markdown et URLs par listes d'autorisation
checklist:
  title: Checklist pour d'autres sites
  items:
    - text: Définir le chat comme aide d'orientation, pas comme remplacement complet du formulaire
    - text: Créer une frontière API côté serveur et ne jamais exposer la clé au navigateur
    - text: Limiter les réponses aux informations publiques du site
    - text: Définir ce que l'IA ne doit pas affirmer, comme prix, contrats, délais et garanties
    - text: Définir les rôles du formulaire, de LINE, de l'e-mail et du téléphone
    - text: Générer des URLs par locale pour préserver la navigation multilingue
    - text: Ajouter Origin check, limites de longueur, limites d'historique et rate limiting
    - text: Appliquer trim aux URLs Markdown avant validation
linkCards:
  - href: /contact/
    title: Contact
    description: Page qui organise le chat IA, LINE, le formulaire et les contacts directs.
    icon: i-lucide-message-square
  - href: /blog/cloudflare-pages-security/
    title: Sécurité Cloudflare Pages
    description: Article lié sur CSP et les en-têtes de sécurité pour sites statiques.
    icon: i-lucide-shield
  - href: /blog/cms-selection-and-turnstile/
    title: Guide d'installation de Sveltia CMS
    description: Article lié sur l'ajout d'un écran d'édition CMS à un site statique.
    icon: i-lucide-badge-check
faq:
  title: Questions fréquentes
  items:
    - question: Faut-il RAG ou une base vectorielle pour créer ce chat ?
      answer: Pour un petit site d'entreprise, un contexte structuré à partir des pages publiques est souvent suffisant. Recherche ou base vectorielle peuvent être ajoutées quand le volume ou la fréquence de mise à jour augmente.
    - question: La clé OpenAI est-elle exposée au navigateur ?
      answer: Non. Le navigateur envoie seulement la question à /api/ai-contact. La Cloudflare Pages Function appelle OpenAI Responses API et gère la clé.
    - question: L'IA peut-elle afficher n'importe quel lien ?
      answer: Non. Les liens sont limités aux chemins internes, à l'origin courant, à acecore.net, au LINE officiel et aux mailto ou tel nécessaires. Les URLs Markdown sont nettoyées avant vérification.
---

Ajouter un chat IA à un site web est simple. Le vrai sujet est l'exploitation : jusqu'où l'IA peut répondre, où elle doit guider le visiteur, quelles URLs elle peut afficher et comment maîtriser le coût API.

Acecore a ajouté un chat IA de contact à un site statique Astro + Cloudflare Pages. L'implémentation principale se trouve dans [le PR qui ajoute l'IA de contact et le flux de traduction limité au CMS](https://github.com/acecore-systems/acecore-net/pull/98). Le rendu sécurisé des liens Markdown a ensuite été ajusté dans [un autre PR](https://github.com/acecore-systems/acecore-net/pull/99). Les détails sont séparés dans [Rendre en sécurité les liens Markdown dans les réponses de chat IA](/blog/ai-chat-markdown-link-safety/).

Cet article présente le design comme un modèle réutilisable pour d'autres sites statiques. Hors Astro, le principe reste le même : séparer le widget client, la frontière API, la construction du prompt et le renderer.

## Structure générale

| Couche               | Responsabilité                                                   |
| -------------------- | ---------------------------------------------------------------- |
| Chat widget          | UI, saisie, locale courant, historique minimal et rendu Markdown |
| `/api/ai-contact`    | Validation, Origin check, rate limit, prompt et appel OpenAI     |
| OpenAI Responses API | Générer une réponse depuis le contexte public et la conversation |

Le navigateur ne doit pas appeler OpenAI directement. Placer l'appel derrière un endpoint évite l'exposition de clé, permet de changer prompt et contexte côté serveur, et centralise limites et erreurs.

Avec Astro + Cloudflare Pages, cette frontière est une Pages Function `/api/ai-contact`. Dans Next.js, ce serait un Route Handler ; dans Hono ou Express, une route API.

## Garder le contrat d'API petit

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

Nom, e-mail, téléphone, entreprise ou champs détaillés du formulaire n'ont pas besoin de passer par le chat. Le chat aide à choisir un service et un canal de contact, il ne collecte pas les données personnelles.

L'historique doit aussi être limité aux derniers échanges, avec une taille maximale par message. Cela réduit le prompt et le coût.

## Contrôler la validation et le modèle côté serveur

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

L'essentiel est de réduire et valider l'entrée avant l'appel IA. Les longs textes, historiques illimités et appels externes répétés peuvent rendre l'exploitation instable.

`OPENAI_MODEL` doit être une variable d'environnement, et `OPENAI_API_KEY` doit rester côté serveur. Pour la distribution et CSP, voir [la sécurité Cloudflare Pages](/blog/cloudflare-pages-security/).

## Rendre le contexte du site explicite

Pour un site de cette taille, il n'est pas nécessaire de commencer par une base vectorielle. Un contexte structuré avec informations publiques suffit souvent.

Ce contexte peut inclure : résumé de l'entreprise, services, exemples de demandes, URLs, FAQ, règles de contact, zones où l'IA ne doit pas affirmer, et URLs internes par locale.

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

Le but n'est pas de laisser le modèle répondre depuis son savoir général, mais de définir ce que ce site peut dire. Quand le site grandit, cette couche peut évoluer vers Pagefind, CMS JSON, D1, Vectorize ou une autre recherche.

## Écrire des règles dans le prompt

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

L'échec classique est une IA trop serviable qui promet trop. Les prix, délais et garanties doivent recevoir une orientation générale puis être renvoyés vers le formulaire.

## Séparer les parcours de contact

| Parcours       | Rôle                                                       |
| -------------- | ---------------------------------------------------------- |
| FAQ            | Répondre aux questions fréquentes dans la page             |
| Chat IA        | Orienter vers services, canaux et pages liées              |
| LINE           | Questions courtes, sujets d'école et vérifications légères |
| Formulaire     | Devis, production, partenariats et recrutement             |
| Contact direct | Complément après formulaire ou confirmation urgente        |

L'IA relie des contenus généraux comme [l'article de présentation des services](/blog/service-introduction/) aux entrées concrètes de la [page contact](/contact/). Le modèle s'applique aux sites B2B, agences, écoles et supports SaaS.

## Préserver les URLs par locale

Dans un site multilingue, la langue de réponse ne suffit pas. Les URLs doivent aussi correspondre au locale.

```ts
function localizePath(path: string, locale: Locale) {
  if (locale === 'ja') return path
  return `/${locale}${path}`
}
```

La génération côté serveur est plus fiable qu'une simple instruction de prompt. La base de traduction est décrite dans [l'article du pipeline Copilot](/blog/copilot-translation-pipeline/).

## Ajouter Origin check et rate limit

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

Un rate limit par IP est un premier frein. Avec Cloudflare, utilisez `CF-Connecting-IP`, `X-Forwarded-For` ou `CF-Ray`. Pour plus de trafic, préférez Cloudflare WAF, Turnstile, KV, D1 ou Durable Objects. L'exploitation CMS côté contenu est décrite dans le [Guide d'installation de Sveltia CMS](/blog/cms-selection-and-turnstile/) ; la protection anti-bot des formulaires et commentaires est une autre couche.

## Rendre les liens Markdown avec une liste d'autorisation

Autorisez seulement paragraphes, listes, gras, code inline et liens Markdown. Limitez ensuite les destinations aux chemins internes, à l'origin courant, à `https://acecore.net`, au LINE officiel et aux `mailto:` ou `tel:` nécessaires.

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

Le `trim()` est important, car l'IA peut produire `[Services]( /services/ )`. Un renderer petit et strict est plus simple à maintenir qu'une implémentation Markdown complète.

## Tester local, preview et production

Astro dev ou preview n'est pas identique à Cloudflare Pages Functions. Sans `OPENAI_API_KEY`, le local doit tester fallback et erreurs UI.

En preview ou production, vérifiez POST sur `/api/ai-contact`, variables `OPENAI_API_KEY` et `OPENAI_MODEL`, rejet d'un autre Origin, limites d'entrée, réponses dans le bon locale, URLs localisées, absence d'affirmations sur devis ou contrat, et liens Markdown seulement si l'URL est autorisée.

Testez aussi longues entrées, questions inattendues, pages anglaises, demandes de contact direct et questions de prix.

## Indicateurs d'exploitation

Suivez taux d'erreur API, déclenchements de rate limit, messages moyens par demande, passages vers formulaire et LINE, cas renvoyés vers le formulaire et usage par locale.

Si vous stockez les conversations, définissez d'abord les règles de confidentialité. Un début plus sûr consiste à ne conserver que les événements et erreurs, sans texte de message.

## Périmètre séparé

Cet article couvre seulement le design technique du chat IA. Le parcours transmettant le contexte d'une page service vers le formulaire est également implémenté, et est organisé dans [Conception technique pour passer le contexte d'un CTA service vers le formulaire de contact](/blog/service-cta-contact-prefill/).

- Chat IA : clarifier les hésitations par conversation et guider en sécurité
- CTA service : transmettre au formulaire le contexte lu par le visiteur

Les séparer rend les articles plus lisibles et plus faciles à relier.

## Résumé

Pour ajouter un chat IA à un site statique, concevez d'abord la frontière API et le contrôle des réponses.

Les décisions clés : appeler OpenAI depuis Cloudflare Pages Function, garder l'entrée petite, construire contexte et URLs côté serveur, écrire les limites dans le prompt, séparer formulaire, LINE et contact direct, ajouter Origin check et rate limit, puis rendre les liens Markdown avec `trim()` et liste d'autorisation.

Un site statique peut avoir un chat de contact IA utile. L'objectif n'est pas de mettre l'IA en avant, mais d'aider le visiteur à choisir l'action suivante en sécurité.
