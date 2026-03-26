---
title: 'Técnicas práticas para alcançar 99 pontos no PageSpeed Mobile com site Astro'
description: 'Apresentamos as técnicas de otimização realizadas para alcançar 99 pontos no PageSpeed Insights Mobile em um site com Astro + UnoCSS + Cloudflare Pages. Estratégia de entrega CSS, armadilhas de configuração de fontes, imagens responsivas, carregamento lazy de AdSense e configuração de cache — técnicas práticas compiladas.'
date: 2026-03-15
lastUpdated: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80
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
      description: Eliminar latência de CDN externo com self-hosting.
      icon: i-lucide-type
    - title: Otimização de imagens
      description: Entregar tamanho ideal com Cloudflare Images + srcset + sizes.
      icon: i-lucide-image
    - title: Carregamento lazy
      description: Injetar AdSense e GA4 na primeira interação.
      icon: i-lucide-timer
compareTable:
  title: Comparação antes e depois da otimização
  before:
    label: Antes da otimização
    items:
      - Google Fonts CDN (bloqueio de renderização)
      - 190 KiB de CSS inline no HTML
      - Imagens entregues em tamanho fixo
      - Script do AdSense carregado imediatamente
      - Mobile na faixa dos 70 pontos
  after:
    label: Depois da otimização
    items:
      - 'Self-hosting com @fontsource (referenciando o nome correto da fonte)'
      - CSS em arquivo externo com cache immutable
      - Tamanho ideal entregue conforme a largura da tela com srcset + sizes
      - Carregamento lazy de AdSense e GA4 ao primeiro scroll
      - Mobile 99 pontos, Desktop 100 pontos
faq:
  title: Perguntas frequentes
  items:
    - question: CSS inline ou arquivo externo, qual é mais rápido?
      answer: 'Depende do tamanho total do CSS. Abaixo de 20 KiB, inline é vantajoso. Acima disso, arquivo externo aproveitando o cache do navegador é muito mais rápido a partir do segundo acesso.'
    - question: Por que o Google Fonts CDN é lento?
      answer: 'O PageSpeed Insights simula slow 4G (aprox. 1.6 Mbps, RTT 150ms). Conectar a um domínio externo requer DNS lookup + conexão TCP + handshake TLS, e essa latência causa bloqueio de renderização. Com self-hosting, é entregue do mesmo domínio, eliminando essa latência.'
    - question: O que fazer se o Cloudflare Images estiver lento?
      answer: 'O Cloudflare Images costuma ser rápido, mas a primeira transformação e os cache misses ainda precisam buscar a imagem original. Se o LCP piorar no PageSpeed, configure <link rel="preload"> nas imagens críticas para iniciar a busca mais cedo.'
    - question: Carregar AdSense com lazy loading afeta a receita?
      answer: 'Quando não há anúncios no first view, o carregamento no primeiro scroll tem timing de exibição praticamente igual. O efeito SEO da melhoria na velocidade da página tende a ser mais positivo.'
---

## Introdução

O site oficial da Acecore é construído com Astro 6 + UnoCSS + Cloudflare Pages. Neste artigo, apresentamos as técnicas de otimização realizadas para alcançar **Mobile 99 pontos e Desktop 100 pontos** no PageSpeed Insights.

As pontuações finais alcançadas são:

| Métrica | Mobile | Desktop |
| --- | --- | --- |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

---

## Por que escolhemos Astro

O que um site corporativo precisa é "velocidade" e "SEO". O Astro é especializado em geração de sites estáticos (SSG) e alcança zero JavaScript por padrão. Como não envia componentes de frameworks como React ou Vue para o cliente, a exibição inicial é extremamente rápida.

Para o framework CSS, adotamos UnoCSS. Tem a mesma abordagem utility-first do Tailwind CSS, mas extrai apenas as classes utilizadas durante o build, resultando em CSS de tamanho mínimo. A partir da v66, `presetWind3()` é recomendado, então faça a migração.

---

## Estratégia de entrega CSS: Inline vs Arquivo externo

O que teve maior impacto na pontuação do PageSpeed foi a estratégia de entrega CSS.

### Quando o CSS é pequeno (até ~20 KiB)

Configurando `build.inlineStylesheets: 'always'` no Astro, todo o CSS é embutido diretamente no HTML. Como não é necessário fazer requisição HTTP para arquivo CSS externo, o FCP (First Contentful Paint) melhora.

Até cerca de 20 KiB de CSS, esta abordagem é ideal.

### Quando o CSS é grande (20 KiB+)

No entanto, ao usar fontes Web japonesas (`@fontsource-variable/noto-sans-jp`), a situação muda. Este pacote contém **124 declarações `@font-face`** (aproximadamente 96.7 KiB), e o CSS total chega a cerca de 190 KiB.

Se 190 KiB de CSS forem todos embutidos inline em cada HTML, o HTML da página inicial incha para **225 KiB**. Em slow 4G, apenas a transferência deste HTML leva aproximadamente 1 segundo.

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

Com esta mudança, o tamanho do HTML foi **reduzido em 84~91%** (exemplo: index.html de 225 KiB → 35 KiB), e a pontuação do PageSpeed subiu de **96 pontos → 99 pontos**.

---

## Otimização de fontes: Configuração correta de self-hosting

### Evite o Google Fonts CDN

O Google Fonts CDN é conveniente, mas no teste mobile do PageSpeed Insights é fatal. Nos testes realizados, com Google Fonts CDN o **FCP foi de 6.1 segundos e a pontuação caiu para 62 pontos**.

Em slow 4G, ao conectar a um domínio externo, ocorre a cadeia de DNS lookup → conexão TCP → handshake TLS → download do CSS → download da fonte, atrasando significativamente a renderização.

### Introdução do self-hosting

Basta instalar `@fontsource-variable/noto-sans-jp` e fazer import no arquivo de layout.

```bash
npm install @fontsource-variable/noto-sans-jp
```

```javascript
// BaseLayout.astro
import '@fontsource-variable/noto-sans-jp'
```

### Atenção: Inconsistência no nome da fonte

Aqui existe uma armadilha inesperada. O nome da fonte que `@fontsource-variable/noto-sans-jp` registra no `@font-face` é **`Noto Sans JP Variable`**. Porém muitas pessoas escrevem `Noto Sans JP` no CSS.

Se houver essa inconsistência, **a fonte não é aplicada corretamente e o navegador continua usando a fonte de fallback**. Mesmo carregando 96.7 KiB de dados de fonte, eles não são utilizados.

Especifique corretamente a família de fontes nas configurações do UnoCSS.

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP Variable', 'Hiragino Kaku Gothic ProN', 'メイリオ', sans-serif",
  },
}
```

Se ocorrer erro de tipo TypeScript, adicione a declaração de módulo em `src/env.d.ts`.

```typescript
declare module '@fontsource-variable/noto-sans-jp';
```

---

## Otimização de imagens: Cloudflare Images + srcset + sizes

### Transformações do Cloudflare Images

Imagens externas são entregues pelas URLs de transformação `/cdn-cgi/image/` do Cloudflare Images. Apenas adicionando parâmetros de transformação, o seguinte processamento é realizado automaticamente:

- **Conversão de formato**: `output=auto` seleciona automaticamente AVIF / WebP conforme o suporte do navegador
- **Ajuste de qualidade**: `q=50` mantém qualidade suficiente enquanto reduz o tamanho do arquivo em cerca de 10%
- **Redimensionamento**: Redimensiona para a largura especificada com parâmetro `w=`

### Configuração de srcset e sizes

Configure `srcset` e `sizes` em todas as imagens para entregar o tamanho ideal conforme a largura da tela.

```html
<img
  src="/cdn-cgi/image/width=800,fit=cover,format=auto,quality=50,metadata=none/https://images.unsplash.com/..."
  srcset="
    /cdn-cgi/image/width=480,fit=scale-down,format=auto,quality=50,metadata=none/https://images.unsplash.com/... 480w,
    /cdn-cgi/image/width=640,fit=scale-down,format=auto,quality=50,metadata=none/https://images.unsplash.com/... 640w,
    /cdn-cgi/image/width=960,fit=scale-down,format=auto,quality=50,metadata=none/https://images.unsplash.com/... 960w,
    /cdn-cgi/image/width=1280,fit=scale-down,format=auto,quality=50,metadata=none/https://images.unsplash.com/... 1280w,
    /cdn-cgi/image/width=1600,fit=scale-down,format=auto,quality=50,metadata=none/https://images.unsplash.com/... 1600w
  "
  sizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  loading="lazy"
  decoding="async"
/>
```

### Precisão do `sizes`

Se o atributo `sizes` for deixado como `100vw` (largura total da tela), o navegador seleciona uma imagem maior do que o necessário. Especifique conforme o layout real, como `calc(100vw - 2rem)` ou `(max-width: 768px) 100vw, 50vw`.

### Melhoria do LCP: preload

Para imagens que afetam o LCP (Largest Contentful Paint), configure `<link rel="preload">`. Adicione uma prop `preloadImage` ao componente de layout do Astro para especificar imagens de prioridade máxima, como a imagem hero da página inicial.

```html
<link rel="preload" as="image" href="..." />
```

### Prevenção de CLS (Layout Shift)

Especifique os atributos `width` e `height` em todas as imagens. O navegador reserva antecipadamente a área de exibição da imagem, prevenindo mudanças de layout (CLS) ao completar o carregamento.

Particularmente fáceis de esquecer são imagens de avatar (32×32, 48×48, 64×64px) e thumbnails do YouTube (480×360px).

---

## Carregamento lazy de anúncios e analytics

### AdSense

O script do Google AdSense tem cerca de 100 KiB e impacta significativamente a exibição inicial. Injete o script dinamicamente no momento do primeiro scroll do usuário.

```javascript
window.addEventListener('scroll', () => {
  const script = document.createElement('script')
  script.src = 'https://pagead2.googlesyndication.com/...'
  script.async = true
  document.head.appendChild(script)
}, { once: true })
```

Com `{ once: true }`, o event listener dispara apenas uma vez. Isso reduz a quantidade de JavaScript transferido no first view a quase zero.

### GA4

O Google Analytics 4 também é injetado com atraso usando `requestIdleCallback`. O script é injetado quando o navegador está em estado idle, sem interferir nas operações do usuário.

---

## Estratégia de cache

Configure a política de cache ideal para cada tipo de asset no arquivo `_headers` do Cloudflare Pages.

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
- `/pagefind/*` tem cache de 1 semana + 1 dia de stale-while-revalidate
- HTML sempre busca a versão mais recente

---

## Checklist de otimização de performance

1. **A estratégia de entrega CSS é adequada?**: Abaixo de 20 KiB use inline, acima disso use arquivo externo
2. **As fontes são self-hosted?**: CDN externo é fatal em slow 4G
3. **O nome da fonte está correto?**: Verifique o nome de registro do `@fontsource-variable` (`*Variable`)
4. **Todas as imagens têm srcset + sizes?**: Prepare especialmente tamanhos menores para mobile
5. **O elemento LCP tem preload?**: Imagem hero e imagens do first view
6. **As imagens têm width / height?**: Prevenção de CLS
7. **AdSense / GA4 estão com carregamento lazy?**: Reduza a zero a transferência de JS no first view
8. **Os cabeçalhos de cache estão configurados?**: Cache immutable para acelerar o segundo acesso em diante

---

## Conclusão

O princípio da otimização de performance se resume a **"não enviar o que não é necessário"**. CSS inline parece rápido à primeira vista, mas com 190 KiB é contraproducente. Self-hosting de fontes é essencial, mas existe a armadilha da inconsistência no nome da fonte.

Com base na arquitetura zero JS do Astro, minimizando a quantidade de transferência em cada área — CSS, fontes, imagens e scripts de anúncios — alcançar 99 pontos no mobile é perfeitamente viável.

---

## Série que inclui este artigo

Este artigo faz parte da série "[Guia de melhoria de qualidade do site Astro](/blog/website-improvement-batches/)". Melhorias de SEO, acessibilidade e UX também são apresentadas em artigos individuais.
