---
title: 'Guia prático para tornar seu site Astro compatível com WCAG AA'
description: 'Apresentamos todos os passos de melhoria de acessibilidade realizados em um site com Astro + UnoCSS. Abrangemos atributos aria, contraste, gerenciamento de foco, validação de formulários, suporte a leitores de tela e outras medidas necessárias para conformidade WCAG AA.'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'アクセシビリティ']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: Acessibilidade é "melhoria de UX para todos"
  text: 'Acessibilidade não é apenas para pessoas com deficiência. Operação por teclado, contraste e indicadores de foco impactam diretamente a usabilidade para todos os usuários. Quanto mais você investe, mais a qualidade geral do site melhora.'
processFigure:
  title: Como conduzir melhorias de acessibilidade
  steps:
    - title: Inspeção automática
      description: Use axe DevTools e Lighthouse para identificar problemas detectáveis automaticamente.
      icon: i-lucide-scan
    - title: Inspeção manual
      description: Teste navegando com teclado e leitor de tela.
      icon: i-lucide-hand
    - title: Correção
      description: Adicione atributos aria, corrija contraste e adicione estilos de foco.
      icon: i-lucide-wrench
    - title: Reinspeção
      description: Confirme pontuação 100 no Accessibility do PageSpeed.
      icon: i-lucide-check-circle
checklist:
  title: Checklist de conformidade WCAG AA
  items:
    - text: Razão de contraste do texto é 4.5:1 ou superior (3:1 para texto grande)
      checked: true
    - text: Todos os elementos interativos têm estilo focus-visible
      checked: true
    - text: Ícones decorativos têm aria-hidden="true"
      checked: true
    - text: Links externos têm notificação para leitores de tela
      checked: true
    - text: Formulários têm validação inline com integração aria-invalid
      checked: true
    - text: Imagens têm atributos width/height (prevenção de CLS)
      checked: true
    - text: Elementos de lista têm role="list" (solução para list-style:none)
      checked: true
faq:
  title: Perguntas frequentes
  items:
    - question: Qual a diferença entre axe DevTools e Lighthouse?
      answer: 'Lighthouse é uma ferramenta de auditoria abrangente que inclui performance e SEO, verificando apenas alguns itens de acessibilidade. O axe DevTools é especializado em acessibilidade e inspeciona com mais regras e em mais detalhes. Recomendamos usar ambos em conjunto.'
    - question: Devo adicionar atributos aria em todos os elementos?
      answer: 'Não. Se a semântica HTML estiver correta, aria não é necessário. Atributos aria servem para complementar "informações que o HTML sozinho não consegue transmitir", e o uso excessivo pode tornar a leitura pelo leitor de tela redundante.'
    - question: Se o Accessibility do PageSpeed está em 100 pontos, o site é compatível com WCAG?
      answer: 'Mesmo com 100 pontos, não se pode garantir conformidade total com WCAG. O Lighthouse tem itens de verificação limitados, e existem critérios que só podem ser confirmados manualmente (ordem lógica de leitura, texto alt adequado, etc.). São necessários tanto testes automáticos quanto manuais.'
---

## Introdução

"Melhorias de acessibilidade" pode parecer algo que sempre fica para depois. No entanto, ao trabalhar nisso na prática, melhorias de contraste, operação por teclado e indicadores de foco resultam diretamente em melhor usabilidade para todos os usuários.

Neste artigo, apresentamos por categoria as melhorias realizadas para alcançar 100 pontos no Accessibility do PageSpeed em um site Astro + UnoCSS.

---

## aria-hidden em ícones decorativos

Os ícones Iconify do UnoCSS (`i-lucide-*`) são frequentemente usados como decoração visual, mas quando leitores de tela os leem, notificam como "imagem" ou "imagem desconhecida", causando confusão.

### Solução

Adicione `aria-hidden="true"` aos ícones com propósito decorativo.

```html
<span class="i-lucide-mail" aria-hidden="true"></span>
Contato
```

Essa correção foi aplicada em mais de 30 ícones em todo o site. É fácil esquecer ícones dentro de componentes como StatBar, Callout, ServiceCard e ProcessFigure, então preste atenção.

---

## Notificação de leitor de tela para links externos

Links externos que abrem com `target="_blank"` são visualmente reconhecíveis como abrindo em nova aba, mas não são comunicados aos usuários de leitores de tela.

### Solução

Adicione texto complementar visualmente oculto aos links externos.

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  Example
  <span class="sr-only">(abre em nova aba)</span>
</a>
```

Usando o plugin `rehype-external-links`, `target="_blank"` e `rel` podem ser adicionados automaticamente aos links externos no Markdown. O texto de notificação para leitores de tela é adicionado no lado do template.

---

## Garantia de contraste

A indicação mais comum do PageSpeed Insights é contraste insuficiente.

### Problemas comuns

Usar `text-slate-400` na paleta de cores do UnoCSS resulta em uma razão de contraste de aproximadamente 3:1 contra fundo branco, não atendendo ao critério WCAG AA de 4.5:1.

### Solução

Alterar `text-slate-400` → `text-slate-500` (razão de contraste 4.6:1) resolve o critério. Como é frequentemente usado em textos auxiliares como datas e legendas, verifique em todo o site.

---

## Estilos focus-visible

Para usuários que operam o site pelo teclado, o indicador de foco é a única pista para saber "onde estou agora". WCAG 2.4.7 exige indicação de foco.

### Implementação com UnoCSS

Configure estilos de foco comuns para botões e links. Usando a funcionalidade de atalhos do UnoCSS, uma única definição se aplica a todo o site.

```typescript
shortcuts: {
  'ac-btn': '... focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none',
}
```

`focus-visible` é uma pseudo-classe que não exibe o anel ao clicar com o mouse, mostrando-o apenas durante operação por teclado. A UX é melhor que `focus`, então use esta opção.

### Elementos frequentemente esquecidos

- Botão copiar
- Botão scroll to top
- Botão fechar de anúncio âncora
- Botão fechar de modal

---

## Sublinhado em links inline

O PageSpeed tem uma indicação de que "links são identificáveis apenas pela cor". Isso é um problema para usuários com restrições de percepção de cores que não conseguem distinguir links.

### Solução

Altere o sublinhado de apenas hover para sempre visível. Recomendamos unificar com atalhos do UnoCSS.

```typescript
shortcuts: {
  'ac-link': 'underline decoration-brand-300 underline-offset-2 hover:decoration-brand-500 transition-colors',
}
```

---

## Acessibilidade de formulários

Para formulários de contato e outras situações onde o usuário precisa inserir dados, a acessibilidade é especialmente importante.

### Validação inline

Exiba mensagens de erro imediatamente nos eventos `blur` / `input` e integre os seguintes atributos aria:

- `aria-invalid="true"` — notifica que a entrada é inválida
- `aria-describedby` — referencia o ID da mensagem de erro

```html
<input
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<p id="email-error" role="alert">Por favor, insira um endereço de e-mail válido</p>
```

### Marcação de campos obrigatórios

Apenas a marca visual `*` não é suficiente. Adicione texto complementar para leitores de tela.

```html
<span aria-hidden="true">*</span>
<span class="sr-only">(obrigatório)</span>
```

---

## Atributo role em elementos figure

Ao definir `role="img"` em elementos `<figure>`, os elementos filhos ficam ocultos para leitores de tela. Em componentes que contêm ícones e texto descritivo (InsightGrid, ProcessFigure, Timeline), altere para `role="group"` para manter o conteúdo interno acessível.

---

## Atributo role em elementos de lista

Quando `list-style: none` é definido via CSS, há um bug conhecido onde o leitor de tela do Safari (VoiceOver) não reconhece como lista.

Adicione `role="list"` aos elementos `<ol>` / `<ul>` do breadcrumb, sidebar e footer para contornar o problema. Verifique todas as listas com aparência personalizada.

---

## Outras melhorias

### Atributos width/height em imagens

Imagens sem `width` e `height` explícitos causam CLS (Cumulative Layout Shift) quando o layout muda ao completar o carregamento. Especifique o tamanho para todas as imagens, incluindo avatares (32×32, 48×48, 64×64px) e thumbnails do YouTube (480×360px).

### aria-live no slider Hero

Sliders com troca automática não comunicam as mudanças aos usuários de leitores de tela. Prepare uma região `aria-live="polite"` e notifique com texto como "Slide 1 / 4: 〇〇".

### aria-labelledby em dialog

Elementos `<dialog>` devem referenciar o ID do elemento de título com `aria-labelledby`, permitindo que o leitor de tela leia o propósito do modal.

### aria-current na paginação

Defina `aria-current="page"` no número da página atual, notificando ao leitor de tela que é a "página atual".

### Atualização de aria-label no botão copiar

Ao copiar com sucesso para a área de transferência, atualize dinamicamente o `aria-label` para "Copiado" e notifique a mudança de estado ao leitor de tela.

---

## Conclusão

Melhorias de acessibilidade são individualmente pequenas mudanças, mas quando acumuladas, melhoram significativamente a qualidade geral do site. As três mais eficazes foram:

1. **Aplicação global de focus-visible**: melhoria drástica na navegação por teclado
2. **Correção da razão de contraste**: apenas `text-slate-400` → `text-slate-500` e WCAG AA aprovado
3. **Notificação SR para links externos**: aplicação automática em todos os links combinando com `rehype-external-links`

Recomendamos começar escaneando seu site com axe DevTools e resolvendo primeiro os problemas detectáveis automaticamente.

---

## Série que inclui este artigo

Este artigo faz parte da série "[Guia de melhoria de qualidade do site Astro](/blog/website-improvement-batches/)". Melhorias de performance, SEO e UX também são apresentadas em artigos individuais.
