---
title: 'Renderizar links Markdown com segurança em respostas de chat com IA'
description: 'Nota de implementação sobre converter links Markdown em respostas de IA para HTML seguro. Separar parsing tolerante a espaços, trim de href, allowlist, renderização DOM, fallback e testes torna o padrão reutilizável em outros sites.'
date: 2026-06-07T14:30
author: gui
tags: ['技術', 'Webサイト', 'AI', 'セキュリティ', 'Astro']
image: https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: Ponto principal
  text: Respostas de IA não são HTML confiável. Mesmo usando links Markdown, faça trim da URL, valide com uma allowlist e mantenha links não permitidos como texto.
processFigure:
  title: Fluxo de renderização de links
  steps:
    - title: Text
      description: Trate a resposta do modelo primeiro como texto puro.
      icon: i-lucide-message-square-text
      accent: brand
    - title: Parse
      description: Detecte apenas o Markdown que o chat realmente usa.
      icon: i-lucide-brackets
      accent: amber
    - title: Validate
      description: Faça trim do href e permita apenas URLs internas ou domínios aprovados.
      icon: i-lucide-shield-check
      accent: emerald
    - title: Render
      description: Crie elementos seguros com DOM API em vez de innerHTML.
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: Decisões que precisam ficar separadas
  before:
    label: Renderização frouxa
    items:
      - Colocar respostas de IA diretamente em innerHTML
      - Tentar implementar Markdown completo de uma vez
      - Falhar quando há espaços ao redor da URL
      - 'Tratar URLs externas e javascript: da mesma forma'
  after:
    label: Renderização pequena e segura
    items:
      - Receber respostas como texto e converter só o necessário em DOM
      - Suportar apenas o subconjunto usado no chat
      - Validar URLs depois de trim
      - Manter URLs não permitidas como texto
checklist:
  title: Checklist de implementação
  items:
    - text: Não confiar em respostas de IA como HTML
    - text: Aceitar espaços ao redor de URLs Markdown
    - text: Sempre fazer trim de href antes de validar
    - text: Permitir apenas paths internos, origin atual e domínios necessários
    - text: Definir target e rel em links externos
    - text: Preservar links não permitidos como texto
    - text: Testar URLs perigosas e Markdown quebrado
linkCards:
  - href: /blog/astro-ai-contact-chat/
    title: Design técnico do chat de contato com IA
    description: Artigo base sobre respostas de IA, fronteira de API e controle de prompt.
    icon: i-lucide-sparkles
  - href: /blog/cloudflare-pages-security/
    title: Segurança no Cloudflare Pages
    description: Artigo relacionado sobre CSP e cabeçalhos de segurança.
    icon: i-lucide-shield
  - href: /contact/
    title: Contato
    description: Página real onde o chat de IA e o formulário ficam.
    icon: i-lucide-message-square
faq:
  title: Perguntas frequentes
  items:
    - question: Usar markdown-it ou marked basta?
      answer: Mesmo com biblioteca, ainda é preciso decidir como tratar HTML, quais destinos de link permitir, como adicionar target e rel e como rejeitar URLs perigosas. Para chat, um renderizador pequeno pode bastar.
    - question: Permitir espaços ao redor da URL é perigoso?
      answer: O risco não está nos espaços. O ponto importante é validar o href depois do trim. Assim o renderizador tolera variações do modelo sem afrouxar a allowlist.
    - question: Links não permitidos devem ser removidos?
      answer: Normalmente deixá-los como texto ajuda a depurar e preserva contexto. Se a política exigir ocultar strings suspeitas, remover o link inteiro também é válido.
---

Quando um chat com IA responde `Veja [Serviços]( /services/ )`, o link pode não ser renderizado e o Markdown bruto pode permanecer na tela.

Acecore encontrou esse caso no chat de contato e ajustou o renderizador em [o PR que corrigiu a renderização de links Markdown](https://github.com/acecore-systems/acecore-net/pull/99).

Este artigo usa essa correção pequena como ponto de partida para converter respostas de IA em DOM com segurança.

## Respostas de IA não são HTML confiável

Trate a saída do modelo como texto.

Links, negrito e listas são úteis, mas inserir a resposta em `innerHTML` faz o navegador interpretar qualquer string gerada pelo modelo.

Não é necessário implementar Markdown completo. É melhor detectar só os recursos suportados pelo chat e criar apenas nós DOM seguros.

## O problema não é só espaço

O bug direto era um link assim:

```md
[Serviços](/services/)
```

Uma regex rígida costuma assumir que a URL não tem espaços:

```js
;/\[([^\]]+)\]\(([^)\s]+)\)/
```

`[^)\s]+` rejeita espaços, então `( /services/ )` não vira link. A correção é permitir espaços dentro dos parênteses e normalizar depois.

```js
;/\[([^\]]+)\]\(\s*([^)]+?)\s*\)/
```

Depois disso, a validação continua obrigatória.

## Faça trim antes de validar

O fluxo deve ser:

1. Extrair label e raw href
2. Aplicar `trim()` no raw href
3. Validar o href com allowlist
4. Criar `<a>` apenas se for permitido

```js
const href = String(rawHref || '').trim()

if (label && isSafeMarkdownHref(href)) {
  const link = document.createElement('a')
  link.href = href
  link.rel = 'noopener noreferrer'

  if (/^https?:\/\//i.test(href)) {
    link.target = '_blank'
  }

  link.textContent = label
  parent.appendChild(link)
}
```

Valide o mesmo valor que será renderizado. Caso contrário, a checagem perde valor.

## A allowlist depende do site

Cada produto deve decidir quais URLs a IA pode mostrar.

| Tipo            | Exemplo                   | Decisão                             |
| --------------- | ------------------------- | ----------------------------------- |
| Path interno    | `/services/`              | Permitir                            |
| Mesmo origin    | `https://acecore.net/...` | Permitir                            |
| LINE oficial    | `https://lin.ee/...`      | Permitir quando for o canal oficial |
| mailto          | `mailto:info@acecore.net` | Só endereço fixo                    |
| tel             | `tel:05088902788`         | Só número fixo                      |
| Outros externos | Qualquer URL              | Não linkar por padrão               |

```js
function isSafeMarkdownHref(href) {
  if (href.startsWith('/')) return true

  try {
    const url = new URL(href, window.location.origin)
    if (url.origin === window.location.origin) return true
    if (url.hostname === 'acecore.net') return true
    if (url.hostname === 'lin.ee') return true
  } catch {
    return false
  }

  return href === 'mailto:info@acecore.net' || href === 'tel:05088902788'
}
```

Um site de recrutamento pode liberar portais de vaga; um SaaS pode liberar documentação e status page. A função deve refletir o produto.

## Faça fallback para texto

Se um link falha na validação, normalmente é melhor preservar o Markdown como texto do que apagá-lo.

O usuário mantém contexto, e a equipe consegue ver o que o modelo tentou emitir. O renderizador deve criar links seguros e também falhar de forma segura.

## Teste os casos errados

Inclua pelo menos:

| Entrada                            | Resultado esperado                           |
| ---------------------------------- | -------------------------------------------- |
| `[Serviços](/services/)`           | Link interno                                 |
| `[Serviços]( /services/ )`         | Link interno após trim                       |
| `[LINE]( https://lin.ee/example )` | Link externo permitido                       |
| `[Ruim](javascript:alert(1))`      | Não vira link                                |
| `[Externo](https://example.com/)`  | Não vira link se o domínio não for permitido |
| `[Quebrado](/services/`            | Mostra como texto                            |

No PR #99, as variações com e sem espaços foram confirmadas como a mesma URL pretendida.

## Não implemente todo Markdown por padrão

Para chat, geralmente basta:

- Parágrafos
- Listas
- Negrito
- Código inline
- Links

Tabelas, imagens, HTML bruto e notas de rodapé aumentam muito a responsabilidade. Mesmo com uma biblioteca, a política de HTML e links precisa ser definida separadamente.

## Resumo

Renderizar links Markdown em respostas de IA parece um ajuste pequeno, mas define o limite de confiança na saída do modelo.

A regra prática é: texto primeiro, subconjunto pequeno, trim antes da validação, allowlist rígida e fallback seguro.
