# Proposal: Smart Monthly Expense Analysis

## Why

The Finance Tracker can already show *this* month's spending (Home page) and spending over several months together (Reports page). It can't answer simple questions about **one particular month**, like "What did I spend in August, where did it go, and was that more or less than July?" The Home page only ever shows the current month, and Reports always adds several months together. A single, easy-to-read analysis for any month you pick fills that gap without changing how anything else works.

## What Changes

- Add a new **"Monthly analysis"** card at the top of the **Reports** page, with its own **‹ month ›** switcher (the same style as the Budgets page). It opens on the current month. You can't move into future months, and you can't go back before the month of your first transaction.
- For the chosen month the card shows:
  1. **Total spent** in that month (expenses only; transfers and income are not counted).
  2. **Spending by category**: each category's amount and its share of the month, largest first.
  3. **Top category**: the category you spent the most on (every category is named if two or more tie).
  4. **Compared with the previous month**: the change in money and in percent, with an up/down arrow and the words "more" or "less". It also names the category that went up the most and the one that went down the most.
  5. **Summary**: 3–5 short plain-English sentences describing the month's spending pattern. Examples: "Groceries was a third of your spending", "You made 23 purchases, about $18 each on average", "This month isn't over yet, so the totals may still grow".
- Friendly messages for empty cases: no spending in the chosen month, or no spending in the previous month to compare with.
- All amounts use the existing money display, so the **Hide amounts** privacy mode blurs them, including the amounts inside the summary sentences.
- **Nothing is stored.** The analysis is worked out from your existing transactions each time the page draws. No new data fields, no change to the saved data format and no migration are needed. Existing records, backups and `localStorage` stay exactly as they are.
- **No existing features change.** The Reports range picker (6 months / 12 months / This year / All time) and all its charts keep working exactly as now. The Home page is untouched.

**Not included in this change:** income analysis, budgets inside the analysis, choosing a custom date range, exporting the analysis, and saving which month you last looked at.

## Capabilities

### New Capabilities
- `monthly-expense-analysis`: a per-month look at spending: the total, the category breakdown, the top category, the comparison with the previous month and a plain-English summary, for any month the user chooses.

### Modified Capabilities
- None. (No specs exist yet, and no existing behaviour's requirements change.)

## Impact

- **Code:** `expense-tracker/js/store.js` (one new read-only `Finance.monthAnalysis(monthKey)` helper), `expense-tracker/js/views/reports.js` (the new card and its month switcher) and `expense-tracker/css/styles.css` (a few small styles for the new card, using existing colour tokens only).
- **No new files**, so `index.html` and `sw.js` (offline file list) don't need changing.
- **Data:** no change to `Store.state`, `sanitize()`, backups or `localStorage`.
- **Tests:** the tester plugin's script (`check.js`) gets new checks for the analysis. The existing Reports checks must keep passing.
- **Docs:** README ("What I've built so far" and "Recent changes"), CLAUDE.md (one data-model note) and TESTING.md (checklist items).
- **Dependencies:** none added.
