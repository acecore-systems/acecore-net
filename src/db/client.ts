/**
 * Drizzle + Neon DB クライアント
 *
 * Cloudflare Workers ランタイムで Neon サーバーレスドライバーを使い、
 * リクエストごとに軽量な DB インスタンスを生成する。
 */
import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

/**
 * DATABASE_URL を受け取り Drizzle クライアントを返す
 */
export function createDb(databaseUrl: string) {
  const sql = neon(databaseUrl)
  return drizzle(sql, { schema })
}

export type AppDatabase = ReturnType<typeof createDb>
