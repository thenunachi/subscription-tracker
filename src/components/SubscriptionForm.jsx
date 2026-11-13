import { useState } from 'react'
import { CATEGORIES, CYCLES, USAGE } from '../lib/constants'
import { useSubscriptions } from '../store/useSubscriptions'

const EMPTY = {
  name: '',
  amount: '',
  cycle: 'monthly',
  nextRenewal: '',
  category: CATEGORIES[0],
  usage: 'often',
}

// Pass `initial` to edit an existing subscription; omit it to add a new one.
export default function SubscriptionForm({ initial, onDone }) {
  const add = useSubscriptions((s) => s.add)
  const update = useSubscriptions((s) => s.update)

  const [form, setForm] = useState(initial ?? EMPTY)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!form.name.trim()) return setError('Name is required')
    if (!(Number(form.amount) > 0)) return setError('Amount must be greater than 0')
    if (!form.nextRenewal) return setError('Next renewal date is required')

    const data = { ...form, name: form.name.trim() }
    if (initial) update(initial.id, data)
    else add(data)

    setError('')
    setForm(EMPTY)
    onDone?.()
  }

  const field =
    'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30'
  const label = 'block text-sm font-medium text-slate-700'

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-4 text-lg font-semibold text-slate-900">
        {initial ? 'Edit subscription' : 'Add a subscription'}
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={`${label} sm:col-span-2`}>
          Name
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Netflix"
            className={field}
          />
        </label>

        <label className={label}>
          Amount
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 mt-1 flex items-center text-slate-400">
              $
            </span>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={handleChange}
              placeholder="0.00"
              className={`${field} pl-7`}
            />
          </div>
        </label>

        <label className={label}>
          Billing cycle
          <select name="cycle" value={form.cycle} onChange={handleChange} className={`${field} capitalize`}>
            {CYCLES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className={label}>
          Next renewal
          <input
            name="nextRenewal"
            type="date"
            value={form.nextRenewal}
            onChange={handleChange}
            className={field}
          />
        </label>

        <label className={label}>
          Category
          <select name="category" value={form.category} onChange={handleChange} className={field}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <fieldset className="sm:col-span-2">
          <legend className={label}>How often do you use it?</legend>
          <div className="mt-1 inline-flex rounded-lg border border-slate-300 bg-slate-50 p-1">
            {USAGE.map((u) => (
              <label
                key={u}
                className={`cursor-pointer rounded-md px-4 py-1.5 text-sm capitalize transition ${
                  form.usage === u
                    ? 'bg-white font-medium text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <input
                  type="radio"
                  name="usage"
                  value={u}
                  checked={form.usage === u}
                  onChange={handleChange}
                  className="sr-only"
                />
                {u}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          {initial ? 'Save changes' : 'Add subscription'}
        </button>
      </div>
    </form>
  )
}
