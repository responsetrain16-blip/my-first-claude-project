# Design: Smart Monthly Expense Analysis

## Context

See `proposal.md` for the reason and `specs/monthly-expense-analysis/spec.md` for the exact behaviour. These facts about the current app shape the approach:

- **Partly built already.** The Home page shows the current month's spending, its category breakdown and a "% vs last month" arrow (`views/dashboard.js`). Reports shows category totals and "insights" for a *range* of months (`views/reports.js`). Neither lets you pick one past month.
- **The building blocks exist** in `Finance` (`store.js`): `inRange(from, to)`, `totals(list)`, `monthTotals(key)`, `byCategory(list, "expense")` and `firstMonthKey()`. `Utils` (`utils.js`) has `monthRange`, `addMonthsToKey`, `currentMonthKey`, `monthLabel`, `percent`, `money` and `formatMoney`.
- **A month switcher already exists** on the Budgets page (`.month-switcher`, `.month-label`, "Previous month"/"Next month" buttons, the next button disabled at the current month).
- **Whole-view re-rendering:** any data change re-draws the current page from `Store.state`. Calculations must therefore be pure and fast, and must never be stored.
- **The tester clashes with a careless placement.** In `check.js` the Reports checks click the *first* "Table" button found in a `.card-actions` element, then read *every* `.data-table` row on the page, expecting 6 (then 12) month rows. A new `Charts.card` with its own Table toggle placed above "Income vs. spending" would break those checks.
- **The existing Reports "insights" use `formatMoney` in plain text,** so privacy mode doesn't blur those amounts. The new summary must not copy that pattern.

## Goals / Non-Goals

**Goals:**
- Keep the money maths in one small, read-only `Finance` function that can be checked from the browser console and by the tester.
- Reuse existing components (`UI.card`, `UI.statTile`, `Charts.barList`, the month-switcher markup and styles) so the new card looks like the rest of the app in light and dark mode at phone and desktop widths.
- Add no new files, data fields or dependencies.

**Non-Goals:**
- Changing the Home page, or making the existing Reports insights blur in privacy mode (a separate, small fix worth doing later).
- Remembering the chosen month after a reload.
- Charts beyond the bar list (no new SVG chart type).

## Decisions

### 1. Put it on the Reports page, not a new page
The card goes at the top of Reports, **above** the existing range picker, with its own heading and month switcher inside the card header.
- *Why:* Reports is already "the place to understand your money". The phone bottom bar only has room for five links (`NAV.slice(0, 5)` in `app.js`), so a seventh page would be hidden on phones.
- *Alternatives:* a new `#/analysis` page (hidden on phones, more wiring); a "One month" option in the range picker (would change how every existing Reports chart behaves, which goes against "don't change existing features"); the Home page (already busy, and only ever about the current month).
- *Avoiding confusion:* the card has its own switcher and is visually separate. The range picker stays directly above the charts it controls.

### 2. One read-only helper: `Finance.monthAnalysis(monthKey)`
It returns plain numbers and category objects, roughly:
`{ key, prevKey, total, count, average, categories: [{ category, total, count, share, prevTotal, change }], top: [...], prevTotal, change, changeRatio, biggestRise, biggestFall, isCurrentMonth }`.
It is built from `inRange` + `byCategory` for both months. `changeRatio` is `null` when the previous month's total is 0. Changes under 0.5% count as "about the same", the same rule the Home page arrows use. Ties for the top category are detected by comparing totals rounded to cents.
- *Why:* this keeps the maths separate from the drawing, matches how `budgetStatus` and `checkData` already work, and lets the tester check exact numbers.
- *Alternative:* computing inside the view (harder to test, and the logic would sit mixed in with DOM code).

### 3. Summary sentences are built in the view, from DOM pieces
Each sentence is an `<li>` made with `Utils.h()`, mixing text with `Utils.money()` spans, so privacy mode blurs every amount and no `innerHTML` is used. Sentences are chosen by simple rules, in order, keeping at most five:
1. Total and comparison ("You spent $X in August, $Y (Z%) less than July.") or the "nothing to compare" version.
2. Top category share ("Groceries was 34% of your spending.").
3. Count and average ("You made 23 expenses, about $18.40 each.").
4. Biggest rise/fall ("Dining out went up the most (+$60.00).").
5. Concentration, if the top category is ≥ 50% of spending ("Over half of your spending went on one category."), **or**, for the current month, "This month isn't over yet, so these totals may still grow." The current-month note takes priority over the concentration sentence.

### 4. Category list without a Chart/Table toggle
Use `Charts.barList` inside a plain `UI.card` (as the Home page does), not `Charts.card`.
- *Why:* `barList` already shows each name, amount and percent as readable text, so it's accessible without a table. It also avoids the tester clash described in Context.

### 5. Month state lives in the view, in memory
A `let month = Utils.currentMonthKey()` variable inside `Views.reports`, like Budgets. It's clamped to the range `[Finance.firstMonthKey(), currentMonthKey()]` on every render, so deleting old transactions can't leave it pointing at an invalid month.

### 6. Comparison colours
The comparison uses `UI.statTile`'s existing `delta` arrow. Spending less shows `good`, spending more shows `bad`, always with the words "more"/"less", so colour is never the only signal. This follows the colour-blind-safe rules in ADR 0007. No new colour tokens.

## Risks / Trade-offs

- **[Comparing a half-finished month with a full one looks alarming]** → the summary says when the month isn't over yet. A "same day last month" comparison is left for later.
- **[Floating-point rounding, e.g. 0.1 + 0.2]** → round totals and changes to cents before comparing or showing them. The tester checks exact amounts.
- **[Tester relies on the first Table button and all `.data-table` rows]** → the new card has no Table toggle (Decision 4). Run the full tester to confirm the existing Reports checks still pass.
- **[Performance with many transactions]** → two filtered passes over the transactions per render, the same cost as the existing Home page. Fine for personal-sized data.
- **[Deleted category]** → transactions are already moved to "Other" when a category is deleted, and `byCategory` skips missing categories. The total is computed from all expenses, so it stays correct even if a category lookup fails.

## Migration Plan

No data migration: nothing new is stored. Deploying is a normal push to `main` (GitHub Pages). `sw.js` is network-first and the file list is unchanged, so no `CACHE` bump is needed. To roll back, revert the commit. Saved data is unaffected either way.
