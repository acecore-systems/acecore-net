---
title: 'Astro 7 サイトを9言語対応に ― ブログ翻訳と多言語アーキテクチャ'
description: 'Astro 7.1.3 + UnoCSS + Cloudflare Pages 構成のサイトを9言語対応にした記録です。UI の国際化からブログ記事の翻訳、Pages CMS の多言語設定まで、全工程を解説します。'
date: 2026-03-25T10:00
lastUpdated: '2026-07-29T00:28:02+09:00'
author: gui
tags: ['技術', 'Astro', 'i18n', 'Webサイト']
image: /uploads/acecore-generated/blog-astro-i18n-blog-translation.webp
processFigure:
  title: 多言語化の流れ
  steps:
    - title: i18n 基盤構築
      description: Astro の組み込み i18n ルーティングと翻訳ユーティリティを整備。
      icon: i-lucide-globe
    - title: UI テキスト翻訳
      description: ヘッダー・フッター・全コンポーネントの表示テキストを多言語化。
      icon: i-lucide-languages
    - title: ブログ記事翻訳
      description: 初回対応時に21記事×8言語＝168本の翻訳ファイルを生成。
      icon: i-lucide-file-text
    - title: CMS・ビルド検証
      description: Pages CMS の多言語対応と全ページのビルド検証。
      icon: i-lucide-check-circle
compareTable:
  title: 多言語化前後の比較
  before:
    label: 日本語のみ
    items:
      - 日本語1言語のみ
      - ブログ記事23本
      - 523ページ生成（UI多言語化後）
      - Pages CMS はブログ1コレクション
      - タグ・著者データは日本語のみ
      - RSS フィードは1つ
  after:
    label: 9言語対応（初回導入時）
    items:
      - 日本語 + 8言語（en, zh-cn, es, pt, fr, ko, de, ru）
      - ブログ記事23本 + 翻訳168本 = 191本
      - 621ページ生成（初回導入時）
      - Pages CMS に言語別の9コレクション
      - タグ25種・著者データを各言語に翻訳
      - 多言語 RSS フィード（9言語分）
callout:
  type: info
  title: 対応言語
  text: '日本語（デフォルト）・英語・簡体字中国語・スペイン語・ポルトガル語・フランス語・韓国語・ドイツ語・ロシア語の9言語に対応しています。'
statBar:
  items:
    - value: '9'
      label: 対応言語数
    - value: '208'
      label: 翻訳記事数（2026年7月29日時点）
    - value: '652'
      label: 生成ページ数（2026年7月29日時点）
faq:
  title: よくある質問
  items:
    - question: なぜ9言語を選んだのですか？
      answer: 'グローバルなリーチを最大化するため、世界の主要言語圏をカバーしました。英語・中国語・スペイン語・ポルトガル語でインターネット人口の大部分をカバーし、フランス語・ドイツ語・ロシア語・韓国語で残る主要市場を補完しています。'
    - question: 翻訳の品質はどのように担保していますか？
      answer: 'GitHub Copilot による AI 翻訳を採用しています。英語版を中間言語として作成し、そこから各言語に翻訳することで品質のばらつきを抑えています。フロントマターのタグ値は日本語のまま保持し、URL・コードブロック・画像パスは変更しない方針です。'
    - question: 翻訳記事が存在しない場合はどうなりますか？
      answer: '翻訳ファイルが無いロケールの記事URLは生成しません。日本語版は元のURLで公開を続け、言語切り替えでは対象ロケールのブログ一覧へ移動します。'
    - question: 新しい記事を追加したら翻訳も必要ですか？
      answer: '日本語版の公開に翻訳は必須ではありません。翻訳を追加する場合は、対応する言語ディレクトリに同名のMarkdownファイルを配置すると、その言語の記事URL・sitemap・hreflangが生成対象になります。'
---

Acecore公式サイトを日本語のみから9言語対応にアップグレードしました。初回対応時はブログ記事21本×8言語＝168本を翻訳し、2026年7月29日時点では日本語記事29本・翻訳208本の計237本、ビルド出力は652ページです。翻訳が未追加のロケールには記事URLを生成せず、実在する言語版だけを公開します。

## 多言語化の方針

### スコープの決定

多言語化にあたり、以下の3つのスコープを段階的に対応しました。

1. **i18n 基盤構築**：Astro の組み込み i18n ルーティング設定、翻訳ユーティリティ、9言語分の翻訳 JSON ファイル
2. **UI テキスト翻訳**：ヘッダー・フッター・サイドバー・全ページのコンポーネントテキスト
3. **ブログ記事翻訳**：初回対応時に21記事を8言語へ翻訳（168ファイル生成）

### URL 設計

Astro の `prefixDefaultLocale: false` を採用し、日本語はルート直下（`/blog/...`）、他言語はプレフィックス付き（`/en/blog/...`、`/zh-cn/blog/...` 等）で配信します。

```
# 日本語（デフォルト）
/blog/astro-performance-tuning/

# 英語
/en/blog/astro-performance-tuning/

# 簡体字中国語
/zh-cn/blog/astro-performance-tuning/
```

すべての言語で同じスラッグを使用するため、言語切り替え時の URL 対応がシンプルです。

翻訳運用を継続するための Copilot 自動化は、[Sveltia CMSで多言語ブログを運用する方法](/blog/copilot-translation-pipeline/)にまとめています。

## i18n 基盤の実装

### Astro の i18n 設定

`astro.config.mjs` に i18n ルーティングを設定します。

```javascript
// astro.config.mjs
export default defineConfig({
  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en', 'zh-cn', 'es', 'pt', 'fr', 'ko', 'de', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
})
```

### 翻訳ユーティリティ

`src/i18n/` に設定ファイル・ユーティリティ関数・翻訳 JSON を集約しました。

```typescript
// src/i18n/utils.ts
export function t(locale: Locale, key: string): string {
  return translations[locale]?.[key] ?? translations[defaultLocale][key] ?? key
}
```

各言語の翻訳ファイルは JSON 形式で `src/i18n/locales/` に配置しています。ナビゲーション、フッター、ブログ UI、メタ情報など約100キーを管理しています。

### View コンポーネントパターン

ページの実装は **View コンポーネントパターン** を採用しています。レイアウトとロジックを `src/views/` に集約し、ルートファイル（`src/pages/`）は locale を渡すだけの薄いラッパーにします。

```astro
---
// src/pages/[locale]/about.astro（ルートファイル）
import AboutPage from '../../views/AboutPage.astro'
const { locale } = Astro.params
---

<AboutPage locale={locale} />
```

この設計により、日本語用ルート（`/about`）と多言語ルート（`/en/about`）でロジックの重複がゼロになります。

## ブログ記事のコンテンツ多言語化

### ディレクトリ構造

翻訳記事は言語コードのサブディレクトリに配置します。Astro の glob ローダーが `**/*.md` パターンで自動的に再帰検出します。

```
src/content/blog/
  astro-performance-tuning.md          # 日本語（ベース）
  website-renewal.md
  en/
    astro-performance-tuning.md        # 英語版
    website-renewal.md
  zh-cn/
    astro-performance-tuning.md        # 簡体字中国語版
    website-renewal.md
  es/
    ...
```

### コンテンツ解決ユーティリティ

`src/utils/blog-i18n.ts` に3つの関数を実装しました。

```typescript
// ベース記事かどうかを判定（IDにスラッシュが無い = ベース）
export function isBasePost(post: CollectionEntry<'blog'>): boolean {
  return !post.id.includes('/')
}

// IDからロケールプレフィックスを除去してベーススラッグを取得
export function getBaseSlug(postId: string): string {
  const idx = postId.indexOf('/')
  return idx !== -1 ? postId.slice(idx + 1) : postId
}

// ベース記事のローカライズ版を取得（無ければ原文にフォールバック）
export function localizePost(
  post: CollectionEntry<'blog'>,
  allPosts: CollectionEntry<'blog'>[],
  locale: Locale,
): CollectionEntry<'blog'> {
  if (locale === defaultLocale) return post
  return allPosts.find((p) => p.id === `${locale}/${post.id}`) ?? post
}
```

`localizePost()` 自体は安全策として原文を返しますが、公開ルートと一覧は `isPostAvailableInLocale()` とフィルターで実在する翻訳だけを対象にするため、未翻訳ロケールの記事URLは生成されません。

ポイントは **既存のコンテンツコレクションスキーマを変更しない** ことです。Astro の glob ローダーがサブディレクトリのファイルを `en/astro-performance-tuning` のような ID で自動的に認識するため、設定変更は不要でした。

### 翻訳ファイルのルール

翻訳ファイルは以下のルールで生成しました。

- **フロントマターのキー**は英語のまま（`title`, `description`, `date` 等）
- **タグ値**は日本語のまま保持（`['技術', 'Astro']` 等）
- **URL・画像パス・コードブロック・HTML**は変更しない
- **日付・著者**は変更しない
- **本文とフロントマターのテキスト値**（title, description, callout, FAQ 等）を翻訳

### 翻訳ワークフロー

翻訳の流れは以下の通りです。

1. **中間言語として英語版を作成**：日本語の原文から英語に翻訳
2. **英語版から各言語に翻訳**：英語を起点に7言語に展開
3. **一括バッチ処理**：GitHub Copilot で5〜6記事ずつバッチ処理

日本語→英語→各言語の2段階翻訳にすることで、翻訳品質のばらつきを抑えています。直接日本語から各言語に翻訳するよりも、英語という中間言語を挟むほうが安定した品質が得られました。

## View コンポーネントの多言語対応

### BlogPostPage の実装

ブログ記事ページでは、`localizePost()` でロケール版のコンテンツを取得し、テンプレート変数に代入します。

```astro
---
// src/views/BlogPostPage.astro
const localizedPost = localizePost(basePost, allPosts, locale)
const post = localizedPost // テンプレートの既存参照がそのまま動く
---
```

このアプローチにより、テンプレート内の `post.data.title` や `post.body` への参照を一切変更せずに多言語対応できました。

### 一覧ページの対応

ブログ一覧・タグ一覧・著者一覧・アーカイブページでは、`isBasePost()` でベース記事のみをフィルタリングし、表示時に `localizePost()` で翻訳版に差し替えます。

```astro
---
const allPosts = await getCollection('blog')
const basePosts = allPosts.filter(isBasePost)
const displayPosts = basePosts.map((p) => localizePost(p, allPosts, locale))
---
```

## ビルド時の注意点

### YAML フロントマターのエスケープ

フランス語の翻訳でアポストロフィ（`l'atelier`、`qu'on` 等）がYAML のシングルクォートと衝突する問題が発生しました。

```yaml
# NG：YAML パースエラー
title: 'Le métavers est plus proche qu'on ne le pense'

# OK：ダブルクォートに変更
title: "Le métavers est plus proche qu'on ne le pense"
```

Node.js スクリプトで全ファイルを一括修正しました。英語の `Acecore's` なども同様の問題があるため、翻訳ファイル生成時にはクォートの種類に注意が必要です。

### OG 画像ルートのフィルタリング

`/blog/og/[slug].png.ts` が翻訳記事のスラッグ（`en/aceserver-hijacked` 等）も拾ってしまい、パラメータエラーが発生しました。`isBasePost()` でフィルタリングして解決しています。

```typescript
export const getStaticPaths: GetStaticPaths = async () => {
  const allPosts = await getCollection('blog')
  const posts = allPosts.filter(isBasePost)
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { title: post.data.title },
  }))
}
```

## Pages CMS の多言語対応

Pages CMS（`.pages.yml`）は `path` で指定したディレクトリ直下のファイルのみを対象にするため、翻訳用のサブディレクトリは個別のコレクションとして登録しました。

```yaml
content:
  - name: blog
    label: ブログ（日本語）
    path: src/content/blog
  - name: blog-en
    label: Blog（English）
    path: src/content/blog/en
  - name: blog-zh-cn
    label: 博客（简体中文）
    path: src/content/blog/zh-cn
  # ... 各言語ごとに設定
```

ラベルを各言語で表記することで、CMS 上でどのコレクションがどの言語かひと目で分かるようにしています。

## 言語切り替え UI

ヘッダーに `LanguageSwitcher` コンポーネントを追加し、デスクトップ・モバイル両対応の言語切り替え UI を実装しています。言語切り替え時は同じページの対応ロケールに遷移し、初回訪問時にはブラウザの `navigator.language` を検出して自動リダイレクトする仕組みです。

## タグの多言語表示

記事のタグはURL上は日本語のスラッグをそのまま使用し、**表示名のみ翻訳**する方式を採用しました。これにより、ルーティングの複雑化を避けつつ、ユーザーには母国語でタグが表示されます。

タグ定義は `src/content/tags/{tagId}.json` に集約し、各タグが `i18n.name` を持つ構成にしています。これにより、タグ翻訳の source of truth を翻訳 JSON ではなくタグ collection 側へ寄せられます。

```json
{
  "id": "technology",
  "name": "技術",
  "i18n": {
    "en": { "name": "Technology" },
    "fr": { "name": "Technologie" }
  }
}
```

記事カード・サイドバー・タグ一覧・記事詳細では tags collection を参照して表示名を切り替えており、タグの表示はすべてロケールに応じた言語で統一されています。

## 著者データの多言語対応

著者の名前、自己紹介（bio）、スキル一覧も言語ごとに切り替える仕組みを導入しました。`src/content/authors/{authorId}.json` に `i18n` フィールドを追加し、各言語の翻訳を保持します。

```json
{
  "id": "hatt",
  "name": "ハット",
  "bio": "代表取締役。Web制作・サーバー運用…",
  "skills": ["TypeScript", "Astro", "..."]
  "i18n": {
    "en": {
      "name": "Hatt",
      "bio": "CEO and representative director. Web development...",
      "skills": ["TypeScript", "Astro", "..."]
    }
  }
}
```

`getLocalizedAuthor()` ユーティリティで、ロケールに応じた著者情報を取得します。

```typescript
// src/utils/blog-i18n.ts
export function getLocalizedAuthor(author: Author, locale: Locale) {
  const localized = author.i18n?.[locale]
  return localized ? { ...author, ...localized } : author
}
```

## 多言語サイトの SEO 対策

多言語化の SEO メリットを最大化するため、検索エンジンが各言語版を正しく認識・インデックスするための仕組みを整備しました。

### サイトマップの hreflang 対応

`@astrojs/sitemap` の `i18n` オプションと、翻訳ファイルの存在を確認するフィルターを設定しています。サイトマップには実在する言語版だけを掲載し、対応する `xhtml:link rel="alternate"` タグを自動出力します。

```javascript
// astro.config.mjs
sitemap({
  filter(page) {
    return !isMissingLocalizedBlogPost(page)
  },
  i18n: {
    defaultLocale: 'ja',
    locales: {
      ja: 'ja',
      en: 'en',
      'zh-cn': 'zh-CN',
      es: 'es',
      pt: 'pt',
      fr: 'fr',
      ko: 'ko',
      de: 'de',
      ru: 'ru',
    },
  },
})
```

9言語すべてが存在する記事には9言語分の hreflang が出力されます。翻訳が無い記事は日本語URLだけを掲載し、存在しない言語版を sitemap や hreflang に含めません。

### JSON-LD 構造化データの言語対応

ブログ記事の `BlogPosting` 構造化データに `inLanguage` フィールドを追加し、各記事がどの言語で書かれているかを検索エンジンに伝えています。

```javascript
// BlogPostPage.astro（JSON-LD 抜粋）
{
  "@type": "BlogPosting",
  "inLanguage": htmlLangMap[locale],  // "ja", "en", "zh-CN" など
  "headline": post.data.title,
  // ...
}
```

### 多言語 RSS フィード

日本語版の `/rss.xml` に加え、各言語版の RSS フィード（`/en/rss.xml`、`/zh-cn/rss.xml` 等）を生成しています。フィードのタイトルや説明も各言語に翻訳し、`<language>` タグで BCP47 準拠の言語コードを出力しています。

```typescript
// src/pages/[locale]/rss.xml.ts
export const getStaticPaths = () =>
  locales
    .filter((l) => l !== defaultLocale)
    .map((l) => ({ params: { locale: l } }))
```

`BaseLayout.astro` の `<link rel="alternate" type="application/rss+xml">` もロケールに応じた RSS URL を自動設定しています。

## まとめ

現在使用している Astro 7.1.3 の組み込み i18n 機能を活用することで、静的サイトでも多言語対応を実現しています。

- **i18n 基盤**：Astro の `prefixDefaultLocale: false` で日本語はプレフィックスなし
- **UI 翻訳**：View コンポーネントパターンでロジック重複ゼロ
- **コンテンツ翻訳**：サブディレクトリ方式で既存スキーマに変更なし
- **タグ翻訳**：URL は日本語スラッグのまま、表示名のみ各言語に翻訳
- **著者データ翻訳**：bio・skills を言語ごとに切り替え
- **SEO 対策**：サイトマップ hreflang・JSON-LD `inLanguage`・多言語 RSS フィード
- **未翻訳ロケール**：記事URLは生成せず、日本語版は元のURLで公開を継続
- **CMS 対応**：Pages CMS で各言語の記事を個別に編集可能

今後は新しい記事を追加する際、翻訳ファイルも順次追加していく運用です。翻訳が完了するまでは日本語版だけを公開し、翻訳ファイルを追加したロケールから記事URL・sitemap・hreflangを有効にします。
