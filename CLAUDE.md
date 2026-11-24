# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

A beginner's first Claude Code + GitHub project. The only app is `expense-tracker/`, a personal finance website (income/expenses, accounts, budgets, savings goals, reports) written in **plain HTML, CSS and JavaScript — no framework, no build step, no package.json, no dependencies**. The repo owner is new to coding: keep explanations and code comments beginner-friendly, and match the existing plain-English comment style.

Deployed with GitHub Pages from `main` (repo root): https://responsetrain16-blip.github.io/my-first-claude-project/expense-tracker/ — every push to `main` updates the live site within a minute or two.

## Running and testing

- **Run:** open `expense-tracker/index.html` directly, or serve it:
  `python3 -m http.server 8799 --bind 127.0.0.1 --directory expense-tracker`
  The PIN lock needs a secure context (https or localhost), so serve it rather than using `file://` when testing security features.
- **Syntax check (the only "lint"):** `for f in expense-tracker/js/*.js expense-tracker/js/views/*.js; do node --check "$f"; done`
  A project hook (`.claude/settings.json` → `.claude/hooks/check-js-syntax.js`) also runs `node --check` automatically after every Edit/Write of a file under `expense-tracker/js/`, and reports any syntax error back so it can be fixed immediately.
- **README "Recent changes":** a Stop hook (`.claude/hooks/remind-readme-update.js`) checks `git status` when you finish; if files changed since the last commit but `README.md` didn't, it asks you to add one plain-English line (`- **YYYY-MM-DD:** …`) at the top of README's "## Recent changes" section and fix any README section the change made out of date. It asks once per set of changes and stays quiet once README.md is modified.
- **Tests:** there is no test runner. The `expense-tracker-tester` plugin (`plugins/expense-tracker-tester/`, enabled for this project in `.claude/settings.json`; also runnable as `/test-tracker`) holds the QA checklist and a Puppeteer script that drives Chrome in a fresh profile and checks adding/editing/deleting, validation, exact calculations, monthly summaries and UI at phone/desktop widths in light/dark mode:
  ```
  # once, in a temp dir (never in the repo): npm install puppeteer-core@23.11.1
  NODE_PATH=<temp>/node_modules node plugins/expense-tracker-tester/skills/expense-tracker-tester/scripts/check.js http://127.0.0.1:8799/index.html <screenshot-dir>
  ```
  It prints PASS/FAIL/NOTE per check; there's no way to run a single check other than editing a copy of the script. The skill's rule is "test, don't change": report findings and only fix what the user asks for.

- **PR check:** the `pr-check` plugin (`plugins/pr-check/`, enabled in `.claude/settings.json`; `/pr-check [PR number | branch]`) reviews changes before merge/push. Its script `plugins/pr-check/skills/pr-check/scripts/pr-check.sh [base]` (default base `origin/main`, includes uncommitted files, bash 3.2-compatible) checks junk files, secrets, JS/JSON syntax, the security/data rules below on *added lines only*, `index.html`/`sw.js` registration of new files, and `claude plugin validate`; the skill wraps it in 10 review steps (understand → files → code → functionality → validation → existing features via the tester → security → tests → docs → report) and ends with Approve / Request Changes / Needs Further Review; it must never mark an unverified check as passed or approve on its own. When you add a project rule, add a matching check there.

## Architecture (`expense-tracker/`)

**Classic scripts sharing globals, not ES modules** — so the app works when opened from `file://`. Load order in `index.html` matters; each file may only use globals defined by files above it:
`utils.js` → `store.js` → `charts.js` → `ui.js` → `security.js` → `views/*.js` → `app.js` (starts on `DOMContentLoaded`).

Globals: `Utils`, `Store`, `Finance`, `Charts`, `UI`, `Views`, `Security`, `App`.

**Data flow.** All state lives in one object, `Store.state`, persisted as JSON in `localStorage` under `finance-tracker-v2` (nothing is ever sent to a server). Every mutation goes through a `Store.*` function that ends in `commit()`, which saves and notifies subscribers; `App` subscribes and **re-renders the whole current view** on any change. Views therefore never update the DOM incrementally after data changes — they just render from state. (Exception: the Transactions view re-renders only its list while the user types in filters, to keep input focus.)

**Derived numbers** (totals, account balances, budget status, goal progress) are always computed on the fly by `Finance` in `store.js` — never stored. Transfers move money between accounts but are excluded from income/expense totals.

**Routing.** Hash-based (`#/dashboard`, `#/transactions`, `#/budgets`, `#/goals`, `#/reports`, `#/settings`). Each `views/*.js` registers `Views.<id> = { title, render(root) }`; to add a page, register a view, add its `<script>` tag before `app.js`, and add it to `NAV` in `app.js`.

**Data model notes**
- Dates are `"YYYY-MM-DD"` strings (local time, compared as strings) — use the `Utils` date helpers, never `toISOString()`.
- Amounts are positive numbers rounded to 2 decimals; `type` (`income`/`expense`/`transfer`) gives the sign.
- Each type has one `system: true` "Other" category that can't be deleted; deleting a category reassigns its transactions to it.
- Repeating transactions are rules in `state.recurring` (`template` + `nextDate`); `Store.processRecurring()` materialises due ones on start-up and when the tab becomes visible.
- `Store.sanitize()` validates everything loaded from storage or a backup file — extend it when adding fields.
- `migrateLegacy()` imports data from the first version of the app (`expense-tracker-transactions` key); keep it working.
- **Undo for big changes:** wrap any action that replaces or removes lots of data in `App.safely(label, change, doneMessage)`, which saves a safety copy (`finance-tracker-v2-safety`, latest only) and offers Undo. `Store.resetAll()` always deletes the safety copy (so "Forgot PIN" can't be undone); only Settings' erase passes `{ allowUndo: true }` for an in-memory, 10-second Undo.
- `settings.lastBackupAt` / `backupReminderSnoozedUntil` drive the Home backup reminder; `App.downloadBackup()` updates them.
- **Budget alert:** the transaction form (`UI.openTransactionForm`) compares `Finance.budgetStatus` for the expense's category and month before and after saving, and appends "⚠ Close to limit / Over budget / Still over budget" to the confirmation toast (only when spending went up; percentage only when privacy mode is on). Repeating transactions added automatically don't alert.
- **Duplicate warning:** before saving, the form looks for another transaction with the same type, amount and date and the same description (case-insensitive; with no description, same category, or same accounts for transfers) and asks "Possible duplicate" via `UI.confirm` (Cancel keeps the form open). Edits only ask if type/amount/date/description changed. Test scripts that add the same entry twice on one day must answer that dialog. The matching rule is `Finance.entryKey()`, shared with the data check.
- **Check my data** (Settings → Your data): `Finance.checkData()` is read-only and returns `{ counts, problems, tips }` (duplicates, amounts > 10× their category's median with ≥5 entries, future dates, dates before 2000, cash accounts below zero, and entries `sanitize()` dropped, from `Store.cleanupReport()`). Add new checks there; the Settings modal renders whatever it returns.

**Security conventions**
- Build DOM only with `Utils.h()` / `Utils.svg()` (sets text via `textContent`); never use `innerHTML` with user data.
- CSV export goes through `Utils.csvCell()` (neutralises spreadsheet formula injection).
- The PIN is stored only as a PBKDF2-SHA-256 hash + salt (`security.js`); the lock screen closes open `<dialog>`s and makes `#app` inert.
- Amounts rendered with `Utils.money()` get the `.money` class so the "Hide amounts" privacy mode can blur them.

**Charts** are hand-drawn SVG in `charts.js` (no library). Colors come from CSS variables in `css/styles.css` (`--series-1` blue = income, `--series-2` orange = spending, validated for colour-blind safety in light and dark). Status colours (good/warning/critical) are reserved for budget/goal state and always paired with an icon and label. `Charts.card()` provides the Chart/Table toggle.

**Installable (PWA).** `manifest.webmanifest` + `icons/` make it installable; `sw.js` is a network-first service worker that caches the app shell for offline use (registered by `setUpInstall()` in `app.js`, only on secure, non-`file:` origins). When adding or renaming a file, update `FILES` in `sw.js` and bump `CACHE`. Settings → Install uses the `beforeinstallprompt` event via `App.canInstall()` / `App.install()`.

**Styling.** All colours are tokens on `:root` in `css/styles.css`, with dark values duplicated under `prefers-color-scheme: dark` (guarded by `:not([data-theme="light"])`) and `[data-theme="dark"]` (set by the theme setting). Layout switches to bottom navigation + floating "+" button below 860px.
