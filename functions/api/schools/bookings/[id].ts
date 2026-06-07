import {
  ACTIVE_BOOKING_STATUSES,
  getDb,
  getJstTime,
  getJstWeekday,
  getPortalSession,
  isAdminRequest,
  isAllowedRequestOrigin,
  jsonResponse,
  minutesFromTime,
  normalizeMessage,
  normalizeText,
  optionsResponse,
  writeAuditLog,
  type AvailabilityRuleRow,
  type BookingRow,
  type PagesContext,
} from '../_shared'

type PatchPayload = {
  action?: unknown
  startAt?: unknown
  endAt?: unknown
  reason?: unknown
}

export const onRequestPatch = async ({
  request,
  env,
  params,
}: PagesContext): Promise<Response> => {
  if (!isAllowedRequestOrigin(request, env)) {
    return jsonResponse({ ok: false, message: 'Invalid request origin.' }, 403)
  }

  const db = getDb(env)
  if (!db) {
    return jsonResponse(
      { ok: false, message: '予約機能を利用できません。' },
      503,
    )
  }

  const bookingId = normalizeText(params?.id, 80)
  const session = await getPortalSession(db, request)
  const isAdmin = isAdminRequest(request, env)
  if (!session && !isAdmin) {
    return jsonResponse({ ok: false, message: 'ログインしてください。' }, 401)
  }

  const booking = await db
    .prepare(
      `SELECT *
       FROM school_bookings
       WHERE id = ?
       LIMIT 1`,
    )
    .bind(bookingId)
    .first<BookingRow>()
  if (!booking) {
    return jsonResponse({ ok: false, message: '予約が見つかりません。' }, 404)
  }
  if (!isAdmin && booking.guardian_id !== session?.guardianId) {
    return jsonResponse({ ok: false, message: '予約が見つかりません。' }, 404)
  }

  const payload = (await request
    .json()
    .catch(() => null)) as PatchPayload | null
  const action = normalizeText(payload?.action, 40)
  const now = new Date().toISOString()

  if (action === 'cancel') {
    if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
      return jsonResponse(
        { ok: false, message: 'この予約はキャンセルできません。' },
        409,
      )
    }

    const reason = normalizeMessage(payload?.reason, 400)
    await db
      .prepare(
        `UPDATE school_bookings
         SET status = 'cancelled', cancel_reason = ?, updated_at = ?
         WHERE id = ?`,
      )
      .bind(reason || null, now, booking.id)
      .run()
    await writeAuditLog(
      db,
      booking.id,
      isAdmin ? 'admin' : 'guardian',
      'cancelled',
      {
        reason,
      },
    )
    return jsonResponse({ ok: true, status: 'cancelled' })
  }

  if (action === 'reschedule') {
    const startAt = new Date(normalizeText(payload?.startAt, 40))
    const endAt = new Date(normalizeText(payload?.endAt, 40))
    if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
      return jsonResponse(
        { ok: false, message: 'この予約は変更できません。' },
        409,
      )
    }
    if (
      !Number.isFinite(startAt.getTime()) ||
      !Number.isFinite(endAt.getTime())
    ) {
      return jsonResponse(
        { ok: false, message: '変更先の枠を選んでください。' },
        400,
      )
    }

    const availability = await assertRescheduleSlotAvailable(
      db,
      booking,
      startAt,
      endAt,
    )
    if (!availability.ok) {
      return jsonResponse({ ok: false, message: availability.message }, 409)
    }

    await db
      .prepare(
        `UPDATE school_bookings
         SET start_at = ?, end_at = ?, status = 'rescheduled', updated_at = ?
         WHERE id = ?`,
      )
      .bind(startAt.toISOString(), endAt.toISOString(), now, booking.id)
      .run()
    await writeAuditLog(
      db,
      booking.id,
      isAdmin ? 'admin' : 'guardian',
      'rescheduled',
      {
        from: booking.start_at,
        to: startAt.toISOString(),
      },
    )
    return jsonResponse({ ok: true, status: 'rescheduled' })
  }

  return jsonResponse({ ok: false, message: '操作を選択してください。' }, 400)
}

export const onRequestOptions = ({ request, env }: PagesContext): Response =>
  optionsResponse(request, env)

async function assertRescheduleSlotAvailable(
  db: NonNullable<ReturnType<typeof getDb>>,
  booking: BookingRow,
  startAt: Date,
  endAt: Date,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const durationMinutes = Math.round(
    (endAt.getTime() - startAt.getTime()) / 60000,
  )
  if (durationMinutes <= 0) {
    return { ok: false, message: '変更先の枠を選んでください。' }
  }
  if (startAt.getTime() <= Date.now() + 2 * 60 * 60 * 1000) {
    return { ok: false, message: '直前の枠には変更できません。' }
  }

  const startTime = getJstTime(startAt)
  const endTime = getJstTime(endAt)
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
    .bind(
      booking.course_id,
      booking.instructor_id,
      getJstWeekday(startAt),
      startTime,
      endTime,
    )
    .first<AvailabilityRuleRow>()

  if (!rule) {
    return { ok: false, message: '変更先の枠は受付対象外です。' }
  }

  const slotOffset =
    minutesFromTime(startTime) - minutesFromTime(rule.start_time)
  if (durationMinutes !== rule.slot_minutes || slotOffset % rule.slot_minutes) {
    return { ok: false, message: '変更先の枠は受付対象外です。' }
  }

  const count = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM school_bookings
       WHERE instructor_id = ? AND start_at = ? AND id <> ?
         AND status IN (${ACTIVE_BOOKING_STATUSES.map(() => '?').join(',')})`,
    )
    .bind(
      booking.instructor_id,
      startAt.toISOString(),
      booking.id,
      ...ACTIVE_BOOKING_STATUSES,
    )
    .first<{ count: number }>()
  if (Number(count?.count || 0) >= rule.capacity) {
    return { ok: false, message: 'この枠は満席です。' }
  }

  return { ok: true }
}
