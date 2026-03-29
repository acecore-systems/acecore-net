# acecore-net

Acecore（エースコア）公式Webサイト。

## 技術スタック

| 技術 | 用途 |
| --- | --- |
| [Astro](https://astro.build/) v6 | 静的サイトジェネレーター |
| [UnoCSS](https://unocss.dev/) | ユーティリティファースト CSS |
| [Cloudflare Pages](https://pages.cloudflare.com/) | ホスティング・CDN |
| [Cloudflare Images Transformations](https://developers.cloudflare.com/images/transform-images/) | 外部画像の自動最適化（`/cdn-cgi/image/`） |
| [Pagefind](https://pagefind.app/) | 静的全文検索 |
| [Pages CMS](https://pagescms.org/) | Git ベース CMS（ブログ管理） |
| [satori](https://github.com/vercel/satori) + [sharp](https://sharp.pixelplumbing.com/) | OG 画像の自動生成 |
| [Google AdSense](https://adsense.google.com/) | 広告配信（ブログページ） |

## 多言語対応

デフォルト言語は日本語（`ja`）。以下の 9 言語に対応しています。

`ja` · `en` · `zh-cn` · `es` · `pt` · `fr` · `ko` · `de` · `ru`

- デフォルトロケール（`ja`）は URL プレフィクスなし（`/blog/...`）
- その他のロケールは `/{locale}/blog/...` のパスで配信
- ブログ記事の翻訳は `src/content/blog/{locale}/` に配置
- Pages CMS では日本語ソースのみ管理し、多言語記事は GitHub Issue ベースで AI に委譲
- UI 文字列は `src/i18n/translations/` で管理

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

| ページ               | パス           | 説明                     |
| -------------------- | -------------- | ------------------------ |
| ホーム               | `/`            | トップページ             |
| サービス             | `/services/`   | サービス詳細             |
| 会社概要             | `/about/`      | 理念・活動               |
| ブログ               | `/blog/`       | 記事一覧（ページネーション付き） |
| プログラミングスクール | `/schools/`   | プログラミング教育     |
| AceStudio            | `/acestudio/`  | AceStudio 紹介           |
| お問い合わせ         | `/contact/`    | フォーム（Turnstile 付き） |
| プライバシーポリシー | `/privacy/`    | 個人情報方針             |
| RSS フィード         | `/rss.xml`     | ブログ配信               |

ブログ配下のサブページ:

| パス | 説明 |
| --- | --- |
| `/blog/{slug}/` | 記事詳細 |
| `/blog/tags/` | タグ一覧 |
| `/blog/tags/{tag}/` | タグ別記事 |
| `/blog/authors/{author}/` | 著者別記事 |
| `/blog/archive/{month}/` | 月別アーカイブ |
| `/blog/page/{n}/` | ページネーション |
| `/blog/og/{slug}.png` | OG 画像（自動生成） |

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

### Pages CMS（推奨）

1. [app.pagescms.org](https://app.pagescms.org/) にアクセス
2. GitHub でログインし、`acecore-net` リポジトリを選択
3. 「ブログ記事」から日本語ソース記事のみ新規作成・編集
4. 翻訳は GitHub の翻訳 issue を起票し、AI で `src/content/blog/{locale}/` に反映

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

Pages CMS は日本語ソースの編集に限定します。多言語記事と著者紹介の翻訳は GitHub Issue ベースで管理します。

1. 日本語ソースを Pages CMS で更新する
2. `main` へ反映されると GitHub Actions が translation issue を自動作成または更新する
3. issue にソースパス、対象ロケール、翻訳条件が自動で入る
4. AI に issue を処理させ、`src/content/blog/{locale}/` や `src/data/authors.json` の `i18n` を更新する

著者情報の `i18n` は Pages CMS では非表示にしてあり、GitHub 側の翻訳フローでのみ更新する前提です。

### 自動起票 workflow

- Workflow: `.github/workflows/create-translation-issues.yml`
- Script: `scripts/create-translation-issues.mjs`
- Trigger: `src/content/blog/*.md` または `src/data/authors.json` の `main` 反映時
- 日本語ソース記事ごとに 1 issue を作成し、同じソースの open issue があれば更新
- `authors.json` は日本語ベースの差分だけ検出し、`i18n` の変更だけでは再起票しない
- `COPILOT_AGENT_TOKEN` secret が設定されていれば、作成または更新した issue を GitHub Copilot coding agent に自動アサインする

`COPILOT_AGENT_TOKEN` には、Copilot assignment API を呼べるユーザートークンを設定します。GitHub CLI で確認した現在トークンの scope は `repo` と `workflow` を含んでいます。

### 自動マージ workflow

- Workflow: `.github/workflows/translation-pr-build.yml`
- Workflow: `.github/workflows/merge-translation-pr.yml`
- Script: `scripts/merge-translation-pr.mjs`
- 対象は `app/copilot-swe-agent` が作成した `[translation]` で始まる PR のみ
- `Translation PR Build` が成功し、PR が draft でなくなった時点で workflow が squash merge を実行する
- merge 後は同一リポジトリ上の Copilot ブランチを削除する

## お問い合わせフォーム

[ssgform.com](https://ssgform.com/) を利用した外部フォーム送信 + Cloudflare Turnstile によるボット対策を実装しています。

## デプロイ

Cloudflare Pages に接続し、以下を設定：

- **ビルドコマンド**: `npm run build`
- **出力ディレクトリ**: `dist`

GitHub への push で自動デプロイされます。

## 関連ファイル

| ファイル | 説明 |
| --- | --- |
| `astro.config.mjs` | Astro 設定（i18n・rehype プラグイン含む） |
| `uno.config.ts` | UnoCSS テーマ・ショートカット |
| `src/content.config.ts` | コンテンツコレクション定義 |
| `.pages.yml` | Pages CMS 設定 |
| `public/ads.txt` | Google AdSense 認証 |
| `public/_headers` | Cloudflare Pages HTTP ヘッダー（キャッシュ・CSP・セキュリティ） |
