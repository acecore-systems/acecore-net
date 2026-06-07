---
title: 'Guia de instalação do Sveltia CMS'
description: 'Guia prático para adicionar Sveltia CMS a um site Astro ou estático, cobrindo GitHub backend, OAuth Worker, uploads de imagem, operação multilíngue, PRs de CMS e aprendizados reais.'
date: 2026-06-07T16:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'CMS', 'Astro', 'Cloudflare', 'セキュリティ']
image: /uploads/acecore-generated/blog-cms-selection-and-turnstile.webp
processFigure:
  title: Fluxo de instalação do Sveltia CMS
  description: A área administrativa, autenticação, conteúdo editável, mídia e fluxo de PR devem ser pensados separadamente.
  steps:
    - title: Adicionar o admin
      description: Coloque index.html e config.yml em public/admin e carregue o Sveltia CMS.
      icon: i-lucide-layout
      accent: brand
    - title: Configurar GitHub
      description: Defina repo, branch, OAuth Worker e mensagens de commit antes de começar a editar.
      icon: i-lucide-git-branch
      accent: emerald
    - title: Limitar o escopo editável
      description: Exponha apenas blog, autores, tags e JSON fonte em japonês que devem ser editados pelo CMS.
      icon: i-lucide-file-text
      accent: amber
    - title: Automatizar a operação
      description: Conecte a branch cms-content, PRs de CMS e tarefas de tradução sem misturar com desenvolvimento normal.
      icon: i-lucide-git-pull-request
      accent: slate
compareTable:
  title: Antes e depois do CMS
  before:
    label: Markdown editado manualmente
    items:
      - Só quem usa GitHub ou editor atualiza com facilidade
      - Caminhos de imagem, IDs de autor e tags são digitados à mão
      - Fonte japonesa e traduções podem ser misturadas
      - Preview pode ler conteúdo da main por engano
  after:
    label: Edição com Sveltia CMS
    items:
      - Markdown e JSON são editados em formulários no navegador
      - relation, image e select reduzem valores inválidos
      - Apenas commits de CMS disparam tarefas de tradução
      - runtime config troca a branch do CMS entre preview e produção
callout:
  type: note
  title: Premissa deste guia
  text: Sveltia CMS é uma aplicação de administração que roda no navegador e edita Markdown e JSON por meio de um backend Git. Usamos o site Acecore como exemplo, mas o desenho se aplica a muitos sites Astro.
checklist:
  title: Checklist de instalação
  items:
    - text: Carregar Sveltia CMS em public/admin/index.html
      checked: true
    - text: Definir GitHub backend e collections em public/admin/config.yml
      checked: true
    - text: Usar OAuth Worker para edição por várias pessoas
      checked: true
    - text: Alinhar media_folder e public_folder ao diretório public do Astro
      checked: true
    - text: Decidir como commits de CMS acionam tradução ou publicação
      checked: true
faq:
  title: Perguntas frequentes
  items:
    - question: Para que tipo de site o Sveltia CMS serve?
      answer: Ele funciona bem para sites estáticos onde Markdown ou JSON ficam no repositório, como Astro, Hugo e VitePress. Assim é possível adicionar CMS sem banco de dados externo.
    - question: Posso usar só um Personal Access Token do GitHub?
      answer: Pode, mas para várias pessoas ou editores não técnicos, um OAuth Worker é mais seguro e fácil de explicar. A Acecore usa Cloudflare Worker como cliente OAuth.
    - question: Devo editar todos os idiomas no CMS?
      answer: Em uma equipe pequena, é mais seguro editar apenas a fonte japonesa e atualizar traduções por PR. Expor todos os idiomas dificulta revisão e detecção de traduções desatualizadas.
---

Sveltia CMS é útil quando você quer adicionar uma tela de edição a um site estático sem mover conteúdo para um banco externo. Este guia resume como ele foi introduzido no site Astro da Acecore e quais ajustes aprendemos com PRs e commits reais.

O título é simples de propósito: **Guia de instalação do Sveltia CMS**. A meta é ajudar quem quer usar o CMS em outro site, não comparar ferramentas de forma abstrata.

## Quando usar Sveltia CMS

Sveltia CMS não controla um banco de dados próprio nem entrega conteúdo por API separada. Ele é um app de administração em SPA que edita arquivos do repositório por meio do GitHub backend.

Ele combina bem quando:

- o conteúdo vive como Markdown ou JSON no repositório
- mudanças de artigo, autor, tag e textos de página devem ser revisadas como Git diff
- você não quer adicionar banco de dados ou serviço administrativo separado
- uploads podem ficar em `public/uploads`
- mudanças do CMS devem passar por Pull Request antes de produção

Se você precisa de permissões editoriais complexas, publicação agendada avançada, grande DAM ou edição em tempo real, um headless CMS completo pode ser melhor.

## Arquitetura geral

```text
public/admin/index.html
  -> carrega @sveltia/cms via CDN

public/admin/config.yml
  -> define GitHub backend, collections e pastas de mídia

workers/sveltia-cms-auth
  -> Cloudflare Worker para GitHub OAuth

cms-content branch
  -> branch onde o CMS salva edições

.github/workflows/cms-content-pr.yml
  -> abre PR de cms-content para main

.github/workflows/create-translation-prs.yml
  -> cria tarefas de tradução apenas para commits cms:
```

Instalar a página de admin é só a primeira etapa. Autenticação, mídia, preview, tradução e merge strategy precisam ser parte do desenho.

## 1. Colocar o admin em `public/admin`

No Astro, arquivos em `public` são servidos como estáticos. A documentação do Sveltia CMS também aponta `public` como pasta estática para Astro, Next.js, Nuxt, Remix e VitePress.

```html
<!doctype html>
<html lang="pt">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex,nofollow" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CMS</title>
  </head>
  <body>
    <script src="https://unpkg.com/@sveltia/cms@0.166.0/dist/sveltia-cms.js"></script>
  </body>
</html>
```

Não adicione CSS extra ou `type="module"` sem motivo. O bundle do Sveltia CMS já inclui os estilos da UI.

Na Acecore usamos inicialização manual para trocar a branch em previews.

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
    },
  },
})
```

## 2. Configurar GitHub backend

O mínimo é `backend.name` e `backend.repo`, mas em produção defina também branch, OAuth e mensagens de commit.

```yaml
backend:
  name: github
  repo: owner/repository
  branch: cms-content
  base_url: https://your-sveltia-cms-auth-worker.example.workers.dev
  auth_methods: [oauth]
  commit_messages:
    create: 'cms: create {{collection}} "{{slug}}"'
    update: 'cms: update {{collection}} "{{slug}}"'
    delete: 'cms: delete {{collection}} "{{slug}}"'
    uploadMedia: 'cms: upload "{{path}}"'
    deleteMedia: 'cms: delete media "{{path}}"'
```

Para sites pessoais, salvar direto na `main` pode bastar. Para sites corporativos ou multilíngues, uma branch dedicada como `cms-content` ajuda na revisão.

## 3. Adicionar OAuth Worker

Personal Access Token é suficiente para teste, mas não é a melhor opção para vários editores. A Acecore usa Sveltia CMS Authenticator em Cloudflare Workers e aponta `base_url` para esse Worker.

O callback do GitHub OAuth App aponta para `/callback` no Worker. O Worker recebe `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` e, se necessário, `ALLOWED_DOMAINS`.

Isso é diferente de Turnstile. OAuth protege login do CMS; Turnstile protege formulários ou APIs contra bots.

## 4. Definir a pasta de mídia cedo

Sveltia CMS pode salvar mídia dentro do repositório. Em Astro, o caminho prático é:

```yaml
media_folder: public/uploads
public_folder: /uploads
```

A Acecore corrigiu esse ponto depois no [PR #116](https://github.com/acecore-systems/acecore-net/pull/116). A lição é decidir o caminho no repositório e a URL pública antes dos primeiros uploads.

## 5. Separar collections

| collection | Alvo                           | Política                                   |
| ---------- | ------------------------------ | ------------------------------------------ |
| `blog`     | `src/content/blog/*.md`        | Editar só artigos fonte em japonês         |
| `authors`  | `src/content/authors/*.json`   | Editar perfis e nomes localizados          |
| `tags`     | `src/content/tags/*.json`      | Editar tags e nomes localizados            |
| page text  | `src/i18n/source/ja/**/*.json` | Editar texto fonte japonês de páginas e UI |

Não exponha todos os Markdown traduzidos sem necessidade. A Acecore mantém o japonês como fonte canônica e atualiza traduções por [Como operar um blog multilíngue com Sveltia CMS](/pt/blog/copilot-translation-pipeline/).

## 6. Usar relation e select

Tags devem ser selecionadas por relation, não digitadas livremente.

```yaml
- name: tags
  label: Tags
  widget: relation
  collection: tags
  value_field: name
  display_fields: ['{{name}} ({{id}})']
  search_fields: [name, id]
  multiple: true
  required: false
```

Autores, ícones e tons de aviso seguem a mesma lógica. CMS bom não só permite editar; ele dificulta salvar valores quebrados.

## 7. Editar JSON fonte em japonês

Textos fixos também podem entrar no CMS. A Acecore centraliza a fonte japonesa em `src/i18n/source/ja/**/*.json` e expõe por página.

O cuidado é não adicionar todos os campos de uma vez. `config.yml` cresce rapidamente. Comece por blog, autores, tags, avisos e páginas que mudam com frequência.

## 8. Preview deve ler a branch certa

Se o CMS em um preview do Cloudflare Pages ainda lê `main`, ele mostra conteúdo diferente do preview. A Acecore gera `public/admin/runtime-config.js` antes do build e injeta a branch atual.

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
    },
  },
})
```

## 9. Criar PRs de uma branch CMS

Salvar em `cms-content` e abrir PR para `main` mantém a revisão clara.

```yaml
on:
  push:
    branches:
      - cms-content
```

O modo de merge importa. As traduções dependem de subjects como `cms: create ...` e `cms: update ...`. Se um squash merge apaga esses subjects, a automação pode não detectar a mudança. Para PRs de CMS, preserve os commits `cms:` com merge commit ou rebase merge.

## 10. Tradução só para commits CMS

O [PR #98](https://github.com/acecore-systems/acecore-net/pull/98) adicionou `--cms-only`, para que tarefas de tradução por push só sejam criadas com commits CMS.

```javascript
function isCmsCommitSubject(subject) {
  return /^cms: (create|update|delete) /.test(subject || '')
}
```

`cms:` é um contrato de workflow, não decoração.

## 11. CSP próprio para `/admin`

O admin precisa conectar ao CDN, GitHub API, OAuth Worker e blob URLs. Por isso, a Acecore separa a CSP de `/admin/*` e marca a área como `noindex`.

## Separar Turnstile

A versão antiga misturava seleção de CMS e Cloudflare Turnstile. Isso confundia o assunto.

Sveltia CMS trata de backend GitHub, OAuth, collections, mídia e PRs. Turnstile trata de reduzir bots em formulários ou APIs. São camadas diferentes.

## Lições de PRs e commits

- Ao mudar o CMS, atualize também artigos e links internos.
- OAuth deve fazer parte do setup real.
- Caminhos de mídia devem ser definidos antes de uploads.
- `config.yml` deve crescer por etapas.
- `cms:` é contrato de automação.
- Preview precisa deixar clara a branch lida pelo CMS.

## Ponto inicial mínimo

```text
public/admin/index.html
public/admin/config.yml
public/admin/init.js
public/admin/runtime-config.js
```

Depois adicione relations de autores e tags, imagens, JSON fonte, PRs automáticos de CMS e tarefas de tradução.

## Referências

- [Sveltia CMS Getting Started](https://sveltiacms.app/en/docs/start)
- [Sveltia CMS GitHub Backend](https://sveltiacms.app/en/docs/backends/github)
- [Sveltia CMS Internal Media Storage](https://sveltiacms.app/en/docs/media/internal)
- [Sveltia CMS Manual Initialization](https://sveltiacms.app/en/docs/api/initialization)
- [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth)

## Resumo

Sveltia CMS é simples de colocar em `public/admin`, mas a instalação de produção exige decidir branch, OAuth, pastas de mídia, política de idioma fonte, workflow de tradução e merge strategy. Com essas regras claras, um site Astro continua estático e leve, mas ganha uma operação de conteúdo muito mais utilizável.
