---
title: 'Sveltia CMSで多言語ブログを運用する方法'
description: 'Sveltia CMSで日本語記事を更新し、GitHub ActionsとGitHub Copilotで翻訳PRを作る運用を、UI翻訳との違い、検索エンジン上のメリット、hreflang、RSS、sitemap、レビュー観点まで含めて整理します。'
date: 2026-06-07T17:00
lastUpdated: 2026-06-07T00:00
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS', 'SEO']
image: /uploads/acecore-generated/blog-copilot-translation-pipeline.webp
callout:
  type: tip
  title: UI翻訳と多言語コンテンツ運用は別物
  text: 'ブラウザやウィジェットで画面上の文章を翻訳するだけでは、言語別URL、title、description、内部リンク、RSS、sitemap、hreflangまで言語別の資産にはなりません。検索エンジンに各言語ページとして渡すなら、翻訳結果を静的HTMLとして公開する設計が必要です。'
processFigure:
  eyebrow: Translation Workflow
  title: Sveltia CMSから翻訳PRまでの流れ
  description: 日本語をsource of truthにして、翻訳はGitHub側のPR運用に分離します。
  variant: inline
  steps:
    - title: 日本語だけ編集
      description: Sveltia CMSまたはMarkdownで `src/content/blog/{slug}.md` を更新する。
      icon: i-lucide-file-pen-line
      accent: brand
    - title: CMS commitを検出
      description: '`cms:` prefixや変更pathをGitHub Actions側の契約にする。'
      icon: i-lucide-git-commit-horizontal
      accent: amber
    - title: 翻訳PRを作成
      description: Copilotにsource path、locale、翻訳ルールを渡して翻訳ファイルを生成させる。
      icon: i-lucide-languages
      accent: emerald
    - title: build後に反映
      description: Astro build、Pagefind、リンク確認を通したPRだけをmainへ入れる。
      icon: i-lucide-check-check
      accent: slate
compareTable:
  title: UI上の翻訳と、言語別ページを生成する翻訳運用の違い
  before:
    label: UI翻訳
    items:
      - 'ユーザーのブラウザや翻訳ウィジェットが表示時に訳す'
      - 'URL、title、description、OGPは元言語のままになりやすい'
      - 'sitemap、RSS、hreflangに言語別ページとして出しにくい'
      - '共有URLや検索結果の表示文言が元言語に寄る'
  after:
    label: 静的な多言語ページ
    items:
      - '`/{locale}/blog/{slug}/` のように言語別URLを公開できる'
      - 'title、description、本文、FAQ、構造化データを言語別に持てる'
      - 'hreflangで各言語版の対応関係を検索エンジンへ伝えられる'
      - 'RSS、sitemap、内部リンク、Search Console確認を言語別に扱える'
checklist:
  title: 導入時に決めること
  items:
    - text: '日本語記事を翻訳元として扱う'
      checked: true
    - text: '翻訳ファイルのslugを日本語記事と一致させる'
      checked: true
    - text: '`cms:` commitなど、翻訳ワークフローの起動条件を固定する'
      checked: true
    - text: 'URL、画像path、コードブロック、タグIDを翻訳で壊さない'
      checked: true
    - text: 'hreflang、canonical、RSS、sitemapの出力をbuildで確認する'
      checked: true
linkCards:
  - href: /blog/cms-selection-and-turnstile/
    title: Sveltia CMS導入ガイド
    description: Astroなどの静的サイトへSveltia CMSを導入するための実装ガイドです。
    icon: i-lucide-badge-check
  - href: /blog/astro-i18n-blog-translation/
    title: Astroサイトの多言語アーキテクチャ
    description: 9言語対応、hreflang、RSS、sitemapの土台を整理した記事です。
    icon: i-lucide-globe-2
  - href: /blog/astro-seo-and-structured-data/
    title: AstroサイトのSEO実装
    description: canonical、OGP、構造化データ、サイトマップの基本を扱っています。
    icon: i-lucide-search-check
faq:
  title: よくある質問
  items:
    - question: UI上の翻訳だけではだめですか？
      answer: 'ユーザーが読むだけなら役に立ちます。ただし検索エンジンやSNS共有に対して、言語別URL、title、description、構造化データ、内部リンクを安定して渡したい場合は、翻訳済みページを静的HTMLとして持つほうが扱いやすいです。'
    - question: AI翻訳した記事は検索上不利ですか？
      answer: 'AIを使うこと自体より、ユーザー価値のない大量生成になっていないかが重要です。用語、リンク、事実関係、現地語としての自然さをレビューし、各言語ページとして読む価値を持たせる運用にします。'
    - question: 翻訳ページは重複コンテンツになりませんか？
      answer: 'Googleは、主本文が翻訳されているローカライズページを単なる重複とは扱いません。各言語版を同じslugで対応させ、hreflangやsitemapで関係を示すのが基本です。'
---

問い合わせAI、Sveltia CMS、サービスCTAの導線まで整えてくると、次に効いてくるのが **多言語ブログの運用** です。

このサイトは日本語を中心に運用していますが、ブログや固定ページは9言語で公開しています。ここで大事なのは、「画面上で翻訳できること」と「検索エンジンに各言語ページとして渡せること」は別物だという点です。

Chromeの翻訳、ブラウザ拡張、翻訳ウィジェットは、読者が目の前のページを読むには便利です。しかし、それだけでは `en`, `zh-cn`, `es`, `pt`, `fr`, `ko`, `de`, `ru` のURL、メタ情報、RSS、sitemap、内部リンクが生まれるわけではありません。

この記事では、Sveltia CMSで日本語記事だけを更新し、GitHub ActionsとGitHub Copilotで翻訳PRを作る運用を、検索エンジン上のメリットも含めて整理します。

## 結論

多言語ブログを検索流入まで見据えて運用するなら、翻訳を「UIの表示処理」ではなく、**公開前のコンテンツ生成処理** として扱うほうが強いです。

このサイトでは次の構成にしています。

- 日本語記事: `src/content/blog/{slug}.md`
- 翻訳記事: `src/content/blog/{locale}/{slug}.md`
- 表示URL: `/blog/{slug}/`, `/en/blog/{slug}/`, `/zh-cn/blog/{slug}/` など
- 翻訳元: 日本語Markdown
- 翻訳作業: GitHub CopilotのPR
- 公開判断: buildとレビューを通ったPRだけmainへ入れる

Sveltia CMSは、ここで **日本語sourceを編集する入口** として使います。翻訳そのものはCMS画面で各言語を直接触るのではなく、GitHub側のPR運用に分離します。

## UI翻訳で十分な場面

まず、UI翻訳が悪いわけではありません。

次のような用途なら、ブラウザ翻訳や翻訳ウィジェットで十分なこともあります。

- 社内向けの一時的な閲覧
- 既存ページを海外ユーザーがざっと読む
- 管理画面やヘルプを読むための補助
- SEO流入を狙わないページ
- 翻訳品質を運用対象にしないページ

この場合、翻訳は「読者の環境で起きる表示上の変換」です。サイト運営側は翻訳結果をファイルとして持ちません。

だから管理は軽いです。一方で、公開物としての言語別ページは残りません。

## UI翻訳だけでは弱い場面

ブログやサービス紹介のように検索流入を狙うページでは、UI翻訳だけでは足りないことがあります。

理由は単純で、検索エンジンやSNSが見る単位は基本的に **URLとHTML** だからです。

たとえば日本語ページ `/blog/copilot-translation-pipeline/` だけが存在していて、英語はブラウザ側で翻訳される構成だとします。この場合、検索結果に出るURL、title、description、構造化データ、RSS、sitemapは日本語ページのものになります。

読者は英語で読めるかもしれません。しかし、検索エンジンに対して「これは英語版の記事です」と安定して渡せる状態ではありません。

静的な多言語ページを生成すると、ここが変わります。

```txt
/blog/copilot-translation-pipeline/
/en/blog/copilot-translation-pipeline/
/zh-cn/blog/copilot-translation-pipeline/
/es/blog/copilot-translation-pipeline/
/pt/blog/copilot-translation-pipeline/
/fr/blog/copilot-translation-pipeline/
/ko/blog/copilot-translation-pipeline/
/de/blog/copilot-translation-pipeline/
/ru/blog/copilot-translation-pipeline/
```

このようにURLが分かれていると、各ページに言語別の `title`, `description`, `og:title`, `og:description`, JSON-LD, 内部リンクを持たせられます。

## 検索エンジン上のメリット

多言語ページを静的に生成する一番のメリットは、検索エンジンに渡す情報が明確になることです。

### 1. 言語別URLを直接クロールできる

GoogleはJavaScriptも処理しますが、Google Search CentralではJavaScriptには制約があり、静的レンダリングやサーバーサイドレンダリングが安定した選択肢として示されています。

また、Google以外のクローラーやSNSのプレビュー、RSSリーダー、サイト内検索まで考えると、最初からHTMLに翻訳済み本文が入っているほうが扱いやすいです。

UI翻訳ではなく、`/en/blog/.../` のようなURLに英語HTMLを置くと、そのURL自体がクロール対象になります。

### 2. titleとdescriptionを各言語で最適化できる

検索結果で見えるのは本文だけではありません。`title` と `description` も重要です。

UI翻訳だけの場合、元HTMLのメタ情報は日本語のままになりがちです。英語ユーザーに見せたい検索結果なのに、検索結果のタイトルや説明が日本語に寄る可能性があります。

翻訳ファイルを持つ構成なら、frontmatter自体を翻訳できます。

```yaml
title: 'How to Run a Multilingual Blog with Sveltia CMS'
description: 'A practical workflow for publishing Japanese source articles through Sveltia CMS and generating localized static pages with GitHub Copilot.'
```

この差は、検索結果だけでなく、SNS共有、OGP画像、サイト内関連記事にも効きます。

### 3. hreflangで言語版の対応関係を伝えられる

Googleは、言語や地域ごとにURLが分かれている場合、`hreflang` で各ページの対応関係を伝えることを推奨しています。

このサイトでは、`BaseLayout.astro` と sitemap で各ロケールのURLを出力しています。

```html
<link
  rel="alternate"
  hreflang="en"
  href="https://acecore.net/en/blog/copilot-translation-pipeline/"
/>
<link
  rel="alternate"
  hreflang="ja"
  href="https://acecore.net/blog/copilot-translation-pipeline/"
/>
```

UI翻訳だけでは、対応する英語URLそのものがありません。つまり、hreflangの対象にしにくいです。

### 4. sitemapとRSSに言語別ページを載せられる

多言語記事を静的ファイルとして持つと、sitemapやRSSにも言語別のURLを出せます。

- `/rss.xml`
- `/en/rss.xml`
- `/zh-cn/rss.xml`
- `/es/rss.xml`
- `/pt/rss.xml`
- `/fr/rss.xml`
- `/ko/rss.xml`
- `/de/rss.xml`
- `/ru/rss.xml`

RSSリーダーや外部サービスに対しても、各言語のフィードを出せるようになります。

UI翻訳だけでは、RSSのitemは元言語のままです。フィード経由の読者や検索エンジンに渡る情報も元言語に寄ります。

### 5. 内部リンクを言語別に保てる

多言語サイトで壊れやすいのが内部リンクです。

英語記事を読んでいるのに関連記事リンクだけ日本語URLへ戻ると、ユーザー体験もクローラーの理解もぶれます。

翻訳ファイルを持つ構成なら、リンク生成を `getLocalizedUrl()` に寄せたり、Markdown内の内部リンクをlocale別に調整したりできます。

今回のようなブログ運用では、翻訳時に次のルールを固定します。

- `/blog/foo/` は必要に応じて `/{locale}/blog/foo/` にする
- 外部URLは翻訳しない
- 画像pathは翻訳しない
- コードブロック内のpathは不用意に変えない
- tag IDは翻訳せず、表示名だけ翻訳する

## Sveltia CMSはどこを担当するか

Sveltia CMSは、翻訳エンジンではありません。この運用では、CMSは日本語sourceを編集するための入口です。

CMS側で扱うのは主に次です。

- 日本語ブログ記事
- 著者情報
- タグ定義
- 日本語source JSON
- 画像アップロード
- 公開日、更新日、関連記事、FAQなどのfrontmatter

CMS導入自体の設計は [Sveltia CMS導入ガイド](/blog/cms-selection-and-turnstile/) に分けています。この記事では、その後ろにある翻訳PR運用に絞ります。

## 翻訳はGitHubのPRに分離する

多言語CMSでありがちな失敗は、すべての言語をCMS画面に出してしまうことです。

もちろん、編集者が各言語を直接直す運用ならそれでも構いません。ただ、少人数で日本語を中心に運用するサイトでは、全言語をCMSに出すと入力項目が増えすぎます。

Acecoreでは次の分担にしました。

- Sveltia CMS: 日本語sourceを安全に更新する
- GitHub Actions: CMS commitや変更pathを検出する
- GitHub Copilot: 翻訳PRを作る
- Pull Request: 翻訳差分をレビューする
- Astro build: ルート、frontmatter、リンク、構造化データの破綻を検出する

翻訳をPRにすると、レビュー、差分確認、build、rollbackができます。CMS画面で直接8言語を書き換えるより、変更履歴も追いやすくなります。

## commit subjectをワークフロー契約にする

翻訳ワークフローは、すべてのMarkdown更新で走らせると扱いづらくなります。

たとえば日付だけを直した、タグだけを直した、内部リンクだけを直した、という変更で毎回8言語分の翻訳PRが出るとノイズになります。

そこで、CMS更新であることをcommit subjectで識別します。

```txt
cms: create blog "new-article-slug"
cms: update blog "copilot-translation-pipeline"
```

このprefixをGitHub Actions側の契約にすると、意図したときだけ翻訳タスクを起こせます。

前回の反省として、commit subjectやpath条件を曖昧にすると「本来走らないはずのワークフローが走ったのでは」と判断しづらくなります。ワークフローの起動条件は記事運用の仕様として明文化したほうが安全です。

## 翻訳PRに渡すルール

Copilotに翻訳を任せるときは、単に「翻訳して」では足りません。

最低限、次のようなルールを固定します。

```md
Translate the Japanese source article into the target locale.

Keep:

- slug
- image path
- author id
- tag ids
- internal code tokens
- external URLs
- code blocks unless comments are natural language

Localize:

- title
- description
- callout
- FAQ
- link card title and description
- body text
- internal blog URLs when locale-specific URLs exist
```

重要なのは、翻訳対象と翻訳してはいけない対象を分けることです。

Markdownでは、本文、frontmatter、コードブロック、URL、画像、タグIDが同じファイルに混ざります。ここを曖昧にすると、ビルドは通ってもリンクや分類が壊れます。

## PR body markerで重複を防ぐ

翻訳PRは非同期です。GitHub Actions、Copilot task、build、auto-mergeが別々に動きます。

そのため、PR本文にsource pathと対象localeを入れておくと運用しやすくなります。

```md
<!-- translation-source: src/content/blog/copilot-translation-pipeline.md -->
<!-- translation-locales: en,zh-cn,es,pt,fr,ko,de,ru -->
```

open PRを検索すれば、同じsource pathの翻訳PRが既にあるか確認できます。

## AI翻訳で気をつけること

AI翻訳は便利ですが、検索流入を狙うなら「量産できる」だけでは足りません。

Googleのスパムポリシーでも、ユーザー価値を追加しない大量生成は問題になり得ます。AIを使うこと自体より、各言語ページとして読む価値があるか、事実関係やリンクが正しいかが大事です。

レビューでは、次を見ます。

- タイトルがその言語の検索語として自然か
- descriptionが日本語直訳で不自然になっていないか
- サービス名、製品名、固有名詞が崩れていないか
- 内部リンクが読者のlocaleへ向いているか
- 画像altが翻訳されているか
- FAQがその言語の読者にも意味を持つか
- コードブロックやURLが壊れていないか

AI翻訳は下書きとして優秀です。ただし、公開物にするなら、最後はサイト運用側の責任でレビューします。

## 実装で踏みやすい落とし穴

今回の一連のPRでも、記事化しておくべき反省点がいくつかありました。

### 1. CMS名の古い表記が記事に残る

実装はSveltia CMSへ移行しているのに、過去記事には `Pages CMS` の説明やスクリーンショットが残っていました。

CMSは運用画面なので、記事本文に古い名前が残ると読者が迷います。実装を変えたら、関連する解説記事、内部リンク、画像altも一緒に棚卸しするべきです。

### 2. 公開日を更新しないとブログトップに出ない

記事を全面更新しても、frontmatterの `date` が古いままだとブログトップには上がりません。

`lastUpdated` だけでは「更新日」は伝わりますが、このサイトのブログ一覧は `date` 降順です。大きく記事を作り直したときは、公開日として扱うのか、既存記事の更新として扱うのかを決める必要があります。

### 3. 翻訳記事のslugを変えない

翻訳タイトルは変えても、slugは元記事と揃えます。

```txt
src/content/blog/copilot-translation-pipeline.md
src/content/blog/en/copilot-translation-pipeline.md
src/content/blog/fr/copilot-translation-pipeline.md
```

slugが揃っていると、`localizePost()` や `getBaseSlug()` のような解決処理がシンプルになります。

### 4. 言語別URLに戻さない内部リンク

翻訳記事の本文で `/blog/foo/` のままリンクすると、英語ページから日本語ページへ戻ってしまいます。

このサイトのコンポーネント内リンクは `getLocalizedUrl()` に寄せていますが、Markdown本文のリンクは翻訳PRで注意が必要です。

### 5. sitemapとRSSだけを見て安心しない

サイトマップにURLが出ていても、記事本文、canonical、hreflang、JSON-LD、内部リンク、RSSがすべて揃っているとは限りません。

生成HTMLを確認し、最低限 `dist/blog/index.html`, `dist/rss.xml`, `dist/sitemap-0.xml`, `dist/{locale}/blog/{slug}/index.html` を見ると事故を減らせます。

## 最小構成

他のAstroサイトで同じ運用を始めるなら、最小構成はこれです。

```txt
src/content/blog/
  my-article.md
  en/
    my-article.md
  zh-cn/
    my-article.md
```

```ts
const posts = await getCollection('blog')
const basePosts = posts.filter(isBasePost)
const displayPosts = basePosts.map((post) => localizePost(post, posts, locale))
```

```yaml
title: 'Sveltia CMSで多言語ブログを運用する方法'
description: 'Sveltia CMSとGitHub Copilotで翻訳PRを作る運用メモ'
date: 2026-06-07T17:00
lastUpdated: 2026-06-07T00:00
author: gui
tags: ['技術', 'GitHub Copilot', 'i18n', 'CMS', 'SEO']
```

この状態に、Sveltia CMS、GitHub Actions、Copilot task作成、build確認を順に足していけばよいです。

最初から全部を自動化しなくても構いません。重要なのは、**日本語sourceと翻訳ファイルの関係を壊さないこと**です。

## 参考リンク

- [Google Search Central: Localized Versions of your Pages](https://developers.google.com/search/docs/advanced/crawling/localized-versions?hl=en&rd=1&visit_id=638856769088389068-716743185)
- [Google Search Central: Managing Multi-Regional and Multilingual Sites](https://developers.google.com/search/docs/advanced/crawling/managing-multi-regional-sites)
- [Google Search Central: JavaScript SEO Basics](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- [Google Search Central: Dynamic Rendering](https://developers.google.com/search/docs/crawling-indexing/javascript/dynamic-rendering)
- [Google Search Central: Spam Policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [Sveltia CMS導入ガイド](/blog/cms-selection-and-turnstile/)
- [Astroサイトの多言語アーキテクチャ](/blog/astro-i18n-blog-translation/)

## まとめ

UI上の翻訳は、読者がその場で読むための便利な補助です。

一方で、多言語ブログを検索流入や継続運用まで含めて考えるなら、翻訳を静的コンテンツとして生成し、言語別URL、メタ情報、内部リンク、RSS、sitemap、hreflangまで揃えるほうが強いです。

Sveltia CMSは日本語sourceを安全に更新する入口として使い、翻訳はGitHub CopilotのPRに分離する。

この分担にすると、編集画面は軽く保てます。翻訳差分はレビューできます。検索エンジンには各言語のHTMLを渡せます。

多言語運用で大事なのは、翻訳そのものよりも、**翻訳をサイト構造の中でどう扱うか** です。
