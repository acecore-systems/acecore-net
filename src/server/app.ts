/**
 * Hono API アプリケーション
 *
 * 認証・プロフィール API のルーティングを定義する。
 * Cloudflare Workers のバインディングを Bindings 型で受け取る。
 */
import { Hono } from 'hono'
import { createDb, type AppDatabase } from '../db/client'
import {
  verifyPassword,
  createSession,
  validateSession,
  deleteSession,
  SESSION_COOKIE,
} from './auth'
import { users, profiles, roles } from '../db/schema'
import { eq } from 'drizzle-orm'

type Bindings = {
  DATABASE_URL: string
}

export const app = new Hono<{ Bindings: Bindings }>().basePath('/api')

/* ------------------------------------------------------------------ */
/*  認証 API                                                          */
/* ------------------------------------------------------------------ */

/**
 * POST /api/auth/sign-in
 * メールアドレスとパスワードで認証し、セッションクッキーを発行する。
 */
app.post('/auth/sign-in', async (c) => {
  let body: { email?: string; password?: string } | undefined
  try {
    body = await c.req.json<{ email?: string; password?: string }>()
  } catch {
    return c.json(
      { error: 'リクエストボディは有効な JSON である必要があります' },
      400,
    )
  }

  const { email, password } = body ?? {}

  if (!email || !password) {
    return c.json({ error: 'email と password は必須です' }, 400)
  }

  const db = createDb(c.env.DATABASE_URL)
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  const user = rows[0]

  if (!user || user.status !== 'active') {
    return c.json({ error: '認証に失敗しました' }, 401)
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    return c.json({ error: '認証に失敗しました' }, 401)
  }

  const token = await createSession(db, user.id)

  const isSecure = new URL(c.req.url).protocol === 'https:'
  const cookie = [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${30 * 24 * 60 * 60}`,
    ...(isSecure ? ['Secure'] : []),
  ].join('; ')

  return c.json({ ok: true }, 200, { 'Set-Cookie': cookie })
})

/**
 * POST /api/auth/sign-out
 * セッションを破棄し、クッキーをクリアする。
 */
app.post('/auth/sign-out', async (c) => {
  const cookieHeader = c.req.header('Cookie') ?? ''
  const token = parseCookie(cookieHeader, SESSION_COOKIE)

  if (token) {
    const db = createDb(c.env.DATABASE_URL)
    await deleteSession(db, token)
  }

  const clearCookie = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ].join('; ')

  return c.json({ ok: true }, 200, { 'Set-Cookie': clearCookie })
})

/**
 * GET /api/auth/session
 * 現在のセッション状態を返す。
 */
app.get('/auth/session', async (c) => {
  const cookieHeader = c.req.header('Cookie') ?? ''
  const token = parseCookie(cookieHeader, SESSION_COOKIE)

  if (!token) {
    return c.json({ authenticated: false })
  }

  const db = createDb(c.env.DATABASE_URL)
  const userId = await validateSession(db, token)

  if (!userId) {
    return c.json({ authenticated: false })
  }

  return c.json({ authenticated: true, userId })
})

/* ------------------------------------------------------------------ */
/*  プロフィール API                                                   */
/* ------------------------------------------------------------------ */

/**
 * GET /api/me
 * ログイン中のユーザー情報を返す。
 */
app.get('/me', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const userId = await authenticateRequest(c, db)
  if (!userId) {
    return c.json({ error: '認証が必要です' }, 401)
  }

  const userRows = await db
    .select({
      id: users.id,
      email: users.email,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const profileRows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1)

  const roleRows = await db
    .select({ role: roles.role })
    .from(roles)
    .where(eq(roles.userId, userId))

  return c.json({
    user: userRows[0] ?? null,
    profile: profileRows[0] ?? null,
    roles: roleRows.map((r) => r.role),
  })
})

/**
 * PATCH /api/me/profile
 * ログイン中のユーザーのプロフィールを更新する。
 */
app.patch('/me/profile', async (c) => {
  const db = createDb(c.env.DATABASE_URL)
  const userId = await authenticateRequest(c, db)
  if (!userId) {
    return c.json({ error: '認証が必要です' }, 401)
  }

  let body: {
    displayName?: string
    avatarUrl?: string
    phone?: string
    bio?: string
  }
  try {
    body = await c.req.json<{
      displayName?: string
      avatarUrl?: string
      phone?: string
      bio?: string
    }>()
  } catch {
    return c.json({ error: 'リクエストボディが不正な JSON です' }, 400)
  }

  const now = new Date()

  await db
    .insert(profiles)
    .values({
      userId,
      displayName: body.displayName ?? null,
      avatarUrl: body.avatarUrl ?? null,
      phone: body.phone ?? null,
      bio: body.bio ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        ...(body.displayName !== undefined && {
          displayName: body.displayName,
        }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.bio !== undefined && { bio: body.bio }),
        updatedAt: now,
      },
    })

  const updated = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1)

  return c.json({ profile: updated[0] })
})

/* ------------------------------------------------------------------ */
/*  ヘルパー                                                          */
/* ------------------------------------------------------------------ */

/**
 * リクエストからセッショントークンを取得し、ユーザー ID を返す
 */
async function authenticateRequest(
  c: { req: { header: (name: string) => string | undefined } },
  db: AppDatabase,
): Promise<string | null> {
  const cookieHeader = c.req.header('Cookie') ?? ''
  const token = parseCookie(cookieHeader, SESSION_COOKIE)
  if (!token) return null

  return validateSession(db, token)
}

/**
 * Cookie ヘッダーから指定キーの値を取り出す
 */
function parseCookie(header: string, name: string): string | undefined {
  const match = header
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`))
  return match?.slice(name.length + 1)
}
