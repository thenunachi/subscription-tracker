import { useMemo } from 'react'
import { format } from 'date-fns'
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useSubscriptions } from '../store/useSubscriptions'
import {
  byCategory,
  cancelCandidates,
  formatMoney,
  monthlyTotal,
  renewingSoon,
  toMonthly,
  yearlyTotal,
} from '../lib/calc'

const card = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'

function Stat({ label, value, hint }) {
  return (
    <div className={card}>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}
    </div>
  )
}

function CategoryTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { category, monthly } = payload[0].payload
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-slate-900">{category}</p>
      <p className="text-slate-600 tabular-nums">
        {formatMoney(monthly)} / month · {formatMoney(monthly * 12)} / year
      </p>
    </div>
  )
}

const relativeDay = (n) => (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`)

export default function Dashboard() {
  const subscriptions = useSubscriptions((s) => s.subscriptions)

  const stats = useMemo(
    () => ({
      monthly: monthlyTotal(subscriptions),
      yearly: yearlyTotal(subscriptions),
      soon: renewingSoon(subscriptions, 7),
      categories: byCategory(subscriptions),
      candidates: cancelCandidates(subscriptions),
    }),
    [subscriptions],
  )

  if (subscriptions.length === 0) return null

  const soonTotal = stats.soon.reduce((sum, s) => sum + s.amount, 0)
  const savings = stats.candidates.reduce((sum, s) => sum + toMonthly(s.amount, s.cycle), 0)

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Monthly spend" value={formatMoney(stats.monthly)} hint={`${subscriptions.length} subscriptions`} />
        <Stat label="Yearly spend" value={formatMoney(stats.yearly)} />
        <Stat
          label="Renewing in 7 days"
          value={stats.soon.length}
          hint={stats.soon.length ? `${formatMoney(soonTotal)} due` : 'Nothing due'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className={`${card} lg:col-span-3`}>
          <h2 className="font-semibold text-slate-900">Monthly spend by category</h2>
          <div style={{ height: stats.categories.length * 44 + 16 }} className="mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.categories}
                layout="vertical"
                margin={{ top: 0, right: 72, bottom: 0, left: 0 }}
                barCategoryGap={10}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={90}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#475569', fontSize: 13 }}
                />
                <Tooltip content={<CategoryTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="monthly" fill="#4f46e5" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  <LabelList
                    dataKey="monthly"
                    position="right"
                    formatter={formatMoney}
                    style={{ fill: '#334155', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <div className={card}>
            <h2 className="font-semibold text-slate-900">Coming up</h2>
            {stats.soon.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No renewals in the next 7 days.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {stats.soon.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{s.name}</p>
                      <p className="text-slate-500">
                        {relativeDay(s.daysLeft)} · {format(s.date, 'MMM d')}
                      </p>
                    </div>
                    <p className="font-medium text-slate-900 tabular-nums">{formatMoney(s.amount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {stats.candidates.length > 0 && (
            <div className={`${card} border-amber-200 bg-amber-50`}>
              <h2 className="font-semibold text-amber-900">Consider cancelling</h2>
              <p className="mt-1 text-sm text-amber-800">
                You rarely use these. Cancelling saves {formatMoney(savings)} / month.
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {stats.candidates.map((s) => (
                  <li key={s.id} className="flex justify-between gap-3">
                    <span className="truncate text-amber-950">{s.name}</span>
                    <span className="text-amber-900 tabular-nums">
                      {formatMoney(toMonthly(s.amount, s.cycle))} / mo
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
