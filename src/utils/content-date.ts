const CONTENT_DATETIME_COMPONENT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:(Z)|([+-])(\d{2}):(\d{2}))?$/
const LOCAL_DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/
const BLOG_TIMEZONE_OFFSET = '+09:00'

export function normalizeContentDateValue(value: string) {
  const raw = value.trim()
  return LOCAL_DATETIME_PATTERN.test(raw)
    ? `${raw}${BLOG_TIMEZONE_OFFSET}`
    : raw
}

export function isValidContentDateValue(value: string) {
  const raw = value.trim()
  const match = raw.match(CONTENT_DATETIME_COMPONENT_PATTERN)

  if (!match) return false

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6] ?? 0)
  const offsetHour = Number(match[9] ?? 0)
  const offsetMinute = Number(match[10] ?? 0)
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ]

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth[month - 1] ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  ) {
    return false
  }

  return !Number.isNaN(Date.parse(normalizeContentDateValue(raw)))
}
