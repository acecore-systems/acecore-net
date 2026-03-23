---
title: 'Acecore公式サイトを10段階で徹底改善 ― SEO・アクセシビリティ・パフォーマンスの全記録'
description: 'リニューアル後のAcecore公式サイトに対し、SEO・アクセシビリティ・パフォーマンス・UX・コード品質の5軸で100項目超の改善を実施しました。具体的な施策と成果をすべて公開します。'
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
      - 型安全・定数一元管理でメンテナンス性向上
faq:
  title: よくある質問
  items:
    - question: 改善にどれくらい時間がかかりましたか？
      answer: 全10バッチの改善はGitHub Copilotと協働し、段階的に進めました。各バッチはテーマを絞って実施し、毎回ビルド検証を行っています。
    - question: PageSpeed Insightsのスコアは変わりましたか？
      answer: パフォーマンス最適化（AdSense遅延読み込み、画像最適化、不要なgetCollection呼び出し削除など）により、高スコアを維持しています。
    - question: アクセシビリティ対応は何を基準にしましたか？
      answer: WCAG 2.1 AA基準を目標に、コントラスト比4.5:1以上、aria属性の適切な付与、スクリーンリーダー通知、キーボード操作対応、focus-visibleスタイル、インラインリンクの常時下線化を実施しました。
    - question: この改善手法は他のAstroサイトにも適用できますか？
      answer: はい。View Transitionsのスクリプト対応、構造化データの実装、アクセシビリティ改善などはAstroサイト全般に共通するベストプラクティスです。
---

## はじめに

2026年3月にリニューアルした Acecore 公式サイトは、Astro 6 + UnoCSS + Cloudflare Pages の構成で公開しました。しかし、リニューアル直後のサイトはまだ「動く」レベル。SEO・アクセシビリティ・パフォーマンス・UX・コード品質の各軸で改善の余地が多くありました。

本記事では、リニューアル後に実施した**全10バッチ・100項目超の改善**を記録として公開します。

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

## 改善の成果

| 指標 | 改善前 | 改善後 |
|------|--------|--------|
| 総ページ数 | 1ページ | 50ページ以上 |
| 構造化データ | なし | Organization / BreadcrumbList / BlogPosting / FAQPage / SearchAction |
| アクセシビリティ | 未対応 | WCAG AA準拠（コントラスト・aria・SR通知・キーボード操作） |
| 全文検索 | なし | Pagefind（3軸フィルタ・ゼロ結果導線・SearchAction連携） |
| View Transitions | スクリプト不動作 | 全コンポーネント正常動作 |
| コード品質 | any型・ハードコード | 型安全・定数一元管理・スキーマ統一 |

---

## まとめ

リニューアル後のサイトに対して10バッチにわたる改善を実施し、SEO・アクセシビリティ・パフォーマンス・UX・コード品質のすべてを底上げしました。

特に重要だったのは以下の3点です。

1. **View Transitions対応**：Astroの `astro:after-swap` イベントを活用し、全スクリプトをページ遷移に対応させたこと
2. **アクセシビリティの体系的改善**：装飾アイコン・外部リンク・フォーム・コントラストなど、見落としがちな要素を網羅的に対処したこと
3. **データモデルの整理**：SITE定数の一元管理やスキーマフィールドの統一により、将来のメンテナンスコストを大幅に削減したこと

Webサイトの品質改善は一度で終わるものではありません。今後も監査と改善のサイクルを回し続けていきます。

改善の詳細やコードへの反映については、[GitHub Copilotを使った開発フロー](/blog/tax-return-with-copilot/)も合わせてご覧ください。
