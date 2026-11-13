import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { useSubscriptions } from '../store/useSubscriptions'
import SubscriptionForm from './SubscriptionForm'

export default function SubscriptionList() {
  const subscriptions = useSubscriptions((s) => s.subscriptions)
  const remove = useSubscriptions((s) => s.remove)

  // null = nothing being edited; otherwise the id of the row in edit mode
  const [editingId, setEditingId] = useState(null)

  const handleDelete = (sub) => {
    if (confirm(`Delete ${sub.name}?`)) remove(sub.id)
  }

  if (subscriptions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
        <p className="font-medium text-slate-700">No subscriptions yet</p>
        <p className="mt-1 text-sm text-slate-500">Add your first one above.</p>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <h2 className="border-b border-slate-200 px-6 py-4 text-lg font-semibold text-slate-900">
        Your subscriptions ({subscriptions.length})
      </h2>

      <ul className="divide-y divide-slate-200">
        {subscriptions.map((sub) =>
          sub.id === editingId ? (
            <li key={sub.id} className="bg-slate-50 p-4">
              <SubscriptionForm
                key={sub.id}
                initial={sub}
                onDone={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={sub.id} className="flex items-center gap-4 px-6 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900">{sub.name}</p>
                <p className="text-sm text-slate-500">
                  {sub.category} · renews {format(parseISO(sub.nextRenewal), 'MMM d, yyyy')}
                  {sub.usage === 'rarely' && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                      rarely used
                    </span>
                  )}
                </p>
              </div>

              <p className="text-right font-semibold text-slate-900">
                ${sub.amount.toFixed(2)}
                <span className="block text-xs font-normal text-slate-500">/ {sub.cycle}</span>
              </p>

              <div className="flex gap-1">
                <button
                  onClick={() => setEditingId(sub.id)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(sub)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </li>
          ),
        )}
      </ul>
    </section>
  )
}
