---
title: 'Como adicionar comentários a um blog Astro usando apenas Cloudflare'
description: 'Como implementamos comentários em um blog Astro sem serviço externo, usando Cloudflare Pages Functions, D1, Turnstile e configuração Wrangler.'
date: 2026-06-07T18:00
lastUpdated: 2026-06-07T00:00
author: gui
tags: ['技術', 'Cloudflare', 'Astro', 'セキュリティ', 'Webサイト']
image: /uploads/acecore-generated/blog-cloudflare-pages-security.webp
callout:
  type: tip
  title: Sem serviço externo de comentários
  text: 'Um site Astro estático pode ter comentários próprios. Pages Functions cuida da API, D1 armazena os dados, Turnstile protege envios e Wrangler mantém os bindings por ambiente.'
linkCards:
  - href: /pt/blog/cloudflare-pages-security/
    title: Segurança no Cloudflare Pages
    description: Headers de segurança e entrega estática no Cloudflare Pages.
    icon: i-lucide-shield
  - href: /pt/blog/cms-selection-and-turnstile/
    title: Guia de instalação do Sveltia CMS
    description: CMS e componentes Cloudflare usados no site.
    icon: i-lucide-badge-check
  - href: /pt/blog/astro-ai-contact-chat/
    title: Chat de contato com IA no Astro
    description: Outro exemplo de API com Pages Functions.
    icon: i-lucide-bot
faq:
  title: Perguntas frequentes
  items:
    - question: Por que não usar comentários externos?
      answer: 'Serviços externos são rápidos, mas UI, dados, scripts, moderação e migração ficam dependentes deles. Aqui tudo fica no site e no Cloudflare.'
    - question: D1 é suficiente?
      answer: 'Para comentários por post_slug, ordenação por data, soft delete, rate limit e duplicados, D1 funciona bem.'
    - question: Turnstile só no cliente basta?
      answer: 'Não. A Pages Function precisa validar o token no Siteverify antes de gravar no D1.'
---

Comentários adicionam estado a um site estático. Por isso, muita gente usa widgets externos.

No Acecore, escolhemos outro caminho: em [PR #101](https://github.com/acecore-systems/acecore-net/pull/101), implementamos a função apenas com Cloudflare.

- Astro renderiza a interface.
- Cloudflare Pages Functions expõe `/api/comments`.
- Cloudflare D1 armazena comentários.
- Cloudflare Turnstile protege o envio.
- `wrangler.jsonc` define o binding `COMMENTS_DB`.

O ponto principal é que a área de comentários não vira uma dependência externa dentro da página.

## Arquitetura

| Camada   | Arquivo ou serviço                         |
| -------- | ------------------------------------------ |
| UI       | `src/components/BlogComments.astro`        |
| Artigo   | `src/views/BlogPostPage.astro`             |
| API      | `functions/api/comments.ts`                |
| Banco    | D1 binding `COMMENTS_DB`                   |
| Proteção | Cloudflare Turnstile                       |
| Schema   | `migrations/0001_create_blog_comments.sql` |

A UI lê com `GET /api/comments?slug=...&locale=...` e envia com `POST /api/comments`.

A Function valida origin, payload, Turnstile, limites, duplicados e conteúdo bloqueado antes de inserir.

## Por que D1

Comentários precisam de consultas por artigo, ordenação por data, soft delete, duplicidade e rate limit por cliente. SQL deixa isso simples.

Os comentários visíveis são `deleted_at IS NULL`. Para ocultar spam, basta preencher `deleted_at`, sem apagar fisicamente a linha.

As queries usam prepared statements com `bind()`, evitando concatenar input de usuário no SQL.

## Wrangler e ambientes

`COMMENTS_DB` fica em `wrangler.jsonc` e aponta para o único banco D1 `acecore-comments`.

Assim o nome do binding continua estável, enquanto o dashboard da Cloudflare e o repositório usam o mesmo nome de banco.

## Turnstile no servidor

O widget no browser não é suficiente. A Function envia o token para o Cloudflare Siteverify usando `TURNSTILE_SECRET_KEY`.

Também validamos o hostname retornado, para aceitar apenas domínios esperados e previews autorizadas.

## Anti-spam

A primeira versão é restrita:

- sem URLs
- sem emails
- sem HTML
- sem links Markdown
- sem caracteres repetidos em excesso
- sem termos promocionais comuns
- honeypot no formulário

Também há rate limit em memória e rate limit persistente em D1 com `client_hash`. O hash usa salt; o IP bruto não precisa ser armazenado.

## SEO

Comentários são carregados no cliente e a área usa `data-pagefind-ignore`. Eles não entram no índice como conteúdo principal.

Para um blog corporativo, isso separa conteúdo editorial revisado de interação dos visitantes.

## Resumo

Serviços externos de comentários são úteis, mas não obrigatórios.

Se o site já roda em Cloudflare Pages, Pages Functions + D1 + Turnstile + Wrangler formam uma base suficiente para comentários leves, com UI, dados e segurança sob o mesmo modelo operacional.

## Referências

- [Cloudflare Pages: Configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Cloudflare Pages Functions: Bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare D1: Prepared statement methods](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [Cloudflare D1: Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Cloudflare Turnstile: Server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare Turnstile: Any Hostname](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/any-hostname/)
- [PR #101: Comentários com Cloudflare](https://github.com/acecore-systems/acecore-net/pull/101)
