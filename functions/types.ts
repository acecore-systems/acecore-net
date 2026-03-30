/**
 * Cloudflare Pages Functions 用の型定義
 *
 * wrangler が functions/ ディレクトリをビルドする際に使用する。
 */

/** Cloudflare Pages の環境バインディング */
export interface Env {
  DATABASE_URL: string
}

/**
 * Cloudflare Pages Functions の EventContext
 */
export type CFContext = EventContext<Env, string, unknown>
