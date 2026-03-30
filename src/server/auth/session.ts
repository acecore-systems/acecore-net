/**
 * セッション管理ユーティリティ
 *
 * セッションの作成・検証・削除を行う。
 * トークンは SHA-256 でハッシュ化して DB に保存し、
 * 平文トークンのみクッキーに渡す。
 */
import { eq, and, gt } from 'drizzle-orm'
import { sessions } from '../../db/schema'
import type { AppDatabase } from '../../db/client'

/** セッションの有効期間（30 日） */
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** セッションクッキー名 */
export const SESSION_COOKIE = 'ace_session'

/**
 * 新しいセッションを作成し、平文トークンを返す
 */
export async function createSession(
  db: AppDatabase,
  userId: string,
): Promise<string> {
  const token = crypto.randomUUID()
  const tokenHash = await sha256(token)
  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)

  await db.insert(sessions).values({ id, userId, tokenHash, expiresAt })

  return token
}

/**
 * トークンからセッションを検証し、userId を返す（無効なら null）
 */
export async function validateSession(
  db: AppDatabase,
  token: string,
): Promise<string | null> {
  const tokenHash = await sha256(token)
  const now = new Date()

  const rows = await db
    .select({ userId: sessions.userId })
    .from(sessions)
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1)

  return rows[0]?.userId ?? null
}

/**
 * トークンに対応するセッションを削除する（サインアウト用）
 */
export async function deleteSession(
  db: AppDatabase,
  token: string,
): Promise<void> {
  const tokenHash = await sha256(token)
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
}

/**
 * SHA-256 ハッシュを Hex 文字列で返す
 */
async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
