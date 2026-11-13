import { useEffect } from 'react'
import CsvImport from './components/CsvImport'
import Dashboard from './components/Dashboard'
import DataTools from './components/DataTools'
import SubscriptionForm from './components/SubscriptionForm'
import SubscriptionList from './components/SubscriptionList'
import { notifyUpcomingRenewals } from './lib/notifications'
import { useSubscriptions } from './store/useSubscriptions'

function App() {
  const subscriptions = useSubscriptions((s) => s.subscriptions)

  // Alert about renewals due today/tomorrow. Already-sent alerts are skipped.
  useEffect(() => {
    notifyUpcomingRenewals(subscriptions)
  }, [subscriptions])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscriptions</h1>
          <p className="text-sm text-slate-500">
            Track what you pay for. Your data stays in this browser.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <Dashboard />
        <SubscriptionForm />
        <CsvImport />
        <SubscriptionList />
        <DataTools />
      </main>
    </div>
  )
}

export default App
