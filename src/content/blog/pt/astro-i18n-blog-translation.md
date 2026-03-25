---
title: "Como fazer um site Astro 6 suportar 9 idiomas ― Tradução automática de 136 artigos e arquitetura multilíngue"
description: "Registro da internacionalização de um site Astro 6 + UnoCSS + Cloudflare Pages para 9 idiomas. Cobre todo o processo desde a internacionalização da UI até a tradução de 136 artigos e configuração multilíngue do Pages CMS."
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'i18n', 'Webサイト']
image: https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=400&fit=crop&q=80
processFigure:
  title: Fluxo de trabalho multilíngue
  steps:
    - title: Base i18n
      description: Configurar o roteamento i18n nativo do Astro e utilitários de tradução.
      icon: i-lucide-globe
    - title: Tradução de textos da UI
      description: Traduzir textos do cabeçalho, rodapé e todos os componentes.
      icon: i-lucide-languages
    - title: Tradução de artigos
      description: Gerar 136 arquivos de tradução (17 artigos × 8 idiomas).
      icon: i-lucide-file-text
    - title: CMS e verificação de build
      description: Configuração multilíngue do Pages CMS e verificação da geração de todas as páginas.
      icon: i-lucide-check-circle
compareTable:
  title: Comparação antes e depois
  before:
    label: Apenas japonês
    items:
      - Apenas 1 idioma (japonês)
      - 17 artigos de blog
      - 523 páginas geradas (após suporte multilíngue da UI)
      - Pages CMS com 1 coleção de blog
      - Tags e dados de autor apenas em japonês
      - Apenas 1 feed RSS
  after:
    label: 9 idiomas
    items:
      - Japonês + 8 idiomas (en, zh-cn, es, pt, fr, ko, de, ru)
      - 17 artigos + 136 traduções = 153 no total
      - 541 páginas geradas (artigos traduzidos com fallback)
      - Pages CMS com 9 coleções por idioma
      - 25 tags e dados de autor traduzidos por idioma
      - Feeds RSS multilíngues (9 idiomas)
callout:
  type: info
  title: Idiomas suportados
  text: "Suporta 9 idiomas: japonês (padrão), inglês, chinês simplificado, espanhol, português, francês, coreano, alemão e russo."
statBar:
  items:
    - value: '9'
      label: Idiomas suportados
    - value: '136'
      label: Artigos traduzidos
    - value: '541'
      label: Páginas geradas
faq:
  title: Perguntas frequentes
  items:
    - question: Por que foram escolhidos 9 idiomas?
      answer: "Para maximizar o alcance global, cobrimos os principais mercados linguísticos. Inglês, chinês, espanhol e português cobrem a maioria dos usuários da internet, enquanto francês, alemão, russo e coreano complementam os mercados principais restantes."
    - question: Como a qualidade da tradução é garantida?
      answer: "Usamos tradução por IA com GitHub Copilot. Primeiro é criada a versão em inglês como idioma intermediário, depois traduzida do inglês para cada idioma alvo para reduzir a variação de qualidade. Os valores de tags no frontmatter são mantidos em japonês, e URLs, blocos de código e caminhos de imagens permanecem inalterados."
    - question: O que acontece quando um artigo traduzido não existe?
      answer: "O recurso de fallback exibe o artigo original em japonês quando não existe tradução. As traduções podem ser adicionadas incrementalmente."
    - question: É necessário traduzir ao adicionar um novo artigo?
      answer: "Não é obrigatório — se não houver arquivo de tradução, a versão japonesa é exibida como fallback. Para adicionar uma tradução, basta colocar um arquivo Markdown com o mesmo nome no diretório do idioma correspondente."
---

Atualizamos o site oficial da Acecore de apenas japonês para suporte a 9 idiomas. Este artigo cobre todo o processo: internacionalização da UI, tradução de 17 artigos × 8 idiomas = 136 arquivos, e configuração multilíngue do Pages CMS.

## Estratégia multilíngue

### Definição do escopo

Abordamos o suporte multilíngue em três fases:

1. **Base i18n**: Configuração de roteamento i18n nativo do Astro, utilitários de tradução e arquivos JSON de tradução para 9 idiomas
2. **Tradução de textos da UI**: Textos de componentes no cabeçalho, rodapé, barra lateral e todas as páginas
3. **Tradução de artigos**: Todos os 17 artigos traduzidos para 8 idiomas (136 arquivos gerados)

### Design de URLs

Adotamos o `prefixDefaultLocale: false` do Astro, servindo japonês na raiz (`/blog/...`) e outros idiomas com prefixos (`/en/blog/...`, `/zh-cn/blog/...`, etc.).

```
# Japonês (padrão)
/blog/astro-performance-tuning/

# Inglês
/en/blog/astro-performance-tuning/

# Chinês simplificado
/zh-cn/blog/astro-performance-tuning/
```

Usar o mesmo slug em todos os idiomas mantém simples o mapeamento de URLs ao trocar de idioma.

## Implementação da base i18n

### Configuração i18n do Astro

Configura-se o roteamento i18n no `astro.config.mjs`.

```javascript
// astro.config.mjs
export default defineConfig({
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
})
```

### Utilitários de tradução

Arquivos de configuração, funções utilitárias e arquivos JSON de tradução são consolidados em `src/i18n/`.

```typescript
// src/i18n/utils.ts
export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key]
    ?? translations[defaultLocale][key]
    ?? key
}
```

Os arquivos de tradução estão em formato JSON sob `src/i18n/locales/`, gerenciando aproximadamente 100 chaves para navegação, rodapé, UI do blog e metadados.

### Padrão View Component

A implementação de páginas usa o **Padrão View Component**. Layout e lógica são centralizados em `src/views/`, enquanto os arquivos de rota (`src/pages/`) são wrappers leves que simplesmente passam o locale.

```astro
---
// src/pages/[locale]/about.astro (arquivo de rota)
import AboutPage from '../../views/AboutPage.astro'
const { locale } = Astro.params
---
<AboutPage locale={locale} />
```

Este design elimina a duplicação de lógica entre a rota japonesa (`/about`) e as rotas multilíngues (`/en/about`).

## Suporte multilíngue do conteúdo do blog

### Estrutura de diretórios

Os artigos traduzidos são colocados em subdiretórios com código de idioma. O loader glob do Astro os detecta automaticamente de forma recursiva com o padrão `**/*.md`.

```
src/content/blog/
  astro-performance-tuning.md          # Japonês (base)
  website-renewal.md
  en/
    astro-performance-tuning.md        # Versão em inglês
    website-renewal.md
  zh-cn/
    astro-performance-tuning.md        # Versão em chinês simplificado
    website-renewal.md
  es/
    ...
```

### Utilitários de resolução de conteúdo

Três funções foram implementadas em `src/utils/blog-i18n.ts`.

```typescript
// Determinar se é um artigo base (sem barra no ID = base)
export function isBasePost(post: CollectionEntry<'blog'>): boolean {
  return !post.id.includes('/')
}

// Remover prefixo de locale do ID para obter o slug base
export function getBaseSlug(postId: string): string {
  const idx = postId.indexOf('/')
  return idx !== -1 ? postId.slice(idx + 1) : postId
}

// Obter a versão localizada de um artigo base (fallback para o original)
export function localizePost(
  post: CollectionEntry<'blog'>,
  allPosts: CollectionEntry<'blog'>[],
  locale: Locale,
): CollectionEntry<'blog'> {
  if (locale === defaultLocale) return post
  return allPosts.find((p) => p.id === `${locale}/${post.id}`) ?? post
}
```

O ponto chave é **não modificar o schema existente da coleção de conteúdo**. O loader glob do Astro reconhece automaticamente os arquivos em subdiretórios com IDs como `en/astro-performance-tuning`, sem necessidade de alterações de configuração.

### Regras dos arquivos de tradução

Os arquivos de tradução foram gerados seguindo estas regras:

- As **chaves do frontmatter** permanecem em inglês (`title`, `description`, `date`, etc.)
- Os **valores de tags** são mantidos em japonês (`['技術', 'Astro']`, etc.)
- **URLs, caminhos de imagens, blocos de código e HTML** não são modificados
- **Data e autor** permanecem inalterados
- **Texto do corpo e valores de texto do frontmatter** (title, description, callout, FAQ, etc.) são traduzidos

### Fluxo de trabalho de tradução

O processo de tradução segue estes passos:

1. **Criar inglês como idioma intermediário**: Traduzir do japonês original para o inglês
2. **Traduzir do inglês para cada idioma**: Expandir do inglês para 7 idiomas
3. **Processamento em lote**: Processar 5-6 artigos por vez com GitHub Copilot

A tradução em duas etapas (japonês → inglês → idiomas alvo) reduz a variação de qualidade. Passar pelo inglês como idioma intermediário produz qualidade mais estável do que traduzir diretamente do japonês para cada idioma.

## View Components multilíngues

### Implementação do BlogPostPage

A página de artigos do blog obtém a versão locale do conteúdo usando `localizePost()` e a atribui a uma variável de template.

```astro
---
// src/views/BlogPostPage.astro
const localizedPost = localizePost(basePost, allPosts, locale)
const post = localizedPost // referências existentes do template funcionam como estão
---
```

Esta abordagem permite o suporte multilíngue sem alterar nenhuma referência a `post.data.title` ou `post.body` no template.

### Implementação de páginas de lista

Listas do blog, listas de tags, listas de autores e páginas de arquivo filtram apenas artigos base com `isBasePost()`, e depois substituem com versões traduzidas usando `localizePost()` no momento da exibição.

```astro
---
const allPosts = await getCollection('blog')
const basePosts = allPosts.filter(isBasePost)
const displayPosts = basePosts.map(p => localizePost(p, allPosts, locale))
---
```

## Considerações de build

### Escape no frontmatter YAML

As traduções para francês causaram problemas onde os apóstrofos (`l'atelier`, `qu'on`, etc.) conflitavam com as aspas simples do YAML.

```yaml
# NG: Erro de análise YAML
title: 'Le métavers est plus proche qu'on ne le pense'

# OK: Mudar para aspas duplas
title: "Le métavers est plus proche qu'on ne le pense"
```

Um script Node.js foi usado para corrigir todos os arquivos em lote. Texto em inglês como `Acecore's` tem o mesmo problema, então o tipo de aspas deve ser considerado ao gerar arquivos de tradução.

### Filtragem de rotas de imagens OG

`/blog/og/[slug].png.ts` também capturava slugs de artigos traduzidos (`en/aceserver-hijacked`, etc.), causando erros de parâmetros. Foi resolvido filtrando com `isBasePost()`.

```typescript
export const getStaticPaths: GetStaticPaths = async () => {
  const allPosts = await getCollection('blog')
  const posts = allPosts.filter(isBasePost)
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title },
  }))
}
```

## Suporte multilíngue do Pages CMS

O Pages CMS (`.pages.yml`) só aponta para arquivos diretamente sob o diretório `path` especificado, então os subdiretórios de tradução foram registrados como coleções individuais.

```yaml
content:
  - name: blog
    label: ブログ（日本語）
    path: src/content/blog
  - name: blog-en
    label: Blog（English）
    path: src/content/blog/en
  - name: blog-zh-cn
    label: 博客（简体中文）
    path: src/content/blog/zh-cn
  # ... configurado para cada idioma
```

As labels são escritas em cada idioma para que seja imediatamente claro qual coleção corresponde a qual idioma no CMS.

## UI de troca de idioma

Um componente `LanguageSwitcher` foi adicionado ao cabeçalho, fornecendo uma UI de troca de idioma para desktop e mobile. Ao trocar de idioma, os usuários navegam para o locale correspondente da mesma página. Na primeira visita, o `navigator.language` do navegador é detectado para redirecionamento automático.

## Exibição multilíngue de tags

As tags dos artigos mantêm seus slugs em japonês nas URLs enquanto **apenas o nome visível é traduzido**. Isso evita a complexidade de roteamento enquanto mostra as tags no idioma nativo do usuário.

```typescript
// src/i18n/utils.ts
export function translateTag(tag: string, locale: Locale): string {
  return t(locale, `tags.${tag}`) !== `tags.${tag}`
    ? t(locale, `tags.${tag}`)
    : tag
}
```

Uma seção `tags` foi adicionada a cada JSON de tradução, definindo traduções para todos os 25 tipos de tags.

```json
// en.json (trecho)
{
  "tags": {
    "技術": "Technology",
    "セキュリティ": "Security",
    "パフォーマンス": "Performance",
    "アクセシビリティ": "Accessibility"
  }
}
```

`translateTag()` é usado em 6 locais — cards de artigos, barra lateral, índice de tags e detalhe do artigo — garantindo que todas as tags sejam exibidas de forma unificada no idioma apropriado.

## Dados de autor multilíngues

As biografias e listas de habilidades dos autores também mudam conforme o idioma. Um campo `i18n` foi adicionado ao `src/data/authors.json` para armazenar as traduções de cada idioma.

```json
{
  "id": "hatt",
  "name": "hatt",
  "bio": "代表取締役。Web制作・システム開発…",
  "skills": ["TypeScript", "Astro", "..."]
  "i18n": {
    "en": {
      "bio": "CEO and representative director. Web development...",
      "skills": ["TypeScript", "Astro", "..."]
    }
  }
}
```

O utilitário `getLocalizedAuthor()` obtém as informações do autor apropriadas para o locale.

```typescript
// src/utils/blog-i18n.ts
export function getLocalizedAuthor(author: Author, locale: Locale) {
  const localized = author.i18n?.[locale]
  return localized ? { ...author, ...localized } : author
}
```

## SEO para site multilíngue

Para maximizar os benefícios de SEO do suporte multilíngue, implementamos mecanismos para que os motores de busca identifiquem e indexem corretamente cada versão de idioma.

### Suporte hreflang no sitemap

A opção `i18n` do `@astrojs/sitemap` foi configurada para gerar automaticamente tags `xhtml:link rel="alternate"` no sitemap.

```javascript
// astro.config.mjs
sitemap({
  i18n: {
    defaultLocale: 'ja',
    locales: {
      ja: 'ja',
      en: 'en',
      'zh-cn': 'zh-CN',
      es: 'es',
      pt: 'pt',
      fr: 'fr',
      ko: 'ko',
      de: 'de',
      ru: 'ru',
    },
  },
})
```

Isso gera links hreflang para todos os 9 idiomas em cada URL, permitindo que o Google compreenda com precisão a correspondência entre versões de idioma.

### Suporte de idioma em dados estruturados JSON-LD

O campo `inLanguage` foi adicionado aos dados estruturados `BlogPosting` dos artigos, informando aos motores de busca em qual idioma cada artigo está escrito.

```javascript
// BlogPostPage.astro (trecho JSON-LD)
{
  "@type": "BlogPosting",
  "inLanguage": htmlLangMap[locale],  // "ja", "en", "zh-CN", etc.
  "headline": post.data.title,
  // ...
}
```

### Feeds RSS multilíngues

Além do `/rss.xml` em japonês, feeds RSS são gerados para cada versão de idioma (`/en/rss.xml`, `/zh-cn/rss.xml`, etc.). Os títulos e descrições dos feeds são traduzidos por idioma, e a tag `<language>` gera códigos de idioma compatíveis com BCP47.

```typescript
// src/pages/[locale]/rss.xml.ts
export const getStaticPaths = () =>
  locales.filter((l) => l !== defaultLocale).map((l) => ({ params: { locale: l } }))
```

O `<link rel="alternate" type="application/rss+xml">` no `BaseLayout.astro` também configura automaticamente a URL RSS apropriada para o locale.

## Resumo

Aproveitando as funcionalidades i18n nativas do Astro 6, alcançamos suporte multilíngue de alta qualidade mesmo em um site estático.

- **Base i18n**: Sem prefixo para japonês com `prefixDefaultLocale: false` do Astro
- **Tradução da UI**: Zero duplicação de lógica com o Padrão View Component
- **Tradução de conteúdo**: Abordagem de subdiretórios sem alterações de schema
- **Tradução de tags**: Slugs em japonês nas URLs, nomes visíveis traduzidos por idioma
- **Tradução de dados de autor**: Bio e habilidades mudam conforme o idioma
- **SEO**: Hreflang no sitemap, `inLanguage` no JSON-LD, feeds RSS multilíngues
- **Fallback**: Artigos sem tradução exibem automaticamente a versão japonesa
- **Suporte CMS**: Os artigos de cada idioma são editáveis individualmente no Pages CMS

Futuramente, os arquivos de tradução serão adicionados incrementalmente conforme novos artigos forem publicados. Graças ao recurso de fallback, a versão japonesa é exibida até que as traduções estejam completas, mantendo a qualidade do site.
