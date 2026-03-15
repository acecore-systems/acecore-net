---
title: 'ヘッドレスCMS選定記 ― Pages CMS を選んだ理由と Turnstile によるボット対策'
description: 'Keystatic・Sveltia CMS・Pages CMS を比較検討し、Pages CMS を採用した経緯と、Cloudflare Turnstile でお問い合わせフォームのスパム対策を実装した記録です。'
date: 2026-03-15
tags: ['技術', 'CMS', 'セキュリティ']
imageUrl: https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800&h=400&fit=crop&q=80
compareTable:
  title: CMS の比較
  before:
    label: Keystatic / Sveltia CMS
    items:
      - Keystatic はサーバーサイドランタイムが必要
      - Sveltia CMS は高機能だが学習コストが高い
      - どちらも Astro + Pages 構成にはオーバースペック
      - セットアップに時間がかかる
  after:
    label: Pages CMS
    items:
      - GitHub リポジトリの Markdown を直接編集
      - GUI エディタで非エンジニアも記事更新可能
      - サーバーサイド不要で Pages と相性抜群
      - '.pages.yml だけで設定完了'
callout:
  type: tip
  title: Turnstile のメリット
  text: Cloudflare Turnstile は reCAPTCHA と異なり、ユーザーに画像選択などの操作を求めません。バックグラウンドで自動検証が行われるため、UX を損なわずにボット対策ができます。
---

CMS の選定は地味ですが重要な意思決定です。この記事では、3つの CMS を実際に評価した過程と、お問い合わせフォームに Cloudflare Turnstile を導入したボット対策について紹介します。

## CMS 選定の経緯

Astro で構築した静的サイトに CMS を導入する際、以下の3つを候補に挙げました。

### Keystatic：最初の候補

Keystatic は型安全な CMS として注目していました。Astro との統合も公式にサポートされています。しかし、ローカルモードでの運用にはサーバーサイドランタイムが必要で、Cloudflare Pages の静的デプロイとの相性に難がありました。

### Sveltia CMS：高機能だが重い

Sveltia CMS は Decap CMS（旧 Netlify CMS）のフォークで、モダンな UI と多機能さが魅力です。しかし、現時点でのプロジェクト規模（ブログ記事数本＋固定ページ数枚）に対してはオーバースペックでした。将来的にコンテンツが増えた段階で再評価する予定です。

### Pages CMS：採用

[Pages CMS](https://pagescms.org/) は GitHub リポジトリの Markdown ファイルを直接編集する軽量な CMS です。

採用の決め手は以下のとおりです：

- **セットアップが簡単**：`.pages.yml` を1ファイル追加するだけ
- **サーバー不要**：GitHub API 経由で動作するため、追加のインフラが不要
- **Markdown ネイティブ**：Astro のコンテンツコレクションとそのまま連携
- **GUI エディタ**：非エンジニアのチームメンバーもブラウザから記事を編集可能

```yaml
# .pages.yml
content:
  - name: blog
    label: ブログ
    path: src/content/blog
    type: collection
    fields:
      - name: title
        label: タイトル
        type: string
      - name: date
        label: 公開日
        type: date
      - name: tags
        label: タグ
        type: string
        list: true
```

## Cloudflare Turnstile の導入

お問い合わせフォームのスパム対策として、Cloudflare Turnstile を導入しました。

### なぜ reCAPTCHA ではなく Turnstile か

Google reCAPTCHA v2 はユーザーに画像選択を強制し、v3 はスコアベースですがプライバシー面で懸念があります。Cloudflare Turnstile は以下の点で優れています：

| 比較項目 | reCAPTCHA v2 | reCAPTCHA v3 | Turnstile |
|----------|-------------|-------------|-----------|
| ユーザー操作 | 画像選択が必要 | 不要 | 不要 |
| プライバシー | Cookie ベース追跡 | 行動分析 | 最小限のデータ収集 |
| パフォーマンス | 重い | 中程度 | 軽い |
| 料金 | 無料（制限あり） | 無料（制限あり） | 無料（無制限） |

### 実装方法

Turnstile の導入は驚くほど簡単です。

#### 1. Cloudflare Dashboard でウィジェットを作成

Cloudflare Dashboard の「Turnstile」セクションからウィジェットを作成し、対象ホスト名（本番ドメインと `localhost`）を登録します。サイトキーが発行されます。

#### 2. フォームにウィジェットを追加

```html
<!-- Turnstile スクリプトの読み込み -->
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>

<!-- フォーム内にウィジェットを配置 -->
<form action="https://ssgform.com/s/your-form-id" method="POST">
  <!-- フォームフィールド -->
  <input type="text" name="name" required />
  <textarea name="message" required></textarea>
  
  <!-- Turnstile ウィジェット -->
  <div class="cf-turnstile"
    data-sitekey="your-site-key"
    data-language="ja"
    data-theme="light">
  </div>
  
  <button type="submit">送信</button>
</form>
```

`data-language="ja"` を指定すると、検証成功時に「成功しました！」と日本語で表示されます。`data-theme="light"` はサイトのデザインに合わせて背景色を制御するために指定します。

#### 3. CSP ヘッダーの更新

Turnstile は iframe を使用するため、CSP で適切に許可する必要があります。

```text
script-src: https://challenges.cloudflare.com
connect-src: https://challenges.cloudflare.com
frame-src: https://challenges.cloudflare.com
```

### 注意点：ウィジェット作成直後の伝播遅延

Cloudflare Dashboard でウィジェットを作成した直後は、サイトキーがグローバルに伝播するまで1〜2分かかります。その間は `400020` エラーが発生しますが、少し待てば解消します。

## ssgform.com の活用

フォームの送信先には [ssgform.com](https://ssgform.com/) を使っています。静的サイトから使えるフォーム送信サービスで、以下の利点があります：

- サーバーサイドコード不要
- メール通知が自動で届く
- Turnstile のトークン検証にも対応
- 無料プランで十分な送信数

## まとめ

CMS もボット対策も「必要最小限のものを選ぶ」という方針で統一しました。Pages CMS はセットアップ5分で導入でき、Turnstile は数行のHTMLを追加するだけで実装できます。シンプルな構成だからこそ、運用コストが低く保てています。
