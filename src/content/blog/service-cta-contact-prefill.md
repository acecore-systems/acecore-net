---
title: 'サービスCTAから問い合わせフォームへ文脈を引き継ぐ技術設計'
description: 'サービスページで読んでいた文脈を問い合わせフォームへ引き継ぐための実装設計です。AstroサイトでのミニCTA、URLパラメータ契約、フォーム種別の初期選択、件名prefill、多言語URL、GA計測、生成HTML確認まで、他サイトでも使える形で整理します。'
date: 2026-06-07T13:00
author: gui
tags: ['技術', 'Webサイト', 'サービス', 'Astro', 'CMS']
image: https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop&q=80
callout:
  type: info
  title: この記事のポイント
  text: サービスページのCTAは、ただフォームへ送るだけでは弱い導線です。ユーザーが読んでいたサービス文脈をURLで渡し、フォーム側で問い合わせ種別と件名を初期化すると、入力の迷いと受信側の仕分けを同時に減らせます。
processFigure:
  title: サービスCTAからフォームへ文脈を渡す流れ
  steps:
    - title: Service
      description: 各サービスセクションのCTAに service key を持たせる。
      icon: i-lucide-panels-top-left
      accent: brand
    - title: URL
      description: /contact/?category=service&service=web#contact-form のようにURL契約で渡す。
      icon: i-lucide-link
      accent: amber
    - title: Form
      description: フォーム側で該当する問い合わせ種別と件名を初期入力する。
      icon: i-lucide-file-input
      accent: emerald
    - title: Ops
      description: 受信側は問い合わせ種別だけでサービス文脈を判別できる。
      icon: i-lucide-inbox
      accent: slate
compareTable:
  title: CTAとフォームをつなぐときの違い
  before:
    label: ただフォームへ送る場合
    items:
      - ユーザーがフォームで同じサービス名を選び直す
      - 件名が空欄になり、何の相談か伝わりにくい
      - 受信側が本文を読まないと対象サービスを判別しにくい
      - サービス別CTAの効果測定が曖昧になる
  after:
    label: 文脈を引き継ぐ場合
    items:
      - CTAのservice keyから問い合わせ種別を初期選択できる
      - 件名にサービス名を入れて相談内容を整理できる
      - 受信側は問い合わせ種別を見れば分類できる
      - GA labelとURLパラメータでCTA別に確認しやすい
checklist:
  title: 導入時の設計チェック
  items:
    - text: URLパラメータは短く安定したservice keyだけにする
    - text: フォームの受信値はユーザー表示文言ではなく運用上安定した値にする
    - text: 未知のservice keyはサービス全般へフォールバックする
    - text: 件名は空欄のときだけ初期入力する
    - text: hidden項目を増やす前に既存の問い合わせ種別で分類できるか確認する
    - text: locale別の問い合わせURLをサーバー側で生成する
    - text: CTAにはGA labelとlocationを付けて効果測定できるようにする
    - text: build後の生成HTMLでCTA数、option数、hidden項目の有無を確認する
linkCards:
  - href: /services/
    title: サービス
    description: サービス別CTAを置いた導線の入口です。
    icon: i-lucide-panels-top-left
  - href: /contact/
    title: お問い合わせ
    description: URLパラメータを受けて種別と件名を初期化するフォームです。
    icon: i-lucide-message-square
  - href: /blog/astro-ai-contact-chat/
    title: 問い合わせAIチャットの技術設計
    description: 会話で相談先を整理する導線を扱った関連記事です。
    icon: i-lucide-sparkles
faq:
  title: よくある質問
  items:
    - question: hidden項目で相談対象サービスを送らないのはなぜですか？
      answer: 受信側で見る項目を増やさず、既存の問い合わせ種別だけで分類できるようにするためです。フォーム項目が増えるほど運用と通知テンプレートの確認点も増えます。
    - question: URLパラメータは改ざんされても大丈夫ですか？
      answer: 未知のservice keyはサービス全般へフォールバックします。送信値はフォーム側のoptionから選ぶため、URL値をそのまま受信値にしない設計にしています。
    - question: 多言語サイトではどう扱いますか？
      answer: CTAのリンク先はlocale別に生成し、フォーム表示ラベルも翻訳します。一方で受信値は日本語の安定した分類名に寄せると、受信側の運用がぶれにくくなります。
---

サービスページを読んだユーザーが「この内容で相談したい」と思ったとき、単に問い合わせフォームへ送るだけでは、少し文脈が落ちます。

ユーザーはフォームでサービス種別を選び直し、件名も自分で書き直す必要があります。受信側も、本文を読むまで「Web制作の相談なのか」「サーバー運用なのか」「Aceserverなのか」を判断しにくくなります。

Acecoreのサイトでは、[サービスCTAから問い合わせフォームへ相談対象を引き継ぐPR](https://github.com/acecore-systems/acecore-net/pull/100) でこの導線を改善しました。この記事では、Astroでの実装記録としてだけでなく、他のWebサイトでも使える導線設計として整理します。

## 目的はフォーム入力を減らすことではない

この実装の目的は、フォーム項目を自動入力して楽に見せることだけではありません。

本質は、サービスページで生まれた文脈を、問い合わせフォームと受信オペレーションへ正しく渡すことです。

| 観点       | 改善したいこと                                     |
| ---------- | -------------------------------------------------- |
| ユーザー   | 読んでいたサービスをもう一度選ぶ手間を減らす       |
| フォーム   | 問い合わせ種別と件名を相談内容に合わせて初期化する |
| 受信側     | 問い合わせ種別だけで相談対象を分類しやすくする     |
| 計測       | どのサービスCTAから相談が始まったか追いやすくする  |
| 多言語導線 | localeに合う問い合わせURLへ送る                    |

見た目としては小さなミニCTAですが、設計対象はCTA、URL、フォーム、翻訳、計測、受信運用までまたがります。

## CTAコンポーネントに責務を切り出す

各サービスセクションの末尾に「このサービスについて相談する」CTAを置きます。

最初に避けたいのは、サービスページの各セクションに同じリンク生成とGA属性をベタ書きすることです。サービスが7件あるなら、同じ書き方が7回出ます。文言やURL仕様を変えたくなったときに漏れやすくなります。

そこで、問い合わせCTAをまとめる `ServiceSectionActions` を作りました。

```astro
---
import Icon from './Icon.astro'
import { t, getLocalizedUrl, type Locale } from '../i18n'

interface Props {
  locale: Locale
  gaLabel: string
  gaLocation: string
  serviceKey: string
}

const { locale, gaLabel, gaLocation, serviceKey } = Astro.props
const u = (path: string) => getLocalizedUrl(path, locale)
const contactUrl = `${u('/contact/')}?category=service&service=${encodeURIComponent(serviceKey)}#contact-form`
---

<a
  href={contactUrl}
  class="ac-btn-outline gap-2 text-sm sm:w-auto"
  data-ga-event="cta_click"
  data-ga-label={gaLabel}
  data-ga-location={gaLocation}
  data-ga-destination={contactUrl}
>
  <Icon name="message-circle" class="text-sm" />
  {t(locale, 'pages.services.miniCta')}
</a>
```

このコンポーネントの責務は3つです。

- localeに合う問い合わせURLを生成する
- service keyをURLパラメータへ入れる
- GA計測用のlabelとlocationを持たせる

CTAはユーザーの行動点なので、UIだけでなく計測点でもあります。`data-ga-label` と `data-ga-location` は、あとから「どのサービスから相談が始まったか」を見るために残しています。

## URLパラメータをフォームとの契約にする

CTAから問い合わせフォームへ渡す値は、URLパラメータにしました。

```txt
/contact/?category=service&service=web#contact-form
```

ここで重要なのは、URLに入れる値を「表示文言」にしないことです。

`Webサイト制作・運用について` のような表示文言は、翻訳、表記揺れ、将来の名称変更の影響を受けます。URLには `web` や `server` のような短いservice keyだけを入れます。

| パラメータ | 役割                                   |
| ---------- | -------------------------------------- |
| `category` | サービス相談として処理する入口を示す   |
| `service`  | 対象サービスを表す安定したkey          |
| hash       | フォーム位置へスクロールするために使う |

URLパラメータはユーザーが編集できるものです。だからこそ、フォーム側ではURL値をそのまま送信値にせず、既存のoptionへマッピングします。

## フォーム側で分類表を持つ

問い合わせフォーム側では、サービス別の分類を配列で持ちます。

```ts
const serviceCategoryOptions = [
  {
    key: 'server',
    value: 'サーバー構築・運用について',
    label: t(locale, 'pages.contact.formCategoryServiceServer'),
    subject: t(locale, 'pages.services.server.title'),
  },
  {
    key: 'web',
    value: 'Webサイト制作・運用について',
    label: t(locale, 'pages.contact.formCategoryServiceWeb'),
    subject: t(locale, 'pages.services.web.title'),
  },
]
```

`key`、`value`、`label`、`subject` はそれぞれ役割が違います。

| フィールド | 役割                                       |
| ---------- | ------------------------------------------ |
| `key`      | URLパラメータから探すための安定した識別子  |
| `value`    | フォーム送信時に受信側へ届く問い合わせ種別 |
| `label`    | 画面に表示する翻訳済みの選択肢             |
| `subject`  | 件名の初期入力に使うサービス名             |

多言語サイトの場合、`label` はlocaleに合わせて翻訳します。一方で、`value` は受信側の分類に使うため、日本語の安定した値に寄せました。

これはプロダクトによって判断が分かれるところです。CRMや外部フォームが多言語分類を持てるなら、valueもlocale別にできます。今回のように受信側の運用をシンプルにしたい場合は、表示ラベルと受信値を分けるほうが扱いやすくなります。

## optionにdata属性を持たせる

フォームのselectには、サービス別optionを出力します。

```astro
<select id="category" name="category" required>
  <option value="" disabled selected>
    {t(locale, 'pages.contact.formCategoryPlaceholder')}
  </option>
  <option value="サービス全般について">
    {t(locale, 'pages.contact.formCategoryService')}
  </option>
  {
    serviceCategoryOptions.map((option) => (
      <option
        value={option.value}
        data-service-key={option.key}
        data-service-subject={option.subject}
      >
        {option.label}
      </option>
    ))
  }
</select>
```

`data-service-key` はURLの `service` と照合するために使います。`data-service-subject` は件名を作るために使います。

ここでもURL値をそのまま `category.value` に入れないのがポイントです。必ずselect内のoptionから選ぶことで、未知のservice keyや不正な値を受信値に混ぜないようにしています。

## クライアント側でprefillする

フォームの初期化は、ページ読み込み後の小さなスクリプトで行います。

```js
function initContactServicePrefill() {
  const form = document.getElementById('contact-form')
  if (!form || form.dataset.servicePrefillInitialized === 'true') return

  form.dataset.servicePrefillInitialized = 'true'

  const url = new URL(window.location.href)
  const requestedCategory = url.searchParams.get('category')
  const requestedService = url.searchParams.get('service') || ''
  const category = document.getElementById('category')
  const subject = document.getElementById('subject')

  if (
    requestedCategory === 'service' &&
    category instanceof HTMLSelectElement
  ) {
    const serviceOption = Array.from(category.options).find((option) => {
      return option.dataset.serviceKey === requestedService
    })

    category.value = serviceOption?.value || 'サービス全般について'
    category.dispatchEvent(new Event('input', { bubbles: true }))
    category.dispatchEvent(new Event('change', { bubbles: true }))

    if (
      serviceOption &&
      subject instanceof HTMLInputElement &&
      !subject.value.trim()
    ) {
      const template = form.dataset.serviceSubjectTemplate || '{service}'
      const serviceName =
        serviceOption.dataset.serviceSubject ||
        serviceOption.textContent?.trim() ||
        ''
      subject.value = template.replace('{service}', serviceName)
    }
  }
}
```

実装上のポイントは次の4つです。

- 二重初期化を避けるため `data-service-prefill-initialized` を見る
- `category=service` のときだけ処理する
- 未知のservice keyは「サービス全般について」へフォールバックする
- 件名は空欄のときだけ初期入力する

最後の「件名は空欄のときだけ」が重要です。ユーザーが戻る操作やブラウザ補完で件名を持っている場合、勝手に上書きすると体験が悪くなります。

AstroのView Transitionsやクライアントナビゲーションがある場合は、通常の初期ロードだけでなく `astro:page-load` でも初期化します。

```js
document.addEventListener('astro:page-load', initContactServicePrefill)
initContactServicePrefill()
```

## hashでフォーム位置へ移動する

CTAのURLには `#contact-form` を付けています。

```txt
/contact/?category=service&service=web#contact-form
```

問い合わせページにはFAQ、LINE、説明文、フォーム以外の連絡手段などがあるため、サービスCTAから来たユーザーはフォーム位置へ直接移動したほうが自然です。

ただし、フォーム側で初期化を行う場合、スクロールタイミングには少し注意します。要素が描画された後にスクロールしたいので、`requestAnimationFrame` を使っています。

```js
if (window.location.hash === '#contact-form') {
  window.requestAnimationFrame(() => {
    form.scrollIntoView({ block: 'start' })
  })
}
```

フォーム位置への移動は小さな挙動ですが、CTAの意図とフォームの表示位置がずれるとユーザーが迷います。導線設計では、URL、初期選択、スクロール位置まで一体で見ます。

## hidden項目を増やさない判断

今回、`相談対象サービス` のhidden項目は追加しませんでした。

理由は、問い合わせ種別だけで対象サービスを判別できるようにしたかったからです。

フォーム項目を増やすと、次の確認点も増えます。

- 通知メールに出すか
- 管理画面やスプレッドシートに列を増やすか
- 既存の自動返信テンプレートへ影響するか
- CRM連携やWebhookで扱うか
- 多言語表示名と受信値をどう分けるか

必要な情報が既存項目で表せるなら、項目を増やさないほうが運用は安定します。今回は `お問い合わせ種別` を「サービス全般」とサービス別に分けるだけで、受信側が判別できる形にしました。

もちろん、複数サービスを同時選択したい、広告キャンペーンIDも保存したい、CRMで別フィールドにしたい、といった要件がある場合はhidden項目を追加する判断もあります。

## 多言語サイトでの考え方

多言語サイトでこの導線を作るときは、3つの値を分けて考えると混乱しません。

| 種類       | 例                            | locale依存 |
| ---------- | ----------------------------- | ---------- |
| URL key    | `web`, `server`, `aceserver`  | しない     |
| 表示ラベル | `About Website Design` など   | する       |
| 受信値     | `Webサイト制作・運用について` | 運用次第   |

URL keyは翻訳しないほうが安定します。リンクを共有したり、分析したり、フォーム側で照合したりするためです。

表示ラベルは必ず翻訳します。ユーザーがフォームで見る文言だからです。

受信値は、運用に合わせます。今回は日本語の安定値に寄せました。多言語対応の表示と、受信後の社内運用は別物として設計すると、フォームが扱いやすくなります。

翻訳フロー自体は、[Sveltia CMSで多言語ブログを運用する方法](/blog/copilot-translation-pipeline/) でも紹介しています。

## 生成HTMLで確認する

この種の実装は、コンポーネントだけ見ても不十分です。build後のHTMLで、実際にリンクとoptionが出力されているかを確認します。

今回確認した観点は次の通りです。

- `/services/` にサービス別CTAが7件出ている
- 各CTAが `?category=service&service=...#contact-form` を持っている
- `/contact/` に `data-service-key` 付きoptionが7件出ている
- 「サービス全般について」とサービス別種別が出ている
- `相談対象サービス` のhidden項目が出ていない

たとえば、生成HTMLに対して `rg` で確認できます。

```powershell
rg -n "category=service&service=.*#contact-form" dist\services\index.html
rg -n "data-service-key" dist\contact\index.html
rg -n "相談対象サービス" dist\contact\index.html
```

最後の確認は、出てはいけないものが出ていないことを見るためです。フォーム改修では、追加したものだけでなく、追加しないと決めたものも確認対象にします。

## AIチャットとの役割分担

この導線は、[問い合わせAIチャットの技術設計](/blog/astro-ai-contact-chat/) と相性があります。ただし、役割は違います。

| 導線        | 得意なこと                               |
| ----------- | ---------------------------------------- |
| AIチャット  | どのサービスに相談すべきか会話で整理する |
| サービスCTA | 読んでいるサービスの文脈をフォームへ渡す |
| フォーム    | 正式な相談内容を受け取り、記録を残す     |

AIチャットは、ユーザーがまだ迷っている段階に強い導線です。一方で、サービスページを読み終えて「このサービスについて相談する」と決めたユーザーには、会話を挟まずにフォームへ送るほうが自然です。

導線を増やすときは、すべてを同じ役割にしないことが大切です。ユーザーの状態に合わせて、会話、CTA、フォームを使い分けます。

## まとめ

サービスページから問い合わせフォームへ文脈を引き継ぐ実装は、見た目以上に効果があります。

今回の設計で重要だったのは、次の点です。

- CTAをコンポーネント化してURL生成と計測属性をまとめる
- URLには表示文言ではなく安定したservice keyを入れる
- フォーム側でservice keyをoptionへマッピングする
- 受信値、表示ラベル、件名用サービス名を分ける
- 未知のservice keyはサービス全般へフォールバックする
- 件名は空欄のときだけ初期入力する
- hidden項目を増やさず、問い合わせ種別で分類できるようにする
- build後の生成HTMLでリンク数、option数、不要項目の不在を確認する

問い合わせフォーム改善は、入力欄を減らすだけではありません。ユーザーが読んでいた文脈を受信側まで失わずに渡すことが、実際の相談対応を楽にします。
