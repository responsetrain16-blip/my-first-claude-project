# Expense & Income Tracker

A simple web app that helps you keep track of the money you earn and spend.

## What it does

- **Add income and expenses** with a description, amount, category, and date
- **See your totals** for income, expenses, and your balance (income minus expenses)
- **Filter** by month, or show only income or only expenses
- **Delete** transactions you no longer want
- **Saves automatically**: your data is stored in your browser, so it's still there when you come back

## How to use it

No installation needed!

1. Open the `expense-tracker` folder.
2. Double-click `index.html`. It opens in your web browser.
3. Start adding transactions.

## Files in this project

| File | What it does |
|------|--------------|
| `index.html` | The structure of the page (the form, the totals, the list) |
| `style.css` | How the page looks (colors, spacing, layout) |
| `app.js` | How the page works (adding, deleting, saving, and calculating totals) |

## Things to know

- Your data is saved **only in the browser you use**. If you open the app in a different browser or computer, or clear your browser data, you won't see the same transactions.
- Amounts are shown in US dollars. To change this, edit `CURRENCY` near the top of `app.js` (for example, `"EUR"` or `"GBP"`).
- You can change the categories by editing the `CATEGORIES` list in `app.js`.

## Ideas for later

- Export transactions to a spreadsheet (CSV file)
- Edit a transaction instead of deleting and re-adding it
- Show a chart of spending by category
