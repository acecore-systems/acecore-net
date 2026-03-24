---
title: 'Astroサイトの品質改善ガイド ― PageSpeedモバイル99点達成までの道のり'
description: 'Astro + UnoCSS + Cloudflare Pages 構成のサイトをパフォーマンス・SEO・アクセシビリティ・UXの4軸で改善し、PageSpeed Insights モバイル99点・デスクトップ全項目100点を達成した全記録です。'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: この記事の対象読者
  text: 'Webサイトの品質改善に取り組んでいる方、Astro + UnoCSS の実践的な運用に興味がある方向けです。この記事は改善の全体像をまとめたハブ記事で、各トピックの詳細は個別の記事にリンクしています。'
processFigure:
  title: 改善の進め方
  steps:
    - title: 計測
      description: PageSpeed Insights・axe で現状のボトルネックを特定する。
      icon: i-lucide-gauge
    - title: 分析
      description: スコアの内訳を読み、最もインパクトの大きい改善を見極める。
      icon: i-lucide-search
    - title: 実装
      description: 1つずつ変更を加え、ビルド0エラーを確認する。
      icon: i-lucide-code
    - title: 再計測
      description: デプロイ後に再計測し、数値で効果を検証する。
      icon: i-lucide-check-circle
compareTable:
  title: 改善前後の比較
  before:
    label: 改善前
    items:
      - PageSpeedモバイル70点台
      - 構造化データ・OGP未設定
      - アクセシビリティ未対応
      - View Transitionsでスクリプト停止
      - ハードコードされた定数が散在
  after:
    label: 改善後
    items:
      - モバイル 99 / 100 / 100 / 100（デスクトップ全項目100）
      - 7種の構造化データ + OGP + canonical 完備
      - WCAG AA準拠（コントラスト・aria・SR通知・focus-visible）
      - 全コンポーネントがView Transitions対応
      - SITE定数・ソーシャルURL・広告IDを一元管理
linkCards:
  - href: /blog/astro-performance-tuning/
    title: パフォーマンス最適化編
    description: CSS配信戦略・フォント設定・レスポンシブ画像・キャッシュでPageSpeed 99点を達成する方法。
    icon: i-lucide-gauge
  - href: /blog/astro-seo-and-structured-data/
    title: SEO・構造化データ編
    description: JSON-LD・OGP・サイトマップ・RSSの実装方法をまとめた実践ガイド。
    icon: i-lucide-search
  - href: /blog/astro-accessibility-guide/
    title: アクセシビリティ編
    description: WCAG AA準拠を達成するためのaria属性・コントラスト・フォーム改善の手引き。
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: UX・コード品質編
    description: View Transitionsの落とし穴・Pagefind全文検索・TypeScript型安全性の実践。
    icon: i-lucide-sparkles
faq:
  title: よくある質問
  items:
    - question: PageSpeed Insights でモバイル100点は出せますか？
      answer: '技術的には可能ですが、AdSense や GA4 などの外部サービスを含むサイトでは安定して100点を維持するのは極めて困難です。Lighthouse は slow 4G（約1.6 Mbps）をシミュレートするため、外部リソースの読み込みが大きなペナルティになります。99点は現実的な最高到達点です。'
    - question: 改善はどのような順番で進めるべきですか？
      answer: 'まずPageSpeed Insightsで現状を把握し、最もインパクトの大きい指摘から対処します。一般的にはパフォーマンス → SEO → アクセシビリティの順がおすすめです。'
    - question: この改善手法は他のAstroサイトにも適用できますか？
      answer: 'はい。CSS配信戦略・フォントのセルフホスト・構造化データ・アクセシビリティ改善などは、Astroサイト全般に共通するベストプラクティスです。'
    - question: GitHub Copilotを使って改善を進めましたか？
      answer: 'はい。ほぼすべての改善をGitHub Copilotと協働して実施しました。詳細は「GitHub Copilotを使った開発フロー」の記事で紹介しています。'
---

## はじめに

2026年3月にリニューアルした Acecore 公式サイトは、Astro 6 + UnoCSS + Cloudflare Pages の構成で公開しました。しかし、リニューアル直後のサイトはまだ「動く」だけのレベル。パフォーマンス・SEO・アクセシビリティ・UXのすべてに改善の余地がありました。

この記事では、150項目超の改善を経て **PageSpeed Insights モバイル99点・デスクトップ全項目100点** を達成するまでの全体像をまとめています。

---

## PageSpeed モバイル99点の壁

まず伝えたいのは、**PageSpeed Insights のモバイルスコアで高得点を出すのは、想像以上に難しい** ということです。

### Lighthouse のモバイルシミュレーション

PageSpeed Insights の裏側で動いているのは Lighthouse というツールで、モバイルのテストには以下のスロットリングが適用されます。

| 項目 | 設定値 |
| --- | --- |
| ダウンロード速度 | 約 1.6 Mbps（slow 4G） |
| アップロード速度 | 約 0.75 Mbps |
| レイテンシ | 150 ms（RTT） |
| CPU | 4倍スローダウン |

つまり、光回線で1秒で開くページでも、Lighthouse のシミュレーション上では **5〜6秒かかる** 計算です。200 KiB のCSSを読み込むだけで、slow 4G では **約1秒** のブロッキングが発生します。

### スコアの非線形性

PageSpeedのスコアは線形ではありません。

- **50 → 90**：基本的な最適化（画像圧縮・不要スクリプト削除）で到達可能
- **90 → 95**：CSS・フォント・画像の配信戦略の工夫が必要
- **95 → 99**：ミリ秒単位のチューニング。CSSのインライン化 vs 外部ファイル化の判断が問われる
- **99 → 100**：外部CDNの応答速度やLighthouse自体の計測揺れに左右される。AdSense・GA4を含むサイトでは安定達成が極めて困難

### スコアの揺れ

同じサイトでも、計測するたびにスコアが **2〜5点** 変動することがあります。原因は以下の通りです。

- wsrv.nl などの画像CDNの応答速度
- Cloudflare Pages エッジサーバーのキャッシュ状態
- Lighthouse自体の計測誤差

このため、「1回で100点が出た」ではなく「繰り返し計測して安定的に高スコアが出る」ことを目標にすべきです。

---

## 最終スコア

上記の困難にもかかわらず、以下のスコアを安定して達成できるようになりました。

| 指標 | モバイル | デスクトップ |
| --- | --- | --- |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

---

## 改善の4つの柱

改善は大きく4つのカテゴリに分けて進めました。それぞれの詳細は個別の記事で解説しています。

### 1. パフォーマンス

モバイル99点の達成に最も寄与したのがパフォーマンス最適化です。CSSの配信戦略（インライン vs 外部ファイル）、フォントのセルフホスト、レスポンシブ画像の最適化、AdSense/GA4 の遅延読み込みなど、ひとつずつボトルネックを潰していきました。

特に効果が大きかったのは以下の3つです。

- **CSS外部ファイル化**：190 KiB のCSSをインライン展開していた状態から外部ファイルに切り替え、HTML転送量を最大91%削減
- **フォント名の不一致修正**：`@fontsource-variable/noto-sans-jp` が登録するフォント名 `Noto Sans JP Variable` と、CSSで参照していた `Noto Sans JP` が一致していなかった問題を発見・修正
- **レスポンシブ画像**：`srcset` + `sizes` をすべての画像に設定し、モバイル向けに適切なサイズを配信

### 2. SEO

Googleのリッチリザルトに対応するため、7種類のJSON-LD構造化データを実装しました。OGPメタタグ・canonical・サイトマップの最適化・RSSフィードの拡充も含め、検索エンジンにサイトの構造を正確に伝える基盤を整えています。

### 3. アクセシビリティ

PageSpeed Accessibility 100点は、axe DevTools やLighthouse の自動テストをクリアすることで達成しました。装飾アイコンの `aria-hidden`（30か所以上）、外部リンクのSR通知、コントラスト修正（`text-slate-400` → `text-slate-500`）、`focus-visible` スタイルの全体適用など、地道な対応を積み重ねています。

### 4. UX・コード品質

View Transitions（ClientRouter）の導入によるスクリプト停止問題を全コンポーネントで解消し、Pagefind による全文検索も実装しました。コード面では TypeScript の型安全性向上、定数の一元管理（SITE定数にソーシャルURL・広告ID・GA4 IDを集約）を行い、保守性を大幅に改善しています。

---

## 技術スタック

| 技術 | 用途 |
| --- | --- |
| Astro 6 | 静的サイト生成（ゼロJSアーキテクチャ） |
| UnoCSS (presetWind3) | ユーティリティファーストCSS |
| Cloudflare Pages | ホスティング・CDN・ヘッダー制御 |
| @fontsource-variable/noto-sans-jp | 日本語フォントのセルフホスト |
| wsrv.nl | 画像プロキシ（AVIF/WebP自動変換） |
| Pagefind | 静的サイト向け全文検索 |

---

## まとめ

PageSpeed Insights でモバイル99点を達成するには、「不要なものを送らない」という原則を徹底することが重要です。CSSの配信戦略、フォントのセルフホスト、画像の最適化、外部スクリプトの遅延読み込み——ひとつずつはシンプルな施策ですが、組み合わせることで大きな効果が得られます。

同時に、SEO・アクセシビリティ・UXの改善を並行して進めることで、4項目すべてで高スコアを達成できます。100点にこだわるよりも、95点以上を安定して出せる状態を目指すのが現実的なゴールです。

各トピックの詳細は上のリンクカードからどうぞ。改善の進め方やコードへの反映については、[GitHub Copilotを使った開発フロー](/blog/tax-return-with-copilot/)も合わせてご覧ください。
