---
title: 'Astroサイトに問い合わせAIチャットを組み込む技術設計'
description: 'Astro + Cloudflare Pages 構成の静的サイトに、OpenAI Responses API を使った問い合わせAIチャットを組み込むための技術設計です。API境界、サイト内コンテキスト、プロンプト制御、locale別URL、Originチェック、レート制限、安全なMarkdownリンク描画まで、他サイトでも転用しやすい形で整理します。'
date: 2026-06-07T12:00
author: gui
tags: ['技術', 'Cloudflare', 'Webサイト', 'AI', 'サービス']
image: https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: この記事のポイント
  text: 問い合わせAIチャットは、AIに自由回答させる機能ではなく、公開済みサイト情報を使って訪問者を適切な導線へ案内する小さなアプリケーションとして設計します。APIキー、プロンプト、連絡先、Markdown描画はサーバー側と許可リストで制御します。
processFigure:
  title: 問い合わせAIチャットの参照アーキテクチャ
  steps:
    - title: Widget
      description: Astro側のチャットUIが質問、表示locale、必要最小限の履歴だけを送る。
      icon: i-lucide-message-circle
      accent: brand
    - title: Function
      description: Cloudflare Pages Functionが入力検証、Originチェック、レート制限、プロンプト生成を担当する。
      icon: i-lucide-shield-check
      accent: amber
    - title: Model
      description: OpenAI Responses APIへ公開サイト情報と会話文脈を渡し、回答テキストを受け取る。
      icon: i-lucide-sparkles
      accent: emerald
    - title: Renderer
      description: クライアント側で許可したMarkdownだけをDOM化し、内部リンクや連絡先へ案内する。
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: 導入時に分けるべき責務
  before:
    label: まとめて実装した場合
    items:
      - ブラウザからAI APIを直接呼んでしまう
      - サイト情報、APIキー、UI表示、リンク描画が混ざる
      - AIが料金、契約、納期を言い切りやすい
      - MarkdownやURLをそのままHTMLへ流し込みやすい
  after:
    label: 責務を分けた場合
    items:
      - APIキーとモデル呼び出しはサーバー側に閉じる
      - 公開サイト情報は明示的なコンテキストとして管理する
      - プロンプトで回答範囲と連絡導線を制御する
      - MarkdownとURLは許可リストで描画する
checklist:
  title: 他サイトへ導入するときの設計チェック
  items:
    - text: AIチャットの目的を「問い合わせ完結」ではなく「導線整理」と定義する
    - text: APIキーをブラウザに出さず、サーバー側のAPI境界を作る
    - text: 回答に使うサイト情報を公開済み情報だけに限定する
    - text: 料金、契約、納期、保証などAIが断定しない領域を決める
    - text: フォーム、LINE、メール、電話の出し分けルールを決める
    - text: locale別URLを生成し、多言語導線を壊さない
    - text: Originチェック、入力長制限、履歴制限、レート制限を入れる
    - text: Markdownリンクはtrim後に許可リストで判定する
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
    title: Sveltia CMS導入ガイド
    description: 静的サイトにCMS編集画面を足す設計を扱った関連記事です。
    icon: i-lucide-badge-check
faq:
  title: よくある質問
  items:
    - question: RAGやベクトルDBがないと問い合わせAIチャットは作れませんか？
      answer: 小規模なコーポレートサイトなら、まずは公開済みページの要点を構造化したコンテキストとしてプロンプトに渡すだけでも実用になります。ページ数や更新頻度が増えてから、検索インデックスやベクトルDBを検討すれば十分です。
    - question: OpenAI APIキーはブラウザに出ますか？
      answer: 出ません。ブラウザは /api/ai-contact に質問を送るだけで、OpenAI Responses API の呼び出しと API キー管理は Cloudflare Pages Function 側で行います。
    - question: AI回答内のリンクは自由に出せますか？
      answer: 自由には出しません。内部パス、同一origin、acecore.net、公式LINE、必要時の mailto と tel だけを許可し、MarkdownリンクのURL前後に空白があってもtrimして安全判定します。
---

問い合わせAIチャットは、サイトにAIを置くだけなら簡単です。しかし実運用で問題になるのは、モデルの性能よりも、どこまで答えさせるか、どの導線へ送るか、どのURLを表示してよいか、APIコストをどう抑えるかです。

Acecoreのサイトでは、Astro + Cloudflare Pages の静的サイトに問い合わせAIチャットを追加しました。実装の中心は [問い合わせAIとCMS限定翻訳フローを実装したPR](https://github.com/acecore-systems/acecore-net/pull/98) です。その後、AI回答に含まれるMarkdownリンクの安全な描画を [別PR](https://github.com/acecore-systems/acecore-net/pull/99) で調整しました。リンク描画の詳細は [AIチャット回答のMarkdownリンクを安全に描画する実装設計](/blog/ai-chat-markdown-link-safety/) に分けて整理しています。

この記事では、特定サイトの作業記録ではなく、他の静的サイトにも転用しやすい技術設計として整理します。Astro以外のフロントエンドでも考え方はほぼ同じで、クライアント、API境界、プロンプト、レンダラーの責務を分けるのが基本です。

## 全体構成

今回の構成は、シンプルな3層です。

| 層                   | 役割                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| チャットWidget       | UI、入力、表示locale、必要最小限の履歴、Markdown描画                 |
| `/api/ai-contact`    | 入力検証、Originチェック、レート制限、プロンプト生成、OpenAI呼び出し |
| OpenAI Responses API | サイト内情報と会話文脈に基づいた回答生成                             |

ブラウザからOpenAI APIを直接呼ぶ構成にはしません。理由は3つあります。

- APIキーをブラウザに出さない
- モデル、プロンプト、サイト内コンテキストをサーバー側で更新できる
- 入力長、Origin、レート制限、エラー処理を1か所に集約できる

Astro + Cloudflare Pages の場合、API境界は Cloudflare Pages Functions の `/api/ai-contact` として実装できます。Next.jsならRoute Handler、HonoやExpressならAPI routeに置き換えれば同じ考え方で使えます。

## エンドポイントの契約を小さくする

問い合わせAIチャットのAPIに送る情報は、できるだけ絞ります。

```ts
type ContactAiRequest = {
  message: string
  locale: 'ja' | 'en' | 'zh-cn' | 'es' | 'pt' | 'fr' | 'ko' | 'de' | 'ru'
  history?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

type ContactAiResponse = {
  answer: string
}
```

フォーム入力の氏名、メールアドレス、電話番号、会社名などは、AIチャットには送らない方針にしました。問い合わせAIチャットは個人情報を集める場所ではなく、訪問者が「どのサービスを見るべきか」「どこから相談すべきか」を整理する入口だからです。

履歴も無制限には送りません。直近数件だけにし、1メッセージあたりの文字数も制限します。これでプロンプト肥大化とAPIコストを抑えられます。

## サーバー側で入力と呼び出しを制御する

Cloudflare Pages Function 側では、次の処理をまとめて行います。

```ts
export async function onRequestPost({ request, env }: PagesFunction<Env>) {
  assertSameOrigin(request)
  assertRateLimit(request)

  const body = await request.json()
  const message = validateMessage(body.message)
  const locale = validateLocale(body.locale)
  const history = trimHistory(body.history)

  const prompt = buildContactPrompt({
    locale,
    message,
    history,
    siteContext: buildPublicSiteContext(locale),
  })

  const answer = await callOpenAIResponsesApi({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    prompt,
  })

  return Response.json({ answer })
}
```

実装のポイントは、OpenAI呼び出しの前に必ず入力を小さく整えることです。AI APIは、受け取った入力に対してコストが発生します。長文、不要な履歴、外部サイトからの連続アクセスをそのまま通すと、機能面より先に運用面が不安定になります。

`OPENAI_MODEL` は環境変数にしておくと、モデル変更やpreview環境での検証が楽です。`OPENAI_API_KEY` は当然サーバー側の環境変数だけで管理します。

Cloudflare Pages の配信やCSPの考え方は、[Cloudflare Pagesで実現するセキュアな静的サイト配信](/blog/cloudflare-pages-security/) でも整理しています。

## サイト内情報をコンテキストとして明示する

この規模のサイトでは、最初からベクトルDBやRAGを入れなくても構いません。まずは、公開済みサイト情報の要点を構造化してプロンプトに渡すほうが、実装も運用も軽くなります。

たとえば、次のような情報をサーバー側で組み立てます。

- 会社やサービスの概要
- 各サービスの対象者、相談例、関連URL
- FAQで回答済みの内容
- 問い合わせフォーム、LINE、メール、電話の使い分け
- 料金、契約、納期などAIが断定してはいけない領域
- localeごとの内部URL

重要なのは、モデルに「知っていそうなこと」を答えさせるのではなく、「このサイトとして回答してよい情報」を渡すことです。

```ts
function buildPublicSiteContext(locale: Locale) {
  return {
    services: [
      {
        name: 'Web制作',
        summary: 'コーポレートサイト、採用サイト、LPの制作相談に対応',
        url: localizePath('/services/web-production/', locale),
      },
      {
        name: '業務システム',
        summary: '予約、在庫、顧客管理などの業務改善システムに対応',
        url: localizePath('/services/business-system/', locale),
      },
    ],
    contact: {
      form: localizePath('/contact/', locale),
      line: 'https://lin.ee/...',
      emailPolicy: 'フォームが使えない場合や補足が必要な場合だけ案内する',
      phonePolicy: '急ぎの確認が必要な場合だけ案内する',
    },
  }
}
```

ページ数が少ないうちはこの方式で十分です。ページ数、更新頻度、検索要件が増えてきたら、Pagefind、CMSのJSON、D1、Vectorizeなどを使って検索レイヤーを足す判断になります。

## プロンプトは回答文よりルールを書く

問い合わせAIチャットのプロンプトでは、自然な文章を書かせる指示よりも、回答範囲と禁止事項を明確にします。

```txt
あなたはこのサイトの問い合わせ案内AIです。
公開済みサイト情報だけを根拠に回答してください。

ルール:
- 料金、契約、納期、保証を断定しない
- 詳細見積りや正式な相談は問い合わせフォームへ案内する
- 短い確認や教室関連の相談はLINEも案内する
- メールと電話は、ユーザーが直接連絡を求めた場合だけ案内する
- 内部リンクは現在のlocaleに合うURLを使う
- わからない場合は、推測せずフォームへ案内する
```

AIチャットにありがちな失敗は、サービスをよく見せようとしてモデルが言い切ってしまうことです。たとえば「いくらでできますか」「いつまでに納品できますか」「必ず対応できますか」といった質問には、一般的な案内に留め、正式な回答はフォームへ送る必要があります。

これは法務的な話だけではありません。見積りや納期は、ヒアリング前に確定できないからです。プロンプトには、営業上便利な回答よりも、運用で責任を持てる回答の範囲を書きます。

## 問い合わせ導線の役割を分ける

AIチャットはフォームの代替ではありません。問い合わせページ全体では、導線を次のように分けると運用しやすくなります。

| 導線       | 役割                                                       |
| ---------- | ---------------------------------------------------------- |
| FAQ        | よくある疑問をページ内で先に解消する                       |
| AIチャット | サービス選び、相談先、関連ページを会話で整理する           |
| LINE       | 短い相談、教室関連、軽い確認に使う                         |
| フォーム   | 見積り、制作相談、提携、採用など、記録を残したい相談に使う |
| 直接連絡先 | フォーム後の補足や急ぎの確認が必要な場合だけ開く           |

[サービス紹介記事](/blog/service-introduction/) のような概要コンテンツと、[お問い合わせページ](/contact/) の具体的な受付導線をAIがつなぐ形にすると、訪問者は自分でページを探し直さずに済みます。

この設計は、BtoBサイト、制作会社サイト、スクールサイト、SaaSのサポート導線でも応用できます。AIに問い合わせを完結させるのではなく、次に見るページや連絡手段を絞る用途にすると、導入しやすくなります。

## localeごとのURLを崩さない

多言語サイトでは、AI回答の言語だけでなく、リンク先URLもlocaleに合わせる必要があります。

たとえば英語ページで質問されたら、回答も英語にし、サービスページへのリンクも `/en/services/` のようにlocale付きのURLを使います。日本語ページなら `/services/` を使います。

この処理は、プロンプトに任せるより、サーバー側のURL生成関数で決めるほうが安定します。

```ts
function localizePath(path: string, locale: Locale) {
  if (locale === 'ja') return path
  return `/${locale}${path}`
}
```

AI回答だけが日本語URLへ戻してしまうと、多言語導線が崩れます。多言語ブログや翻訳運用の土台は、[Sveltia CMSで多言語ブログを運用する方法](/blog/copilot-translation-pipeline/) にまとめています。

## Originチェックとレート制限を入れる

`/api/ai-contact` は公開APIなので、少なくともOriginチェック、入力長制限、履歴制限、レート制限を入れます。

Originチェックでは、`Origin` ヘッダーがある場合に、リクエスト元とAPIのホストが一致しているかを確認します。別サイトから勝手に呼ばれる想定を減らすためです。

```ts
function assertSameOrigin(request: Request) {
  const origin = request.headers.get('Origin')
  if (!origin) return

  const requestUrl = new URL(request.url)
  const originUrl = new URL(origin)

  if (originUrl.host !== requestUrl.host) {
    throw new Response('Forbidden', { status: 403 })
  }
}
```

レート制限は、まずIPベースの簡易制限からでも有効です。Cloudflare環境なら、`CF-Connecting-IP`、`X-Forwarded-For`、`CF-Ray` などを使って識別します。

ただし、インメモリのレート制限は、複数isolateや再起動をまたぐ永続的な制限にはなりません。小規模サイトの初期ブレーキとしては使えますが、アクセスが増える場合はCloudflare WAF、Turnstile、KV、D1、Durable Objectsなどに寄せるほうが安定します。

コンテンツ更新側のCMS設計は、[Sveltia CMS導入ガイド](/blog/cms-selection-and-turnstile/) に分けて整理しています。フォームやコメントのbot対策はTurnstileなど別レイヤーとして扱います。

## Markdownリンクは許可リストで描画する

AI回答にリンクを含められると、サービス案内としては便利です。ただし、MarkdownをそのままHTMLへ流し込むのは避けます。

チャットUI側では、許可した表現だけをDOMに変換します。

- 段落
- 箇条書き
- 太字
- インラインコード
- Markdownリンク

リンク先はさらに絞ります。

- `/services/` のような同一サイト内パス
- 現在のorigin
- `https://acecore.net`
- 公式LINE
- 必要時の `mailto:info@acecore.net`
- 必要時の `tel:05088902788`

このとき、URLは必ず `trim()` してから判定します。AIは `[サービス一覧]( /services/ )` のように、URL前後へ空白を含めて返すことがあります。

```ts
function sanitizeHref(rawHref: string, currentOrigin: string) {
  const href = rawHref.trim()

  if (href.startsWith('/')) return href
  if (href.startsWith(`${currentOrigin}/`)) return href
  if (href.startsWith('https://acecore.net/')) return href
  if (href.startsWith('https://lin.ee/')) return href
  if (href === 'mailto:info@acecore.net') return href
  if (href === 'tel:05088902788') return href

  return null
}
```

Markdown仕様の完全実装を目指すより、チャットで使う表現に絞って堅く処理するほうが管理しやすいです。外部URLを自由に出したい場合でも、少なくともドメイン許可リストと `rel="noopener noreferrer"` は入れておくべきです。

## ローカル、preview、本番で確認すること

ローカルのAstro devやpreviewだけでは、Cloudflare Pages Functionsの実行環境と完全には一致しません。`OPENAI_API_KEY` がない環境ではAI回答は使えないので、UI側のフォールバックやエラー表示を確認します。

Pages previewまたは本番では、次を確認します。

- `/api/ai-contact` がPOSTで呼べる
- `OPENAI_API_KEY` と `OPENAI_MODEL` が設定されている
- Originが違うリクエストを拒否できる
- 入力長と履歴件数が制限されている
- 回答が表示localeに合っている
- 内部リンクがlocale付きURLになっている
- 見積りや契約をAIが断定していない
- メールや電話が常時出ていない
- Markdownリンクが安全なURLだけに変換されている

AI連携は、1回質問して返ってくれば完了ではありません。想定外の質問、長文、英語ページからの質問、直接連絡先を求める質問、料金を聞く質問を分けて確認します。

## ログと運用で見たい指標

問い合わせAIチャットは、公開後のログ確認も重要です。

最低限、次の指標を見ます。

- APIのエラー率
- レート制限にかかった回数
- 1回の問い合わせあたりの平均メッセージ数
- フォームやLINEへの遷移数
- AIが回答できずフォームへ案内した回数
- locale別の利用数

会話内容を保存する場合は、個人情報の扱いを先に決める必要があります。まずは本文を保存せず、イベント数やエラーだけを見る運用から始めるのが安全です。

## 今回分けた範囲

今回の記事では、問い合わせAIチャットの技術設計だけに絞りました。関連して、サービスページからフォームへ相談対象を引き継ぐ導線も実装しており、こちらは [サービスCTAから問い合わせフォームへ文脈を引き継ぐ技術設計](/blog/service-cta-contact-prefill/) に分けて整理しました。

理由は、論点が違うからです。

- AIチャット: 会話で迷いを整理し、安全に案内する
- サービス別CTA: 読んでいるサービス文脈をフォームへ渡す

前者はAI、API境界、プロンプト、安全な描画の話です。後者はフォームUXと導線設計の話です。分けたほうが読みやすく、あとから内部リンクもしやすくなります。

## まとめ

問い合わせAIチャットを静的サイトに組み込むときは、チャットUIよりも、API境界と回答制御を先に設計するほうが重要です。

今回の実装で特に効いたのは次の点です。

- ブラウザではなくCloudflare Pages FunctionからOpenAI APIを呼ぶ
- エンドポイントの入力を小さくし、履歴と文字数を制限する
- サイト内情報とlocale別URLをサーバー側で組み立てる
- AIが断定してよいこと、してはいけないことをプロンプトに書く
- フォーム、LINE、直接連絡先の役割を分ける
- Originチェックとレート制限を入れる
- Markdownリンクはtrim後に許可リスト方式で描画する

静的サイトでも、問い合わせAIチャットは十分に実装できます。導入時の中心は、AIを目立たせることではなく、訪問者が安全に次の行動を選べるようにすることです。
