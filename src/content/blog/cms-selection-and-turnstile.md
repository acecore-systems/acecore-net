---
title: 'Sveltia CMS導入ガイド'
description: 'Astroなどの静的サイトにSveltia CMSを導入し、GitHub backend、OAuth Worker、画像アップロード、多言語運用、CMS専用PRフローまで整える手順と反省点をまとめます。'
date: 2026-06-07T16:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'CMS', 'Astro', 'Cloudflare', 'セキュリティ']
image: /uploads/acecore-generated/blog-cms-selection-and-turnstile.webp
processFigure:
  title: Sveltia CMS導入の流れ
  description: 静的サイトにCMSを足すときは、管理画面、認証、編集対象、画像、PR運用を分けて設計します。
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
      description: cms-contentブランチ、CMS編集PR、翻訳PR taskをつなぎ、通常開発とCMS更新を分離します。
      icon: i-lucide-git-pull-request
      accent: slate
compareTable:
  title: CMS導入前後の違い
  before:
    label: Markdownを直接編集
    items:
      - GitHubやエディタを使える人しか更新しにくい
      - 画像パス、著者ID、タグ名を手入力しがち
      - 日本語sourceと翻訳ファイルの更新範囲が混ざる
      - 公開前のpreview branchでCMSがmainを見にいくことがある
  after:
    label: Sveltia CMSで編集
    items:
      - ブラウザからMarkdownやJSONをフォーム編集できる
      - relation、image、selectで入力ミスを減らせる
      - CMS commitだけを翻訳PR taskの対象にできる
      - runtime configでpreview branchと本番branchを切り替えられる
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
    - text: CMS commitと翻訳PR taskの関係を決める
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

タイトルはシンプルに **Sveltia CMS導入ガイド** としました。読み手に伝えたいことも同じで、CMS比較の読み物ではなく、「自分のサイトにも入れるなら何を決めればいいか」が分かる実装メモです。

## Sveltia CMSが向いているサイト

Sveltia CMSは、WordPressのようにCMS側がデータベースと表示APIを持つタイプではありません。CMS画面はブラウザ上で動くSPAで、GitHub backendを通じてリポジトリ内のファイルを編集します。

そのため、次のようなサイトと相性が良いです。

- Astro、Hugo、VitePressなど、MarkdownやJSONをリポジトリで管理している
- 記事、著者、タグ、固定ページ文言をGit差分としてレビューしたい
- 外部DBや独自管理画面を増やさず、静的サイトのまま運用したい
- 画像もリポジトリ内の `public/uploads` などに置きたい
- CMS更新後もPull Requestで確認してから本番反映したい

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

cms-content branch
  -> CMSが保存する作業ブランチ

.github/workflows/cms-content-pr.yml
  -> cms-content へのpushからmain向けPRを作成

.github/workflows/create-translation-prs.yml
  -> cms: commitだけを翻訳PR taskの対象にする
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
    <script src="https://unpkg.com/@sveltia/cms@0.166.0/dist/sveltia-cms.js"></script>
  </body>
</html>
```

ここで余計なCSSや `type="module"` を足さないのがポイントです。Sveltia CMSは必要なスタイルをJavaScript bundleに含めており、現在の配布形態では通常のscriptとして読み込むのが素直です。

Acecoreではpreview branchを扱うため、実際には `window.CMS_MANUAL_INIT = true` と `CMS.init()` を使って、あとからbranchだけ差し替えています。

```html
<script src="/admin/runtime-config.js"></script>
<script src="https://unpkg.com/@sveltia/cms@0.166.0/dist/sveltia-cms.js"></script>
<script src="/admin/init.js"></script>
```

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
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

`branch` を `main` にするか、CMS専用ブランチにするかは運用の分かれ目です。

小規模な個人サイトなら `main` へ直接保存しても成立します。ただし、会社サイトや多言語サイトでは、CMS保存を `cms-content` のような専用ブランチに逃がし、自動でPRを作る構成のほうがレビューしやすくなります。

## 3. OAuth Workerを用意する

Personal Access Tokenを使うだけならセットアップは早いです。ただし、非エンジニアや複数人で使うCMSにPATを配るのは避けたいところです。

Acecoreでは、Sveltia CMS AuthenticatorをCloudflare Workersで動かし、`base_url` にWorker URLを設定しています。

```yaml
backend:
  name: github
  repo: acecore-systems/acecore-net
  branch: cms-content
  base_url: https://sveltia-cms-auth.example.workers.dev
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

## 8. preview branchでmainを読まないようにする

Cloudflare Pagesのpreview環境でCMSを開くとき、CMSが常に `main` を読みにいくと確認がずれます。previewで見ているPR branchの内容をCMSでも見たい場合は、branchを実行時に差し替える必要があります。

Acecoreでは、ビルド前に `public/admin/runtime-config.js` を生成しています。

```javascript
const cmsBranch =
  process.env.CF_PAGES_BRANCH ||
  process.env.GITHUB_HEAD_REF ||
  process.env.GITHUB_REF_NAME ||
  process.env.BRANCH ||
  'main'

await writeFile(
  'public/admin/runtime-config.js',
  `window.CMS_MANUAL_INIT = true;\nwindow.ACECORE_CMS_BRANCH = ${JSON.stringify(cmsBranch)};\n`,
  'utf8',
)
```

そして `init.js` 側でbranchだけ上書きします。

```javascript
CMS.init({
  config: {
    backend: {
      branch: window.ACECORE_CMS_BRANCH || 'main',
    },
  },
})
```

この形にしておくと、設定ファイル本体は共有したまま、previewだけ対象ブランチを切り替えられます。

## 9. CMS専用ブランチからPRを作る

CMSで保存した内容をそのまま本番反映するより、`cms-content` branchに保存し、GitHub Actionsでmain向けPRを作るほうが安全です。

```yaml
on:
  push:
    branches:
      - cms-content
```

ワークフローでは、`cms-content` と `main` の差分があるときだけPRを作ります。既に開いているCMS PRがあれば追加作成しません。

ここで重要なのがmerge方法です。Acecoreの翻訳PR taskは `cms: create ...` や `cms: update ...` というcommit subjectを見て、CMS由来の日本語source更新だけを対象にしています。

そのため、CMS PRをsquash mergeしてcommit subjectが消えると、翻訳PR taskが自動検出できない場合があります。CMS編集PRでは、merge commitまたはrebase mergeで `cms:` commitを残す運用にしています。

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

`cms:` は見た目のprefixではなく、翻訳PR taskを起動するための契約です。CMS以外のPRで使うと不要なワークフローが動きますし、CMS PRをsquashして消すと必要なワークフローが動かないことがあります。

### 6. previewでどのbranchを見ているかを明示する

CMSはGitHub上のファイルを読むため、preview環境で表示しているbranchとCMSが編集しているbranchがずれることがあります。runtime configでbranchを注入する設計は、preview確認が多いサイトでは早めに入れておくべきです。

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
  branch: cms-content
  base_url: https://your-auth-worker.example.workers.dev
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

ここから、著者relation、タグrelation、画像フィールド、固定ページJSON、CMS専用PR、翻訳PR taskの順で広げれば、導入直後から運用破綻しにくくなります。

## 参考リンク

- [Sveltia CMS Getting Started](https://sveltiacms.app/en/docs/start)
- [Sveltia CMS GitHub Backend](https://sveltiacms.app/en/docs/backends/github)
- [Sveltia CMS Internal Media Storage](https://sveltiacms.app/en/docs/media/internal)
- [Sveltia CMS Manual Initialization](https://sveltiacms.app/en/docs/api/initialization)
- [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth)

## まとめ

Sveltia CMSの導入は、`public/admin` に管理画面を置くだけなら簡単です。ただし、実運用で大事なのはその先です。

どのbranchに保存するのか、誰がOAuthでログインするのか、画像はどこに置くのか、日本語sourceと翻訳をどう分けるのか、CMS commitを後続ワークフローがどう解釈するのか。ここまで決めると、静的サイトの軽さを保ったまま、更新しやすいCMS運用にできます。

問い合わせAIのような動的機能は [AstroサイトにAIチャットを組み込む実装記録](/blog/astro-ai-contact-chat/) に、翻訳PRの自動化は [Sveltia CMSで多言語ブログを運用する方法](/blog/copilot-translation-pipeline/) に分けて整理しています。CMS導入は、その2つの土台になる「コンテンツを安全に更新する仕組み」として考えるのがちょうどよいです。
