import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/*
  Subscription shape:
  {
    id:          string   // crypto.randomUUID()
    name:        string
    amount:      number   // per billing cycle, e.g. 15.49
    cycle:       'weekly' | 'monthly' | 'quarterly' | 'yearly'
    nextRenewal: string   // ISO date 'YYYY-MM-DD' (never a Date object)
    category:    string
    usage:       'often' | 'sometimes' | 'rarely'
  }
*/

export const useSubscriptions = create(
  persist(
    (set) => ({
      subscriptions: [],

      add: (sub) =>
        set((state) => ({
          subscriptions: [
            ...state.subscriptions,
            { ...sub, id: crypto.randomUUID(), amount: Number(sub.amount) },
          ],
        })),

      update: (id, changes) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((s) =>
            s.id === id
              ? {
                  ...s,
                  ...changes,
                  ...('amount' in changes && { amount: Number(changes.amount) }),
                }
              : s,
          ),
        })),

      // Load subscriptions from a backup.
      // 'merge':   same id -> overwritten by the backup, new ids -> added
      // 'replace': everything currently stored is discarded
      importMany: (subs, mode = 'merge') =>
        set((state) => {
          if (mode === 'replace') return { subscriptions: subs }
          const incoming = new Map(subs.map((s) => [s.id, s]))
          const kept = state.subscriptions.filter((s) => !incoming.has(s.id))
          return { subscriptions: [...kept, ...subs] }
        }),

      remove: (id) =>
        set((state) => ({
          subscriptions: state.subscriptions.filter((s) => s.id !== id),
        })),
    }),
    { name: 'subscriptions' }, // localStorage key
  ),
)
