import { describe, expect, it } from 'vitest'
import {
  byCategory,
  cancelCandidates,
  monthlyTotal,
  nextRenewalDate,
  renewingSoon,
  toMonthly,
  toYearly,
  yearlyTotal,
} from '../calc.js'

// Local dates only: new Date('2026-11-13') would be UTC midnight and can land
// on the previous day in US time zones.
const TODAY = new Date(2026, 10, 13) // Nov 13, 2026

const sub = (overrides) => ({
  id: crypto.randomUUID(),
  name: 'Test',
  amount: 10,
  cycle: 'monthly',
  nextRenewal: '2026-12-01',
  category: 'Other',
  usage: 'often',
  ...overrides,
})

describe('toMonthly / toYearly', () => {
  it('converts each cycle', () => {
    expect(toMonthly(10, 'monthly')).toBe(10)
    expect(toMonthly(120, 'yearly')).toBe(10)
    expect(toMonthly(30, 'quarterly')).toBe(10)
    expect(toYearly(10, 'monthly')).toBe(120)
  })

  it('uses 52 weeks a year, not 4 weeks a month', () => {
    expect(toMonthly(10, 'weekly')).toBeCloseTo(43.33, 2)
    expect(toYearly(10, 'weekly')).toBe(520)
  })
})

describe('totals', () => {
  const subs = [sub({ amount: 15 }), sub({ amount: 120, cycle: 'yearly' })]

  it('sums everything as monthly and yearly', () => {
    expect(monthlyTotal(subs)).toBe(25)
    expect(yearlyTotal(subs)).toBe(300)
  })

  it('is zero for no subscriptions', () => {
    expect(monthlyTotal([])).toBe(0)
  })
})

describe('nextRenewalDate', () => {
  it('keeps a future date as is', () => {
    expect(nextRenewalDate(sub({ nextRenewal: '2026-12-01' }), TODAY)).toEqual(new Date(2026, 11, 1))
  })

  it('keeps today as today', () => {
    expect(nextRenewalDate(sub({ nextRenewal: '2026-11-13' }), TODAY)).toEqual(TODAY)
  })

  it('rolls a past monthly date forward', () => {
    expect(nextRenewalDate(sub({ nextRenewal: '2026-09-03' }), TODAY)).toEqual(new Date(2026, 11, 3))
  })

  it('rolls a past weekly date forward', () => {
    // Oct 1 + 7 weeks = Nov 19
    expect(nextRenewalDate(sub({ cycle: 'weekly', nextRenewal: '2026-10-01' }), TODAY)).toEqual(
      new Date(2026, 10, 19),
    )
  })

  it('rolls a past yearly date forward', () => {
    expect(nextRenewalDate(sub({ cycle: 'yearly', nextRenewal: '2024-03-10' }), TODAY)).toEqual(
      new Date(2027, 2, 10),
    )
  })
})

describe('renewingSoon', () => {
  const subs = [
    sub({ name: 'Later', nextRenewal: '2026-11-20' }), // 7 days
    sub({ name: 'Too late', nextRenewal: '2026-11-21' }), // 8 days
    sub({ name: 'Today', nextRenewal: '2026-11-13' }),
    sub({ name: 'Rolled', cycle: 'weekly', nextRenewal: '2026-10-01' }), // -> Nov 19, 6 days
  ]

  it('includes renewals within the window, soonest first', () => {
    const result = renewingSoon(subs, 7, TODAY)
    expect(result.map((s) => [s.name, s.daysLeft])).toEqual([
      ['Today', 0],
      ['Rolled', 6],
      ['Later', 7],
    ])
  })
})

describe('byCategory', () => {
  it('groups monthly spend by category, largest first', () => {
    const subs = [
      sub({ category: 'Music', amount: 10 }),
      sub({ category: 'Streaming', amount: 15 }),
      sub({ category: 'Streaming', amount: 120, cycle: 'yearly' }),
    ]
    expect(byCategory(subs)).toEqual([
      { category: 'Streaming', monthly: 25 },
      { category: 'Music', monthly: 10 },
    ])
  })
})

describe('cancelCandidates', () => {
  it('returns only rarely used subscriptions, most expensive per month first', () => {
    const subs = [
      sub({ name: 'Used', usage: 'often', amount: 99 }),
      sub({ name: 'Cheap', usage: 'rarely', amount: 5 }),
      sub({ name: 'Pricey', usage: 'rarely', amount: 5, cycle: 'weekly' }),
    ]
    expect(cancelCandidates(subs).map((s) => s.name)).toEqual(['Pricey', 'Cheap'])
  })
})
