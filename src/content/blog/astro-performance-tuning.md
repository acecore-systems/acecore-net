---
title: 'Astro + UnoCSS で PageSpeed 98点を達成した最適化テクニック'
description: 'コーポレートサイトをAstro + UnoCSS で構築し、PageSpeed Insights でモバイル98点・デスクトップ100点を達成するまでに行った最適化手法をまとめました。'
date: 2026-03-15
tags: ['技術', 'Astro', 'パフォーマンス']
imageUrl: https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80
processFigure:
  title: 最適化の流れ
  steps:
    - title: 技術選定
      description: Astro + UnoCSS で静的サイトを構築。
      icon: i-lucide-code
    - title: フォント最適化
      description: Google Fonts → セルフホストに移行。
      icon: i-lucide-type
    - title: 画像最適化
      description: wsrv.nl で自動変換・品質調整。
      icon: i-lucide-image
    - title: スコア達成
      description: Mobile 98 / Desktop 100 を達成。
      icon: i-lucide-trophy
compareTable:
  title: 最適化前後の比較
  before:
    label: 最適化前
    items:
      - Google Fonts CDN（レンダーブロッキング）
      - 画像は元サイズのまま配信
      - AdSense スクリプトを即時読み込み
      - Mobile 70点台
  after:
    label: 最適化後
    items:
      - '@fontsource でセルフホスト（ブロッキング解消）'
      - wsrv.nl で AVIF/WebP 自動変換・品質60
      - AdSense を初回スクロール時に遅延読み込み
      - Mobile 98点 / Desktop 100点
---

Acecoreの公式サイトは Astro + UnoCSS で構築しています。この記事では、PageSpeed Insights でモバイル98点・デスクトップ100点を達成するまでに行った最適化テクニックを紹介します。

## なぜ Astro を選んだのか

コーポレートサイトに求められるのは「速さ」と「SEO」です。Astro は静的サイト生成（SSG）に特化しており、デフォルトでゼロ JavaScript を実現します。React や Vue のようなフレームワーク成分がクライアントに送られないため、初期表示が非常に高速です。

CSS フレームワークには UnoCSS を採用しました。Tailwind CSS と同様のユーティリティファーストなアプローチですが、ビルド時に使用クラスだけを抽出するため CSS サイズが最小になります。

## フォントの最適化：セルフホスト化

最初に効いた施策がフォントのセルフホスト化です。

### 改善前の問題

Google Fonts CDN を使うと、外部ドメインへの接続が発生し、レンダーブロッキングの原因になります。PageSpeed でも「レンダーブロッキングリソースを排除」という警告が出ていました。

### 改善後

`@fontsource-variable/noto-sans-jp` パッケージをインストールし、フォントファイルをプロジェクトに同梱しました。

```bash
npm install @fontsource-variable/noto-sans-jp
```

レイアウトファイルで import するだけで、外部接続なしにフォントが使えるようになります。DNS lookup・TCP接続・TLS ハンドシェイクがすべて不要になるため、LCP（Largest Contentful Paint）が大きく改善しました。

## 画像の最適化：wsrv.nl プロキシ

ブログ記事やサービスページで使う画像は、[wsrv.nl](https://images.weserv.nl/) を経由して配信しています。

### 仕組み

元画像の URL を wsrv.nl に渡すだけで、以下の処理を自動で行ってくれます：

- **フォーマット変換**：ブラウザが対応していれば AVIF、次に WebP を自動選択
- **品質調整**：`q=60` で十分な画質を維持しつつファイルサイズを削減
- **リサイズ**：指定した幅・高さに合わせてリサイズ

```typescript
// src/utils/image.ts
export function optimizeImage(url: string): string {
  const parts = [`url=${origin}`]
  parts.push('fit=cover', 'output=auto', 'q=60')
  return `https://wsrv.nl/?${parts.join('&')}`
}
```

さらに、すべての画像に `loading="lazy"` と `decoding="async"` を付与しています。ファーストビューに含まれない画像の読み込みを遅延させることで、初期表示を高速化しています。

## AdSense の遅延読み込み

Google AdSense のスクリプトは約 100KB あり、初期表示に大きく影響します。そこで、ユーザーが初めてスクロールしたタイミングで動的にスクリプトを挿入する方式にしました。

```javascript
// 初回スクロール時に AdSense を読み込む
window.addEventListener('scroll', () => {
  const script = document.createElement('script')
  script.src = 'https://pagead2.googlesyndication.com/...'
  script.async = true
  document.head.appendChild(script)
}, { once: true })
```

`{ once: true }` を指定することで、イベントリスナーは1回の発火後に自動で削除されます。これにより、ファーストビューの JavaScript 転送量をゼロに近づけることができました。

## 最終スコア

これらの最適化の結果、PageSpeed Insights で以下のスコアを達成しました：

| 指標 | モバイル | デスクトップ |
|------|----------|-------------|
| Performance | 98 | 100 |
| Accessibility | 100 | 100 |
| Best Practices | 92 | 92 |
| SEO | 100 | 100 |

特にモバイルで98点を出せたのは、フォントのセルフホスト化と AdSense の遅延読み込みが大きく貢献しています。

## まとめ

パフォーマンス最適化で重要なのは「不要なものを送らない」という原則です。Astro のゼロ JS アーキテクチャをベースに、フォント・画像・広告スクリプトそれぞれで転送量を最小化しました。同じような構成でサイトを作る方の参考になれば幸いです。
