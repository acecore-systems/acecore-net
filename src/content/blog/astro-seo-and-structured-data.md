---
title: 'Astroサイトに構造化データとOGPを実装するSEO改善ガイド'
description: 'Astro + Cloudflare Pages 構成のサイトに JSON-LD 構造化データ・OGP・サイトマップ・RSSを正しく実装した手順をまとめました。Google のリッチリザルト対応からRSSフィードの最適化まで、実践的な SEO 改善を紹介します。'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'SEO']
image: https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: この記事の対象読者
  text: 'AstroサイトのSEOを体系的に改善したい方向けの内容です。構造化データの種類と実装パターン、OGPの設定方法、サイトマップの最適化など、そのまま適用できる実践的な手順を紹介しています。'
processFigure:
  title: SEO改善の流れ
  steps:
    - title: メタタグ整備
      description: title・description・canonical・OGPを全ページに設定。
      icon: i-lucide-file-text
    - title: 構造化データ
      description: JSON-LDでページの意味をGoogleに伝える。
      icon: i-lucide-braces
    - title: サイトマップ
      description: ページ種別ごとに優先度と更新頻度を設定。
      icon: i-lucide-map
    - title: RSS
      description: 著者・カテゴリ情報を含む高品質なフィードを配信。
      icon: i-lucide-rss
insightGrid:
  title: 実装した構造化データ
  items:
    - title: Organization
      description: 会社名・URL・ロゴ・連絡先を検索結果に表示。
      icon: i-lucide-building
    - title: BlogPosting
      description: 著者・公開日・更新日・画像で記事のリッチリザルト対応。
      icon: i-lucide-pen-line
    - title: BreadcrumbList
      description: 全ページの階層構造をパンくずリストとして出力。
      icon: i-lucide-chevrons-right
    - title: FAQPage
      description: FAQ付き記事でよくある質問のリッチリザルトを有効化。
      icon: i-lucide-help-circle
    - title: WebPage / ContactPage
      description: トップページとお問い合わせページに専用の型を付与。
      icon: i-lucide-layout
    - title: SearchAction
      description: Google検索結果からサイト内検索を直接実行可能に。
      icon: i-lucide-search
faq:
  title: よくある質問
  items:
    - question: 構造化データを追加するとすぐに検索結果が変わりますか？
      answer: 'いいえ。Googleがクロール・再インデックスするまでに数日〜数週間かかります。Google Search Consoleの「リッチリザルト」レポートで反映状況を確認できます。'
    - question: OGPの画像サイズはどのくらいが適切ですか？
      answer: '1200×630px が推奨です。X（Twitter）は summary_large_image で表示する場合、この比率が最適です。'
    - question: サイトマップの priority は SEO に影響しますか？
      answer: 'Googleは公式に priority を無視すると述べていますが、他の検索エンジンでは参考にされる場合があります。設定しておいて損はありません。'
---

## はじめに

SEO対策というと「キーワードを詰め込む」イメージがあるかもしれませんが、現代のSEOは **検索エンジンにサイトの構造と内容を正確に伝える** ことが本質です。

この記事では、Astroサイトに実装すべきSEOの施策を4つのカテゴリに分けて解説します。いずれも一度設定すれば継続的に効果を発揮するものばかりです。

---

## OGP・メタタグの設定

SNSでシェアされたときの見た目と、検索エンジンへの情報伝達を担うのがOGPとメタタグです。

### 基本のメタタグ

Astro のレイアウトコンポーネントで、ページごとに以下を出力します。

- `og:title` / `og:description` / `og:image` ― SNSシェア時のタイトル・説明・画像
- `twitter:card` = `summary_large_image` ― X（Twitter）で大きな画像カードを表示
- `rel="canonical"` ― 重複ページの正規URLを指定
- `rel="prev"` / `rel="next"` ― ページネーションの前後関係を明示

### ブログ記事向けのメタタグ

記事ページには追加で以下を設定します。

- `article:published_time` / `article:modified_time` ― 公開日と更新日
- `article:tag` ― 記事のタグ情報
- `article:section` ― コンテンツカテゴリ

### 実装のポイント

レイアウトコンポーネントにpropsとして `title` / `description` / `image` を受け取り、各ページから渡す構成にすると、全ページで一貫したメタタグを出力できます。ホームページの `og:title` は「ホーム」ではなく、サイト名とキャッチコピーを含む具体的なタイトルにしましょう。

---

## 構造化データ（JSON-LD）の実装

構造化データは、ページの内容を検索エンジンが機械的に理解するための仕組みです。正しく実装すると、検索結果にリッチリザルト（FAQ、パンくず、著者情報など）が表示される可能性があります。

### Organization

会社情報をGoogleに伝えます。ナレッジパネルに表示される可能性があります。

```json
{
  "@type": "Organization",
  "name": "Acecore",
  "url": "https://acecore.net",
  "logo": "https://acecore.net/logo.png",
  "contactPoint": { "@type": "ContactPoint", "telephone": "..." }
}
```

会社概要ページには `knowsAbout` フィールドを追加し、事業領域を明示することもできます。

### BlogPosting

ブログ記事には `BlogPosting` を設定します。著者・公開日・更新日・アイキャッチ画像を含めることで、Google Discover や検索結果で著者情報付きの表示が得られます。

### BreadcrumbList

パンくずリストの構造化データは全ページに設定します。実装時の注意点として、中間パス（`/blog/tags/` のような一覧ページ）が実際に存在するかどうかを確認し、存在しないパスには `item` プロパティを出力しないようにしましょう。

### FAQPage

FAQ付きの記事には `FAQPage` 構造化データを出力します。Astro ではフロントマターに `faq` フィールドを定義し、テンプレート側で検出・出力する方式が便利です。

### WebSite + SearchAction

サイト内検索がある場合、`SearchAction` を設定すると Google の検索結果にサイト内検索ボックスが表示されることがあります。Pagefind などの検索エンジンと組み合わせ、`?q=` パラメータで検索モーダルが自動起動する仕組みにしておくと、ユーザー体験も向上します。

---

## サイトマップの最適化

Astro の `@astrojs/sitemap` プラグインを使えばサイトマップは自動生成されますが、デフォルト設定のままでは不十分です。

### ページ種別ごとの設定

`serialize()` 関数を使い、ページのURLパターンに応じて `changefreq` と `priority` を設定します。

| ページ種別 | changefreq | priority |
| --- | --- | --- |
| トップページ | daily | 1.0 |
| ブログ記事 | weekly | 0.8 |
| その他 | monthly | 0.6 |

### lastmod の設定

`lastmod` にはビルド日時を設定し、検索エンジンにコンテンツの鮮度を伝えます。ブログ記事にフロントマターで `lastUpdated` フィールドがある場合はそちらを優先します。

---

## RSSフィードの拡充

RSSは「設定して終わり」にしがちですが、フィードの品質を上げることでRSSリーダーでの表示が改善し、購読者の体験が向上します。

### 追加すべき情報

- **author**：記事ごとの著者名を含める
- **categories**：タグ情報をカテゴリとして追加し、RSSリーダーでの分類を改善

```typescript
items: posts.map(post => ({
  title: post.data.title,
  description: post.data.description,
  link: `/blog/${post.id}/`,
  pubDate: post.data.date,
  author: post.data.author,
  categories: post.data.tags,
}))
```

---

## SEO改善のチェックリスト

最後に、AstroサイトのSEO改善で確認すべきポイントをまとめます。

1. **全ページに canonical URL を設定しているか**
2. **OGP画像は各ページに固有のものを用意しているか**
3. **構造化データのバリデーション**：[Google リッチリザルトテスト](https://search.google.com/test/rich-results)で確認
4. **パンくずリストの中間パスが実在するURLか**
5. **サイトマップに不要なページ（404など）が含まれていないか**
6. **RSSフィードに著者・カテゴリが含まれているか**
7. **robots.txt で検索インデックス（`/pagefind/`など）をクロール除外しているか**

これらを一通り設定しておけば、SEOの基盤は整います。あとはコンテンツの質と更新頻度で検索順位が決まります。

---

## この記事が含まれるシリーズ

この記事は「[Astroサイトの品質改善ガイド](/blog/website-improvement-batches/)」シリーズの一部です。パフォーマンス・アクセシビリティ・UXの改善についても個別の記事で紹介しています。
