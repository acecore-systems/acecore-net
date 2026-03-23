# Batch 10 改善提案

Batch 9 完了後の全ファイル監査で発見された追加改善項目。

## 優先度 High

### A11Y-1: focus-visible スタイルがサイト全体で欠落
- **場所**: uno.config.ts（ショートカット定義）
- **内容**: ボタン・リンクなどインタラクティブ要素にキーボードフォーカスの視覚フィードバックがない。Tab操作時にどこにフォーカスがあるか判別不能。WCAG 2.4.7 不適合
- **対応**: `ac-btn` / `ac-btn-primary` / `ac-btn-outline` にfocus-visible:ring ユーティリティを追加
- **工数**: Small

### PERF-1: SplitContent画像にwidth/height属性が欠落
- **場所**: SplitContent.astro L50
- **内容**: `<img>` に width/height がなくCLS（Cumulative Layout Shift）の原因になる
- **対応**: `width="800" height="450"` を追加
- **工数**: Small

### A11Y-2: 著者ページのアバター画像にwidth/height欠落
- **場所**: blog/authors/[author].astro L32-36
- **内容**: アバター画像に width/height / decoding / loading 属性がない
- **対応**: `width="64" height="64" decoding="async"` を追加
- **工数**: Small

## 優先度 Medium

### CODE-1: clipboard APIのエラーハンドリング欠落
- **場所**: CopyCodeButton.astro L13、ShareButtons.astro L54
- **内容**: `navigator.clipboard.writeText()` のtry-catch がなく、権限拒否やHTTP環境でエラーになる
- **対応**: try-catchでフォールバックまたはエラー表示
- **工数**: Small

### A11Y-3: CopyCodeButtonのfocus-visible欠落
- **場所**: CopyCodeButton.astro CSS（L19-30）
- **内容**: コードブロックのコピーボタンにキーボードフォーカス表示がない
- **対応**: `.copy-code-btn:focus-visible` スタイルを追加
- **工数**: Small

### PERF-2: rehype-optimize-imagesのwidth/heightが文字列型
- **場所**: rehype-optimize-images.ts L19-20
- **内容**: `width = '800'` と文字列で設定しているが、HTMLの仕様では数値が推奨
- **対応**: 文字列→数値に変更
- **工数**: Small

### UX-1: ScrollToTop / AnchorAdのfocus-visible欠落
- **場所**: ScrollToTop.astro、AnchorAd.astro
- **内容**: ボタンにキーボードフォーカス表示がない
- **対応**: `focus-visible:ring-2` クラスを追加
- **工数**: Small

### SEO-1: トップページの画像altが空
- **場所**: index.astro L26-30
- **内容**: メイン画像のalt属性が空文字。装飾画像でない場合は適切なaltが必要
- **対応**: 各画像に説明的なalt属性を設定
- **工数**: Small

## 優先度 Low

### CODE-2: AdUnit / AnchorAdのAdSenseエラーが無視される
- **場所**: AdUnit.astro L12、AnchorAd.astro L33-35
- **内容**: AdSense push時のエラーが無視されている。デバッグ困難
- **対応**: catch節でconsole.warnを追加
- **工数**: Small

### CODE-3: Hero.astroのスライド間隔がマジックナンバー
- **場所**: Hero.astro L237
- **内容**: `setInterval(next, 5000)` がハードコードされている
- **対応**: 定数に抽出
- **工数**: Small

### SEO-2: sitemap設定に優先度・更新頻度がない
- **場所**: astro.config.mjs
- **内容**: `sitemap()` にchangefreq/priority等の設定がない
- **対応**: サイトマップ設定を拡充
- **工数**: Small

### CODE-4: SplitContent.astroの型定義が緩い
- **場所**: SplitContent.astro L21
- **内容**: `[k: string]: any` で型安全性が低い
- **対応**: Visual型をunion型で定義
- **工数**: Medium
