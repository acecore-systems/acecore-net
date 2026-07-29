---
title: 'Sveltia CMS導入ガイド'
description: 'Astroなどの静的サイトにSveltia CMSを導入し、GitHub OAuth、専用GitHub App、検証付き直接公開、画像アップロード、多言語運用まで整える手順と反省点をまとめます。'
date: 2026-06-07T16:00
lastUpdated: 2026-07-28T12:00
author: gui
tags: ['技術', 'CMS', 'Astro', 'Cloudflare', 'セキュリティ']
image: /uploads/acecore-generated/blog-cms-selection-and-turnstile.webp
processFigure:
  title: Sveltia CMS導入の流れ
  description: 静的サイトにCMSを足すときは、管理画面、編集者認証、保存actor、編集対象、画像、公開方法を分けて設計します。
  steps:
    - title: 管理画面を置く
      description: public/admin に index.html と config.yml を置き、Sveltia CMS本体を読み込みます。
      icon: i-lucide-layout
      accent: brand
    - title: GitHub backendを設定する
      description: repo、branch、OAuth Worker、commit messageを決め、どのブランチへ保存するかを固定します。
      icon: i-lucide-git-branch
      accent: emerald
    - title: 編集対象を絞る
      description: ブログ、著者、タグ、日本語source JSONなど、CMSで触る範囲だけをcollectionにします。
      icon: i-lucide-file-text
      accent: amber
    - title: 運用を自動化する
      description: mainをpublication branchにし、同期検証付きdirect commit、Pages deploy、翻訳PR taskをつなぎます。
      icon: i-lucide-git-commit
      accent: slate
compareTable:
  title: CMS導入前後の違い
  before:
    label: Markdownを直接編集
    items:
      - GitHubやエディタを使える人しか更新しにくい
      - 画像パス、著者ID、タグ名を手入力しがち
      - 日本語sourceと翻訳ファイルの更新範囲が混ざる
      - CMSの保存先や書き込み可能pathが曖昧になりやすい
  after:
    label: Sveltia CMSで編集
    items:
      - ブラウザからMarkdownやJSONをフォーム編集できる
      - relation、image、selectで入力ミスを減らせる
      - CMS commitだけを翻訳PR taskの対象にできる
      - 同一origin proxyが内容を同期検証してmainへ直接保存する
callout:
  type: note
  title: この記事の前提
  text: Sveltia CMSはCMS用のSPAを静的ファイルとして置き、GitHub APIでリポジトリ上のMarkdownやJSONを編集する構成です。本文ではAcecore公式サイトでの実装を例にしつつ、他のAstroサイトにも転用できる形で整理します。
checklist:
  title: 導入時のチェックリスト
  items:
    - text: public/admin/index.html にSveltia CMS本体を読み込む
      checked: true
    - text: public/admin/config.yml でGitHub backendとcollectionsを定義する
      checked: true
    - text: 複数人運用ならOAuth Workerのbase_urlを設定する
      checked: true
    - text: media_folder と public_folder をAstroのpublic配下に合わせる
      checked: true
    - text: direct CMS commit、Pages deploy、翻訳PR taskの関係を決める
      checked: true
faq:
  title: よくある質問
  items:
    - question: Sveltia CMSはどんなサイトに向いていますか？
      answer: MarkdownやJSONをGitで管理している静的サイトに向いています。Astro、Hugo、VitePressのようにコンテンツをリポジトリ内に置く構成なら、外部DBなしでCMS編集画面を追加できます。
    - question: GitHubのPersonal Access Tokenだけで運用できますか？
      answer: できますが、複数人や非エンジニアが使うならOAuth Workerを用意したほうが安全で説明しやすいです。AcecoreではCloudflare Workers上のOAuthクライアントをbase_urlに設定しています。
    - question: 多言語サイトでは全言語をCMSで編集させるべきですか？
      answer: 小規模チームでは日本語sourceだけをCMSで編集し、翻訳はPRで反映するほうが事故が少ないです。全言語をCMSに出すと、翻訳差分、レビュー、古い訳の検知が難しくなります。
---

Sveltia CMSは、静的サイトに「編集画面」を後付けしたいときに使いやすいGitベースCMSです。この記事では、Acecore公式サイトでの導入をもとに、AstroサイトへSveltia CMSを入れる手順と、実際のPRやコミットで後から直した反省点をまとめます。

> **2026年7月28日更新:** Acecoreの現行運用は、CMS保存ごとの短命branchとPRから、同期検証付きの`main`直接commitへ移行しました。GitHub OAuthは編集者本人とwrite権限の確認、サイト専用GitHub Appはrepository操作に分離し、保存前にJSON / Markdown schema、画像の実形式、危険なHTMLやURL、最新HEADを検証します。

タイトルはシンプルに **Sveltia CMS導入ガイド** としました。読み手に伝えたいことも同じで、CMS比較の読み物ではなく、「自分のサイトにも入れるなら何を決めればいいか」が分かる実装メモです。

## Sveltia CMSが向いているサイト

Sveltia CMSは、WordPressのようにCMS側がデータベースと表示APIを持つタイプではありません。CMS画面はブラウザ上で動くSPAで、GitHub backendを通じてリポジトリ内のファイルを編集します。

そのため、次のようなサイトと相性が良いです。

- Astro、Hugo、VitePressなど、MarkdownやJSONをリポジトリで管理している
- 記事、著者、タグ、固定ページ文言をGit差分としてレビューしたい
- 外部DBや独自管理画面を増やさず、静的サイトのまま運用したい
- 画像もリポジトリ内の `public/uploads` などに置きたい
- CMS保存から待たずに公開を始めつつ、コード変更はPull Requestで保護したい

逆に、会員ごとの権限管理、予約投稿の複雑な承認フロー、大量の画像アセット、リアルタイムなデータ編集が必要なら、別のヘッドレスCMSや独自管理画面を検討したほうがよいです。

## 全体構成

Acecore公式サイトでは、Sveltia CMSを次のような構成で動かしています。

```text
public/admin/index.html
  -> @sveltia/cms をCDNから読み込む

public/admin/config.yml
  -> GitHub backend、編集collection、画像保存先を定義

workers/sveltia-cms-auth
  -> GitHub OAuth用のCloudflare Worker

main branch
  -> 公開ソースの唯一の正

CMS save proxy
  -> 許可pathと内容を同期検証し、expected-HEAD付きのcms: commitをmainへ直接保存

.github/workflows/create-translation-prs.yml
  -> direct pushのcms: commitだけを翻訳PR taskの対象にする
```

最初は「CMSを置けば終わり」に見えますが、実際には認証、画像、preview、翻訳、PRの作り方まで含めて設計しないと運用で詰まります。

## 1. 管理画面を `public/admin` に置く

Astroでは `public` 配下が静的ファイルとしてそのまま配信されます。Sveltia CMSの公式ドキュメントでも、AstroやNext.jsなどの静的ファイル置き場は `public` とされています。

最小構成はこのような形です。

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="robots" content="noindex,nofollow" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>CMS</title>
  </head>
  <body>
    <script src="https://unpkg.com/@sveltia/cms@0.172.4/dist/sveltia-cms.js"></script>
  </body>
</html>
```

ここで余計なCSSや `type="module"` を足さないのがポイントです。Sveltia CMSは必要なスタイルをJavaScript bundleに含めており、現在の配布形態では通常のscriptとして読み込むのが素直です。

Acecoreでは設定を明示的に上書きできるよう、`window.CMS_MANUAL_INIT = true` と `CMS.init()` を使っています。publication branchは環境にかかわらず `main` に固定します。

```html
<script src="/admin/runtime-config.js"></script>
<script src="https://unpkg.com/@sveltia/cms@0.172.4/dist/sveltia-cms.js"></script>
<script src="/admin/init.js"></script>
```

```javascript
CMS.init({
  config: {
    backend: {
      branch: 'main',
    },
  },
})
```

## 2. GitHub backendを設定する

Sveltia CMSでGitHubリポジトリを編集する最小設定は `backend.name` と `backend.repo` です。実運用では、branch、OAuth、commit messageも最初に決めておいたほうが安全です。

```yaml
backend:
  name: github
  repo: owner/repository
  branch: main
  base_url: https://your-sveltia-cms-auth-worker.example.workers.dev
  api_root: /admin/api/github
  graphql_api_root: /admin/api/graphql
  auth_methods: [oauth]
  commit_messages:
    create: 'cms: create {{collection}} "{{slug}}"'
    update: 'cms: update {{collection}} "{{slug}}"'
    delete: 'cms: delete {{collection}} "{{slug}}"'
    uploadMedia: 'cms: upload "{{path}}"'
    deleteMedia: 'cms: delete media "{{path}}"'
```

publication branchは `main` に固定し、readとsaveを同一originのAPI proxyへ向けます。proxyは保存直前にGitHub userのwrite権限を再確認し、repository操作は`acecore-net`専用GitHub Appへ分離します。変更path、JSON / Markdown schema、画像の実形式、危険なHTMLやURL、最新のmain HEADを同期検証してから、expected-HEAD付きの`cms:` commitを`main`へ直接作成します。

2026年7月28日時点で、Sveltia CMSのEditorial Workflowは未実装です。Decap CMS向けの `publish_mode: editorial_workflow` には依存せず、同一origin proxyで保存範囲、内容、競合を制御します。

`cms-content` のような恒久branchを別本流にすると、`main` との同期、競合、deploy元の誤設定を継続的に管理する必要があります。Acecoreでは`main`だけを本番ソースの正にし、同時更新は`expectedHeadOid`で上書きせず409にします。

## 3. OAuth Workerを用意する

Personal Access Tokenを使うだけならセットアップは早いです。ただし、非エンジニアや複数人で使うCMSにPATを配るのは避けたいところです。

Acecoreでは、Sveltia CMS AuthenticatorをCloudflare Workersで動かし、`base_url` にWorker URLを設定しています。

```yaml
backend:
  name: github
  repo: acecore-systems/acecore-net
  branch: main
  base_url: https://sveltia-cms-auth.example.workers.dev
  api_root: /admin/api/github
  graphql_api_root: /admin/api/graphql
  auth_methods: [oauth]
```

GitHub OAuth App側では、callback URLをWorkerの `/callback` に向けます。Worker側には `GITHUB_CLIENT_ID`、`GITHUB_CLIENT_SECRET`、必要なら `ALLOWED_DOMAINS` を環境変数として設定します。

ここはCMS本体とは別の認証レイヤーです。Cloudflare Turnstileのようなbot対策とは役割が違います。Turnstileは問い合わせフォームやコメント投稿APIの保護に使い、CMSログインにはGitHub OAuthを使う、と分けて考えるほうが整理しやすいです。

## 4. 画像アップロード先を最初に決める

Sveltia CMSのinternal media storageは、リポジトリ内に画像を保存します。Astroなら、公開URLとして配信したい画像は `public` 配下に置くのが自然です。

```yaml
media_folder: public/uploads
public_folder: /uploads
```

この設定を曖昧にすると、画像が記事ディレクトリ相対で保存されたり、Markdownから参照したときのURLと実ファイルの場所がずれたりします。

Acecoreでも後から [PR #116](https://github.com/acecore-systems/acecore-net/pull/116) でCMS画像アップロードの保存先を修正しました。反省点は単純で、CMSを導入した時点で「保存場所」と「公開URL」をセットで決めるべきでした。

記事フロントマターには外部URL用の `image` と、アップロード画像用の `uploadedImage` を分けています。

```yaml
- name: image
  label: 外部画像URL
  widget: string
  required: false

- name: uploadedImage
  label: アップロード画像
  widget: image
  required: false
```

この分け方にしておくと、Unsplashのような外部画像と、CMSからアップロードした画像を同じ記事スキーマで扱えます。

## 5. 編集対象をcollectionに分ける

Sveltia CMSの設計で一番大事なのは、どのファイルをCMSで触らせるかです。Acecoreでは大きく4種類に分けています。

| collection | 対象                           | 方針                                 |
| ---------- | ------------------------------ | ------------------------------------ |
| `blog`     | `src/content/blog/*.md`        | 日本語ソース記事だけを編集           |
| `authors`  | `src/content/authors/*.json`   | 著者情報とロケール別表示を編集       |
| `tags`     | `src/content/tags/*.json`      | タグ名とロケール別表示を編集         |
| page text  | `src/i18n/source/ja/**/*.json` | 固定ページや共通UIの日本語文言を編集 |

ポイントは、多言語記事をCMSで直接編集させないことです。

9言語分のMarkdownをCMSに並べることもできますが、日常運用では「どの言語が最新か」「どの訳だけ古いか」「日本語のどの差分に追従すべきか」が分かりにくくなります。

このサイトでは、日本語記事と日本語source JSONをCMSの正とし、翻訳は [Sveltia CMSで多言語ブログを運用する方法](/blog/copilot-translation-pipeline/) に流す運用にしました。

## 6. relationとselectで入力ミスを減らす

Markdownをフォーム化するときは、自由入力を減らすほど運用が安定します。

たとえば、記事のタグは文字列入力ではなく `tags` collectionへのrelationにしています。

```yaml
- name: tags
  label: タグ
  widget: relation
  collection: tags
  value_field: name
  display_fields: ['{{name}} ({{id}})']
  search_fields: [name, id]
  multiple: true
  required: false
```

著者も同じで、`src/content/authors` のIDをrelationで選ばせます。告知バナーやリンクカードのアイコンはselectにして、使える値をCMS側で限定します。

ここは後からかなり改善しました。最初は自由入力でも動きますが、記事数や編集者が増えると、タグ表記ゆれ、存在しない著者ID、使えないアイコン名のような小さなミスが増えます。CMSの価値は「ブラウザで編集できること」だけでなく、「壊れた値を入れにくくすること」にあります。

## 7. 日本語source JSONもCMSで編集できるようにする

ブログだけでなく、固定ページの文言もCMS化できます。Acecoreでは、日本語の固定ページ文言を `src/i18n/source/ja/**/*.json` に集約し、CMSからページ単位で編集できるようにしました。

このときの反省点は、最初に設定を増やしすぎたことです。`public/admin/config.yml` にページ文言フィールドを大量に並べると、後から既存値の読み込みや表示ラベルの調整が難しくなります。

実際に `Sveltia CMSでページ文言を編集可能にする` の後、`CMSページ文言の既存値読み込みを安定化` という修正を入れています。CMS設定は、最初から全ページを完璧に出すより、よく更新するページから段階的に広げるほうが安全です。

おすすめは次の順番です。

1. ブログ記事
2. 著者とタグ
3. トップページの告知やキャンペーン
4. お問い合わせ、サービス紹介など更新頻度の高い固定ページ
5. 最後に共通UI文言

固定ページ文言をCMS化するときは、日本語sourceを勝手に翻訳ファイルへ直書きしない運用も決めておきます。翻訳側はPRで更新するほうが、レビューと差分追跡が楽です。

## 8. writer認証情報はproductionだけに置く

CMSから`main`へ直接保存できるGitHub AppのClient ID、Installation ID、private keyはCloudflare Pagesのproduction環境だけに設定します。previewにはwriter認証情報を配布せず、repository read/writeを無効にします。コンテンツの編集と公開は本番の`/admin/`から行い、previewはコードやCMS設定を変更する通常PRの確認に使います。

Acecoreでは、ビルド前に `public/admin/runtime-config.js` を生成し、手動初期化だけを有効にしています。

```javascript
await writeFile(
  'public/admin/runtime-config.js',
  'window.CMS_MANUAL_INIT = true;\n',
  'utf8',
)
```

そして `init.js` 側でbranchだけ上書きします。

```javascript
CMS.init({
  config: {
    backend: {
      branch: 'main',
    },
  },
})
```

productionのpublication branchは`main`に固定し、proxyは`main`以外をbaseにするrequestを拒否します。preview側も設定表示の整合性確認のためbranchは`main`のままですが、writer認証情報がないため保存はできません。

## 9. 保存proxyで内容を検証して直接公開する

CMSの「保存」を公開開始として扱い、同一origin proxyが許可pathと保存内容を同期検証してから`main`へ1 commitだけ作成します。

```yaml
backend:
  name: github
  repo: owner/repository
  branch: main
  api_root: /admin/api/github
  graphql_api_root: /admin/api/graphql
```

proxyはGraphQLの`createCommitOnBranch`をそのまま中継しません。GitHub OAuthで編集者本人とwrite権限を保存直前に確認し、repository read/writeには`acecore-net`だけへインストールした専用GitHub Appの短期tokenを使います。許可されたcontentと画像だけを同じcommitへまとめ、JSON / Markdown schema、画像magic bytes、危険なHTMLやURLを検証します。SVGとPDFはCMS upload対象外です。

保存には編集開始時のHEADを`expectedHeadOid`として指定し、先に別更新が入れば409で再読み込みを求めます。GitHub応答が失われた場合も、request固有marker、親SHA、全path、blob SHAが完全一致するときだけ成功として復旧します。

direct commitのsubjectは`cms: create ...`や`cms: update ...`を維持します。GitHub Appによる`main` pushをCloudflare Pagesと翻訳workflowが受け、サイト公開と翻訳PR taskを並行して始めます。コード、schema、workflow、翻訳ファイルはCMS経路のallowlist外で、従来どおりPRとCIを通します。

## 10. 翻訳ワークフローはCMS commitだけに絞る

日本語記事や日本語source JSONがmainに入るたびに翻訳PR taskを作ると、通常の開発commitでも翻訳PRが走ってしまいます。

そこで [PR #98](https://github.com/acecore-systems/acecore-net/pull/98) で、push連動時は `--cms-only` を付け、commit subjectが `cms: create`、`cms: update`、`cms: delete` のときだけ翻訳PR taskを作るようにしました。

```javascript
function isCmsCommitSubject(subject) {
  return /^cms: (create|update|delete) /.test(subject || '')
}
```

これは地味ですが大事です。CMS運用ではcommit messageが単なる飾りではなく、後続ワークフローの入力になります。

実際に、記事追加の作業でうっかり `cms:` prefixを使うと、CMS由来ではないのに翻訳用ワークフローが起動してしまいます。運用ルールとして「手作業やCodexの通常PRでは `cms:` を使わない」「CMS画面からの保存だけが `cms:` を使う」と分ける必要があります。

## 11. CSPとnoindexを分ける

管理画面は通常の公開ページと違う外部接続が必要です。Sveltia CMS本体のCDN、GitHub API、OAuth Worker、blob URLなどを使うため、通常ページと同じCSPでは動かないことがあります。

Acecoreでは `/admin/*` だけCSPを分けています。

```text
/admin/*
  X-Robots-Tag: noindex, nofollow
  Content-Security-Policy: default-src 'self'; script-src 'self' https://unpkg.com; connect-src 'self' blob: data: https://unpkg.com https://api.github.com https://www.githubstatus.com https://sveltia-cms-auth.example.workers.dev; frame-ancestors 'self'
```

管理画面を検索エンジンに出す必要はないため、HTML側の `meta robots` とヘッダー側の `X-Robots-Tag` の両方でnoindexにしています。

## Turnstileは別記事で深掘りする

この記事の古い版では、CMS選定とCloudflare Turnstileを同じ記事で扱っていました。今振り返ると、これは主題が混ざっていました。

Sveltia CMSの導入で考えるべきことは、GitHub backend、OAuth、collection設計、画像保存、PR運用です。一方、Turnstileは問い合わせフォームやコメント投稿APIでbot投稿を減らすための仕組みです。

この2つはどちらも「運用を安全にする」ための部品ですが、実装レイヤーが違います。CMS記事では分離して、フォームやコメントのbot対策は別記事で詳しく扱うほうが読み手にも親切です。

## PRとコミットからの反省点

最後に、実際に導入してから直した点をまとめます。

### 1. CMS名や前提は記事にも残る

最初の記事ではPages CMSを採用した前提で書いていましたが、実装はSveltia CMSへ移行しました。コードは変わっても、記事・内部リンク・スクリーンショットの表記が古いまま残ると、読者にも将来の自分にも誤解を生みます。

CMSを差し替えたら、設定ファイルだけでなく、関連記事と運用ドキュメントも一緒に棚卸しするべきでした。

### 2. OAuthは後回しにしない

個人検証ではPATでも進められますが、CMSは「エンジニア以外も触る」ために入れるものです。最初からOAuth Workerを入れ、GitHub OAuthでログインできる状態にするほうが導入価値が伝わります。

### 3. media_folderは早めに固定する

画像アップロード先は後から直すと、既存記事の画像参照や生成済みHTMLの確認が必要になります。Astroなら `public/uploads` と `/uploads` の対応を最初に固定するのが実用的です。

### 4. CMS設定は段階的に広げる

ページ文言を全部CMSに出そうとすると、`config.yml` が急に巨大になります。まずブログ、著者、タグ、告知のように更新頻度が高いものから始め、固定ページ文言はページ単位で増やすほうがレビューしやすいです。

### 5. commit subjectをワークフロー契約として扱う

`cms:` は見た目のprefixではなく、翻訳PR taskを起動するための契約です。CMS以外のcommitで使うと不要なワークフローが動くため、direct publish proxyだけがこのprefixを付けます。

### 6. publication branchを環境で切り替えない

previewへruleset bypass可能なwriter認証情報を配ると、確認用deployから本番`main`へ書ける経路が増えます。CMSの編集と保存はproductionの`/admin/`だけに限定し、保存後はproduction deployの完了を確認します。Cloudflare Pages previewはwriter認証情報なしで、コードや設定を変える通常PRの確認に使います。

## 導入時の最小構成

自分のAstroサイトへ入れるなら、最初はこのくらいから始めるのがおすすめです。

```text
public/admin/index.html
public/admin/config.yml
public/admin/init.js
public/admin/runtime-config.js
```

```yaml
backend:
  name: github
  repo: owner/repository
  branch: main
  base_url: https://your-auth-worker.example.workers.dev
  api_root: /admin/api/github
  graphql_api_root: /admin/api/graphql
  auth_methods: [oauth]
  commit_messages:
    create: 'cms: create {{collection}} "{{slug}}"'
    update: 'cms: update {{collection}} "{{slug}}"'
    delete: 'cms: delete {{collection}} "{{slug}}"'

media_folder: public/uploads
public_folder: /uploads

collections:
  - name: blog
    label: ブログ
    folder: src/content/blog
    slug: '{{fields._slug}}'
    fields:
      - { name: title, label: タイトル, widget: string }
      - { name: description, label: 概要, widget: text }
      - { name: date, label: 公開日, widget: datetime }
      - { name: author, label: 著者, widget: string }
      - { name: body, label: 本文, widget: markdown }
```

ここから、著者relation、タグrelation、画像フィールド、固定ページJSON、同期検証付きdirect publish proxy、翻訳PR taskの順で広げれば、導入直後から運用破綻しにくくなります。

## 参考リンク

- [Sveltia CMS Getting Started](https://sveltiacms.app/en/docs/start)
- [Sveltia CMS GitHub Backend](https://sveltiacms.app/en/docs/backends/github)
- [Sveltia CMS Editorial Workflow（未実装）](https://sveltiacms.app/en/docs/workflows/editorial)
- [Sveltia CMS Internal Media Storage](https://sveltiacms.app/en/docs/media/internal)
- [Sveltia CMS Manual Initialization](https://sveltiacms.app/en/docs/api/initialization)
- [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth)

## まとめ

Sveltia CMSの導入は、`public/admin` に管理画面を置くだけなら簡単です。ただし、実運用で大事なのはその先です。

どのbranchに保存するのか、誰がOAuthでログインするのか、画像はどこに置くのか、日本語sourceと翻訳をどう分けるのか、CMS commitを後続ワークフローがどう解釈するのか。ここまで決めると、静的サイトの軽さを保ったまま、更新しやすいCMS運用にできます。

問い合わせAIのような動的機能は [AstroサイトにAIチャットを組み込む実装記録](/blog/astro-ai-contact-chat/) に、外部コメントサービスに頼らないCloudflare構成は [CloudflareだけでAstroブログにコメント機能を作る方法](/blog/cloudflare-only-blog-comments/) に、翻訳PRの自動化は [Sveltia CMSで多言語ブログを運用する方法](/blog/copilot-translation-pipeline/) に分けて整理しています。CMS導入は、それらの土台になる「コンテンツを安全に更新する仕組み」として考えるのがちょうどよいです。
