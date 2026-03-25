---
title: 'Armadilhas e soluções do Astro View Transitions — Guia de melhoria de UX e qualidade de código'
description: 'Guia prático sobre soluções para scripts que param de funcionar com View Transitions do Astro, introdução de busca full-text com Pagefind, melhoria de segurança de tipos com TypeScript e gerenciamento centralizado de constantes, melhorando UX e qualidade de código.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'Webサイト']
image: https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=800&h=400&fit=crop&q=80
callout:
  type: warning
  title: Leitura obrigatória se usar View Transitions
  text: 'Ao introduzir o ClientRouter (View Transitions) do Astro, as transições de página ficam suaves, mas todos os scripts inline deixam de ser re-executados. Este artigo compila os padrões de solução e técnicas de melhoria de UX e qualidade de código.'
processFigure:
  title: Como conduzir melhorias de UX
  steps:
    - title: Descoberta do problema
      description: Listar mau funcionamento após introdução de View Transitions.
      icon: i-lucide-bug
    - title: Unificação de padrões
      description: Converter todos os scripts para um padrão de inicialização unificado.
      icon: i-lucide-repeat
    - title: Implementação de busca
      description: Introduzir busca full-text com Pagefind e organizar a navegação.
      icon: i-lucide-search
    - title: Garantia de segurança de tipos
      description: Eliminar any e centralizar constantes para melhorar a manutenibilidade.
      icon: i-lucide-shield-check
compareTable:
  title: Comparação antes e depois da melhoria
  before:
    label: Antes da melhoria
    items:
      - Menu hamburger não funciona após transição de página
      - Sem busca interna no site
      - Tipos any e constantes hardcoded espalhados
      - onclick inline com risco de violação de CSP
  after:
    label: Depois da melhoria
    items:
      - Todos os scripts funcionam normalmente com astro:after-swap
      - Busca full-text com Pagefind com 3 eixos de filtro
      - Segurança de tipos TypeScript e gerenciamento centralizado de constantes
      - addEventListener + atributos data em conformidade com CSP
faq:
  title: Perguntas frequentes
  items:
    - question: Essas melhorias são válidas sem View Transitions?
      answer: 'As melhorias além do padrão de inicialização de scripts (Pagefind, TypeScript, gerenciamento de constantes) são válidas independentemente do uso de View Transitions.'
    - question: Até que escala de site o Pagefind suporta?
      answer: 'O Pagefind foi projetado para sites estáticos e funciona rapidamente mesmo com milhares de páginas. O índice de busca é gerado no build e executado no lado do navegador, então não há carga no servidor.'
    - question: Erros de tipo TypeScript podem ser ignorados e o código funciona?
      answer: 'Funciona, mas erros de tipo são indícios de bugs. Especialmente os schemas de conteúdo do Astro, ao serem type-safe, permitem autocompletar do IDE no acesso a propriedades dentro dos templates, melhorando significativamente a eficiência de desenvolvimento.'
---

## Introdução

O View Transitions (ClientRouter) do Astro é uma funcionalidade poderosa que torna as transições de página suaves como um SPA. No entanto, ao introduzi-lo, surgem problemas: o menu hamburger não abre, o botão de busca não responde, o slider para...

Neste artigo, apresentamos as armadilhas do View Transitions e suas soluções, além de técnicas práticas para melhorar UX e qualidade de código.

---

## Problema de scripts do View Transitions

### Por que os scripts param de funcionar

Em transições de página normais, o navegador re-parseia o HTML e executa todos os scripts. No entanto, o View Transitions atualiza a página por diferencial de DOM, **fazendo com que scripts inline não sejam re-executados**.

Os seguintes processos são afetados:

- Abertura/fechamento do menu hamburger
- Handler de clique do botão de busca
- Slider de imagem hero
- Seguimento de scroll do sumário
- Padrão façade do embed YouTube

### Padrão de solução

Unifique todos os scripts no padrão de **encapsular em funções nomeadas e re-registrar com `astro:after-swap`**.

```html
<script>
  function initHeader() {
    const menuBtn = document.querySelector('[data-menu-toggle]')
    menuBtn?.addEventListener('click', () => { /* ... */ })
  }

  // Execução inicial
  initHeader()

  // Re-execução após View Transitions
  document.addEventListener('astro:after-swap', initHeader)
</script>
```

### Diferença entre astro:after-swap e astro:page-load

- `astro:after-swap`: Dispara imediatamente após a troca do DOM. Não dispara no carregamento inicial, então é necessário chamar a função diretamente
- `astro:page-load`: Dispara **tanto** no carregamento inicial **quanto** após View Transitions. Permite omitir a chamada inicial

Para embeds do YouTube e funcionalidades que devem funcionar com certeza no carregamento inicial, `astro:page-load` é conveniente.

---

## Introdução de busca full-text com Pagefind

Se você quer implementar busca full-text em um site estático, Pagefind é recomendado. Gera o índice no build e executa a busca no lado do navegador, sendo rápido e sem necessidade de servidor.

### Configuração básica

```json
{
  "scripts": {
    "build": "astro build && pagefind --site dist"
  }
}
```

Execute o Pagefind após o build do Astro para gerar o índice em `dist/pagefind/`.

### Busca facetada

Com o atributo `data-pagefind-filter`, é possível filtrar por 3 eixos: autor, ano e tag.

```html
<span data-pagefind-filter="author">gui</span>
<span data-pagefind-filter="year">2026</span>
<span data-pagefind-filter="tag">Astro</span>
```

### Modal de busca

Implemente um modal de busca que abre com o atalho `Ctrl+K`. Quando não há resultados, exiba links para a lista de artigos, página de serviços e contato para prevenir abandono do usuário.

### Integração SearchAction

Ao definir o parâmetro `?q=` nos dados estruturados `SearchAction` do Google, é possível transitar diretamente dos resultados de busca para a busca interna do site. Adicione processamento para detectar o parâmetro da URL e abrir automaticamente o modal de busca.

### Configuração de cache

Os arquivos de índice do Pagefind têm baixa frequência de alteração, então habilite o cache nas configurações de cabeçalhos do Cloudflare Pages.

```
/pagefind/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400
```

---

## Eliminação de onclick inline

Escrever `onclick="..."` diretamente no HTML é fácil, mas causa a necessidade de `unsafe-inline` no CSP (Content Security Policy).

### Padrão de melhoria

Substitua `onclick` por atributos `data-*` + `addEventListener`.

```html
<!-- Antes -->
<button onclick="window.openSearch?.()">Buscar</button>

<!-- Depois -->
<button data-search-trigger>Buscar</button>
```

```javascript
document.querySelectorAll('[data-search-trigger]').forEach(btn => {
  btn.addEventListener('click', () => window.openSearch?.())
})
```

---

## Organização da biblioteca de componentes

Ter componentes disponíveis para usar ao escrever artigos de blog aumenta o poder de expressão dos artigos.

| Componente | Uso |
| --- | --- |
| Callout | Anotações em 4 tipos: info / warning / tip / note |
| Timeline | Exibição cronológica de eventos |
| FAQ | Perguntas e respostas com suporte a dados estruturados |
| Gallery | Galeria de imagens com Lightbox |
| CompareTable | Tabela comparativa antes/depois |
| ProcessFigure | Diagrama de processo passo a passo |
| LinkCard | Card de link externo estilo OGP |
| YouTubeEmbed | Carregamento lazy com padrão façade |

Todos foram projetados para serem chamados a partir do frontmatter do Markdown. Se `data.callout` existir no template do artigo, renderiza `<Callout>`.

---

## Melhoria da segurança de tipos TypeScript

### Eliminação de tipos any

Especifique tipos concretos como `any[]` → `CollectionEntry<'blog'>[]`. O autocompletar do IDE e a detecção de erros em tempo de compilação passam a funcionar, tornando o acesso a propriedades nos templates seguro.

### Tipos literais no schema de conteúdo

```typescript
type: z.enum(['info', 'warning', 'tip', 'note']).default('info')
```

Ao definir valores do frontmatter com union de tipos literais, ramificações como `if (callout.type === 'info')` no lado do template se tornam type-safe.

### Asserção as const

Ao adicionar `as const` a objetos constantes, as propriedades se tornam `readonly` e a inferência de tipos se torna literal. Sempre adicione à constante `SITE`.

### Migração de imports descontinuados

Altere `import { z } from 'astro:content'`, que será removido no Astro 7, para `import { z } from 'astro/zod'`.

---

## Gerenciamento centralizado de constantes

Valores hardcoded causam esquecimentos ao alterar. Os seguintes valores foram centralizados em `src/data/site.ts`.

| Constante | Nº de locais antes da centralização |
| --- | --- |
| AdSense Client ID | 4 arquivos |
| GA4 Measurement ID | 2 locais |
| IDs de slot de anúncio | 4 arquivos |
| URLs de redes sociais (X, GitHub, Discord, Aceserver) | 17 locais |
| Telefone, e-mail, LINE | 3 arquivos |

```typescript
export const SITE = {
  name: 'Acecore',
  url: 'https://acecore.net',
  ga4Id: 'G-XXXXXXXXXX',
  adsenseClientId: 'ca-pub-XXXXXXXXXXXXXXXX',
  social: {
    x: 'https://x.com/acecore',
    github: 'https://github.com/acecore-systems',
    discord: 'https://discord.gg/...',
  },
} as const
```

---

## Outras melhorias de UX

### Seguimento de scroll do sumário

Monitore os títulos do conteúdo com `IntersectionObserver` e destaque o título ativo no sumário da sidebar. O ponto-chave é também fazer scroll do próprio sumário com `scrollIntoView({ block: 'nearest', behavior: 'smooth' })`.

### Scroll spy

Em estruturas de página única como a página de serviços, faça o item ativo da navegação seguir automaticamente com `IntersectionObserver`.

### Paginação

Implemente divisão automática de página a cada 6 artigos, navegação com reticências (`1 2 ... 9 10`) e links de texto "← Anterior" "Próximo →". A lógica de paginação deve ser centralizada em `src/utils/pagination.ts`.

### Links âncora com cabeçalho sticky

Com cabeçalho sticky, o destino do link âncora fica escondido atrás do cabeçalho. Resolva configurando o seguinte no preflight do UnoCSS.

```css
[id] { scroll-margin-top: 5rem; }
html { scroll-behavior: smooth; }
```

---

## Conclusão

Se usar View Transitions, o mais importante é **unificar o padrão de inicialização dos scripts**. Entenda a diferença entre `astro:after-swap` / `astro:page-load` e teste todas as interações.

Em termos de qualidade de código, a segurança de tipos TypeScript e o gerenciamento centralizado de constantes contribuem enormemente para a manutenibilidade a longo prazo. Pode parecer trabalhoso no início, mas o benefício do autocompletar do IDE é sentido diariamente no desenvolvimento.

---

## Série que inclui este artigo

Este artigo faz parte da série "[Guia de melhoria de qualidade do site Astro](/blog/website-improvement-batches/)". Melhorias de performance, SEO e acessibilidade também são apresentadas em artigos individuais.
