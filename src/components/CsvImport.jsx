import { useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { CATEGORIES } from '../lib/constants'
import { formatMoney } from '../lib/calc'
import { guessColumns, parseCsv, toTransactions } from '../lib/csv'
import { detectRecurring, normalizeMerchant } from '../lib/detectRecurring'
import { useSubscriptions } from '../store/useSubscriptions'

const card = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'
const select =
  'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30'
const button = 'rounded-lg px-4 py-2 text-sm font-medium'

export default function CsvImport() {
  const subscriptions = useSubscriptions((s) => s.subscriptions)
  const add = useSubscriptions((s) => s.add)
  const fileInput = useRef(null)

  const [file, setFile] = useState(null) // { name, headers, rows }
  const [columns, setColumns] = useState({ date: '', description: '', amount: '' })
  const [selected, setSelected] = useState({}) // key -> boolean
  const [categories, setCategories] = useState({}) // key -> category override
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const loadText = (name, text) => {
    const { headers, rows } = parseCsv(text)
    if (rows.length === 0) {
      setError(`${name} has no rows.`)
      return
    }
    setFile({ name, headers, rows })
    setColumns(guessColumns(headers))
    setSelected({})
    setCategories({})
    setMessage('')
    setError('')
  }

  const handleFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = '' // so picking the same file again still fires onChange
    if (f) loadText(f.name, await f.text())
  }

  const loadSample = async () => {
    const res = await fetch('/sample-bank.csv')
    loadText('sample-bank.csv', await res.text())
  }

  const reset = () => {
    setFile(null)
    setError('')
  }

  // Merchants you already track, so we don't suggest them twice.
  const tracked = useMemo(
    () => new Set(subscriptions.map((s) => normalizeMerchant(s.name))),
    [subscriptions],
  )

  const { transactions, suggestions } = useMemo(() => {
    if (!file || !columns.date || !columns.description || !columns.amount) {
      return { transactions: [], suggestions: [] }
    }
    const transactions = toTransactions(file.rows, columns)
    return { transactions, suggestions: detectRecurring(transactions) }
  }, [file, columns])

  const isTracked = (s) => tracked.has(s.key)
  // Default: everything not already tracked is ticked.
  const isSelected = (s) => !isTracked(s) && (selected[s.key] ?? true)
  const chosen = suggestions.filter(isSelected)

  const handleImport = () => {
    for (const s of chosen) {
      add({
        name: s.name,
        amount: s.amount,
        cycle: s.cycle,
        nextRenewal: s.nextRenewal,
        category: categories[s.key] ?? s.category,
        usage: s.usage,
      })
    }
    setMessage(`Added ${chosen.length} subscription${chosen.length === 1 ? '' : 's'}.`)
    setFile(null)
  }

  if (!file) {
    return (
      <section className={card}>
        <h2 className="text-lg font-semibold text-slate-900">Import from your bank</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload a CSV export of your transactions and we'll find charges that repeat. The file
          is read in your browser and never uploaded anywhere.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => fileInput.current.click()}
            className={`${button} bg-indigo-600 text-white shadow-sm hover:bg-indigo-700`}
          >
            Choose CSV file
          </button>
          <button onClick={loadSample} className={`${button} text-indigo-600 hover:bg-indigo-50`}>
            Try a sample file
          </button>
          <input ref={fileInput} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
        </div>
        {message && <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p>}
        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </section>
    )
  }

  return (
    <section className={card}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Import from your bank</h2>
          <p className="mt-1 text-sm text-slate-500">
            {file.name} · {file.rows.length} rows · {transactions.length} charges
          </p>
        </div>
        <button onClick={reset} className={`${button} border border-slate-300 text-slate-700 hover:bg-slate-50`}>
          Cancel
        </button>
      </div>

      <details className="mt-4 rounded-lg bg-slate-50 p-3 text-sm" open={!columns.date || !columns.description || !columns.amount}>
        <summary className="cursor-pointer font-medium text-slate-700">Columns</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {['date', 'description', 'amount'].map((field) => (
            <label key={field} className="block text-sm font-medium capitalize text-slate-700">
              {field}
              <select
                value={columns[field]}
                onChange={(e) => setColumns((c) => ({ ...c, [field]: e.target.value }))}
                className={select}
              >
                <option value="">Choose a column…</option>
                {file.headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </details>

      {suggestions.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">
          No recurring charges found. Check the column choices above, or use a file that covers
          at least three months.
        </p>
      ) : (
        <>
          <p className="mt-6 text-sm font-medium text-slate-700">
            Found {suggestions.length} recurring charge{suggestions.length === 1 ? '' : 's'}
          </p>
          <ul className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
            {suggestions.map((s) => {
              const alreadyTracked = isTracked(s)
              return (
                <li key={s.key} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${alreadyTracked ? 'opacity-50' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isSelected(s)}
                    disabled={alreadyTracked}
                    onChange={(e) => setSelected((sel) => ({ ...sel, [s.key]: e.target.checked }))}
                    className="size-4 accent-indigo-600"
                    aria-label={`Import ${s.name}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">
                      {s.name}
                      {alreadyTracked && <span className="ml-2 text-xs font-normal text-slate-500">already tracked</span>}
                    </p>
                    <p className="text-sm text-slate-500">
                      {s.occurrences} charges since {format(s.firstSeen, 'MMM d')} · next {format(parseISO(s.nextRenewal), 'MMM d')}
                    </p>
                  </div>
                  <select
                    value={categories[s.key] ?? s.category}
                    onChange={(e) => setCategories((c) => ({ ...c, [s.key]: e.target.value }))}
                    disabled={alreadyTracked}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm"
                    aria-label={`Category for ${s.name}`}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <p className="w-24 text-right font-semibold text-slate-900 tabular-nums">
                    {formatMoney(s.amount)}
                    <span className="block text-xs font-normal text-slate-500">/ {s.cycle}</span>
                  </p>
                </li>
              )
            })}
          </ul>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleImport}
              disabled={chosen.length === 0}
              className={`${button} bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50`}
            >
              Add {chosen.length} subscription{chosen.length === 1 ? '' : 's'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
