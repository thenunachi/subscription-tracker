# Subscription Tracker

Track every subscription and recurring bill in one place, see what they cost you per month and per year, and find the ones worth cancelling. Everything runs in your browser: there is no account, no server and no database, so your data never leaves your device.

<!-- Add after deploying: **Live demo:** https://your-app.vercel.app -->

<!-- Add a screenshot: save it as docs/screenshot.png and uncomment the line below.
![Dashboard showing monthly spend, category chart and upcoming renewals](docs/screenshot.png)
-->

## Features

- **Dashboard.** Monthly and yearly totals, spend by category, renewals due in the next 7 days, and a "consider cancelling" list of subscriptions you marked as rarely used.
- **Bank CSV import.** Upload a transaction export from your bank and the app finds the charges that repeat. You review the suggestions and pick which to add.
- **Calendar reminders.** Download an `.ics` file with a repeating event for each renewal and an alert the day before. Works with Google, Apple and Outlook Calendar.
- **Browser alerts.** Optional notifications for renewals due today or tomorrow.
- **Backup and restore.** Export to JSON (restorable, by merge or replace) or CSV (for spreadsheets).
- **Installable and offline.** A progressive web app you can add to your phone's home screen.

## How recurring charges are detected

Bank descriptions are noisy (`NETFLIX.COM 866-579-7172 CA`, `SQ *BLUE BOTTLE 0423`), so detection runs in four steps ([`src/lib/detectRecurring.js`](src/lib/detectRecurring.js)):

1. **Normalize the merchant.** Strip payment-processor prefixes, domains, digits and location codes, then keep the first two words: `NETFLIX.COM 866-579-7172 CA` becomes `netflix`.
2. **Group and sort** each merchant's charges by date.
3. **Find the cycle.** The median gap between charges picks weekly (6–8 days), monthly (26–35), quarterly (85–97) or yearly (355–375). Every gap must fit that cycle, which filters out frequent but irregular purchases like coffee.
4. **Check the amounts.** Every charge must be within 10% of the median amount. This allows a utility bill that varies slightly and rejects shopping.

Banks disagree on whether charges are positive or negative, so the more common sign is treated as charges. That also removes paychecks and refunds.

Try it with [`public/sample-bank.csv`](public/sample-bank.csv) (the **Try a sample file** button): it contains 135 transactions, of which the app finds the 7 real subscriptions.

## Tech stack

| | |
|---|---|
| Framework | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| State | Zustand with `persist` (localStorage) |
| Charts | Recharts |
| CSV | PapaParse |
| Dates | date-fns |
| PWA | vite-plugin-pwa (Workbox) |
| Tests | Vitest |

## Getting started

Requires Node 20.19+ or 22.12+.

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Re-run tests on change |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build (use this to test the PWA and offline mode, which are off in dev) |
| `npm run lint` | Lint with oxlint |

## Project structure

```
src/
  components/     UI: Dashboard, SubscriptionForm, SubscriptionList, CsvImport, DataTools
  store/          Zustand store (add, update, remove, importMany), persisted to localStorage
  lib/            Pure logic, no React:
    calc.js           cycle conversion, totals, renewal dates
    csv.js            CSV parsing, column guessing, date and amount parsing
    detectRecurring.js
    exportData.js     JSON/CSV export, backup validation
    ics.js            iCalendar generation
    notifications.js
    __tests__/        Vitest tests for everything in lib/
```

Business logic lives in `src/lib/` as plain functions, separate from components, so it can be tested without rendering anything.

## Limitations

- Data is stored per browser. Use **Export → JSON backup** to move it between devices.
- Browser alerts only fire when the app is opened. True scheduled push notifications would need a server; the calendar export is the reliable reminder.
- Detection drops a subscription whose price changed by more than 10% within the file, and yearly subscriptions need more than a year of history.
- Amounts are shown in US dollars.
