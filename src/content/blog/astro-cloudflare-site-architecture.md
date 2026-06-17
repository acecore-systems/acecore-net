---
title: 'Astro + Cloudflareで公式サイトを機能拡張する全体設計'
description: 'AstroとCloudflare Pagesを土台に、問い合わせAI、Sveltia CMS、多言語ブログ、サービスCTA、Markdown安全描画、Cloudflareだけのコメント機能をどう組み合わせて公式サイトを育てたかを、他サイトにも転用しやすい全体設計として整理します。'
date: 2026-06-07T19:00
lastUpdated: 2026-06-07T00:00
author: gui
tags: ['技術', 'Astro', 'Cloudflare', 'Webサイト', 'AI', 'CMS']
image: /uploads/acecore-generated/work-acecore-net-website.webp
callout:
  type: tip
  title: 単体機能を足す前に、境界を決める
  text: '問い合わせAI、CMS、多言語、コメント欄のような機能は、それぞれ便利ですが、同じ公式サイトに載せるなら役割と境界をそろえる必要があります。Astroは静的HTMLを作り、Cloudflareは配信、API、DB、bot対策を受け持ち、GitHub PRで変更履歴を残す。この分担にすると、機能を増やしてもサイト全体の説明が崩れにくくなります。'
processFigure:
  eyebrow: Site Architecture
  title: 公式サイトを機能拡張するレイヤー
  description: 静的サイトを土台にしつつ、必要な部分だけ動的にしていきます。
  variant: inline
  steps:
    - title: 配信する
      description: Astroで静的HTMLを生成し、Cloudflare Pagesで配信する。
      icon: i-lucide-rocket
      accent: brand
    - title: 更新する
      description: Sveltia CMSで日本語sourceを編集し、GitHub PRで確認する。
      icon: i-lucide-file-pen-line
      accent: emerald
    - title: 翻訳する
      description: 翻訳はCMS画面ではなく、CopilotのPR運用に分離する。
      icon: i-lucide-languages
      accent: amber
    - title: 案内する
      description: 問い合わせAIとサービスCTAで、訪問者を適切なフォームへ送る。
      icon: i-lucide-route
      accent: slate
    - title: 受ける
      description: Pages FunctionsでAPI境界を作り、D1やTurnstileを必要な箇所だけ使う。
      icon: i-lucide-cloud
      accent: brand
    - title: 守る
      description: Markdown描画、Origin、rate limit、noindex、Pagefind対象を分けて制御する。
      icon: i-lucide-shield-check
      accent: emerald
compareTable:
  title: ただ機能を足す場合と、全体設計として足す場合
  before:
    label: 機能ごとに足す
    items:
      - 'AI、CMS、コメント、フォームがそれぞれ別の設計思想になる'
      - '外部サービスのscriptや管理画面が増え、説明責任が分散する'
      - '多言語URL、検索index、preview環境でズレが起きやすい'
      - '機能同士の関係が見えず、導入順を決めにくい'
  after:
    label: レイヤーで足す
    items:
      - 'Astro、Cloudflare、GitHub、OpenAI APIの役割を分けて説明できる'
      - '動的APIはPages Functionsに集め、保存先はD1などCloudflare側に寄せられる'
      - 'CMS更新、多言語翻訳、検索、RSS、sitemapを同じコンテンツ構造で扱える'
      - '用途別・導入順のインデックスとして読み進めやすい'
checklist:
  title: 他サイトへ転用するときの設計チェック
  items:
    - text: '静的に出せるものと、APIが必要なものを分ける'
      checked: true
    - text: 'CMSは編集入口、翻訳はPR、公開判断はbuildに分離する'
      checked: true
    - text: '問い合わせAIには個人情報を渡さず、公開済み情報だけを案内させる'
      checked: true
    - text: 'フォーム導線はURLパラメータで文脈を渡し、受信値は安定した分類にする'
      checked: true
    - text: 'コメントなど投稿データはD1の実体名とbindingを設定で明示する'
      checked: true
    - text: 'AI出力やユーザー投稿は、HTMLとして信頼せず許可リストで扱う'
      checked: true
linkCards:
  - href: /blog/astro-ai-contact-chat/
    title: 問い合わせAIチャットの技術設計
    description: サイト内情報をもとに訪問者を案内するAIチャットのAPI境界と安全設計です。
    icon: i-lucide-bot
  - href: /blog/cms-selection-and-turnstile/
    title: Sveltia CMS導入ガイド
    description: 静的サイトへCMS編集画面、GitHub backend、OAuth、PR運用を足す実装記録です。
    icon: i-lucide-badge-check
  - href: /blog/copilot-translation-pipeline/
    title: Sveltia CMSで多言語ブログを運用する方法
    description: UI翻訳ではなく、言語別HTMLを生成して検索エンジンへ渡す運用設計です。
    icon: i-lucide-languages
  - href: /blog/service-cta-contact-prefill/
    title: サービスCTAからフォームへ文脈を引き継ぐ設計
    description: サービスページの文脈を問い合わせフォームの種別と件名へ渡す導線設計です。
    icon: i-lucide-route
  - href: /blog/ai-chat-markdown-link-safety/
    title: AIチャット回答のMarkdownリンク安全描画
    description: AI回答を信頼済みHTMLにせず、必要なMarkdownだけ安全にDOM化する実装です。
    icon: i-lucide-shield-check
  - href: /blog/cloudflare-only-blog-comments/
    title: Cloudflareだけで作るブログコメント機能
    description: 外部コメントサービスなしで、Pages Functions、D1、Turnstileだけでコメント欄を作る設計です。
    icon: i-lucide-message-square-text
faq:
  title: よくある質問
  items:
    - question: どこから導入すべきですか？
      answer: 'まずAstroの静的ページ、ブログ、RSS、sitemap、OGPを固めます。次にCMSと多言語を入れ、相談導線が必要になってからAIチャット、サービスCTA、コメント機能を足す順番が扱いやすいです。'
    - question: すべてCloudflareだけで作るべきですか？
      answer: 'いいえ。問い合わせAIのようにOpenAI APIを使う部分もあります。ポイントは、配信、API境界、DB、bot対策をCloudflareへ寄せ、外部サービスを入れる場所と入れない場所を意識して分けることです。'
    - question: 小規模サイトでもここまで必要ですか？
      answer: '最初から全部は不要です。ただ、CMS、問い合わせ導線、多言語、コメントのどれかを足す予定があるなら、URL、データ保存先、preview環境、検索indexの扱いを早めに決めると後から楽になります。'
---

AstroとCloudflare Pagesで静的サイトを作ると、最初はページを速く安全に配信できれば十分です。

しかし運用を続けると、CMSで更新したい、多言語で出したい、AIチャットで訪問者を案内したい、フォームに文脈を渡したい、コメント欄も置きたい、という機能追加が出てきます。

この記事は、それらを **どの順番で入れるか、どのレイヤーに置くか、どの記事を読めばよいか** をまとめるインデックスです。Acecore公式サイトの実装を例にしながら、他のAstro + Cloudflare構成にも真似しやすい形で整理します。

## 結論

公式サイトを育てるときは、最初に「どこまでを静的HTMLにするか」「どこからをAPIにするか」「誰がコンテンツを更新するか」を分けるのが大事です。

Acecoreでは、次のように分担しました。

| レイヤー    | 担当するもの                               |
| ----------- | ------------------------------------------ |
| Astro       | ページ生成、ブログ、OGP、RSS、sitemap、UI  |
| Cloudflare  | Pages配信、Pages Functions、D1、Turnstile  |
| GitHub      | PRレビュー、CMS編集差分、翻訳差分、履歴    |
| Sveltia CMS | 日本語source、著者、タグ、画像、ページ文言 |
| OpenAI API  | 問い合わせAIの回答生成                     |
| Pagefind    | 静的HTMLに含める検索対象の索引             |

この分け方にすると、機能を増やしても「全部をCMSに入れる」「全部を外部SaaSに投げる」「全部をクライアント側で頑張る」状態になりません。

## 1. まず静的サイトとして強くする

土台はAstroです。

公式サイトの大半は、毎リクエストでサーバー処理をする必要がありません。

- サービス紹介
- 会社概要
- 制作事例
- ブログ記事
- 著者ページ
- タグページ
- RSS
- sitemap
- OGP

これらはbuild時に静的HTMLとして生成できます。

静的HTMLで出せるものは、なるべく静的に出します。これにより、表示速度、キャッシュ、検索エンジンへの渡しやすさ、障害時の影響範囲が安定します。

一方で、問い合わせAIやコメント投稿のように、リクエストごとの処理が必要なものだけをCloudflare Pages Functionsへ出します。

ここを最初に分けておくと、機能追加のたびに「これはAstroのbuild時に解決するのか」「Cloudflare側のAPIにするのか」を判断しやすくなります。

## 2. 動的機能はCloudflare側の小さなAPIにする

静的サイトにも、どうしても動的な処理はあります。

- 問い合わせAIチャット
- コメントの読み込みと投稿
- Turnstile検証
- Originチェック
- レート制限
- D1への保存

これらはCloudflare Pages Functionsへ寄せました。

Astro側に置くのはUIです。APIキー、D1 binding、Turnstile secret、hash salt、Origin判定はブラウザへ出しません。

この方針は、[問い合わせAIチャットの技術設計](/blog/astro-ai-contact-chat/) と [Cloudflareだけで作るブログコメント機能](/blog/cloudflare-only-blog-comments/) の両方で同じです。

| 機能         | UI        | API境界               | 保存先・外部API               |
| ------------ | --------- | --------------------- | ----------------------------- |
| 問い合わせAI | Astro     | `/api/ai-contact`     | OpenAI API                    |
| コメント     | Astro     | `/api/comments`       | Cloudflare D1                 |
| bot対策      | Turnstile | Pages Functionsで検証 | Cloudflare Siteverify         |
| rate limit   | なし      | Pages Functionsで判定 | メモリ、D1、必要ならWAF/KV/DO |

大事なのは、動的機能を足しても「サイト全体がアプリケーションサーバーになる」わけではないことです。

静的サイトの強みを残し、必要な境界だけをAPI化します。

## 3. CMSは編集入口、公開判断はPRにする

Sveltia CMSは、静的サイトに編集画面を足すために入れました。

ただし、CMSを入れたからといって、CMSを本番DBのように扱うわけではありません。

Acecoreでは、CMSは日本語sourceを編集する入口です。

- ブログ記事
- 著者情報
- タグ定義
- 日本語source JSON
- 画像アップロード

編集結果はGitHub上の差分になります。そこからPR、build、レビューを通してmainへ入れます。

この設計は [Sveltia CMS導入ガイド](/blog/cms-selection-and-turnstile/) に詳しく書きました。

CMSの役割を「公開DB」ではなく「Git差分を作るUI」と捉えると、静的サイトとの相性がよくなります。

## 4. 多言語はUI翻訳ではなく静的ページにする

多言語対応は、CMS画面で全言語を直接編集する運用にはしませんでした。

日本語sourceを正として、翻訳はGitHub CopilotのPRに分けています。

理由は単純です。

- 言語別URLを持てる
- title、description、OGP、JSON-LDを言語別にできる
- sitemap、RSS、hreflangに出せる
- 翻訳差分をレビューできる
- CMS画面を複雑にしすぎない

この考え方は [Sveltia CMSで多言語ブログを運用する方法](/blog/copilot-translation-pipeline/) にまとめています。

UI上で翻訳できることと、検索エンジンに言語別ページとして渡せることは別です。

だから、翻訳は表示時の処理ではなく、公開前のコンテンツ生成処理として扱います。

## 5. 問い合わせ導線は会話、CTA、フォームで分ける

問い合わせ周りは、全部をAIに寄せないようにしました。

訪問者の状態によって、適した導線が違うからです。

| 訪問者の状態                   | 使う導線           |
| ------------------------------ | ------------------ |
| どのサービスに合うか迷っている | 問い合わせAI       |
| すでにサービスページを読んだ   | サービスCTA        |
| 正式に相談内容を送りたい       | 問い合わせフォーム |
| LINEで軽く相談したい           | LINE導線           |

問い合わせAIは、公開済みサイト情報を使って案内します。個人情報をAIへ渡す場所にはしません。

サービスCTAは、ユーザーが読んでいたサービス文脈をURLパラメータでフォームへ渡します。フォーム側では、問い合わせ種別と件名を初期化します。

この部分は [サービスCTAから問い合わせフォームへ文脈を引き継ぐ技術設計](/blog/service-cta-contact-prefill/) で掘り下げています。

導線を増やすときは、役割を分けることが重要です。

AIチャットもフォームもLINEも、同じ「問い合わせボタン」ではありません。訪問者の迷い方に合わせて配置します。

## 6. AI出力はHTMLとして信頼しない

問い合わせAIを入れると、次に問題になるのが回答の描画です。

AIが `詳しくは[サービス一覧](/services/)をご覧ください` のようなMarkdownを返すなら、リンクとして表示したくなります。

しかし、AI回答をそのまま `innerHTML` に入れてはいけません。

そこで、[AIチャット回答のMarkdownリンク安全描画](/blog/ai-chat-markdown-link-safety/) では、次の方針にしました。

- AI回答はテキストとして受け取る
- 必要なMarkdownだけを小さく拾う
- URLはtrimしてから許可リストで判定する
- 許可できるURLだけDOM APIでリンク化する
- 許可できないURLはテキストとして残す

AI機能をサイトに入れるときは、モデルの精度だけでなく、出力をどう表示するかまで設計対象です。

## 7. コメント機能はCloudflareだけで閉じる

コメント機能は、外部コメントサービスを使わずに作りました。

これは今回の構成の中でも、特に分かりやすい判断です。

すでにCloudflare Pagesで配信しているなら、軽いコメント機能はCloudflare内で完結できます。

- Pages FunctionsでGET/POSTを受ける
- D1にコメントを保存する
- Turnstileをserver-side validationする
- Originとhostname allowlistを見る
- URL、メール、HTML、Markdownリンク、宣伝語句を拒否する
- D1の実体名とbindingをWranglerで明示する

詳しくは [CloudflareだけでAstroブログにコメント機能を作る方法](/blog/cloudflare-only-blog-comments/) にまとめています。

コメント欄は便利ですが、荒らされやすい場所でもあります。

だから「コメント機能を足す」ではなく、「どこまで投稿を許すか」「何を検索indexに入れないか」「削除運用をどうするか」を最初に決めます。

## 8. 検索対象と交流機能を分ける

ブログ本文は検索対象です。

一方、コメントはPagefind対象から外しています。

これは、静的サイトに交流機能を足すときの重要な判断です。

公式サイトの本文はレビュー済みコンテンツです。コメントは訪問者の投稿です。コメント本文まで検索対象やSEO対象にするなら、承認制、静的HTMLへの再生成、moderationが必要になります。

最初の実装では、コメントは交流機能として扱い、検索対象にはしません。

同じように、AIチャットの会話ログもブログ本文ではありません。問い合わせフォームの入力も公開コンテンツではありません。

サイト内にある情報をすべて検索対象にするのではなく、公開コンテンツ、操作UI、ユーザー投稿、管理画面を分けて扱う必要があります。

## 9. 目的別に読む

全部を一度に読む必要はありません。自分のサイトで足したい機能から入ると、判断しやすくなります。

| やりたいこと                                   | 先に読む記事                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| ブラウザから記事や画像を更新したい             | [Sveltia CMS導入ガイド](/blog/cms-selection-and-turnstile/)                                     |
| 多言語ブログを検索対象として出したい           | [Sveltia CMSで多言語ブログを運用する方法](/blog/copilot-translation-pipeline/)                  |
| AIチャットで訪問者を案内したい                 | [Astroサイトに問い合わせAIチャットを組み込む技術設計](/blog/astro-ai-contact-chat/)             |
| AI回答に安全なリンクを出したい                 | [AIチャット回答のMarkdownリンクを安全に描画する実装設計](/blog/ai-chat-markdown-link-safety/)   |
| サービスページからフォームへ送客したい         | [サービスCTAから問い合わせフォームへ文脈を引き継ぐ技術設計](/blog/service-cta-contact-prefill/) |
| 外部コメントサービスなしでコメント欄を作りたい | [CloudflareだけでAstroブログにコメント機能を作る方法](/blog/cloudflare-only-blog-comments/)     |

## おすすめの導入順

これから同じような構成を他サイトへ入れるなら、実装順はこうです。

1. 静的ページ、ブログ、RSS、sitemap、OGPをAstroで固める
2. Sveltia CMSで日本語sourceを編集できるようにする
3. 多言語ページを静的HTMLとして生成する
4. AIチャットとサービスCTAで相談導線を整える
5. AI回答のMarkdownリンクやフォームprefillの安全境界を固める
6. 必要になってからCloudflare内でコメント機能を足す

最初にCMSと多言語を固めると、後から記事を増やしやすくなります。

問い合わせAIやサービスCTAは、問い合わせ導線を強くしたいタイミングで入れます。

コメント機能は、ブログが読まれ始めてから足すくらいで十分です。

## 他サイトへ転用するときの最小構成

すべてを一度に入れる必要はありません。

最小構成はこうです。

```txt
Astro
  - 静的ページ
  - ブログ
  - RSS / sitemap / OGP

Cloudflare Pages
  - 静的配信
  - preview環境

GitHub
  - PRレビュー
  - build check
```

次に、必要に応じて足します。

```txt
CMSが必要
  -> Sveltia CMS + GitHub backend + CMS PR

多言語が必要
  -> locale別Markdown + 翻訳PR + hreflang

問い合わせ導線を強くしたい
  -> AIチャット + サービスCTA + フォームprefill

交流機能が必要
  -> Pages Functions + D1 + Turnstile + moderation方針
```

この順番なら、機能を足しても土台を壊しにくいです。

## まとめ

Astro + Cloudflareの公式サイトは、静的サイトのままでもかなり機能拡張できます。

重要なのは、すべてを一つの仕組みに押し込まないことです。

Astroは公開HTMLを作る。Cloudflareは配信と小さなAPI境界を受け持つ。Sveltia CMSは日本語sourceを編集する。翻訳はPRで作る。AIチャットは相談導線の整理に使う。コメントはCloudflare内に閉じる。検索対象はレビュー済みコンテンツに絞る。

このようにレイヤーを分けると、公式サイトは単なる会社案内ではなく、更新、翻訳、相談、交流まで扱える運用基盤になります。

このページを入口にすると、必要な機能だけを選びながら、静的サイトの土台を崩さずに拡張できます。
