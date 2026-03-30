/**
 * マイページ認証ミドルウェア（Cloudflare Pages Functions）
 *
 * /mypage 以下へのアクセス時にセッションクッキーを検証し、
 * 未認証ユーザーを /login へリダイレクトする。
 */
import { createDb } from '../../src/db/client'
import { validateSession, SESSION_COOKIE } from '../../src/server/auth'
import type { Env } from '../types'

export const onRequest: PagesFunction<Env> = async (context) => {
  const cookieHeader = context.request.headers.get('Cookie') ?? ''
  const token = parseCookie(cookieHeader, SESSION_COOKIE)

  if (!token) {
    return Response.redirect(new URL('/login', context.request.url), 302)
  }

  const db = createDb(context.env.DATABASE_URL)
  const userId = await validateSession(db, token)

  if (!userId) {
    return Response.redirect(new URL('/login', context.request.url), 302)
  }

  return context.next()
}

function parseCookie(header: string, name: string): string | undefined {
  const match = header
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${name}=`))
  return match?.slice(name.length + 1)
}
