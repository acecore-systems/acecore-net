# acecore-net

Acecore（エースコア）公式Webサイト。

## 技術スタック

| 技術                                                                                            | 用途                                      |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [Astro](https://astro.build/) v6                                                                | 静的サイトジェネレーター                  |
| [UnoCSS](https://unocss.dev/)                                                                   | ユーティリティファースト CSS              |
| [Cloudflare Pages](https://pages.cloudflare.com/)                                               | ホスティング・CDN                         |
| [Cloudflare Images Transformations](https://developers.cloudflare.com/images/transform-images/) | 外部画像の自動最適化（`/cdn-cgi/image/`） |
| [ssgform.com](https://ssgform.com/)                                                             | お問い合わせフォームのメール送信          |
| [OpenAI API](https://platform.openai.com/docs/api-reference/responses/create)                   | 問い合わせ前の AI FAQ アシスタント        |
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

| ページ                 | パス          | 説明                             |
| ---------------------- | ------------- | -------------------------------- |
| ホーム                 | `/`           | トップページ                     |
| サービス               | `/services/`  | サービス詳細                     |
| 会社概要               | `/about/`     | 理念・活動                       |
| ブログ                 | `/blog/`      | 記事一覧（ページネーション付き） |
| プログラミングスクール | `/schools/`   | プログラミング教育               |
| AceStudio              | `/acestudio/` | AceStudio 紹介                   |
| お問い合わせ           | `/contact/`   | フォーム（Turnstile 付き）       |
| プライバシーポリシー   | `/privacy/`   | 個人情報方針                     |
| RSS フィード           | `/rss.xml`    | ブログ配信                       |

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
2. 本番編集は GitHub OAuth でサインインする
3. ローカル確認では `Work with Local Repository` を選び、repo root を指定する
4. 「ブログ」から日本語ソース記事のみ新規作成・編集
5. 「ページ・サイト文言」からナビ、フッター、SEO、固定ページの日本語テキストをページ/用途別に編集
6. 「告知・キャンペーン」からトップ告知バナーやページ内キャンペーン通知を編集
7. 著者・タグは「著者」「タグ」から編集
8. CMS 経由の日本語ソース編集のみ、Copilot translation PR task で翻訳へ反映

#### キャンペーン告知の運用

- 告知やキャンペーンは「告知・キャンペーン」に1件ずつ並びます。新しく追加する場合は一覧右上の追加ボタンから作成します。
- `種別` が `トップ告知バナー` の項目はサイト上部に表示されます。複数有効な場合は `表示順` の小さいものから順に表示されます。
- `種別` が `ページ内キャンペーン通知` の項目は、選択した `表示ページ` のヒーロー下に表示されます。
- 告知バナーとページ内通知は `表示する`、`表示開始日時`、`表示終了日時` で公開期間を制御します。日時は日本時間の `YYYY-MM-DDTHH:mm` として扱われます。
- `タイトル` と `本文` は種別ごとに表示され方が変わります。トップ告知バナーでは `タイトル` が小さなラベル、`本文` が告知文です。ページ内キャンペーン通知では `タイトル` が見出し、`本文` が説明文です。
- キャンペーン通知の表示位置はページごとに固定です。CMSでは `トップページ`、`サービス`、`実績`、`会社概要`、`お問い合わせ`、`Acecore Schools`、`AceStudio` から選択します。
- キャンペーン通知ではボタン文言、リンクURL、表示トーン、アイコン、表示開始/終了日時を CMS から変更できます。アイコンは用途別の選択肢から選びます。
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
2. CMS commit の本文差分または日本語文言 key 差分だけを GitHub Actions が検出する
3. Copilot coding agent が該当差分だけに沿って `src/content/blog/{locale}/` または `src/i18n/translations/{locale}.json` を更新する
4. 完了時に `[translation]` PR が ready for review になったら、内容とビルドを確認してから必要に応じて手動マージする

著者情報、タグ定義の多言語フィールドは Sveltia CMS から直接編集できます。ローカル開発や通常の Git commit による日本語ソース変更では、自動翻訳 PR task は作成しません。

### 自動 PR task workflow

- Workflow: `.github/workflows/create-translation-prs.yml`
- Script: `scripts/create-translation-prs.mjs`
- Trigger: `src/content/blog/*.md` または `src/i18n/source/ja/**/*.json` の `main` 反映時。ただし自動実行は Sveltia CMS の `cms: ...` commit のみ
- CMS commit と通常 commit が同じ push に混在した場合は、自動翻訳 PR task を作成せず workflow を止める
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

`functions/api/ai-contact.ts` の Cloudflare Pages Function から OpenAI Responses API を呼び出します。ブラウザには API キーを渡しません。

Cloudflare Pages 側で以下を設定してください。

- `OPENAI_API_KEY`: OpenAI API キー
- `OPENAI_MODEL`: 使用モデル（未設定時は `gpt-5.4-mini`）

## お問い合わせフォーム

フォーム送信は現状どおり `ssgform.com` を利用します。Cloudflare Email Sending への移行は Workers Paid が必要なため、別Issueとして残しています。

Cloudflare Turnstile はフォーム上に表示していますが、`ssgform.com` 利用中はサーバーサイド検証ではなく外部フォームサービス側の送信フローに委ねます。

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
