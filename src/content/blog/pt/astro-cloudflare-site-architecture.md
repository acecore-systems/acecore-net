---
title: 'Como projetar um site Astro + Cloudflare que cresce por funcionalidade'
description: 'Como combinamos Astro e Cloudflare Pages com chat de contato com IA, Sveltia CMS, blog multilíngue, CTA de serviços, renderização segura de Markdown e comentários sem serviço externo.'
date: 2026-06-07T19:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'Astro', 'Cloudflare', 'Webサイト', 'AI', 'CMS']
image: /uploads/acecore-generated/work-acecore-net-website.webp
callout:
  type: tip
  title: Defina fronteiras antes de adicionar recursos
  text: 'Chat com IA, CMS, localização e comentários são úteis, mas precisam de fronteiras claras quando ficam no mesmo site institucional. Astro gera HTML estático, Cloudflare entrega o site e processa pequenas APIs, e GitHub mantém as mudanças revisáveis.'
processFigure:
  eyebrow: Site Architecture
  title: Camadas de expansão do site
  description: Manter o site estático por padrão e adicionar partes dinâmicas só quando necessário.
  variant: inline
  steps:
    - title: Entregar
      description: Gerar HTML com Astro e publicar no Cloudflare Pages.
      icon: i-lucide-rocket
      accent: brand
    - title: Editar
      description: Editar a fonte japonesa no Sveltia CMS e revisar por PRs.
      icon: i-lucide-file-pen-line
      accent: emerald
    - title: Traduzir
      description: Separar traduções em PRs, sem expor todos os idiomas no CMS.
      icon: i-lucide-languages
      accent: amber
    - title: Guiar
      description: Usar chat com IA e CTAs de serviço para levar o visitante ao formulário certo.
      icon: i-lucide-route
      accent: slate
linkCards:
  - href: /pt/blog/astro-ai-contact-chat/
    title: Design técnico do chat de contato com IA
    description: Fronteiras de API e controle de respostas usando informações do site.
    icon: i-lucide-bot
  - href: /pt/blog/cms-selection-and-turnstile/
    title: Guia de instalação do Sveltia CMS
    description: CMS, GitHub backend, OAuth e operação com PRs para sites estáticos.
    icon: i-lucide-badge-check
  - href: /pt/blog/copilot-translation-pipeline/
    title: Blog multilíngue com Sveltia CMS
    description: Publicar páginas estáticas localizadas em vez de depender só de tradução na UI.
    icon: i-lucide-languages
  - href: /pt/blog/service-cta-contact-prefill/
    title: Passar contexto do CTA para o formulário
    description: Levar o contexto do serviço lido para categoria e assunto do formulário.
    icon: i-lucide-route
  - href: /pt/blog/ai-chat-markdown-link-safety/
    title: Renderização segura de links Markdown em IA
    description: Renderizar links permitidos sem tratar a saída de IA como HTML confiável.
    icon: i-lucide-shield-check
  - href: /pt/blog/cloudflare-only-blog-comments/
    title: Comentários de blog usando só Cloudflare
    description: Comentários sem serviço externo, com Pages Functions, D1 e Turnstile.
    icon: i-lucide-message-square-text
---

Os últimos artigos cobriram chat de contato com IA, Sveltia CMS, publicação multilíngue, CTAs de serviço, renderização segura de Markdown e comentários usando apenas Cloudflare.

Faltava o artigo que conecta tudo.

## Resumo

A arquitetura separa responsabilidades:

| Camada      | Responsabilidade                         |
| ----------- | ---------------------------------------- |
| Astro       | Páginas, blog, OGP, RSS, sitemap e UI    |
| Cloudflare  | Pages, Pages Functions, D1 e Turnstile   |
| GitHub      | PRs, diffs de CMS, traduções e histórico |
| Sveltia CMS | Fonte japonesa, autores, tags e imagens  |
| OpenAI API  | Respostas do chat de contato             |
| Pagefind    | Índice de busca para HTML revisado       |

O que pode ser estático fica estático. O que precisa de runtime vai para pequenas APIs.

## Por que um artigo hub

Já existiam artigos sobre desempenho, SEO, acessibilidade, i18n e renovação do site. Eles não reuniam as funcionalidades recentes.

Este texto vira o mapa: primeiro a arquitetura, depois cada detalhe.

## APIs pequenas no Cloudflare

Chat com IA e comentários seguem o mesmo padrão.

Astro renderiza a UI. Pages Functions cuida da fronteira de API. Secrets, bindings D1, Turnstile, Origin checks e rate limit ficam fora do navegador.

## CMS como interface de edição

Sveltia CMS não é banco de dados em runtime. Ele cria mudanças no Git.

Conteúdo japonês, autores, tags, imagens e JSON passam por PR, build e review antes de produção.

## Tradução como conteúdo estático

Localização não é só traduzir a tela no navegador.

Cada idioma tem URL, title, description, OGP, JSON-LD, RSS, sitemap e hreflang próprios.

## Canais de contato separados

O chat com IA ajuda quem ainda está escolhendo. O CTA de serviço preserva contexto. O formulário registra a consulta formal.

Cada um tem uma função.

## Saída de IA não é HTML confiável

Links Markdown vindos da IA são tratados como texto até serem validados.

Só links permitidos por allowlist viram nós DOM seguros.

## Comentários dentro do Cloudflare

Os comentários não usam widget externo.

Pages Functions recebe GET/POST, D1 guarda comentários e Turnstile protege envios. Para um blog institucional pequeno, isso é suficiente.

## Ordem recomendada

1. [Guia de instalação do Sveltia CMS](/pt/blog/cms-selection-and-turnstile/)
2. [Como operar um blog multilíngue com Sveltia CMS](/pt/blog/copilot-translation-pipeline/)
3. [Design técnico do chat de contato com IA](/pt/blog/astro-ai-contact-chat/)
4. [Renderização segura de links Markdown em respostas de IA](/pt/blog/ai-chat-markdown-link-safety/)
5. [Passar contexto do CTA para o formulário](/pt/blog/service-cta-contact-prefill/)
6. [Comentários de blog Astro usando só Cloudflare](/pt/blog/cloudflare-only-blog-comments/)

## Conclusão

Astro + Cloudflare permite ampliar um site institucional sem perder as vantagens da entrega estática.

Os artigos individuais explicam como cada função foi construída. Este artigo explica por que elas pertencem à mesma arquitetura.
