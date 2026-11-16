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
- **Tests:** there is no test runner. The `expense-tracker-tester` plugin (`plugins/expense-tracker-tester/`, enabled for this project in `.claude/settings.json`; also runnable as `/test-tracker`) holds the QA checklist and a Puppeteer script that drives Chrome in a fresh profile and checks adding/editing/deleting, validation, exact calculations, monthly summaries and UI at phone/desktop widths in light/dark mode:
  ```
  # once, in a temp dir (never in the repo): npm install puppeteer-core@23.11.1
  NODE_PATH=<temp>/node_modules node plugins/expense-tracker-tester/skills/expense-tracker-tester/scripts/check.js http://127.0.0.1:8799/index.html <screenshot-dir>
  ```
  It prints PASS/FAIL/NOTE per check; there's no way to run a single check other than editing a copy of the script. The skill's rule is "test, don't change": report findings and only fix what the user asks for.

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

**Security conventions**
- Build DOM only with `Utils.h()` / `Utils.svg()` (sets text via `textContent`); never use `innerHTML` with user data.
- CSV export goes through `Utils.csvCell()` (neutralises spreadsheet formula injection).
- The PIN is stored only as a PBKDF2-SHA-256 hash + salt (`security.js`); the lock screen closes open `<dialog>`s and makes `#app` inert.
- Amounts rendered with `Utils.money()` get the `.money` class so the "Hide amounts" privacy mode can blur them.

**Charts** are hand-drawn SVG in `charts.js` (no library). Colors come from CSS variables in `css/styles.css` (`--series-1` blue = income, `--series-2` orange = spending, validated for colour-blind safety in light and dark). Status colours (good/warning/critical) are reserved for budget/goal state and always paired with an icon and label. `Charts.card()` provides the Chart/Table toggle.

**Installable (PWA).** `manifest.webmanifest` + `icons/` make it installable; `sw.js` is a network-first service worker that caches the app shell for offline use (registered by `setUpInstall()` in `app.js`, only on secure, non-`file:` origins). When adding or renaming a file, update `FILES` in `sw.js` and bump `CACHE`. Settings → Install uses the `beforeinstallprompt` event via `App.canInstall()` / `App.install()`.

**Styling.** All colours are tokens on `:root` in `css/styles.css`, with dark values duplicated under `prefers-color-scheme: dark` (guarded by `:not([data-theme="light"])`) and `[data-theme="dark"]` (set by the theme setting). Layout switches to bottom navigation + floating "+" button below 860px.
