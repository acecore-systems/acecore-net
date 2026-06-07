import {
  getDb,
  getPortalSession,
  hmacSha256Hex,
  isAllowedRequestOrigin,
  isValidEmail,
  jsonResponse,
  normalizeEmail,
  normalizeText,
  optionsResponse,
  sha256Hex,
  toPublicBooking,
  type BookingRow,
  type PagesContext,
} from '../_shared'

type SessionPayload = {
  email?: unknown
  code?: unknown
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const onRequestPost = async ({
  request,
  env,
}: PagesContext): Promise<Response> => {
  if (!isAllowedRequestOrigin(request, env)) {
    return jsonResponse({ ok: false, message: 'Invalid request origin.' }, 403)
  }

  const db = getDb(env)
  if (!db) {
    return jsonResponse(
      { ok: false, message: 'ポータルを利用できません。' },
      503,
    )
  }

  const payload = (await request
    .json()
    .catch(() => null)) as SessionPayload | null
  const email = normalizeEmail(payload?.email)
  const code = normalizeText(payload?.code, 12)
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return jsonResponse(
      { ok: false, message: '認証コードを確認してください。' },
      400,
    )
  }

  const secret = String(
    env.SCHOOLS_OTP_SECRET || env.STRIPE_WEBHOOK_SECRET || '',
  )
  const codeHash = await hmacSha256Hex(
    secret || 'acecore-schools-otp',
    `${email}:${code}`,
  )
  const now = new Date()
  const otp = await db
    .prepare(
      `SELECT id
       FROM school_portal_otps
       WHERE email = ? AND code_hash = ? AND expires_at > ? AND consumed_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .bind(email, codeHash, now.toISOString())
    .first<{ id: string }>()

  if (!otp) {
    return jsonResponse(
      { ok: false, message: '認証コードが正しくありません。' },
      401,
    )
  }

  const guardian = await db
    .prepare('SELECT id, name FROM school_guardian_accounts WHERE email = ?')
    .bind(email)
    .first<{ id: string; name: string }>()
  if (!guardian) {
    return jsonResponse(
      { ok: false, message: 'アカウントが見つかりません。' },
      404,
    )
  }

  await db
    .prepare('UPDATE school_portal_otps SET consumed_at = ? WHERE id = ?')
    .bind(now.toISOString(), otp.id)
    .run()

  const token = crypto.randomUUID() + crypto.randomUUID()
  const tokenHash = await sha256Hex(token)
  await db
    .prepare(
      `INSERT INTO school_portal_sessions (
         id, guardian_id, email, token_hash, expires_at, created_at, last_seen_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      guardian.id,
      email,
      tokenHash,
      new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
      now.toISOString(),
      now.toISOString(),
    )
    .run()

  return jsonResponse({
    ok: true,
    token,
    account: { email, name: guardian.name },
  })
}

export const onRequestGet = async ({
  request,
  env,
}: PagesContext): Promise<Response> => {
  if (!isAllowedRequestOrigin(request, env)) {
    return jsonResponse({ ok: false, message: 'Invalid request origin.' }, 403)
  }

  const db = getDb(env)
  if (!db) {
    return jsonResponse(
      { ok: false, message: 'ポータルを利用できません。' },
      503,
    )
  }

  const session = await getPortalSession(db, request)
  if (!session) {
    return jsonResponse({ ok: false, message: 'ログインしてください。' }, 401)
  }

  const account = await db
    .prepare(
      `SELECT id, email, name, phone, stripe_customer_id
       FROM school_guardian_accounts
       WHERE id = ?`,
    )
    .bind(session.guardianId)
    .first<{
      id: string
      email: string
      name: string
      phone: string | null
      stripe_customer_id: string | null
    }>()
  const bookings = await db
    .prepare(
      `SELECT b.*, c.title AS course_title, i.name AS instructor_name
       FROM school_bookings b
       JOIN school_courses c ON c.id = b.course_id
       JOIN school_instructors i ON i.id = b.instructor_id
       WHERE b.guardian_id = ?
       ORDER BY b.start_at DESC
       LIMIT 50`,
    )
    .bind(session.guardianId)
    .all<BookingRow>()

  return jsonResponse({
    ok: true,
    account: account
      ? {
          email: account.email,
          name: account.name,
          phone: account.phone,
          hasStripeCustomer: Boolean(account.stripe_customer_id),
        }
      : { email: session.email },
    bookings: (bookings.results ?? []).map(toPublicBooking),
  })
}

export const onRequestOptions = ({ request, env }: PagesContext): Response =>
  optionsResponse(request, env)
