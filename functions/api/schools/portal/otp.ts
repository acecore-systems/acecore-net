import {
  createOrUpdateGuardian,
  getDb,
  hmacSha256Hex,
  isAllowedRequestOrigin,
  isValidEmail,
  jsonResponse,
  normalizeEmail,
  normalizeText,
  optionsResponse,
  sendEmail,
  type PagesContext,
} from '../_shared'

type OtpPayload = {
  email?: unknown
  name?: unknown
}

const OTP_TTL_MS = 10 * 60 * 1000

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

  const payload = (await request.json().catch(() => null)) as OtpPayload | null
  const email = normalizeEmail(payload?.email)
  const name = normalizeText(payload?.name) || '保護者'
  if (!isValidEmail(email)) {
    return jsonResponse(
      { ok: false, message: 'メールアドレスを入力してください。' },
      400,
    )
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const secret = String(
    env.SCHOOLS_OTP_SECRET || env.STRIPE_WEBHOOK_SECRET || '',
  )
  const codeHash = await hmacSha256Hex(
    secret || 'acecore-schools-otp',
    `${email}:${code}`,
  )
  const now = new Date()
  const guardianId = await createOrUpdateGuardian(db, { email, name })

  await db
    .prepare(
      `INSERT INTO school_portal_otps (
         id, email, code_hash, expires_at, created_at
       ) VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      email,
      codeHash,
      new Date(now.getTime() + OTP_TTL_MS).toISOString(),
      now.toISOString(),
    )
    .run()

  const delivered = await sendEmail(env, {
    to: email,
    subject: 'Acecore Schools ポータル認証コード',
    html: `<p>Acecore Schools ポータルの認証コードです。</p>
<p style="font-size: 24px; font-weight: 700;">${code}</p>
<p>10分以内に入力してください。</p>`,
  }).catch((error) => {
    console.error('Failed to send portal OTP:', error)
    return false
  })

  return jsonResponse({
    ok: true,
    guardianId,
    delivered,
    message: delivered
      ? '認証コードを送信しました。'
      : '認証コードを発行しました。メール送信設定を確認してください。',
  })
}

export const onRequestOptions = ({ request, env }: PagesContext): Response =>
  optionsResponse(request, env)
