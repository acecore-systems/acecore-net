/**
 * API キャッチオールエンドポイント
 *
 * /api 以下のすべてのリクエストを Hono アプリケーションへ委譲する。
 * Cloudflare Workers 環境では cloudflare:workers から環境変数を取得する。
 */
export const prerender = false

import type { APIRoute } from 'astro'
import { app } from '../../server/app'

export const ALL: APIRoute = async ({ request }) => {
  const { env } = await import('cloudflare:workers')
  return app.fetch(request, { DATABASE_URL: (env as any).DATABASE_URL })
}
