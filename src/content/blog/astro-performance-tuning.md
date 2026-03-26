---
title: 'AstroサイトのPageSpeedモバイル99点を達成する実践テクニック'
description: 'Astro + UnoCSS + Cloudflare Pages 構成のサイトで PageSpeed Insights モバイル99点を達成するまでに行った最適化テクニックを紹介します。CSS配信戦略・フォント設定の罠・レスポンシブ画像・AdSense遅延読み込み・キャッシュ設定まで、実践的な手法をまとめました。'
date: 2026-03-15
lastUpdated: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: この記事の対象読者
  text: 'AstroサイトのPageSpeedスコアを上げたい方向けです。CSS・フォント・画像・広告スクリプトの最適化について、そのまま適用できる具体的な手法を紹介しています。'
processFigure:
  title: 最適化の流れ
  steps:
    - title: CSSの配信戦略
      description: インライン展開と外部ファイルのトレードオフを理解する。
      icon: i-lucide-file-code
    - title: フォントの最適化
      description: セルフホストで外部CDNの遅延を排除する。
      icon: i-lucide-type
    - title: 画像の最適化
      description: Cloudflare Images + srcset + sizes で最適サイズを配信。
      icon: i-lucide-image
    - title: 遅延読み込み
      description: AdSense・GA4を初回操作時に注入する。
      icon: i-lucide-timer
compareTable:
  title: 最適化前後の比較
  before:
    label: 最適化前
    items:
      - Google Fonts CDN（レンダーブロッキング）
      - 190 KiB のCSSをHTMLにインライン展開
      - 画像は固定サイズで配信
      - AdSense スクリプトを即時読み込み
      - モバイル70点台
  after:
    label: 最適化後
    items:
      - '@fontsource でセルフホスト（正しいフォント名で参照）'
      - CSSを外部ファイル化しimmutableキャッシュで配信
      - srcset + sizes で画面幅に応じた最適サイズを配信
      - AdSense・GA4を初回スクロール時に遅延読み込み
      - モバイル99点・デスクトップ100点
faq:
  title: よくある質問
  items:
    - question: CSSはインライン化と外部ファイル化、どちらが速いですか？
      answer: 'CSSの総量によります。20 KiB 以下ならインライン化が有利です。それ以上の場合は外部ファイル化してブラウザキャッシュを活かすほうが、2回目以降のアクセスが大幅に高速化します。'
    - question: Google Fonts CDN はなぜ遅いのですか？
      answer: 'PageSpeed Insights はslow 4G（約1.6 Mbps、RTT 150ms）をシミュレートします。外部ドメインへの接続にはDNS lookup + TCP接続 + TLSハンドシェイクが必要で、この遅延がレンダーブロッキングになります。セルフホストなら同一ドメインから配信されるため、この遅延がゼロになります。'
    - question: Cloudflare Images が遅い場合はどうすればいいですか？
      answer: 'Cloudflare Images は通常は高速ですが、初回変換やキャッシュミス時は元画像の取得待ちが発生します。PageSpeed計測時にLCPが悪化する場合は、重要な画像に <link rel="preload"> を設定し、ブラウザに早期取得を指示しましょう。'
    - question: AdSense を遅延読み込みしても収益に影響しませんか？
      answer: 'ファーストビューに広告がない場合、初回スクロール時の読み込みでも表示タイミングはほぼ同じです。ページ速度改善によるSEO効果のほうがプラスに働きます。'
---

## はじめに

Acecore の公式サイトは Astro 6 + UnoCSS + Cloudflare Pages で構築しています。この記事では、PageSpeed Insights で **モバイル99点・デスクトップ100点** を達成するまでに行った最適化テクニックを紹介します。

最終的に達成したスコアは以下の通りです。

| 指標 | モバイル | デスクトップ |
| --- | --- | --- |
| Performance | **99** | **100** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

---

## なぜ Astro を選んだのか

コーポレートサイトに求められるのは「速さ」と「SEO」です。Astro は静的サイト生成（SSG）に特化しており、デフォルトでゼロ JavaScript を実現します。React や Vue のようなフレームワーク成分がクライアントに送られないため、初期表示が非常に高速です。

CSS フレームワークには UnoCSS を採用しました。Tailwind CSS と同様のユーティリティファーストなアプローチですが、ビルド時に使用クラスだけを抽出するため CSS サイズが最小になります。v66 からは `presetWind3()` が推奨されているため、移行しておきましょう。

---

## CSSの配信戦略：インライン vs 外部ファイル

PageSpeedスコアに最もインパクトがあったのが、CSSの配信戦略です。

### CSSサイズが小さい場合（〜20 KiB）

Astro の `build.inlineStylesheets: 'always'` を設定すると、すべてのCSSがHTMLに直接埋め込まれます。外部CSSファイルへのHTTPリクエストが不要になるため、FCP（First Contentful Paint）が改善します。

CSSが20 KiB程度までなら、この方式が最適です。

### CSSサイズが大きい場合（20 KiB〜）

しかし日本語Webフォント（`@fontsource-variable/noto-sans-jp`）を使うと状況が変わります。このパッケージは **124個の `@font-face` 宣言**（約96.7 KiB）を含んでおり、CSS全体が190 KiB前後になります。

190 KiB のCSSをすべてのHTMLにインライン展開すると、トップページのHTMLが **225 KiB** に膨らみます。slow 4Gでは、このHTML転送だけで約1秒かかる計算です。

### 解決策：外部ファイル化 + immutableキャッシュ

Astro の設定を `build.inlineStylesheets: 'auto'` に変更します。Astro が CSS サイズに応じて自動判断し、大きなCSSは外部ファイルとして配信します。

```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    inlineStylesheets: 'auto',
  },
})
```

外部CSSファイルは `/_astro/` ディレクトリに出力されるため、Cloudflare Pages のヘッダー設定で immutable キャッシュを付与します。

```
/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

この変更により、HTMLサイズが **84〜91%削減**（例：index.html が 225 KiB → 35 KiB）され、PageSpeedスコアが **96点 → 99点** に向上しました。

---

## フォントの最適化：セルフホストの正しい設定

### Google Fonts CDN は避ける

Google Fonts CDN は手軽ですが、PageSpeed Insights のモバイルテストでは致命的です。実際にテストしたところ、Google Fonts CDN を使った状態で **FCP 6.1秒・スコア62点** まで低下しました。

slow 4G で外部ドメインに接続すると、DNS lookup → TCP接続 → TLSハンドシェイク → CSSダウンロード → フォントダウンロードというチェーンが発生し、レンダリングが大幅に遅延します。

### セルフホストの導入

`@fontsource-variable/noto-sans-jp` をインストールし、レイアウトファイルで import するだけです。

```bash
npm install @fontsource-variable/noto-sans-jp
```

```javascript
// BaseLayout.astro
import '@fontsource-variable/noto-sans-jp'
```

### 注意：フォント名の不一致

ここで意外な落とし穴があります。`@fontsource-variable/noto-sans-jp` が `@font-face` で登録するフォント名は **`Noto Sans JP Variable`** です。しかし多くの人は CSS で `Noto Sans JP` と書いてしまいます。

この不一致があると、**フォントが正しく適用されず、ブラウザのフォールバックフォントが使われ続けます**。せっかく96.7 KiB のフォントデータを読み込んでいるのに、全く使われていない状態です。

UnoCSS の設定でフォントファミリーを正しく指定しましょう。

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP Variable', 'Hiragino Kaku Gothic ProN', 'メイリオ', sans-serif",
  },
}
```

TypeScript の型エラーが出る場合は、`src/env.d.ts` にモジュール宣言を追加します。

```typescript
declare module '@fontsource-variable/noto-sans-jp';
```

---

## 画像の最適化：Cloudflare Images + srcset + sizes

### Cloudflare Images Transformations

外部画像は Cloudflare Images の `/_cdn-cgi/image/` 変換URLを経由して配信します。変換パラメータを付けるだけで以下の処理が自動的に行われます。

- **フォーマット変換**：`format=auto` でブラウザ対応に応じて AVIF / WebP を自動選択
- **品質調整**：`quality=50` で十分な画質を維持しつつファイルサイズを削減
- **リサイズ**：`width=` / `height=` パラメータで指定サイズに変換

### srcset と sizes の設定

すべての画像に `srcset` と `sizes` を設定し、画面幅に応じた最適なサイズを配信します。

```html
<img
  src="/cdn-cgi/image/width=800,fit=cover,format=auto,quality=50,metadata=none/https://images.unsplash.com/..."
  srcset="
    /cdn-cgi/image/width=480,fit=scale-down,format=auto,quality=50,metadata=none/https://images.unsplash.com/... 480w,
    /cdn-cgi/image/width=640,fit=scale-down,format=auto,quality=50,metadata=none/https://images.unsplash.com/... 640w,
    /cdn-cgi/image/width=960,fit=scale-down,format=auto,quality=50,metadata=none/https://images.unsplash.com/... 960w,
    /cdn-cgi/image/width=1280,fit=scale-down,format=auto,quality=50,metadata=none/https://images.unsplash.com/... 1280w,
    /cdn-cgi/image/width=1600,fit=scale-down,format=auto,quality=50,metadata=none/https://images.unsplash.com/... 1600w
  "
  sizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  loading="lazy"
  decoding="async"
/>
```

### `sizes` の精度

`sizes` 属性が `100vw`（画面幅全体）のままだと、ブラウザは必要以上に大きな画像を選択します。実際のレイアウトに合わせて `calc(100vw - 2rem)` や `(max-width: 768px) 100vw, 50vw` のように指定しましょう。

### LCPの改善：preload

LCP（Largest Contentful Paint）に影響する画像には `<link rel="preload">` を設定します。Astro のレイアウトコンポーネントに `preloadImage` props を追加し、トップページのヒーロー画像など、最優先で読み込む画像を指定します。

```html
<link rel="preload" as="image" href="..." />
```

### CLS（レイアウトシフト）の防止

すべての画像に `width` と `height` 属性を明示します。ブラウザが画像の表示領域を事前に確保するため、読み込み完了時のレイアウトずれ（CLS）を防止できます。

特に忘れがちなのはアバター画像（32×32、48×48、64×64px）や YouTube サムネイル（480×360px）です。

---

## 広告・アナリティクスの遅延読み込み

### AdSense

Google AdSense のスクリプトは約100 KiB あり、初期表示に大きく影響します。ユーザーが初めてスクロールしたタイミングで動的にスクリプトを注入する方式にします。

```javascript
window.addEventListener('scroll', () => {
  const script = document.createElement('script')
  script.src = 'https://pagead2.googlesyndication.com/...'
  script.async = true
  document.head.appendChild(script)
}, { once: true })
```

`{ once: true }` でイベントリスナーは1回だけ発火します。これにより、ファーストビューの JavaScript 転送量をゼロに近づけます。

### GA4

Google Analytics 4 も同様に `requestIdleCallback` で遅延注入します。ブラウザがアイドル状態になったタイミングでスクリプトを注入するため、ユーザーの操作を妨げません。

---

## キャッシュ戦略

Cloudflare Pages の `_headers` ファイルで、アセットごとに最適なキャッシュポリシーを設定します。

```
# ビルド出力（ハッシュ付きファイル名）
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

# 検索インデックス
/pagefind/*
  Cache-Control: public, max-age=604800, stale-while-revalidate=86400

# HTML
/*
  Cache-Control: public, max-age=0, must-revalidate
```

- `/_astro/*` はファイル名にハッシュが含まれるため、1年間のimmutableキャッシュが安全
- `/pagefind/*` は1週間キャッシュ + 1日間の stale-while-revalidate
- HTMLは常に最新版を取得

---

## パフォーマンス最適化のチェックリスト

1. **CSSの配信戦略は適切か**：20 KiB以下ならインライン、それ以上なら外部ファイル
2. **フォントはセルフホストか**：外部CDNは slow 4G で致命的
3. **フォント名は正しいか**：`@fontsource-variable` の登録名（`*Variable`）を確認
4. **すべての画像に srcset + sizes があるか**：特にモバイル向けの小さいサイズを用意
5. **LCP要素に preload があるか**：ヒーロー画像やファーストビューの画像
6. **画像に width / height があるか**：CLSの防止
7. **AdSense / GA4 は遅延読み込みか**：ファーストビューのJS転送量をゼロに
8. **キャッシュヘッダーは設定されているか**：immutableキャッシュで2回目以降を高速化

---

## まとめ

パフォーマンス最適化の原則は **「不要なものを送らない」** の一言に尽きます。CSSのインライン展開は一見速そうに見えますが、190 KiB では逆効果になります。フォントのセルフホストは必須ですが、フォント名の不一致という罠があります。

Astro のゼロ JS アーキテクチャをベースに、CSS・フォント・画像・広告スクリプトそれぞれで転送量を最小化していけば、モバイル99点は十分に到達可能です。

---

## この記事が含まれるシリーズ

この記事は「[Astroサイトの品質改善ガイド](/blog/website-improvement-batches/)」シリーズの一部です。SEO・アクセシビリティ・UXの改善についても個別の記事で紹介しています。
