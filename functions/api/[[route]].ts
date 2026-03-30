/**
 * Hono API エントリポイント（Cloudflare Pages Functions）
 *
 * /api 以下のすべてのリクエストを Hono アプリケーションへ委譲する。
 */
import { app } from '../../src/server/app'
import type { Env } from '../types'

export const onRequest: PagesFunction<Env> = async (context) => {
  return app.fetch(context.request, context.env)
}
