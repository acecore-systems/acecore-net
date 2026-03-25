---
title: 'Guia de melhoria de qualidade de sites Astro — Caminho até 99 pontos no PageSpeed Mobile'
description: 'Registro completo de como melhoramos um site com Astro + UnoCSS + Cloudflare Pages nos 4 eixos de desempenho, SEO, acessibilidade e UX, alcançando 99 pontos no PageSpeed Insights mobile e 100 em todos os itens no desktop.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Público-alvo deste artigo
  text: 'Voltado para quem está trabalhando na melhoria de qualidade de sites e para quem se interessa pela operação prática de Astro + UnoCSS. Este artigo é um hub que resume a visão geral das melhorias, com links para artigos individuais sobre cada tópico.'
processFigure:
  title: Processo de melhoria
  steps:
    - title: Medição
      description: Identificar os gargalos atuais com PageSpeed Insights e axe.
      icon: i-lucide-gauge
    - title: Análise
      description: Ler o detalhamento da pontuação e identificar a melhoria de maior impacto.
      icon: i-lucide-search
    - title: Implementação
      description: Aplicar alterações uma a uma e confirmar zero erros no build.
      icon: i-lucide-code
    - title: Reavaliação
      description: Remedir após o deploy e verificar o efeito com números.
      icon: i-lucide-check-circle
compareTable:
  title: Comparação antes e depois das melhorias
  before:
    label: Antes das melhorias
    items:
      - PageSpeed mobile na faixa dos 70 pontos
      - Dados estruturados e OGP não configurados
      - Acessibilidade não tratada
      - Scripts parando com View Transitions
      - Constantes hardcoded espalhadas pelo código
  after:
    label: Após as melhorias
    items:
      - Mobile 99 / 100 / 100 / 100 (desktop 100 em todos os itens)
      - 7 tipos de dados estruturados + OGP + canonical completos
      - Conformidade WCAG AA (contraste, aria, notificação SR, focus-visible)
      - Todos os componentes compatíveis com View Transitions
      - Constantes SITE, URLs sociais e IDs de anúncios centralizados
linkCards:
  - href: /blog/astro-performance-tuning/
    title: Otimização de desempenho
    description: Como alcançar 99 pontos no PageSpeed com estratégias de entrega CSS, configuração de fontes, imagens responsivas e cache.
    icon: i-lucide-gauge
  - href: /blog/astro-seo-and-structured-data/
    title: SEO e dados estruturados
    description: Guia prático de implementação de JSON-LD, OGP, sitemap e RSS.
    icon: i-lucide-search
  - href: /blog/astro-accessibility-guide/
    title: Acessibilidade
    description: Guia de atributos aria, contraste e melhoria de formulários para alcançar conformidade WCAG AA.
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: UX e qualidade de código
    description: Armadilhas do View Transitions, busca de texto completo com Pagefind e segurança de tipos com TypeScript na prática.
    icon: i-lucide-sparkles
faq:
  title: Perguntas frequentes
  items:
    - question: É possível alcançar 100 pontos no PageSpeed mobile?
      answer: 'Tecnicamente é possível, mas para sites que incluem serviços externos como AdSense ou GA4, é extremamente difícil manter 100 pontos de forma estável. O Lighthouse simula slow 4G (~1.6 Mbps), então recursos externos causam grande penalidade. 99 pontos é o ponto máximo realista.'
    - question: Em que ordem as melhorias devem ser feitas?
      answer: 'Primeiro, entenda a situação atual com o PageSpeed Insights e trate as questões de maior impacto. Em geral, a ordem recomendada é desempenho → SEO → acessibilidade.'
    - question: Essa abordagem de melhoria é aplicável a outros sites Astro?
      answer: 'Sim. Estratégias de entrega CSS, self-hosting de fontes, dados estruturados e melhoria de acessibilidade são boas práticas comuns a sites Astro em geral.'
    - question: O GitHub Copilot foi usado nas melhorias?
      answer: 'Sim. Praticamente todas as melhorias foram realizadas em colaboração com o GitHub Copilot. Os detalhes são apresentados no artigo sobre o fluxo de desenvolvimento com GitHub Copilot.'
---

## Introdução

O site oficial da Acecore, renovado em março de 2026, foi publicado com a configuração Astro 6 + UnoCSS + Cloudflare Pages. Porém, logo após a renovação, o site estava apenas no nível de "funcionar". Havia margem para melhoria em todos os aspectos: desempenho, SEO, acessibilidade e UX.

Este artigo resume a visão geral de como alcançamos **99 pontos no PageSpeed Insights mobile e 100 em todos os itens no desktop** após mais de 150 itens de melhoria.

---

## A barreira dos 99 pontos no PageSpeed mobile

Primeiro, o que quero transmitir é que **obter alta pontuação no PageSpeed Insights mobile é mais difícil do que se imagina**.

### Simulação mobile do Lighthouse

O Lighthouse, que roda por trás do PageSpeed Insights, aplica o seguinte throttling nos testes mobile:

| Item | Configuração |
| --- | --- |
| Velocidade de download | ~1.6 Mbps (slow 4G) |
| Velocidade de upload | ~0.75 Mbps |
| Latência | 150 ms (RTT) |
| CPU | 4x slowdown |

Ou seja, uma página que abre em 1 segundo com fibra óptica leva **5-6 segundos** na simulação do Lighthouse. Carregar 200 KiB de CSS em slow 4G causa **~1 segundo** de bloqueio.

### Não-linearidade da pontuação

A pontuação do PageSpeed não é linear:

- **50 → 90**: Alcançável com otimizações básicas (compressão de imagens, remoção de scripts desnecessários)
- **90 → 95**: Necessária estratégia de entrega de CSS, fontes e imagens
- **95 → 99**: Ajuste fino em milissegundos. Decisão entre CSS inline vs. arquivo externo
- **99 → 100**: Dependente da velocidade de resposta de CDNs externos e variação de medição do próprio Lighthouse. Extremamente difícil manter de forma estável em sites com AdSense/GA4

### Variação da pontuação

Mesmo para o mesmo site, a pontuação pode variar **2-5 pontos** entre medições. As causas incluem:

- Velocidade de resposta de CDNs de imagem como wsrv.nl
- Estado do cache do edge server do Cloudflare Pages
- Margem de erro do próprio Lighthouse

Portanto, o objetivo deve ser "obter pontuação alta de forma estável em medições repetidas", não "atingir 100 uma vez".

---

## Pontuação final

Apesar das dificuldades acima, conseguimos alcançar de forma estável as seguintes pontuações:

| Métrica | Mobile | Desktop |
| --- | --- | --- |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

---

## Os 4 pilares da melhoria

As melhorias foram organizadas em 4 grandes categorias. Os detalhes de cada uma estão em artigos individuais.

### 1. Desempenho

A maior contribuição para alcançar 99 pontos no mobile foi a otimização de desempenho. Eliminamos gargalos um a um: estratégia de entrega CSS (inline vs. arquivo externo), self-hosting de fontes, otimização de imagens responsivas e carregamento lazy de AdSense/GA4.

Os 3 itens de maior impacto foram:

- **Externalização do CSS**: Mudança de expandir 190 KiB de CSS inline para arquivo externo, reduzindo o tamanho de transferência do HTML em até 91%
- **Correção de incompatibilidade no nome da fonte**: Descoberta e correção do problema de que o nome registrado por `@fontsource-variable/noto-sans-jp` era `Noto Sans JP Variable`, diferente do `Noto Sans JP` referenciado no CSS
- **Imagens responsivas**: Configuração de `srcset` + `sizes` em todas as imagens para entregar tamanhos adequados para mobile

### 2. SEO

Para suportar rich results do Google, implementamos 7 tipos de dados estruturados JSON-LD. Incluindo meta tags OGP, canonical, otimização de sitemap e expansão do feed RSS, estabelecemos a base para comunicar com precisão a estrutura do site aos mecanismos de busca.

### 3. Acessibilidade

100 pontos em Accessibility no PageSpeed foi alcançado passando os testes automáticos do axe DevTools e Lighthouse. Acumulamos correções meticulosas: `aria-hidden` em ícones decorativos (mais de 30 locais), notificação SR em links externos, correção de contraste (`text-slate-400` → `text-slate-500`), e aplicação global de estilos `focus-visible`.

### 4. UX e qualidade de código

Resolvemos o problema de interrupção de scripts causado pela introdução de View Transitions (ClientRouter) em todos os componentes e implementamos busca de texto completo com Pagefind. No aspecto de código, melhoramos a segurança de tipos com TypeScript e centralizamos constantes (URLs sociais, IDs de anúncios e GA4 ID no constante SITE), melhorando significativamente a manutenibilidade.

---

## Stack tecnológica

| Tecnologia | Uso |
| --- | --- |
| Astro 6 | Geração estática de site (arquitetura zero JS) |
| UnoCSS (presetWind3) | CSS utility-first |
| Cloudflare Pages | Hospedagem, CDN, controle de headers |
| @fontsource-variable/noto-sans-jp | Self-hosting de fonte japonesa |
| wsrv.nl | Proxy de imagens (conversão automática AVIF/WebP) |
| Pagefind | Busca de texto completo para sites estáticos |

---

## Conclusão

Para alcançar 99 pontos no PageSpeed Insights mobile, é fundamental seguir o princípio de "não enviar o que não é necessário". Estratégia de entrega CSS, self-hosting de fontes, otimização de imagens, carregamento lazy de scripts externos — cada medida é simples individualmente, mas combinadas geram grande efeito.

Ao mesmo tempo, avançar as melhorias de SEO, acessibilidade e UX em paralelo permite alcançar alta pontuação em todos os 4 itens. Em vez de perseguir 100 pontos, o objetivo realista é manter 95+ pontos de forma estável.

Para detalhes de cada tópico, acesse os link cards acima. Para o processo de melhoria e reflexo no código, consulte também o artigo sobre [fluxo de desenvolvimento com GitHub Copilot](/blog/tax-return-with-copilot/).
