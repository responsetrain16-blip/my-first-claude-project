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

### Accounts
- Keep separate balances for cash, bank accounts, credit cards and savings.
- Move money between accounts with transfers. These don't count as spending.

### Budgets
- Set a monthly limit per category. The website can suggest one based on your last 3 months.
- Progress bars and clear labels show "On track", "Close to limit" or "Over budget".
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

## How to use it

**Online:** open the link at the top.

**On your computer:** open the `expense-tracker` folder and double-click `index.html`.

The PIN lock needs the online (https) address.

## Back up your data!

Your data is saved **only in the browser you use**. It won't appear in another browser or on another device, and it's lost if you clear your browser data.

To keep it safe, go to **Settings → Your data → Download backup** from time to time. You can restore that file later, on any device.

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

No build tools or installs are needed. It's plain HTML, CSS and JavaScript.

## Upgrading from the first version

If you used the earlier, simpler tracker in the same browser, your transactions are brought over automatically the first time you open this version.
