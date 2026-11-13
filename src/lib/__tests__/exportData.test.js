import { describe, expect, it } from 'vitest'
import Papa from 'papaparse'
import { parseBackup, toBackupJson, toCsv } from '../exportData.js'

const subs = [
  { id: 'a', name: 'Netflix', amount: 15.49, cycle: 'monthly', nextRenewal: '2026-12-03', category: 'Streaming', usage: 'often' },
  { id: 'b', name: 'Gym, "Pool" & Spa', amount: 40, cycle: 'quarterly', nextRenewal: '2027-01-01', category: 'Fitness', usage: 'rarely' },
]

describe('toCsv', () => {
  it('writes a header and quotes awkward values so they parse back', () => {
    const csv = toCsv(subs)
    expect(csv.split('\r\n')[0]).toBe('name,amount,cycle,nextRenewal,category,usage')
    const back = Papa.parse(csv, { header: true }).data
    expect(back[1].name).toBe('Gym, "Pool" & Spa')
  })

  it('leaves out internal ids', () => {
    expect(toCsv(subs)).not.toContain(',a,')
  })
})

describe('backup round trip', () => {
  it('restores exactly what was exported', () => {
    expect(parseBackup(toBackupJson(subs))).toEqual(subs)
  })

  it('accepts a bare array too', () => {
    expect(parseBackup(JSON.stringify(subs))).toEqual(subs)
  })
})

describe('parseBackup', () => {
  const one = (overrides) => JSON.stringify([{ ...subs[0], ...overrides }])

  it('fills in defaults for missing optional fields', () => {
    const [s] = parseBackup(one({ id: undefined, category: undefined, usage: 'sometimesish' }))
    expect(s.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(s.category).toBe('Other')
    expect(s.usage).toBe('sometimes')
  })

  it('converts a string amount to a number', () => {
    expect(parseBackup(one({ amount: '9.99' }))[0].amount).toBe(9.99)
  })

  it.each([
    ['not JSON', 'nope', 'not valid JSON'],
    ['no list', '{"x":1}', 'No subscriptions'],
    ['missing name', one({ name: '  ' }), 'missing name'],
    ['zero amount', one({ amount: 0 }), 'invalid amount'],
    ['bad cycle', one({ cycle: 'daily' }), 'unknown cycle'],
    ['bad date', one({ nextRenewal: '12/03/2026' }), 'YYYY-MM-DD'],
  ])('rejects %s', (_, input, message) => {
    expect(() => parseBackup(input)).toThrow(message)
  })
})
