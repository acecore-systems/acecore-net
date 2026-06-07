export type D1PreparedStatement = {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>
  run(): Promise<unknown>
}

export type D1Database = {
  prepare(query: string): D1PreparedStatement
}

export type Env = {
  COMMENTS_DB?: D1Database
  RESEND_API_KEY?: string
  SCHOOLS_EMAIL_FROM?: string
  SCHOOLS_SITE_URL?: string
  SCHOOLS_ALLOWED_HOSTNAMES?: string
  SCHOOLS_OTP_SECRET?: string
  SCHOOLS_ADMIN_TOKEN?: string
  STRIPE_SECRET_KEY?: string
  STRIPE_WEBHOOK_SECRET?: string
  STRIPE_PRICE_SCHOOLS_INITIAL_FEE?: string
  STRIPE_CUSTOMER_PORTAL_RETURN_URL?: string
  [key: string]: unknown
}

export type PagesContext = {
  request: Request
  env: Env
  params?: Record<string, string>
}

export type CourseRow = {
  id: string
  title: string
  summary: string
  target: string
  recommended_age: string
  frequency: string
  price_label: string
  monthly_price_env_key: string
  active: number
  sort_order: number
}

export type InstructorRow = {
  id: string
  name: string
  email: string | null
  calendar_token: string
  active: number
  sort_order: number
}

export type AvailabilityRuleRow = {
  id: string
  instructor_id: string
  course_id: string
  weekday: number
  start_time: string
  end_time: string
  slot_minutes: number
  capacity: number
}

export type BookingRow = {
  id: string
  booking_type: string
  status: string
  guardian_id: string
  student_id: string
  course_id: string
  instructor_id: string
  start_at: string
  end_at: string
  timezone: string
  guardian_name: string
  guardian_email: string
  guardian_phone: string | null
  student_name: string
  student_grade: string | null
  message: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  course_title?: string
  instructor_name?: string
}

export const ACTIVE_BOOKING_STATUSES = [
  'trial_confirmed',
  'payment_pending',
  'active',
  'rescheduled',
]

const DEFAULT_ALLOWED_HOSTNAMES = [
  'acecore.net',
  'www.acecore.net',
  'acecore-net.pages.dev',
  'localhost',
  '127.0.0.1',
]

const encoder = new TextEncoder()

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

export function textResponse(
  body: string,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

export function optionsResponse(request: Request, env: Env): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': getCorsOrigin(request, env),
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept, Authorization, Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  })
}

export function getDb(env: Env): D1Database | null {
  return env.COMMENTS_DB ?? null
}

export function getSiteUrl(request: Request, env: Env): string {
  const configured = String(env.SCHOOLS_SITE_URL || '').trim()
  if (configured) return configured.replace(/\/$/, '')
  return new URL(request.url).origin
}

export function isAllowedRequestOrigin(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin')
  if (!origin) return true

  try {
    const originUrl = new URL(origin)
    const requestUrl = new URL(request.url)
    if (originUrl.hostname === requestUrl.hostname) return true
    return getAllowedHostnames(env).some((hostname) =>
      matchesAllowedHostname(originUrl.hostname.toLowerCase(), hostname),
    )
  } catch {
    return false
  }
}

export function getCorsOrigin(request: Request, env: Env): string {
  const origin = request.headers.get('Origin')
  if (!origin) return 'https://acecore.net'
  return isAllowedRequestOrigin(request, env) ? origin : 'https://acecore.net'
}

export function normalizeEmail(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .slice(0, 254)
}

export function normalizeText(value: unknown, maxLength = 160): string {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export function normalizeMessage(value: unknown, maxLength = 1000): string {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim()
    .slice(0, maxLength)
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function isValidId(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,80}$/.test(value)
}

export function toPublicCourse(row: CourseRow) {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    target: row.target,
    recommendedAge: row.recommended_age,
    frequency: row.frequency,
    priceLabel: row.price_label,
  }
}

export function toPublicInstructor(row: InstructorRow) {
  return {
    id: row.id,
    name: row.name,
  }
}

export function toPublicBooking(row: BookingRow) {
  return {
    id: row.id,
    bookingType: row.booking_type,
    status: row.status,
    courseId: row.course_id,
    courseTitle: row.course_title,
    instructorId: row.instructor_id,
    instructorName: row.instructor_name,
    startAt: row.start_at,
    endAt: row.end_at,
    timezone: row.timezone,
    studentName: row.student_name,
    studentGrade: row.student_grade,
    message: row.message,
    hasStripeSubscription: Boolean(row.stripe_subscription_id),
  }
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return bytesToHex(new Uint8Array(digest))
}

export async function hmacSha256Hex(
  secret: string,
  value: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
  return bytesToHex(new Uint8Array(signature))
}

export function getBearerToken(request: Request): string {
  const value = request.headers.get('Authorization') || ''
  return value.startsWith('Bearer ') ? value.slice('Bearer '.length).trim() : ''
}

export async function getPortalSession(
  db: D1Database,
  request: Request,
): Promise<{ guardianId: string; email: string } | null> {
  const token = getBearerToken(request)
  if (!token) return null
  const tokenHash = await sha256Hex(token)
  const now = new Date().toISOString()
  const session = await db
    .prepare(
      `SELECT guardian_id, email
       FROM school_portal_sessions
       WHERE token_hash = ? AND expires_at > ?
       LIMIT 1`,
    )
    .bind(tokenHash, now)
    .first<{ guardian_id: string; email: string }>()

  if (!session) return null

  await db
    .prepare(
      `UPDATE school_portal_sessions
       SET last_seen_at = ?
       WHERE token_hash = ?`,
    )
    .bind(now, tokenHash)
    .run()

  return { guardianId: session.guardian_id, email: session.email }
}

export function isAdminRequest(request: Request, env: Env): boolean {
  const token = getBearerToken(request)
  const expected = String(env.SCHOOLS_ADMIN_TOKEN || '').trim()
  return Boolean(token && expected && token === expected)
}

export function makeJstDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getJstWeekday(date: Date): number {
  const value = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    weekday: 'short',
  }).format(date)
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(value)
}

export function getJstTime(date: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Tokyo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )
  return `${parts.hour}:${parts.minute}`
}

export function toJstSlot(dateKey: string, time: string): Date {
  return new Date(`${dateKey}T${time}:00+09:00`)
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

export function minutesFromTime(time: string): number {
  const [hour, minute] = time.split(':').map((part) => Number(part))
  return hour * 60 + minute
}

export function timeFromMinutes(value: number): string {
  const hour = Math.floor(value / 60)
  const minute = value % 60
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export async function createOrUpdateGuardian(
  db: D1Database,
  payload: {
    email: string
    name: string
    phone?: string
    stripeCustomerId?: string
  },
): Promise<string> {
  const now = new Date().toISOString()
  const existing = await db
    .prepare('SELECT id FROM school_guardian_accounts WHERE email = ? LIMIT 1')
    .bind(payload.email)
    .first<{ id: string }>()

  if (existing) {
    await db
      .prepare(
        `UPDATE school_guardian_accounts
         SET name = ?, phone = COALESCE(NULLIF(?, ''), phone),
             stripe_customer_id = COALESCE(NULLIF(?, ''), stripe_customer_id),
             updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        payload.name,
        payload.phone || '',
        payload.stripeCustomerId || '',
        now,
        existing.id,
      )
      .run()
    return existing.id
  }

  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO school_guardian_accounts (
         id, email, name, phone, stripe_customer_id, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      payload.email,
      payload.name,
      payload.phone || null,
      payload.stripeCustomerId || null,
      now,
      now,
    )
    .run()

  return id
}

export async function createStudent(
  db: D1Database,
  payload: {
    guardianId: string
    name: string
    grade?: string
  },
): Promise<string> {
  const now = new Date().toISOString()
  const existing = await db
    .prepare(
      `SELECT id
       FROM school_students
       WHERE guardian_id = ? AND name = ? AND COALESCE(grade, '') = ?
       LIMIT 1`,
    )
    .bind(payload.guardianId, payload.name, payload.grade || '')
    .first<{ id: string }>()

  if (existing) {
    await db
      .prepare('UPDATE school_students SET updated_at = ? WHERE id = ?')
      .bind(now, existing.id)
      .run()
    return existing.id
  }

  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO school_students (
         id, guardian_id, name, grade, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, payload.guardianId, payload.name, payload.grade || null, now, now)
    .run()

  return id
}

export async function writeAuditLog(
  db: D1Database,
  bookingId: string,
  actorType: string,
  action: string,
  detail?: unknown,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO school_booking_audit_logs (
         id, booking_id, actor_type, action, detail, created_at
       ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      bookingId,
      actorType,
      action,
      detail ? JSON.stringify(detail) : null,
      new Date().toISOString(),
    )
    .run()
}

export async function sendEmail(
  env: Env,
  payload: { to: string; subject: string; html: string },
): Promise<boolean> {
  const apiKey = String(env.RESEND_API_KEY || '').trim()
  const from = String(env.SCHOOLS_EMAIL_FROM || 'Acecore <noreply@acecore.net>')
  if (!apiKey) return false

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    }),
  })

  return response.ok
}

function getAllowedHostnames(env: Env): string[] {
  const configured = String(env.SCHOOLS_ALLOWED_HOSTNAMES || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
  return configured.length > 0 ? configured : DEFAULT_ALLOWED_HOSTNAMES
}

function matchesAllowedHostname(hostname: string, allowed: string): boolean {
  if (hostname === allowed) return true
  if (allowed === 'localhost' || allowed === '127.0.0.1') return false
  return hostname.endsWith(`.${allowed}`)
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
