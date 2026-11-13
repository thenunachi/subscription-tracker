import { describe, expect, it } from 'vitest'
import { toIcs } from '../ics.js'

const TODAY = new Date(2026, 10, 13)
const sub = (overrides) => ({
  id: 'abc',
  name: 'Netflix',
  amount: 15.49,
  cycle: 'monthly',
  nextRenewal: '2026-12-03',
  category: 'Streaming',
  usage: 'often',
  ...overrides,
})

const lines = (ics) => ics.split('\r\n')

describe('toIcs', () => {
  it('wraps events in a calendar with CRLF line endings', () => {
    const ics = toIcs([sub()], TODAY)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n')
  })

  it('creates an all-day repeating event with a day-before alarm', () => {
    const l = lines(toIcs([sub()], TODAY))
    expect(l).toContain('UID:abc@subscription-tracker')
    expect(l).toContain('DTSTART;VALUE=DATE:20261203')
    expect(l).toContain('DTEND;VALUE=DATE:20261204')
    expect(l).toContain('RRULE:FREQ=MONTHLY')
    expect(l).toContain('SUMMARY:Netflix renews ($15.49)')
    expect(l).toContain('TRIGGER:-P1D')
  })

  it.each([
    ['weekly', 'FREQ=WEEKLY'],
    ['quarterly', 'FREQ=MONTHLY;INTERVAL=3'],
    ['yearly', 'FREQ=YEARLY'],
  ])('maps %s to %s', (cycle, rule) => {
    expect(lines(toIcs([sub({ cycle })], TODAY))).toContain(`RRULE:${rule}`)
  })

  it('starts from the next renewal when the stored date is in the past', () => {
    expect(lines(toIcs([sub({ nextRenewal: '2026-09-03' })], TODAY))).toContain('DTSTART;VALUE=DATE:20261203')
  })

  it('escapes commas and semicolons in text', () => {
    expect(toIcs([sub({ name: 'A; B, C' })], TODAY)).toContain('SUMMARY:A\\; B\\, C renews')
  })

  it('folds long lines to at most 75 bytes, including multibyte characters', () => {
    const name = 'Ünïcödé — '.repeat(10).trim()
    const ics = toIcs([sub({ name })], TODAY)
    for (const line of lines(ics)) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75)
    }
    // Unfolding (remove CRLF + space) gives back the original text.
    expect(ics.replace(/\r\n /g, '')).toContain(`SUMMARY:${name} renews`)
  })

  it('makes an empty but valid calendar for no subscriptions', () => {
    expect(lines(toIcs([], TODAY)).filter(Boolean).at(-1)).toBe('END:VCALENDAR')
  })
})
