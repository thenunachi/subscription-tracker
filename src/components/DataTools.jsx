import { useRef, useState } from 'react'
import { useSubscriptions } from '../store/useSubscriptions'
import { datedName, downloadFile, parseBackup, toBackupJson, toCsv } from '../lib/exportData'
import { toIcs } from '../lib/ics'
import { notificationsSupported, notifyUpcomingRenewals } from '../lib/notifications'

const card = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm'
const btn =
  'rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
const primary =
  'rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700'

function Row({ title, description, children }) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-slate-900">{title}</p>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">{children}</div>
    </div>
  )
}

export default function DataTools() {
  const subscriptions = useSubscriptions((s) => s.subscriptions)
  const importMany = useSubscriptions((s) => s.importMany)
  const fileInput = useRef(null)

  const [pending, setPending] = useState(null) // parsed backup awaiting merge/replace
  const [message, setMessage] = useState(null) // { type: 'ok' | 'error', text }
  const [permission, setPermission] = useState(
    notificationsSupported() ? Notification.permission : 'unsupported',
  )

  const empty = subscriptions.length === 0

  const exportJson = () =>
    downloadFile(datedName('subscriptions-backup', 'json'), toBackupJson(subscriptions), 'application/json')

  const exportCsv = () =>
    downloadFile(datedName('subscriptions', 'csv'), toCsv(subscriptions), 'text/csv')

  const exportIcs = () =>
    downloadFile('subscription-renewals.ics', toIcs(subscriptions), 'text/calendar')

  const handleBackupFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const subs = parseBackup(await file.text())
      if (subs.length === 0) throw new Error('That backup has no subscriptions in it.')
      setPending(subs)
      setMessage(null)
    } catch (err) {
      setMessage({ type: 'error', text: err.message })
    }
  }

  const applyBackup = (mode) => {
    importMany(pending, mode)
    setMessage({
      type: 'ok',
      text: `${mode === 'replace' ? 'Replaced with' : 'Merged'} ${pending.length} subscription${pending.length === 1 ? '' : 's'} from the backup.`,
    })
    setPending(null)
  }

  const enableNotifications = async () => {
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') notifyUpcomingRenewals(subscriptions)
  }

  const notificationStatus = {
    granted: 'On. You get an alert the day before a renewal, whenever the app is opened.',
    denied: 'Blocked. Allow notifications for this site in your browser settings.',
    default: 'Get an alert the day before a renewal, whenever the app is opened.',
    unsupported: 'This browser does not support notifications.',
  }[permission]

  return (
    <section className={card}>
      <h2 className="text-lg font-semibold text-slate-900">Backup & reminders</h2>
      <p className="mt-1 text-sm text-slate-500">
        Your data lives only in this browser. Export a backup to keep it safe or move it to
        another device.
      </p>

      <div className="mt-2 divide-y divide-slate-200">
        <Row title="Export" description="Download everything as a JSON backup, or as a CSV for spreadsheets.">
          <button onClick={exportJson} disabled={empty} className={btn}>JSON backup</button>
          <button onClick={exportCsv} disabled={empty} className={btn}>CSV</button>
        </Row>

        <Row title="Restore" description="Load a JSON backup exported from this app.">
          <button onClick={() => fileInput.current.click()} className={btn}>Choose backup…</button>
          <input ref={fileInput} type="file" accept=".json,application/json" onChange={handleBackupFile} className="hidden" />
        </Row>

        {pending && (
          <div className="rounded-lg bg-indigo-50 p-4 text-sm">
            <p className="font-medium text-indigo-900">
              Found {pending.length} subscription{pending.length === 1 ? '' : 's'}. How should they be added?
            </p>
            <p className="mt-1 text-indigo-800">
              Merge keeps what you have and updates matching entries. Replace deletes your current
              {` ${subscriptions.length}`} subscription{subscriptions.length === 1 ? '' : 's'} first.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => applyBackup('merge')} className={primary}>Merge</button>
              <button onClick={() => applyBackup('replace')} className={`${btn} bg-white`}>Replace all</button>
              <button onClick={() => setPending(null)} className="px-3 py-2 text-sm text-slate-600 hover:text-slate-900">Cancel</button>
            </div>
          </div>
        )}

        <Row
          title="Add to calendar"
          description="Download an .ics file with a repeating event and a reminder the day before each renewal. Opens in Google, Apple or Outlook Calendar."
        >
          <button onClick={exportIcs} disabled={empty} className={btn}>Download .ics</button>
        </Row>

        <Row title="Browser alerts" description={notificationStatus}>
          {permission === 'default' && (
            <button onClick={enableNotifications} className={btn}>Turn on</button>
          )}
        </Row>
      </div>

      {message && (
        <p
          className={`mt-2 rounded-lg px-3 py-2 text-sm ${
            message.type === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </p>
      )}
    </section>
  )
}
