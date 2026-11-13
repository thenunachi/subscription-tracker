import { format } from 'date-fns'
import { formatMoney, renewingSoon } from './calc.js'

const SENT_KEY = 'renewal-notifications-sent'

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

// Remember which (subscription, renewal date) pairs we already notified about,
// so reloading the page doesn't repeat them.
function loadSent() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SENT_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function saveSent(sent) {
  try {
    // Keep it bounded; old entries are useless once their date has passed.
    localStorage.setItem(SENT_KEY, JSON.stringify([...sent].slice(-200)))
  } catch {
    // storage full or blocked: worst case we notify twice
  }
}

// Android Chrome only allows notifications through a service worker, so use
// the registered one when there is one, and fall back to `new Notification`.
async function show(title, options) {
  const registration = await navigator.serviceWorker?.getRegistration()
  if (registration) return registration.showNotification(title, options)
  new Notification(title, options)
}

// Notify about anything renewing today or tomorrow. Safe to call on every load.
export async function notifyUpcomingRenewals(subscriptions) {
  if (!notificationsSupported() || Notification.permission !== 'granted') return

  const sent = loadSent()
  for (const s of renewingSoon(subscriptions, 1)) {
    const key = `${s.id}:${format(s.date, 'yyyy-MM-dd')}`
    if (sent.has(key)) continue
    const when = s.daysLeft === 0 ? 'today' : 'tomorrow'
    await show(`${s.name} renews ${when}`, {
      body: `${formatMoney(s.amount)} / ${s.cycle}`,
      tag: key, // the OS replaces rather than stacks duplicates
      icon: '/pwa-192x192.png',
    })
    sent.add(key)
  }
  saveSent(sent)
}
