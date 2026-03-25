---
title: 'Diário de seleção de CMS headless — Por que escolhemos Pages CMS e proteção contra bots com Turnstile'
description: 'Registro da avaliação comparativa entre Keystatic, Sveltia CMS e Pages CMS, a escolha do Pages CMS, e a implementação de proteção contra spam no formulário de contato com Cloudflare Turnstile.'
date: 2026-03-15
author: gui
tags: ['技術', 'CMS', 'セキュリティ']
image: https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&h=400&fit=crop&q=80
compareTable:
  title: Comparação de CMS
  before:
    label: Keystatic / Sveltia CMS
    items:
      - Keystatic requer runtime server-side
      - Sveltia CMS é rico em recursos mas com alta curva de aprendizado
      - Ambos são complexos demais para a estrutura Astro + Pages
      - Configuração demora
  after:
    label: Pages CMS
    items:
      - Edita diretamente o Markdown do repositório GitHub
      - Editor GUI permite que não-engenheiros atualizem artigos
      - 'Não requer server-side, perfeita compatibilidade com Pages'
      - 'Configuração completa com apenas .pages.yml'
callout:
  type: tip
  title: Vantagens do Turnstile
  text: Diferente do reCAPTCHA, o Cloudflare Turnstile não exige que o usuário selecione imagens. A verificação automática acontece em segundo plano, permitindo proteção contra bots sem comprometer a UX.
faq:
  title: Perguntas frequentes
  items:
    - question: O que é Pages CMS?
      answer: É um CMS leve que permite editar diretamente arquivos Markdown de um repositório GitHub via GUI. Não requer servidor, a configuração se completa com apenas .pages.yml, e até não-engenheiros podem atualizar artigos.
    - question: Qual a diferença entre Cloudflare Turnstile e reCAPTCHA?
      answer: O Turnstile não exige que o usuário selecione imagens, fazendo verificação automática em segundo plano. Respeita a privacidade e é gratuito para uso.
    - question: Como processar envio de formulários em um site estático?
      answer: Usando serviços externos de formulário como ssgform.com ou Formspree, é possível processar envios sem código server-side. Combinando com Turnstile, a proteção contra spam também é possível.
---

A seleção de CMS é uma decisão importante, embora discreta. Neste artigo, apresentamos o processo de avaliação real de 3 CMS e a implementação de proteção contra bots com Cloudflare Turnstile no formulário de contato.

## Histórico da seleção de CMS

Ao introduzir um CMS em um site estático construído com Astro, listamos 3 candidatos.

### Keystatic: Primeiro candidato

Keystatic chamou atenção como um CMS type-safe. A integração com Astro também é oficialmente suportada. No entanto, a operação em modo local requer runtime server-side, apresentando dificuldades de compatibilidade com o deploy estático do Cloudflare Pages.

### Sveltia CMS: Muitos recursos, mas pesado

Sveltia CMS é um fork do Decap CMS (antigo Netlify CMS), com UI moderna e muitas funcionalidades. No entanto, para o tamanho atual do projeto (alguns artigos de blog + algumas páginas fixas), era complexo demais. Planejamos reavaliar quando o conteúdo crescer no futuro.

### Pages CMS: Adotado

[Pages CMS](https://pagescms.org/) é um CMS leve que edita diretamente arquivos Markdown do repositório GitHub.

Os pontos decisivos para adoção foram:

- **Setup simples**: Basta adicionar 1 arquivo `.pages.yml`
- **Sem servidor**: Opera via API do GitHub, sem necessidade de infraestrutura adicional
- **Nativo de Markdown**: Integra diretamente com as content collections do Astro
- **Editor GUI**: Membros não-engenheiros da equipe também podem editar artigos pelo navegador

```yaml
# .pages.yml
content:
  - name: blog
    label: Blog
    path: src/content/blog
    type: collection
    fields:
      - name: title
        label: Título
        type: string
      - name: date
        label: Data de publicação
        type: date
      - name: tags
        label: Tags
        type: string
        list: true
```

## Introdução do Cloudflare Turnstile

Implementamos o Cloudflare Turnstile como proteção contra spam no formulário de contato.

### Por que Turnstile em vez de reCAPTCHA

O Google reCAPTCHA v2 força o usuário a selecionar imagens, e o v3, embora baseado em pontuação, tem preocupações de privacidade. O Cloudflare Turnstile é superior nos seguintes pontos:

| Item comparado | reCAPTCHA v2 | reCAPTCHA v3 | Turnstile |
| -------------- | ------------ | ------------ | --------- |
| Ação do usuário | Seleção de imagens necessária | Desnecessária | Desnecessária |
| Privacidade | Rastreamento por Cookie | Análise comportamental | Coleta mínima de dados |
| Performance | Pesado | Moderado | Leve |
| Preço | Gratuito (com limites) | Gratuito (com limites) | Gratuito (ilimitado) |

### Método de implementação

A introdução do Turnstile é surpreendentemente simples.

#### 1. Criar widget no Cloudflare Dashboard

Na seção "Turnstile" do Cloudflare Dashboard, crie um widget e registre os hostnames alvo (domínio de produção e `localhost`). Uma chave do site será emitida.

#### 2. Adicionar widget ao formulário

```html
<!-- Carregamento do script Turnstile -->
<script
  src="https://challenges.cloudflare.com/turnstile/v0/api.js"
  async
  defer
></script>

<!-- Colocar widget dentro do formulário -->
<form action="https://ssgform.com/s/your-form-id" method="POST">
  <!-- Campos do formulário -->
  <input type="text" name="name" required />
  <textarea name="message" required></textarea>

  <!-- Widget Turnstile -->
  <div
    class="cf-turnstile"
    data-sitekey="your-site-key"
    data-language="ja"
    data-theme="light"
  ></div>

  <button type="submit">Enviar</button>
</form>
```

Ao especificar `data-language="ja"`, quando a verificação é bem-sucedida, exibe em japonês "成功しました！". O `data-theme="light"` é especificado para controlar a cor de fundo conforme o design do site.

#### 3. Atualização do cabeçalho CSP

O Turnstile usa iframe, então é necessário permitir adequadamente no CSP.

```text
script-src: https://challenges.cloudflare.com
connect-src: https://challenges.cloudflare.com
frame-src: https://challenges.cloudflare.com
```

### Atenção: Atraso de propagação após criação do widget

Logo após criar o widget no Cloudflare Dashboard, leva 1 a 2 minutos para a chave do site se propagar globalmente. Durante esse período, o erro `400020` ocorre, mas espere um pouco e será resolvido.

## Utilização do ssgform.com

Como destino de envio do formulário, usamos [ssgform.com](https://ssgform.com/). É um serviço de envio de formulários para sites estáticos, com as seguintes vantagens:

- Sem código server-side
- Notificações por e-mail automáticas
- Suporte à verificação de token do Turnstile
- Volume de envio suficiente no plano gratuito

## Conclusão

Tanto para CMS quanto para proteção contra bots, unificamos a diretriz de "escolher o mínimo necessário". O Pages CMS pode ser introduzido em 5 minutos de setup, e o Turnstile pode ser implementado adicionando apenas algumas linhas de HTML. É justamente por ser uma configuração simples que os custos operacionais permanecem baixos.
