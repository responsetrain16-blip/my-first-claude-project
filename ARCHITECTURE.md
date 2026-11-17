# Architecture

This document explains how the project is put together: what each part does, how data moves through the website, and the rules the code follows. It's written for beginners, so it explains terms as it goes.

## The big picture

The repository holds one website, the **Finance Tracker** in `expense-tracker/`. It's a **web app** (a website you use to do tasks and save your own information, not a phone app from an app store) for tracking income, expenses, accounts, budgets and savings goals.

- It's written in **plain HTML, CSS and JavaScript**: no framework, no build step, nothing to install.
- It runs entirely **in your browser**. Your data is saved in the browser's `localStorage` (a small storage area each website gets on your computer). Nothing is sent to a server.
- It's published online with **GitHub Pages**, which serves the files straight from the `main` branch. Every push updates the live site within a minute or two.

```
my-first-claude-project/
├── README.md               Project introduction
├── ARCHITECTURE.md         This file
├── CLAUDE.md               Guidance for Claude Code
├── LICENSE.md              MIT License
├── expense-tracker/        The Finance Tracker website
│   ├── index.html          Page skeleton
│   ├── css/styles.css      All the styling
│   ├── js/                 All the behaviour (see below)
│   ├── manifest.webmanifest  Lets the website be installed like an app
│   ├── sw.js               Keeps a copy of the files for offline use
│   └── icons/              Home-screen icons
├── plugins/
│   ├── expense-tracker-tester/   A Claude Code plugin that tests the website
│   └── pr-check/                A Claude Code plugin that checks pull requests before merging
└── .claude-plugin/marketplace.json  Lets Claude Code install the plugins from this repository
```

## How the website's code is organised

The JavaScript is split into files, each with one job. They are ordinary `<script>` files (not "modules"), so the website also works when you open `index.html` straight from your computer. Each file creates one shared object, called a **global**, that later files can use.

Because of that, **the order the scripts load in matters**. A file may only use globals from files loaded before it:

```
utils.js → store.js → charts.js → ui.js → security.js → views/*.js → app.js
```

| File | Global | What it does |
|------|--------|--------------|
| `js/utils.js` | `Utils` | Small helpers: dates, money formatting, icons, building page elements safely |
| `js/store.js` | `Store`, `Finance` | `Store` saves and loads all data; `Finance` does all the money math |
| `js/charts.js` | `Charts` | Charts drawn by hand as SVG images (no chart library) |
| `js/ui.js` | `UI`, `Views` | Reusable pieces: pop-ups, notifications, the transaction form |
| `js/security.js` | `Security` | The PIN lock and auto-lock |
| `js/views/*.js` | (adds to `Views`) | One file per page: dashboard, transactions, budgets, goals, reports, settings |
| `js/app.js` | `App` | Starts the website, switches pages, handles theme and keyboard shortcuts |

## How data flows

All of the website's data lives in **one object**, `Store.state`. It's saved as text (JSON) in `localStorage` under the key `finance-tracker-v2`.

Every change follows the same path:

```
 You click "Save"
       │
       ▼
 A Store function changes the data      (e.g. Store.addTransaction)
       │
       ▼
 commit() saves it to localStorage
       │
       ▼
 App is told something changed
       │
       ▼
 The current page is redrawn from scratch using the new data
```

Redrawing the whole page each time keeps things simple: a page never has to work out which bits to update, it just draws what the data says. (One exception: while you type in the search and filter boxes on the Transactions page, only the list is redrawn, so the box you're typing in doesn't lose focus.)

**Totals are never saved.** Account balances, monthly totals, budget progress and goal progress are all worked out fresh by `Finance` whenever they're needed. That way they can never get out of step with the transactions.

## Pages and navigation

The website is a single page that swaps its content. The part of the address after `#` says which page to show, for example `#/budgets`. This is called **hash routing**.

Each page file registers itself like this:

```js
Views.budgets = { title: "Budgets", render(root) { /* draw the page into root */ } };
```

To add a new page: create a file in `js/views/`, add its `<script>` tag in `index.html` before `app.js`, and add it to the `NAV` list in `app.js`.

## What the data looks like

- **Transactions** have a `type` of `income`, `expense` or `transfer`. Amounts are always positive and rounded to 2 decimal places; the type decides whether money goes in or out.
- **Transfers** move money between your own accounts. They change account balances but are **not** counted as income or spending.
- **Dates** are stored as text like `"2026-11-14"`, in your local time, so they can be compared and sorted easily.
- **Categories:** each type has a built-in "Other" category that can't be deleted. Deleting another category moves its transactions to "Other".
- **Repeating transactions** are stored as rules with a "next date". When the website opens (or you come back to the tab), any that are due are added automatically.
- **Loading data safely:** anything read from storage or a backup file goes through `Store.sanitize()`, which checks every field and throws away anything broken.
- **Older data:** if you used the first, simpler version of the tracker, `migrateLegacy()` brings your old transactions over automatically.

## Security

- **Safe page building:** text you type is always inserted as plain text (using `textContent`), never as HTML. This stops someone from sneaking code into the page through a description or category name.
- **Safe CSV export:** spreadsheet programs can treat cells starting with `=`, `+`, `-` or `@` as formulas. The export adds protection so a description can't run a formula when opened in Excel.
- **PIN lock:** your PIN is never saved. Only a scrambled version (a PBKDF2-SHA-256 hash with a random salt) is stored, which can be checked but not reversed. After 5 wrong tries there's a 30-second wait, and the website can lock itself after a period of inactivity.
- **Hide amounts:** a privacy mode blurs every money amount on screen.

## Look and feel

- All colours are defined once as variables at the top of `css/styles.css`, with a second set for **dark mode**.
- On screens narrower than 860px (phones and small tablets), the side menu becomes a bottom navigation bar with a floating "+" button.
- Chart colours were checked for colour-blind safety: **blue means income** and **orange means spending**. Green, amber and red are kept only for budget and goal status, and always come with an icon and a label, never colour alone.
- Every chart has a Chart/Table switch, so the numbers can always be read as a table too.

## Installing and offline use

The website can be **installed** on a phone or computer, where it gets its own icon and opens in its own window like an app. This kind of website is called a *PWA* (Progressive Web App). It's still plain HTML, CSS and JavaScript, with two extra files:

- **`manifest.webmanifest`** is a small "ID card" that tells the device the website's name, colours and icons (in `icons/`).
- **`sw.js`** is a *service worker*, a helper the browser runs in the background. It keeps a copy of the website's **files** (not your data) and always tries the internet first, so you get the newest version when you're online and the saved copy when you're not.

The service worker is switched on by `setUpInstall()` in `app.js`, and the **Settings → Install** card shows an Install button when the browser allows it. Installing only works on `https` or `localhost`, not when `index.html` is opened straight from your computer. If you add a new file, add it to the `FILES` list in `sw.js` and change the `CACHE` name so devices pick up the new list.

## Testing

There's no automatic test runner. Instead, the **`expense-tracker-tester` plugin** in `plugins/` tells Claude Code how to test the website. Its script opens the website in a fresh, temporary Chrome window (so your real data is never touched) and checks adding, editing and deleting transactions, input validation, exact calculations, monthly summaries, and the layout on phone and desktop in light and dark mode. See `CLAUDE.md` for the commands.
