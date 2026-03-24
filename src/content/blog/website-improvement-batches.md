---
title: 'Acecore公式サイトを14段階で徹底改善 ― SEO・アクセシビリティ・パフォーマンスの全記録'
description: 'リニューアル後のAcecore公式サイトに対し、SEO・アクセシビリティ・パフォーマンス・UX・コード品質の5軸で150項目超の改善を実施しました。具体的な施策と成果をすべて公開します。'
date: 2026-03-24
author: gui
tags: ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO']
image: https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: この記事の対象読者
  text: 'Webサイトの品質改善に取り組んでいる方、Astro + UnoCSS の実践的な運用に興味がある方向けの内容です。具体的なコード変更は割愛し、改善の方針と成果に焦点を当てています。'
processFigure:
  title: 改善の全体フロー
  steps:
    - title: 監査
      description: Lighthouse・axe・手動チェックで課題を洗い出し。
      icon: i-lucide-search
    - title: 分類
      description: SEO・A11Y・Perf・UX・Code の5軸で優先度付け。
      icon: i-lucide-layers
    - title: 実装
      description: バッチごとにまとめて修正・ビルド検証。
      icon: i-lucide-code
    - title: 検証
      description: ビルド0エラー・PageSpeed再計測で品質を確認。
      icon: i-lucide-check-circle
compareTable:
  title: 改善前後の比較
  before:
    label: 改善前
    items:
      - OGP設定が不完全でSNSシェアが不十分
      - アクセシビリティ対応が未整備
      - View Transitions でスクリプトが動かなくなる
      - 重複データ取得でビルド時間が長い
      - コード内にany型やハードコード定数が散在
  after:
    label: 改善後
    items:
      - 構造化データ・OGP・canonical完備でSEO最適化
      - WCAG AA準拠のコントラスト・aria属性・SR通知・focus-visibleを徹底
      - astro:after-swapで全スクリプトが正常動作
      - getCollectionの一元化でビルド効率向上
      - 型安全・定数一元管理・ページネーション共通化でメンテナンス性向上
faq:
  title: よくある質問
  items:
    - question: 改善にどれくらい時間がかかりましたか？
      answer: 全14バッチの改善はGitHub Copilotと協働し、段階的に進めました。各バッチはテーマを絞って実施し、毎回ビルド検証を行っています。
    - question: PageSpeed Insightsのスコアは変わりましたか？
      answer: パフォーマンス最適化（AdSense遅延読み込み、画像最適化、不要なgetCollection呼び出し削除など）により、高スコアを維持しています。
    - question: アクセシビリティ対応は何を基準にしましたか？
      answer: WCAG 2.1 AA基準を目標に、コントラスト比4.5:1以上、aria属性の適切な付与、スクリーンリーダー通知、キーボード操作対応、focus-visibleスタイル、インラインリンクの常時下線化を実施しました。
    - question: この改善手法は他のAstroサイトにも適用できますか？
      answer: はい。View Transitionsのスクリプト対応、構造化データの実装、アクセシビリティ改善などはAstroサイト全般に共通するベストプラクティスです。
---

## はじめに

2026年3月にリニューアルした Acecore 公式サイトは、Astro 6 + UnoCSS + Cloudflare Pages の構成で公開しました。しかし、リニューアル直後のサイトはまだ「動く」レベル。SEO・アクセシビリティ・パフォーマンス・UX・コード品質の各軸で改善の余地が多くありました。

本記事では、リニューアル後に実施した**全14バッチ・150項目超の改善**を記録として公開します。

---

## Batch 1–3：基盤整備

最初の3バッチでは、サイトの基盤となる部分を整備しました。

### ページ構成の拡充

- **ブログ基盤**：記事一覧・個別記事・タグ別・著者別・アーカイブページの生成
- **ページネーション**：6記事ごとの自動ページ分割と省略記号付きナビゲーション
- **サイドバー**：タグ・アーカイブ・著者・最新記事のサイドバーウィジェット
- **404ページ**：検索ボタン・最新記事表示付きのカスタム404

### コンポーネントライブラリ

記事で使うコンポーネントを一通り整備しました。

- **Callout**：info / warning / tip / note の4種類の注釈
- **Timeline**：イベントの時系列表示
- **FAQ**：構造化データ対応の質問回答
- **Gallery**：Lightbox付き画像ギャラリー
- **CompareTable / ProcessFigure**：比較表・プロセスフロー図
- **LinkCard**：OGP風の外部リンクカード
- **YouTubeEmbed**：ファサードパターンによる遅延読み込み

---

## Batch 4–5：検索・広告・リッチコンテンツ

### Pagefind 全文検索

静的サイト向け検索エンジン Pagefind を導入し、以下の機能を実装しました。

- **フィルタ（著者・年・タグ）**：`data-pagefind-filter`による3軸のファセット検索
- **検索モーダル**：`Ctrl+K`ショートカットで開くモーダルUI
- **ゼロ結果時の導線**：検索結果が0件のとき、記事一覧・サービス・お問い合わせへの案内を表示
- **SearchAction構造化データ**：Googleの検索ボックスからサイト検索を実行可能に

### Google AdSense 統合

記事ページに3か所の広告ユニットを配置し、遅延読み込みで PageSpeed への影響を最小化しました。

---

## Batch 6–7：SEO・パフォーマンス基盤強化

### 構造化データ

- **Organization**：会社名・URL・ロゴ・連絡先
- **WebSite + SearchAction**：サイト検索
- **BreadcrumbList**：全ページの階層パンくず
- **BlogPosting**：著者・公開日・更新日・画像
- **FAQPage**：FAQ付き記事の構造化データ

### OGP・メタタグ

- `og:title` / `og:description` / `og:image` の適切な設定
- `twitter:card` = `summary_large_image` 対応
- `article:published_time` / `article:modified_time` / `article:tag`
- `rel="canonical"` / `rel="prev"` / `rel="next"`

### パフォーマンス

- **フォントのセルフホスト**：`@fontsource-variable/noto-sans-jp`
- **wsrv.nl画像最適化**：自動WebP変換、品質・サイズパラメータ
- **AdSense/GA4の遅延読み込み**：`requestIdleCallback` による非同期注入
- **robots.txt**：`/pagefind/` ディレクトリをクロール除外

---

## Batch 8：アクセシビリティ・UX大規模改善

Batch 8 では、サイト全体のアクセシビリティとユーザー体験を集中的に改善しました。

### View Transitions スクリプト問題の解消

Astro の ClientRouter（View Transitions）を使うと、ページ遷移後にスクリプトが再実行されない問題がありました。ヘッダーのハンバーガーメニュー、検索ボタン、ヒーロー画像の切り替えなど、サイト全体のインタラクションが影響を受けました。

**解決策**：すべてのスクリプトを名前付き関数に包み、`document.addEventListener('astro:after-swap', initFunction)` で再登録するパターンに統一しました。

### アクセシビリティ対応

- **装飾アイコン全件に `aria-hidden="true"`**：30か所以上のアイコン要素に付与
- **外部リンクのSR通知**：`<span class="sr-only">（新しいタブで開きます）</span>` を全外部リンクに追加
- **フォームのインライン検証**：blur/inputイベントで即座にエラー表示、`aria-invalid` / `aria-describedby` 連携
- **必須マークのSR対応**：`aria-hidden="true"` + `<span class="sr-only">（必須）</span>`

### UX改善

- **目次のスクロール**：長い目次が画面外に見切れないよう `max-h-[calc(100vh-6rem)] overflow-y-auto` を設定
- **ページネーションの省略記号**：`1 2 ... 9 10` パターンで大量ページに対応
- **プライバシーポリシーの最終更新日**：制定日と更新日を明記
- **サービスページのスクロールスパイ**：IntersectionObserver でナビゲーションのアクティブ項目を自動追従

### コード品質

- **SITE定数の一元管理**：`src/data/site.ts` に電話番号・メール・LINE・SNSを集約
- **型安全性**：`any[]` → `CollectionEntry<'blog'>[]`
- **CTAの条件分岐リファクタ**：ネストした三項演算子から配列 + `find()` パターンへ

---

## Batch 9：最終仕上げ

最終バッチでは、監査で発見された残りの課題と、ユーザー体験の細部を改善しました。

### 目次の自動スクロール

コンテンツをスクロールすると、サイドバーの目次も自動的に追従するようになりました。`scrollIntoView({ block: 'nearest', behavior: 'smooth' })` で、アクティブな見出しが常に目次内に見えるようにしています。

### 著者リンク

記事内の著者名が、その著者の記事一覧ページへのリンクに変わりました。「この人の他の記事も読みたい」という読者の導線を確保しています。

### YouTube埋め込みの操作修正

ファサードパターンで遅延読み込みしたYouTube動画が、再生後に停止・シークなどの操作ができない問題を修正しました。

### SEO

- **og:title修正**：ホームページで「ホーム」ではなく「Acecore | システム開発・Web制作・IT教育」を表示
- **SearchAction実行対応**：`?q=`パラメータで検索モーダルが自動で開き、検索を実行
- **ブログヒーロー画像のalt修正**：ストック写真に `alt=""` + `role="presentation"` を設定

### アクセシビリティ

- **テキストコントラスト修正**：`text-slate-400`（コントラスト比3:1）→ `text-slate-500`（4.6:1）でWCAG AA準拠
- **StatBar・Calloutの装飾アイコン**に `aria-hidden="true"` を追加
- **ServiceCardの外部リンク**にスクリーンリーダー通知を追加
- **ページネーション**の現在ページに `aria-current="page"` を追加

### パフォーマンス・コード品質

- **getCollection二重呼び出し削除**：ページネーションページで `props` 経由に統一
- **未使用の `define:vars` 除去**：AdSenseスクリプトから不要な変数束縛を削除
- **`any`型の排除**：`CollectionEntry<'blog'>` に型指定
- **`image` / `imageUrl` フィールド統合**：スキーマとMarkdown全件を `image` に統一し、分岐コードを解消
- **送信ボタンのdisabled表示**：`opacity-50 cursor-not-allowed` で送信中の視覚フィードバック

---

## Batch 10：全体監査・最終仕上げ

Batch 10 では全ファイルを監査し、見落としていた課題を一掃しました。

### カードUIの修正

ブログ一覧のカードが HTML のネストされた `<a>` タグによりレイアウトが崩れていた問題を修正。stretched-link パターンに変更し、カード全体がクリック可能なまま著者リンクも独立して機能するようにしました。

### アクセシビリティ

- **focus-visibleスタイルの全体追加**：WCAG 2.4.7準拠。`ac-btn` ショートカットに `focus-visible:ring` を追加し、コピーボタン・スクロールトップ・アンカー広告のクローズボタンにも個別に追加
- **インラインリンクの常時下線化**：PageSpeedの「リンクは色に依存して識別可能」指摘に対応。ホバー時のみだった下線を常時表示に変更し、UnoCSSの `ac-link` ショートカットとして統一
- **著者アバター画像**に `width` / `height` / `decoding` 属性を追加

### パフォーマンス

- **SplitContentの画像**に `width="800" height="450"` を追加しCLSを解消
- **rehypeプラグイン**の width/height を文字列から数値に修正
- **sitemap設定**に `changefreq` / `priority` / `lastmod` を追加

### コード品質

- **Clipboard API**の `try-catch` 追加（権限拒否・HTTP環境でのエラー対応）
- **AdSenseのエラーログ**：空の catch 節に `console.warn` を追加
- **Heroスライダー**のマジックナンバーを `SLIDE_INTERVAL` / `SWIPE_THRESHOLD` 定数に抽出
- **SplitContentの型定義**：`[k: string]: any` を `Visual` インターフェースに改善
- **トップページの画像alt**：空の alt 属性に記事タイトルを設定

---

## Batch 11 ― PageSpeed 100点・ID一元管理・パフォーマンス最適化

Batch 10でSEO・アクセシビリティ・ベストプラクティスは100点を達成していましたが、モバイルのパフォーマンスだけ99点でした。Batch 11ではこの1点を詰めるとともに、コード品質とパフォーマンスの両面で一括改善を行いました。

### パフォーマンス

- **CSSインライン化**：`build.inlineStylesheets: 'always'` を設定し、レンダリングをブロックしていたCSS外部ファイル（46.7 KiB）を解消 → モバイルパフォーマンス100点
- **getCollection二重呼び出し解消**：タグ・アーカイブ・著者ページで `getStaticPaths` と本文で個別に呼んでいた `getCollection('blog')` を1回にまとめ、propsで渡す形式に統一
- **Galleryアスペクト比修正**：`width="400" height="300"`（4:3）を `height="225"`（16:9）に修正し、`aspect-video` クラスとの不一致を解消

### SEO

- **パンくずリスト中間セグメント**：`tags` / `authors` / `archive` / `page` の名前マッピングを追加
- **パンくず中間URL制御**：存在しない中間パスへのリンクを抑制し、実在ルートのみ `item` プロパティを出力
- **ヒーロー画像alt属性**：空の `alt=""` から記事タイトルに変更し、`role="presentation"` を除去
- **RSS著者情報**：フィードの `items` に `author` フィールドを追加

### アクセシビリティ

- **画像のwidth/height明示**：BlogSidebar（32×32px）、記事サイドバー（48×48px）、モバイル著者（64×64px）、YouTubeサムネイル（480×360px）に追加しCLSを改善
- **チェックリストSR対応**：完了/未完了の状態をスクリーンリーダー向け `sr-only` テキストで表示
- **コピーボタンaria-label更新**：成功時に「コピーしました」へ変更し、状態変化を通知

### コード品質

- **AdSense Client ID一元管理**：4ファイルにハードコードされていた `ca-pub-*` IDを `SITE.adsenseClientId` に集約
- **GA4 ID一元管理**：BaseLayout内2箇所の `G-G79SGTMYEX` を `SITE.ga4Id` に集約（`set:html` テンプレート方式）
- **rehype-inject-ads型安全化**：`parent: any` を `Parent`（unist型）に置き換え、`Element` 型キャストを追加
- **タグページカード統一**：カスタムHTMLから `BlogPostCard` コンポーネントに統一
- **ShareButtonsのnull安全**：`querySelector('span')!` の非nullアサーションをオプショナルチェーンに変更

### UX

- **404ページボタン統一**：手動クラス指定を `ac-btn-outline` ショートカットに統一
- **検索モーダル広告リセット**：View Transition時の `data-pushed` 属性を初期化し、広告が重複表示されないよう制御
- **サイドバー著者リンク**：記事詳細ページのデスクトップ・モバイル両方の著者名から著者別記事一覧へリンク

---

## Batch 12：PageSpeed改善・アクセシビリティ強化・構造化データ拡充

Batch 11 まで全項目100点だったPageSpeedモバイルが98点に低下。LCP 2.4s が主因と判明し、ヒーロー画像の `<link rel="preload">` 追加で対処しました。さらに、アクセシビリティ・SEO・コード品質を13項目にわたり改善しています。

### パフォーマンス

- **ヒーロー画像preload**：LCP要素（Heroスライダー第1画像）のResource Load Delayを解消するため、BaseLayoutに `preloadImage` propsを追加し、トップページから `<link rel="preload" as="image">` を出力
- **コンテンツ画像srcset**：about / services / schools の各ページ画像に `srcset` と `sizes` を追加し、画面幅に応じた最適サイズを配信

### アクセシビリティ

- **figure要素のrole修正**：InsightGrid・ProcessFigure・Timelineのインライン表示で `role="img"`（子要素をSRから隠す）を `role="group"` に変更し、内部コンテンツをアクセシブルに
- **Heroスライダーaria-live**：スライド切替時に `aria-live="polite"` 領域で「スライド 1 / 4: 〇〇」と通知し、スクリーンリーダーで操作状況を把握可能に
- **Header navラベル**：デスクトップ・モバイル両方の `<nav>` に `aria-label` を追加し、ナビゲーションランドマークを識別可能に
- **日付のtime要素**：プライバシーポリシーの制定日・更新日を `<time datetime="...">` で機械可読に

### SEO

- **WebPage JSON-LD**：トップページに `WebPage` 構造化データを追加
- **ContactPage JSON-LD**：お問い合わせページに `ContactPage` 構造化データを追加
- **Organization JSON-LD強化**：会社概要ページに `knowsAbout` フィールドを含む詳細な `Organization` 構造化データを追加

### UX

- **scroll-margin-top**：UnoCSS preflightに `[id] { scroll-margin-top: 5rem }` と `html { scroll-behavior: smooth }` を追加し、スティッキーヘッダーでのアンカーリンクずれを解消

### コード品質

- **ToC Observer二重登録解消**：`blog/[...slug].astro` の `initTocScroll` を削除し、`TableOfContents.astro` の `initTocHighlight` に一本化
- **content.configスキーマ補完**：`processFigure` と `insightGrid` に `eyebrow` / `description` / `variant` フィールドを追加し、コンポーネント側と整合
- **var宣言の排除**：contact.astroの3つのインラインスクリプトで `var` を `const` に置き換え

---

## Batch 13：型安全性・SEO・アクセシビリティ・コード品質の総仕上げ

Batch 13 では、TypeScriptの型エラー一掃、SEOメタデータの拡充、アクセシビリティの補完、コード品質の統一を一括で実施しました。

### バグ修正

- **YouTubeEmbed**：View Transitions環境で`astro:after-swap`から`astro:page-load`に変更し、初回読み込み含め確実にスクリプトが動作するよう修正

### アクセシビリティ

- **検索モーダル**：`<dialog>`に`aria-labelledby`を追加し、スクリーンリーダーがタイトルを読み上げるよう改善
- **シェアボタン**：X（Twitter）とはてなブックマークの外部リンクにスクリーンリーダー向け「（新しいタブで開きます）」テキストを追加
- **リスト要素のrole属性**：パンくず・サイドバー・フッターの`<ol>`/`<ul>`に`role="list"`を追加し、CSSで`list-style: none`を設定してもSRがリストとして認識するよう対応
- **Callout**：`<aside>`に`role="note"`を追加

### SEO

- **RSSカテゴリ**：RSSフィードの各記事に`categories`（タグ情報）を追加し、RSSリーダーでの分類を改善
- **Sitemapの優先度制御**：`serialize()`関数でページ種別ごとに`changefreq`/`priority`を設定（トップページ: daily/1.0、ブログ: weekly/0.8、その他: monthly/0.6）
- **article:section**：ブログ記事のOGPに`article:section`メタタグを追加し、コンテンツカテゴリを明示

### コード品質

- **ページネーション共通化**：`POSTS_PER_PAGE`と`buildPageNumbers()`を`src/utils/pagination.ts`に抽出し、blog/index・blog/page/[page]間の重複を解消
- **広告スロットID一元管理**：4ファイルにハードコードされた広告スロットIDを`SITE.adSlotId`に集約
- **TypeScript型エラー一掃**：`as const`アサーション、`readonly`配列型、コンテンツスキーマのリテラル型ユニオンにより20件以上の型エラーを解消

### パフォーマンス

- **Pagefindキャッシュ**：`/pagefind/*`にCache-Controlヘッダー（`max-age=604800, stale-while-revalidate=86400`）を追加し、検索インデックスの再取得を抑制

### UX

- **ページネーション前後リンク**：「← 前へ」「次へ →」テキストリンクを追加し、ページ番号だけでなくテキストでの直感的なナビゲーションを実現

---

## Batch 14：PageSpeed分析・レスポンシブ画像・コード品質の徹底

Batch 14 では、PageSpeed Insights の詳細分析をもとに画像配信の最適化を進め、インラインイベントハンドラの排除とソーシャルURLの一元管理で保守性を向上させました。

### パフォーマンス

- **画像品質の最適化**：wsrv.nl プロキシの品質パラメータを `q=60` → `q=50` に引き下げ。AVIF/WebP の `output=auto` と組み合わせ、約10%のファイルサイズ削減を実現
- **srcsetの拡充**：デフォルトのsrcset幅に `480w` を追加（`[640, 960, 1280, 1600]` → `[480, 640, 960, 1280, 1600]`）し、モバイル向けの適切な画像サイズを提供
- **ブログカード画像のレスポンシブ化**：トップページ・BlogPostCard・blog/[...slug].astro のブログカード画像に `srcset` + `sizes` を追加
- **ブログ記事ヒーロー画像のレスポンシブ化**：記事詳細ページのメイン画像に `srcset` + `sizes` を追加し、LCP改善に寄与
- **acestudio.astro・Gallery.astro のレスポンシブ画像**：クリエイティブ作品画像とギャラリー画像にカラム数を考慮した `sizes` 属性を設定

### セキュリティ・コード品質

- **インラインonclick排除**：Header.astro（2箇所）と404.astroの `onclick="window.openSearch?.()"` を `data-search-trigger` 属性 + `addEventListener` に置換。CSPのインラインスクリプト依存を軽減
- **UnoCSS非推奨API移行**：`presetUno()` → `presetWind3()` に移行し、UnoCSS v66 の非推奨警告を解消
- **Zodインポート移行**：`import { z } from 'astro:content'` → `import { z } from 'astro/zod'` に変更し、Astro 7 で削除予定の非推奨インポートを解消
- **ソーシャルURL一元管理**：X・GitHub・Aceserver・Discord の4つのURLを `SITE.social.*` に集約し、Footer・BaseLayout・about・services・acestudio・index の計17箇所からハードコードを排除

---

## 改善の成果

| 指標                  | 改善前              | 改善後                                                                                       |
| --------------------- | ------------------- | -------------------------------------------------------------------------------------------- |
| 総ページ数            | 1ページ             | 55ページ以上                                                                                 |
| PageSpeed（モバイル） | 未測定              | 全項目98点以上（SEO・A11Y・ベストプラクティス100点）                                         |
| 構造化データ          | なし                | Organization / BreadcrumbList / BlogPosting / FAQPage / SearchAction / WebPage / ContactPage |
| アクセシビリティ      | 未対応              | WCAG AA準拠（コントラスト・aria・SR通知・キーボード操作）                                    |
| 全文検索              | なし                | Pagefind（3軸フィルタ・ゼロ結果導線・SearchAction連携）                                      |
| View Transitions      | スクリプト不動作    | 全コンポーネント正常動作                                                                     |
| コード品質            | any型・ハードコード | 型安全・定数一元管理・ページネーション共通化・ソーシャルURL集約                              |

---

## まとめ

リニューアル後のサイトに対して14バッチにわたる改善を実施し、SEO・アクセシビリティ・パフォーマンス・UX・コード品質のすべてを底上げしました。

特に重要だったのは以下の3点です。

1. **View Transitions対応**：Astroの `astro:after-swap` イベントを活用し、全スクリプトをページ遷移に対応させたこと
2. **アクセシビリティの体系的改善**：装飾アイコン・外部リンク・フォーム・コントラストなど、見落としがちな要素を網羅的に対処したこと
3. **データモデルの整理**：SITE定数の一元管理やスキーマフィールドの統一により、将来のメンテナンスコストを大幅に削減したこと

Webサイトの品質改善は一度で終わるものではありません。今後も監査と改善のサイクルを回し続けていきます。

改善の詳細やコードへの反映については、[GitHub Copilotを使った開発フロー](/blog/tax-return-with-copilot/)も合わせてご覧ください。
