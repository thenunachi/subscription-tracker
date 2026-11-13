import { differenceInCalendarDays, format } from 'date-fns'
import { STEP, rollForward } from './calc.js'

// Bank descriptions are noisy: "SQ *BLUE BOTTLE 0423", "NETFLIX.COM 866-579-7172 CA".
// Reduce each to a stable key so charges from the same merchant group together.
const PREFIXES = /^(sq|tst|pp|paypal|pos|ach|debit card purchase|recurring payment|purchase)\s*\*?\s*/i

// Location / billing words that tag along after the merchant name.
const NOISE_WORDS = new Set(['usa', 'inc', 'llc', 'ltd', 'bill', 'billing', 'payment', 'help', 'www'])

export function normalizeMerchant(description) {
  let s = description.toLowerCase()
  s = s.replace(PREFIXES, '')
  s = s.replace(/\.(com|net|org|io|co)\b/g, ' ')
  s = s.replace(/[^a-z\s]/g, ' ') // drop digits, *, #, punctuation
  const words = s.split(/\s+/).filter((w) => w && !NOISE_WORDS.has(w) && w.length > 2)
  return words.slice(0, 2).join(' ') // first two words are usually the merchant
}

const titleCase = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase())

const median = (nums) => {
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Accepted gap (in days) between charges for each cycle, and how many charges
// we need to see before trusting it.
const CYCLE_RULES = [
  { cycle: 'weekly', min: 6, max: 8, minCharges: 3 },
  { cycle: 'monthly', min: 26, max: 35, minCharges: 3 },
  { cycle: 'quarterly', min: 85, max: 97, minCharges: 2 },
  { cycle: 'yearly', min: 355, max: 375, minCharges: 2 },
]

const AMOUNT_TOLERANCE = 0.1 // each charge within 10% of the median amount

const CATEGORY_KEYWORDS = {
  Streaming: ['netflix', 'hulu', 'disney', 'hbo', 'max', 'peacock', 'paramount', 'youtube', 'prime video'],
  Music: ['spotify', 'apple music', 'tidal', 'pandora', 'audible'],
  Software: ['adobe', 'microsoft', 'google', 'icloud', 'apple', 'dropbox', 'github', 'notion', 'openai', 'claude'],
  Fitness: ['gym', 'fitness', 'peloton', 'strava', 'classpass', 'equinox'],
  News: ['nyt', 'times', 'nytimes', 'post', 'journal', 'substack', 'economist'],
  Utilities: ['electric', 'energy', 'water', 'gas', 'internet', 'comcast', 'xfinity', 'verizon', 'mobile', 'wireless'],
}

// `text` should be the raw description, which has more clues than the short key.
export function guessCategory(text) {
  const lower = text.toLowerCase()
  for (const [category, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return category
  }
  return 'Other'
}

// transactions: [{ date: Date, description: string, amount: number (positive) }]
// returns suggestions shaped like subscriptions, plus detection details.
export function detectRecurring(transactions, today = new Date()) {
  const groups = new Map()
  for (const t of transactions) {
    const key = normalizeMerchant(t.description)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(t)
  }

  const suggestions = []

  for (const [key, charges] of groups) {
    charges.sort((a, b) => a.date - b.date)

    const gaps = charges.slice(1).map((c, i) => differenceInCalendarDays(c.date, charges[i].date))
    if (gaps.length === 0) continue

    const typicalGap = median(gaps)
    const rule = CYCLE_RULES.find((r) => typicalGap >= r.min && typicalGap <= r.max)
    if (!rule || charges.length < rule.minCharges) continue

    // Every gap must fit the cycle, so random repeat purchases don't qualify.
    if (!gaps.every((g) => g >= rule.min && g <= rule.max)) continue

    const amounts = charges.map((c) => c.amount)
    const typicalAmount = median(amounts)
    if (!amounts.every((a) => Math.abs(a - typicalAmount) <= typicalAmount * AMOUNT_TOLERANCE)) continue

    const last = charges.at(-1)
    const next = rollForward(STEP[rule.cycle](last.date), rule.cycle, today)

    suggestions.push({
      key,
      name: titleCase(key),
      amount: Math.round(last.amount * 100) / 100, // latest price, in case it went up
      cycle: rule.cycle,
      nextRenewal: format(next, 'yyyy-MM-dd'),
      category: guessCategory(last.description),
      usage: 'sometimes',
      occurrences: charges.length,
      firstSeen: charges[0].date,
      lastSeen: last.date,
    })
  }

  return suggestions.sort((a, b) => b.amount - a.amount)
}
