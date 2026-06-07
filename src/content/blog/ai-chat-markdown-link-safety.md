---
title: 'AIチャット回答のMarkdownリンクを安全に描画する実装設計'
description: 'AIチャットの回答に含まれるMarkdownリンクを、HTMLへ安全に変換するための実装メモです。URL前後の空白を許容しつつ、trim、許可リスト、DOM生成、fallback、テストケースを分けて考えることで、他サイトにも転用しやすいレンダラーになります。'
date: 2026-06-07T14:30
author: gui
tags: ['技術', 'Webサイト', 'AI', 'セキュリティ', 'Astro']
image: https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800&h=400&fit=crop&q=80
callout:
  type: tip
  title: この記事のポイント
  text: AI回答は信頼済みHTMLではありません。Markdownリンクを便利に使う場合でも、URLはtrimしてから許可リストで判定し、許可できないものはリンク化せずテキストとして残す設計にします。
processFigure:
  title: AI回答のリンク描画フロー
  steps:
    - title: Text
      description: モデルからの回答はまずプレーンテキストとして扱う。
      icon: i-lucide-message-square-text
      accent: brand
    - title: Parse
      description: 必要なMarkdown表現だけを小さなパーサーで拾う。
      icon: i-lucide-brackets
      accent: amber
    - title: Validate
      description: hrefをtrimし、内部URLや許可ドメインだけを通す。
      icon: i-lucide-shield-check
      accent: emerald
    - title: Render
      description: innerHTMLではなくDOM APIで安全な要素だけを作る。
      icon: i-lucide-code-2
      accent: slate
compareTable:
  title: Markdownリンク描画で分けるべき判断
  before:
    label: 雑に描画する場合
    items:
      - AI回答をinnerHTMLへ直接入れてしまう
      - Markdown仕様全体を一気に実装しようとする
      - URL前後の空白でリンク化に失敗する
      - '外部URLやjavascript:を同じ扱いにしてしまう'
  after:
    label: 小さく安全に描画する場合
    items:
      - 回答はテキストとして受け取り、必要な表現だけDOM化する
      - チャットで使うMarkdownだけに対応する
      - URLはtrim後に安全判定する
      - 許可できないURLはリンク化せず文字列として表示する
checklist:
  title: 導入チェック
  items:
    - text: AI回答をHTMLとして信頼しない
    - text: MarkdownリンクのURL前後空白を許容する
    - text: hrefは必ずtrimしてから検証する
    - text: 内部パス、同一origin、必要な外部ドメインだけを許可する
    - text: 外部リンクにはtargetとrelを明示する
    - text: 許可できないリンクはテキストとして残す
    - text: 正常系だけでなく危険なURLと壊れたMarkdownもテストする
linkCards:
  - href: /blog/astro-ai-contact-chat/
    title: 問い合わせAIチャットの技術設計
    description: AI回答、API境界、プロンプト制御まで扱った親記事です。
    icon: i-lucide-sparkles
  - href: /blog/cloudflare-pages-security/
    title: Cloudflare Pages のセキュリティ設定
    description: CSPやセキュリティヘッダーを整理した関連記事です。
    icon: i-lucide-shield
  - href: /contact/
    title: お問い合わせ
    description: AIチャットとフォームを配置している実際の導線です。
    icon: i-lucide-message-square
faq:
  title: よくある質問
  items:
    - question: markdown-itやmarkedを使えば十分ですか？
      answer: ライブラリを使う場合でも、HTML出力の扱い、許可するリンク先、targetやrelの付与、危険なURLの拒否は別途設計が必要です。チャット用途なら小さな独自レンダラーで足りることもあります。
    - question: URL前後の空白を許容すると危険になりませんか？
      answer: 空白を許容すること自体ではなく、trim後に何を許可するかが重要です。trimしたhrefを許可リストで判定すれば、モデルの表記揺れに強くしながら安全性を保てます。
    - question: 許可できないURLは削除すべきですか？
      answer: 多くの場合は削除よりテキスト表示のほうがデバッグしやすく、ユーザーにも回答の文脈が残ります。ただし不審な文字列を完全に隠したい運用なら、リンク全体を落とす判断もあります。
---

AIチャットに「詳しくは[サービス一覧](/services/)をご覧ください」と返させると、リンクとして表示されず、Markdown文字列がそのまま残ることがあります。

Acecoreのサイトでも、問い合わせAIチャットの回答にURL前後の空白を含むMarkdownリンクが混ざったため、[AIチャットのMarkdownリンク描画を修正したPR](https://github.com/acecore-systems/acecore-net/pull/99) でレンダラーを調整しました。

この記事では、その小さな修正を入口に、AI回答を安全にDOMへ変換するための考え方をまとめます。

## AI回答は信頼済みHTMLではない

まず前提として、AI回答はHTMLではなくテキストとして扱います。

チャットUIではリンク、太字、箇条書きくらいは使いたくなります。しかし、回答をそのまま `innerHTML` に入れると、モデルが出した文字列をブラウザに解釈させることになります。

必要なのは、Markdownを全部実装することではありません。チャットで必要な表現だけを小さく拾い、安全なDOMだけを作ることです。

## 問題は空白だけではない

今回の直接の不具合は、次のようなリンクでした。

```md
[サービス一覧](/services/)
```

Markdownとしては人間に意味が通りますが、URL部分を「空白を含まない文字列」として正規表現で拾っているとマッチしません。

修正前はこういう考え方でした。

```js
;/\[([^\]]+)\]\(([^)\s]+)\)/
```

`[^)\s]+` は空白を許さないため、`( /services/ )` をリンクとして拾えません。そこで、括弧の内側では前後空白を許容し、実際に使うURLは後でtrimします。

```js
;/\[([^\]]+)\]\(\s*([^)]+?)\s*\)/
```

ここで大事なのは、正規表現を緩めて終わりにしないことです。緩めたあとは、必ず正規化と安全判定を入れます。

## hrefはtrimしてから検証する

リンク生成の順番は固定します。

1. Markdownからlabelとraw hrefを取り出す
2. raw hrefを `trim()` する
3. trim済みhrefを許可リストで検証する
4. 許可できる場合だけ `<a>` を作る

```js
const href = String(rawHref || '').trim()

if (label && isSafeMarkdownHref(href)) {
  const link = document.createElement('a')
  link.href = href
  link.rel = 'noopener noreferrer'

  if (/^https?:\/\//i.test(href)) {
    link.target = '_blank'
  }

  link.textContent = label
  parent.appendChild(link)
}
```

`trim()` 前の値ではなく、実際にDOMへ入れる値で検証します。検証した値と描画する値がずれると、安全判定の意味が弱くなります。

## 許可リストはプロダクトごとに決める

AIチャットが案内してよいURLは、サイトごとに違います。

Acecoreの問い合わせAIでは、おおむね次のような範囲に絞っています。

| 種類       | 例                        | 判断                       |
| ---------- | ------------------------- | -------------------------- |
| 内部パス   | `/services/`              | 許可する                   |
| 同一origin | `https://acecore.net/...` | 許可する                   |
| 公式LINE   | `https://lin.ee/...`      | 目的が明確なので許可する   |
| mailto     | `mailto:info@acecore.net` | 必要な固定宛先だけ許可する |
| tel        | `tel:05088902788`         | 必要な固定番号だけ許可する |
| その他外部 | 任意のURL                 | 原則リンク化しない         |

実装例はこうです。

```js
function isSafeMarkdownHref(href) {
  if (href.startsWith('/')) return true

  try {
    const url = new URL(href, window.location.origin)
    if (url.origin === window.location.origin) return true
    if (url.hostname === 'acecore.net') return true
    if (url.hostname === 'lin.ee') return true
  } catch {
    return false
  }

  return href === 'mailto:info@acecore.net' || href === 'tel:05088902788'
}
```

この関数はサイトごとに変えるべきです。採用サイトなら求人媒体、ECなら決済や配送追跡、SaaSならドキュメントやステータスページを許可するかもしれません。

## 許可できないリンクはテキストに戻す

安全判定に失敗したリンクをどう扱うかも設計です。

問い合わせAIの場合は、リンク化できないMarkdownを完全に消すより、元の文字列として残すほうが扱いやすいです。ユーザーには文脈が残り、開発者は「AIが何を出したか」を確認できます。

つまり、パーサーは「安全なリンクを作る」だけでなく、「安全に作れない場合は通常テキストとして出す」責務も持ちます。

## テストケースを最初から用意する

この種のレンダラーは、正常系だけ見ると見落とします。

最低限、次のケースを確認します。

| 入力                                | 期待結果                       |
| ----------------------------------- | ------------------------------ |
| `[サービス一覧](/services/)`        | 内部リンクになる               |
| `[サービス一覧]( /services/ )`      | trimされて内部リンクになる     |
| `[LINE]( https://lin.ee/example )`  | 外部リンクとして開く           |
| `[危険](javascript:alert(1))`       | リンク化しない                 |
| `[外部](https://example.com/)`      | 許可しないならリンク化しない   |
| `[壊れたリンク](/services/`         | テキストとして表示する         |
| `` `code` と [link]( /contact/ ) `` | codeとlinkがそれぞれ描画される |

PR #99 では、`[サービス一覧]( /services/ )`、`[サービス一覧](/services/)`、`[LINE]( https://lin.ee/DjIrdqj )` が同じURLとして扱われることを確認しました。

## Markdown全体を実装しない判断

AIチャットで使うMarkdownは限定できます。

- 段落
- 箇条書き
- 太字
- インラインコード
- リンク

テーブル、画像、HTML、脚注、見出しの深い階層まで対応すると、レンダラーの責務が急に大きくなります。チャットUIでは、読みやすく案内できれば十分です。

必要になったら実績のあるMarkdownライブラリを使う選択もあります。ただし、その場合でも「HTMLを許すか」「URLをどう絞るか」「外部リンクに何を付けるか」は別に決めます。

## まとめ

AIチャットのMarkdownリンク描画は、見た目の小さな修正に見えます。しかし実際には、AI出力をどこまで信頼するかという境界設計です。

実装で重要なのは次の点です。

- AI回答はHTMLではなくテキストとして扱う
- 必要なMarkdownだけを小さくDOM化する
- MarkdownリンクのURL前後空白を許容する
- hrefはtrimしてから安全判定する
- 許可リストで内部URLと必要な外部URLだけを通す
- 許可できないリンクはテキストとして残す
- 壊れたMarkdownや危険なURLをテストする

AIをサイト導線に入れるほど、回答テキストをどう描画するかが重要になります。便利なMarkdown対応と安全なリンク制御は、同じ実装の中で一緒に扱うべきです。
