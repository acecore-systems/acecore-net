---
title: 'Guia de melhoria de SEO: Implementando dados estruturados e OGP em site Astro'
description: 'Compilamos os procedimentos para implementar corretamente dados estruturados JSON-LD, OGP, sitemap e RSS em um site Astro + Cloudflare Pages. Desde suporte a Rich Results do Google até otimização de feed RSS, apresentamos melhorias práticas de SEO.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'SEO']
image: https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Público-alvo deste artigo
  text: 'Para quem deseja melhorar o SEO de um site Astro de forma sistemática. Apresentamos procedimentos práticos e aplicáveis sobre tipos de dados estruturados e padrões de implementação, configuração de OGP e otimização de sitemap.'
processFigure:
  title: Fluxo de melhoria de SEO
  steps:
    - title: Meta tags
      description: Configurar title, description, canonical e OGP em todas as páginas.
      icon: i-lucide-file-text
    - title: Dados estruturados
      description: Comunicar o significado das páginas ao Google com JSON-LD.
      icon: i-lucide-braces
    - title: Sitemap
      description: Configurar prioridade e frequência de atualização por tipo de página.
      icon: i-lucide-map
    - title: RSS
      description: Distribuir feeds de alta qualidade com informações de autor e categoria.
      icon: i-lucide-rss
insightGrid:
  title: Dados estruturados implementados
  items:
    - title: Organization
      description: Exibir nome da empresa, URL, logo e contato nos resultados de busca.
      icon: i-lucide-building
    - title: BlogPosting
      description: Suporte a Rich Results de artigos com autor, data de publicação, data de atualização e imagem.
      icon: i-lucide-pen-line
    - title: BreadcrumbList
      description: Gerar a estrutura hierárquica de todas as páginas como breadcrumb.
      icon: i-lucide-chevrons-right
    - title: FAQPage
      description: Habilitar Rich Results de perguntas frequentes em artigos com FAQ.
      icon: i-lucide-help-circle
    - title: WebPage / ContactPage
      description: Atribuir tipos dedicados à página inicial e à página de contato.
      icon: i-lucide-layout
    - title: SearchAction
      description: Possibilitar busca interna do site diretamente dos resultados do Google.
      icon: i-lucide-search
faq:
  title: Perguntas frequentes
  items:
    - question: Adicionar dados estruturados muda os resultados de busca imediatamente?
      answer: 'Não. Leva de alguns dias a algumas semanas para o Google rastrear e reindexar. Você pode verificar o status de reflexão no relatório "Rich Results" do Google Search Console.'
    - question: Qual o tamanho ideal para a imagem OGP?
      answer: '1200×630px é o recomendado. Ao exibir como summary_large_image no X (Twitter), essa proporção é ideal.'
    - question: A priority do sitemap afeta o SEO?
      answer: 'O Google declarou oficialmente que ignora a priority, mas outros mecanismos de busca podem usá-la como referência. Não há desvantagem em configurá-la.'
---

## Introdução

Quando se fala em SEO, pode vir à mente a ideia de "encher de palavras-chave", mas o SEO moderno tem como essência **comunicar com precisão a estrutura e o conteúdo do site aos mecanismos de busca**.

Neste artigo, explicamos as medidas de SEO que devem ser implementadas em um site Astro, divididas em 4 categorias. Todas são medidas que, uma vez configuradas, produzem efeitos contínuos.

---

## Configuração de OGP e meta tags

OGP e meta tags são responsáveis pela aparência quando compartilhado em redes sociais e pela transmissão de informações aos mecanismos de busca.

### Meta tags básicas

No componente de layout do Astro, gere o seguinte para cada página:

- `og:title` / `og:description` / `og:image` — Título, descrição e imagem ao compartilhar em redes sociais
- `twitter:card` = `summary_large_image` — Exibir card com imagem grande no X (Twitter)
- `rel="canonical"` — Especificar URL canônica de páginas duplicadas
- `rel="prev"` / `rel="next"` — Explicitar relação anterior/posterior da paginação

### Meta tags para artigos de blog

Páginas de artigos devem ter as seguintes configurações adicionais:

- `article:published_time` / `article:modified_time` — Data de publicação e atualização
- `article:tag` — Informação de tags do artigo
- `article:section` — Categoria do conteúdo

### Pontos de implementação

Ao configurar o componente de layout para receber `title` / `description` / `image` como props e passar de cada página, é possível gerar meta tags consistentes em todas as páginas. O `og:title` da página inicial deve ser um título concreto que inclua o nome do site e o slogan, não simplesmente "Home".

---

## Implementação de dados estruturados (JSON-LD)

Dados estruturados são um mecanismo para que mecanismos de busca compreendam mecanicamente o conteúdo das páginas. Quando implementados corretamente, há possibilidade de Rich Results (FAQ, breadcrumb, informações do autor, etc.) serem exibidos nos resultados de busca.

### Organization

Comunique informações da empresa ao Google. Há possibilidade de ser exibido no Knowledge Panel.

```json
{
  "@type": "Organization",
  "name": "Acecore",
  "url": "https://acecore.net",
  "logo": "https://acecore.net/logo.png",
  "contactPoint": { "@type": "ContactPoint", "telephone": "..." }
}
```

Na página sobre a empresa, também é possível adicionar o campo `knowsAbout` para explicitar as áreas de negócio.

### BlogPosting

Configure `BlogPosting` para artigos de blog. Ao incluir autor, data de publicação, data de atualização e imagem de destaque, é possível obter exibição com informações do autor no Google Discover e nos resultados de busca.

### BreadcrumbList

Os dados estruturados do breadcrumb devem ser configurados em todas as páginas. Como ponto de atenção na implementação, confirme se caminhos intermediários (como `/blog/tags/`, uma página de lista) realmente existem, e não gere a propriedade `item` para caminhos inexistentes.

### FAQPage

Para artigos com FAQ, gere dados estruturados `FAQPage`. No Astro, é conveniente definir o campo `faq` no frontmatter e detectar/gerar no lado do template.

### WebSite + SearchAction

Se houver busca interna no site, configurar `SearchAction` pode fazer com que uma caixa de busca do site apareça nos resultados do Google. Combine com mecanismos de busca como Pagefind e configure para que a busca modal seja acionada automaticamente com o parâmetro `?q=`, melhorando também a experiência do usuário.

---

## Otimização do sitemap

Usando o plugin `@astrojs/sitemap` do Astro, o sitemap é gerado automaticamente, mas as configurações padrão não são suficientes.

### Configuração por tipo de página

Use a função `serialize()` para definir `changefreq` e `priority` conforme o padrão de URL das páginas.

| Tipo de página | changefreq | priority |
| --- | --- | --- |
| Página inicial | daily | 1.0 |
| Artigos do blog | weekly | 0.8 |
| Outros | monthly | 0.6 |

### Configuração de lastmod

Configure `lastmod` com a data/hora do build para comunicar aos mecanismos de busca a frescura do conteúdo. Se houver um campo `lastUpdated` no frontmatter do artigo, priorize-o.

---

## Expansão do feed RSS

RSS tende a ser algo que "configura e esquece", mas aumentar a qualidade do feed melhora a exibição em leitores RSS e a experiência do assinante.

### Informações a adicionar

- **author**: Incluir nome do autor por artigo
- **categories**: Adicionar informações de tags como categorias para melhorar a classificação em leitores RSS

```typescript
items: posts.map(post => ({
  title: post.data.title,
  description: post.data.description,
  link: `/blog/${post.id}/`,
  pubDate: post.data.date,
  author: post.data.author,
  categories: post.data.tags,
}))
```

---

## Checklist de melhoria de SEO

Por fim, compilamos os pontos a verificar para melhoria de SEO de um site Astro.

1. **Todas as páginas têm URL canonical configurada?**
2. **A imagem OGP é única para cada página?**
3. **Validação dos dados estruturados**: Verifique com [Teste de Rich Results do Google](https://search.google.com/test/rich-results)
4. **Os caminhos intermediários do breadcrumb são URLs que realmente existem?**
5. **O sitemap não inclui páginas desnecessárias (como 404)?**
6. **O feed RSS inclui autor e categorias?**
7. **O robots.txt está excluindo do crawl o índice de busca (`/pagefind/` etc.)?**

Uma vez que todas essas configurações estejam feitas, a base do SEO está pronta. A partir daí, a posição nos resultados de busca é determinada pela qualidade e frequência de atualização do conteúdo.

---

## Série que inclui este artigo

Este artigo faz parte da série "[Guia de melhoria de qualidade do site Astro](/blog/website-improvement-batches/)". Melhorias de performance, acessibilidade e UX também são apresentadas em artigos individuais.
