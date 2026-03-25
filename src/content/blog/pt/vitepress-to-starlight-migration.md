---
title: 'De VitePress para Starlight — Unificação do framework do site de documentação'
description: 'Registro da migração de um documento de plano de negócios construído com VitePress + UnoCSS para Astro + Starlight, unificando o framework em dois projetos. Também apresentamos a migração da Mermaid para CDN.'
date: 2026-03-15
author: gui
tags: ['技術', 'Astro', 'Starlight']
image: https://images.unsplash.com/photo-1456406644174-8ddd4cd52a06?w=800&h=400&fit=crop&q=80
processFigure:
  title: Fluxo da migração
  steps:
    - title: Análise da situação atual
      description: Levantamento da configuração VitePress + UnoCSS.
      icon: i-lucide-search
    - title: Introdução do Starlight
      description: Reestruturação do projeto com Astro + Starlight.
      icon: i-lucide-star
    - title: Migração do conteúdo
      description: Ajuste da disposição dos arquivos Markdown e frontmatter.
      icon: i-lucide-file-text
    - title: Migração da Mermaid para CDN
      description: Eliminação da dependência de plugins e renderização de diagramas via CDN.
      icon: i-lucide-git-branch
compareTable:
  title: Comparação antes e depois da migração
  before:
    label: VitePress + UnoCSS
    items:
      - SSG baseado em Vue
      - Estilização com UnoCSS
      - Mermaid funciona via plugin
      - Stack tecnológica diferente do projeto Astro
  after:
    label: Astro + Starlight
    items:
      - SSG baseado em Astro
      - Estilização integrada do Starlight
      - Mermaid funciona via CDN
      - Framework unificado com o site principal
faq:
  title: Perguntas frequentes
  items:
    - question: Quais são os benefícios de migrar do VitePress para o Starlight?
      answer: Quando o site principal usa Astro, unificar o framework reduz o custo de aprendizado, melhora a gestão de dependências e a consistência das configurações. O pipeline de build também pode ser unificado.
    - question: Como os diagramas Mermaid são exibidos?
      answer: Abandonamos a dependência de plugins e mudamos para carregar a Mermaid via CDN (jsdelivr). As dependências de build ficam zeradas e a renderização dos diagramas fica estável.
    - question: Quanto trabalho é necessário para a migração?
      answer: O trabalho principal é a conversão da estrutura de diretórios (docs/ → src/content/docs/) e ajuste do frontmatter. Como o conteúdo é Markdown, pode ser usado como está, então a migração é concluída em relativamente pouco tempo.
---

Resumimos o procedimento para migrar um site de documentação criado com VitePress para Astro + Starlight. Quando o site principal roda em Astro, unificar a documentação no Starlight simplifica a operação. Também apresentamos a migração dos diagramas Mermaid para CDN.

## Por que unificar o framework

Quando o site principal e o site de documentação usam frameworks diferentes, surgem os seguintes problemas:

- **Duplicação do custo de aprendizado**: É necessário conhecer as especificações tanto do VitePress quanto do Astro
- **Dispersão de dependências**: Gerenciamento de atualizações de pacotes npm em dois sistemas
- **Consistência de configuração**: Manutenção individual de ESLint, Prettier, configurações de deploy etc.

Ao unificar com Astro + Starlight, é possível compartilhar padrões de arquivos de configuração e conhecimentos de troubleshooting.

## Procedimento de migração do VitePress para o Starlight

### 1. Conversão da estrutura do projeto

VitePress coloca os documentos no diretório `docs/`, enquanto Starlight usa `src/content/docs/`.

```
# Antes (VitePress)
docs/
  pages/
    index.md
    business-overview.md
    market-analysis.md

# Depois (Starlight)
src/
  content/
    docs/
      index.md
      business-overview.md
      market-analysis.md
```

### 2. Ajuste do frontmatter

O formato do frontmatter difere ligeiramente entre VitePress e Starlight. A configuração de `sidebar` do VitePress foi migrada para o campo `sidebar` do frontmatter.

```yaml
# Frontmatter do Starlight
---
title: Visão geral do negócio
sidebar:
  order: 1
---
```

### 3. Configuração do astro.config.mjs

```javascript
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

export default defineConfig({
  integrations: [
    starlight({
      title: 'Plano de Negócios Acecore',
      defaultLocale: 'ja',
      sidebar: [
        {
          label: 'Plano de Negócios',
          autogenerate: { directory: '/' },
        },
      ],
    }),
  ],
})
```

### 4. Remoção do UnoCSS

No ambiente VitePress, estilos personalizados eram aplicados com UnoCSS, mas o Starlight possui estilos padrão suficientes embutidos. Removemos `uno.config.ts` e pacotes relacionados, reduzindo as dependências.

## Migração da Mermaid para CDN

Os documentos do plano de negócios descrevem fluxogramas e organogramas em Mermaid. No VitePress, a Mermaid era integrada via plugin (`vitepress-plugin-mermaid`), mas não existe plugin equivalente para o Starlight.

Assim, mudamos para carregar a Mermaid via CDN no lado do navegador.

### Implementação

Adicionamos o script CDN da Mermaid ao cabeçalho personalizado do Starlight.

```javascript
// astro.config.mjs
starlight({
  head: [
    {
      tag: 'script',
      attrs: { type: 'module' },
      content: `
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs'
        mermaid.initialize({ startOnLoad: true })
      `,
    },
  ],
})
```

No Markdown, a notação padrão da Mermaid funciona normalmente:

````markdown
```mermaid
graph TD
    A[Plano de Negócios] --> B[Análise de Mercado]
    A --> C[Estratégia de Vendas]
    A --> D[Plano Financeiro]
```
````

### Benefícios da abordagem CDN

- **Zero dependências de build**: Mermaid como pacote npm não é necessário
- **Sempre na versão mais recente**: Obtém a versão mais recente via CDN
- **SSR desnecessário**: Renderização no navegador, sem impacto no tempo de build

## Resultado da migração

| Item | Antes | Depois |
| --- | --- | --- |
| Framework | VitePress 1.x | Astro 6 + Starlight |
| CSS | UnoCSS | Estilização integrada do Starlight |
| Mermaid | vitepress-plugin-mermaid | CDN (jsdelivr) |
| Saída do build | `docs/.vitepress/dist` | `dist` |
| Hospedagem | Cloudflare Pages | Cloudflare Pages (sem alteração) |

Com a unificação do framework, é possível compartilhar padrões de configuração do `astro.config.mjs` e configurações de deploy entre múltiplos projetos.

## Conclusão

A unificação de frameworks pode não ser "urgente", mas quanto mais longa a operação, maior o benefício. A migração do VitePress para o Starlight pode ser concluída em poucas horas, e a migração da Mermaid para CDN é até um benefício — a liberação da gestão de plugins. Se você opera múltiplos projetos, considere unificar a stack tecnológica.
