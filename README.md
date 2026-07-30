# acecore-net

Acecore（エースコア）公式Webサイト。

## 技術スタック

| 技術                                                                                            | 用途                                      |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [Astro](https://astro.build/) v7                                                                | 静的サイトジェネレーター                  |
| [UnoCSS](https://unocss.dev/)                                                                   | ユーティリティファースト CSS              |
| [Cloudflare Pages](https://pages.cloudflare.com/)                                               | ホスティング・CDN                         |
| [Cloudflare Images Transformations](https://developers.cloudflare.com/images/transform-images/) | 外部画像の自動最適化（`/cdn-cgi/image/`） |
| [Cloudflare Email Service](https://developers.cloudflare.com/email-service/)                    | お問い合わせフォームのメール送信          |
| [OpenAI API](https://developers.openai.com/api/docs/)                                           | AI FAQと多言語embedding                   |
| [Cloudflare Vectorize](https://developers.cloudflare.com/vectorize/)                            | 公開コンテンツのベクトル検索              |
| [Pagefind](https://pagefind.app/)                                                               | 静的全文検索                              |
| [Sveltia CMS](https://sveltiacms.app/)                                                          | Git ベース CMS（ブログ・ページ文言管理）  |
| [satori](https://github.com/vercel/satori) + [sharp](https://sharp.pixelplumbing.com/)          | OG 画像の自動生成                         |
| [Google AdSense](https://adsense.google.com/)                                                   | 広告配信（ブログページ）                  |

## 多言語対応

デフォルト言語は日本語（`ja`）。以下の 9 言語に対応しています。

`ja` · `en` · `zh-cn` · `es` · `pt` · `fr` · `ko` · `de` · `ru`

- デフォルトロケール（`ja`）は URL プレフィクスなし（`/blog/...`）
- その他のロケールは `/{locale}/blog/...` のパスで配信
- ブログ記事の翻訳は `src/content/blog/{locale}/` に配置
- Sveltia CMS では日本語ソース記事、日本語ページ文言、著者、タグを管理
- CMS 経由で編集された多言語記事・ページ文言は Copilot translation PR task で AI に委譲
- UI・固定ページ文字列は日本語ソースを `src/i18n/source/ja/`、翻訳先を `src/i18n/translations/` で管理し、Sveltia CMS の「ページ・サイト文言」からページ/用途別に編集

## 開発

Node.js 24.18.0 以上が必要です。使用バージョンは `.node-version`、必要条件は `package.json` の `engines.node` を正とします。

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build    # astro build && pagefind --site dist
npm run preview
```

## サイト構成

| ページ                 | パス                           | 説明                                |
| ---------------------- | ------------------------------ | ----------------------------------- |
| ホーム                 | `/`                            | トップページ                        |
| サービス               | `/services/`                   | サービス詳細                        |
| 会社概要               | `/about/`                      | 理念・活動                          |
| ブログ                 | `/blog/`                       | 記事一覧（ページネーション付き）    |
| プログラミングスクール | `https://schools.acecore.net/` | 別リポジトリの Schools サイトへ誘導 |
| AceStudio              | `/acestudio/`                  | AceStudio 紹介                      |
| お問い合わせ           | `/contact/`                    | フォーム（Turnstile 付き）          |
| プライバシーポリシー   | `/privacy/`                    | 個人情報方針                        |
| RSS フィード           | `/rss.xml`                     | ブログ配信                          |

ブログ配下のサブページ:

| パス                      | 説明                |
| ------------------------- | ------------------- |
| `/blog/{slug}/`           | 記事詳細            |
| `/blog/tags/`             | タグ一覧            |
| `/blog/tags/{tag}/`       | タグ別記事          |
| `/blog/authors/{author}/` | 著者別記事          |
| `/blog/archive/{month}/`  | 月別アーカイブ      |
| `/blog/page/{n}/`         | ページネーション    |
| `/blog/og/{slug}.png`     | OG 画像（自動生成） |

## ディレクトリ構成

```
src/
├── components/     # 共通 UI コンポーネント（Astro）
├── content/
│   └── blog/       # Markdown 記事（ja ベース + 各言語サブフォルダ）
├── data/           # サイト定数・著者情報
├── i18n/           # 多言語設定・翻訳ファイル・ユーティリティ
├── layouts/        # BaseLayout
├── pages/          # ルーティング（ja ルート + [locale]/ サブルート）
├── utils/          # ユーティリティ（画像最適化・rehype プラグイン等）
└── views/          # ページ単位のビューコンポーネント
```

## 画像最適化

外部画像は [Cloudflare Images Transformations](https://developers.cloudflare.com/images/transform-images/) で自動変換されます。

- `src/utils/image.ts` — URL を `/cdn-cgi/image/{options}/{sourceUrl}` 形式に変換
- `src/utils/rehype-optimize-images.ts` — Markdown 内の外部画像を自動で変換する rehype プラグイン
- 許可オリジン: `acecore.net`, `images.unsplash.com`, `cdn.discordapp.com`

## ブログ記事の追加

### Sveltia CMS（推奨）

1. 本番では `https://acecore.net/admin/index.html`、ローカルでは `http://localhost:4321/admin/index.html` にアクセス
2. 本番編集は GitHub OAuth でサインインする。OAuthは編集者本人とrepositoryへのpush権限の確認に使い、repositoryのread/writeはサイト専用GitHub Appが行う
3. ローカル確認では `Work with Local Repository` を選び、repo root を指定する
4. 「ブログ」から日本語ソース記事のみ新規作成・編集
5. 「ページ・サイト文言」からナビ、フッター、SEO、固定ページの日本語テキストをページ/用途別に編集
6. 「告知・キャンペーン」からトップ告知バナーやページ内キャンペーン通知を編集
7. 著者・タグは「著者」「タグ」から編集
8. CMS 経由の日本語ソース編集のみ、Copilot translation PR task で翻訳へ反映

#### 本番 CMS の保存と自動公開

- 本番ソースの正は `main` です。Cloudflare Pages の production deploy 元も GitHub 連携の `main` にします。
- Sveltia CMS は `backend.branch: main` と同一originのGitHub API proxyで運用します。現行SveltiaではEditorial Workflowが未実装のため、`publish_mode` には依存しません。
- proxyが保存直前にGitHub OAuth userのwrite権限を再確認し、変更path、件数、容量、編集開始時の`main` HEAD、JSON / Markdown schema、画像の実形式を検証します。さらに現在の`main` treeへ同一保存の追加・変更・削除を投影し、全言語記事の著者、タグ、アップロード画像、ギャラリー画像と著者画像の参照先が投影後にも存在することを確認します。CMS管理下のテキストファイル1件あたり448 KiBを上限とし、追加・変更する内容と参照検証で読む現在の`main`の両方に適用します。GitHub GraphQLのBlob textを省略なしで同期検証するための上限です。SVGとPDFはCMSから保存できません。repository操作には`acecore-net`専用GitHub Appの短期installation tokenを使い、OAuth tokenを保存actorへ流用しません。
- 保存すると、画像とコンテンツをexpected-HEAD付きの`cms: ...` 1 commitで`main`へ直接反映します。別の更新が先に入った場合は上書きせず、CMSの再読み込みを求めます。
- 記事とキャンペーンはCMSから削除できます。著者、タグ、画像は投影stateの参照検証に加え、別の安全境界としてCMSからの削除を禁止します。
- `main` pushを受けてCloudflare Pagesがproduction deployし、日本語sourceの変更は翻訳PR task workflowも同じ`cms: ...` commitから検出します。
- 恒久的な`cms-content` branchや短命CMS branch、CMS PRは作りません。
- コード、CMS設定、schema、workflow、翻訳ファイルはCMS経路で変更できません。従来どおりbranchとPRを作成し、CIを通して`main`へ取り込みます。
- 旧 remote `cms-content` branch は未反映差分がないことを確認して削除済みです。

direct publish版を本番へ反映する前に、専用GitHub Appを`acecore-net`だけへインストールし、ContentsのRead and writeとMetadataのRead-onlyだけを付与します。Client ID、Installation ID、private keyはCloudflare Pagesのproduction環境だけに設定し、preview環境にはwriter認証情報を配布しません。previewのCMS repository read/writeは無効で、保存は本番の`/admin/`からだけ行います。`main`のrulesetではこのAppだけをbypass actorの`Always allow`にします。外部設定が揃う前にdirect publish版を本番へ反映しないでください。

運用判断は [docs/cms-write-workflow.md](docs/cms-write-workflow.md) を参照してください。

#### キャンペーン告知の運用

- 告知やキャンペーンは「告知・キャンペーン」に1件ずつ並びます。新しく追加する場合は一覧右上の追加ボタンから作成します。
- `種別` が `トップ告知バナー` の項目はサイト上部に表示されます。複数有効な場合は `表示順` の小さいものから順に表示されます。
- `種別` が `ページ内キャンペーン通知` の項目は、選択した `表示ページ` のヒーロー下に表示されます。
- 告知バナーとページ内通知は `表示する`、`表示開始日時`、`表示終了日時` で公開期間を制御します。表示状態は訪問者のブラウザで判定するため、デプロイ後も時刻到達時に切り替わります。日時は日本時間の `YYYY-MM-DDTHH:mm` として扱われます。
- `タイトル` と `本文` は種別ごとに表示され方が変わります。トップ告知バナーでは `タイトル` が小さなラベル、`本文` が告知文です。ページ内キャンペーン通知では `タイトル` が見出し、`本文` が説明文です。
- キャンペーン通知の表示位置はページごとに固定です。CMSでは `トップページ`、`サービス`、`実績`、`会社概要`、`お問い合わせ`、`AceStudio` から選択します。
- キャンペーン通知ではボタン文言、リンクURL、表示トーン、アイコン、表示開始/終了日時を CMS から変更できます。表示トーンは色アイコン付き、アイコンは用途別のアイコン付き選択肢から選びます。
- 季節キャンペーンの詳細記事は通常どおり「ブログ」で作成し、告知バナーやキャンペーン通知のリンクURLに該当記事や問い合わせページを設定します。

### 手動

`src/content/blog/` に Markdown ファイルを追加：

```markdown
---
title: '記事タイトル'
description: '記事の概要'
date: 2026-01-01
tags: ['タグ1', 'タグ2']
image: 'https://images.unsplash.com/photo-xxx'
author: 'author-id'
---

本文をここに書きます。
```

翻訳記事は `src/content/blog/{locale}/{slug}.md` に同名ファイルで配置します。

## 翻訳ワークフロー

Sveltia CMS は日本語ソース記事と日本語の固定ページ文言を編集できます。多言語記事本文とページ文言は GitHub Copilot coding agent が作成する Pull Request ベースで管理します。PR 量を抑えるため、push 連動の対象は Sveltia CMS の `cms: ...` commit だけに限定します。

1. 日本語ソースを Sveltia CMS で更新する
2. CMS proxy が`cms: ...` subjectの1 commitを`main`へ直接保存する
3. 同じ`main` pushから、CMS commitの本文差分または日本語文言 key 差分だけをGitHub Actionsが検出する
4. Copilot coding agent が該当差分だけに沿って `src/content/blog/{locale}/` または `src/i18n/translations/{locale}.json` を更新する
5. 完了時に `[translation]` PR が ready for review になったら、内容とビルドを確認してから必要に応じて手動マージする

著者情報、タグ定義の多言語フィールドは Sveltia CMS から直接編集できます。ローカル開発や通常の Git commit による日本語ソース変更では、自動翻訳 PR task は作成しません。

### 自動 PR task workflow

- Workflow: `.github/workflows/create-translation-prs.yml`
- Script: `scripts/create-translation-prs.mjs`
- Trigger: `src/content/blog/*.md` または `src/i18n/source/ja/**/*.json` の `main` 反映時。ただし自動実行は Sveltia CMS の `cms: ...` commit のみ
- 専用GitHub Appのinstallation tokenによるdirect pushでも通常どおりworkflowを起動する。`GITHUB_TOKEN`による保存へ置き換えない
- CMS commit と通常 commit が同じ push に混在した場合は、自動翻訳 PR task を作成せず workflow を止める。旧CMS PRのmerge commitも後方互換のため判定から除外する
- 日本語ソース記事ごとに Copilot translation PR task を作成し、同じソースの open PR があれば重複作成しない
- ページ文言は変更された JSON key だけを対象に、まとめて 1 つの Copilot translation PR task を作成する
- blog 記事は frontmatter だけの変更では task を作成せず、Markdown 本文が変わったときだけ PR task を作成する
- blog 記事の更新 PR task には本文 diff を渡し、翻訳済み記事の未変更部分は書き換えないよう指示する
- 1 回の blog 翻訳 PR task 数は `max_blog_tasks`（既定値 `3`）で制限する
- authors/tags の翻訳 PR task は `workflow_dispatch` で `include_non_blog_sources=true` を指定したときだけ作成する
- `COPILOT_AGENT_TOKEN` secret を使い、GitHub Copilot coding agent API で issue を介さず直接 task を作成する
- 重複判定は PR body に含める `translation-source:` マーカーで行う

`COPILOT_AGENT_TOKEN` には、Copilot coding agent API を呼べるユーザートークンを設定します。GitHub CLI で確認した現在トークンの scope は `repo` と `workflow` を含んでいます。

### 自動マージ workflow

- Workflow: `.github/workflows/translation-pr-build.yml`
- Workflow: `.github/workflows/merge-translation-pr.yml`
- Script: `scripts/merge-translation-pr.mjs`
- 対象は `app/copilot-swe-agent` が作成した `[translation]` で始まる PR のみ
- `Translation PR Build` は対象 PR のビルド確認だけを行う
- マージは `.github/workflows/merge-translation-pr.yml` の `workflow_dispatch` で PR 番号を指定したときだけ実行する
- merge 後は同一リポジトリ上の Copilot ブランチを削除する

## AI 問い合わせアシスタント

サイト全体に右下の AI チャットを表示し、お問い合わせページでは FAQ の後に AI チャットを開ける導線を配置しています。AI で答えきれない見積りや正式な相談はフォームへ、短い相談や教室関連は LINE に自然につなげます。メール・電話は常時露出せず、問い合わせページ下部の「直接やりとりしたい場合」や AI が必要と判断した場合の案内に限定します。

`functions/api/ai-contact.ts` の Cloudflare Pages Function からOpenAI Responses APIを直接呼び出します。回答生成前に、質問内容からAcecore、Acecore Systems、Acecore Schools、Aceserver、World Foundationの担当を決定します。`functions/api/ai-contact-search.ts` は、現在接続済みのAcecore、Systems、Schools、Aceserverについて、質問と直近の利用者発言をOpenAI `text-embedding-3-large` の1536次元embeddingへ変換し、対応するVectorize indexだけを検索します。担当が明示されない質問はAcecoreを既定とし、全indexを一律には検索しません。Aceserverだけは、1回のembeddingを共有してWIKIとPortalを並列検索します。

Acecoreは表示localeと同じnamespace、他サイトは日本語 (`ja`) namespaceから最大3件の公開情報を取得し、`gpt-5.6-luna`（reasoning effort `low`、`store: false`）が表示localeで回答します。Aceserverのルール、コマンド、参加条件、運用情報はWIKIだけを正とし、Portalは概要、ワールド、ストーリー、動画、ナビゲーションの根拠に限定します。回答リンクは固定の公式導線と実際に取得したページだけに制限し、生成文が根拠リンクを省略した場合も上位1件をサーバー側で追記します。生成上限に達した部分回答は表示せず、固定案内と検証済みの公式参照先へ置き換えます。OpenAI APIキーはPages Functionのsecretだけに置き、ブラウザへ渡しません。Cloudflare Workers AIとOpenAI AI Gatewayは使用しません。

専門サイトを担当する質問でVectorize、embedding、binding、または根拠が利用できない場合は、詳細を推測せず担当する公式サイトのルートへ案内します。World Foundationはowner repositoryにPreview / Productionのcorpus同期、削除、query smoke testがまだないため、全環境でVectorize接続を停止し、公式サイトのルートだけを案内します。各接続済みbindingのkill switchとscore下限は個別に設定でき、Acecoreの `SEARCH_ENABLED=false` は検索モーダルの「関連する内容」とAIチャットのAcecore groundingを同時に停止します。

Cloudflare Pages 側で以下を設定してください。

- Acecore Vectorize binding: `SEARCH_INDEX`
- 横断検索でread-onlyに使用するVectorize bindings: `SYSTEMS_SEARCH_INDEX`、`SCHOOLS_SEARCH_INDEX`、`ACESERVER_WIKI_SEARCH_INDEX`、`ACESERVER_PORTAL_SEARCH_INDEX`
- Secret `OPENAI_API_KEY`: このサイト専用OpenAI Project APIキー
- `SEARCH_ENABLED` / `SEARCH_MIN_SCORE`: Acecore検索とgroundingのkill switch / score下限
- `{SOURCE}_SEARCH_ENABLED` / `{SOURCE}_SEARCH_MIN_SCORE`: 接続済みの各横断検索先のkill switch / score下限。World Foundationは `WORLD_FOUNDATION_SEARCH_ENABLED=false` に固定し、bindingは設定しない
- `OPENAI_CHAT_MODEL`: 回答モデル（既定 `gpt-5.6-luna`）
- `OPENAI_REASONING_EFFORT`: 推論 effort（既定 `low`）
- `OPENAI_EMBEDDING_MODEL`: embeddingモデル（既定 `text-embedding-3-large`）
- `OPENAI_EMBEDDING_DIMENSIONS`: Vectorizeと揃える次元数（`1536`固定）

外部indexはこのrepositoryから更新しません。corpus生成、同期、削除は各サイトを所有するrepositoryがPreview / Productionを分離して管理します。World Foundationを再接続する場合も、owner repositoryにこのライフサイクルと両環境のquery smoke testを用意してから、bindingとkill switchを同じ変更で切り替えます。

AIチャットのgrounding、フォールバック、リンク制限は `npm run test:ai-chat` で確認します。

## お問い合わせフォーム

フォーム送信は `functions/api/contact.ts` の Cloudflare Pages Function で受け、Cloudflare Email Service の REST API から通知メールを送信します。ブラウザから外部フォームサービスへ直接送信しません。

Cloudflare Turnstile はフォーム上に表示し、Pages Function 側で `TURNSTILE_SECRET_KEY` によるサーバーサイド検証を行います。

Cloudflare 側で以下を設定してください。

- Email Service: `acecore.net` を送信ドメインとしてオンボード
- `CLOUDFLARE_ACCOUNT_ID`: Email Service を有効化した Cloudflare account ID
- `CLOUDFLARE_EMAIL_API_TOKEN`: Email Sending 権限を持つ Cloudflare API token
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile の secret key
- `CONTACT_FROM_EMAIL`: 送信元メールアドレス（未設定時は `noreply@acecore.net`）
- `CONTACT_TO_EMAIL`: 通知先メールアドレス（未設定時は `info@acecore.net`）
- `CONTACT_ALLOWED_HOSTNAMES`: 問い合わせ API と Turnstile hostname 検証で許可する hostname 一覧

## ブログコメント

記事詳細のコメントは Cloudflare Pages Function + D1 + Turnstile で実装しています。投稿は承認待ちにせず即時公開しますが、API 側で Turnstile サーバー検証、origin チェック、レート制限、URL・メールアドレス・HTML・宣伝語句の拒否を行います。

Cloudflare Pages の Functions binding は `wrangler.jsonc` で管理します。

- `COMMENTS_DB` -> `acecore-comments`

Cloudflare Pages secret は以下を設定します。

- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile の secret key
- `COMMENT_HASH_SALT`: IP/UA ハッシュ用 secret

`wrangler.jsonc` では production/preview の `COMMENT_ALLOWED_HOSTNAMES` を `acecore.net,www.acecore.net,acecore-net.pages.dev` に明示しています。未設定時はコード側で `acecore.net,www.acecore.net,acecore-net.pages.dev,localhost,127.0.0.1` にフォールバックします。登録した hostname とその配下のサブドメインを許可するため、`acecore-net.pages.dev` で Git プレビュー URL も通ります。ほかの Pages プロジェクトで共用する場合は、そのプロジェクトの `<project>.pages.dev` を `COMMENT_ALLOWED_HOSTNAMES` に追加してください。

D1 schema は `migrations/0001_create_blog_comments.sql` です。初回は D1 database を作成後、以下で適用します。

```bash
npx wrangler d1 execute acecore-comments --remote --file=./migrations/0001_create_blog_comments.sql
```

スパムなどを非表示にする場合は、対象レコードの `deleted_at` に ISO 8601 の日時を入れます。`deleted_at IS NULL` のコメントのみ表示されます。

## デプロイ

Cloudflare Pages に接続し、以下を設定：

- **ビルドコマンド**: `npm run build`
- **出力ディレクトリ**: `dist`

GitHub への push で自動デプロイされます。

## 関連ファイル

| ファイル                   | 説明                                                            |
| -------------------------- | --------------------------------------------------------------- |
| `astro.config.mjs`         | Astro 設定（i18n・rehype プラグイン含む）                       |
| `uno.config.ts`            | UnoCSS テーマ・ショートカット                                   |
| `src/content.config.ts`    | コンテンツコレクション定義                                      |
| `public/admin/index.html`  | Sveltia CMS 管理画面                                            |
| `public/admin/config.yml`  | Sveltia CMS 設定                                                |
| `workers/sveltia-cms-auth` | Sveltia CMS GitHub OAuth 用 Cloudflare Worker                   |
| `public/ads.txt`           | Google AdSense 認証                                             |
| `public/_headers`          | Cloudflare Pages HTTP ヘッダー（キャッシュ・CSP・セキュリティ） |
