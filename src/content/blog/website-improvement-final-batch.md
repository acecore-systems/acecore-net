---
title: 'Astroサイトの品質改善ガイド 続編 ― PageSpeed Insights 全項目100点を達成した最終調整'
description: 'Cloudflare Web Analytics の停止、PageSpeed Insights のモバイル / デスクトップ全項目100の達成、ネットワーク依存関係ツリーの読み解き、SVGアイコン移行、そして試したが採用しなかった最適化の判断まで。前回記事の続編として最終改善をまとめます。'
date: 2026-03-29T02:30
author: gui
tags: ['技術', 'Astro', 'パフォーマンス', 'アクセシビリティ', 'SEO', 'Webサイト']
image: https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: 前回記事の続編です
  text: '前回の「Astroサイトの品質改善ガイド」でまとめた改善の続編として、PageSpeed Insights 全項目100に到達するまでの最終調整を記録します。今回はモバイル / デスクトップともに 4 指標すべて 100 に到達し、残診断の読み解きと、試したが採用しなかった追加最適化の判断まで含めて整理しました。'
insightGrid:
  eyebrow: なぜ価値があるのか
  title: PageSpeed 全項目100が高水準と言える理由
  description: 100 は「実サイトのすべてが完璧」という意味ではありませんが、Lighthouse が見る主要監査で大きな取りこぼしがない状態を示します。
  variant: card
  items:
    - title: slow 4G 前提
      description: モバイル計測は slow 4G と CPU スローダウン付き。軽量な静的サイトでも 100 は簡単ではありません。
      icon: i-lucide-gauge
      tone: brand
    - title: 4カテゴリ同時満点
      description: Performance だけでなく Accessibility / Best Practices / SEO を同時に満たす必要があります。
      icon: i-lucide-shield-check
      tone: emerald
    - title: 第三者要素の整理
      description: 外部 beacon や不要な依存を減らしつつ、GA4 や広告など必要な要素は残すバランスが必要です。
      icon: i-lucide-sparkles
      tone: amber
    - title: 診断の読み解き
      description: すべてのインサイトをゼロにするのではなく、残る診断が受け入れるべきものかを判断する必要があります。
      icon: i-lucide-search
      tone: slate
processFigure:
  title: 今回の最終調整
  steps:
    - title: 計測
      description: PageSpeed Insights のモバイル / デスクトップ結果と残診断を確認。
      icon: i-lucide-gauge
    - title: 整理
      description: Cloudflare Web Analytics の役割を見直し、不要な beacon を停止。
      icon: i-lucide-shield-check
    - title: 修正
      description: 動的アイコン描画を shared SVG コンポーネントへ統一し、欠落アイコンを解消。
      icon: i-lucide-wrench
    - title: 判断
      description: 追加の CSS 分割や third-party 削減案を比較し、費用対効果の低い案は採用しないと決める。
      icon: i-lucide-scale-3d
compareTable:
  title: 最終調整で変わったこと
  before:
    label: 改善前
    items:
      - モバイルは高得点だが、Cloudflare Web Analytics beacon が残っていた
      - PageSpeed の残診断の意味が曖昧で、手を止める判断基準がなかった
      - UnoCSS icon class の取り残しで一部記事に空の丸が出ることがあった
      - 診断が残ると、効果の薄い追加最適化まで続けるべきか判断しづらかった
  after:
    label: 改善後
    items:
      - モバイル / デスクトップともに 4 指標すべて 100
      - Cloudflare Web Analytics を停止し、GA4 主軸の計測に整理
      - shared SVG Icon へ統一し、legacy icon 名も alias で吸収
      - 効果の薄い追加最適化は見送り、止めどころを説明できるようになった
checklist:
  title: 今回完了した対応
  items:
    - text: Cloudflare Web Analytics を停止し、beacon の注入を止めた
      checked: true
    - text: PageSpeed Insights のモバイル / デスクトップ全項目100を確認した
      checked: true
    - text: ネットワーク依存関係ツリーを読み解き、BaseLayout.css が唯一の主要ボトルネックだと整理した
      checked: true
    - text: ProcessFigure と StatBar の動的 icon class を shared Icon へ移行した
      checked: true
    - text: legacy の check-circle 名を alias で互換対応した
      checked: true
    - text: 追加の CSS 分割や third-party のさらなる削減案は、効果より複雑さが勝つため見送ると判断した
      checked: true
linkCards:
  - href: /blog/website-improvement-batches/
    title: 前回記事：品質改善の全体像
    description: まずは前回のハブ記事で、150項目超の改善の全体像を把握できます。
    icon: i-lucide-book-open
  - href: /blog/astro-performance-tuning/
    title: パフォーマンス最適化編
    description: CSS 配信戦略、フォント、画像、外部スクリプトの最適化を詳しく解説。
    icon: i-lucide-gauge
  - href: /blog/astro-accessibility-guide/
    title: アクセシビリティ編
    description: WCAG AA 準拠と Accessibility 100 の具体策を整理した記事です。
    icon: i-lucide-accessibility
  - href: /blog/astro-ux-and-code-quality/
    title: UX・コード品質編
    description: View Transitions や検索、型安全性などの品質改善をまとめています。
    icon: i-lucide-sparkles
faq:
  title: よくある質問
  items:
    - question: PageSpeed Insights で 100 を取ったら「最速のサイト」と言えますか？
      answer: '絶対的な意味での最速とは言い切れません。PageSpeed Insights は Lighthouse によるラボ計測であり、実ユーザーの回線や端末、サーバー混雑まで完全には表現しません。ただし、Lighthouse が見る主要監査では取りこぼしの少ない、非常に高水準な状態です。'
    - question: 100 点なのにネットワークの依存関係ツリーや render-blocking CSS が見えるのはなぜですか？
      answer: 'それらは必ずしも失敗監査ではなく、診断情報として表示されることがあります。今回は BaseLayout.css 1 本がクリティカルパスに残っていますが、モバイル 100 を維持できており、費用対効果の観点から現時点では許容と判断しました。'
    - question: なぜ Cloudflare Web Analytics を切ったのですか？
      answer: 'GA4 で CTA・検索・問い合わせなどのイベント計測がすでに十分実装されており、Cloudflare 側は役割が性能監視寄りに限定されていました。今回は beacon が PageSpeed に与える影響も考慮し、GA4 主軸へ整理しました。'
    - question: 試したけれど採用しなかったことはありますか？
      answer: 'あります。BaseLayout.css のさらなる分割、network dependency tree の表示自体を消すための調整、GA4 まで削って third-party を極小化する案などを比較しました。ただ、モバイル100を維持できている状況では、複雑さや計測損失の方が大きく、採用しませんでした。'
---

## はじめに

前回の [Astroサイトの品質改善ガイド](/blog/website-improvement-batches/) では、リニューアル後の Acecore サイトに対して行った大規模な改善をまとめました。今回の記事はその続編です。

今回は、前回記事の公開後に残っていた細かな課題を順に整理し、最終的に **PageSpeed Insights のモバイル / デスクトップともに 4 指標すべて 100** を確認できる状態まで持っていきました。さらに、単なるスコア調整にとどまらず、計測基盤の整理、アイコン描画の安定化、そして「どこまでやれば十分か」という判断基準の言語化まで含めて仕上げています。

## PageSpeed Insights 全項目100の結果

2026年3月29日時点で、Acecore トップページは以下の結果を確認できました。

| 計測面 | Performance | Accessibility | Best Practices | SEO |
| --- | --- | --- | --- | --- |
| 携帯電話 | **100** | **100** | **100** | **100** |
| デスクトップ | **100** | **100** | **100** | **100** |

以下に、実際の PageSpeed Insights のスクリーンショットとレポートURLをまとめて置いています。前回は「モバイル 99 / その他 100」が現実的な上限だと見ていましたが、不要な第三者 beacon を整理し、残診断の意味を精査したことで、今回は 100 まで到達しました。

### 計測レポートURL

スクリーンショットだけでなく、あとから同じ結果ページを直接確認できるように、今回の計測に使ったレポートURLも残しておきます。

- [モバイルのレポート](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile)
- [デスクトップのレポート](https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop)

<figure class="not-prose my-8">
  <figcaption class="text-base font-700 text-slate-800 mb-3">実際の計測スクリーンショット</figcaption>
  <p class="text-sm text-slate-500 mb-4">画像をクリックすると、該当する PageSpeed Insights のレポートをそのまま開けます。</p>
  <div class="grid gap-4 md:grid-cols-2">
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=mobile" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-mobile-summary-20260329.webp" alt="2026年3月29日時点の Acecore トップページの PageSpeed Insights モバイル結果。Performance、Accessibility、Best Practices、SEO がすべて100。" class="w-full rounded-lg border border-slate-200" width="1160" height="340" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">モバイル</span>
    </a>
    <a href="https://pagespeed.web.dev/analysis/https-acecore-net/pipu31csmn?form_factor=desktop" class="block" target="_blank" rel="noopener noreferrer">
      <img src="/uploads/pagespeed-desktop-summary-20260329.webp" alt="2026年3月29日時点の Acecore トップページの PageSpeed Insights デスクトップ結果。Performance、Accessibility、Best Practices、SEO がすべて100。" class="w-full rounded-lg border border-slate-200" width="1190" height="270" loading="lazy" decoding="async" />
      <span class="mt-2 block text-sm font-700 text-slate-700">デスクトップ</span>
    </a>
  </div>
</figure>

## 100 点がどのくらいすごいのか

100 点と聞くと、機能を減らし、見た目を簡素にし、外部要素を削れば Performance はいくらでも上げられるのでは、と思うかもしれません。実際、静的サイトは削るほど速くしやすい面があります。

ただ今回は、GA4、広告、検索、ClientRouter、共通 CSS など実運用に必要な要素を残したまま、モバイル / デスクトップの 4 指標すべてを 100 に揃える必要がありました。単に軽くするだけではなく、何を残し、何を切り、何は無理に触らないかまで含めた調整が必要でした。

もちろん、100 点は現実世界で絶対最速を意味しません。実ユーザーの体感は回線、端末、地域、キャッシュ状態に左右されます。それでも、**必要な運用要素を残したまま Lighthouse が見る主要監査で大きな取りこぼしがない** という意味では、かなり高い完成度に入ったと言ってよい状態です。

## 100 点に到達するまでの最終調整

### 1. Cloudflare Web Analytics を停止し、GA4 主軸へ整理

Cloudflare Web Analytics は privacy-first で軽量な RUM としては便利ですが、Acecore ではすでに GA4 側で CTA、検索、問い合わせ、lead 生成などのイベント計測を広く実装済みでした。

そのため今回あらためて役割を見直し、Cloudflare 側は PageSpeed 上の不要な beacon 注入としてのコストが勝つと判断。ダッシュボードから RUM を無効化し、本番 HTML から `static.cloudflareinsights.com/beacon.min.js` が消えたことを確認しました。

### 2. PageSpeed の残診断を読み解いた

スコアを 100 にした後も、PageSpeed には `ネットワークの依存関係ツリー` や `render-blocking resources` の診断が見えることがあります。ここを全部消すべき警告と誤解すると、費用対効果の低い最適化に入りがちです。

今回のクリティカルチェーンはおおむね以下でした。

1. `/en/`
2. `ClientRouter.js`
3. `BaseLayout.css`
4. `BaseLayout.js`

この中で実際に render-blocking として残っていたのは `BaseLayout.css` 1 本です。ただしサイズは小さく、モバイル 100 を維持できているため、現時点では「残っているが許容する診断」と整理しました。この判断を言語化しておくこと自体が、次回以降の改善で迷わないための大きな収穫でした。

### 3. アイコン描画を shared SVG コンポーネントへ統一

今回の改善の途中で、UnoCSS の icon utility から shared SVG ベースの `Icon` コンポーネントへ移行する流れがありました。その過程で `ProcessFigure` や `StatBar` に残っていた動的 icon class が取り残され、記事中で丸だけ表示される箇所が出ました。

ここは component 側の描画を `Icon` に統一し、さらに legacy 名の `check-circle` を `circle-check` に吸収する alias も追加しました。

結果として、

- dynamic class の取り残しで表示が消える問題を防げる
- `aria-hidden` などアクセシビリティ属性を SVG 側で統一できる
- UnoCSS の静的解析に依存しないので運用が安定する

という 3 つのメリットが得られました。

### 4. 試したが採用しなかったこと

100 点が出たあとにやりがちなのは、診断欄に残る項目を片っ端から潰しにいくことです。今回はそこもいくつか比較しましたが、以下は採用しませんでした。

- `BaseLayout.css` をさらに細かく分割する案: 診断の見た目は少しきれいになる可能性がありますが、現状でもモバイル 100 を維持できており、複雑さのわりに実益が薄いと判断しました。
- `network dependency tree` の表示自体を消すことを目標にする案: 診断が残ることと、実害があることは別です。説明可能な残り方なら十分だと整理しました。
- GA4 まで削って third-party を極小化する案: PageSpeed だけを見るなら軽くなる余地はありますが、ビジネスイベント計測を失うデメリットの方が大きいため採用しませんでした。

この整理が入ったことで、今回の最終調整は「無理に削り切らない」ところまで含めて完了と判断できるようになりました。

## 今回の改善で得た実務上の学び

今回いちばん大きかったのは、100 点を取ることそのものよりも、**何を消すべきで、何は残してよいかを説明できる状態になった** ことです。

たとえば Cloudflare Web Analytics は、なんとなく入っているだけなら切る価値がある一方、GA4 はビジネスイベント計測の中核なので残すべきです。また `network dependency tree` は、表示されること自体が失敗ではなく、その中身を見て「今の残り方は妥当か」を判断する必要があります。

今回は AI と一緒に候補をかなり広く洗い出しましたが、最終的な採用基準は「実測が改善するか」「運用コストが増えすぎないか」「必要な計測を壊さないか」の 3 点でした。AI を使うと試行の幅は広がりますが、最後に必要なのは実測と判断基準だとあらためて分かりました。

スコアだけを追うと最適化は行き過ぎます。今回はその線引きまで含めて整理できたので、Acecore サイトの改善はいったん「完了」と言える状態まで来ました。

## まとめ

前回記事の続編として、今回は以下を仕上げました。

- PageSpeed Insights のモバイル / デスクトップ全項目 100 を確認
- Cloudflare Web Analytics を停止し、GA4 主軸へ整理
- 残るネットワーク診断を読み解き、受け入れるべき残課題を明確化
- shared SVG Icon への統一で表示欠落を解消
- 効果の薄い追加最適化は見送り、止めどころを明確化

Acecore サイトは、少なくとも Lighthouse / PageSpeed Insights の観点では **最速級を狙えるところまで詰め切った** と言ってよい状態になりました。一方で、スコアは目的ではなく結果です。今後もこの状態を壊さないよう、運用と改善の両方を継続していきます。
