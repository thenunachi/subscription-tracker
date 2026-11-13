import { readFileSync } from 'node:fs'
import { addDays, addMonths } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { guessColumns, parseCsv, toTransactions } from '../csv.js'
import { detectRecurring, guessCategory, normalizeMerchant } from '../detectRecurring.js'

const TODAY = new Date(2026, 10, 13)

// Build `count` charges starting at `start`, stepping with `step(date, i)`.
const series = (description, amount, start, count, step) =>
  Array.from({ length: count }, (_, i) => ({
    description,
    amount: typeof amount === 'function' ? amount(i) : amount,
    date: step(start, i),
  }))

const monthly = (d, i) => addMonths(d, i)
const weekly = (d, i) => addDays(d, i * 7)

describe('normalizeMerchant', () => {
  it.each([
    ['NETFLIX.COM 866-579-7172 CA', 'netflix'],
    ['SPOTIFY USA 8774', 'spotify'],
    ['SQ *BLUE BOTTLE COFFEE 450', 'blue bottle'],
    ['APPLE.COM/BILL ICLOUD', 'apple icloud'],
    ['PLANET FITNESS #0421', 'planet fitness'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeMerchant(input)).toBe(expected)
  })

  it('maps different transaction numbers to the same key', () => {
    expect(normalizeMerchant('SQ *BLUE BOTTLE 0423')).toBe(normalizeMerchant('SQ *BLUE BOTTLE 9981'))
  })
})

describe('guessCategory', () => {
  it('uses keywords from the full description', () => {
    expect(guessCategory('NETFLIX.COM')).toBe('Streaming')
    expect(guessCategory('CON EDISON ELECTRIC')).toBe('Utilities')
    expect(guessCategory('SOMETHING ELSE')).toBe('Other')
  })
})

describe('detectRecurring', () => {
  it('detects a monthly charge and predicts the next one', () => {
    const tx = series('NETFLIX.COM', 15.49, new Date(2026, 7, 3), 4, monthly) // Aug–Nov 3
    const [s] = detectRecurring(tx, TODAY)
    expect(s).toMatchObject({
      name: 'Netflix',
      amount: 15.49,
      cycle: 'monthly',
      nextRenewal: '2026-12-03',
      category: 'Streaming',
      occurrences: 4,
    })
  })

  it('detects a weekly charge', () => {
    const tx = series('HELLOFRESH', 59.99, new Date(2026, 9, 1), 5, weekly)
    expect(detectRecurring(tx, TODAY)[0]).toMatchObject({ cycle: 'weekly', occurrences: 5 })
  })

  it('detects quarterly and yearly charges from two occurrences', () => {
    const q = series('QUARTERLY CO', 30, new Date(2026, 4, 1), 2, (d, i) => addMonths(d, i * 3))
    const y = series('YEARLY CO', 99, new Date(2025, 10, 1), 2, (d, i) => addMonths(d, i * 12))
    const cycles = detectRecurring([...q, ...y], TODAY).map((s) => s.cycle)
    expect(cycles.sort()).toEqual(['quarterly', 'yearly'])
  })

  it('needs at least 3 monthly charges', () => {
    const tx = series('NETFLIX.COM', 15.49, new Date(2026, 8, 3), 2, monthly)
    expect(detectRecurring(tx, TODAY)).toEqual([])
  })

  it('tolerates small amount changes (within 10%)', () => {
    const tx = series('CON EDISON', (i) => [90, 85, 97, 92][i], new Date(2026, 7, 27), 4, monthly)
    expect(detectRecurring(tx, TODAY)).toHaveLength(1)
  })

  it('rejects amounts that vary too much', () => {
    const tx = series('AMAZON', (i) => [12, 80, 35, 50][i], new Date(2026, 7, 1), 4, monthly)
    expect(detectRecurring(tx, TODAY)).toEqual([])
  })

  it('rejects irregular gaps even if the median looks monthly', () => {
    const tx = [new Date(2026, 6, 1), new Date(2026, 7, 1), new Date(2026, 7, 10), new Date(2026, 8, 10)].map(
      (date) => ({ description: 'GYM', amount: 25, date }),
    )
    expect(detectRecurring(tx, TODAY)).toEqual([])
  })

  it('works regardless of input order', () => {
    const tx = series('NETFLIX.COM', 15.49, new Date(2026, 7, 3), 4, monthly).reverse()
    expect(detectRecurring(tx, TODAY)).toHaveLength(1)
  })

  it('uses the most recent price', () => {
    const tx = series('SPOTIFY', (i) => [11.99, 11.99, 11.99, 12.99][i], new Date(2026, 7, 8), 4, monthly)
    expect(detectRecurring(tx, TODAY)[0].amount).toBe(12.99)
  })

  it('finds exactly the 7 subscriptions in the sample bank file', () => {
    const { headers, rows } = parseCsv(readFileSync('public/sample-bank.csv', 'utf8'))
    const tx = toTransactions(rows, guessColumns(headers))
    const names = detectRecurring(tx, TODAY).map((s) => s.name).sort()
    expect(names).toEqual([
      'Apple Icloud',
      'Con Edison',
      'Hellofresh',
      'Netflix',
      'Nyt Digital',
      'Planet Fitness',
      'Spotify',
    ])
  })
})
