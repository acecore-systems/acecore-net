---
title: 'Design técnico para adicionar um chat de IA de contato a um site Astro'
description: 'Guia prático para adicionar um chat de IA de contato a um site estático Astro + Cloudflare Pages com a OpenAI Responses API. Cobre fronteiras de API, contexto do site, controle de prompt, URLs por locale, verificação de Origin, rate limit e renderização segura de links Markdown.'
date: 2026-06-07T12:00
author: gui
tags: ['技術', 'Cloudflare', 'Webサイト', 'AI', 'サービス']
image: https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: Ponto principal
  text: O chat de IA de contato não é uma caixa de respostas livres. Ele é uma pequena aplicação que usa informações públicas do site para orientar visitantes ao próximo passo correto. API keys, prompts, contatos e Markdown são controlados pelo servidor e por listas permitidas.
processFigure:
  title: Arquitetura de referência
  steps:
    - title: Widget
      description: A UI de chat em Astro envia apenas a pergunta, o locale atual e o histórico mínimo.
      icon: i-lucide-message-circle
      accent: brand
    - title: Function
      description: A Cloudflare Pages Function valida entrada, verifica Origin, aplica rate limit e monta o prompt.
      icon: i-lucide-shield-check
      accent: amber
    - title: Model
      description: A OpenAI Responses API recebe o contexto público do site e o estado da conversa.
      icon: i-lucide-sparkles
      accent: emerald
    - title: Renderer
      description: O cliente renderiza apenas Markdown permitido e leva a links internos ou canais aprovados.
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: Responsabilidades a separar
  before:
    label: Tudo misturado
    items:
      - Chamar a API de IA diretamente do navegador
      - Misturar contexto do site, API key, UI e renderização de links
      - Permitir que a IA afirme preços, contratos ou prazos
      - Renderizar Markdown e URLs diretamente como HTML
  after:
    label: Responsabilidades separadas
    items:
      - API keys e chamadas ao modelo ficam no servidor
      - Informações públicas do site viram contexto explícito
      - O prompt controla escopo de resposta e rotas de contato
      - Markdown e URLs passam por listas permitidas
checklist:
  title: Checklist para outros sites
  items:
    - text: Definir o chat como orientação de rota, não como substituto total do formulário
    - text: Criar uma fronteira de API no servidor e não expor a API key ao navegador
    - text: Restringir respostas a informações públicas do site
    - text: Decidir o que a IA não deve afirmar, como preço, contrato, prazo e garantia
    - text: Definir quando usar formulário, LINE, e-mail e telefone
    - text: Gerar URLs por locale para preservar a navegação multilíngue
    - text: Adicionar Origin check, limites de tamanho, limites de histórico e rate limiting
    - text: Aplicar trim nas URLs Markdown antes de validar pela lista permitida
linkCards:
  - href: /contact/
    title: Contato
    description: Página que organiza chat de IA, LINE, formulário e contatos diretos.
    icon: i-lucide-message-square
  - href: /blog/cloudflare-pages-security/
    title: Segurança no Cloudflare Pages
    description: Artigo sobre CSP e headers de segurança para sites estáticos.
    icon: i-lucide-shield
  - href: /blog/cms-selection-and-turnstile/
    title: CMS e Turnstile
    description: Artigo sobre operação de formulários e proteção contra bots.
    icon: i-lucide-badge-check
faq:
  title: Perguntas frequentes
  items:
    - question: Preciso de RAG ou banco vetorial para criar esse chat?
      answer: Para um site corporativo pequeno, contexto estruturado com informações públicas no prompt costuma ser suficiente. Busca ou banco vetorial podem ser adicionados quando o volume de páginas ou atualizações crescer.
    - question: A API key da OpenAI aparece no navegador?
      answer: Não. O navegador envia apenas a pergunta para /api/ai-contact. A Cloudflare Pages Function chama a OpenAI Responses API e gerencia a API key.
    - question: A IA pode retornar qualquer link?
      answer: Não. Links são limitados a caminhos internos, origin atual, acecore.net, LINE oficial e, quando necessário, mailto ou tel específicos. URLs Markdown são recortadas antes da checagem.
---

Adicionar um chat de IA a um site é simples. O que precisa de desenho é a operação: até onde a IA pode responder, para onde deve guiar visitantes, quais URLs podem aparecer e como controlar custo de API.

No site da Acecore, adicionamos um chat de IA de contato a uma base estática Astro + Cloudflare Pages. A implementação principal está no [PR que adicionou a IA de contato e o fluxo de tradução limitado ao CMS](https://github.com/acecore-systems/acecore-net/pull/98). Depois ajustamos a renderização segura de links Markdown em [outro PR](https://github.com/acecore-systems/acecore-net/pull/99). Os detalhes desse renderizador estão em [Renderizar links Markdown com segurança em respostas de chat com IA](/blog/ai-chat-markdown-link-safety/).

Este artigo organiza o design como um padrão reutilizável para outros sites estáticos. Mesmo fora de Astro, a ideia é a mesma: separar widget cliente, fronteira de API, prompt e renderer.

## Estrutura geral

| Camada               | Responsabilidade                                                    |
| -------------------- | ------------------------------------------------------------------- |
| Chat widget          | UI, entrada, locale atual, histórico mínimo e renderização Markdown |
| `/api/ai-contact`    | Validação, Origin check, rate limit, prompt e chamada à OpenAI      |
| OpenAI Responses API | Gerar resposta com contexto público e estado da conversa            |

O navegador não deve chamar a OpenAI diretamente. Manter a chamada atrás de um endpoint evita exposição de chave, permite atualizar prompt e contexto no servidor e centraliza limites e erros.

Em Astro + Cloudflare Pages, a fronteira pode ser uma Pages Function em `/api/ai-contact`. Em Next.js seria um Route Handler; em Hono ou Express, uma rota API normal.

## Mantenha pequeno o contrato do endpoint

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

Nome, e-mail, telefone, empresa e campos detalhados do formulário não precisam passar pelo chat. O papel do chat é ajudar a escolher serviço e rota de contato, não coletar dados pessoais.

Também limite o histórico a poucos turnos recentes e defina tamanho máximo por mensagem. Isso reduz prompt e custo.

## Controle validação e modelo no servidor

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

O ponto é reduzir e validar entrada antes de chamar a IA. Mensagens longas, histórico ilimitado e chamadas de outros sites podem desestabilizar a operação.

`OPENAI_MODEL` deve vir de variável de ambiente, e `OPENAI_API_KEY` deve ficar apenas no servidor. Para distribuição e CSP, veja [segurança com Cloudflare Pages](/blog/cloudflare-pages-security/).

## Torne o contexto do site explícito

Para esse porte de site, não é necessário começar com banco vetorial. Um contexto estruturado com informações públicas já é útil.

Inclua resumo da empresa, serviços, exemplos de consulta, URLs, FAQ, regras de contato, áreas que a IA não deve afirmar e URLs internas por locale.

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

O objetivo não é deixar o modelo responder com conhecimento geral, mas informar o que este site pode dizer. Se o site crescer, use Pagefind, CMS JSON, D1, Vectorize ou outra camada de recuperação.

## Escreva regras no prompt

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

Um erro comum é a IA tentar ajudar demais e prometer demais. Preços, prazos e garantias devem receber orientação geral e encaminhamento ao formulário.

## Separe as rotas de contato

| Rota           | Papel                                                       |
| -------------- | ----------------------------------------------------------- |
| FAQ            | Resolver dúvidas comuns na própria página                   |
| Chat de IA     | Organizar serviços, rotas de contato e páginas relacionadas |
| LINE           | Perguntas curtas, assuntos de escola e confirmações leves   |
| Formulário     | Orçamentos, produção, parcerias e recrutamento              |
| Contato direto | Complemento após formulário ou confirmação urgente          |

A IA conecta conteúdos gerais como [introdução de serviços](/blog/service-introduction/) às rotas da [página de contato](/contact/). O padrão funciona para B2B, agências, escolas e suporte SaaS.

## Preserve URLs por locale

Em um site multilíngue, não basta responder no idioma correto. A URL também precisa combinar com o locale.

```ts
function localizePath(path: string, locale: Locale) {
  if (locale === 'ja') return path
  return `/${locale}${path}`
}
```

Gerar isso no servidor é mais confiável do que apenas pedir ao modelo. A base da tradução está em [pipeline de tradução com Copilot](/blog/copilot-translation-pipeline/).

## Adicione Origin check e rate limit

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

Rate limit por IP é um primeiro freio. Em Cloudflare, use `CF-Connecting-IP`, `X-Forwarded-For` ou `CF-Ray`. Para mais tráfego, considere Cloudflare WAF, Turnstile, KV, D1 ou Durable Objects. Para formulários, veja [CMS e Turnstile](/blog/cms-selection-and-turnstile/).

## Renderize links Markdown com lista permitida

Permita apenas parágrafos, listas, negrito, código inline e links Markdown. Depois restrinja destinos a caminhos internos, origin atual, `https://acecore.net`, LINE oficial e `mailto:` ou `tel:` necessários.

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

O `trim()` é essencial porque a IA pode gerar `[Services]( /services/ )`. Um renderer pequeno e rígido é mais fácil de manter.

## Teste local, preview e produção

Astro dev ou preview não é igual ao ambiente de Cloudflare Pages Functions. Sem `OPENAI_API_KEY`, teste fallback e erros de UI.

Em preview ou produção, confirme POST em `/api/ai-contact`, variáveis `OPENAI_API_KEY` e `OPENAI_MODEL`, rejeição de outro Origin, limites de entrada, respostas no locale certo, URLs localizadas, ausência de afirmações sobre orçamento ou contrato, e links Markdown apenas quando permitidos.

Também teste entradas longas, perguntas inesperadas, páginas em inglês, pedidos de contato direto e perguntas de preço.

## Métricas operacionais

Acompanhe taxa de erro da API, ocorrências de rate limit, média de mensagens por consulta, cliques para formulário e LINE, casos encaminhados ao formulário e uso por locale.

Se salvar conversas, defina privacidade antes. Um começo mais seguro é registrar eventos e erros sem texto das mensagens.

## Escopo separado

Este artigo trata apenas do design técnico do chat de IA. A navegação que repassa o contexto da página de serviço para o formulário também está implementada, e está organizada em [Design técnico para passar contexto do CTA de serviço para o formulário de contato](/blog/service-cta-contact-prefill/).

- Chat de IA: organizar dúvidas em conversa e guiar com segurança
- CTA de serviço: passar ao formulário o contexto que o visitante estava lendo

Separar os temas melhora a leitura e facilita links internos.

## Resumo

Ao adicionar um chat de IA a um site estático, desenhe primeiro a fronteira de API e o controle de respostas.

As decisões principais foram chamar OpenAI pela Cloudflare Pages Function, manter input pequeno, montar contexto e URLs no servidor, escrever limites no prompt, separar formulário, LINE e contato direto, adicionar Origin check e rate limit, e renderizar links Markdown com `trim()` e lista permitida.

Sites estáticos podem ter chats de IA úteis. O centro não é destacar a IA, mas ajudar o visitante a escolher o próximo passo com segurança.
