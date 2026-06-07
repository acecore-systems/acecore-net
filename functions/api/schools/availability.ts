import {
  ACTIVE_BOOKING_STATUSES,
  addMinutes,
  getDb,
  getJstWeekday,
  isAllowedRequestOrigin,
  isValidId,
  jsonResponse,
  makeJstDate,
  minutesFromTime,
  optionsResponse,
  timeFromMinutes,
  toJstSlot,
  toPublicCourse,
  toPublicInstructor,
  type AvailabilityRuleRow,
  type BookingRow,
  type CourseRow,
  type InstructorRow,
  type PagesContext,
} from './_shared'

const DEFAULT_DAYS = 21
const MAX_DAYS = 45
const BOOKING_BUFFER_MS = 2 * 60 * 60 * 1000

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
      { ok: false, message: '予約機能を一時的に利用できません。' },
      503,
    )
  }

  const url = new URL(request.url)
  const requestedCourseId = normalizeOptionalId(url.searchParams.get('course'))
  const requestedInstructorId = normalizeOptionalId(
    url.searchParams.get('instructor'),
  )
  const days = normalizeDays(url.searchParams.get('days'))
  const windowEnd = addMinutes(new Date(), days * 24 * 60).toISOString()

  try {
    const [coursesResult, instructorsResult, rulesResult, bookingsResult] =
      await Promise.all([
        db
          .prepare(
            `SELECT *
             FROM school_courses
             WHERE active = 1
             ORDER BY sort_order ASC, title ASC`,
          )
          .all<CourseRow>(),
        db
          .prepare(
            `SELECT *
             FROM school_instructors
             WHERE active = 1
             ORDER BY sort_order ASC, name ASC`,
          )
          .all<InstructorRow>(),
        db
          .prepare(
            `SELECT *
             FROM school_availability_rules
             WHERE active = 1
             ORDER BY weekday ASC, start_time ASC`,
          )
          .all<AvailabilityRuleRow>(),
        db
          .prepare(
            `SELECT id, instructor_id, start_at, status
             FROM school_bookings
             WHERE start_at >= ? AND start_at < ?
               AND status IN (${ACTIVE_BOOKING_STATUSES.map(() => '?').join(',')})`,
          )
          .bind(new Date().toISOString(), windowEnd, ...ACTIVE_BOOKING_STATUSES)
          .all<BookingRow>(),
      ])

    const courses = (coursesResult.results ?? []).filter(
      (course) => !requestedCourseId || course.id === requestedCourseId,
    )
    const instructors = (instructorsResult.results ?? []).filter(
      (instructor) =>
        !requestedInstructorId || instructor.id === requestedInstructorId,
    )
    const courseIds = new Set(courses.map((course) => course.id))
    const instructorIds = new Set(
      instructors.map((instructor) => instructor.id),
    )
    const rules = (rulesResult.results ?? []).filter(
      (rule) =>
        courseIds.has(rule.course_id) && instructorIds.has(rule.instructor_id),
    )

    return jsonResponse({
      ok: true,
      courses: courses.map(toPublicCourse),
      instructors: instructors.map(toPublicInstructor),
      slots: buildSlots(rules, bookingsResult.results ?? [], days),
    })
  } catch (error) {
    console.error('Failed to load school availability:', error)
    return jsonResponse(
      { ok: false, message: '予約枠を読み込めませんでした。' },
      503,
    )
  }
}

export const onRequestOptions = ({ request, env }: PagesContext): Response =>
  optionsResponse(request, env)

function buildSlots(
  rules: AvailabilityRuleRow[],
  bookings: BookingRow[],
  days: number,
) {
  const now = Date.now()
  const bookedCounts = new Map<string, number>()
  for (const booking of bookings) {
    const key = `${booking.instructor_id}:${booking.start_at}`
    bookedCounts.set(key, (bookedCounts.get(key) ?? 0) + 1)
  }

  const slots = []
  for (let offset = 0; offset < days; offset += 1) {
    const date = addMinutes(new Date(), offset * 24 * 60)
    const dateKey = makeJstDate(date)
    const weekday = getJstWeekday(toJstSlot(dateKey, '00:00'))

    for (const rule of rules) {
      if (rule.weekday !== weekday) continue

      const startMinute = minutesFromTime(rule.start_time)
      const endMinute = minutesFromTime(rule.end_time)
      for (
        let minute = startMinute;
        minute + rule.slot_minutes <= endMinute;
        minute += rule.slot_minutes
      ) {
        const slotStart = toJstSlot(dateKey, timeFromMinutes(minute))
        const slotEnd = addMinutes(slotStart, rule.slot_minutes)
        if (slotStart.getTime() <= now + BOOKING_BUFFER_MS) continue

        const startAt = slotStart.toISOString()
        const booked = bookedCounts.get(`${rule.instructor_id}:${startAt}`) ?? 0
        const remaining = Math.max(0, rule.capacity - booked)
        if (remaining <= 0) continue

        slots.push({
          courseId: rule.course_id,
          instructorId: rule.instructor_id,
          startAt,
          endAt: slotEnd.toISOString(),
          remaining,
        })
      }
    }
  }

  return slots.sort((a, b) => a.startAt.localeCompare(b.startAt))
}

function normalizeOptionalId(value: string | null): string {
  const normalized = String(value || '').trim()
  return isValidId(normalized) ? normalized : ''
}

function normalizeDays(value: string | null): number {
  const days = Number(value || DEFAULT_DAYS)
  if (!Number.isFinite(days)) return DEFAULT_DAYS
  return Math.min(Math.max(Math.floor(days), 1), MAX_DAYS)
}
