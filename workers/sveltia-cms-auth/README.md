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
