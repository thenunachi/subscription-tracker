import Papa from 'papaparse'
import { isValid, parse, parseISO } from 'date-fns'

// Parse CSV text into { headers, rows } where each row is an object keyed by header.
export function parseCsv(text) {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() })
  return { headers: result.meta.fields ?? [], rows: result.data }
}

// Guess which header holds each field, by name. Returns '' when nothing matches.
const HINTS = {
  date: ['date', 'posted', 'transaction date', 'posting date'],
  description: ['description', 'merchant', 'payee', 'name', 'details', 'memo'],
  amount: ['amount', 'debit', 'value'],
}

export function guessColumns(headers) {
  const find = (hints) =>
    // exact match first, then "contains"
    headers.find((h) => hints.includes(h.toLowerCase())) ??
    headers.find((h) => hints.some((hint) => h.toLowerCase().includes(hint))) ??
    ''
  return { date: find(HINTS.date), description: find(HINTS.description), amount: find(HINTS.amount) }
}

const DATE_FORMATS = ['MM/dd/yyyy', 'M/d/yyyy', 'MM/dd/yy', 'M/d/yy', 'dd-MM-yyyy', 'yyyy/MM/dd']

export function parseDate(value) {
  const s = String(value ?? '').trim()
  if (!s) return null
  const iso = parseISO(s)
  if (isValid(iso)) return iso
  // date-fns's 'yyyy' happily reads "26" as the year 0026, so only try the
  // formats whose year width matches the input (2 digits -> 'yy').
  const twoDigitYear = /[/-]\d{2}$/.test(s)
  for (const f of DATE_FORMATS) {
    if (f.endsWith('yy') && !f.endsWith('yyyy') !== twoDigitYear) continue
    const d = parse(s, f, new Date())
    if (isValid(d)) return d
  }
  return null
}

// "$1,234.56" -> 1234.56, "(15.49)" -> -15.49, "-15.49" -> -15.49
export function parseAmount(value) {
  let s = String(value ?? '').trim()
  const negative = /^\(.*\)$/.test(s) || s.startsWith('-')
  s = s.replace(/[^0-9.]/g, '')
  if (!s) return null
  const n = Number(s)
  if (Number.isNaN(n)) return null
  return negative ? -n : n
}

// Turn raw CSV rows into clean transactions using the chosen column mapping.
// Banks disagree on sign: some show charges as negative, some as positive.
// We assume charges are whichever sign is more common, and drop the rest
// (refunds, deposits, paychecks).
export function toTransactions(rows, columns) {
  const parsed = rows
    .map((r) => ({
      date: parseDate(r[columns.date]),
      description: String(r[columns.description] ?? '').trim(),
      amount: parseAmount(r[columns.amount]),
    }))
    .filter((t) => t.date && t.description && t.amount)

  const negatives = parsed.filter((t) => t.amount < 0).length
  const chargesAreNegative = negatives > parsed.length / 2

  return parsed
    .filter((t) => (chargesAreNegative ? t.amount < 0 : t.amount > 0))
    .map((t) => ({ ...t, amount: Math.abs(t.amount) }))
}
