# Acecore CMSのAcecoreID移行

ログインはAcecoreIDだけ。権限は従来どおり、このrepositoryへのGitHub push権限とする。ユーザー一覧を固定化せず、team・organizationの基本権限・ownerも含む現在のcollaboratorを数値IDで照合する。GitHub名の変更やメール一致を認可根拠にしない。

## 本番切替前の条件

2026-09-14追補: Portalの復旧結果を横展開。連携数値IDから現在のGitHubユーザーを解決し、個別のrepository permission応答のID・login一致とwrite/adminを検証する。古いAccess情報は同一サイト限定の「ログイン情報を更新」で再取得でき、未連携時は本人のAcecoreID設定への導線を示す。欠落claimのfull identity補完は同一Access主体・account・IdPを検証し、不正値や不一致を救済しない。GitHub新形式tokenのdotを許容するが、個人token・改行・過大値は拒否する。本番は未切替。

1. AcecoreID PR #56を反映する。AccessのAcecoreID IdPで `https://acecore.net/claims/subject` と `https://acecore.net/claims/github-id` をapp tokenの `custom` へ文字列として伝搬する。
2. 全既存編集者が本人のGitHubをAcecoreIDに連携し、現在のpush権限で同じ許可結果になることを確認する。共通管理者やHatt entitlementを新たに与えない。
3. サイトのAccess appをAcecoreIDのみへ設定し、画面と `/admin/api/*` を保護する。専用app audienceを `CMS_ACCESS_AUD`、team URLを `CMS_ACCESS_TEAM_DOMAIN`、本番hostだけをカンマ区切りで `CMS_ACCESS_HOSTNAMES` に設定する。他サイトaudienceを共用しない。previewにはwriter鍵を設定しない。
4. 専用GitHub AppのContents:write・Metadata:read、対象repository限定とbranch保護を維持する。権限照会にもこのAppを使用する。コードの本番反映より前に照会成功を確認する。
5. GitHub連携deploy後、新規AcecoreIDログイン、read API、許可外ユーザー拒否、権限取消後の保存拒否を確認する。Accessの旧セッションを再認証させ、旧OAuth Workerの利用元が他にないことを確認して廃止する。

`auth_methods: [pat]` はSveltiaの内部sign-in bootstrap用。ブラウザには固定sentinelしか渡さず、サーバーはAuthorizationを認証根拠にしない。新しい独自セッションやログイン経路は追加しない。署名・issuer・audience・exp・iat・sub・app種別を検証し、書込みはOrigin完全一致を必須にする。

ローカルテストの成功は本番移行完了ではない。上記条件が未確認の間はdraftを維持する。

参照: [GitHub collaborator一覧](https://docs.github.com/en/rest/collaborators/collaborators#list-repository-collaborators)、[Access app token](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)。
