---
title: '日本語記事を1本公開するだけで9言語ブログを回す方法'
description: 'Pages CMS で日本語記事だけを更新し、GitHub Actions と GitHub Copilot で日本語 + 8言語の翻訳記事を自動生成して build・自動マージまで進める運用手順をまとめます。'
date: 2026-03-29T22:30
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: 先に結論
  text: 'いまの Acecore サイトなら、日本語記事を翻訳元にして、日本語 + 8言語のブログ運用を GitHub Actions と GitHub Copilot で自動化できます。'
processFigure:
  title: 日本語1本から9言語運用にする流れ
  steps:
    - title: 日本語ソースを更新
      description: Pages CMS または Markdown で日本語記事だけを編集して main に反映する。
      icon: i-lucide-pencil-line
    - title: 翻訳 issue を自動起票
      description: source path と対象ロケールを埋め込んだ issue を GitHub Actions が作成する。
      icon: i-lucide-ticket
    - title: Copilot が翻訳 PR を作成
      description: issue を受けて翻訳ファイルを生成し、translation PR を起票する。
      icon: i-lucide-git-pull-request
    - title: build・merge・issue close
      description: build 成功後に自動マージし、親 translation issue も自動で閉じる。
      icon: i-lucide-check-check
compareTable:
  title: 手動運用と自動運用の比較
  before:
    label: 手動翻訳運用
    items:
      - 記事公開後に翻訳タスクを人が起票する
      - 言語ごとに担当者を割り振る
      - build やマージ判断も人が行う
      - 親 issue のクローズ漏れが起きやすい
  after:
    label: 自動翻訳運用
    items:
      - 日本語記事の push が起点になる
      - Copilot に自動アサインされる
      - 翻訳 PR は build 後に自動マージされる
      - 親 issue も merge 後に自動クローズされる
checklist:
  title: 導入前に揃えるもの
  items:
    - text: 日本語を翻訳元にするコンテンツ構造
    - text: src/content/blog/{locale}/{slug}.md のような翻訳ファイル配置ルール
    - text: issues write 権限を持つ GitHub Actions
    - text: Copilot assignment API を叩ける COPILOT_AGENT_TOKEN
    - text: npm run build のような安定したビルドコマンド
faq:
  title: よくある質問
  items:
    - question: 日本語の記事さえ push すれば、他言語の記事も勝手に作られますか？
      answer: 'はい。現在の Acecore サイトは `ja`, `en`, `zh-cn`, `es`, `pt`, `fr`, `ko`, `de`, `ru` の9言語構成なので、日本語記事の push を起点に残り8言語分の translation issue 作成、Copilot へのアサイン、翻訳 PR 作成、build、自動マージ、issue クローズまで流せます。さらに翻訳ファイルがまだ無くても各ロケールの URL は日本語フォールバックで出せるため、公開を止めずにあとから実翻訳へ置き換えられます。'
    - question: なぜ直接 PR を作らず、一度 issue を挟むのですか？
      answer: 'source path、対象ロケール、翻訳条件を issue に固定できるからです。差分が出たときの再実行、履歴確認、失敗時のやり直しがかなり楽になります。'
    - question: 自動マージは危なくないですか？
      answer: '危ないのは無条件マージです。translation PR だけに対象を絞り、Copilot が作成した PR、translation で始まるタイトル、build 成功、非 draft を条件にすれば、かなり安全側に寄せられます。'
---

結論から言うと、このサイトでは Pages CMS で日本語記事を1本公開するだけで、日本語 + 8言語のブログ記事を順にそろえられます。GitHub Actions と GitHub Copilot が translation issue 作成、翻訳 PR 作成、build、自動マージ、親 issue クローズまで進める構成です。

運用担当が普段触るのは日本語記事と著者情報だけです。翻訳タスクの起票や PR 整理を毎回手で回さなくてよくなるので、多言語ブログ運用の負担をかなり減らせます。

## この方法の前提

前提として、この方法は Astro 側に次の基盤がすでに入っている構成を想定しています。

- 9言語ルーティング（ja, en, zh-cn, es, pt, fr, ko, de, ru）
- 翻訳がまだ無いページでも日本語を出せるフォールバック
- Pages CMS から日本語記事と著者情報を更新できる運用

基盤の作り方自体は [Astro 6 サイトを9言語対応に ― ブログ記事136本の自動翻訳と多言語アーキテクチャ](/blog/astro-i18n-blog-translation/) にまとめてあります。この記事では、その上に Copilot 自動翻訳運用をどう載せるかだけに絞ります。

## 何ができるのか

運用側から見ると、普段触る画面はこの 2 つです。今回は Pages CMS の画面をそのまま使い、**日常運用でどこを触るのか** がすぐ分かる形にしています。

![Pages CMS の日本語ブログ一覧画面](/uploads/pagescms-blog-ja-live-20260329.png)

1枚目は Pages CMS の日本語ブログ一覧です。ここで公開日や著者を見ながら、日本語記事だけを追加・更新します。複数言語の編集画面へ毎回入り込まず、**翻訳元の日本語だけを触る** という運用に寄せるのがポイントです。

![Pages CMS の著者情報フォーム画面](/uploads/pagescms-authors-live-20260329.png)

2枚目は著者情報フォームです。著者データも日本語ベースの項目だけを CMS で更新し、翻訳用の `i18n` は GitHub 側の自動化フローで扱う前提にすると、運用の責務分離がかなりきれいになります。

## この方法が向いているケース

まず前提として、以下のようなチームやサイトで特に効果があります。

- 日本語を翻訳元にしたい
- ブログは Markdown ベースで管理している
- 翻訳は人手で毎回起票するのが面倒
- 翻訳の質はある程度 AI に寄せたい
- ただし build 失敗や draft のままの PR は止めたい

逆に、言語ごとに完全に独立した編集体制を持つ場合は、別の運用のほうが合うこともあります。

## Step 1. 翻訳元を日本語記事に固定する

最初に決めるべきことは「どのファイルを翻訳元にするか」です。ここが曖昧だと自動化が崩れます。

この記事でいう翻訳元とは、**最初に編集して、各言語の記事や派生データの基準になる日本語ファイル** のことです。

今回の構成では、以下を翻訳元と翻訳先に分けています。

- ブログ記事の翻訳元: `src/content/blog/{slug}.md`
- ブログ記事の翻訳先: `src/content/blog/{locale}/{slug}.md`
- 著者情報の翻訳元: `src/content/authors/{authorId}.json`
- 著者情報の翻訳先: `src/content/authors/{authorId}.json` の `i18n`
- タグ定義の翻訳元: `src/content/tags/{tagId}.json`
- タグ定義の翻訳先: `src/content/tags/{tagId}.json` の `i18n`

ディレクトリ構造は、だいたい次のようにしておくと扱いやすいです。

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

重要なのは、**翻訳ファイルの slug を元になる日本語記事と揃えること**です。これだけで source path から自動で翻訳対象を特定しやすくなります。

この repo では、翻訳ファイルがまだ存在しなくても各ロケールの URL 自体は日本語フォールバックで生成されます。つまり「まず日本語記事を公開し、その後で翻訳 PR が追いつく」という運用ができます。

## Step 2. 日本語記事の push を translation issue に変換する

次にやるのは、日本語記事の変更を GitHub Actions で検知して、translation issue を自動起票することです。

最低限必要なのは以下です。

- `main` への push を監視する
- `src/content/blog/*.md` だけを通常の自動起票対象にする
- frontmatter だけの変更ではなく、本文が変わったときだけ issue を作る
- 同じ source path の open issue があれば新規作成ではなく更新する
- issue body に source path を marker として埋め込む

著者情報やタグ定義は翻訳対象ではありますが、普段の push では自動起票しません。必要なときだけ `workflow_dispatch` で明示的に起こす運用にしておくと、不要な issue が増えにくくなります。

たとえば issue body にこういうコメントを入れておくと、後段の自動化で再利用できます。

```md
<!-- translation-source:src/content/blog/my-post.md -->
<!-- translation-kind:blog-post -->
```

workflow 側は次のような絞り込みが基本です。

```yaml
on:
  push:
    branches:
      - main
    paths:
      - src/content/blog/*.md
```

さらに、Markdown 本文だけを比較して translation issue を作るようにしておくと、公開日やタグの微修正だけで大量に翻訳 issue が増える事故を避けられます。

ここで大事なのは「翻訳を直接作る」のではなく、**一度 issue を作る**ことです。issue を挟むことで、source path と対象言語、翻訳条件を人間にも AI にも見える形で固定できます。

## Step 3. translation issue を Copilot に自動アサインする

issue を作るだけでは人手作業が残るので、ここで Copilot に自動アサインします。

やることは 2 つです。

1. `COPILOT_AGENT_TOKEN` を repository secret に入れる
2. issue 作成後に assignment API を叩く

概念としては、issue を patch して Copilot を assignee に設定します。

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

このとき、普段の自動起票は記事用だけに絞り、著者情報用やタグ定義用は必要なときだけ manual dispatch で起こすようにすると運用が安定します。著者情報では `src/content/authors/{authorId}.json` の `i18n`、タグ定義では `src/content/tags/{tagId}.json` の `i18n.name`、記事では `src/content/blog/{locale}/` に同名ファイルを作る、というルールを明示しておくと事故が減ります。

## Step 4. 翻訳 PR を build し、自動マージする

ここは無条件自動化にしないほうが安全です。おすすめは以下の条件を全部満たした PR だけをマージ対象にすることです。

- Copilot が作成した PR である
- タイトルが `[translation]` で始まる
- `main` 向けである
- draft ではない
- build が成功している

今回の構成では 2 段に分けています。

1. `Translation PR Build`
2. `Merge Translation PR`

ready for review になったタイミングで PR head を build し、成功したらそのまま squash merge する形です。GitHub の branch protection に依存しないので、小規模 repo でも扱いやすいです。

### 自動マージで絞るべき条件

自動マージを入れるときは、最低でも以下の条件はおすすめです。

- translation PR 以外は対象外
- build 失敗なら止める
- draft の間は止める
- Copilot 以外が作った PR は対象外

この 4 つを入れておけば、普通の開発 PR まで巻き込む事故はかなり避けられます。

## Step 5. merge 後に親 translation issue を自動で閉じる

最後に入れておくと運用がきれいになるのが、親 issue の自動クローズです。

やり方はシンプルで、merge 済み translation PR に対して以下を行います。

1. PR の changed files を取得する
2. PR body にある source path も読む
3. `translation-source:` marker に対応する open issue を検索する
4. コメントを付けて close する

PR body の source path も見るようにした理由は、Copilot が作った PR の changed files だけだと、状況によっては source の逆引きが弱いことがあるからです。**changed files と PR body の両方を使う**と安定します。

## 補足

### Copilot が作る PR や issue の文面を日本語に寄せる

GitHub 側で Copilot の出力言語を安定させたいなら、repo-wide instructions を使うのが一番素直です。

つまり、`.github/copilot-instructions.md` を置きます。

```md
This repository is an Astro static site for Acecore, deployed on Cloudflare Pages.

- For GitHub issues, pull requests, issue comments, pull request descriptions, review summaries, and other user-facing GitHub text, write in Japanese by default unless the task explicitly requires another language.
- For multilingual content work, treat Japanese source files as canonical and keep translated frontmatter aligned with the Japanese source.
```

この 1 ファイルがあるだけで、Copilot coding agent が issue や PR を作るときの既定の言語と文脈がかなり安定します。

## まとめ

この構成の肝は、翻訳を「人が都度お願いする作業」ではなく、**日本語ソースの push に従属する定型処理**に落とすことです。

流れをもう一度まとめるとこうです。

1. 日本語記事だけを書く
2. push で translation issue を自動起票する
3. Copilot に自動アサインする
4. 翻訳 PR を build して自動マージする
5. 親 issue まで自動で閉じる

ここまで組めれば、運用側の感覚としてはかなり素直です。**日本語の記事さえ push すれば、その他の言語の記事は GitHub 側で順番に出来上がっていく**状態になります。

もちろん、実際には issue 作成、Copilot 実行、PR 作成、build、merge という非同期の流れを踏むので「瞬時に全部できる」わけではありません。ただ、運用担当者が毎回手で翻訳タスクを起票したり、PR を閉じ忘れたりする必要はなくなります。

今回の記事自体も、日本語版を基準にこのフローへ流し込める構成にしてあります。多言語サイトを継続運用するなら、まずはこのくらいの自動化から始めるのがちょうどいいと思います。
