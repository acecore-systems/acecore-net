# Sveltia CMS Auth Worker

Cloudflare Workers OAuth client for Sveltia CMS GitHub authentication.

## GitHub OAuth App

Create a GitHub OAuth App with:

- Homepage URL: `https://acecore.net/admin/`
- Authorization callback URL: `https://sveltia-cms-auth.sparkling-tree-7cef.workers.dev/callback`

`ALLOWED_DOMAINS` in `wrangler.jsonc` controls which CMS origins can use this authenticator. Keep `acecore.net` for production, `localhost` entries for local checks, and `*.acecore-net.pages.dev` for Cloudflare Pages previews.

Then set the OAuth app credentials on the Worker:

```powershell
npx wrangler secret put GITHUB_CLIENT_ID --config workers/sveltia-cms-auth/wrangler.jsonc
npx wrangler secret put GITHUB_CLIENT_SECRET --config workers/sveltia-cms-auth/wrangler.jsonc
```

Deploy:

```powershell
npx wrangler deploy --config workers/sveltia-cms-auth/wrangler.jsonc
```
