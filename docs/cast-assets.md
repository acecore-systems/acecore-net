# 人物素材の利用と固定リリース

このサイトでは、公開を承認された Acecore Cast の人物素材を、サービスや学習テーマを説明するイメージとして使います。実在の社員・受講生・顧客の紹介や体験談には使いません。人物の近くにAI生成の表示を置き、[素材の説明](https://cast.acecore.net/)へ案内します。

成人男性のみ本人同意に基づくAI派生素材で、ほかの人物は合成キャラクターです。このサイトへの表示許諾は、第三者の再配布・販売・学習利用の許諾を意味しません。元写真、非公開の生成記録、同意の証拠、秘密値はこのリポジトリに含めません。

## 固定している情報

- `src/data/cast-release.json`: このサイトのorigin、リリース、公開manifest・catalogのURLとSHA-256、使用する画像のURL・ID・寸法・SHA-256。
- `vendor/cast/v1.0.0/consumer-manifest.json`: 公開HTTPで照合するconsumer manifestの固定スナップショット。公開用allowlist情報のみ。
- 画像は公開された、バージョンと内容ハッシュを含むimmutable URLを直接参照します。private repository、submodule、R2 token、build-timeの認証には依存しません。

`npm run validate:cast` は固定manifestのハッシュ、利用先、表示権限、画像の登録情報とimmutable URLをオフラインで照合します。通常のbuildでも実行するため、ビルド時のネットワーク接続は不要です。`npm run test:cast` は改変・誤登録の拒否を確認します。

`npm run validate:cast -- --remote` は公開manifest・catalogを取得して固定ハッシュと照合し、選択した正面画像を取得してSHA-256とWebP署名を確認します。公開直後、更新時、デプロイ前に実行します。HTTP失敗や不一致は公開未確認として扱い、検証を弱めて通しません。

## 更新

1. 素材サイトの現行説明・撤回情報と、利用先の許諾を確認します。新しい人物や未承認画像を推測で追加しません。
2. 公開済みリリースのconsumer manifestとcatalogを取得し、同じ公開リリースの正面画像を選びます。`latest`や可変URLを使用しません。
3. 公開manifestの生バイトを新しい`vendor/cast/<version>/consumer-manifest.json`へ保存し、登録ファイルのリリース・URL・SHA-256・選択画像を同じPRで更新します。既存バージョンの内容は書き換えません。
4. `npm run validate:cast -- --remote`、`npm run test:cast`、`npm run build`、変更ファイルのPrettier check、`git diff --check`を実行します。各サイト固有のcontent/i18n検証とデスクトップ・モバイルの表示確認も行います。
5. branch/PR/CIとGitHub連携デプロイで反映します。画像や表示上の説明だけを、固定情報と別に差し替えません。

## 撤回・停止

素材サイトまたは権利者から利用停止が通知された場合は、対象画像を使うカード・人物表示を取り下げるPRを優先し、GitHub連携デプロイと必要なキャッシュ失効で非表示を確認します。版付きURLの内容を上書きしたり、未承認画像へ自動でフォールバックしたりしません。表示を外す際は登録ファイルとこの検証の適用箇所も同じ変更で整理します。

停止の通知元、対象ID、確認時刻、反映commit・本番確認を作業記録に残します。非公開の同意証拠や一時認証URLを作業記録・PRへ転載しません。
