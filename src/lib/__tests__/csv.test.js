import { describe, expect, it } from 'vitest'
import { guessColumns, parseAmount, parseCsv, parseDate, toTransactions } from '../csv.js'

describe('parseAmount', () => {
  it.each([
    ['15.49', 15.49],
    ['-15.49', -15.49],
    ['$1,234.56', 1234.56],
    ['(15.49)', -15.49],
    [' -$4.00 ', -4],
  ])('%s -> %d', (input, expected) => {
    expect(parseAmount(input)).toBe(expected)
  })

  it('returns null for empty or junk', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount(undefined)).toBeNull()
    expect(parseAmount('abc')).toBeNull()
  })
})

describe('parseDate', () => {
  it.each([
    ['2026-11-12', new Date(2026, 10, 12)],
    ['11/12/2026', new Date(2026, 10, 12)],
    ['1/5/2026', new Date(2026, 0, 5)],
    ['11/12/26', new Date(2026, 10, 12)],
  ])('%s', (input, expected) => {
    expect(parseDate(input)).toEqual(expected)
  })

  it('returns null for invalid input', () => {
    expect(parseDate('')).toBeNull()
    expect(parseDate('not a date')).toBeNull()
  })
})

describe('guessColumns', () => {
  it('matches common bank headers', () => {
    expect(guessColumns(['Transaction Date', 'Description', 'Amount'])).toEqual({
      date: 'Transaction Date',
      description: 'Description',
      amount: 'Amount',
    })
  })

  it('prefers an exact match and falls back to contains', () => {
    expect(guessColumns(['Effective Date', 'Date', 'Payee', 'Debit Amount'])).toEqual({
      date: 'Date',
      description: 'Payee',
      amount: 'Debit Amount',
    })
  })

  it('leaves unknown fields empty', () => {
    expect(guessColumns(['foo', 'bar'])).toEqual({ date: '', description: '', amount: '' })
  })
})

describe('toTransactions', () => {
  const columns = { date: 'Date', description: 'Desc', amount: 'Amt' }

  it('keeps charges when charges are negative, dropping deposits', () => {
    const { rows } = parseCsv(
      'Date,Desc,Amt\n11/01/2026,Netflix,-15.49\n11/02/2026,Coffee,-5\n11/03/2026,Payroll,2000\n',
    )
    const tx = toTransactions(rows, columns)
    expect(tx.map((t) => [t.description, t.amount])).toEqual([
      ['Netflix', 15.49],
      ['Coffee', 5],
    ])
  })

  it('keeps charges when charges are positive', () => {
    const { rows } = parseCsv(
      'Date,Desc,Amt\n11/01/2026,Netflix,15.49\n11/02/2026,Coffee,5\n11/03/2026,Refund,-20\n',
    )
    expect(toTransactions(rows, columns).map((t) => t.description)).toEqual(['Netflix', 'Coffee'])
  })

  it('skips rows with a bad date, empty description, or zero amount', () => {
    const { rows } = parseCsv('Date,Desc,Amt\nnope,A,-1\n11/01/2026,,-1\n11/01/2026,C,0\n11/01/2026,D,-2\n')
    expect(toTransactions(rows, columns).map((t) => t.description)).toEqual(['D'])
  })
})
