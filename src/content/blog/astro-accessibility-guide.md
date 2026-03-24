---
title: 'AstroサイトのアクセシビリティをWCAG AA準拠にする実践ガイド'
description: 'Astro + UnoCSS 構成のサイトで実施したアクセシビリティ改善の全手順を紹介します。aria属性・コントラスト・フォーカス管理・フォーム検証・スクリーンリーダー対応など、WCAG AA準拠に必要な施策を網羅しています。'
date: 2026-03-25
author: gui
tags: ['技術', 'Astro', 'アクセシビリティ']
image: https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: アクセシビリティ対応は「全員のためのUX改善」
  text: 'アクセシビリティは障害者のためだけのものではありません。キーボード操作、コントラスト、フォーカス表示はすべてのユーザーの使いやすさに直結します。やればやるほどサイト全体の品質が上がる投資です。'
processFigure:
  title: アクセシビリティ改善の進め方
  steps:
    - title: 自動検査
      description: axe DevTools・Lighthouse で機械的に検出できる問題を洗い出す。
      icon: i-lucide-scan
    - title: 手動検査
      description: キーボード操作・スクリーンリーダーで実際に使ってみる。
      icon: i-lucide-hand
    - title: 修正
      description: aria属性の付与・コントラスト修正・フォーカススタイルの追加。
      icon: i-lucide-wrench
    - title: 再検査
      description: PageSpeed の Accessibility スコアで100点を確認。
      icon: i-lucide-check-circle
checklist:
  title: WCAG AA 準拠チェックリスト
  items:
    - text: テキストのコントラスト比が4.5:1以上（大文字は3:1以上）
      checked: true
    - text: すべてのインタラクティブ要素にfocus-visibleスタイルがある
      checked: true
    - text: 装飾アイコンにaria-hidden="true"が付与されている
      checked: true
    - text: 外部リンクにスクリーンリーダー向け通知がある
      checked: true
    - text: フォームにインライン検証とaria-invalid連携がある
      checked: true
    - text: 画像にwidth/height属性がある（CLS防止）
      checked: true
    - text: リスト要素にrole="list"がある（list-style:none対策）
      checked: true
faq:
  title: よくある質問
  items:
    - question: axe DevToolsとLighthouseの違いは何ですか？
      answer: 'Lighthouseはパフォーマンス・SEOも含む総合監査ツールで、アクセシビリティは一部の項目のみチェックします。axe DevToolsはアクセシビリティに特化し、より多くのルールで詳細に検査します。両方を併用するのがおすすめです。'
    - question: aria属性はすべての要素に付けるべきですか？
      answer: 'いいえ。HTMLのセマンティクスが正しければariaは不要です。aria属性は「HTMLだけでは伝わらない情報」を補うためのもので、過剰に付けるとかえってスクリーンリーダーの読み上げが冗長になります。'
    - question: PageSpeedのAccessibilityが100点ならWCAG準拠ですか？
      answer: '100点でもWCAG完全準拠とは言い切れません。Lighthouseはチェック項目が限られており、手動でしか確認できない基準（論理的な読み上げ順序、適切なalt文言など）があります。自動テスト＋手動テストの両方が必要です。'
---

## はじめに

「アクセシビリティ対応」と聞くと、後回しにしがちな項目かもしれません。しかし実際に取り組んでみると、コントラスト・キーボード操作・フォーカス表示の改善はすべてのユーザーにとっての使いやすさ向上に直結します。

この記事では、Astro + UnoCSS サイトで PageSpeed Accessibility 100点を達成するために行った改善を、カテゴリ別に紹介します。

---

## 装飾アイコンのaria-hidden

UnoCSS の Iconify アイコン（`i-lucide-*`）は視覚的な装飾として使われることが多いですが、スクリーンリーダーが読み上げてしまうと「画像」「不明な画像」のように通知され、かえって混乱を招きます。

### 対処法

装飾目的のアイコンには `aria-hidden="true"` を付与します。

```html
<span class="i-lucide-mail" aria-hidden="true"></span>
お問い合わせ
```

サイト全体で30か所以上のアイコンにこの対応を実施しました。StatBar・Callout・ServiceCard・ProcessFigure など、コンポーネント内のアイコンも見落としがちなので注意が必要です。

---

## 外部リンクのスクリーンリーダー通知

`target="_blank"` で開く外部リンクは、視覚的には別タブで開くことが分かりますが、スクリーンリーダーのユーザーには伝わりません。

### 対処法

外部リンクに視覚的には非表示の補足テキストを追加します。

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  Example
  <span class="sr-only">（新しいタブで開きます）</span>
</a>
```

`rehype-external-links` プラグインを使えば、Markdown内の外部リンクにも自動で `target="_blank"` と `rel` を付与できます。SR通知テキストの追加はテンプレート側で行います。

---

## コントラストの確保

PageSpeed Insights の指摘で最もよく出るのがコントラスト不足です。

### よくある問題

UnoCSS のカラーパレットで `text-slate-400` を使うと、白背景に対してコントラスト比が約3:1になり、WCAG AAの4.5:1基準を満たしません。

### 対処法

`text-slate-400` → `text-slate-500`（コントラスト比4.6:1）に変更することで基準をクリアします。日付やキャプションなどの補助テキストに使いがちなので、サイト全体で確認しましょう。

---

## focus-visibleスタイル

キーボードでサイトを操作するユーザーにとって、フォーカスインジケーターは「今どこにいるか」を知る唯一の手がかりです。WCAG 2.4.7ではフォーカス表示が要求されています。

### UnoCSS での実装

ボタンやリンクに共通のフォーカススタイルを設定します。UnoCSS のショートカット機能を使えば、1箇所の定義で全体に適用できます。

```typescript
shortcuts: {
  'ac-btn': '... focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:outline-none',
}
```

`focus-visible` は、マウスクリック時にはリングを表示せず、キーボード操作時のみ表示する疑似クラスです。`focus` よりもUXが良いため、こちらを使いましょう。

### 忘れがちな要素

- コピーボタン
- スクロールトップボタン
- アンカー広告のクローズボタン
- モーダルの閉じるボタン

---

## インラインリンクの下線

PageSpeed には「リンクが色だけで識別可能」という指摘があります。色覚に制約のあるユーザーがリンクを見分けられない問題です。

### 対処法

ホバー時のみだった下線を常時表示にします。UnoCSS のショートカットで統一するのがおすすめです。

```typescript
shortcuts: {
  'ac-link': 'underline decoration-brand-300 underline-offset-2 hover:decoration-brand-500 transition-colors',
}
```

---

## フォームのアクセシビリティ

お問い合わせフォームなど、ユーザーが入力する場面ではアクセシビリティが特に重要になります。

### インライン検証

`blur` / `input` イベントで即座にエラーメッセージを表示し、以下のaria属性を連携させます。

- `aria-invalid="true"` ― 入力が無効であることを通知
- `aria-describedby` ― エラーメッセージのIDを参照

```html
<input
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<p id="email-error" role="alert">有効なメールアドレスを入力してください</p>
```

### 必須項目のマーク

視覚的な `*` マークだけでは不十分です。スクリーンリーダー向けの補足テキストを追加します。

```html
<span aria-hidden="true">*</span>
<span class="sr-only">（必須）</span>
```

---

## figure要素のrole属性

`<figure>` 要素に `role="img"` を設定すると、子要素がスクリーンリーダーから隠されてしまいます。アイコンや説明テキストを含むコンポーネント（InsightGrid・ProcessFigure・Timeline）では `role="group"` に変更し、内部コンテンツをアクセシブルに保ちます。

---

## リスト要素のrole属性

CSSで `list-style: none` を設定すると、Safari のスクリーンリーダー（VoiceOver）がリストとして認識しなくなる既知のバグがあります。

パンくずリスト・サイドバー・フッターの `<ol>` / `<ul>` に `role="list"` を追加して対処します。見た目をカスタマイズしたすべてのリストで確認しましょう。

---

## その他の改善

### 画像のwidth/height属性

`width` と `height` を明示していない画像は、読み込み完了時にレイアウトがずれる CLS（Cumulative Layout Shift）の原因になります。アバター画像（32×32、48×48、64×64px）やYouTubeサムネイル（480×360px）など、すべての画像にサイズを指定しましょう。

### Heroスライダーのaria-live

自動切り替えスライダーは、スクリーンリーダーのユーザーには変化が伝わりません。`aria-live="polite"` 領域を用意し、「スライド 1 / 4: 〇〇」のようにテキストで通知します。

### dialogのaria-labelledby

`<dialog>` 要素にはタイトル要素のIDを `aria-labelledby` で参照し、モーダルの目的をスクリーンリーダーが読み上げられるようにします。

### ページネーションのaria-current

現在のページ番号に `aria-current="page"` を設定し、スクリーンリーダーで「現在のページ」であることを通知します。

### コピーボタンのaria-label更新

クリップボードにコピー成功時、`aria-label` を「コピーしました」に動的に更新し、状態変化をスクリーンリーダーに通知します。

---

## まとめ

アクセシビリティ改善は、一つひとつは小さな変更ですが、積み重ねることでサイト全体の品質が大きく向上します。特に効果が大きかったのは以下の3つです。

1. **focus-visibleの全体適用**：キーボード操作でのナビゲーションが劇的に改善
2. **コントラスト比の修正**：`text-slate-400` → `text-slate-500` だけで WCAG AA クリア
3. **外部リンクのSR通知**：`rehype-external-links` と組み合わせて全リンクを自動対応

まずは axe DevTools でサイトをスキャンし、自動検出できる問題から片付けていくのがおすすめです。

---

## この記事が含まれるシリーズ

この記事は「[Astroサイトの品質改善ガイド](/blog/website-improvement-batches/)」シリーズの一部です。パフォーマンス・SEO・UXの改善についても個別の記事で紹介しています。
