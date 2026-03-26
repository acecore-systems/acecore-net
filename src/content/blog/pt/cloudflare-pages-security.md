---
title: 'Entrega segura de sites estáticos com Cloudflare Pages'
description: 'Guia prático sobre deploy de sites estáticos no Cloudflare Pages e configuração de cabeçalhos de segurança e CSP via _headers. Também apresentamos o histórico de retorno de Worker para Pages.'
date: 2026-03-15
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ']
image: https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop&q=80
processFigure:
  title: Evolução da configuração de deploy
  steps:
    - title: Configuração inicial
      description: Entrega de site estático com Cloudflare Pages.
      icon: i-lucide-cloud
    - title: Migração para Worker
      description: Migração para Worker para processamento de formulário de contato.
      icon: i-lucide-server
    - title: Retorno ao Pages
      description: Adoção de serviço externo de formulário para retornar ao estático.
      icon: i-lucide-rotate-ccw
    - title: Reforço de segurança
      description: Configuração de CSP e cabeçalhos de segurança via _headers.
      icon: i-lucide-shield-check
callout:
  type: info
  title: Worker vs Pages
  text: Cloudflare Worker é flexível, mas para sites estáticos o Pages é superior em eficiência de cache e simplicidade de deploy. Se não há necessidade de processamento server-side, escolha Pages.
faq:
  title: Perguntas frequentes
  items:
    - question: Devo escolher Cloudflare Pages ou Workers?
      answer: Para sites estáticos que não precisam de processamento server-side, Pages é ideal. A integração com CDN é seamless e o deploy é simples. O processamento de formulários pode ser substituído por serviços externos.
    - question: Quais cabeçalhos de segurança devem ser configurados no arquivo _headers?
      answer: Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy e Permissions-Policy são os básicos. O CSP deve ser ajustado conforme os recursos externos utilizados pelo site.
    - question: Como permitir AdSense ou Analytics na configuração do CSP?
      answer: Adicione os domínios googletagmanager.com ou googlesyndication.com ao script-src. Dependendo do caso, também pode ser necessário permitir domínios relacionados em img-src e connect-src.
---

Cloudflare Pages é a plataforma ideal para hospedagem de sites estáticos. Neste artigo, apresentamos a configuração real de deploy e as configurações de segurança usando o arquivo `_headers`.

## Configuração de deploy: Por que saímos do Worker e voltamos ao Pages

Inicialmente, planejávamos processar o backend do formulário de contato com Cloudflare Worker. Com Worker, é possível enviar e-mails e fazer validação no server-side.

No entanto, ao configurar na prática, encontramos os seguintes desafios:

- **Complexificação do build**: Configurações adicionais necessárias para servir a saída do build do Astro via Worker
- **Trabalho de debug**: Diferenças de comportamento entre `wrangler dev` local e produção
- **Controle de cache**: Pages tem integração mais natural com o CDN Cloudflare

Finalmente, utilizando um serviço externo chamado [ssgform.com](https://ssgform.com/) para o formulário de contato, eliminamos completamente o processamento server-side. Com isso, não havia mais necessidade do Worker e pudemos fazer deploy no Pages como um site puramente estático.

## Configuração de segurança via \_headers

No Cloudflare Pages, os cabeçalhos de resposta HTTP podem ser escritos no arquivo `public/_headers`. A seguir, um trecho das configurações realmente utilizadas.

### Content-Security-Policy (CSP)

CSP é um cabeçalho importante para prevenir ataques de Cross-Site Scripting (XSS). Especifica em formato de whitelist as origens permitidas para busca de recursos.

```text
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://acecore.net https://images.unsplash.com data:;
  connect-src 'self' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  frame-src https://challenges.cloudflare.com https://googleads.g.doubleclick.net;
  form-action https://ssgform.com;
```

Os pontos principais são:

- **script-src**: Permite Cloudflare Turnstile (`challenges.cloudflare.com`) e AdSense
- **img-src**: Permite o endpoint same-origin do Cloudflare Images e o Unsplash
- **form-action**: Restringe envio de formulário apenas para ssgform.com
- **frame-src**: Permite iframe do Turnstile e frame de anúncios do AdSense

### Outros cabeçalhos de segurança

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- **X-Content-Type-Options**: Previne MIME sniffing
- **X-Frame-Options**: Proíbe embedding em iframe como medida contra clickjacking
- **Referrer-Policy**: Envia apenas a origem em requisições cross-origin
- **Permissions-Policy**: Desabilita APIs do navegador desnecessárias (câmera, microfone, geolocalização)

## Controle de cache

Assets estáticos recebem cache de longa duração, enquanto HTML recebe cache curto.

```text
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=3600
```

Os arquivos no diretório `_astro/` gerado pelo Astro contêm hash de conteúdo no nome, então cache `immutable` de 1 ano é seguro. HTML tem alguma frequência de atualização, então mantém cache de 1 hora.

## Configuração de deploy do Pages

A configuração do projeto Cloudflare Pages é simples:

| Item | Configuração |
| ---- | ------------ |
| Comando de build | `npx astro build` |
| Diretório de saída | `dist` |
| Versão do Node.js | 22 |

Conectando o repositório GitHub, o deploy automático é feito a cada push para o branch `main`. Deploy de preview também é gerado automaticamente para cada PR, facilitando o review.

## Conclusão

O importante é avaliar se "o processamento server-side é realmente necessário". Com o uso de serviços externos, foi possível eliminar o Worker, resultando em deploy e gerenciamento de segurança mais simples. A configuração de CSP via `_headers` dá trabalho no início, mas uma vez escrita, se aplica a todas as páginas, sendo uma medida de segurança com excelente custo-benefício.
