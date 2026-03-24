# acecore-net

Acecore（エースコア）公式Webサイト。

## 技術スタック

- [Astro](https://astro.build/) — 静的サイトジェネレーター
- [UnoCSS](https://unocss.dev/) — ユーティリティファーストCSS
- [Cloudflare Pages](https://pages.cloudflare.com/) — ホスティング
- [Pages CMS](https://pagescms.org/) — Git ベース CMS（ブログ管理）

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
npm run preview
```

## サイト構成

| ページ               | パス         | 説明         |
| -------------------- | ------------ | ------------ |
| ホーム               | `/`          | トップページ |
| サービス             | `/services/` | サービス詳細 |
| 会社概要             | `/about/`    | 理念・活動   |
| ブログ               | `/blog/`     | 記事一覧     |
| お問い合わせ         | `/contact/`  | フォーム     |
| プライバシーポリシー | `/privacy/`  | 個人情報方針 |

## ブログ記事の追加

### Pages CMS（推奨）

1. [app.pagescms.org](https://app.pagescms.org/) にアクセス
2. GitHub でログインし、`acecore-net` リポジトリを選択
3. 「ブログ記事」から新規作成・編集

### 手動

`src/content/blog/` に Markdown ファイルを追加：

```markdown
---
title: '記事タイトル'
description: '記事の概要'
date: 2026-01-01
tags: ['タグ1', 'タグ2']
---

本文をここに書きます。
```

## お問い合わせフォーム

[ssgform.com](https://ssgform.com/) を利用した外部フォーム送信 + Cloudflare Turnstile によるボット対策を実装しています。

## デプロイ

Cloudflare Pages に接続し、以下を設定：

- **ビルドコマンド**: `npm run build`
- **出力ディレクトリ**: `dist`

GitHub への push で自動デプロイされます。

## 関連ファイル

| ファイル           | 説明                                                           |
| ------------------ | -------------------------------------------------------------- |
| `astro.config.mjs` | Astro 設定                                                     |
| `uno.config.ts`    | UnoCSS テーマ・ショートカット                                  |
| `.pages.yml`       | Pages CMS 設定                                                 |
| `public/ads.txt`   | Google AdSense 認証                                            |
| `public/_headers`  | Cloudflare Pages HTTPヘッダー（キャッシュ・セキュリティ・SEO） |
