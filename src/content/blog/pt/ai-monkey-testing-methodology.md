---
title: 'Metodologia prática de Monkey Testing em sites com GitHub Copilot × Playwright'
description: 'Registro prático de como testamos sistematicamente um site estático usando o modo agente do VS Code (GitHub Copilot) combinado com ferramentas de navegador Playwright. Compartilhamos desde o design dos testes até os bugs descobertos, correções aplicadas e propostas de melhorias.'
date: 2026-03-25
author: gui
tags: ['技術', 'GitHub Copilot', 'VS Code', 'Astro', 'Webサイト']
image: https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Público-alvo deste artigo
  text: 'Para quem se interessa por automação de testes com IA, quem deseja melhorar a garantia de qualidade de sites, e quem quer aproveitar o modo agente do GitHub Copilot.'
processFigure:
  title: Como conduzir o Monkey Testing com IA
  steps:
    - title: Inventário
      description: Leia todo o código-fonte e liste rotas, componentes e interações a serem testadas.
      icon: i-lucide-clipboard-list
    - title: Teste de varredura
      description: Envie requisições HTTP para todas as rotas e detecte códigos de status, imagens quebradas e links vazios.
      icon: i-lucide-globe
    - title: Verificação de interações
      description: Opere elementos que dependem de JS, como FAQ expansível, botão copiar, modal de busca e embed do YouTube.
      icon: i-lucide-mouse-pointer-click
    - title: Auditoria de estrutura e SEO
      description: Verifique dados estruturados, OGP, meta tags, hierarquia de títulos e acessibilidade em todas as páginas.
      icon: i-lucide-shield-check
compareTable:
  title: Comparação com testes manuais
  before:
    label: Teste manual tradicional
    items:
      - Verificação visual página por página no navegador
      - Criação e gerenciamento manual de checklists
      - Propenso a falhas de verificação
      - Demora para registrar passos de reprodução
  after:
    label: Monkey Testing com IA
    items:
      - Varredura automática de todas as rotas verificando status HTTP e estrutura DOM
      - IA extrai automaticamente os alvos de teste a partir do código-fonte
      - Detecção de imagens quebradas, links vazios e erros JS sem falhas
      - Descoberta → identificação da causa → correção → reverificação completados na mesma sessão
faq:
  title: Perguntas frequentes
  items:
    - question: O modo agente do GitHub Copilot é gratuito?
      answer: 'No plano gratuito do GitHub Copilot, o modo agente tem um limite mensal de uso. Nos planos Pro ou Business, o limite é mais flexível. A versão VS Code Insiders permite acesso antecipado aos recursos mais recentes.'
    - question: É possível fazer o mesmo com ferramentas de navegador além do Playwright?
      answer: 'Utilizamos a ferramenta de navegador integrada do VS Code (Simple Browser + integração Playwright). Como o Copilot opera o navegador diretamente através da ferramenta run_playwright_code, não é necessário instalar o Playwright separadamente.'
    - question: Pode ser aplicado a sites que não são estáticos?
      answer: 'Sim. A mesma abordagem é possível em sites SPA ou SSR. No entanto, para páginas que requerem autenticação de login, é necessário um mecanismo para gerenciar credenciais de teste com segurança.'
    - question: A IA também pode corrigir bugs encontrados nos testes?
      answer: 'No modo agente, é possível ler e escrever arquivos, então o fluxo completo de detecção, correção e verificação de build pode ser concluído dentro de uma sessão. Neste artigo, descobrimos 2 bugs e os corrigimos na hora.'
---

## Introdução

A garantia de qualidade de um site não é suficiente com uma única verificação antes do lançamento. Problemas inesperados podem surgir a qualquer momento: adição de conteúdo, atualização de bibliotecas, mudanças na configuração da CDN.

Neste artigo, resumimos o registro prático de como o **modo agente do VS Code (GitHub Copilot)** opera diretamente o navegador e executa monkey tests em todo o site. Sistematizamos a metodologia de teste executada de forma consistente pela IA, desde a análise estática do código-fonte até a verificação dinâmica no navegador.

---

## Ambiente de teste

| Item | Conteúdo |
|------|----------|
| Editor | VS Code + GitHub Copilot (modo agente) |
| Modelo IA | Claude Opus 4.6 |
| Operação do navegador | Ferramenta Playwright integrada ao VS Code |
| Alvo dos testes | Site estático com Astro + UnoCSS + Cloudflare Pages |
| Preview | `npm run preview` (local) + URL de produção |

No modo agente, o Copilot executa comandos no terminal, lê e escreve arquivos e opera o navegador de forma autônoma. O testador apenas instrui "por favor, teste" e a IA executa automaticamente todo o processo a seguir.

---

## Fase 1: Inventário dos alvos de teste

### Leitura completa do código-fonte

A IA primeiro percorre a estrutura de diretórios do projeto e lê o código-fonte de todos os componentes, páginas e utilitários.

```
src/
├── components/    ← leitura completa de 28 componentes
├── content/blog/  ← análise do frontmatter de 16 artigos
├── pages/         ← mapeamento de todos os arquivos de roteamento
├── layouts/       ← compreensão da estrutura do BaseLayout
└── utils/         ← verificação dos plugins rehype e geração de imagem OG
```

Nesta etapa, a IA compreende automaticamente:

- **Lista completa de rotas**: 7 páginas estáticas + rotas relacionadas ao blog (artigos, tags, arquivo, autores, paginação)
- **Elementos interativos**: modal de busca, FAQ expansível, botão copiar, façade do YouTube, scroll to top, slider hero
- **Integrações externas**: ssgform.com (formulário), Cloudflare Turnstile (proteção contra bots), Google AdSense, GA4

### Geração automática do plano de teste

A partir dos resultados da análise do código-fonte, a IA gera automaticamente o plano de testes como uma lista de tarefas. Não é necessário que humanos criem checklists.

---

## Fase 2: Teste de varredura de todas as rotas

### Verificação de status HTTP

O site buildado é iniciado com `npm run preview`, e o Playwright acessa todas as rotas.

```
Alvos de teste: 31 rotas
├── Páginas estáticas      7 (/, /about/, /services/ etc.)
├── Artigos do blog       16
├── Páginas de tags        24
├── Arquivo                4
├── Paginação              2 (/blog/page/2/, /blog/page/3/)
├── Páginas de autores     2
├── RSS                    1
└── Teste 404              1

Resultado: Todas as rotas 200 OK (exceto 404 intencional)
```

### Verificação da estrutura DOM

Em cada página, as seguintes verificações são executadas automaticamente:

| Item verificado | Método de verificação | Resultado |
|----------------|----------------------|-----------|
| Imagens quebradas | `img.complete && img.naturalWidth === 0` | 0 |
| Links vazios | `href` vazio, `#` ou não definido | 0 |
| Links externos inseguros | `target="_blank"` sem `rel="noopener"` | 0 |
| Quantidade de H1 | `document.querySelectorAll('h1').length === 1` | OK em todas |
| Link de skip | Existência de "Pular para o conteúdo" | OK em todas |
| Atributo lang | `html[lang="ja"]` | OK em todas |

### Verificação de links mortos

Links internos foram coletados recursivamente a partir da página inicial, e a acessibilidade de todos os 55 URLs únicos foi confirmada. Links mortos: **0**.

---

## Fase 3: Verificação de interações

A IA opera elementos do navegador diretamente com Playwright para verificar funcionalidades que dependem de JavaScript.

### FAQ (elemento `<details>`)

```javascript
// Exemplo de código de teste executado pela IA
const details = document.querySelectorAll('details');
// Estado inicial: todos fechados → OK
// Clique para abrir → OK
// Clique novamente para fechar → OK
```

### Modal de busca (Pagefind)

1. Abrir o diálogo de busca com `window.openSearch()`
2. Aguardar o carregamento completo da Pagefind UI
3. Digitar "Astro" e confirmar que os resultados de busca são exibidos
4. Confirmar que ESC fecha o modal

### Padrão façade do YouTube

1. Clicar no elemento `.yt-facade`
2. Confirmar que um iframe de `youtube-nocookie.com/embed/` é gerado dinamicamente
3. Confirmar que o parâmetro `autoplay=1` está presente

### Botão copiar (após View Transitions)

Após a navegação com View Transitions, confirmar que o botão de copiar do bloco de código é reinicializado e funciona. A re-registração no evento `astro:page-load` estava funcionando corretamente.

### Botão ScrollToTop

Scroll até o final da página → botão aparece → clique → confirmar que `window.scrollY` volta a 0.

---

## Fase 4: Auditoria de SEO e dados estruturados

### Meta tags OGP

Em todas as páginas, o seguinte foi verificado:

- `og:title` / `og:description` / `og:image` / `og:url` / `og:type` estão definidos
- `twitter:card` está definido como `summary_large_image`
- URL `canonical` está correto
- URL da imagem OG existe e tem o tamanho recomendado (1200×630)

### Dados estruturados (JSON-LD)

O JSON-LD de cada página foi analisado e o tipo e conteúdo do schema foram verificados.

| Tipo de página | Dados estruturados |
|---------------|-------------------|
| Comum em todas | Organization, WebSite |
| Artigo do blog | BreadcrumbList, BlogPosting, FAQPage |
| Artigo com FAQ | FAQPage (mainEntity contém perguntas e respostas) |

### Sitemap

Confirmado que `sitemap-index.xml` → `sitemap-0.xml` contém todas as 57 URLs registradas. A referência ao sitemap a partir do `robots.txt` também estava normal.

---

## Fase 5: Verificação de acessibilidade

Verificações equivalentes ao motor AXE foram executadas com Playwright em múltiplas páginas.

| Item verificado | Páginas testadas | Violações |
|----------------|-----------------|-----------|
| Atributo alt em img | 4 | 0 |
| Label em button | 4 | 0 |
| Hierarquia de títulos (h1→h2→h3) | 4 | 0 |
| Label em input de formulário | 1 (contato) | 0 |
| Elementos landmark | 4 | 0 |
| Atributo rel em links externos | 4 | 0 |
| Valores adequados de tabindex | 4 | 0 |

**Zero violações em todas as 4 páginas e todos os itens verificados.**

---

## Fase 6: Teste de transição com View Transitions

Nas transições de página com Astro View Transitions, como o DOM é atualizado por diferencial, a reinicialização do JavaScript é um desafio. Os seguintes padrões de transição foram verificados:

```
Home → Lista do blog → Artigo → Tag → Autor → Contato → Serviços → Home
```

Itens confirmados após cada transição:

- URL, título e H1 são atualizados corretamente
- Botão de busca funciona
- Botão copiar é reinicializado
- Breadcrumb é atualizado
- **Zero erros JS**

---

## Fase 7: Verificação de cabeçalhos de segurança

Resultado da verificação dos cabeçalhos de resposta do site em produção:

| Cabeçalho | Valor | Avaliação |
|----------|-------|-----------|
| Content-Security-Policy | Configuração completa | ◎ |
| X-Frame-Options | SAMEORIGIN | ◎ |
| X-Content-Type-Options | nosniff | ◎ |
| Strict-Transport-Security | max-age=15552000 | ○ |
| Referrer-Policy | strict-origin-when-cross-origin | ◎ |
| Permissions-Policy | geolocation=(), camera=() etc. | ◎ |

---

## Bugs descobertos e correções

Neste teste, 2 bugs foram descobertos e corrigidos dentro da mesma sessão.

### Bug 1: Falta de resiliência no modal de busca

**Sintoma**: Se o botão de busca for pressionado antes do carregamento completo do script Pagefind, a UI não responde.

**Causa**: Não havia mecanismo de retry após uma falha em `loadPagefindScript()`.

**Correção**: Implementado limpeza do cache do Promise em caso de falha e um UI de fallback exibindo botão de "recarregar" para o usuário.

### Bug 2: Origens Google faltando no cabeçalho CSP

**Sintoma**: Recursos relacionados ao Google AdSense são bloqueados pelo CSP, exibindo erros no console.

**Causa**: `connect-src` e `frame-src` não incluíam `https://www.google.com` / `https://www.google.co.jp`.

**Correção**: Adicionadas origens Google às diretivas CSP em `public/_headers`.

---

## Sistematização da metodologia de teste

Organizando essa metodologia de monkey testing com IA, podemos classificar nas seguintes camadas:

### Camada 1: Análise estática (leitura do código-fonte)

- Varredura da estrutura de diretórios
- Compreensão das dependências entre componentes
- Análise do schema do frontmatter (Zod)
- Verificação de configurações CSP e redirecionamento

### Camada 2: Teste na camada HTTP (varredura de todas as rotas)

- Verificação de código de status (200/404/301)
- Auditoria de cabeçalhos de resposta (segurança e cache)
- Consistência do sitemap, robots.txt e ads.txt

### Camada 3: Teste na camada DOM (verificação de estrutura)

- Imagens quebradas, links vazios, links externos inseguros
- Unicidade do H1 e hierarquia de títulos
- Meta tags (OGP, canonical, description)
- Dados estruturados (JSON-LD)

### Camada 4: Teste na camada de interação (verificação de comportamento)

- Clique, entrada, operação por teclado
- Abertura/fechamento de modal, validação de formulário
- Reinicialização de JS após View Transitions
- Eventos de scroll e carregamento lazy

### Camada 5: Teste na camada de acessibilidade

- Atributos alt, labels, ARIA
- Hierarquia de títulos e landmarks
- Gerenciamento de foco e tabindex
- Links de skip

---

## Limitações e restrições

O monkey testing com IA possui algumas restrições.

| Restrição | Detalhes |
|-----------|----------|
| Emulação de viewport | No navegador integrado do VS Code, a emulação de largura mobile não funciona. A validade do CSS foi substituída por análise estática da saída do build |
| Estado da rede | Simulação offline ou de conexão lenta não é possível. Testes de Service Worker também ficam fora do escopo |
| "Sensibilidade" do usuário | Beleza do design, legibilidade e consistência com a marca requerem julgamento humano |
| Fluxo de autenticação | Páginas que requerem login necessitam de gerenciamento seguro de credenciais separadamente |

A responsividade CSS foi verificada de forma alternativa, analisando diretamente o arquivo CSS da saída do build e confirmando que as media queries `@media(min-width:768px)` foram geradas corretamente.

---

## Conclusão

O modo agente do GitHub Copilot consegue completar todo o ciclo de QA a partir de uma única frase "por favor, teste": análise do código-fonte → planejamento de testes → operação automática do navegador → correção de bugs → reverificação.

Resumo dos resultados desta vez:

- **Alvos testados**: 31 rotas + 24 tags + 4 arquivo + 2 paginação = 61 rotas
- **Itens testados**: Status HTTP, estrutura DOM, interações, SEO, acessibilidade, segurança, View Transitions
- **Bugs encontrados**: 2 (modal de busca, cabeçalho CSP) → corrigidos na hora
- **Violações de acessibilidade**: 0
- **Links mortos**: 0

Combinando verificação visual humana com verificação automática por IA, é possível alcançar tanto abrangência quanto eficiência nos testes.
