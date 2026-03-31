/// <reference types="astro/client" />

/**
 * Cloudflare Workers 環境変数の型定義
 */
interface CloudflareEnv {
  DATABASE_URL: string
}

declare module 'cloudflare:workers' {
  const env: CloudflareEnv
  export { env }
}
