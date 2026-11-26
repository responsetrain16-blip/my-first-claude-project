# Tasks

## 1. The maths: `Finance.monthAnalysis(monthKey)`

- [x] 1.1 In `expense-tracker/js/store.js`, add a read-only `monthAnalysis(key)` to `Finance` (after `budgetStatus`), with a plain-English comment. It returns the shape in design.md Decision 2: expense total, count and average; categories largest-first with share, previous-month total and change; tied top categories; previous total; change and `changeRatio` (`null` when the previous month is 0, "about the same" under 0.5%); biggest rise and fall; and `isCurrentMonth`. Round money to cents. Add it to `Finance`'s returned object. Verify: `node --check expense-tracker/js/store.js` passes.
- [x] 1.2 With demo data loaded on a local server (`python3 -m http.server 8799 --bind 127.0.0.1 --directory expense-tracker`), run `Finance.monthAnalysis(Utils.currentMonthKey())` in the browser console. Verify `total` equals `Finance.monthTotals(key).expense`, the category totals add up to `total`, transfers and income are excluded, and `Store.state` / `localStorage` are unchanged afterwards.
- [x] 1.3 Add one line to CLAUDE.md's "Data model notes" describing `Finance.monthAnalysis()` (read-only, computed on the fly, never stored). Verify the line is there and matches the function's real return fields.

## 2. The Monthly analysis card on Reports

- [x] 2.1 In `expense-tracker/js/views/reports.js`, add an in-memory `month` variable (like Budgets), clamped on each render to the range `[Finance.firstMonthKey(), Utils.currentMonthKey()]`. Draw a "Monthly analysis" `UI.card` **above** the existing range picker, with a `.month-switcher` in its header ("Previous month"/"Next month" buttons, next disabled at the current month, previous disabled at the first month). Skip the card when there are no transactions at all (the existing empty state shows instead). Verify: `node --check` passes. In the browser, the card opens on the current month, the arrows move between months and stop at both ends, and the range picker below still changes the existing charts.
- [x] 2.2 Inside the card, show: a "Spent in <Month>" `UI.statTile` with the comparison `delta` (spending less is good, more is bad; the words "more"/"less" plus the previous month's name; no arrow when "about the same" or there's nothing to compare); the top category (all names when tied); and the category list with `Charts.barList` (no `Charts.card` and no Table toggle, per design Decision 4). Use only `Utils.h()` and `Utils.money()`, never `innerHTML`. Verify in the browser against the spec scenarios "Category breakdown", "Tied top categories" and "Spent more/less than last month".
- [x] 2.3 Add the "Summary" list (reuse the `.insights` list style) built from the rules in design Decision 3, max five sentences, with every amount as a `Utils.money()` span. Show the empty-month message ("No spending recorded in <Month>") instead of the figures when the month has no expenses. Verify: with "Hide amounts" on, every amount in the card is blurred. A category named `<b>Food</b>` shows literally. The current month shows the "isn't over yet" sentence. A month with no expenses shows the friendly message and the arrows still work.
- [x] 2.4 Add any small styles needed in `expense-tracker/css/styles.css` (e.g. spacing for the card header with the switcher, wrapping on phones), using existing colour tokens only. Verify the card looks right at 390px and 1280px wide, in light and dark mode, with no sideways scrolling.

## 3. Automated checks

- [x] 3.1 In `plugins/expense-tracker-tester/skills/expense-tracker-tester/scripts/check.js`, add checks to the Reports section with known test data. Cover: the total equals the sum of that month's expenses only; the top category is right; the comparison amount and percent are right; "Next month" is disabled on the current month; the previous month recalculates; the empty month message; and amounts are blurred in privacy mode. Make sure the existing Reports checks still find their table first. Verify: the full script prints PASS for every new and existing check (`NODE_PATH=<temp>/node_modules node plugins/expense-tracker-tester/skills/expense-tracker-tester/scripts/check.js http://127.0.0.1:8799/index.html <screenshot-dir>`).
- [x] 3.2 Add the new checks to the "What the automated checks cover" list and the "Test by hand" steps in `TESTING.md`, and to the tester skill's QA checklist if it lists Reports items. Verify the wording matches what the script actually checks.

## 4. Docs and final checks

- [x] 4.1 In README.md, add a bullet to "What I've built so far" (e.g. "See a plain-English analysis of any month's spending: total, categories, top category and how it compares with the month before") and a dated line at the top of "Recent changes". Verify both read clearly for a beginner.
- [x] 4.2 Run the syntax check for all JS files (`for f in expense-tracker/js/*.js expense-tracker/js/views/*.js; do node --check "$f"; done`) and `plugins/pr-check/skills/pr-check/scripts/pr-check.sh`. Verify both finish with no errors and no new warnings (no `innerHTML`, no secrets, no unregistered files).
- [x] 4.3 Final hand check with real-looking data: existing transactions, budgets, goals and the Home page look and behave exactly as before, and a backup downloaded before and after viewing the analysis contains the same data. Verify by comparing the two backup files (only `exportedAt`-style timestamps may differ).

## Workflow follow-up

- After review and merge, archive the change with the OpenSpec archive workflow so `monthly-expense-analysis` becomes a main spec in `openspec/specs/`.
