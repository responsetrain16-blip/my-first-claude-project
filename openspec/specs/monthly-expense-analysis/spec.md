# monthly-expense-analysis Specification

## Purpose

Gives the user a simple, plain-English look at one chosen month of spending: how much they spent, where it went, which category was biggest, and how it compares with the month before.

## Requirements

### Requirement: Choose a month to analyse
The Reports page SHALL show a "Monthly analysis" section with its own previous/next month switcher showing the chosen month's name. It SHALL open on the current month. It SHALL NOT move past the current month, nor before the month of the earliest transaction.

#### Scenario: Opens on the current month
- **WHEN** the user opens the Reports page
- **THEN** the Monthly analysis section shows the current month's name (for example "November 2026") and its figures

#### Scenario: Move to the previous month
- **WHEN** the user presses "Previous month"
- **THEN** the section shows the month before, and every figure in it is recalculated for that month

#### Scenario: No future months
- **WHEN** the current month is shown
- **THEN** the "Next month" button is disabled

#### Scenario: No months before the first transaction
- **WHEN** the shown month is the month of the earliest transaction
- **THEN** the "Previous month" button is disabled

### Requirement: Total spent in the month
The section SHALL show the total of all expense transactions dated within the chosen month (first to last day, inclusive). Income and transfers SHALL NOT be counted.

#### Scenario: Only expenses are counted
- **GIVEN** the chosen month has expenses of $40.00 and $10.50, an income of $2,000.00 and a transfer of $300.00
- **WHEN** the section is shown
- **THEN** the total spent is $50.50

#### Scenario: Month boundaries
- **GIVEN** expenses dated on the last day of the previous month and the first day of the next month
- **WHEN** the section is shown for the chosen month
- **THEN** neither of those expenses is included in its total

### Requirement: Spending by category
The section SHALL list every category with spending in the chosen month, showing its amount and its share of the month's total as a whole-number percentage, ordered from largest to smallest.

#### Scenario: Category breakdown
- **GIVEN** the chosen month has Groceries $300.00, Dining out $100.00 and Transport $100.00 of expenses
- **WHEN** the section is shown
- **THEN** Groceries is listed first with $300.00 and 60%, followed by Dining out and Transport with $100.00 and 20% each

### Requirement: Top spending category
The section SHALL name the category with the highest spending in the chosen month and its amount. When two or more categories tie for highest, it SHALL name all of them.

#### Scenario: One top category
- **GIVEN** Groceries has the most spending in the chosen month
- **WHEN** the section is shown
- **THEN** it names Groceries as the top category with its amount

#### Scenario: Tied top categories
- **GIVEN** Rent and Groceries both have $500.00 of spending, the highest in the month
- **WHEN** the section is shown
- **THEN** both Rent and Groceries are named as the top categories

### Requirement: Comparison with the previous month
The section SHALL compare the chosen month's total spent with the previous calendar month's, showing the difference in money and in whole percent with the words "more" or "less" and a matching up/down arrow. The arrow SHALL never be the only signal.

#### Scenario: Spent more than last month
- **GIVEN** the chosen month's total is $1,200.00 and the previous month's is $1,000.00
- **WHEN** the section is shown
- **THEN** it says $200.00 (20%) more than the previous month, by name

#### Scenario: Spent less than last month
- **GIVEN** the chosen month's total is $750.00 and the previous month's is $1,000.00
- **WHEN** the section is shown
- **THEN** it says $250.00 (25%) less than the previous month

#### Scenario: Same as last month
- **GIVEN** both months' totals differ by less than half a percent
- **WHEN** the section is shown
- **THEN** it says spending was about the same as the previous month, with no arrow

#### Scenario: Nothing to compare with
- **GIVEN** the previous month has no expenses
- **WHEN** the section is shown
- **THEN** it says there is no spending in the previous month to compare with, and shows no percentage

### Requirement: Biggest category changes
When both months have spending, the section SHALL name the category whose spending rose the most and the category whose spending fell the most compared with the previous month, with the amount of each change. A category absent from one month SHALL count as $0.00 there.

#### Scenario: Rise and fall named
- **GIVEN** Dining out went from $50.00 to $150.00 and Transport went from $120.00 to $40.00, the largest rise and fall
- **WHEN** the section is shown
- **THEN** it names Dining out as up $100.00 and Transport as down $80.00

#### Scenario: No category fell
- **GIVEN** no category's spending is lower than in the previous month
- **WHEN** the section is shown
- **THEN** no "biggest fall" is mentioned

### Requirement: Plain-English summary
The section SHALL show a short summary of three to five plain-English sentences about the chosen month's spending pattern, built only from that month's and the previous month's transactions. It covers the total, the top category's share, the number of expenses and their average, and the comparison.

#### Scenario: Summary for a normal month
- **GIVEN** the chosen month has 20 expenses totalling $400.00, with Groceries the top category at $200.00
- **WHEN** the section is shown
- **THEN** the summary includes sentences saying Groceries was 50% of spending and that there were 20 expenses averaging $20.00 each

#### Scenario: Current month is not finished
- **WHEN** the chosen month is the current month
- **THEN** the summary includes a sentence noting the month isn't over yet, so its totals may still grow

### Requirement: Empty month message
When the chosen month has no expenses, the section SHALL show a friendly message instead of the total, the categories, the top category and the summary, and the month switcher SHALL stay usable.

#### Scenario: Month with no spending
- **GIVEN** the chosen month has no expense transactions
- **WHEN** the section is shown
- **THEN** it shows a message such as "No spending recorded in March 2026" and the previous/next buttons still work

#### Scenario: No transactions at all
- **GIVEN** there are no transactions of any kind
- **WHEN** the Reports page is opened
- **THEN** the page shows its existing "Nothing to report yet" message and no Monthly analysis section

### Requirement: Privacy and safe display
Every money amount in the section, including amounts inside summary sentences, SHALL be hidden when "Hide amounts" privacy mode is on. Category names and descriptions SHALL be shown as plain text, never interpreted as page markup.

#### Scenario: Hide amounts is on
- **GIVEN** "Hide amounts" is turned on
- **WHEN** the section is shown
- **THEN** every amount in it, including those in the summary, is blurred, as elsewhere in the app

#### Scenario: Category name containing markup
- **GIVEN** a category named `<b>Food</b>`
- **WHEN** the section is shown
- **THEN** the name appears literally as `<b>Food</b>`, not as bold text

### Requirement: Existing data and features unchanged
Viewing the analysis SHALL NOT add, change or remove any stored data, and SHALL NOT change the behaviour of the existing Reports range picker, its charts, or any other page.

#### Scenario: Saved data untouched
- **GIVEN** the saved data in browser storage before opening Reports
- **WHEN** the user opens Reports and moves between several months
- **THEN** the saved data is exactly the same as before

#### Scenario: Existing Reports keep working
- **WHEN** the user picks "6 months" or "12 months" in the existing range picker
- **THEN** the existing charts and tables show the same figures as before this change
