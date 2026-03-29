---
title: 'Como manter um blog em 9 idiomas publicando apenas um artigo em japonês'
description: 'Um guia sobre como atualizar apenas artigos em japonês no Pages CMS e gerar automaticamente traduções em japonês + 8 idiomas usando GitHub Actions e GitHub Copilot, incluindo build e merge automático.'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: Conclusão primeiro
  text: 'Com o site atual do Acecore, você pode automatizar a operação de um blog em japonês + 8 idiomas usando GitHub Actions e GitHub Copilot, com artigos em japonês como fonte de tradução.'
processFigure:
  title: Fluxo de 1 artigo em japonês para operação em 9 idiomas
  steps:
    - title: Atualizar a fonte em japonês
      description: Editar apenas o artigo em japonês via Pages CMS ou Markdown e enviar para o main.
      icon: i-lucide-pencil-line
    - title: Criar issues de tradução automaticamente
      description: O GitHub Actions cria issues com o caminho de origem e os idiomas-alvo incorporados.
      icon: i-lucide-ticket
    - title: Copilot cria PRs de tradução
      description: Ao receber o issue, gera os arquivos de tradução e abre um PR de tradução.
      icon: i-lucide-git-pull-request
    - title: Build, merge e fechar issues
      description: Após um build bem-sucedido, o merge automático é executado e o issue de tradução pai é fechado automaticamente.
      icon: i-lucide-check-check
compareTable:
  title: Comparação entre operação manual e automática
  before:
    label: Operação de tradução manual
    items:
      - Alguém cria manualmente tarefas de tradução após publicar um artigo
      - Atribuir uma pessoa por idioma
      - Decisões de build e merge também são manuais
      - Issues pai ficam facilmente sem fechar
  after:
    label: Operação de tradução automática
    items:
      - Um push do artigo em japonês desencadeia tudo
      - Automaticamente atribuído ao Copilot
      - PRs de tradução são mesclados automaticamente após build bem-sucedido
      - Issues pai também são fechados automaticamente após o merge
checklist:
  title: Pré-requisitos antes de começar
  items:
    - text: Estrutura de conteúdo usando o japonês como fonte de tradução
    - text: Uma regra de localização de arquivos de tradução como src/content/blog/{locale}/{slug}.md
    - text: GitHub Actions com permissão de escrita em issues
    - text: COPILOT_AGENT_TOKEN que pode chamar a API de atribuição do Copilot
    - text: Um comando de build estável como npm run build
faq:
  title: Perguntas frequentes
  items:
    - question: Se eu publicar um artigo em japonês, artigos em outros idiomas serão criados automaticamente?
      answer: 'Sim. O site atual do Acecore suporta 9 idiomas — ja, en, zh-cn, es, pt, fr, ko, de, ru — então publicar um artigo em japonês aciona automaticamente a criação de issues de tradução para os 8 idiomas restantes, atribuição ao Copilot, criação de PRs de tradução, build, merge automático e fechamento de issues. Mesmo que os arquivos de tradução ainda não existam, cada URL de idioma pode ser servida com japonês como fallback, então você pode publicar primeiro e substituir com traduções reais depois.'
    - question: Por que criar um issue em vez de criar diretamente um PR?
      answer: 'Porque você pode fixar o caminho de origem, os idiomas-alvo e as condições de tradução no issue. Quando uma diferença aparecer depois, re-execução, verificação de histórico e recuperação de falhas se tornam muito mais fáceis.'
    - question: O merge automático é seguro?
      answer: 'O merge automático incondicional é perigoso. Ao restringir apenas a PRs de tradução e exigir que todos os seguintes condições sejam atendidas: criado pelo Copilot, título começando com [translation], build bem-sucedido e não ser um rascunho, pode-se torná-lo bastante seguro.'
---

Em resumo, neste site você pode publicar um artigo em japonês uma vez pelo Pages CMS e ter artigos de blog em japonês + 8 outros idiomas alinhados sequencialmente. O GitHub Actions e o GitHub Copilot cuidam da criação de issues de tradução, criação de PRs de tradução, build, merge automático e fechamento de issues pai.

As operações diárias requerem apenas o trabalho com artigos em japonês e informações de autores. Como você não precisa mais criar manualmente tarefas de tradução ou organizar PRs toda vez, a carga de gerenciar um blog multilíngue é significativamente reduzida.

## Pré-requisitos para esta abordagem

Como pré-requisito, esta abordagem assume que você já tem a seguinte infraestrutura no lado do Astro.

- Roteamento em 9 idiomas (ja, en, zh-cn, es, pt, fr, ko, de, ru)
- Fallback para exibir japonês em páginas sem tradução
- Operações para atualizar artigos em japonês e informações de autores pelo Pages CMS

Como construir a infraestrutura em si está coberto em [Fazendo um site Astro 6 suportar 9 idiomas — Tradução automática de 136 artigos de blog e arquitetura multilíngue](/blog/astro-i18n-blog-translation/). Este artigo foca apenas em como sobrepor as operações de tradução automática com Copilot sobre isso.

## O que você pode fazer

Do lado das operações, normalmente há duas telas com as quais você interage. Desta vez usamos a tela do Pages CMS como está, deixando imediatamente claro **onde interagir nas operações diárias**.

![Tela de lista de blog japonês do Pages CMS](/uploads/pagescms-blog-ja-live-20260329.png)

A primeira tela é a lista de blog japonês do Pages CMS. Aqui você visualiza datas de publicação e autores enquanto adiciona e atualiza apenas artigos em japonês. A chave é orientar as operações para **tocar apenas a fonte de tradução japonesa**, sem ter que entrar na tela de edição de múltiplos idiomas toda vez.

![Tela do formulário de informações de autor do Pages CMS](/uploads/pagescms-authors-live-20260329.png)

A segunda tela é o formulário de informações de autor. Ao atualizar apenas os campos baseados em japonês no CMS para dados de autor e deixar a tradução `i18n` para o fluxo de automação do GitHub, a separação de responsabilidades operacionais se torna bastante limpa.

## Quando esta abordagem funciona melhor

Como premissa, esta abordagem é especialmente eficaz para equipes ou sites como os seguintes.

- Querem usar o japonês como fonte de tradução
- O blog é gerenciado em Markdown
- Criar manualmente tarefas de tradução toda vez é trabalhoso
- Estão dispostos a confiar na IA para a qualidade de tradução até certo ponto
- Mas querem parar PRs que falham no build ou permanecem como rascunhos

Por outro lado, se cada idioma tem uma estrutura de edição completamente independente, uma abordagem diferente pode ser mais adequada.

## Passo 1. Fixar a fonte de tradução aos artigos em japonês

A primeira coisa a decidir é "qual arquivo usar como fonte de tradução." Se isso for ambíguo, a automação quebra.

A "fonte de tradução" neste artigo significa **o arquivo japonês que é editado primeiro e serve como padrão para artigos e dados derivados em cada idioma**.

Nesta configuração, os seguintes são divididos em fonte de tradução e destino de tradução.

- Fonte de tradução de artigos do blog: `src/content/blog/{slug}.md`
- Destino de tradução de artigos do blog: `src/content/blog/{locale}/{slug}.md`
- Fonte de tradução de informações de autores: `src/data/authors.json`
- Destino de tradução de informações de autores: `i18n` em `src/data/authors.json`

A estrutura de diretórios é mais fácil de lidar se parecer aproximadamente assim.

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

A chave é **alinhar o slug dos arquivos de tradução com o artigo original em japonês**. Só isso facilita a identificação automática do alvo de tradução a partir do caminho de origem.

Neste repo, mesmo que os arquivos de tradução ainda não existam, as URLs de idioma em si são geradas com o japonês como fallback. Isso significa que você pode operar com "publicar o artigo em japonês primeiro, então deixar os PRs de tradução alcançarem depois."

## Passo 2. Converter pushes de artigos em japonês em issues de tradução

O próximo passo é detectar mudanças nos artigos em japonês com o GitHub Actions e criar automaticamente issues de tradução.

No mínimo, você precisa do seguinte.

- Monitorar pushes para `main`
- Direcionar apenas `src/content/blog/*.md` e `src/data/authors.json`
- Atualizar um issue aberto existente com o mesmo caminho de origem em vez de criar um novo
- Incorporar o caminho de origem como marcador no corpo do issue

Por exemplo, inserir um comentário como este no corpo do issue permite reutilização na automação downstream.

```md
<!-- translation-source:src/content/blog/my-post.md -->
<!-- translation-kind:blog-post -->
```

A filtragem básica no lado do workflow se parece com isso.

```yaml
on:
  push:
    branches:
      - main
    paths:
      - src/content/blog/*.md
      - src/data/authors.json
```

O importante aqui não é "criar traduções diretamente" mas **criar um issue primeiro**. Ao inserir uma etapa de issue, você pode fixar o caminho de origem, os idiomas-alvo e as condições de tradução de uma forma visível tanto para humanos quanto para a IA.

## Passo 3. Atribuir automaticamente issues de tradução ao Copilot

Criar apenas um issue ainda deixa trabalho manual, então aqui você atribui automaticamente ao Copilot.

Há duas coisas a fazer.

1. Adicionar `COPILOT_AGENT_TOKEN` aos secrets do repositório
2. Chamar a API de atribuição após criar o issue

Conceitualmente, você faz um patch no issue e define o Copilot como assignee.

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

Neste ponto, manter as `custom_instructions` separadas para artigos vs. informações de autores estabiliza a precisão. Especificar que as informações de autores devem tocar apenas `i18n` em `src/data/authors.json`, e que artigos devem criar um arquivo com o mesmo nome em `src/content/blog/{locale}/`, reduz erros.

## Passo 4. Build de PRs de tradução e merge automático

Esta parte é mais segura se você não a tornar automação incondicional. A recomendação é mesclar apenas PRs que satisfaçam todas as seguintes condições.

- PR foi criado pelo Copilot
- Título começa com `[translation]`
- Direcionado para `main`
- Não é um rascunho
- Build foi bem-sucedido

Nesta configuração, está dividido em dois estágios.

1. `Translation PR Build`
2. `Merge Translation PR`

Quando um PR se torna pronto para revisão, constrói seu head, e se bem-sucedido, realiza um squash merge. Como isso não depende da proteção de branch do GitHub, é fácil de lidar mesmo para repos pequenos.

### Condições para restringir o merge automático

Ao adicionar merge automático, as seguintes condições são as mínimas recomendadas.

- Excluir tudo exceto PRs de tradução
- Parar se o build falhar
- Parar enquanto estiver em rascunho
- Excluir PRs criados por qualquer pessoa que não seja o Copilot

Com esses quatro em vigor, você pode evitar em grande parte acidentes onde PRs de desenvolvimento normal também ficam envolvidos.

## Passo 5. Fechar automaticamente issues de tradução pai após o merge

A última coisa a adicionar que torna as operações limpas é o fechamento automático de issues pai.

O método é simples — para PRs de tradução mesclados, faça o seguinte.

1. Obter os arquivos alterados no PR
2. Ler o caminho de origem no corpo do PR
3. Pesquisar issues abertos correspondentes ao marcador `translation-source:`
4. Adicionar um comentário e fechar

A razão para também olhar o caminho de origem no corpo do PR é que, dependendo da situação, olhar apenas os arquivos alterados de PRs criados pelo Copilot pode tornar a pesquisa reversa da fonte fraca. **Usar tanto os arquivos alterados quanto o corpo do PR** dá resultados estáveis.

## Notas complementares

### Direcionando o texto de PRs e issues do Copilot para o japonês

Se você quiser estabilizar o idioma de saída do Copilot no lado do GitHub, usar instruções de todo o repositório é a abordagem mais direta.

Simplesmente coloque um `.github/copilot-instructions.md`.

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

Com apenas este arquivo, o idioma padrão e o contexto quando o agente de codificação Copilot cria issues e PRs se estabiliza consideravelmente.

## Resumo

A chave desta configuração é transformar a tradução de "algo que as pessoas pedem toda vez" em **um processo de rotina dependente do envio da fonte japonesa**.

Aqui está o fluxo mais uma vez.

1. Escrever apenas o artigo em japonês
2. O push cria automaticamente um issue de tradução
3. Atribuir automaticamente ao Copilot
4. Construir o PR de tradução e merge automático
5. Fechar automaticamente o issue pai também

Uma vez que você tenha isso em vigor, a sensação operacional é bastante direta. **Basta enviar um artigo em japonês, e os artigos em outros idiomas serão concluídos em sequência no lado do GitHub**.

Claro, na prática o fluxo assíncrono de criação de issues, execução do Copilot, criação de PRs, build e merge leva tempo, então não tudo acontece "instantaneamente." No entanto, o pessoal de operações não precisa mais criar manualmente tarefas de tradução toda vez ou esquecer de fechar PRs.

Este artigo em si está estruturado para que possa ser alimentado a este fluxo com a versão japonesa como base. Se você está operando continuamente um site multilíngue, começar com este nível de automação é provavelmente o mais adequado.
