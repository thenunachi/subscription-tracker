import { addDays, format } from 'date-fns'
import { formatMoney, nextRenewalDate } from './calc.js'

// iCalendar recurrence rule for each billing cycle.
const RRULE = {
  weekly: 'FREQ=WEEKLY',
  monthly: 'FREQ=MONTHLY',
  quarterly: 'FREQ=MONTHLY;INTERVAL=3',
  yearly: 'FREQ=YEARLY',
}

// Text values must escape \ ; , and newlines (RFC 5545 §3.3.11).
const escapeText = (s) =>
  String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')

// Lines longer than 75 octets must be folded: CRLF + one space (RFC 5545 §3.1).
function fold(line) {
  const bytes = new TextEncoder().encode(line)
  if (bytes.length <= 75) return line
  const parts = []
  let current = ''
  let size = 0
  for (const ch of line) {
    const n = new TextEncoder().encode(ch).length
    const limit = parts.length === 0 ? 75 : 74 // continuation lines start with a space
    if (size + n > limit) {
      parts.push(current)
      current = ''
      size = 0
    }
    current += ch
    size += n
  }
  parts.push(current)
  return parts.join('\r\n ')
}

const day = (d) => format(d, 'yyyyMMdd')

// Build an .ics calendar with one all-day repeating event per subscription,
// plus a reminder the day before each renewal.
export function toIcs(subscriptions, today = new Date()) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

  const events = subscriptions.flatMap((s) => {
    const start = nextRenewalDate(s, today)
    const price = `${formatMoney(s.amount)} / ${s.cycle}`
    return [
      'BEGIN:VEVENT',
      `UID:${s.id}@subscription-tracker`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day(start)}`,
      `DTEND;VALUE=DATE:${day(addDays(start, 1))}`,
      `RRULE:${RRULE[s.cycle]}`,
      `SUMMARY:${escapeText(`${s.name} renews (${formatMoney(s.amount)})`)}`,
      `DESCRIPTION:${escapeText(`${s.name}: ${price}. Category: ${s.category}.`)}`,
      'TRANSP:TRANSPARENT', // don't block time on the calendar
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(`${s.name} renews tomorrow`)}`,
      'TRIGGER:-P1D',
      'END:VALARM',
      'END:VEVENT',
    ]
  })

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Subscription Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Subscription renewals',
    ...events,
    'END:VCALENDAR',
  ]
    .map(fold)
    .join('\r\n') + '\r\n'
}
