---
title: 'Como gerir um blog em 9 idiomas publicando apenas um artigo em japonês'
description: 'Um guia do fluxo de trabalho que gera automaticamente artigos traduzidos em japonês + 8 idiomas, executa compilações e gere a fusão automática — tudo desencadeado apenas pela atualização de um artigo em japonês no Pages CMS através do GitHub Actions e GitHub Copilot.'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: /uploads/acecore-generated/blog-copilot-translation-pipeline.webp
callout:
  type: info
  title: Conclusão primeiro
  text: 'Com o site atual da Acecore, podes automatizar a gestão de um blog em japonês + 8 idiomas usando GitHub Actions e GitHub Copilot, tratando os artigos em japonês como a fonte canónica.'
processFigure:
  title: O fluxo de 1 artigo em japonês para operação em 9 idiomas
  steps:
    - title: Atualizar a fonte em japonês
      description: Edita apenas o artigo em japonês através do Pages CMS ou Markdown e faz push para main.
      icon: i-lucide-pencil-line
    - title: Criar diretamente uma tarefa de PR de tradução
      description: O GitHub Actions cria uma tarefa de Copilot com o caminho de origem e os idiomas de destino incorporados.
      icon: i-lucide-git-branch
    - title: Copilot cria PRs de tradução
      description: Ao receber a tarefa, o Copilot gera os ficheiros de tradução e abre um PR de tradução.
      icon: i-lucide-git-pull-request
    - title: Compilar e fundir automaticamente
      description: Após uma compilação bem-sucedida, o PR de tradução que cumpre todas as condições é fundido automaticamente.
      icon: i-lucide-check-check
compareTable:
  title: Fluxo de trabalho de tradução manual vs. automatizado
  before:
    label: Fluxo de trabalho de tradução manual
    items:
      - Alguém cria manualmente tarefas de tradução após a publicação de um artigo
      - Os responsáveis são atribuídos por idioma
      - As compilações e as decisões de fusão são geridas por pessoas
      - Tarefas duplicadas e limpeza de PRs tendem a acumular-se
  after:
    label: Fluxo de trabalho de tradução automatizado
    items:
      - Um push ao artigo em japonês desencadeia todo o fluxo
      - Uma tarefa de PR de tradução do Copilot é criada diretamente
      - Os PRs de tradução são fundidos automaticamente após uma compilação bem-sucedida
      - A criação duplicada é prevenida com um marcador no corpo do PR
checklist:
  title: O que precisas antes de começar
  items:
    - text: Uma estrutura de conteúdo com o japonês como fonte de tradução
    - text: Uma regra de disposição de ficheiros de tradução como src/content/blog/{locale}/{slug}.md
    - text: GitHub Actions com permissão de leitura em pull requests
    - text: Um COPILOT_AGENT_TOKEN que possa chamar a API do agente de codificação do Copilot
    - text: Um comando de compilação estável como npm run build
faq:
  title: Perguntas frequentes
  items:
    - question: Ao fazer push de um artigo em japonês, os artigos noutros idiomas serão criados automaticamente?
      answer: 'Sim. O site atual da Acecore suporta 9 idiomas — `ja`, `en`, `zh-cn`, `es`, `pt`, `fr`, `ko`, `de`, `ru` — portanto, fazer push de um artigo em japonês pode desencadear a criação de tarefas de PR de tradução do Copilot para os restantes 8 idiomas, a criação de PRs de tradução, a compilação e a fusão automática. Mesmo sem ficheiros de tradução, cada URL de idioma é servida com um fallback em japonês, pelo que podes publicar primeiro e substituir por traduções reais depois.'
    - question: Por que criar uma tarefa de PR diretamente sem passar por um issue?
      answer: 'Como o resultado do trabalho de tradução é um PR, fixar o caminho de origem, o idioma de destino e as condições de tradução diretamente no enunciado do problema da tarefa do Copilot e no marcador do corpo do PR torna o fluxo mais curto. Ao pesquisar PRs abertos com o marcador, também podes prevenir a criação duplicada para o mesmo caminho de origem.'
    - question: A fusão automática não é arriscada?
      answer: 'A fusão automática incondicional é arriscada. Ao limitá-la apenas a PRs de tradução — exigindo que o Copilot tenha criado o PR, que o título comece com [translation], que a compilação tenha sido bem-sucedida e que não seja um rascunho — podes mantê-la de forma bastante segura.'
---

Indo direto ao assunto: com este site, publicar apenas um artigo em japonês no Pages CMS é suficiente para eventualmente ter esse artigo disponível em japonês mais 8 outros idiomas. O GitHub Actions e o GitHub Copilot tratam da criação de tarefas de PR de tradução, criação de PRs de tradução, compilação e fusão automática.

O operador só precisa de gerir os artigos em japonês e a informação dos autores no dia a dia. Como já não é necessário apresentar manualmente tarefas de tradução ou organizar PRs de cada vez, isto reduz significativamente o fardo de gerir um blog multilingue.

## Pré-requisitos para esta abordagem

Esta abordagem assume que a seguinte infraestrutura já está em vigor no lado do Astro.

- Roteamento em 9 idiomas (ja, en, zh-cn, es, pt, fr, ko, de, ru)
- Um fallback que serve conteúdo em japonês para páginas sem traduções
- Uma configuração operacional onde os artigos em japonês e a informação dos autores podem ser atualizados através do Pages CMS

Para saber como configurar esta infraestrutura, consulta [Tornar um site Astro 6 compatível com 9 idiomas — Tradução automática de 168 artigos de blog e arquitetura multilingue](/blog/astro-i18n-blog-translation/). Este artigo foca-se apenas em como sobrepor o fluxo de trabalho de tradução automática do Copilot sobre essa base.

## O que isto permite

Da perspetiva do operador, há apenas 2 ecrãs com os quais interages regularmente. Neste artigo, usamos os ecrãs do Pages CMS como estão, tornando imediatamente claro **quais ecrãs são usados nas operações diárias**.

![Ecrã da lista de blog em japonês do Pages CMS](/uploads/pagescms-blog-ja-live-20260329.png)

O primeiro ecrã é a lista de blog em japonês do Pages CMS. Aqui podes ver as datas de publicação e a informação dos autores enquanto adicionas ou atualizas apenas os artigos em japonês. A chave é manter o modo de "tocar apenas no japonês fonte", sem ter de entrar nos ecrãs de edição de cada idioma de cada vez.

![Ecrã do formulário de informação do autor do Pages CMS](/uploads/pagescms-authors-live-20260329.png)

O segundo ecrã é o formulário de informação do autor. Ao atualizar apenas os campos base em japonês no CMS para os dados do autor, e deixar o fluxo automatizado do GitHub gerir o `i18n` para as traduções, a separação das responsabilidades operacionais fica bastante clara.

## Casos em que esta abordagem funciona melhor

Como pré-requisito, isto é especialmente eficaz para equipas e sites como os seguintes.

- Queres que o japonês seja a fonte de tradução
- O teu blog é gerido em Markdown
- Apresentar manualmente tarefas de tradução de cada vez é uma chatice
- Estás confortável a deixar que a IA gira um bom grau de qualidade de tradução
- Mas queres parar os PRs que falham na compilação ou que ficam como rascunhos

Pelo contrário, se tens uma configuração editorial completamente independente por idioma, um fluxo de trabalho diferente pode ser mais adequado.

## Passo 1. Fixar os artigos em japonês como fonte de tradução

A primeira coisa a decidir é "qual ficheiro é a fonte de tradução." A ambiguidade aqui quebrará a tua automatização.

A "fonte de tradução" neste artigo refere-se ao **ficheiro em japonês que é editado primeiro e serve como base para artigos e dados derivados em cada idioma**.

Nesta configuração, a fonte e o destino são divididos da seguinte forma.

- Fonte do artigo de blog: `src/content/blog/{slug}.md`
- Destino do artigo de blog: `src/content/blog/{locale}/{slug}.md`
- Fonte da informação do autor: `src/content/authors/{authorId}.json`
- Destino da informação do autor: o campo `i18n` em `src/content/authors/{authorId}.json`
- Fonte da definição de etiqueta: `src/content/tags/{tagId}.json`
- Destino da definição de etiqueta: o campo `i18n` em `src/content/tags/{tagId}.json`

Uma estrutura de diretório aproximadamente como a seguinte é fácil de trabalhar.

```text
src/content/blog/
  my-post.md
  another-post.md
  en/
    my-post.md
  zh-cn/
    my-post.md
  fr/
    my-post.md
```

A chave é **manter o slug do ficheiro de tradução alinhado com o slug do artigo fonte em japonês**. Só isso torna fácil identificar automaticamente o alvo de tradução a partir do caminho de origem.

Neste repo, mesmo quando os ficheiros de tradução ainda não existem, o URL de cada idioma ainda é gerado usando um fallback em japonês. Isso significa que podes operar no modo de "publicar o artigo em japonês primeiro, e deixar os PRs de tradução alcançarem depois".

## Passo 2. Converter os push de artigos em japonês em tarefas de PR de tradução

O próximo passo é usar o GitHub Actions para detetar alterações nos artigos em japonês e criar diretamente tarefas de PR de tradução do Copilot.

Os requisitos mínimos são:

- Monitorizar pushes para `main`
- Apenas criar tarefas automaticamente para `src/content/blog/*.md`
- Apenas criar tarefas quando o corpo do artigo muda, não apenas o frontmatter
- Se existir um PR aberto com o mesmo caminho de origem, não criar um novo
- Incorporar o caminho de origem como marcador na tarefa do Copilot e no corpo do PR

A informação dos autores e as definições de etiquetas são alvos de tradução, mas não criar tarefas automaticamente em pushes normais. Executá-los apenas através de `workflow_dispatch` quando explicitamente necessário evita que PRs desnecessários se acumulem.

Por exemplo, incluir comentários como este no corpo do PR torna-o reutilizável para deteção de duplicados posterior.

```md
<!-- translation-source:src/content/blog/my-post.md -->
<!-- translation-kind:blog-post -->
```

A filtragem básica no lado do workflow tem este aspeto.

```yaml
on:
  push:
    branches:
      - main
    paths:
      - src/content/blog/*.md
```

Além disso, comparando apenas o corpo Markdown para decidir quando criar tarefas de PR de tradução, podes evitar gerar acidentalmente uma enxurrada de PRs a partir de pequenos ajustes como atualizar uma data de publicação ou uma etiqueta.

O importante aqui é **fixar as condições de tradução na entrada da tarefa de PR e no marcador do corpo do PR**. Mesmo sem passar por um issue, podes transmitir o caminho de origem, o idioma de destino e as condições de tradução ao Copilot, e usar a pesquisa de PRs abertos para evitar duplicados para o mesmo caminho de origem.

## Passo 3. Criar tarefas de PR através da API do agente de codificação do Copilot

No lado do GitHub Actions, após detetar uma alteração, lança-se uma tarefa à API do agente de codificação do Copilot.

Há 2 coisas a fazer.

1. Adicionar `COPILOT_AGENT_TOKEN` como segredo do repositório
2. Chamar a API de trabalhos do Copilot para cada caminho de origem alterado

Conceitualmente, passas um título e um enunciado do problema à API de trabalhos do Copilot.

```json
{
  "title": "[translation] Translate my-post.md",
  "problem_statement": "Translate src/content/blog/my-post.md into all requested locales...",
  "event_type": "translation-pr"
}
```

Neste ponto, mantém a auto-criação regular limitada apenas a artigos, e executa informações de autores e definições de etiquetas apenas através de dispatch manual quando necessário, para manter as operações estáveis. Indicar explicitamente as regras — campos `i18n` em `src/content/authors/{authorId}.json` para informação de autores, `i18n.name` em `src/content/tags/{tagId}.json` para definições de etiquetas, e ficheiros de mesmo nome em `src/content/blog/{locale}/` para artigos — reduz erros.

## Passo 4. Compilar PRs de tradução e fundi-los automaticamente

A automatização incondicional não é segura aqui. A recomendação é tornar apenas os PRs que satisfaçam todas as seguintes condições elegíveis para fusão.

- O PR foi criado pelo Copilot
- O título começa com `[translation]`
- Aponta para `main`
- Não é um rascunho
- A compilação foi bem-sucedida

Nesta configuração, o processo é dividido em 2 etapas.

1. `Translation PR Build`
2. `Merge Translation PR`

O head do PR é compilado quando fica pronto para revisão, e se for bem-sucedido, é fundido imediatamente por squash. Como não depende da proteção de ramos do GitHub, é fácil de gerir mesmo em repos pequenos.

### Condições a impor para a fusão automática

Ao adicionar fusão automática, estas são as condições mínimas recomendadas.

- Excluir qualquer coisa que não seja um PR de tradução
- Parar em caso de falha de compilação
- Parar enquanto for um rascunho
- Excluir PRs não criados pelo Copilot

Com estas 4 condições em vigor, podes evitar em grande medida o acidente de incluir PRs de desenvolvimento normal na rede de fusão automática.

## Passo 5. Prevenir duplicados com marcadores no corpo do PR

Quando não se passa por issues, o controlo de duplicados move-se para o lado do PR.

A abordagem é simples: antes de criar uma tarefa, faz o seguinte.

1. Derivar um marcador `translation-source:` do caminho de origem
2. Pesquisar no GitHub PRs abertos com esse mesmo marcador
3. Se existir um PR aberto, não criar uma tarefa
4. Se não existir um PR aberto, criar uma tarefa de PR de tradução do Copilot

A razão para incorporar o caminho de origem no corpo do PR é que olhar apenas para os ficheiros alterados de um PR de tradução torna difícil fazer uma pesquisa inversa fiável do ficheiro japonês original. **Tornar o caminho de origem explícito como marcador** evita criar múltiplos PRs de tradução para o mesmo artigo.

## Notas

### Direcionar o idioma de saída do Copilot para o japonês

Se queres estabilizar o idioma de saída do Copilot no lado do GitHub, usar instruções a nível de repositório é a abordagem mais direta.

Isso significa colocar `.github/copilot-instructions.md`.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

Com apenas este ficheiro em vigor, o idioma padrão e o contexto quando o agente de codificação do Copilot cria PRs torna-se consideravelmente mais estável.

## Resumo

O núcleo desta configuração é transformar a tradução de "algo que os humanos pedem de cada vez" num **processo de rotina subordinado a pushes de fontes em japonês**.

Aqui está o fluxo mais uma vez.

1. Escrever apenas o artigo em japonês
2. Um push cria diretamente uma tarefa de PR de tradução
3. Copilot cria um PR de tradução
4. Compilar o PR de tradução e fundi-lo automaticamente
5. Prevenir duplicados com marcadores no corpo do PR

Uma vez que isto está totalmente montado, a sensação do lado do operador é bastante natural. **Uma vez que fazes push do artigo em japonês, os artigos noutros idiomas são criados um a um no lado do GitHub**.

Claro que, na prática, passa por passos assíncronos — criação de tarefas, criação de PRs, compilação e fusão — por isso não acontece tudo "instantaneamente". Mas o operador já não precisa de apresentar manualmente tarefas de tradução ou organizar PRs de cada vez.

Este artigo em si está estruturado para que a versão em japonês possa ser alimentada neste fluxo como ponto de partida. Se estás a gerir um site multilingue de forma contínua, começar com aproximadamente este nível de automatização é provavelmente o mais adequado.
