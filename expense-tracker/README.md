# Finance Tracker

A modern, private website for managing your money: record income and expenses, plan budgets, save toward goals, and see where your money goes.

**Try it:** https://responsetrain16-blip.github.io/my-first-claude-project/expense-tracker/

It works on computers, tablets and phones. On a phone, you can add it to your home screen from your browser's menu.

## Features

### Everyday tracking
- **Income, expenses and transfers.** Add a transaction in a few taps, with category, account, date, description, notes and tags.
- **Smart suggestions.** Descriptions you've used before are suggested, and picking one fills in its category.
- **Repeating transactions.** Rent, salary or subscriptions can repeat weekly, monthly or yearly. They're added automatically when they're due.
- **Edit, duplicate or delete.** Deleting can be undone straight away.
- **Duplicate warning.** If you save something that looks like an entry you already have (same type, amount and date, and the same description, or the same category when there's no description), the app asks "Possible duplicate" first. **Cancel** keeps the form open; **Add anyway** saves it. Editing only the notes or tags of an entry never asks.

### Accounts
- Keep separate balances for cash, bank accounts, credit cards and savings.
- Move money between accounts with transfers. These don't count as spending.

### Budgets
- Set a monthly limit per category. The website can suggest one based on your last 3 months.
- Progress bars and clear labels show "On track", "Close to limit" or "Over budget".
- **Budget alert:** the moment you save an expense that takes a budget to 80% ("Close to limit") or past 100% ("Over budget"), the confirmation message tells you, for example "⚠ Over budget: Groceries this month is now at $110.00 of $100.00 (110%)". Adding more to a budget that's already over says "Still over budget". With "Hide amounts" on, it shows only the percentage.
- Shows how much you can spend per day for the rest of the month.
- Lists spending in categories that don't have a budget yet.

### Savings goals
- Create goals (emergency fund, holiday, new laptop…) with an optional target date.
- Add or withdraw money and see the history.
- Shows how much to save each month to reach the goal on time.

### Reports & insights
- Income vs. spending per month, and your total balance over time.
- Spending by category and income by source, with percentages.
- Your largest expenses, plus plain-language insights.
- View 6 months, 12 months, this year or all time.
- Every chart can be shown as a table too.

### Search & export
- Search by description, notes, tags or amount.
- Filter by time period, type, category and account, and sort by date or amount.
- Export any filtered list to a CSV spreadsheet.

### Privacy & security
- **Your data never leaves your device.** There's no account, no server and no tracking. Everything is stored in your browser.
- **PIN lock.** Ask for a 4–8 digit PIN when the website opens.
  - The PIN itself is never stored, only a secure fingerprint of it (PBKDF2-SHA-256).
  - Auto-locks after a period of inactivity, and pauses after 5 wrong attempts.
- **Hide amounts.** Tap the eye icon to blur all numbers when others can see your screen.
- Everything you type is shown as plain text, never run as code. Exported spreadsheets are protected against "formula injection".

### Comfort
- Light and dark mode (automatic, or choose one).
- 30+ currencies.
- Works with a keyboard and screen readers.
- Keyboard shortcuts: **N** adds a transaction, **/** searches.
- Demo data, so you can explore before adding your own.
- **Installable.** Add it to your phone's home screen or your computer, where it opens in its own window like an app. It also works offline after your first visit.

## How to use it

**Online:** open the link at the top.

**On your computer:** open the `expense-tracker` folder and double-click `index.html`.

The PIN lock needs the online (https) address.

**Install it like an app:**
- **Android / Chrome / Edge:** go to **Settings → Install** and tap **Install** (or use the browser menu → "Install app" / "Add to Home Screen").
- **iPhone / iPad:** open the online link in Safari, tap the **Share** button, then **Add to Home Screen**.
- **Mac Safari:** File → Add to Dock.

Installing needs the online (https) address too. Your data stays the same: the installed version uses the same browser storage.

## Back up your data!

Your data is saved **only in the browser you use**. It won't appear in another browser or on another device, and it's lost if you clear your browser data.

To keep it safe, go to **Settings → Your data → Download backup** from time to time. You can restore that file later, on any device. If you haven't backed up for 30 days, Home shows a reminder ("Remind me later" hides it for a week).

**Check my data.** **Settings → Your data → Check now** looks through everything and lists, in plain English, anything worth a second look: possible duplicates, amounts more than 10 times the usual for their category (typos like 5000 instead of 50.00), dates in the future or before 2000, a cash account below zero, and damaged entries the app had to leave out when it opened. Tips (optional) list entries filed under "Other" or with no description. Tap an entry to open and fix it. The check itself never changes anything.

**Undo for big changes.** Before restoring a backup, loading demo data, or deleting a category or goal, the app quietly keeps a copy of your data. The message afterwards has an **Undo** button, and **Settings → Your data → Undo last big change** works later too (only the latest change is kept). **Erase everything** can be undone for 10 seconds only; after that it's permanent. This copy is kept in the same browser, so it protects you from mistakes, not from clearing your browser data: only a downloaded backup does that.

## How the code is organised

| File | What it does |
|------|--------------|
| `index.html` | The page skeleton: navigation, lock screen, and where pages appear |
| `css/styles.css` | All the styling, including light/dark colors and phone layout |
| `js/utils.js` | Small helpers: dates, money formatting, icons, building page elements |
| `js/store.js` | Saving and loading data (`Store`) and the money math (`Finance`) |
| `js/charts.js` | The charts, drawn by hand in SVG (no libraries) |
| `js/ui.js` | Reusable pieces: pop-ups, notifications, the transaction form |
| `js/security.js` | The PIN lock and auto-lock |
| `js/views/*.js` | One file per page: dashboard, transactions, budgets, goals, reports, settings |
| `js/app.js` | Starts the website and switches between pages |
| `manifest.webmanifest` | The website's "ID card" for installing: name, colours and icons |
| `sw.js` | The *service worker*: keeps a copy of the website's files so it opens offline |
| `icons/` | Home-screen icons |

No build tools or installs are needed. It's plain HTML, CSS and JavaScript.

## Upgrading from the first version

If you used the earlier, simpler tracker in the same browser, your transactions are brought over automatically the first time you open this version.
