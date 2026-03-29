---
title: 'Guia de melhoria de qualidade de sites Astro, continuação - Ajustes finais para alcançar 100 em todos os itens do PageSpeed Insights'
description: 'Registro do ajuste final feito após o artigo anterior: desativação do Cloudflare Web Analytics, carregamento adiado de GA4 e da interface de busca, conquista de 100 em todos os itens do PageSpeed Insights no mobile e no desktop, organização de breadcrumbs e indexação no Search Console, migração para ícones SVG compartilhados e explicação das otimizações extras que foram testadas, mas não adotadas.'
date: 2026-03-29T02:30
author: gui
tags: ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Continuação do artigo anterior
  text: 'Como continuação do artigo anterior, "Guia de melhoria de qualidade de sites Astro", este post documenta o ajuste final que levou o site aos 100 pontos em todos os itens do PageSpeed Insights. Além disso, ele explica o carregamento adiado de GA4 e da busca, a limpeza no Search Console, a interpretação dos diagnósticos restantes e quais otimizações extras foram testadas, mas não adotadas.'
insightGrid:
  eyebrow: Por que isso importa
  title: Por que 100 em todos os itens do PageSpeed ainda representa um nível alto
  description: 100 não significa que tudo no site real esteja perfeito, mas mostra que não há perdas importantes nas auditorias principais avaliadas pelo Lighthouse.
  variant: card
  items:
    - title: Medido em slow 4G
      description: A medição mobile é feita com slow 4G e CPU desacelerada. Mesmo um site estático leve não chega a 100 com facilidade.
      icon: i-lucide-gauge
      tone: brand
    - title: Nota máxima nas 4 categorias
      description: Não basta otimizar apenas Performance. Accessibility, Best Practices e SEO também precisam atingir a nota máxima ao mesmo tempo.
      icon: i-lucide-shield-check
      tone: emerald
    - title: Foi preciso reorganizar os terceiros
      description: É preciso reduzir beacons externos e dependências desnecessárias, sem remover elementos realmente importantes como GA4 e anúncios.
      icon: i-lucide-sparkles
      tone: amber
    - title: Diagnósticos precisam ser lidos corretamente
      description: O objetivo não é zerar todos os insights, mas decidir se os diagnósticos restantes são aceitáveis.
      icon: i-lucide-search
      tone: slate
processFigure:
  title: Etapas do ajuste final
  steps:
    - title: Medir
      description: Revisar tanto o PageSpeed Insights quanto o Search Console para separar problemas reais de simples sinais diagnósticos.
      icon: i-lucide-gauge
    - title: Organizar
      description: Reavaliar o papel do Cloudflare Web Analytics e definir o que deve permanecer entre GA4, anúncios e busca.
      icon: i-lucide-shield-check
    - title: Adiar
      description: Tirar GA4 e a busca baseada em Pagefind da carga inicial e carregá-los só quando realmente forem necessários.
      icon: i-lucide-timer-reset
    - title: Corrigir
      description: Ajustar breadcrumbs, canonical, regras de noindex, saída do sitemap e renderização de ícones.
      icon: i-lucide-wrench
    - title: Decidir
      description: Comparar mais divisão de CSS e mais redução de terceiros e descartar as opções cujo retorno não compensa.
      icon: i-lucide-scale-3d
compareTable:
  title: O que o ajuste final mudou
  before:
    label: Antes
    items:
      - A pontuação mobile já era alta, mas o beacon do Cloudflare Web Analytics ainda permanecia
      - GA4 e a interface de busca ainda estavam próximos da carga inicial, então a fronteira entre funcionalidade necessária e momento de carregamento era pouco clara
      - O significado dos diagnósticos restantes do PageSpeed era ambíguo, e faltava critério claro para saber quando parar
      - Alguns artigos podiam exibir apenas círculos vazios por causa de icon classes remanescentes do UnoCSS
      - O Search Console ainda mostrava breadcrumbs inválidos e ruído de indexação em páginas de listagem
  after:
    label: Depois
    items:
      - Os quatro indicadores chegaram a 100 tanto no mobile quanto no desktop
      - O Cloudflare Web Analytics foi desativado, enquanto o GA4 foi mantido com carregamento adiado
      - A busca e o Pagefind foram movidos para carregamento sob demanda, reduzindo o peso inicial
      - A renderização foi padronizada no SVG compartilhado Icon, e nomes legacy de ícones foram absorvidos por aliases
      - Breadcrumb, noindex, sitemap e canonical foram alinhados para o Search Console
      - Otimizações adicionais de baixo retorno foram descartadas, e o ponto razoável de parada ficou claro
checklist:
  title: O que foi resolvido
  items:
    - text: Cloudflare Web Analytics desativado e injeção do beacon interrompida
      checked: true
    - text: O GA4 foi mantido, mas passou para carregamento adiado com requestIdleCallback e gatilhos por interação
      checked: true
    - text: A interface de busca e os recursos do Pagefind saíram da rota de carga inicial
      checked: true
    - text: Confirmados 100 pontos em todos os itens do PageSpeed Insights no mobile e no desktop
      checked: true
    - text: A árvore de dependências de rede foi interpretada e ficou claro que BaseLayout.css é o único grande gargalo remanescente
      checked: true
    - text: Os erros de breadcrumbs no Search Console foram corrigidos e o tratamento de breadcrumb, canonical e trailing slash foi alinhado
      checked: true
    - text: A estratégia de indexação para tags, arquivo, autores e paginação foi esclarecida com noindex e exclusão do sitemap
      checked: true
    - text: As icon classes dinâmicas de ProcessFigure e StatBar foram migradas para o componente compartilhado Icon
      checked: true
    - text: Compatibilidade por alias adicionada para o nome legacy check-circle
      checked: true
    - text: Mais divisão de CSS e mais cortes em terceiros foram comparados, mas descartados porque a complexidade superava o ganho
      checked: true
linkCards:
  - href: /blog/website-improvement-batches/
    title: 'Artigo anterior: visão geral das melhorias de qualidade'
    description: Comece pelo artigo hub anterior para entender o panorama completo das mais de 150 melhorias.
    icon: i-lucide-book-open
  - href: /blog/astro-performance-tuning/
    title: Artigo de otimização de desempenho
    description: Explica em detalhe a estratégia de entrega de CSS, fontes, imagens e otimização de scripts de terceiros.
    icon: i-lucide-gauge
  - href: /blog/astro-accessibility-guide/
    title: Artigo de acessibilidade
    description: Organiza as medidas concretas usadas para alcançar conformidade WCAG AA e Accessibility 100.
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: Artigo de UX e qualidade de código
    description: Resume melhorias de qualidade relacionadas a View Transitions, busca e segurança de tipos.
    icon: i-lucide-sparkles
faq:
  title: Perguntas frequentes
  items:
    - question: Se um site chega a 100 no PageSpeed Insights, ele pode ser chamado de o site mais rápido possível?
      answer: 'Não em sentido absoluto. O PageSpeed Insights é uma medição de laboratório baseada no Lighthouse e não reproduz por completo as redes reais dos usuários, os dispositivos nem o congestionamento do servidor. Ainda assim, 100 pontos significam que o site está em um estado de altíssima qualidade, com poucas perdas nas auditorias principais do Lighthouse.'
    - question: Por que a árvore de dependências de rede ou o CSS render-blocking ainda podem aparecer mesmo com nota 100?
      answer: 'Esses itens nem sempre são auditorias reprovadas. Eles também podem aparecer como informação diagnóstica. Neste caso, apenas BaseLayout.css permanece no caminho crítico, mas o mobile 100 continua estável, então o custo-benefício atual é aceitável.'
    - question: Por que o Cloudflare Web Analytics foi desligado?
      answer: 'O GA4 já atendia suficientemente à medição de eventos como CTA, busca e contato, enquanto o lado do Cloudflare havia ficado mais restrito à observação de desempenho. Desta vez, também considerei o impacto do beacon no PageSpeed e reorganizei a medição com foco em GA4.'
    - question: O que exatamente foi ajustado para o Search Console?
      answer: 'A saída de BreadcrumbList foi refeita para que páginas de listagem emitam breadcrumbs explícitos com item válidos. Ao mesmo tempo, trailing slash, canonical, regras de noindex e sitemap foram alinhados para que tags, arquivo, autores e paginação tenham um papel de indexação mais claro.'
    - question: Houve otimizações testadas, mas não adotadas?
      answer: 'Sim. Comparei ideias como dividir ainda mais o BaseLayout.css, tentar fazer desaparecer a própria exibição do network dependency tree e até reduzir terceiros a ponto de afetar o GA4. Com o mobile já estável em 100, essas opções trariam mais complexidade ou perda de medição do que valor prático, então foram descartadas.'
---

## Introdução

No artigo anterior, [Guia de melhoria de qualidade de sites Astro](/blog/website-improvement-batches/), resumi o grande conjunto de melhorias aplicadas ao site renovado da Acecore. Este artigo é a continuação direta daquele trabalho.

Este artigo fecha os pontos menores que ainda restavam após a publicação do artigo anterior e leva o site a um estado em que **os quatro itens do PageSpeed Insights chegaram a 100 tanto no mobile quanto no desktop**. Além do ajuste de nota, o trabalho também tirou GA4 e busca da carga inicial, reorganizou breadcrumbs e regras de indexação no Search Console, estabilizou a renderização dos ícones e deixou explícito até onde valia a pena continuar otimizando.

## Resultado de 100 em todos os itens do PageSpeed Insights

Em 29 de março de 2026, a página inicial da Acecore apresentava os seguintes resultados.

| Ambiente | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| Mobile | **100** | **100** | **100** | **100** |
| Desktop | **100** | **100** | **100** | **100** |

Abaixo estão as capturas reais do PageSpeed Insights junto com as URLs dos relatórios. Na rodada anterior, eu considerava “mobile 99 / o restante 100” como o teto realista. Desta vez, ao remover beacons de terceiros desnecessários e interpretar com cuidado o significado dos diagnósticos restantes, foi possível chegar a 100.

### URLs dos relatórios

Para deixar juntas as capturas e uma evidência que possa ser reaberta depois, também deixo aqui as URLs diretas dos relatórios usados nesta medição.

- [Relatório mobile](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile)
- [Relatório desktop](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop)

<figure class="not-prose my-8">
  <figcaption class="text-base font-700 text-slate-800 mb-3">Capturas medidas</figcaption>
  <p class="text-sm text-slate-500 mb-4">Clique em cada imagem para abrir o relatório correspondente do PageSpeed Insights.</p>
  <div class="grid gap-4 md:grid-cols-2">
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-mobile-summary-20260329.webp" alt="Resultado mobile do PageSpeed Insights da página inicial da Acecore em 29 de março de 2026. Performance, Accessibility, Best Practices e SEO estão todos com 100." class="w-full rounded-lg border border-slate-200" width="1160" height="340" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">Mobile</span>
    </a>
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-desktop-summary-20260329.webp" alt="Resultado desktop do PageSpeed Insights da página inicial da Acecore em 29 de março de 2026. Performance, Accessibility, Best Practices e SEO estão todos com 100." class="w-full rounded-lg border border-slate-200" width="1190" height="270" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">Desktop</span>
    </a>
  </div>
</figure>

## O quão relevante é chegar a 100

Ao ouvir “100”, pode surgir a ideia de que a Performance sempre sobe se você continuar removendo recursos, simplificando a interface e cortando elementos externos. Em parte isso é verdade: um site estático costuma ficar mais rápido à medida que mais coisas são retiradas.

Mas aqui não se tratava de construir uma página de demonstração vazia. Era preciso manter GA4, anúncios, busca, ClientRouter e CSS compartilhado, e ainda assim alinhar mobile e desktop a 100 nas quatro categorias. O trabalho não foi apenas deixar a página mais leve, mas decidir o que precisava ficar, o que podia sair e o que já não valia mais a pena mexer.

Claro que 100 não significa que seja, em termos absolutos, o site mais rápido do mundo real. A experiência do usuário depende de rede, dispositivo, região e estado de cache. Ainda assim, é justo dizer que o site chegou a um nível muito alto no sentido de que **as auditorias principais do Lighthouse não mostram perdas importantes enquanto os elementos operacionais necessários continuam presentes**.

## Ajustes finais para chegar a 100

### 1. Desativação do Cloudflare Web Analytics e reorganização dos papéis da medição

O Cloudflare Web Analytics é útil como solução RUM leve e privacy-first, mas na Acecore o lado do GA4 já estava amplamente instrumentado para cliques em CTA, busca, ações de contato, geração de leads e outros eventos.

Ao revisar novamente os papéis de cada ferramenta, concluí que, do lado do Cloudflare, o custo de continuar injetando um beacon desnecessário no PageSpeed já era maior do que o valor entregue. Desativei o RUM no painel e confirmei que `static.cloudflareinsights.com/beacon.min.js` havia desaparecido do HTML de produção.

Isso, porém, não significava abandonar a medição. CTA, links externos, busca e conversões de contato continuavam importantes, então o passo seguinte foi manter o GA4 e mudar o momento em que ele entra.

### 2. Manter o GA4, mas tirá-lo da carga inicial

A distinção central aqui não era apenas entre “manter o GA4” e “removê-lo”, mas entre “manter” e “carregar no início”.

Na prática, o ponto de entrada de `gtag` continuou disponível desde o começo para que os eventos pudessem ser recebidos, mas o script real `gtag/js` foi movido para `requestIdleCallback` e para a interação do usuário. Além disso, existem fallbacks com tempos diferentes conforme o tipo de página, para que o analytics ainda seja carregado mesmo sem interação imediata.

Com isso, a medição de CTA, links externos, busca e contato foi preservada, mas a execução de scripts de terceiros saiu da fase mais cedo possível do render. Ou seja, os 100 pontos vieram não só da remoção do beacon da Cloudflare, mas também de um carregamento mais inteligente do GA4.

### 3. Mover a busca e o Pagefind para carregamento sob demanda

A busca é outra função que pode pesar silenciosamente na carga inicial, mesmo quando o usuário não a abre logo de cara. A Acecore usa Pagefind para busca em texto completo, e nesta rodada apliquei a mesma disciplina: manter a funcionalidade, mas não pagar o custo antecipadamente.

O modal de busca agora carrega `pagefind-ui.js` e seu CSS apenas quando a busca é realmente aberta. A promise fica em cache para evitar carregamentos duplicados, e atalhos de teclado ou abertura por query string continuam funcionando normalmente.

Isso não melhora apenas o número do Lighthouse. Também torna o primeiro render do dia a dia mais leve. A busca continua lá, mas deixa de fazer parte do caminho crítico de todas as visualizações.

### 4. Interpretação dos diagnósticos restantes do PageSpeed

Mesmo depois de a nota chegar a 100, o PageSpeed ainda pode exibir diagnósticos como `Network dependency tree` e `render-blocking resources`. Se isso for interpretado como alerta que obrigatoriamente precisa sumir, é fácil cair em otimizações de baixo retorno.

A cadeia crítica, neste caso, era aproximadamente a seguinte:

1. `/en/`
2. `ClientRouter.js`
3. `BaseLayout.css`
4. `BaseLayout.js`

Desses itens, o único que ainda permanecia de fato como render-blocking era `BaseLayout.css`. No entanto, o tamanho já é pequeno o bastante e o mobile 100 continua estável, então o classifiquei como “diagnóstico remanescente aceitável”. Colocar esse critério em palavras foi, por si só, um ganho importante, porque deixa claro quando vale a pena parar nas próximas otimizações.

### 5. Organizar breadcrumbs e regras de indexação no Search Console

Quando o PageSpeed já estava estável em 100, voltei a olhar o site pelo lado da busca. Foi aí que ainda havia uma inconsistência real: o Search Console continuava mostrando breadcrumbs inválidos, apesar de o FAQ markup já estar em bom estado.

Para corrigir isso, a saída de `BreadcrumbList` nas páginas de listagem foi refeita para aceitar itens explícitos, em vez de depender demais da dedução a partir da URL. Ao mesmo tempo, o tratamento de trailing slash foi alinhado para que canonical, hreflang e breadcrumbs deixassem de divergir.

Também ficou explícito o papel de indexação de tags, arquivo, autores e paginação. Essas páginas são úteis como navegação, mas facilmente se tornam alvos de indexação finos ou duplicados. Por isso foram alinhadas com `noindex, follow` e exclusão do sitemap. Isso não apaga imediatamente todo relatório de “rastreada, mas não indexada”, mas significa que a política de indexação desejada agora está expressa diretamente no código.

### 6. Padronização da renderização de ícones em um componente SVG compartilhado

Como parte do ajuste final, o projeto já estava migrando das utilities de ícones do UnoCSS para o componente `Icon`, baseado em SVG compartilhado. Nesse processo, algumas icon classes dinâmicas que ainda restavam em `ProcessFigure` e `StatBar` ficaram para trás, o que fazia certos trechos dos artigos aparecerem apenas como círculos vazios.

Padronizei a renderização do lado do componente via `Icon` e ainda adicionei um alias para absorver o nome legacy `check-circle` dentro de `circle-check`.

Com isso, surgiram três benefícios práticos:

- Fica muito mais difícil um ícone desaparecer por causa de uma class dinâmica esquecida
- Atributos de acessibilidade como `aria-hidden` podem ser padronizados do lado do SVG
- A operação fica mais estável porque a renderização deixa de depender da análise estática do UnoCSS

Ao mesmo tempo, a análise e a exibição de datas no blog também foram normalizadas em torno do fuso JST. Esse não é o tema central deste artigo, mas ajuda a estabilizar a ordem de posts do mesmo dia e a precisão temporal dos dados estruturados.

### 7. O que foi testado, mas não adotado

Quando aparece um 100, a tentação natural é perseguir cada diagnóstico restante até não sobrar mais nada na tela. Comparei algumas opções nessa direção, mas não adotei as seguintes.

- Dividir ainda mais o `BaseLayout.css`: isso poderia deixar os diagnósticos visualmente mais limpos, mas o mobile 100 já está estável e o ganho prático não compensava a complexidade extra.
- Tratar a mera exibição do `network dependency tree` como algo que precisava desaparecer: um diagnóstico visível não equivale automaticamente a um problema real para usuários.
- Cortar ainda mais terceiros a ponto de afetar o GA4: a página talvez ficasse um pouco mais leve, mas à custa de perder medição importante para o negócio.

Essa comparação foi importante. O ajuste final ficou concluído não porque tudo o que era imaginável foi removido, mas porque os trade-offs restantes passaram a estar explícitos e defensáveis.

## Aprendizados práticos do ajuste final

O maior ganho desta vez não foi simplesmente conseguir a nota 100. Foi chegar a um estado em que **consigo explicar o que precisa ser removido e o que é aceitável manter**.

Por exemplo, o Cloudflare Web Analytics vale a pena ser removido se estiver ali apenas por inércia, enquanto o GA4 deve permanecer porque é o núcleo da medição de eventos de negócio. Mas, se o GA4 permanece, isso não significa que ele precise ficar na carga inicial. O melhor é manter a medição e mudar o momento do carregamento.

O mesmo vale para busca e SEO. A busca deve continuar existindo, mas não precisa vir no payload inicial. Páginas de listagem continuam úteis para navegação, mas não precisam ser tratadas como alvos principais de indexação. E `network dependency tree` não é, por si só, uma falha; é preciso olhar o conteúdo e decidir se a cadeia restante ainda faz sentido.

Também usei IA para ampliar o conjunto de mudanças candidatas, mas os critérios finais continuaram sendo três perguntas muito concretas: os números medidos realmente melhoram, o custo operacional continua razoável e as capacidades de medição necessárias permanecem intactas? A IA ajudou a abrir possibilidades; a decisão final continuou dependendo de medição e julgamento.

Quando a otimização persegue apenas a nota, ela rapidamente passa do ponto. Desta vez consegui organizar não apenas as correções, mas também a linha de corte para saber onde parar, então é razoável dizer que as melhorias do site da Acecore chegaram, por ora, a um estado completo.

## Resumo

Como continuação do artigo anterior, o ajuste final fechou os seguintes pontos:

- Confirmar 100 em todos os itens do PageSpeed Insights no mobile e no desktop
- Desativar o Cloudflare Web Analytics, mantendo o GA4 com carregamento adiado
- Mover a busca e o Pagefind para carregamento sob demanda e reduzir o peso inicial
- Interpretar os diagnósticos de rede restantes e esclarecer quais pendências residuais são aceitáveis
- Organizar a saída de breadcrumbs no Search Console e as regras de indexação das páginas de listagem
- Eliminar falhas de renderização de ícones ao padronizar no SVG compartilhado `Icon`
- Descartar otimizações extras de baixo retorno e deixar claro o ponto razoável de parada

Pelo menos do ponto de vista do Lighthouse e do PageSpeed Insights, o site da Acecore foi ajustado até um nível em que pode legitimamente mirar a faixa mais alta de velocidade. Ao mesmo tempo, a nota não é o objetivo, mas apenas o resultado. Daqui em diante, vou seguir mantendo tanto a operação quanto as melhorias para que esse estado não recue.
