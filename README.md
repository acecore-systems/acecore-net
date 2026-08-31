# acecore-net

Acecore（エースコア）公式Webサイト。

## 技術スタック

| 技術                                                                                            | 用途                                      |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [Astro](https://astro.build/) v7                                                                | 静的サイトジェネレーター                  |
| [Tailwind CSS](https://tailwindcss.com/) v4                                                     | ユーティリティファースト CSS              |
| [Cloudflare Pages](https://pages.cloudflare.com/)                                               | ホスティング・CDN                         |
| [Cloudflare Images Transformations](https://developers.cloudflare.com/images/transform-images/) | 外部画像の自動最適化（`/cdn-cgi/image/`） |
| [Cloudflare Email Service](https://developers.cloudflare.com/email-service/)                    | お問い合わせフォームのメール送信          |
| [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)                          | AI FAQと多言語embedding                   |
| [OpenAI API](https://developers.openai.com/api/docs/)                                           | 夜間の多言語翻訳Batch                     |
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
- 日本語の記事・ページ文言の更新はOpenAI Batchで8ロケールへ翻訳
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
8. 日本語ソースの更新はOpenAI Batchで翻訳へ反映

#### 本番 CMS の保存と自動公開

- 本番ソースの正は `main` です。Cloudflare Pages の production deploy 元も GitHub 連携の `main` にします。
- Sveltia CMS は `backend.branch: main` と同一originのGitHub API proxyで運用します。現行SveltiaではEditorial Workflowが未実装のため、`publish_mode` には依存しません。
- proxyが保存直前にGitHub OAuth userのwrite権限を再確認し、変更path、件数、容量、編集開始時の`main` HEAD、JSON / Markdown schema、画像の実形式を検証します。ブログ記事にはCMSが新規作成時にhiddenの不変UUID `articleId`を付与し、全localeで同じ値を維持します。CMS UIの`lastUpdated`は現在日時を初期入力した必須項目とし、既存記事の変更では以前より後へ進めることを要求します。既存記事の`articleId`変更と同一locale内の重複は禁止し、slug変更は旧pathの削除と同じ保存内でIDを引き継いだ場合だけrenameとして扱います。`date`と`lastUpdated`は実在する暦日時だけを許可し、`lastUpdated`は`date`以降にします。既存値の削除・巻き戻しは禁止し、既存記事の本文、`lastUpdated`以外のfrontmatter、または同一保存内のslugを変更するときは、`lastUpdated`を以前より後の日時へ進める必要があります。API経由の新規記事だけは移行互換のため`lastUpdated`を省略できます。さらに現在の`main` treeへ同一保存の追加・変更・削除を投影し、全言語記事の著者、タグ、アップロード画像、ギャラリー画像と著者画像の参照先が投影後にも存在することを確認します。CMS管理下のテキストファイル1件あたり448 KiBを上限とし、追加・変更する内容と参照検証で読む現在の`main`の両方に適用します。GitHub GraphQLのBlob textを省略なしで同期検証するための上限です。SVGとPDFはCMSから保存できません。repository操作には`acecore-net`専用GitHub Appの短期installation tokenを使い、OAuth tokenを保存actorへ流用しません。
- 保存すると、画像とコンテンツをexpected-HEAD付きの`cms: ...` 1 commitで`main`へ直接反映します。別の更新が先に入った場合は上書きせず、CMSの再読み込みを求めます。
- 記事とキャンペーンはCMSから削除できます。著者、タグ、画像は投影stateの参照検証に加え、別の安全境界としてCMSからの削除を禁止します。
- `main` pushを受けてCloudflare Pagesがproduction deployし、日本語sourceの変更は翻訳PR task workflowも同じ`cms: ...` commitから検出します。
- 恒久的な`cms-content` branchや短命CMS branch、CMS PRは作りません。
- コード、CMS設定、schema、workflow、翻訳ファイルはCMS経路で変更できません。従来どおりbranchとPRを作成し、CIを通して`main`へ取り込みます。
- 旧 remote `cms-content` branch は未反映差分がないことを確認して削除済みです。

direct publish版を本番へ反映する前に、専用GitHub Appを`acecore-net`だけへインストールし、ContentsのRead and writeとMetadataのRead-onlyだけを付与します。Client ID、Installation ID、private keyはCloudflare Pagesのproduction環境だけに設定し、preview環境にはwriter認証情報を配布しません。previewのCMS repository read/writeは無効で、保存は本番の`/admin/`からだけ行います。`main`のrulesetではこのAppだけをbypass actorの`Always allow`にします。外部設定が揃う前にdirect publish版を本番へ反映しないでください。

運用判断は [CMS保存・自動公開運用](docs/04_運用設計/01_CMS保存・自動公開運用.md) を参照してください。

設計文書の入口は [docs/README.md](docs/README.md) です。

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
articleId: '11111111-1111-4111-8111-111111111111' # 記事ごとに生成し、翻訳では同じ値を使う
date: 2026-01-01T00:00
tags: ['タグ1', 'タグ2']
image: 'https://images.unsplash.com/photo-xxx'
author: 'author-id'
---

本文をここに書きます。
```

翻訳記事は `src/content/blog/{locale}/{slug}.md` に同名ファイルで配置します。

## 翻訳ワークフロー

Sveltia CMSまたは通常のGit commitで日本語の記事・固定ページ文言が`main`へ反映されると、OpenAI Batchを使って8ロケールの翻訳を更新します。

1. `.github/workflows/submit-openai-translation-batch.yml` が日本語sourceの更新を検出する
2. 同じsourceへの続けての修正をまとめるため15分待ち、最新の`main`と一致する変更だけをOpenAI Batchへ投入する
3. `.github/workflows/collect-openai-translation-batch.yml` が完了済みBatchを15分間隔で回収する
4. 専用GitHub Appが`translation/openai/{batchId}` branchとDraft PRを作成する
5. `Translation PR Build`が成功し、source hashが現在の日本語sourceと一致する場合だけDraftを解除してGitHubのAuto-mergeを予約する
6. behindの場合は検証したHEAD SHAを指定して最新の`main`を取り込み、required checkの`Build and Format`が成功した時点でGitHubがsquash mergeする

翻訳記事は日本語ソースの`articleId`をそのまま引き継ぎます。Batch投入後に同じsourceが再編集された場合は、古い結果と古い翻訳PRを取り込まず破棄します。

### OpenAI Batch workflow

- Workflow: `.github/workflows/submit-openai-translation-batch.yml`
- Workflow: `.github/workflows/collect-openai-translation-batch.yml`
- Script: `scripts/openai-translation-batch.ts`
- Model: `gpt-5.6-luna`、reasoning effort `max`
- Trigger: `src/content/blog/*.md` または `src/i18n/source/ja/**/*.json` の`main`反映時
- API secret: `OPENAI_TRANSLATION_API_KEY`
- PR作成用GitHub App secrets: `TRANSLATION_BOT_CLIENT_ID`、`TRANSLATION_BOT_APP_PRIVATE_KEY`

### 翻訳PRの検証と自動マージ

- Workflow: `.github/workflows/translation-pr-build.yml`
- Workflow: `.github/workflows/merge-translation-pr.yml`
- Script: `scripts/merge-translation-pr.ts`
- 対象は専用Translation Botが同一repositoryの`translation/openai/` branchから作成し、1件以上の有効なsource markerを持つ`[translation] OpenAI Batch ...` PRだけ
- 変更できるpathは8ロケールの`src/content/blog/{locale}/*.md`と`src/i18n/translations/{locale}.json`だけ
- Batch回収時に変更・追加された翻訳ファイルだけをPrettierで整形してからcommitする
- `Translation PR Build`の成功と現在のsource hashを再確認してからDraftを解除し、GitHubのAuto-mergeをsquashで予約する
- 翻訳PRがbehindなら専用GitHub App tokenでGitHubのupdate branch APIを呼び、後続CIを起動して`main`を取り込む。`main`更新時にも未完了の翻訳PRを再評価する
- required checkとbranch protectionの条件をGitHub側で満たした場合だけmergeし、repositoryの自動削除設定で翻訳branchを削除する
- repository設定ではAuto-mergeとhead branchの自動削除を有効にしておく

## AI 問い合わせアシスタント

サイト全体に右下の AI チャットを表示し、お問い合わせページでは FAQ の後に AI チャットを開ける導線を配置しています。AI で答えきれない見積りや正式な相談はフォームへ、短い相談や教室関連は LINE に自然につなげます。メール・電話は常時露出せず、問い合わせページ下部の「直接やりとりしたい場合」や AI が必要と判断した場合の案内に限定します。

`functions/api/ai-contact.ts` のCloudflare Pages Functionから、AI binding経由でWorkers AI `@cf/zai-org/glm-5.3-flash`を呼び出します。このAPIはAcecore、Systems、Schoolsの公式originと、各repositoryに対応する管理下Pages Preview originから利用できます。回答生成前に、質問内容からAcecore、Acecore Systems、Acecore Schools、Aceserver、World Foundationの担当を決定します。担当が明示されない質問は呼び出し元サイトを既定とし、質問内で別サイトが明示された場合はその担当を優先します。`functions/api/ai-contact-search.ts` は、現在接続済みのAcecore、Systems、Schools、Aceserver、World Foundationについて、質問と直近の利用者発言をWorkers AI `@cf/baai/bge-m3` の1024次元embeddingへ変換し、対応するVectorize indexだけを検索します。全indexを一律には検索せず、Aceserverだけは1回のembeddingを共有してWIKIとPortalを並列検索します。

Aceserver Portalのcorpus同期はProduction専用です。Netのtop-level／PreviewではPortal bindingを設定せず `ACESERVER_PORTAL_SEARCH_ENABLED=false` とします。ProductionではPortalの同期・query smoke test完了後のbindingと有効なflagを維持します。

Acecoreは表示localeと同じnamespace、他サイトは日本語 (`ja`) namespaceから最大3件の公開情報を取得し、`@cf/zai-org/glm-5.3-flash`（reasoning effort `low`、`store: false`）が表示localeで回答します。Aceserverのルール、コマンド、参加条件、運用情報はWIKIだけを正とし、Portalは概要、ワールド、ストーリー、動画、ナビゲーションの根拠に限定します。回答リンクは固定の公式導線と実際に取得したページだけに制限し、生成文が根拠リンクを省略した場合も上位1件をサーバー側で追記します。生成上限に達した部分回答は表示せず、固定案内と検証済みの公式参照先へ置き換えます。検索embeddingも同じCloudflare AI bindingを使い、外部APIへの実行時フォールバックは行いません。GLM 5.3 Flashは有料またはプリペイドWorkersプランが必要です。

ブラウザは同一originの`/api/ai-chat`へ`Accept: text/event-stream`でPOSTします。生成中のdeltaはリンク化せず平文で逐次表示し、非公開Workerが返すリンク検証・引用補完済みの`complete`イベントだけを最終Markdownとして確定します。入力エラーやモデルを使わない固定案内は従来どおりJSONでも受け取れます。

専門サイトを担当する質問でVectorize、embedding、binding、または根拠が利用できない場合は、詳細を推測せず担当する公式サイトのルートへ案内します。World Foundationはowner repositoryのProduction同期と日本語・英語query smoke testを確認済みのindexへ、Productionだけを接続します。top-level／Previewはbindingを持たず、`WORLD_FOUNDATION_SEARCH_ENABLED=false` を維持します。各接続済みbindingのkill switchとscore下限は個別に設定できます。Acecoreの `SEARCH_ENABLED` はbindingを持たないtop-level／Previewでは `false`、同期とquery smoke testを確認済みのProductionだけ `true` とし、検索モーダルの「関連する内容」とAIチャットのAcecore groundingを同時に制御します。

Cloudflare PagesではD1、Workers AI、Vectorizeの設定を対象環境に設定します。Vectorize bindingはProduction環境だけに設定し、Previewには設定しません。

- D1 binding: `SEARCH_RATE_LIMIT_DB`（検索APIとtableを共有し、`ai-chat:` prefixでcounterを分離）
- AI binding: `AI`
- ProductionのAcecore Vectorize binding: `SEARCH_INDEX`
- Productionの横断検索でread-onlyに使用するVectorize bindings: `SYSTEMS_SEARCH_INDEX`、`SCHOOLS_SEARCH_INDEX`、`ACESERVER_WIKI_SEARCH_INDEX`、`ACESERVER_PORTAL_SEARCH_INDEX`、`WORLD_FOUNDATION_SEARCH_INDEX`
- `SEARCH_ENABLED` / `SEARCH_MIN_SCORE`: Acecore検索とgroundingのkill switch / score下限
- `{SOURCE}_SEARCH_ENABLED` / `{SOURCE}_SEARCH_MIN_SCORE`: 接続済みの各横断検索先のkill switch / score下限。World Foundationはtop-level／Previewを `false`、Productionだけを `true` とする
- `WORKERS_AI_CHAT_MODEL`: 回答モデル（`@cf/zai-org/glm-5.3-flash`固定）
- `WORKERS_AI_REASONING_EFFORT`: 推論 effort（既定 `low`）
- `SEARCH_EMBEDDING_MODEL`: embeddingモデル（`@cf/baai/bge-m3`固定）
- `SEARCH_EMBEDDING_DIMENSIONS`: Vectorizeと揃える次元数（`1024`固定）

外部indexはこのrepositoryから更新しません。corpus生成、Production同期、削除は各サイトを所有するrepositoryが管理します。Aceserver PortalとWorld Foundationを含む接続済みサイトはProduction indexだけを使います。新しい取得元を接続する場合も、owner repositoryにこのライフサイクルとProduction query smoke testを用意してから、Production bindingとkill switchを同じ変更で切り替えます。

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
| `postcss.config.cjs`       | Tailwind CSS v4 の Astro/Vite CSS 統合                          |
| `src/styles/global.css`    | Acecore トークン、共通UI規約、Preflight 方針                    |
| `src/content.config.ts`    | コンテンツコレクション定義                                      |
| `public/admin/index.html`  | Sveltia CMS 管理画面                                            |
| `public/admin/config.yml`  | Sveltia CMS 設定                                                |
| `workers/sveltia-cms-auth` | Sveltia CMS GitHub OAuth 用 Cloudflare Worker                   |
| `public/ads.txt`           | Google AdSense 認証                                             |
| `public/_headers`          | Cloudflare Pages HTTP ヘッダー（キャッシュ・CSP・セキュリティ） |
