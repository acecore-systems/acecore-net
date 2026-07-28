---
title: 'Técnicas práticas para melhorar o PageSpeed em sites Astro'
description: 'Técnicas práticas de otimização para um site com Astro, UnoCSS e Cloudflare Pages. Abrange entrega de CSS, fontes, imagens responsivas, controle de carga do AdSense, carregamento diferido do GA4 e cache.'
date: 2026-03-15T00:00
lastUpdated: '2026-07-29T00:28:23+09:00'
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: /uploads/acecore-generated/blog-astro-performance-tuning.webp
callout:
  type: tip
  title: Público-alvo deste artigo
  text: 'Para quem deseja melhorar a pontuação do PageSpeed de um site Astro. Apresentamos técnicas concretas e aplicáveis sobre otimização de CSS, fontes, imagens e scripts de anúncios.'
processFigure:
  title: Fluxo de otimização
  steps:
    - title: Estratégia de entrega CSS
      description: Entender o trade-off entre inline e arquivo externo.
      icon: i-lucide-file-code
    - title: Otimização de fontes
      description: Verificar quais fontes são carregadas e usadas na renderização.
      icon: i-lucide-type
    - title: Otimização de imagens
      description: Otimizar imagens externas com Cloudflare Images + srcset + sizes.
      icon: i-lucide-image
    - title: Controle de carregamento
      description: Verificar tentativa inicial e novas tentativas do AdSense e o carregamento diferido do GA4.
      icon: i-lucide-timer
compareTable:
  title: Comparação antes e depois da otimização
  before:
    label: Antes da otimização
    items:
      - Conexões de fontes e resultado renderizado sem verificação
      - Saída CSS e cache sem verificação
      - Imagens entregues em tamanho fixo
      - Script do AdSense carregado imediatamente
      - Acompanhar pontuações fixas sem registrar as condições do teste
  after:
    label: Depois da otimização
    items:
      - Solicitações e fontes renderizadas verificadas
      - CSS maior externalizado e assets com hash em cache immutable
      - Tamanho ideal entregue conforme a largura da tela com srcset + sizes
      - AdSense verifica a possibilidade de exibição no primeiro intento e tenta novamente via observers; GA4 carrega após interação ou temporizador
      - PageSpeed Insights repetido em condições equivalentes
faq:
  title: Perguntas frequentes
  items:
    - question: CSS inline ou arquivo externo, qual é mais rápido?
      answer: "Depende do tamanho do CSS, da estrutura da página e do cache. Use a configuração atual build.inlineStylesheets: 'auto', inspecione o HTML e CSS gerados e meça nas mesmas condições."
    - question: Por que o Google Fonts CDN é lento?
      answer: 'Um domínio externo pode adicionar DNS lookup, conexão TCP e handshake TLS. O efeito depende da rede e do cache; inspecione as solicitações reais e as fontes renderizadas antes de decidir.'
    - question: O que fazer se o Cloudflare Images estiver lento?
      answer: 'O desempenho do Cloudflare Images varia conforme origem, transformação e estado do cache. A primeira transformação e os cache misses ainda buscam a imagem original; meça o candidato a LCP nas mesmas condições e considere responsive preload apenas quando necessário.'
    - question: O controle de carga do AdSense afeta a receita?
      answer: 'O efeito varia conforme a posição do anúncio e o comportamento dos visitantes. Compare visibilidade, solicitações de anúncio e receita antes e depois, separadamente das métricas de desempenho.'
---

## Introdução

O site oficial da Acecore é construído com Astro 7.1.3 + UnoCSS + Cloudflare Pages. Este artigo reúne configurações de otimização verificadas no repositório em 29 de julho de 2026.

Os resultados do PageSpeed Insights variam conforme data, dispositivo e rede. Por isso, não publicamos uma pontuação fixa: compare as mudanças nas mesmas condições usando Core Web Vitals e tamanho transferido.

---

## Por que escolhemos Astro

O Astro oferece geração de sites estáticos (SSG) e permite adicionar JavaScript no cliente apenas onde necessário. O site atual também entrega scripts de ClientRouter, busca, anúncios e analytics; portanto, não assuma uma página sem JavaScript: meça o volume entregue e as métricas de renderização.

O site usa UnoCSS com `presetWind3()`. Ele gera CSS com base nos utilitários detectados no build, o que pode reduzir o volume entregue, mas não garante um tamanho mínimo. Inspecione o CSS gerado e as classes realmente usadas.

---

## Estratégia de entrega CSS: Inline vs Arquivo externo

A entrega de CSS afeta o tamanho do HTML, solicitações adicionais e o cache do navegador.

### Ao usar CSS inline

Configurando `build.inlineStylesheets: 'always'` no Astro, todo o CSS é embutido no HTML. Isso remove a solicitação de CSS externo e pode melhorar o FCP (First Contentful Paint), conforme a página.

As condições favoráveis dependem do tamanho do CSS e da página; um limite fixo não é suficiente.

### Ao usar CSS externo

Arquivos externos permitem reutilizar CSS compartilhado e com hash pelo cache do navegador.

O site atual usa `build.inlineStylesheets: 'auto'` e verifica a saída gerada ao ajustar esse comportamento.

### Solução: Arquivo externo + cache immutable

Altere a configuração do Astro para `build.inlineStylesheets: 'auto'`. O Astro julga automaticamente com base no tamanho do CSS e entrega CSS grande como arquivo externo.

```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    inlineStylesheets: 'auto',
  },
})
```

Os arquivos CSS externos são gerados no diretório `/_astro/`, então adicione cache immutable nas configurações de cabeçalhos do Cloudflare Pages.

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

Depois da mudança, inspecione o HTML gerado, os arquivos CSS e o comportamento do cache e execute novamente o PageSpeed Insights nas mesmas condições.

---

## Otimização de fontes: Verificar a entrega real

### Comparar entrega externa e local

Fontes externas podem adicionar uma conexão ao caminho crítico. A entrega local também envia CSS e arquivos de fonte pelo site; compare as duas abordagens nas mesmas condições.

Use o painel de rede para verificar solicitações, cache e tamanho transferido, e Rendered Fonts para ver quais fontes o navegador realmente usou.

### Estado atual do repositório

`package.json` inclui `@fontsource/noto-sans-jp`, mas em 29 de julho de 2026 ele não é importado por nenhum arquivo em `src`. A dependência sozinha não comprova que a fonte é entregue.

A pilha de fontes atual do UnoCSS é:

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', 'Yu Gothic', 'Meiryo', system-ui, sans-serif",
  },
}
```

Essa declaração sozinha não baixa uma webfont. Se o self-hosting for adotado, verifique em conjunto o import explícito, o CSS e os arquivos de fonte gerados e o resultado renderizado.

---

## Otimização de imagens: Cloudflare Images + srcset + sizes

### Transformações do Cloudflare Images

O utilitário atual envia apenas imagens externas pela transformação `/cdn-cgi/image/` do Cloudflare Images. Arquivos root-relative `/uploads/...` e imagens gerenciadas em `asv.acecore.net/uploads/...` são servidos diretamente.

- **Conversão de formato**: `output=auto` seleciona automaticamente AVIF / WebP conforme o suporte do navegador
- **Ajuste de qualidade**: O utilitário atual usa `quality=75` por padrão; verifique a imagem real antes de alterar
- **Redimensionamento**: Redimensiona para a largura especificada com parâmetro `w=`

### Configuração de srcset e sizes

Para imagens externas com entrega responsiva, gere `srcset` e defina `sizes` pelo utilitário.

```astro
---
import { generateSrcSet, optimizeImage } from '../utils/image'

const remoteImage =
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop'
---

<img
  src={optimizeImage(remoteImage, { width: 800, height: 400, quality: 75 })}
  srcset={generateSrcSet(remoteImage, [480, 640, 960, 1280, 1600], {
    quality: 75,
    aspectRatio: 2,
  })}
  sizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  width="800"
  height="400"
  loading="lazy"
  decoding="async"
/>
```

### Precisão do `sizes`

Se o atributo `sizes` for deixado como `100vw` (largura total da tela), o navegador seleciona uma imagem maior do que o necessário. Especifique conforme o layout real, como `calc(100vw - 2rem)` ou `(max-width: 768px) 100vw, 50vw`.

### Melhoria do LCP: preload

Faça preload apenas da imagem que é realmente candidata a LCP. Em imagens responsivas, mantenha `href`, `imagesrcset` e `imagesizes` do layout alinhados com a imagem e defina `fetchpriority="high"`. Preloads extras podem competir entre si; confirme a escolha por medição.

```html
<link
  rel="preload"
  as="image"
  href="..."
  imagesrcset="..."
  imagesizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  fetchpriority="high"
/>
```

### Prevenção de CLS (Layout Shift)

Defina valores exatos de `width` e `height` cuja proporção corresponda à imagem original. Valores corretos permitem reservar espaço, mas os atributos sozinhos não garantem a eliminação do CLS. Os caminhos atuais de hero e rewrite de Markdown também adicionam dimensões fixas; compare a proporção com cada original e meça o CLS.

Particularmente fáceis de esquecer são imagens de avatar (32×32, 48×48, 64×64px) e thumbnails do YouTube (480×360px).

---

## Controle de carga de anúncios e analytics diferido

### AdSense

O runtime atual, ativo em `/blog/` japonês, registra `IntersectionObserver` (`rootMargin: 200px`) e `ResizeObserver`, verifica se o bloco pode ser exibido e executa um `attemptInit()` inicial. Esse primeiro intento não espera a interseção; com largura utilizável, pode solicitar um anúncio imediatamente. Os observers permitem novas tentativas por interseção ou mudança de tamanho. URLs traduzidas com prefixo de locale recebem slots, mas atualmente não carregam o runtime.

```javascript
const retry = () => void attemptInit()
const intersectionObserver = new IntersectionObserver(
  (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      retry()
    }
  },
  { rootMargin: '200px' },
)
const resizeObserver = new ResizeObserver(retry)

intersectionObserver.observe(container)
resizeObserver.observe(container)
void attemptInit() // o primeiro intento não espera a interseção
```

`attemptInit()` verifica largura e visibilidade, e atributos de estado evitam solicitações duplicadas.

### GA4

O Google Analytics 4 é agendado por `pointerdown`, `keydown`, `touchstart` ou `scroll`. Usa `requestIdleCallback` quando disponível e `setTimeout` caso contrário; sem interação, um temporizador agenda o carregamento após 12 segundos na página inicial ou 4 segundos nas demais páginas.

---

## Estratégia de cache

O bloco a seguir registra as configurações atuais de `_headers` no Cloudflare Pages. Esses valores não são uma recomendação geral para todos os arquivos.

```
# Saída do build (nomes de arquivo com hash)
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

# Índice de busca
/pagefind/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

# HTML
/*
  Cache-Control: public, max-age=0, must-revalidate
```

- `/_astro/*` contém hash no nome do arquivo, então cache immutable de 1 ano é seguro
- `/pagefind/*` tem atualmente cache de 1 semana + 1 dia de stale-while-revalidate. Como o `pagefind-entry.json` de nome fixo referencia metadata com hash, revalide os arquivos entry/bootstrap para evitar gerações desencontradas e reserve cache longo para chunks com hash
- HTML usa `max-age=0, must-revalidate` e é revalidado antes de reutilizar o cache

---

## Checklist de otimização de performance

1. **A estratégia de entrega CSS é adequada?**: Verificar a saída de `auto` e medir nas mesmas condições
2. **A entrega das fontes foi comparada?**: Medir self-hosting e CDN externo nas mesmas condições
3. **A entrega real das fontes foi verificada?**: Conferir solicitações de rede e Rendered Fonts
4. **As imagens de entrega responsiva têm srcset + sizes?**: Prepare especialmente tamanhos menores para mobile
5. **Apenas o candidato real a LCP tem preload?**: Alinhar srcset, sizes e priority responsivos
6. **Os valores width / height são exatos?**: Igualar a proporção original e medir CLS
7. **O controle de AdSense/GA4 é adequado?**: Verificar primeiro intento e novas tentativas do AdSense, interações e fallback do GA4
8. **Os cabeçalhos de cache estão configurados?**: Limitar immutable a assets com hash

---

## Conclusão

O princípio da otimização de performance se resume a **"não enviar o que não é necessário"**. A entrega do CSS deve ser verificada na saída real, e o self-hosting é uma opção de fonte quando se adequa à medição e à operação do site.

Não trate uma pontuação fixa como resultado. Meça novamente Core Web Vitals e tamanho transferido em condições consistentes, incluindo o comportamento de anúncios e Analytics.

---

## Série que inclui este artigo

Este artigo faz parte da série "[Guia de melhoria de qualidade do site Astro](/blog/website-improvement-batches/)". Melhorias de SEO, acessibilidade e UX também são apresentadas em artigos individuais.
