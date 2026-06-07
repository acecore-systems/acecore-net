import {
  getDb,
  textResponse,
  type BookingRow,
  type InstructorRow,
  type PagesContext,
} from '../_shared'

export const onRequestGet = async ({
  env,
  params,
}: PagesContext): Promise<Response> => {
  const db = getDb(env)
  const token = String(params?.token || '').trim()
  if (!db || !/^[a-zA-Z0-9_-]{8,120}$/.test(token)) {
    return textResponse('Calendar not found.', 404)
  }

  const instructor = await db
    .prepare(
      `SELECT *
       FROM school_instructors
       WHERE calendar_token = ? AND active = 1
       LIMIT 1`,
    )
    .bind(token)
    .first<InstructorRow>()

  if (!instructor) return textResponse('Calendar not found.', 404)

  const now = new Date()
  const rows = await db
    .prepare(
      `SELECT b.*, c.title AS course_title, i.name AS instructor_name
       FROM school_bookings b
       JOIN school_courses c ON c.id = b.course_id
       JOIN school_instructors i ON i.id = b.instructor_id
       WHERE b.instructor_id = ?
         AND b.status NOT IN ('cancelled', 'rejected')
         AND b.start_at >= ?
       ORDER BY b.start_at ASC
       LIMIT 200`,
    )
    .bind(instructor.id, now.toISOString())
    .all<BookingRow>()

  return textResponse(buildIcs(instructor, rows.results ?? []), 200, {
    'Content-Type': 'text/calendar; charset=utf-8',
  })
}

function buildIcs(instructor: InstructorRow, bookings: BookingRow[]): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Acecore//Schools Booking//JA',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcs(`Acecore Schools ${instructor.name}`)}`,
    'X-WR-TIMEZONE:Asia/Tokyo',
  ]

  for (const booking of bookings) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${booking.id}@acecore.net`,
      `DTSTAMP:${formatIcsDate(new Date())}`,
      `DTSTART:${formatIcsDate(new Date(booking.start_at))}`,
      `DTEND:${formatIcsDate(new Date(booking.end_at))}`,
      `SUMMARY:${escapeIcs(`${booking.course_title || booking.course_id} / ${booking.student_name}`)}`,
      `DESCRIPTION:${escapeIcs(`種別: ${booking.booking_type}\n状態: ${booking.status}\n変更はAcecore Schoolsポータルで行ってください。`)}`,
      'END:VEVENT',
    )
  }

  lines.push('END:VCALENDAR')
  return `${lines.join('\r\n')}\r\n`
}

function formatIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z')
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}
