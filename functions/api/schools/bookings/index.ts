import {
  ACTIVE_BOOKING_STATUSES,
  createOrUpdateGuardian,
  createStudent,
  getDb,
  getJstTime,
  getJstWeekday,
  getSiteUrl,
  isAllowedRequestOrigin,
  isValidEmail,
  isValidId,
  jsonResponse,
  minutesFromTime,
  normalizeEmail,
  normalizeMessage,
  normalizeText,
  optionsResponse,
  sendEmail,
  writeAuditLog,
  type AvailabilityRuleRow,
  type CourseRow,
  type Env,
  type PagesContext,
} from '../_shared'

type BookingPayload = {
  bookingType?: unknown
  courseId?: unknown
  instructorId?: unknown
  startAt?: unknown
  endAt?: unknown
  guardianName?: unknown
  guardianEmail?: unknown
  guardianPhone?: unknown
  studentName?: unknown
  studentGrade?: unknown
  message?: unknown
  locale?: unknown
}

type StripeCheckoutResponse = {
  id?: string
  url?: string
  customer?: string
  error?: { message?: string }
}

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
      { ok: false, message: '予約機能を一時的に利用できません。' },
      503,
    )
  }

  const payload = (await request
    .json()
    .catch(() => null)) as BookingPayload | null
  const validation = validatePayload(payload)
  if (!validation.ok) {
    return jsonResponse({ ok: false, message: validation.message }, 400)
  }

  try {
    const course = await db
      .prepare('SELECT * FROM school_courses WHERE id = ? AND active = 1')
      .bind(validation.courseId)
      .first<CourseRow>()
    if (!course) {
      return jsonResponse(
        { ok: false, message: 'コースが見つかりません。' },
        404,
      )
    }

    const availability = await assertSlotAvailable(db, validation)
    if (!availability.ok) {
      return jsonResponse({ ok: false, message: availability.message }, 409)
    }

    const guardianId = await createOrUpdateGuardian(db, {
      email: validation.guardianEmail,
      name: validation.guardianName,
      phone: validation.guardianPhone,
    })
    const studentId = await createStudent(db, {
      guardianId,
      name: validation.studentName,
      grade: validation.studentGrade,
    })
    const bookingId = crypto.randomUUID()
    const now = new Date().toISOString()
    const initialStatus =
      validation.bookingType === 'enrollment'
        ? 'payment_pending'
        : 'trial_confirmed'

    await db
      .prepare(
        `INSERT INTO school_bookings (
           id, booking_type, status, guardian_id, student_id, course_id,
           instructor_id, start_at, end_at, timezone, guardian_name,
           guardian_email, guardian_phone, student_name, student_grade,
           message, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Asia/Tokyo', ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        bookingId,
        validation.bookingType,
        initialStatus,
        guardianId,
        studentId,
        validation.courseId,
        validation.instructorId,
        validation.startAt,
        validation.endAt,
        validation.guardianName,
        validation.guardianEmail,
        validation.guardianPhone || null,
        validation.studentName,
        validation.studentGrade || null,
        validation.message || null,
        now,
        now,
      )
      .run()
    await writeAuditLog(db, bookingId, 'guardian', 'created', {
      bookingType: validation.bookingType,
      courseId: validation.courseId,
    })

    if (validation.bookingType === 'enrollment') {
      const checkout = await createCheckoutSession(
        request,
        env,
        course,
        bookingId,
        validation,
      )
      await db
        .prepare(
          `UPDATE school_bookings
           SET stripe_checkout_session_id = ?, stripe_customer_id = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(checkout.id || null, checkout.customer || null, now, bookingId)
        .run()

      return jsonResponse({
        ok: true,
        bookingId,
        status: initialStatus,
        checkoutUrl: checkout.url,
      })
    }

    await sendEmail(env, {
      to: validation.guardianEmail,
      subject: 'Acecore Schools 無料体験予約を受け付けました',
      html: buildBookingMailHtml(course.title, validation),
    }).catch((error) =>
      console.error('Failed to send trial booking mail:', error),
    )

    return jsonResponse({ ok: true, bookingId, status: initialStatus }, 201)
  } catch (error) {
    console.error('Failed to create school booking:', error)
    return jsonResponse(
      { ok: false, message: '予約を作成できませんでした。' },
      500,
    )
  }
}

export const onRequestOptions = ({ request, env }: PagesContext): Response =>
  optionsResponse(request, env)

function validatePayload(payload: BookingPayload | null):
  | {
      ok: true
      bookingType: 'trial' | 'enrollment'
      courseId: string
      instructorId: string
      startAt: string
      endAt: string
      guardianName: string
      guardianEmail: string
      guardianPhone: string
      studentName: string
      studentGrade: string
      message: string
      locale: string
    }
  | { ok: false; message: string } {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, message: '入力内容を確認してください。' }
  }

  const bookingType =
    payload.bookingType === 'enrollment' ? 'enrollment' : 'trial'
  const courseId = normalizeText(payload.courseId, 80)
  const instructorId = normalizeText(payload.instructorId, 80)
  const startAt = normalizeText(payload.startAt, 40)
  const endAt = normalizeText(payload.endAt, 40)
  const guardianName = normalizeText(payload.guardianName)
  const guardianEmail = normalizeEmail(payload.guardianEmail)
  const guardianPhone = normalizeText(payload.guardianPhone, 40)
  const studentName = normalizeText(payload.studentName)
  const studentGrade = normalizeText(payload.studentGrade, 80)
  const message = normalizeMessage(payload.message)
  const locale = normalizeText(payload.locale, 16) || 'ja'

  if (!isValidId(courseId) || !isValidId(instructorId)) {
    return { ok: false, message: 'コースまたは講師を選択してください。' }
  }
  if (!guardianName || !studentName || !isValidEmail(guardianEmail)) {
    return { ok: false, message: '保護者情報と受講者情報を入力してください。' }
  }
  if (!Number.isFinite(new Date(startAt).getTime())) {
    return { ok: false, message: '予約枠を選択してください。' }
  }
  if (!Number.isFinite(new Date(endAt).getTime())) {
    return { ok: false, message: '予約枠を選択してください。' }
  }

  return {
    ok: true,
    bookingType,
    courseId,
    instructorId,
    startAt: new Date(startAt).toISOString(),
    endAt: new Date(endAt).toISOString(),
    guardianName,
    guardianEmail,
    guardianPhone,
    studentName,
    studentGrade,
    message,
    locale,
  }
}

async function assertSlotAvailable(
  db: NonNullable<ReturnType<typeof getDb>>,
  booking: {
    courseId: string
    instructorId: string
    startAt: string
    endAt: string
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const start = new Date(booking.startAt)
  const end = new Date(booking.endAt)
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000)
  if (durationMinutes <= 0) {
    return { ok: false, message: '予約枠を選択してください。' }
  }
  if (start.getTime() <= Date.now() + 2 * 60 * 60 * 1000) {
    return { ok: false, message: '直前の枠は予約できません。' }
  }

  const weekday = getJstWeekday(start)
  const startTime = getJstTime(start)
  const endTime = getJstTime(end)
  const rule = await db
    .prepare(
      `SELECT *
       FROM school_availability_rules
       WHERE active = 1
         AND course_id = ?
         AND instructor_id = ?
         AND weekday = ?
         AND start_time <= ?
         AND end_time >= ?
       ORDER BY capacity DESC
       LIMIT 1`,
    )
    .bind(booking.courseId, booking.instructorId, weekday, startTime, endTime)
    .first<AvailabilityRuleRow>()

  if (!rule) {
    return { ok: false, message: '選択した枠は受付対象外です。' }
  }

  const slotOffset =
    minutesFromTime(startTime) - minutesFromTime(rule.start_time)
  if (durationMinutes !== rule.slot_minutes || slotOffset % rule.slot_minutes) {
    return { ok: false, message: '選択した枠は受付対象外です。' }
  }

  const count = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM school_bookings
       WHERE instructor_id = ? AND start_at = ?
         AND status IN (${ACTIVE_BOOKING_STATUSES.map(() => '?').join(',')})`,
    )
    .bind(booking.instructorId, booking.startAt, ...ACTIVE_BOOKING_STATUSES)
    .first<{ count: number }>()

  if (Number(count?.count || 0) >= rule.capacity) {
    return { ok: false, message: 'この枠は満席です。別の枠を選んでください。' }
  }

  return { ok: true }
}

async function createCheckoutSession(
  request: Request,
  env: Env,
  course: CourseRow,
  bookingId: string,
  booking: {
    guardianEmail: string
    guardianName: string
    startAt: string
    locale: string
  },
): Promise<StripeCheckoutResponse> {
  const secretKey = String(env.STRIPE_SECRET_KEY || '').trim()
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.')
  }

  const monthlyPriceId = String(env[course.monthly_price_env_key] || '').trim()
  if (!monthlyPriceId) {
    throw new Error(`${course.monthly_price_env_key} is not configured.`)
  }

  const siteUrl = getSiteUrl(request, env)
  const successUrl = `${siteUrl}/schools/portal/?booking=${bookingId}&checkout=success`
  const cancelUrl = `${siteUrl}/schools/book/?booking=${bookingId}&checkout=cancel`
  const body = new URLSearchParams()
  body.set('mode', 'subscription')
  body.set('customer_email', booking.guardianEmail)
  body.set('success_url', successUrl)
  body.set('cancel_url', cancelUrl)
  body.set('client_reference_id', bookingId)
  body.set('metadata[booking_id]', bookingId)
  body.set('metadata[course_id]', course.id)
  body.set('metadata[start_at]', booking.startAt)
  body.set('subscription_data[metadata][booking_id]', bookingId)
  body.set('line_items[0][price]', monthlyPriceId)
  body.set('line_items[0][quantity]', '1')

  const initialPriceId = String(
    env.STRIPE_PRICE_SCHOOLS_INITIAL_FEE || '',
  ).trim()
  if (initialPriceId) {
    body.set('line_items[1][price]', initialPriceId)
    body.set('line_items[1][quantity]', '1')
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2026-02-25.clover',
    },
    body,
  })
  const result = (await response.json()) as StripeCheckoutResponse
  if (!response.ok || !result.url) {
    throw new Error(result.error?.message || 'Failed to create Checkout.')
  }
  return result
}

function buildBookingMailHtml(
  courseTitle: string,
  booking: { guardianName: string; studentName: string; startAt: string },
): string {
  const start = new Date(booking.startAt).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    dateStyle: 'medium',
    timeStyle: 'short',
  })
  return `<p>${escapeHtml(booking.guardianName)} 様</p>
<p>Acecore Schools の無料体験予約を受け付けました。</p>
<ul>
  <li>コース: ${escapeHtml(courseTitle)}</li>
  <li>受講者: ${escapeHtml(booking.studentName)}</li>
  <li>日時: ${escapeHtml(start)}</li>
</ul>
<p>変更やキャンセルは会員ポータルから行えます。</p>`
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
