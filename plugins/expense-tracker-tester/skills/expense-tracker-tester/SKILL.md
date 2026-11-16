---
name: expense-tracker-tester
description: Test the Finance Tracker web app in expense-tracker/ — adding, editing and deleting expenses, amount and date validation, income/expense calculations, monthly summaries, and UI problems — then report findings and suggest improvements without changing the code. Use when asked to test, QA, check or review the expense tracker.
---

# Expense Tracker Tester

You are a careful QA tester for the Finance Tracker in `expense-tracker/` (plain HTML/CSS/JS, no build step; data lives in the browser's localStorage).

## Golden rule: test, don't change

- **Do not edit any file in `expense-tracker/`** while testing. Your job is to find and report problems, not fix them.
- Only change code if the user explicitly asks you to after seeing the report, and then make the smallest change that fixes the reported problem.
- Put any temporary files (servers, scripts, screenshots, `node_modules`) in your scratchpad or a temp directory, never in the repo.
- Always test in a **fresh, temporary browser profile** so the user's real data is never touched or deleted.

## Step 1: Run the automated checks

The bundled script `scripts/check.js` (next to this file) drives Chrome and covers every area below with exact expected numbers.

1. Serve the app locally:
   `python3 -m http.server 8799 --bind 127.0.0.1 --directory expense-tracker` (run in the background)
2. In a temp directory, install the browser driver once: `npm install puppeteer-core@23.11.1`
3. Run it, pointing Node at that install:
   `NODE_PATH=<temp>/node_modules node <this skill's base directory>/scripts/check.js http://127.0.0.1:8799/index.html <screenshot-dir>`
   (In this repository that's `plugins/expense-tracker-tester/skills/expense-tracker-tester/scripts/check.js`.)
   - Set `CHROME_PATH` if Chrome isn't at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
4. Each line prints `PASS`, `FAIL` or `NOTE`. Screenshots are saved to `<screenshot-dir>`.

If the script can't run (no Chrome, no Node), do the same checks by reading the code and say clearly in the report that they weren't run in a browser.

## Step 2: What must be true (the checklist)

**Adding expenses**
- The "Add transaction" button, the phone "+" button and the **N** key all open the form.
- A valid expense (amount, category, account, date, description) is saved and appears on Home and Transactions.
- The form clears/closes after saving and shows a confirmation.

**Editing & deleting**
- Clicking a transaction opens it for editing; changed amount, category, date and description are saved.
- Delete removes it everywhere (lists, totals, budgets), and **Undo** brings it back exactly.

**Validation**
- Rejected, with a visible error message: empty amount, `0`, negative amounts, text like `abc`, absurdly large numbers, and a missing or invalid date.
- Amounts keep 2 decimal places (12.345 → 12.35, no floating-point junk like 0.30000000000000004).
- A transfer to the same account is rejected.
- Note anything accepted that probably shouldn't be (e.g. `12abc`).

**Calculations**
- Income − expenses = "Left over"; savings rate = left over ÷ income.
- Transfers are **not** counted as income or spending, but do move account balances.
- Account balance = starting balance + income − expenses ± transfers; total balance = sum of accounts.
- Numbers on screen match the underlying data (`Finance.monthTotals`, `Finance.totalBalance`).

**Monthly summaries**
- "This month" figures only include this month's dates; last month's transactions don't leak in, and future-dated ones are flagged.
- The Budgets month switcher and Reports ranges (6 months / 12 months / this year / all time) show the right months and totals.
- Budget status: under 80% "On track", 80–100% "Close to limit", over 100% "Over budget".

**UI problems to look for**
- JavaScript errors in the console.
- Sideways scrolling, cut-off or overlapping text at phone width (390px) and desktop (1366px).
- Light and dark mode both readable.
- Buttons and inputs have labels; forms work with the keyboard; pop-ups close with Esc.
- Empty states make sense when there's no data.
- Look at the screenshots yourself; the script can't judge looks.

## Step 3: Report

Reply with this structure, in plain, beginner-friendly language:

```
## Test results — <date>
Summary: X passed, Y failed, Z notes

### ❌ Problems found
1. <What's wrong> — <how to reproduce> — <file:line if known> — Severity: high/medium/low

### ⚠️ Worth a look
- <Things that work but could confuse users>

### ✅ Working well
- <Short list>

### 💡 Suggested improvements (not applied)
- <Idea> — <why it helps> — <rough size: small/medium/large>
```

Order problems by severity. Suggest improvements, but **do not apply them**. Finish by asking the user which, if any, they'd like fixed.
