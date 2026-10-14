# お問い合わせメール送信Worker

Pagesの問い合わせAPIは入力・origin・Turnstile・送信回数を検証してから、Service BindingでこのWorkerを呼びます。Workerは入力項目を再検証し、固定の社内通知先と入力された受付メール宛先へ1通ずつ送ります。9言語の文面、差出人、返信先、HTMLフォームの戻り先を維持します。

Cloudflare Email Serviceのネイティブ`send_email` bindingを使うため、送信APIキー・Secrets Store項目・Worker間共有キーは不要です。差出人はbindingでも`noreply@acecore.net`に限定します。宛先は本文で指定できる汎用メールAPIではなく、お問い合わせの通知・受付という固定用途です。

`workers_dev`と`preview_urls`は無効、公開routeはありません。previewとproductionは別Workerへ接続します。Cloudflareアカウント内でこのサービスへのbindingを作成できる管理者は信頼境界に含まれます。

## 障害時の動作

- bindingが未設定、または送信に失敗した場合はエラーで終了し、Pagesの旧メールAPIキーへ切り替えません。
- 通知送信後に受付メールが失敗する場合を含め、自動再送は行いません。送信の部分成功は従来と同じ扱いです。
- 送信先・問い合わせ本文・providerのエラー詳細をアプリのログやエラー応答に出しません。Email Service側の既存ログ設定は変更しません。
- `E_RATE_LIMIT_EXCEEDED`と`E_DAILY_LIMIT_EXCEEDED`は429、送信元設定などの問題は503、その他の送信障害は500になります。

## 検証

```sh
npm run types:contact-email
npm run types:cloudflare
npm run test:contact-email
npm run test:contact
npm run typecheck:contact-email
npm run typecheck:functions
npm run check:contact-email
npm run check:pages-config
npm run validate:content
npm run build
```

`test:contact-email`はNodeの単体テストと、実workerdのService Binding・ローカルEmail bindingによる合成メールの連携テストを実行します。リモートメールbindingは使用せず、実メールは送信しません。互換日付はlockfileのworkerdが対応する`2026-09-10`で検証しています。

## 配信順序

1. `acecore.net`が現在のアカウントでEmail Sendingに設定され、既存の差出人を利用できることを確認します。DNS・宛先・送信料金体系を新設しません。
2. レビュー・検証済みcommitから以下を実行し、2 Workerの配信version・送信bindingの差出人制限・公開URL無効を確認します。既存Pagesはまだ変更しません。
3. PRをmainへ統合し、GitHub連携のPages build成功、canonical commit、production/previewのService Bindingの接続先を確認します。Worker作成前にPagesの参照先を切り替えないでください。
4. 公開フォーム、未許可origin、無効入力、無効Turnstile、内部Workerの不正要求を確認します。確認のための実送信は行いません。

```sh
npm run deploy:contact-email:preview
npm run deploy:contact-email:production
```

Pagesにある旧`CLOUDFLARE_EMAIL_API_TOKEN`は復旧用に保持します。コピー・再発行・削除は不要です。復旧時は直前の正常なPages deploymentを戻して旧コードを使います。Workerの公開URLやエラー時の自動fallbackを有効にする方法は使いません。

この変更はメール送信処理から既存キーへの依存をなくすもので、Secrets Storeの登録数を増やす変更ではありません。

## 公式仕様

- [Workers API](https://developers.cloudflare.com/email-service/api/send-emails/workers-api/)
- [送信bindingの制限](https://developers.cloudflare.com/email-service/configuration/send-bindings/)
- [送信ドメイン設定後の宛先・上限](https://developers.cloudflare.com/email-service/platform/limits/)
