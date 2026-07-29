---
title: 'AstroサイトのPageSpeedを改善する実践テクニック'
description: 'Astro + UnoCSS + Cloudflare Pages 構成のサイトで行う最適化を紹介します。CSS配信戦略・フォント設定・レスポンシブ画像・AdSenseの読み込み制御・GA4の遅延読み込み・キャッシュ設定を、現行実装に合わせてまとめました。'
date: 2026-03-15T00:00
lastUpdated: '2026-07-29T00:28:23+09:00'
author: gui
tags: ['技術', 'Astro', 'パフォーマンス']
image: /uploads/acecore-generated/blog-astro-performance-tuning.webp
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
      description: 実際に読み込まれ、描画に使われるフォントを確認する。
      icon: i-lucide-type
    - title: 画像の最適化
      description: 外部画像を Cloudflare Images + srcset + sizes で最適化。
      icon: i-lucide-image
    - title: 読み込み制御
      description: AdSenseの初回試行と再試行、GA4の遅延読み込みを確認する。
      icon: i-lucide-timer
compareTable:
  title: 最適化前後の比較
  before:
    label: 最適化前
    items:
      - フォントの接続・描画結果を確認しない
      - CSSの出力とキャッシュを確認しない
      - 画像は固定サイズで配信
      - AdSense スクリプトを即時読み込み
      - 固定スコアだけを追い、計測条件を記録しない
  after:
    label: 最適化後
    items:
      - フォントのネットワーク取得と描画結果を確認
      - 大きいCSSを外部化し、ハッシュ付きアセットをimmutableキャッシュで配信
      - srcset + sizes で画面幅に応じた最適サイズを配信
      - AdSenseは表示可能性を確認して初回試行しObserverで再試行、GA4は操作またはタイマーで読み込み
      - PageSpeed Insightsを同じ条件で継続計測
faq:
  title: よくある質問
  items:
    - question: CSSはインライン化と外部ファイル化、どちらが速いですか？
      answer: "CSSの量、ページ構成、キャッシュ状態によります。現行の build.inlineStylesheets: 'auto' に任せたうえで、生成HTMLとCSSファイルを確認し、同じ条件で計測します。"
    - question: Google Fonts CDN はなぜ遅いのですか？
      answer: '外部ドメインへの接続ではDNS lookup、TCP接続、TLSハンドシェイクなどが追加されます。影響はネットワークやキャッシュ状態で変わるため、実際のリクエストと描画フォントを確認して判断します。'
    - question: Cloudflare Images が遅い場合はどうすればいいですか？
      answer: 'Cloudflare Images の速度は元画像、変換、キャッシュ状態で変わります。初回変換やキャッシュミスでは元画像の取得待ちが発生するため、LCP候補を同じ条件で計測し、必要な画像だけ responsive preload を検討します。'
    - question: AdSense の読み込み制御は収益に影響しませんか？
      answer: '影響は広告位置や閲覧行動で変わるため一律には判断できません。表示率、広告リクエスト、収益などを変更前後で確認し、パフォーマンス指標とは分けて評価します。'
---

## はじめに

Acecore の公式サイトは Astro 7.1.3 + UnoCSS + Cloudflare Pages で構築しています。この記事では、2026年7月29日時点のリポジトリで確認できる最適化設定を紹介します。

PageSpeed Insights の結果は計測時点、端末、ネットワーク条件で変わるため、固定スコアとしては掲載しません。変更前後を同じ条件で計測し、Core Web Vitalsと転送量を確認します。

---

## なぜ Astro を選んだのか

Astro は静的サイト生成（SSG）を利用でき、必要な箇所だけクライアントJavaScriptを追加できます。現行サイトにもClientRouter、検索、広告、計測などのスクリプトがあるため「ゼロJavaScript」とは扱わず、実際の配信量と表示指標を計測します。

CSSには UnoCSS と `presetWind3()` を使用しています。ビルド時に検出したユーティリティからCSSを生成するため配信量を抑えられる場合がありますが、最小サイズを保証するものではありません。生成CSSと利用されるクラスを確認します。

SEOや構造化データまで含めたWebサイト全体の改善は、[Astroサイトの品質改善ガイド](/blog/website-improvement-batches/)で横断的にまとめています。

---

## CSSの配信戦略：インライン vs 外部ファイル

CSSの配信方法は、生成HTMLの大きさ、追加リクエスト、ブラウザキャッシュに影響します。

### CSSをインライン化する場合

Astro の `build.inlineStylesheets: 'always'` を設定すると、すべてのCSSがHTMLに直接埋め込まれます。外部CSSファイルへのHTTPリクエストが不要になり、構成によってはFCP（First Contentful Paint）が改善する場合があります。

有利になる条件はCSS量やページ構成で変わるため、固定の閾値だけでは判断しません。

### CSSを外部ファイルにする場合

ページ間で共有するCSSを外部ファイルにすると、ハッシュ付きファイルをブラウザキャッシュで再利用できます。

現行サイトでは `build.inlineStylesheets: 'auto'` を使い、生成結果を確認しながら調整しています。

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

変更後は生成HTML、CSSファイル、キャッシュ動作を確認し、同じ条件でPageSpeed Insightsを再計測します。

---

## フォントの最適化：実際の配信を確認する

### 外部配信とローカル配信を比較する

外部フォントは追加の接続が必要になる場合があります。一方、ローカル配信もフォントファイルとCSSをサイトから送るため、どちらが適切かは同じ条件で比較します。

ネットワークパネルでフォントのリクエスト、キャッシュ、転送量を確認し、Rendered Fontsなどで実際に描画へ使われたフォントも確認します。

### 現行リポジトリの状態

`package.json` には `@fontsource/noto-sans-jp` がありますが、2026年7月29日時点では `src` からこのパッケージを import していません。依存関係に存在するだけでは、フォントが配信されているとは判断できません。

現行の UnoCSS は次のフォントスタックを指定しています。

```typescript
// uno.config.ts
theme: {
  fontFamily: {
    sans: "'Noto Sans JP', 'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Yu Gothic UI', 'Yu Gothic', 'Meiryo', system-ui, sans-serif",
  },
}
```

この指定だけでWebフォントがダウンロードされるわけではありません。セルフホストを採用する場合は、明示的なimport、生成CSSとフォントファイル、描画結果をまとめて確認します。

---

## 画像の最適化：Cloudflare Images + srcset + sizes

### Cloudflare Images Transformations

現行ユーティリティは外部画像だけを Cloudflare Images の `/cdn-cgi/image/` 変換URLで配信します。ルート相対の `/uploads/...` と自社管理の `asv.acecore.net/uploads/...` は直接配信します。

- **フォーマット変換**：`format=auto` でブラウザ対応に応じて AVIF / WebP を自動選択
- **品質調整**：現行ユーティリティの既定値は `quality=75`。用途に応じて実画像を確認して調整
- **リサイズ**：`width=` / `height=` パラメータで指定サイズに変換

### srcset と sizes の設定

レスポンシブ配信する外部画像には、ユーティリティから `srcset` と `sizes` を設定します。

```astro
---
import { generateSrcSet, optimizeImage } from '../utils/image'

const remoteImage =
  'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop'
---

<img
  src={optimizeImage(remoteImage, { width: 800, height: 400, quality: 75 })}
  srcset={generateSrcSet(remoteImage, [480, 640, 960, 1280, 1600], {
    quality: 75,
    aspectRatio: 2,
  })}
  sizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  width="800"
  height="400"
  loading="lazy"
  decoding="async"
/>
```

### `sizes` の精度

`sizes` 属性が `100vw`（画面幅全体）のままだと、ブラウザは必要以上に大きな画像を選択します。実際のレイアウトに合わせて `calc(100vw - 2rem)` や `(max-width: 768px) 100vw, 50vw` のように指定しましょう。

### LCPの改善：preload

実際にLCP候補になる画像だけをpreloadします。レスポンシブ画像では、レイアウトが出力する `href`、`imagesrcset`、`imagesizes` を画像本体と一致させ、`fetchpriority="high"` を指定します。候補外の画像までpreloadすると競合が増えるため、計測して選びます。

```html
<link
  rel="preload"
  as="image"
  href="..."
  imagesrcset="..."
  imagesizes="(max-width: 768px) calc(100vw - 2rem), 800px"
  fetchpriority="high"
/>
```

### CLS（レイアウトシフト）の防止

画像には、実画像と同じアスペクト比になる正確な `width` と `height` を指定します。値が正しければブラウザは表示領域を事前に確保できますが、属性があるだけでCLSを防げるとは限りません。現行のhero画像やMarkdown画像のrewriteにも固定値があるため、実画像と比率が一致するか、実測CLSとあわせて確認します。

特に忘れがちなのはアバター画像（32×32、48×48、64×64px）や YouTube サムネイル（480×360px）です。

---

## 広告の読み込み制御・アナリティクスの遅延読み込み

### AdSense

日本語の `/blog/` で有効な現行runtimeは、各広告スロットに `IntersectionObserver`（`rootMargin: 200px`）と `ResizeObserver` を登録した後、表示可能性を確認して初回の `attemptInit()` を実行します。初回試行はintersectionを待たないため、表示可能な幅があればすぐ広告リクエストを開始する場合があります。Observerは接近やサイズ変更時の再試行に使います。locale prefix付きの翻訳URLには広告スロットが挿入されますが、現状ではruntimeは読み込まれません。

```javascript
const retry = () => void attemptInit()
const intersectionObserver = new IntersectionObserver(
  (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      retry()
    }
  },
  { rootMargin: '200px' },
)
const resizeObserver = new ResizeObserver(retry)

intersectionObserver.observe(container)
resizeObserver.observe(container)
void attemptInit() // intersectionを待たず初回試行
```

`attemptInit()` はスロット幅や表示状態を確認し、初期化済み属性で二重リクエストも防ぎます。

### GA4

Google Analytics 4 は `pointerdown`、`keydown`、`touchstart`、`scroll` のいずれかで読み込みを予約し、`requestIdleCallback` が使える場合はアイドル時に実行します。未対応ブラウザでは `setTimeout` を使い、操作がない場合もトップページは12秒、その他のページは4秒後に読み込みを予約する fallback を設けています。

---

## キャッシュ戦略

Cloudflare Pages の `_headers` にある現行設定を確認します。次の値は現在値であり、すべてのファイルに最適とは限りません。

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
- `/pagefind/*` は現在1週間キャッシュ + 1日間の stale-while-revalidate。固定名の `pagefind-entry.json` がハッシュ付きmetadataを参照するため、世代不整合を避けるにはentry/bootstrapを再検証し、長期キャッシュはハッシュ付きchunkだけに限定する方が安全
- HTMLは `max-age=0, must-revalidate` により、キャッシュを再利用する前に再検証

---

## パフォーマンス最適化のチェックリスト

1. **CSSの配信戦略は適切か**：`auto` の生成結果と同じ条件での計測を確認
2. **フォント配信を比較したか**：同じ条件でセルフホストと外部CDNを計測
3. **フォントの実配信を確認したか**：ネットワーク取得とRendered Fontsを確認
4. **レスポンシブ配信対象に srcset + sizes があるか**：特にモバイル向けの小さいサイズを用意
5. **実際のLCP候補だけを preload しているか**：レスポンシブ画像はsrcset・sizes・priorityも一致させる
6. **画像の width / height が正確か**：実画像と同じアスペクト比か確認し、CLSを実測
7. **AdSense / GA4 の制御は適切か**：AdSenseの初回試行とObserver再試行、GA4の操作・timer fallbackを確認
8. **キャッシュヘッダーは設定されているか**：immutableはハッシュ付きアセットに限定

---

## まとめ

パフォーマンス最適化の原則は **「不要なものを送らない」** です。CSS配信は実際の出力で確認し、フォントのセルフホストはサイトの計測結果と運用に合う場合に選べる方式の一つです。

固定スコアを成果として扱うのではなく、同じ計測条件で Core Web Vitals と転送量を確認し、広告や計測の動作も含めて継続的に調整します。

---

## この記事が含まれるシリーズ

この記事は「[Astroサイトの品質改善ガイド](/blog/website-improvement-batches/)」シリーズの一部です。SEO・アクセシビリティ・UXの改善についても個別の記事で紹介しています。
