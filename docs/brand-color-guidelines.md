# ロゴ・カラーの先行導入

2026-10-24、現在のmain構成へロゴと配色だけを先行適用済み。現在の全面刷新Draftには先行mainを通常mergeし、採用ブランドを維持する。以下のレイアウト保全は先行導入時の範囲を示し、承認済みの刷新レイアウトを戻す指示ではない。レイアウト・余白・字級・文章・写真・提供範囲・機能は変えない。既存の全面刷新Draft（公式314、Designs5、Schools67、Systems162）は後続として保全する。将来の刷新merge前には先行mainのブランド変更を維持し、再照合する。

- [承認ロゴの正本](https://github.com/acecore-systems/acecore-net/blob/3e70a83c077543c1ef41f4d5e8f26437a5df2c2f/docs/03_詳細設計/07_ブランドカラーと球状グラデーション.md)。同文書のレイアウト刷新はこの先行導入の範囲ではない。
- 明背景は公式の上/左弧・右上矢印が単色#00022b、Systems紫・Schools緑・Designs多色。下/右弧・左下矢印は白基調、中央は#0656d9。テーマ/濃背景は全白。path/clip/viewBox/比率を保持する。
- 文書imgは実背景に応じ/logo.svgまたは/logo-on-dark.svg。favicon.svgのみ外観切替し、OSdarkでも白headerは明版のまま。
- Acecoreの2つ目のc（index3）だけ#0656d9、子名は頭文字だけ各事業色。残りは既存の中立色、濃背景は白系を継承。通常本文の社名は細分化しない。
- 共通青#0656d9、Systems#8950c5、Schools#39a86b、Designs多色。操作/識別へ抑制して使い、通常見出し・長文・価格は中立色。通常文字には濃いtheme inkを使い、明るいgreenに小さい白字を載せない。意味のある警告色を保持する。
- 元画像・Hatt・記事・料金・翻訳・CMS/API・フォーム・検索・AI・導線を保全。OGは既存構図/文字/座標を保持しロゴと配色のみ同期する。Designs mainの1ページ/catalog構成を維持し、portfolio/8ページ化を先取りしない。

## 最新mainとの統合

2026-10-24、先行mainのロゴ・favicon・部分着色と無関係修正を通常mergeで取り込んだ。全面刷新の構成・写真・本文・機能を保持し、BrandNameは単一inline wrapper、BrandWordは既存刷新スタイルへ統合して二重適用しない。先行本番を戻さず、今後の調整でも明暗surface・単語間空白・円形clip除去を確認する。Designsの依存baseはfeat/hatt-portfolioのまま。
