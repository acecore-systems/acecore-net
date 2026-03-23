---
title: 'Zoho Mail から KAGOYA MAIL への移行ガイド ― DNS・認証・データ棚卸しの実践記録'
description: 'Zoho Workplace から KAGOYA MAIL へメールサービスを移行した際の手順・DNS設定・SPF/DKIM認証・Zoho Workplace 全体のデータ棚卸しまで、実践ベースで解説します。'
date: 2026-03-16
author: gui
tags: ['技術', 'メール', 'DNS', 'インフラ']
image: https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=800&h=400&fit=crop&q=80
processFigure:
  title: 移行作業の全体フロー
  steps:
    - title: KAGOYA 準備
      description: ドメイン追加・メールアカウント作成。
      icon: i-lucide-server
    - title: メールデータ移行
      description: Zoho からエクスポート → KAGOYA へ IMAP インポート。
      icon: i-lucide-hard-drive-download
    - title: DNS 切り替え
      description: MX・SPF・DKIM を KAGOYA 向けに変更。
      icon: i-lucide-globe
    - title: 認証テスト
      description: SPF・DKIM の PASS を確認し、送受信テスト。
      icon: i-lucide-shield-check
    - title: Zoho データ棚卸し
      description: Workplace 全サービスの残存データを取捨選択。
      icon: i-lucide-clipboard-check
    - title: Zoho 解約
      description: サブスクリプションをキャンセル。
      icon: i-lucide-log-out
callout:
  type: warning
  title: DNS 切り替え時の注意
  text: MX レコード変更後、旧サーバーにメールが届く期間が数時間〜最大48時間発生します。Cloudflare 管理なら TTL を2分に短縮してから切り替えると影響を最小化できます。
compareTable:
  title: 移行前後の構成比較
  before:
    label: Zoho Workplace Standard
    items:
      - Zoho Mail（30GB プラン）
      - WorkDrive / Cliq / Calendar 等がバンドル（Nextcloud 移行後は未使用）
      - 月額 ¥1,440（3ユーザー・ユーザー課金）
      - SPF は include:zoho.jp
      - DKIM は zmail._domainkey
  after:
    label: KAGOYA MAIL ブロンズ
    items:
      - KAGOYA MAIL（仮想専用・専用IP）
      - メール専用サーバー、ユーザー数無制限
      - 月額 ¥3,300（年払い ¥2,640）
      - SPF は include:kagoya.net
      - DKIM は kagoya._domainkey
checklist:
  title: 移行チェックリスト
  items:
    - text: KAGOYA でドメイン追加・アカウント作成
      checked: true
    - text: Zoho メールデータを ZIP エクスポート
      checked: true
    - text: KAGOYA へ IMAP インポート
      checked: true
    - text: Cloudflare DNS で MX レコード切り替え
      checked: true
    - text: SPF レコードを kagoya.net に変更
      checked: true
    - text: DKIM レコードを kagoya._domainkey に変更
      checked: true
    - text: DMARC ポリシーを設定
      checked: true
    - text: 送受信テスト・SPF/DKIM PASS 確認
      checked: true
    - text: Zoho Workplace 全サービスのデータ棚卸し
      checked: true
    - text: Zoho サブスクリプション解約
      checked: true
faq:
  title: よくある疑問
  items:
    - question: メール移行中にメールが届かなくなる期間はある？
      answer: DNS の TTL を短く設定していれば、数分〜数時間程度です。Cloudflare 管理の場合は TTL 2分に設定してから切り替えると影響を最小化できます。旧サーバー側も数日はチェックしましょう。
    - question: Zoho のメールデータはどうやってエクスポートする？
      answer: Zoho Mail の管理画面 → データの管理 → メールボックスのエクスポートから、アカウントごとに ZIP 形式でエクスポートできます。EML 形式のファイルが含まれます。
    - question: SPF と DKIM を両方設定しないとどうなる？
      answer: 受信側のメールサーバーが迷惑メールと判定する確率が上がります。特にGmailは厳しく、SPF・DKIM 両方の PASS が求められるケースが増えています。
    - question: Zoho Workplace を解約するとデータはどうなる？
      answer: 有料プランの期限が切れると無料プランに移行します。無料プランにもストレージ制限があるため、必要なデータは事前にエクスポートしておくべきです。アカウント自体を削除するとすべてのデータが失われます。
---

Zoho Workplace から別のメールサービスへ移行したいけど、DNS やメール認証の設定が不安――そんな方に向けた実践的な移行ガイドです。この記事では Zoho Mail から KAGOYA MAIL への移行を例に、DNS 切り替え・SPF/DKIM 認証・旧サービスのデータ棚卸しまでの手順を解説します。

## こんなケースに当てはまりませんか？

Zoho Workplace は Mail・WorkDrive・Cliq・Calendar など多くのサービスがバンドルされたグループウェアです。しかし、こんな状況になっていないでしょうか：

- メール機能しか使っていないのに、グループウェア全体の料金を払っている
- ファイルストレージは別サービス（Nextcloud、Google Drive など）に移行済み
- ユーザー数が増えるたびに課金が増える料金体系が負担

こうした場合、メール専用サービスへの移行が選択肢になります。

## なぜ KAGOYA MAIL か

KAGOYA MAIL はメール専用の法人向けサービスです。移行先として検討する際のポイントは以下の通りです：

- **メール専用の仮想専用サーバー・専用IP** — WordPress 等のWebサーバーと同居しないため、メールの到達率や安定性が高い
- **ユーザー数無制限の定額制** — Zoho のようなユーザー課金ではないため、アカウントを気兼ねなく追加できる
- **国内サーバー**で法人利用の実績が豊富、SPF/DKIM/DMARC 標準対応
- IMAP/SMTP 対応で、既存のメールクライアントをそのまま使える

ブロンズプランは月額 ¥3,300（年払い ¥2,640）。Zoho Workplace Standard（3ユーザーで月額 ¥1,440）と比べると単純なコストは上がりますが、メール専用環境・専用IP・ユーザー数無制限という構成を考えれば、メールの信頼性への投資として検討する価値があります。

## STEP 1：移行先の準備

KAGOYA コントロールパネルで独自ドメインを追加し、メールアカウントを作成します。

1. **ドメイン設定 → 独自ドメイン追加**でドメインを登録
2. デフォルト配信設定は「エラー扱いにする」（存在しないアドレス宛の処理）
3. 必要なメールアカウントを作成

## STEP 2：Zoho メールデータのエクスポート

Zoho Mail の管理画面から、アカウントごとにメールデータをエクスポートします。

1. **管理画面 → データの管理 → メールボックスのエクスポート**へ移動
2. 対象アカウントを選択してエクスポートを開始
3. ZIP ファイルが生成されたらダウンロード

ZIP には EML 形式のメールファイルが含まれます。アカウント数やメール量によっては数十分かかることもあるので、時間に余裕をもって実行してください。

## STEP 3：IMAP インポート

エクスポートした EML ファイルを移行先の IMAP サーバーにインポートします。手作業だと大変なので、Python スクリプトで自動化するのがおすすめです。

```python
import imaplib
import email
import glob

# KAGOYA IMAP 接続
imap = imaplib.IMAP4_SSL("メールサーバー名", 993)
imap.login("アカウント名", "パスワード")
imap.select("INBOX")

# EML ファイルを一括アップロード
for eml_path in glob.glob("export/**/*.eml", recursive=True):
    with open(eml_path, "rb") as f:
        msg = f.read()
    imap.append("INBOX", None, None, msg)

imap.logout()
```

## STEP 4：DNS 切り替え

メールの配送先を切り替えるために、DNS レコードを変更します。ここでは Cloudflare を例にしていますが、他の DNS サービスでも設定する内容は同じです。

### MX レコード

Zoho の MX レコード（`mx.zoho.jp` / `mx2.zoho.jp` / `mx3.zoho.jp`）を削除し、移行先のメールサーバーを登録します。KAGOYA MAIL の場合は以下の通りです。

| 種別 | 名前 | 値 | 優先度 |
|---|---|---|---|
| MX | （自分のドメイン） | dmail.kagoya.net | 10 |

### SPF レコード

```
v=spf1 include:kagoya.net ~all
```

旧 `include:zoho.jp` を `include:kagoya.net` に変更します。

### DKIM レコード

KAGOYA コントロールパネルの **DKIM 設定**から公開鍵を取得し、TXT レコードとして登録します。

| 種別 | 名前 | 値 |
|---|---|---|
| TXT | kagoya._domainkey.（自分のドメイン） | v=DKIM1;k=rsa;p=（公開鍵） |

旧 `zmail._domainkey`（Zoho 用）は削除します。

### DMARC レコード

```
v=DMARC1; p=quarantine; rua=mailto:（レポート先）
```

ポリシーを `none` から `quarantine` に上げておくと、なりすまし防止が強化されます。

## STEP 5：送受信テスト

DNS 切り替え後、必ず以下の4点を確認します。

1. **外部から受信できるか** — Gmail 等から送信してみる
2. **外部へ送信できるか** — KAGOYA からGmail 等に送信
3. **SPF PASS** — 受信メールのヘッダーで `spf=pass` を確認
4. **DKIM PASS** — 受信メールのヘッダーで `dkim=pass` を確認

メールヘッダーの確認は Python で自動化できます。特に SPF/DKIM の PASS 確認は目視だと見落としやすいので、スクリプトで抽出するのが確実です。

```python
import imaplib
import email

imap = imaplib.IMAP4_SSL("メールサーバー名", 993)
imap.login("アカウント名", "パスワード")
imap.select("INBOX")
_, data = imap.search(None, "ALL")

for num in data[0].split()[-3:]:  # 最新3通
    _, msg_data = imap.fetch(num, "(RFC822)")
    msg = email.message_from_bytes(msg_data[0][1])
    auth = msg.get("Authentication-Results", "")
    print(f"Subject: {msg['Subject']}")
    print(f"Auth: {auth[:200]}")
    print()

imap.logout()
```

## STEP 6：旧サービスのデータ棚卸し

Zoho Workplace はメール以外にも WorkDrive・Cliq・Calendar・Contacts など多数のサービスがバンドルされています。解約前に、各サービスにデータが残っていないか確認しましょう。

### 確認すべきサービスと判断基準

| サービス | 確認ポイント |
|---|---|
| Zoho Mail | 移行先にインポート済みか |
| Zoho WorkDrive | ストレージ使用量が 0 か。ゴミ箱も含めて確認 |
| Zoho Contacts | 連絡先の件数。必要なら CSV/VCF でエクスポート |
| Zoho Calendar | 予定やリマインダーの有無 |
| Zoho Cliq | チャット履歴の要否 |
| その他（Notebook, Writer, Sheet 等） | 作成したドキュメントの有無 |

### WorkDrive の落とし穴：ゴミ箱がストレージを食う

見落としやすいのが WorkDrive のゴミ箱です。たとえば弊社のケースでは、管理画面のストレージ使用量が約 45GB と表示されていたのに、フォルダーを開くと「項目はありません」と表示されました。

原因は、**全データがチームフォルダーのゴミ箱に残っていた**こと。以前 Nextcloud にファイルを移行した際に削除したデータが、ゴミ箱として残り続けていたのです。

管理画面のストレージ表示はゴミ箱内のデータも含みます。「容量を使っている＝退避が必要」とは限らないので、ゴミ箱の中身まで確認してから判断してください。

## STEP 7：Zoho サブスクリプション解約

データの棚卸しが完了し、移行先での送受信に問題がなければ解約に進みます。

1. **Zoho Mail 管理画面 → サブスクリプション管理 → 概要**を開く
2. **サブスクリプション管理**リンクから Zoho Store へ移動
3. **プランを変更する**をクリック
4. ページ最下部の **サブスクリプションをキャンセルする** をクリック
5. 理由を選択して **無料プランに変更する** を確定

「現在の請求期間の終了時に自動的にダウングレードする」にチェックが入っていれば、期間終了まで有料プランの機能が使え、その後自動的に無料プランに移行します。万が一の切り戻しに備えて、すぐに削除せず無料プランで様子を見る期間を設けるのがおすすめです。

## まとめ

1. **DNS の TTL を事前に短縮**しておくと、切り替え時の影響を最小化できる
2. **SPF・DKIM は両方必須**。片方だけでは Gmail 等でスパム判定されるリスクがある
3. **旧サービスのデータ棚卸しは"見えてるけど要らない"に注意**。ゴミ箱やバージョン履歴がストレージを食っているケースがある
4. **解約前に領収書・請求書を保存**しておく。アカウントを削除すると取得できなくなる
5. **「安いから」ではなく「何を分離すべきか」で判断する**。メールはビジネスの生命線なので、専用環境に投資する価値がある

メールサービスの移行は DNS やメール認証など触れる範囲が広く、心理的なハードルが高い作業です。しかし、やることは MX・SPF・DKIM・DMARC の4種類のレコードを正しく設定するだけ。この記事の手順を参考に、一つずつ確認しながら進めてみてください。
