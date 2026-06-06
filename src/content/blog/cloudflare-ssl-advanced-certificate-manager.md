---
title: '以前有料だった Cloudflare の SSL オプションの正体 ― Dedicated SSL から Advanced Certificate Manager へ'
description: 'Cloudflare で以前有料だった「Dedicated SSL Certificates（専用SSL証明書）」は、2021年に「Advanced Certificate Manager（ACM）」として機能拡張・名称変更されました。無料の Universal SSL との違いや ACM が必要なケースを解説します。'
date: 2026-03-31T00:00
author: gui
tags: ['技術', 'Cloudflare', 'セキュリティ', 'インフラ']
image: /uploads/acecore-generated/security-operations.webp
compareTable:
  title: Universal SSL vs Advanced Certificate Manager
  before:
    label: Universal SSL（無料）
    items:
      - ルートドメイン + 1階層サブドメインのみカバー
      - CA・有効期限・暗号スイートは選択不可
      - '*.example.com は機能するが dev.staging.example.com は対象外'
      - Cloudflare ブランドが証明書の CN に含まれる
  after:
    label: Advanced Certificate Manager（有料・$10/月/ゾーン）
    items:
      - 多階層サブドメインを最大 50 ホスト名まで指定可能
      - CA（Let's Encrypt / Google Trust Services 等）を選択可能
      - 有効期限を 14 日 〜 365 日で設定可能
      - '独自ドメインが CN になり Cloudflare ブランドが非表示'
callout:
  type: info
  title: 名称変更の背景
  text: 旧称「Dedicated SSL Certificates（専用SSL証明書）」は 2021 年に Advanced Certificate Manager（ACM）として刷新されました。名前が変わっただけでなく、多階層サブドメイン対応・CA 選択・有効期限指定など機能が大幅に拡張されています。
faq:
  title: よくある質問
  items:
    - question: Universal SSL で *.example.com のワイルドカード証明書は使えますか？
      answer: 使えますが、カバーできるのは 1 階層のサブドメイン（www.example.com など）のみです。dev.staging.example.com のような 2 階層以上のサブドメインには適用されず、証明書エラーが発生します。この場合は ACM が必要です。
    - question: Advanced Certificate Manager は無料プランでも使えますか？
      answer: はい、Cloudflare の無料プランでも ACM アドオン（$10/月/ゾーン）を追加購入することで利用できます。上位プランへのアップグレードは不要です。
    - question: Universal SSL で十分なケースはどんなときですか？
      answer: ほとんどの個人サイトや中小企業サイトでは Universal SSL で十分です。ルートドメインと www などの 1 階層サブドメインのみを使用していれば ACM は不要です。
    - question: ACM を有効にすると Universal SSL はどうなりますか？
      answer: Universal SSL と ACM は共存できます。同じサブドメインに対しては ACM の証明書が優先的に使われます。
linkCards:
  - href: https://developers.cloudflare.com/ssl/edge-certificates/advanced-certificate-manager/
    title: Advanced Certificate Manager ドキュメント
    description: Cloudflare 公式の ACM 設定ガイド
    icon: i-lucide-file-text
  - href: https://developers.cloudflare.com/ssl/edge-certificates/universal-ssl/limitations/
    title: Universal SSL の制限事項
    description: Universal SSL がカバーしないケースの公式ドキュメント
    icon: i-lucide-alert-circle
  - href: https://www.cloudflare.com/ja-jp/application-services/products/advanced-certificate-manager/
    title: Advanced Certificate Manager 製品ページ
    description: ACM の機能一覧と購入方法（日本語）
    icon: i-lucide-shield-check
---

「Cloudflare に以前あった有料の SSL オプション、なんだっけ？」——そう思ったことがある方は少なくないはずです。この記事では、その正体と現在の名称・機能について整理します。

Cloudflare Pages での静的サイト配信や CSP の実装は、[Cloudflare Pages で実現するセキュアな静的サイト配信](/blog/cloudflare-pages-security/)も参考になります。

## 結論：「Dedicated SSL」→「Advanced Certificate Manager（ACM）」

Cloudflare で以前有料だった SSL オプションの名称は **Dedicated SSL Certificates（専用 SSL 証明書）** です。これは **2021 年に「Advanced Certificate Manager（ACM）」として刷新・リネーム** されました。

価格は当時と同様にゾーン（ドメイン）ごとに **月額 $10** で提供されています。

---

## なぜ名前が変わったのか

「Dedicated SSL」時代は、文字通り「そのドメイン専用の証明書を発行する」という機能に特化していました。無料の Universal SSL が他のサイトと証明書を共有するのに対し、専用証明書は独自のコモンネーム（CN）を持てるのが売りでした。

**Advanced Certificate Manager** への移行では以下の機能が加わり、名前も「管理（Manager）」の側面を強調したものに変わりました。

- **多階層サブドメイン対応**：`dev.staging.example.com` のような 2 階層以上のサブドメインも保護可能
- **CA の選択**：Let's Encrypt・Google Trust Services などから選択できる
- **有効期限の指定**：14 日〜 365 日の範囲で設定可能
- **最大 50 ホスト名**：1 枚の証明書で複数のホスト名をカバー
- **Total TLS**：ゾーン内のプロキシ済みサブドメインをすべて自動保護

---

## Universal SSL との違い

Cloudflare には無料で使える **Universal SSL** があり、ほとんどのサイトはこれだけで HTTPS を実現できます。ただし、いくつかの制限があります。

### Universal SSL がカバーできないケース

```
# これらは Universal SSL でカバー可能
example.com
www.example.com
blog.example.com

# これらは Universal SSL の対象外（ACM が必要）
dev.staging.example.com
api.v2.example.com
deep.sub.domain.example.com
```

`*.example.com` のワイルドカードは有効ですが、**ワイルドカードが効くのは 1 階層のサブドメインのみ**です。`*.staging.example.com` のような多階層には対応していません。

### Cloudflare ブランドの有無

Universal SSL では、証明書の CN（コモンネーム）に `sni.cloudflaressl.com` のような Cloudflare のドメインが含まれる場合があります。ACM を使うと、独自ドメインが CN になり Cloudflare ブランドが非表示になります。

---

## ACM が必要なケース

以下のいずれかに該当する場合は ACM の導入を検討してください。

1. **多階層サブドメインを使っている**  
   `api.staging.example.com` や `dev.app.example.com` など、2 階層以上のサブドメインを SSL 化したい場合。

2. **証明書の CN を独自ドメインにしたい**  
   Cloudflare ブランドを証明書から除外したい場合（主に企業サイト・B2B サービス）。

3. **CA や有効期限を指定したい**  
   セキュリティポリシーで特定の CA を使う義務がある場合、または短期証明書（14 日など）を使いたい場合。

4. **Total TLS で全サブドメインを一括保護したい**  
   ゾーン内のすべてのプロキシ済みサブドメインを自動で証明書保護したい場合。

---

## 購入・有効化の手順

Cloudflare ダッシュボードから数ステップで有効化できます。

1. Cloudflare ダッシュボードの対象ドメインを開く
2. **SSL/TLS** → **Edge Certificates** を選択
3. **Advanced Certificate Manager** のセクションで **Enable** をクリック
4. サブスクリプション（$10/月）を確認して購入
5. 証明書を作成し、保護したいホスト名を追加

Total TLS を有効にする場合は、同じ Edge Certificates ページの **Total TLS** セクションで On に切り替えるだけです。

---

## まとめ

| 項目               | Universal SSL（無料） | Advanced Certificate Manager（$10/月/ゾーン） |
| ------------------ | --------------------- | --------------------------------------------- |
| 多階層サブドメイン | ✗                     | ✓                                             |
| CA の選択          | ✗                     | ✓                                             |
| 有効期限指定       | ✗                     | ✓                                             |
| CN が独自ドメイン  | △                     | ✓                                             |
| Total TLS          | ✗                     | ✓                                             |
| 用途               | 個人・一般サイト      | 企業・複雑なサブドメイン構成                  |

Cloudflare の「以前有料だった SSL オプション」は **Advanced Certificate Manager（旧 Dedicated SSL Certificates）** です。無料の Universal SSL で足りないケース——特に多階層サブドメインの保護や証明書の細かい制御が必要な場合——に有効な選択肢です。
