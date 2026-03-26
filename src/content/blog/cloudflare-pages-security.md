---
title: 'Cloudflare Pages で実現するセキュアな静的サイト配信'
description: 'Cloudflare Pages での静的サイトデプロイと、_headers によるセキュリティヘッダー・CSP 設定の実践ガイドです。Worker から Pages に戻した経緯も紹介します。'
date: 2026-03-15
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ']
image: https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=400&fit=crop&q=80
processFigure:
  title: デプロイ構成の変遷
  steps:
    - title: 初期構成
      description: Cloudflare Pages で静的サイトを配信。
      icon: i-lucide-cloud
    - title: Worker 移行
      description: お問い合わせ処理のため Worker に移行。
      icon: i-lucide-server
    - title: Pages 回帰
      description: 外部フォームサービス採用で静的に戻す。
      icon: i-lucide-rotate-ccw
    - title: セキュリティ強化
      description: _headers で CSP・セキュリティヘッダーを設定。
      icon: i-lucide-shield-check
callout:
  type: info
  title: Worker vs Pages
  text: Cloudflare Worker は柔軟ですが、静的サイトには Pages の方がキャッシュ効率やデプロイの簡潔さで優れています。サーバーサイド処理が不要なら Pages を選びましょう。
faq:
  title: よくある質問
  items:
    - question: Cloudflare Pages と Workers のどちらを選ぶべきですか？
      answer: サーバーサイド処理が不要な静的サイトなら Pages が最適です。CDN との統合がシームレスで、デプロイも簡潔です。フォーム処理などは外部サービスで代替できます。
    - question: _headers ファイルで設定すべきセキュリティヘッダーは何ですか？
      answer: Content-Security-Policy、X-Frame-Options、X-Content-Type-Options、Referrer-Policy、Permissions-Policy が基本です。CSP はサイトで使用する外部リソースに合わせて調整してください。
    - question: CSP の設定で AdSense や Analytics を許可するにはどうしますか？
      answer: script-src に googletagmanager.com や googlesyndication.com のドメインを追加します。img-src や connect-src にも関連ドメインの許可が必要な場合があります。
---

Cloudflare Pages は静的サイトのホスティングに最適なプラットフォームです。この記事では、実際のデプロイ構成と、`_headers` ファイルを使ったセキュリティ設定について紹介します。

## デプロイ構成：Worker をやめて Pages に戻した理由

当初、お問い合わせフォームのバックエンド処理を Cloudflare Worker で行う予定でした。Worker であればサーバーサイドでメール送信やバリデーションが可能です。

しかし、実際に構成してみると以下の課題がありました：

- **ビルドの複雑化**：Astro のビルド出力を Worker で配信するには追加設定が必要
- **デバッグの手間**：ローカルでの `wrangler dev` と本番の挙動差異
- **キャッシュ制御**：Pages のほうが Cloudflare CDN との統合が自然

最終的に、お問い合わせフォームは [ssgform.com](https://ssgform.com/) という外部サービスを利用することで、サーバーサイド処理を完全に排除しました。これにより、Worker の必要がなくなり、純粋な静的サイトとして Pages にデプロイできるようになりました。

## \_headers によるセキュリティ設定

Cloudflare Pages では、`public/_headers` ファイルに HTTP レスポンスヘッダーを記述できます。以下は実際に使用している設定の抜粋です。

### Content-Security-Policy（CSP）

CSP はクロスサイトスクリプティング（XSS）攻撃を防ぐための重要なヘッダーです。許可するリソースの取得元をホワイトリスト方式で指定します。

```text
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' https://acecore.net https://images.unsplash.com data:;
  connect-src 'self' https://challenges.cloudflare.com https://pagead2.googlesyndication.com;
  frame-src https://challenges.cloudflare.com https://googleads.g.doubleclick.net;
  form-action https://ssgform.com;
```

ポイントは以下のとおりです：

- **script-src**：Cloudflare Turnstile（`challenges.cloudflare.com`）と AdSense を許可
- **img-src**：同一オリジンの Cloudflare Images エンドポイントと Unsplash を許可
- **form-action**：ssgform.com のみにフォーム送信を制限
- **frame-src**：Turnstile の iframe と AdSense の広告フレームを許可

### その他のセキュリティヘッダー

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- **X-Content-Type-Options**：MIME スニッフィングを防止
- **X-Frame-Options**：クリックジャッキング対策として iframe 埋め込みを禁止
- **Referrer-Policy**：クロスオリジンではオリジンのみ送信
- **Permissions-Policy**：不要なブラウザ API（カメラ・マイク・位置情報）を無効化

## キャッシュ制御

静的アセットには長期間のキャッシュを設定し、HTML には短めのキャッシュを設定しています。

```text
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

/*.html
  Cache-Control: public, max-age=3600
```

Astro が出力する `_astro/` ディレクトリのファイルにはコンテンツハッシュが含まれるため、`immutable` で1年間キャッシュしても安全です。HTML は更新頻度がある程度あるため、1時間のキャッシュに留めています。

## Pages デプロイの設定

Cloudflare Pages のプロジェクト設定はシンプルです：

| 項目               | 設定値            |
| ------------------ | ----------------- |
| ビルドコマンド     | `npx astro build` |
| 出力ディレクトリ   | `dist`            |
| Node.js バージョン | 22                |

GitHub リポジトリを接続すれば、`main` ブランチへの push で自動デプロイされます。プレビューデプロイも PR ごとに自動生成されるため、レビューが捗ります。

## まとめ

「サーバーサイド処理が本当に必要か？」を見極めることが大切です。外部サービスの活用で Worker を排除でき、結果的にデプロイもセキュリティ管理もシンプルになりました。`_headers` での CSP 設定は最初こそ手間ですが、一度書けばすべてのページに適用されるため、コストパフォーマンスの高いセキュリティ施策です。
