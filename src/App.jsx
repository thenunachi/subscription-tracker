import Dashboard from './components/Dashboard'
import SubscriptionForm from './components/SubscriptionForm'
import SubscriptionList from './components/SubscriptionList'

function App() {
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
        <SubscriptionList />
      </main>
    </div>
  )
}

export default App
