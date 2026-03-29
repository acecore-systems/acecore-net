---
title: 'Como gerir um blog em 9 idiomas publicando apenas um artigo em japonês'
description: 'Um guia do fluxo de trabalho que gera automaticamente artigos traduzidos em japonês + 8 idiomas, executa compilações e gere a fusão automática — tudo desencadeado apenas pela atualização de um artigo em japonês no Pages CMS através do GitHub Actions e GitHub Copilot.'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
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
    - title: Criar issues de tradução automaticamente
      description: O GitHub Actions cria issues com o caminho de origem e os idiomas de destino incorporados.
      icon: i-lucide-ticket
    - title: Copilot cria PRs de tradução
      description: Ao receber o issue, o Copilot gera os ficheiros de tradução e abre um PR de tradução.
      icon: i-lucide-git-pull-request
    - title: Compilar, fundir e fechar o issue
      description: Após uma compilação bem-sucedida, o PR é fundido automaticamente e o issue de tradução pai é fechado automaticamente.
      icon: i-lucide-check-check
compareTable:
  title: Fluxo de trabalho de tradução manual vs. automatizado
  before:
    label: Fluxo de trabalho de tradução manual
    items:
      - Alguém cria manualmente tarefas de tradução após a publicação de um artigo
      - Os responsáveis são atribuídos por idioma
      - As compilações e as decisões de fusão são geridas por pessoas
      - Os issues pai são frequentemente esquecidos e ficam abertos
  after:
    label: Fluxo de trabalho de tradução automatizado
    items:
      - Um push ao artigo em japonês desencadeia todo o fluxo
      - Atribuído automaticamente ao Copilot
      - Os PRs de tradução são fundidos automaticamente após uma compilação bem-sucedida
      - Os issues pai são fechados automaticamente após a fusão
checklist:
  title: O que precisas antes de começar
  items:
    - text: Uma estrutura de conteúdo com o japonês como fonte de tradução
    - text: Uma regra de disposição de ficheiros de tradução como src/content/blog/{locale}/{slug}.md
    - text: GitHub Actions com permissão de escrita em issues
    - text: Um COPILOT_AGENT_TOKEN que possa chamar a API de atribuição do Copilot
    - text: Um comando de compilação estável como npm run build
faq:
  title: Perguntas frequentes
  items:
    - question: Ao fazer push de um artigo em japonês, os artigos noutros idiomas serão criados automaticamente?
      answer: 'Sim. O site atual da Acecore suporta 9 idiomas — `ja`, `en`, `zh-cn`, `es`, `pt`, `fr`, `ko`, `de`, `ru` — portanto, fazer push de um artigo em japonês pode desencadear a criação de issues de tradução para os restantes 8 idiomas, a atribuição ao Copilot, a criação de PRs de tradução, a compilação, a fusão automática e o fechamento de issues. Mesmo sem ficheiros de tradução, cada URL de idioma é servida com um fallback em japonês, pelo que podes publicar primeiro e substituir por traduções reais depois.'
    - question: Por que criar um issue primeiro em vez de abrir diretamente um PR?
      answer: 'Porque permite fixar o caminho de origem, o idioma de destino e as condições de tradução no issue. Isso torna muito mais fácil a re-execução, a revisão do histórico e a recuperação de falhas.'
    - question: A fusão automática não é arriscada?
      answer: 'A fusão automática incondicional é arriscada. Ao limitá-la apenas a PRs de tradução — exigindo que o Copilot tenha criado o PR, que o título comece com [translation], que a compilação tenha sido bem-sucedida e que não seja um rascunho — podes mantê-la de forma bastante segura.'
---

Indo direto ao assunto: com este site, publicar apenas um artigo em japonês no Pages CMS é suficiente para eventualmente ter esse artigo disponível em japonês mais 8 outros idiomas. O GitHub Actions e o GitHub Copilot tratam da criação de issues de tradução, criação de PRs de tradução, compilação, fusão automática e fechamento do issue pai.

O operador só precisa de gerir os artigos em japonês e a informação dos autores no dia a dia. Como já não é necessário apresentar manualmente tarefas de tradução ou organizar PRs de cada vez, isto reduz significativamente o fardo de gerir um blog multilingue.

## Pré-requisitos para esta abordagem

Esta abordagem assume que a seguinte infraestrutura já está em vigor no lado do Astro.

- Roteamento em 9 idiomas (ja, en, zh-cn, es, pt, fr, ko, de, ru)
- Um fallback que serve conteúdo em japonês para páginas sem traduções
- Uma configuração operacional onde os artigos em japonês e a informação dos autores podem ser atualizados através do Pages CMS

Para saber como configurar esta infraestrutura, consulta [Tornar um site Astro 6 compatível com 9 idiomas — Tradução automática de 136 artigos de blog e arquitetura multilingue](/blog/astro-i18n-blog-translation/). Este artigo foca-se apenas em como sobrepor o fluxo de trabalho de tradução automática do Copilot sobre essa base.

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

## Passo 2. Converter os push de artigos em japonês em issues de tradução

O próximo passo é usar o GitHub Actions para detetar alterações nos artigos em japonês e criar automaticamente issues de tradução.

Os requisitos mínimos são:

- Monitorizar pushes para `main`
- Apenas criar issues automaticamente para `src/content/blog/*.md`
- Apenas criar issues quando o corpo do artigo muda, não apenas o frontmatter
- Se existir um issue aberto com o mesmo caminho de origem, atualizá-lo em vez de criar um novo
- Incorporar o caminho de origem como marcador no corpo do issue

A informação dos autores e as definições de etiquetas são alvos de tradução, mas não criar issues automaticamente em pushes normais. Executá-los apenas através de `workflow_dispatch` quando explicitamente necessário evita que issues desnecessários se acumulem.

Por exemplo, incluir comentários como este no corpo do issue torna-o reutilizável na automatização posterior.

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

Além disso, comparando apenas o corpo Markdown para decidir quando criar issues de tradução, podes evitar gerar acidentalmente uma enxurrada de issues a partir de pequenos ajustes como atualizar uma data de publicação ou uma etiqueta.

O importante aqui não é "criar traduções diretamente", mas **criar um issue primeiro**. Ao inserir um issue, o caminho de origem, o idioma de destino e as condições de tradução ficam fixos de uma forma visível tanto para humanos como para IA.

## Passo 3. Atribuir automaticamente issues de tradução ao Copilot

Apenas criar o issue ainda deixa trabalho manual, portanto aqui é onde atribuis automaticamente o Copilot.

Há 2 coisas a fazer.

1. Adicionar `COPILOT_AGENT_TOKEN` como segredo do repositório
2. Chamar a API de atribuição após a criação do issue

Conceitualmente, fazes patch ao issue para definir o Copilot como cessionário.

```json
{
  "assignees": ["copilot-swe-agent[bot]"],
  "agent_assignment": {
    "target_repo": "OWNER/REPO",
    "base_branch": "main",
    "custom_instructions": "Translate the Japanese source article..."
  }
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

## Passo 5. Fechar automaticamente o issue de tradução pai após a fusão

A última peça que mantém as operações limpas é fechar automaticamente o issue pai após uma fusão.

A abordagem é simples: para PRs de tradução fundidos, faz o seguinte.

1. Obter os ficheiros alterados do PR
2. Também ler o caminho de origem do corpo do PR
3. Pesquisar issues abertos correspondentes ao marcador `translation-source:`
4. Adicionar um comentário e fechar

A razão para também olhar para o caminho de origem do corpo do PR é que depender apenas dos ficheiros alterados de PRs criados pelo Copilot pode por vezes tornar a pesquisa inversa da fonte pouco fiável. **Usar tanto os ficheiros alterados como o corpo do PR** mantém a estabilidade.

## Notas

### Direcionar o idioma dos PRs e issues do Copilot para o japonês

Se queres estabilizar o idioma de saída do Copilot no lado do GitHub, usar instruções a nível de repositório é a abordagem mais direta.

Isso significa colocar `.github/copilot-instructions.md`.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

Com apenas este ficheiro em vigor, o idioma padrão e o contexto quando o agente de codificação do Copilot cria issues e PRs torna-se consideravelmente mais estável.

## Resumo

O núcleo desta configuração é transformar a tradução de "algo que os humanos pedem de cada vez" num **processo de rotina subordinado a pushes de fontes em japonês**.

Aqui está o fluxo mais uma vez.

1. Escrever apenas o artigo em japonês
2. Um push cria automaticamente issues de tradução
3. Atribuir automaticamente ao Copilot
4. Compilar o PR de tradução e fundi-lo automaticamente
5. Fechar automaticamente o issue pai

Uma vez que isto está totalmente montado, a sensação do lado do operador é bastante natural. **Uma vez que fazes push do artigo em japonês, os artigos noutros idiomas são criados um a um no lado do GitHub**.

Claro que, na prática, passa por passos assíncronos — criação de issues, execução do Copilot, criação de PRs, compilação e fusão — por isso não acontece tudo "instantaneamente". Mas o operador já não precisa de apresentar manualmente tarefas de tradução ou esquecer-se de fechar PRs de cada vez.

Este artigo em si está estruturado para que a versão em japonês possa ser alimentada neste fluxo como ponto de partida. Se estás a gerir um site multilingue de forma contínua, começar com aproximadamente este nível de automatização é provavelmente o mais adequado.
