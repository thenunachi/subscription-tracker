import Papa from 'papaparse'
import { format } from 'date-fns'
import { CYCLES, USAGE } from './constants.js'

const APP_ID = 'subscription-tracker'
const BACKUP_VERSION = 1

// Trigger a browser download of `content` as a file.
export function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const datedName = (base, ext) => `${base}-${format(new Date(), 'yyyy-MM-dd')}.${ext}`

export const toBackupJson = (subscriptions) =>
  JSON.stringify(
    { app: APP_ID, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), subscriptions },
    null,
    2,
  )

const CSV_COLUMNS = ['name', 'amount', 'cycle', 'nextRenewal', 'category', 'usage']

export const toCsv = (subscriptions) =>
  Papa.unparse({ fields: CSV_COLUMNS, data: subscriptions.map((s) => CSV_COLUMNS.map((c) => s[c])) })

// Validate a backup file. Returns the subscriptions array or throws an Error
// with a message that is safe to show the user.
export function parseBackup(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  // Accept our backup format, or a bare array of subscriptions.
  const list = Array.isArray(data) ? data : data?.subscriptions
  if (!Array.isArray(list)) throw new Error('No subscriptions found in that file.')

  return list.map((s, i) => {
    const row = `Item ${i + 1}`
    if (typeof s?.name !== 'string' || !s.name.trim()) throw new Error(`${row}: missing name.`)
    const amount = Number(s.amount)
    if (!(amount > 0)) throw new Error(`${row} (${s.name}): invalid amount.`)
    if (!CYCLES.includes(s.cycle)) throw new Error(`${row} (${s.name}): unknown cycle "${s.cycle}".`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s.nextRenewal ?? ''))
      throw new Error(`${row} (${s.name}): nextRenewal must be YYYY-MM-DD.`)

    return {
      id: typeof s.id === 'string' && s.id ? s.id : crypto.randomUUID(),
      name: s.name.trim(),
      amount,
      cycle: s.cycle,
      nextRenewal: s.nextRenewal,
      category: typeof s.category === 'string' && s.category ? s.category : 'Other',
      usage: USAGE.includes(s.usage) ? s.usage : 'sometimes',
    }
  })
}
