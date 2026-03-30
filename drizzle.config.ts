/**
 * Drizzle Kit 設定
 *
 * マイグレーション生成・適用に使用する。
 * DATABASE_URL は環境変数から取得する。
 */
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
