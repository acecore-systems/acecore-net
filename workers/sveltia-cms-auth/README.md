# Sveltia CMS Auth Worker

Cloudflare Workers OAuth client for Sveltia CMS GitHub authentication.

Worker 本体は TypeScript（`src/index.ts`）です。`worker-configuration.d.ts` は
`wrangler.jsonc` から生成します。リポジトリルートで再生成・検査する手順は次のとおりです。

```powershell
npm run types:cms-auth
npm run typecheck:cms-auth
npm run test:cms-auth
```

## GitHub OAuth App

Create a GitHub OAuth App with:

- Homepage URL: `https://acecore.net/admin/`
- Authorization callback URL: `https://sveltia-cms-auth.sparkling-tree-7cef.workers.dev/callback`

`ALLOWED_DOMAINS` in `wrangler.jsonc` controls which CMS origins can use this authenticator. Keep `acecore.net` for production, `localhost` entries for local checks, and `*.acecore-net.pages.dev` only for preview login and UI checks. The OAuth Worker verifies the editor but is not the repository writer. Cloudflare Pages previews must not receive any `CMS_GITHUB_APP_*` writer credential, so repository reads and saves remain disabled there.

認証開始時に正規化・許可済みの CMS origin と CSRF token を HttpOnly cookie に束縛し、callback は同じ opener と origin にだけ OAuth 結果を返します。

`wrangler.jsonc` の `secrets.required` には必要な secret 名だけを宣言します。値は Worker の secret として保持し、`wrangler types` はその名前を型へ生成し、deploy 前に不足を検証します。

Then set the OAuth app credentials on the Worker:

```powershell
npx wrangler secret put GITHUB_CLIENT_ID --config workers/sveltia-cms-auth/wrangler.jsonc
npx wrangler secret put GITHUB_CLIENT_SECRET --config workers/sveltia-cms-auth/wrangler.jsonc
```

Deploy:

```powershell
npx wrangler deploy --config workers/sveltia-cms-auth/wrangler.jsonc
```

## Secrets Storeへの移行

コピー元は本番Worker `sveltia-cms-auth` の `GITHUB_CLIENT_SECRET`、宛先は
Acecoreアカウントの既存Store `f59c889c0fcc405794a34401fb09240c` 内の
`sveltia-cms-auth-github-client-secret`（scope: `workers`）。新binding名は
`GITHUB_CLIENT_SECRET_STORE`。`GITHUB_CLIENT_ID` は公開識別子なので対象外です。

2026-09-12に元キーの存在と1024 bytes以内を保護previewで真偽だけ確認しました。
コピー・本番切替は未実施です。対象と宛先の承認後、同じ値をコピーし、保護preview内で
旧値との一致だけを確認します。値やProviderの例外をログ・ファイルへ出力しません。

Storeは許可済みの認証開始とCSRF検証後のcallbackで1回だけ読みます。取得失敗や空値は
`MISCONFIGURED_CLIENT` として処理し、旧キーへfallbackしたりGitHubへ送信したりしません。
要求をまたぐキャッシュを置かないため、次の要求で変更が反映されます。

### 共有認証の既存設定を保持する

本番はAcecore、Hatt、Aceserver Portalと許可済みpreview/localhostから参照されます。
`ALLOWED_DOMAINS` と `GITHUB_SCOPE` はdashboardで管理し、configの `vars` には宣言しません。
`keep_vars: true` だけではconfigに明記した値の上書きを防げません。宣言を省くことで、
共有Workerの既存値を保持します。新規Workerでは配信前に許可サイトを設定してください。

本番ではhostname形式と `https://hatt.acecore.net/admin/` のようなURL形式が
明示的に許可されています。既存allowlistと入力の一致を検証してからoriginへ変換し、
userinfo・query・fragment・不許可path/HTTP originは拒否します。許可リストを自動で広げません。

### 切替・復旧の確認

- 検査済みPRをマージし、上記Worker configから反映します。静的Pagesの配信とは別経路です。
- 本番の既知versionは `ba7a5a0b-5b20-4c5f-a131-22217e6a7fe3`（2026-09-12確認）。
  切替直前にも再取得し、変更があれば差分を確認して復旧基点を更新します。
- 本番は古い単純CSRF cookie、現在のmainはoriginに束縛したJSON cookieです。
  mainにある認証修正も同時に反映されるため、移行前後の両形式の許可site IDを検証し、
  切替中の進行中ログインは再開始が必要になる場合があることを切替記録へ残します。
- 配信versionとStore binding、旧値一致、既存3サイトの認証開始302、不許可originの拒否を確認します。
  本番のGitHubログインや実コード交換は確認目的で実行しません。合成fixtureでcallbackとopenerの制約を検証します。
- 失敗時は記録したWorker versionへ戻します。旧Worker SecretとStore項目は、復旧確認前に削除しません。
