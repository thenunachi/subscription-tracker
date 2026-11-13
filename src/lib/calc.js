import { addMonths, addWeeks, addYears, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns'

// How many times each cycle bills per year.
const PER_YEAR = { weekly: 52, monthly: 12, quarterly: 4, yearly: 1 }

export const STEP = {
  weekly: (d) => addWeeks(d, 1),
  monthly: (d) => addMonths(d, 1),
  quarterly: (d) => addMonths(d, 3),
  yearly: (d) => addYears(d, 1),
}

export const toYearly = (amount, cycle) => amount * PER_YEAR[cycle]
export const toMonthly = (amount, cycle) => toYearly(amount, cycle) / 12

export const monthlyTotal = (subs) =>
  subs.reduce((sum, s) => sum + toMonthly(s.amount, s.cycle), 0)

export const yearlyTotal = (subs) =>
  subs.reduce((sum, s) => sum + toYearly(s.amount, s.cycle), 0)

// A stored renewal date may already be in the past; roll it forward by its
// cycle until it is today or later.
export function rollForward(date, cycle, today = new Date()) {
  const start = startOfDay(today)
  while (date < start) date = STEP[cycle](date)
  return date
}

export const nextRenewalDate = (sub, today = new Date()) =>
  rollForward(parseISO(sub.nextRenewal), sub.cycle, today)

// Subscriptions renewing within `days` days, soonest first.
export function renewingSoon(subs, days = 7, today = new Date()) {
  return subs
    .map((s) => {
      const date = nextRenewalDate(s, today)
      return { ...s, date, daysLeft: differenceInCalendarDays(date, today) }
    })
    .filter((s) => s.daysLeft <= days)
    .sort((a, b) => a.daysLeft - b.daysLeft)
}

// Monthly spend per category, largest first: [{ category, monthly }]
export function byCategory(subs) {
  const totals = {}
  for (const s of subs) {
    totals[s.category] = (totals[s.category] ?? 0) + toMonthly(s.amount, s.cycle)
  }
  return Object.entries(totals)
    .map(([category, monthly]) => ({ category, monthly }))
    .sort((a, b) => b.monthly - a.monthly)
}

// Rarely used subscriptions, most expensive first.
export const cancelCandidates = (subs) =>
  subs
    .filter((s) => s.usage === 'rarely')
    .sort((a, b) => toMonthly(b.amount, b.cycle) - toMonthly(a.amount, a.cycle))

const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' })
export const formatMoney = (n) => money.format(n)
