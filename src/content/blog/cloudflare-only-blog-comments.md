---
title: 'CloudflareだけでAstroブログにコメント機能を作る方法'
description: '外部コメントサービスに頼らず、Cloudflare Pages Functions、D1、Turnstile、Wrangler設定だけでAstroブログにコメント機能を追加した実装記録です。API設計、保存先、スパム対策、origin制御、preview/production分離、運用時の注意点まで整理します。'
date: 2026-06-07T18:00
lastUpdated: 2026-06-07
author: gui
tags: ['技術', 'Cloudflare', 'Astro', 'セキュリティ', 'Webサイト']
image: /uploads/acecore-generated/blog-cloudflare-pages-security.webp
callout:
  type: tip
  title: 外部コメントサービスなしで完結させる
  text: 'コメント機能は、外部SaaSや埋め込みウィジェットを使わなくても、Cloudflare Pages Functions、D1、Turnstileを組み合わせれば静的サイトのまま実装できます。重要なのは、投稿API、保存先、bot対策、origin制御、削除運用を最初から分けて設計することです。'
processFigure:
  eyebrow: Cloudflare Comments
  title: Cloudflareだけで作るコメント機能の構成
  description: 'AstroはUIを描画し、Cloudflare Pages FunctionsがAPI境界になり、D1とTurnstileをCloudflare内の部品としてつなぎます。'
  variant: inline
  steps:
    - title: AstroにUIを置く
      description: '記事詳細の下にコメント一覧、投稿フォーム、Turnstile widgetを配置する。'
      icon: i-lucide-message-square-text
      accent: brand
    - title: Pages Functionで受ける
      description: '`/api/comments` がGET/POST/OPTIONSを処理し、入力検証とCORSを担当する。'
      icon: i-lucide-cloud
      accent: slate
    - title: D1に保存する
      description: '`COMMENTS_DB` bindingでSQLite互換のD1へコメント、hash、作成日時を保存する。'
      icon: i-lucide-database
      accent: emerald
    - title: Turnstileで守る
      description: 'Cloudflare Turnstile tokenをserver-side validationし、hostname allowlistも確認する。'
      icon: i-lucide-shield-check
      accent: amber
compareTable:
  title: 外部コメントサービスとCloudflare内製の違い
  before:
    label: 外部コメントサービス
    items:
      - '導入は速いが、UI、データ保存先、規約、表示速度をサービス側に寄せる'
      - '外部scriptやiframeが記事ページの読み込みに影響しやすい'
      - '多言語UIやサイトデザインとの統一に制約が出やすい'
      - 'コメントデータの扱い、削除、移行がサービス仕様に依存する'
  after:
    label: Cloudflareだけで実装
    items:
      - 'Pages Functions、D1、TurnstileだけでAPIと保存先を持てる'
      - 'Astro側のHTML/CSSとしてサイトデザインへ自然に合わせられる'
      - 'Wrangler設定でpreviewとproductionのD1を分けられる'
      - 'スパム対策、削除、保存する個人情報の範囲を自分たちで決められる'
checklist:
  title: 実装前に決めること
  items:
    - text: 'コメントを外部サービスへ預けず、自サイトのCloudflare構成で持つ'
      checked: true
    - text: '保存先はD1、API境界はCloudflare Pages Functionsにする'
      checked: true
    - text: 'Turnstile tokenは必ずserver-side validationする'
      checked: true
    - text: 'URL、メール、HTML、Markdownリンク、宣伝語句を投稿前に拒否する'
      checked: true
    - text: 'preview/localとproductionのD1 bindingを分ける'
      checked: true
linkCards:
  - href: /blog/cloudflare-pages-security/
    title: Cloudflare Pages のセキュリティ設定
    description: 'Cloudflare Pagesで静的サイトを安全に配信する基本設計です。'
    icon: i-lucide-shield
  - href: /blog/cms-selection-and-turnstile/
    title: Sveltia CMS導入ガイド
    description: 'Cloudflare Workers上のOAuthやTurnstileを含むCMS導入の実装記録です。'
    icon: i-lucide-badge-check
  - href: /blog/astro-ai-contact-chat/
    title: Astroサイトに問い合わせAIチャットを組み込む技術設計
    description: 'Cloudflare Pages FunctionsでAPI境界を作る別の実装例です。'
    icon: i-lucide-bot
faq:
  title: よくある質問
  items:
    - question: 外部コメントサービスを使わないメリットは何ですか？
      answer: 'データ保存先、UI、スパム対策、削除運用、preview環境の扱いを自分たちで決められることです。外部scriptやサービス仕様への依存も減ります。'
    - question: D1だけでコメント機能は足りますか？
      answer: '記事コメントのように、post_slugで取得し、作成日時順に表示する小規模なリレーショナルデータならD1で扱いやすいです。リアルタイム通知や大規模な権限管理が必要なら別設計を検討します。'
    - question: Turnstileをフロントに置くだけではだめですか？
      answer: 'だめです。TurnstileのtokenはPages Function側でSiteverify APIへ送り、成功結果とhostnameを確認してから保存処理へ進めます。'
---

静的サイトにコメント欄を付けるとき、まず候補に上がりやすいのは外部コメントサービスやGitHub Discussions連携です。

導入だけならそれも速いです。しかし今回は、**外部コメントサービスに頼らず、CloudflareだけでAstroブログのコメント機能を作る** 方針にしました。

実装の中心になったのは [Cloudflare コメント機能を追加したPR](https://github.com/acecore-systems/acecore-net/pull/101) です。この記事では、そのPRで入れた構成をもとに、他のAstroサイトでも再利用しやすい考え方として整理します。

## なぜ外部コメントサービスを使わなかったか

外部コメントサービスにはメリットがあります。

- 導入が速い
- 管理画面や通知が用意されている
- 既存のユーザー認証やスパム対策に乗れる場合がある
- サーバー側の実装を持たなくてよい

一方で、公式サイトのブログに入れる機能として考えると、気になる点もあります。

- 外部scriptやiframeが記事ページの読み込みに入る
- UIをサイトのデザインに合わせにくい
- コメントデータの保存先と削除方針をサービス側へ寄せることになる
- 多言語UIやlocaleごとの見せ方を細かく制御しにくい
- サービス終了、仕様変更、規約変更の影響を受ける

AcecoreのサイトはすでにCloudflare Pagesで配信しており、問い合わせAIもPages Functions経由で動かしています。

であれば、コメント機能も同じ境界に寄せて、Cloudflare Pages Functions、D1、Turnstileだけで完結させるほうが筋がよいと判断しました。

## 全体構成

今回の構成は次の通りです。

| 役割         | 実装                                                        |
| ------------ | ----------------------------------------------------------- |
| 表示UI       | `src/components/BlogComments.astro`                         |
| 記事への配置 | `src/views/BlogPostPage.astro`                              |
| API          | `functions/api/comments.ts`                                 |
| 保存先       | Cloudflare D1 binding `COMMENTS_DB`                         |
| bot対策      | Cloudflare Turnstile                                        |
| 環境設定     | `wrangler.jsonc`                                            |
| schema       | `migrations/0001_create_blog_comments.sql`                  |
| 文言         | `src/i18n/source/ja/blog.json` と各localeのtranslation JSON |

Astro側はコメント一覧とフォームを出すだけです。読み込みと投稿は `/api/comments` へfetchします。

Cloudflare Pages Functions側は、次の責務を持ちます。

- `GET /api/comments` で記事slugに紐づくコメントを返す
- `POST /api/comments` で投稿を受ける
- `OPTIONS` でCORS preflightに返す
- Originを確認する
- 入力を正規化する
- Turnstile tokenをCloudflareへ検証しに行く
- レート制限と重複投稿チェックを行う
- D1へ保存する
- 公開用レスポンスから不要な内部情報を落とす

Cloudflare PagesのFunctions bindingは、Pages FunctionからD1などのCloudflareリソースに接続するための入口です。Cloudflare公式ドキュメントでも、D1 bindingはWrangler設定またはダッシュボードからPages Functionへ接続できるものとして説明されています。

## D1をコメント保存先にする

コメントはリレーショナルデータです。

記事slug、表示名、本文、作成日時、削除日時、重複判定用hash、クライアント判定用hashを持ちます。

今回のschemaはシンプルです。

```sql
CREATE TABLE IF NOT EXISTS blog_comments (
  id TEXT PRIMARY KEY,
  post_slug TEXT NOT NULL,
  locale TEXT NOT NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  body_hash TEXT NOT NULL,
  client_hash TEXT NOT NULL,
  user_agent_hash TEXT NOT NULL,
  risk_score INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);
```

表示対象は `deleted_at IS NULL` のコメントだけにします。

物理削除ではなくsoft deleteにしているのは、荒らし投稿を非表示にしつつ、あとから状況を確認できるようにするためです。小規模なコメント機能なら、いきなり管理画面を作るより、まずはD1上の `deleted_at` を運用で更新できる形にするだけでも始められます。

また、取得用、クライアント別制限用、重複検知用にindexを用意しています。

```sql
CREATE INDEX IF NOT EXISTS idx_blog_comments_post_created
  ON blog_comments (post_slug, deleted_at, created_at);

CREATE INDEX IF NOT EXISTS idx_blog_comments_client_created
  ON blog_comments (client_hash, created_at);

CREATE INDEX IF NOT EXISTS idx_blog_comments_duplicate
  ON blog_comments (post_slug, body_hash, created_at);
```

D1では、Function側から `env.COMMENTS_DB.prepare(...).bind(...).all()` のようにprepared statementを使います。Cloudflare D1の公式ドキュメントでも、`bind()` で値を渡すprepared statementはSQL injection対策として説明されています。

コメント本文やslugをSQL文字列へ直接連結しないことが重要です。

## Wrangler設定をsource of truthにする

D1 bindingと環境変数は `wrangler.jsonc` に寄せました。

```jsonc
{
  "vars": {
    "COMMENT_ALLOWED_HOSTNAMES": "acecore.net,www.acecore.net,acecore-net.pages.dev,localhost,127.0.0.1",
  },
  "d1_databases": [
    {
      "binding": "COMMENTS_DB",
      "database_name": "acecore-comments-preview",
      "database_id": "...",
      "migrations_dir": "./migrations",
    },
  ],
  "env": {
    "preview": {
      "d1_databases": [
        {
          "binding": "COMMENTS_DB",
          "database_name": "acecore-comments-preview",
        },
      ],
    },
    "production": {
      "d1_databases": [
        {
          "binding": "COMMENTS_DB",
          "database_name": "acecore-comments-production",
        },
      ],
    },
  },
}
```

Cloudflare PagesのWrangler設定は、Pages project configurationのsource of truthとして扱われます。つまり、bindingや環境変数をダッシュボードの手作業だけに散らさず、リポジトリ側でレビューできる形にできます。

ここで大事なのは、**preview/localとproductionのD1を分けること** です。

コメント機能は投稿データを持つので、preview環境で本番D1へ書き込むと事故になります。今回も `acecore-comments-preview` と `acecore-comments-production` を分け、同じ `COMMENTS_DB` binding名で環境ごとに向き先を変えています。

## Turnstileはサーバー側で検証する

フロント側にはTurnstile widgetを置きます。

ただし、widgetを表示するだけでは不十分です。投稿時に取得したtokenをPages Functionへ送り、Function側からCloudflareのSiteverify APIへ検証しに行きます。

実装では次のようにしています。

```ts
const formData = new FormData()
formData.append('secret', env.TURNSTILE_SECRET_KEY)
formData.append('response', token)
if (remoteIp) formData.append('remoteip', remoteIp)

const response = await fetch(
  'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  {
    method: 'POST',
    body: formData,
  },
)
```

Cloudflare Turnstileの公式ドキュメントでも、tokenはSiteverify APIでserver-side validationする前提で説明されています。tokenには有効期限があり、期限切れや再利用されたtokenは失敗します。

さらに、Siteverifyの結果に含まれるhostnameも確認します。

```ts
return Boolean(
  result.success &&
  (!result.hostname || isAllowedVerifiedHostname(result.hostname, env)),
)
```

これは、Turnstile tokenだけを見ると「どのhostnameで発行されたtokenか」を見落とすためです。CloudflareのAny Hostnameに関するドキュメントでも、server-side codeでhostnameを検証する必要があると説明されています。

## Originとhostname allowlistを分けて考える

コメントAPIはブラウザから呼ばれます。つまり、CORSとOriginの扱いを決める必要があります。

今回の実装では、次の2段階で守っています。

1. リクエストの `Origin` が許可されたhostnameか見る
2. Turnstileの検証結果のhostnameも許可されたhostnameか見る

許可対象は `COMMENT_ALLOWED_HOSTNAMES` で管理します。

```txt
acecore.net,www.acecore.net,acecore-net.pages.dev
```

ここで `acecore-net.pages.dev` を許可すると、その配下のGit preview URLも通せます。

ただし、これは便利な反面、許可範囲を広げすぎると別環境から投稿できる面が増えます。外部サービスを使わずに自前で作る場合、このような許可リストの粒度も自分たちで責任を持つ必要があります。

## 投稿内容はかなり絞る

コメント欄は荒らされやすい場所です。

今回は、機能を広げるより先に「投稿できる内容」を絞りました。

投稿payloadは次だけです。

```ts
type CommentPayload = {
  slug?: unknown
  locale?: unknown
  authorName?: unknown
  body?: unknown
  website?: unknown
  turnstileToken?: unknown
}
```

`website` はハニーポットです。通常ユーザーには見えないhidden inputに値が入っていたらbot投稿として拒否します。

本文側では、次のような内容を拒否します。

- URL
- メールアドレス
- HTMLタグ
- Markdownリンク
- 極端な連続文字
- 宣伝やスパムで使われやすい語句

```ts
function isBlockedText(value: string): boolean {
  return (
    URL_PATTERN.test(value) ||
    EMAIL_PATTERN.test(value) ||
    HTML_TAG_PATTERN.test(value) ||
    MARKDOWN_LINK_PATTERN.test(value) ||
    REPEATED_CHARACTER_PATTERN.test(value) ||
    SPAM_WORD_PATTERN.test(value)
  )
}
```

かなり強めの制限ですが、公式サイトのブログコメントではこれで十分です。

リンクを貼れるコメント欄にすると、スパム投稿の動機が一気に増えます。まずは感想や補足だけを書けるコメント欄として設計し、必要になったら承認制や管理画面を足すほうが安全です。

## レート制限は二層にする

Cloudflareだけで実装する場合でも、rate limitは考える必要があります。

今回は、2種類の制限を入れました。

| 種類           | 役割                                                |
| -------------- | --------------------------------------------------- |
| メモリ上の制限 | 短時間の連続POST/GETをその場で抑える                |
| D1上の制限     | isolateや再起動をまたいで、同じclientの連投を抑える |

メモリ上の制限だけだと、Cloudflareの実行環境が変わったときに状態が消えます。そこで、D1にも `client_hash` と `created_at` を保存し、直近の投稿数を見ます。

```sql
SELECT COUNT(*) AS count
FROM blog_comments
WHERE client_hash = ?
  AND created_at >= ?
  AND deleted_at IS NULL
```

`client_hash` はIPアドレスとUser-Agentから作ります。ただし、生のIPやUser-Agentをそのまま保存するのではなく、`COMMENT_HASH_SALT` を混ぜてSHA-256でhash化しています。

これにより、運用に必要な連投判定はできる一方で、不要に生の識別情報を保存しない設計にできます。

## 重複投稿もD1で見る

Turnstileを入れても、同じ本文を何度も投稿される可能性はあります。

そこで、本文を正規化して `body_hash` を作り、同じ記事に同じ本文が一定期間内に入っていないか確認します。

```sql
SELECT id
FROM blog_comments
WHERE post_slug = ?
  AND body_hash = ?
  AND created_at >= ?
  AND deleted_at IS NULL
LIMIT 1
```

これもD1に向いている処理です。

KVでも単純なrate limitはできますが、記事slug、作成日時、削除状態、重複判定を組み合わせて見るなら、SQLで扱えるD1のほうが実装が素直になります。

## コメントは記事slugに紐づける

記事側では `BlogPostPage.astro` にコメントコンポーネントを追加しました。

```astro
<BlogComments locale={locale} slug={baseSlug} />
```

ここで渡すのはlocale付きのパスではなく、記事のbase slugです。

つまり、`/blog/cloudflare-only-blog-comments/` と `/en/blog/cloudflare-only-blog-comments/` のような言語違いがあっても、同じslugに紐づくコメントとして扱えます。

もちろん、言語別にコメント欄を完全に分けたいなら、D1の取得条件に `locale` を入れればよいです。今回は、コメントを記事単位で共有しつつ、UI文言や日時表示だけlocaleに合わせる設計にしました。

## コメントを検索indexに入れるか

今回のUIには `data-pagefind-ignore` を付けています。

コメントはブラウザ側で `/api/comments` から読み込みます。つまり、Astro build時のHTMLにはコメント本文が入りません。

この設計では、Pagefindや静的HTML上のSEO対象としてコメントを扱わないことになります。

これは意図的です。

公式ブログの本文は編集・レビュー済みのコンテンツとして検索対象にします。一方、コメントは訪問者の補足であり、スパムや雑談が混ざる可能性があります。検索流入を狙う本文と、コミュニケーションのためのコメント欄は分けて考えたほうが運用しやすいです。

もしコメント本文も検索対象にしたいなら、次のような別設計が必要です。

- コメントをbuild時に取得してHTMLへ埋め込む
- 定期buildや再生成の仕組みを持つ
- 承認済みコメントだけを静的HTMLへ出す
- Pagefind対象にするコメントと対象外にするコメントを分ける

最初の実装では、ここまでやらない判断にしました。

## 即時公開か承認制か

今回は、承認待ちにせず即時公開にしました。

ただし、これは何もしないという意味ではありません。API側で次を通した投稿だけを保存します。

- Originが許可されている
- Turnstileがserver-side validationを通っている
- hostnameがallowlistに入っている
- ハニーポットが空
- URLやメールアドレスを含まない
- 本文が短すぎない
- rate limitにかかっていない
- 同じ本文の重複投稿ではない

承認制にする場合は、schemaに `approved_at` や `status` を追加し、表示クエリを `approved_at IS NOT NULL` に変えれば実現できます。

今回のような小規模な公式サイトでは、まずは強めの投稿制限とsoft deleteで始め、必要になったら管理画面を足すほうが実装量と運用負荷のバランスがよいです。

## Cloudflareだけで完結させたときのよさ

この構成の一番の利点は、**コメント機能の境界がサイトの既存構成と揃うこと** です。

Cloudflare Pagesで静的HTMLを配信し、動的な最小部分だけPages Functionsで受ける。保存先はD1。bot対策はTurnstile。設定はWrangler。すべてCloudflare内で説明できます。

外部コメントサービスを使う場合、便利な反面、コメント欄だけ別の設計思想になります。

- 表示UIが外部サービスに寄る
- コメントデータの持ち主が変わる
- 外部scriptの読み込みが増える
- 削除や移行がサービス仕様に依存する
- プライバシー説明が複雑になる

Cloudflare内に閉じると、その代わりに自分たちで作る責任は増えます。

しかし、公式サイトのように「コメント機能はほしいが、大規模コミュニティ機能まではいらない」ケースでは、Cloudflareだけで作る構成はかなり相性がよいです。

## 導入手順のまとめ

他のAstroサイトに入れるなら、流れはこうです。

1. Cloudflare D1 databaseをpreview用とproduction用に作る
2. `wrangler.jsonc` に `COMMENTS_DB` bindingを追加する
3. `TURNSTILE_SECRET_KEY` と `COMMENT_HASH_SALT` をPages secretに設定する
4. `COMMENT_ALLOWED_HOSTNAMES` に本番hostとPages preview hostを入れる
5. `migrations/0001_create_blog_comments.sql` を作る
6. `npx wrangler d1 execute ... --remote --file=...` でschemaを適用する
7. `functions/api/comments.ts` でGET/POST/OPTIONSを実装する
8. `BlogComments.astro` で一覧、フォーム、Turnstile widgetを実装する
9. `BlogPostPage.astro` の本文下へコメントコンポーネントを置く
10. productionとpreviewで別D1に書き込まれることを確認する

Cloudflare D1のWrangler commandでは、SQLファイルを実行する `d1 execute` や、versioned migration fileを作る `d1 migrations create` / `d1 migrations apply` が用意されています。プロジェクトの運用に合わせて、単発のschema適用にするか、migrations applyに寄せるかを決めます。

## ローカルとpreviewで確認すること

コメント機能は、静的HTMLだけ見ても確認しきれません。

最低限、次を見ます。

- 記事詳細にコメント欄が表示される
- `/api/comments?slug=...` が空配列または既存コメントを返す
- Turnstile未完了ではPOSTできない
- URLやメールアドレス入りの本文が拒否される
- 同じ本文の連投が拒否される
- production previewで本番D1へ書き込まない
- `COMMENT_ALLOWED_HOSTNAMES` にないoriginから拒否される
- `deleted_at` を入れたコメントが表示されない

Astroの通常dev serverだけでは、Cloudflare Pages FunctionsやD1 bindingの挙動とズレます。Cloudflare binding込みで見るときは、`wrangler pages dev` かCloudflare Pagesのpreview環境で確認します。

## 今後足すなら

今回の実装は、小さく始めるコメント機能です。

今後拡張するなら、候補はあります。

- 管理者用の承認・削除UI
- `approved_at` を使った承認制
- 通知メール
- 管理者返信
- 記事ごとのコメント受付ON/OFF
- さらに細かいrate limit
- Cloudflare Queuesを使った非同期moderation

ただし、最初から全部入れると、コメント欄ではなく小さなコミュニティサービスを作ることになります。

今回の目的は、公式ブログに軽いコメント欄を置くことです。その範囲なら、Cloudflare Pages Functions、D1、Turnstileの組み合わせで十分に実用になります。

## 参考

- [Cloudflare Pages: Configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/)
- [Cloudflare Pages Functions: Bindings](https://developers.cloudflare.com/pages/functions/bindings/)
- [Cloudflare D1: Prepared statement methods](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)
- [Cloudflare D1: Wrangler commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Cloudflare Turnstile: Server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare Turnstile: Any Hostname](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/any-hostname/)
- [Cloudflare コメント機能を追加したPR](https://github.com/acecore-systems/acecore-net/pull/101)

## まとめ

静的サイトにコメント機能を入れるとき、外部コメントサービスを使うのは自然な選択肢です。

ただ、すでにCloudflare Pagesで配信しているサイトなら、Cloudflareだけで作る選択肢もかなり現実的です。

Pages FunctionsでAPI境界を作り、D1に保存し、Turnstileでbot対策をし、Wranglerで環境ごとのbindingを管理する。これで、静的サイトの強みを残したまま、必要な部分だけ動的にできます。

外部サービスに頼らない分、入力検証、rate limit、hostname allowlist、削除運用は自分たちで設計する必要があります。

その代わり、コメント欄のUI、データ、セキュリティ境界、preview/production分離をサイトの方針に合わせられます。

公式サイトのブログに小さくコメント機能を足したいなら、Cloudflareだけで作る構成は十分に候補になります。
