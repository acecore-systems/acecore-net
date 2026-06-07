---
title: 'Astroサイトに問い合わせAIチャットを組み込んだ実装記録'
description: 'Astro + Cloudflare Pages 構成の静的サイトに、OpenAI Responses API を使った問い合わせAIチャットを追加した実装記録です。サイト内情報に限定した回答、フォーム・LINE・直接連絡先の出し分け、Originチェック、レート制限、安全なMarkdownリンク描画まで整理します。'
date: 2026-06-07T12:00
author: gui
tags: ['技術', 'Cloudflare', 'Webサイト', 'AI', 'サービス']
image: https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: この記事のポイント
  text: 問い合わせAIチャットは、フォームの代替ではなく、訪問者がサービス内容・相談先・次の行動を整理するための入口として設計しました。正式な相談や見積りはフォームへ、短い確認や教室関連はLINEへつなげます。
processFigure:
  title: 問い合わせAIチャットの流れ
  steps:
    - title: 表示
      description: サイト全体の右下にAIチャットを表示し、お問い合わせページにも起動導線を置く。
      icon: i-lucide-message-circle
      accent: brand
    - title: 送信
      description: ブラウザからは質問と必要最小限の履歴だけを /api/ai-contact に送る。
      icon: i-lucide-send
      accent: emerald
    - title: 制御
      description: Cloudflare Pages Function 側でOrigin、レート制限、入力長、APIキーを管理する。
      icon: i-lucide-shield-check
      accent: amber
    - title: 案内
      description: サイト内情報に基づいて、フォーム、LINE、必要時のみ直接連絡先へ案内する。
      icon: i-lucide-route
      accent: slate
compareTable:
  title: 通常の問い合わせ導線との違い
  before:
    label: フォームだけの導線
    items:
      - 訪問者が相談カテゴリを自分で判断する
      - サービスページやFAQを探し直す必要がある
      - 短い質問でもフォーム入力が必要になる
      - メールや電話を常時見せると問い合わせ品質がばらつく
  after:
    label: AIチャット併用の導線
    items:
      - サービス選びや相談先を会話で整理できる
      - 関連する内部リンクをその場で案内できる
      - 詳しい見積りはフォーム、短い相談はLINEへ分けられる
      - 直接連絡先は必要な場面だけ出せる
checklist:
  title: 実装時に決めたルール
  items:
    - text: AIチャットはフォーム送信を置き換えない
    - text: 回答は公開済みサイト情報に限定する
    - text: 料金、契約、納期、保証はAIが断定しない
    - text: メールと電話は常時露出しない
    - text: 内部リンクはlocaleに合わせたURLを使う
    - text: Markdownは安全な範囲だけ描画する
linkCards:
  - href: /contact/
    title: お問い合わせ
    description: AIチャット、LINE、フォーム、直接連絡先の入口を整理したページです。
    icon: i-lucide-message-square
  - href: /blog/cloudflare-pages-security/
    title: Cloudflare Pages のセキュリティ設定
    description: CSPやヘッダー設定など、静的サイト配信の土台を整理した記事です。
    icon: i-lucide-shield
  - href: /blog/cms-selection-and-turnstile/
    title: CMS選定とTurnstileの導入
    description: フォーム周辺の運用とボット対策を扱った関連記事です。
    icon: i-lucide-badge-check
faq:
  title: よくある質問
  items:
    - question: AIチャットだけで問い合わせを完結させる設計ですか？
      answer: いいえ。AIチャットはサービス内容や相談先を整理する入口です。見積り、契約、正式な依頼、個別事情の判断が必要な内容はフォームやLINEに誘導します。
    - question: OpenAI APIキーはブラウザに出ますか？
      answer: 出ません。ブラウザは /api/ai-contact に質問を送るだけで、OpenAI Responses API の呼び出しと API キー管理は Cloudflare Pages Function 側で行います。
    - question: AI回答内のリンクは自由に出せますか？
      answer: 自由には出しません。内部パス、acecore.net、公式LINE、必要時の mailto と tel だけを許可し、MarkdownリンクのURL前後に空白があってもtrimして安全判定します。
---

Acecoreのサイトには、右下から開けるAIチャットを追加しています。目的は、訪問者に何でもAIで答えることではありません。サービス内容、相談先、次に見るページをその場で整理し、必要に応じてフォームやLINEへつなぐことです。

実装は [問い合わせAIとCMS限定翻訳フローを実装したPR](https://github.com/acecore-systems/acecore-net/pull/98) が中心です。その後、AI回答に含まれるMarkdownリンクの描画を [別PR](https://github.com/acecore-systems/acecore-net/pull/99) で調整しました。

この記事では、Astro + Cloudflare Pages 構成の静的サイトに、OpenAI Responses API を使った問い合わせAIチャットを入れるときに決めた設計と実装上の注意点をまとめます。

## AIチャットをどこに置くか

AIチャットはサイト全体に右下固定で表示し、お問い合わせページではFAQの後にも起動導線を置いています。

問い合わせページは、次の役割分担にしました。

| 導線       | 役割                                                       |
| ---------- | ---------------------------------------------------------- |
| FAQ        | よくある疑問をページ内で先に解消する                       |
| AIチャット | サービス選び、相談先、関連ページを会話で整理する           |
| LINE       | 短い相談やAcecore Schools関連の連絡に使う                  |
| フォーム   | 見積り、制作相談、提携、採用など、記録を残したい相談に使う |
| 直接連絡先 | フォーム後の補足や急ぎの確認が必要な場合だけ開く           |

ここで大事なのは、AIチャットを「問い合わせフォームの代わり」にしないことです。AIは公開済みの情報をもとに道案内できますが、個別見積り、契約条件、確約が必要な判断まではできません。

[サービス紹介記事](/blog/service-introduction/) のような概要コンテンツと、[お問い合わせページ](/contact/) の具体的な受付導線をAIがつなぐ形にすると、訪問者の迷いを減らしやすくなります。

## Cloudflare Pages Function に寄せる

ブラウザ側からOpenAI APIを直接呼ぶ構成にはしていません。APIキーをブラウザに出さないため、`/api/ai-contact` という Cloudflare Pages Function を用意し、そこから OpenAI Responses API を呼び出します。

実装上の役割はこう分けています。

| 場所                     | 担当                                                     |
| ------------------------ | -------------------------------------------------------- |
| `AiChatWidget.astro`     | チャットUI、入力、履歴、Markdown描画                     |
| `/api/ai-contact`        | 入力検証、Originチェック、レート制限、OpenAI API呼び出し |
| Cloudflare Pages環境変数 | `OPENAI_API_KEY` と `OPENAI_MODEL` の管理                |

`OPENAI_MODEL` は環境変数で差し替えられるようにし、未設定時はデフォルトモデルを使います。READMEにも書いている通り、ブラウザに渡すのは質問と必要最小限の履歴だけです。

Cloudflare Pages の配信やCSPの考え方は、[Cloudflare Pagesで実現するセキュアな静的サイト配信](/blog/cloudflare-pages-security/) でも整理しています。

## サイト内情報だけで答える

AIチャットには、Acecoreサイト上で公開している情報をコンテキストとして渡しています。

主な内容は次の通りです。

- Acecoreのサービス領域
- 業務システム、サーバー、Web制作、デザイン、教育の概要
- Acecore Schools、Aceserver、AceStudioへの導線
- 実績、ブログ、お問い合わせ、公式LINEへのURL
- 見積り無料、返信目安、LINEとフォームの使い分け

そして、プロンプト側では次の制約を入れています。

- 公開サイトの情報だけで回答する
- 料金、日程、契約、保証、非公開情報を断定しない
- 詳細見積りや正式な相談はフォームへ案内する
- 短い相談や教室関連はLINEも案内する
- メールや電話は常時出さない

AIチャットにありがちな問題は、便利に見せようとして過剰に答えてしまうことです。特に見積り、契約、サポート範囲は、AIが言い切ると後から困ります。ここは「一般的に言える範囲」と「人が確認すべき範囲」を分けるほうが実運用向きです。

## localeごとのURLと文言を合わせる

このサイトは日本語を基準にしつつ、多言語ページも持っています。AIチャットも表示localeに合わせて回答言語と内部URLを変えます。

たとえば英語ページで質問されたら、回答も英語にし、サービスページへのリンクも `/en/services/` のようにlocale付きのURLを使います。日本語ページなら `/services/` を使います。

これは小さな差に見えますが、多言語サイトでは重要です。AI回答だけが日本語URLへ戻してしまうと、せっかくの多言語導線が崩れます。

多言語ブログや翻訳運用の土台は、[日本語記事を1本公開するだけで9言語ブログを回す方法](/blog/copilot-translation-pipeline/) にまとめています。

## メールと電話を常時出さない

問い合わせページでは、メールと電話を常時露出しない方針にしました。フォーム、LINE、AIチャットを先に置き、直接連絡先は折りたたみ内か、AIが必要だと判断した場面に限定します。

理由はシンプルです。

- 見積りや制作相談はフォームのほうが情報を揃えやすい
- 短い相談や教室関連はLINEのほうが軽い
- 電話やメールだけだと相談内容の分類が難しい
- 直接連絡先を常時前面に出すと、運用側の負荷が読めなくなる

AIチャットにも同じルールを入れています。訪問者が「直接連絡したい」「フォームが使えない」「急ぎで確認したい」といった意図を示した場合だけ、`mailto:` や `tel:` を短く案内します。

## Originチェックとレート制限

`/api/ai-contact` は公開APIなので、最低限の制御を入れています。

まず、`Origin` ヘッダーがある場合は、リクエスト元とAPIのホストが一致しているかを確認します。別サイトから勝手に呼ばれる想定を減らすためです。

次に、IPベースの簡易レート制限を入れています。現在は1分あたり10リクエストまでです。Cloudflareの `CF-Connecting-IP`、`X-Forwarded-For`、`CF-Ray` を順に使い、識別できない場合は `unknown` として扱います。

もちろん、これだけで完全な防御になるわけではありません。実運用では、Cloudflare側のWAF、Bot対策、ログ監視も合わせて見ます。ただ、AI APIはコストが発生するため、アプリ側でも最低限のブレーキを持っておく意味があります。

フォーム周辺のボット対策は、[ヘッドレスCMS選定記とTurnstileによるボット対策](/blog/cms-selection-and-turnstile/) でも触れています。

## Markdownリンクを安全に描画する

AI回答はプレーンテキストだけでも成立しますが、サービス案内ではリンクがあるほうが便利です。そのため、回答には簡単なMarkdownを許可しています。

ただし、MarkdownをそのままHTMLに流し込むことはしません。チャットUI側で自前の小さなパーサーを通し、許可した表現だけDOMに変換しています。

許可している主な表現は次の通りです。

- 段落
- 箇条書き
- 太字
- インラインコード
- Markdownリンク

リンク先はさらに絞っています。

- `/services/` のような同一サイト内パス
- 現在のorigin
- `https://acecore.net`
- 公式LINE
- 必要時の `mailto:info@acecore.net`
- 必要時の `tel:05088902788`

この部分は、実際にAIが `[サービス一覧]( /services/ )` のようにURL前後へ空白を含めて返すケースがあり、後から修正しました。URLを `trim()` してから安全判定することで、空白付きのMarkdownリンクでもリンクとして描画し、実際の `href` は整えた値にしています。

小さな修正ですが、AI回答をUIに出すときはこういう揺れがよく起きます。Markdown仕様の完全実装を目指すより、サイトで使う表現に絞って堅く処理するほうが管理しやすいです。

## ローカルと本番で違うところ

この実装では、ローカル確認と本番確認で見るべき場所が少し違います。

ローカルのAstro devやpreviewだけでは、Cloudflare Pages Functionsの実行環境と完全には一致しません。`OPENAI_API_KEY` がない環境ではAI回答は使えないので、UI側のフォールバックやエラー表示を確認します。

本番またはPages previewでは、次を確認します。

- `/api/ai-contact` が呼べる
- `OPENAI_API_KEY` と `OPENAI_MODEL` が設定されている
- 回答が表示localeに合っている
- 内部リンクがlocale付きURLになっている
- 見積りや契約をAIが断定していない
- メールや電話が常時出ていない
- Markdownリンクが安全なURLだけに変換されている

AI連携は「動けば終わり」ではなく、どこまで答えてよいかを確認する作業が大事です。特に問い合わせ導線では、回答の便利さと、事業側の責任範囲を両方見る必要があります。

## 今後分けて記事化したいこと

今回の記事では、問い合わせAIチャットだけに絞りました。関連して、サービスページからフォームへ相談対象を引き継ぐ導線も実装していますが、これは別記事に分ける予定です。

理由は、AIチャットとサービス別CTAでは論点が違うからです。

- AIチャット: 会話で迷いを整理する
- サービス別CTA: 読んでいるサービス文脈をフォームへ渡す

どちらも問い合わせ改善ですが、前者はAIと安全性、後者はフォームUXと導線設計の話になります。分けたほうが読みやすく、あとから内部リンクもしやすくなります。

## まとめ

問い合わせAIチャットを入れるときは、AIの回答能力よりも、導線設計と制御のほうが重要です。

今回の実装で特に効いたのは次の点です。

- ブラウザではなくCloudflare Pages FunctionからOpenAI APIを呼ぶ
- サイト内情報とlocale別URLをコンテキストに入れる
- AIが断定してよいこと、してはいけないことを明確にする
- フォーム、LINE、直接連絡先の役割を分ける
- Originチェックとレート制限を入れる
- Markdownリンクは許可リスト方式で描画する

静的サイトでも、問い合わせAIチャットは十分に組み込めます。ただし、AIを目立たせるより、訪問者が次の行動を選びやすくなる設計にすることが大切です。
