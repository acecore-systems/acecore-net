# Sveltia CMS Auth Worker

Cloudflare Workers OAuth client for Sveltia CMS GitHub authentication.

## GitHub OAuth App

Create a GitHub OAuth App with:

- Homepage URL: `https://acecore.net/admin/`
- Authorization callback URL: `https://sveltia-cms-auth.sparkling-tree-7cef.workers.dev/callback`

Then set the OAuth app credentials on the Worker:

```powershell
npx wrangler secret put GITHUB_CLIENT_ID --config workers/sveltia-cms-auth/wrangler.jsonc
npx wrangler secret put GITHUB_CLIENT_SECRET --config workers/sveltia-cms-auth/wrangler.jsonc
```

Deploy:

```powershell
npx wrangler deploy --config workers/sveltia-cms-auth/wrangler.jsonc
```
