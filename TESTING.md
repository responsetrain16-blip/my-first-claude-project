# Testing

This guide explains how to check that the Finance Tracker works properly. There are three ways to test it, from easiest to most thorough:

1. **Ask Claude Code** to test it for you
2. **Run the automated checks** yourself in the terminal
3. **Test by hand** in your browser using the checklist below

> **Your data is safe.** The automated tests open a fresh, temporary Chrome window, so they never see or change the data in your normal browser.

## 1. Ask Claude Code (easiest)

This project includes a Claude Code **skill** called `expense-tracker-tester`. A skill is a set of saved instructions that tells Claude how to do a specific job.

In the terminal, inside this project, start Claude Code and type:

```
test the expense tracker
```

Claude will run all the checks, look at the screenshots, and give you a report with:

- ❌ **Problems found**, ordered from most to least serious
- ⚠️ **Worth a look**: things that work but could confuse people
- ✅ **Working well**
- 💡 **Suggested improvements**

The skill follows one rule: **test, don't change.** Claude won't edit any code unless you ask it to after reading the report.

## 2. Run the automated checks yourself

You need **Node.js** and **Google Chrome** installed.

**Step 1: start a small local web server** (leave it running in one terminal window):

```
python3 -m http.server 8799 --bind 127.0.0.1 --directory expense-tracker
```

**Step 2: install the browser driver once**, in a folder outside this project (so it isn't saved to GitHub):

```
mkdir -p ~/tracker-test && cd ~/tracker-test
npm install puppeteer-core@23.11.1
```

**Step 3: run the checks** from the project folder, in a second terminal window:

```
NODE_PATH=~/tracker-test/node_modules node .claude/skills/expense-tracker-tester/scripts/check.js http://127.0.0.1:8799/index.html ~/tracker-test/screenshots
```

If Chrome is installed somewhere unusual, add `CHROME_PATH="/path/to/chrome"` at the start of that command.

### Reading the results

Each line starts with one of three words:

| Word | Meaning |
|------|---------|
| `PASS` | This check worked as expected ✅ |
| `FAIL` | Something is wrong and should be fixed ❌ |
| `NOTE` | Not wrong, but worth knowing about ⚠️ |

The last line gives a summary, for example `SUMMARY: 48 passed, 0 failed, 3 notes`. Screenshots of every page, at phone and desktop size and in light and dark mode, are saved in the screenshots folder so you can look at them yourself.

### What the automated checks cover

| Area | What's checked |
|------|----------------|
| **Adding expenses** | The add button, the phone "+" button and the **N** key open the form; a saved expense shows up on Home and Transactions |
| **Validation** | Empty, zero, negative, text and huge amounts are rejected with an error; missing dates are rejected; amounts round to 2 decimals; a transfer to the same account is rejected |
| **Editing & deleting** | Changes are saved; deleting removes the transaction everywhere; **Undo** brings it back exactly |
| **Calculations** | Income − expenses = "Left over"; transfers aren't counted as income or spending; account balances and the total balance are exactly right |
| **Monthly summaries** | "This month" only includes this month; the Budgets month switcher and Reports ranges show the right totals; budget labels change at 80% and 100% |
| **UI** | No JavaScript errors; no sideways scrolling at phone (390px) or desktop (1366px) width; light and dark mode; the Esc key closes pop-ups |

## 3. Test by hand

Open the [live site](https://responsetrain16-blip.github.io/my-first-claude-project/expense-tracker/) or `expense-tracker/index.html`.

> **Tip:** use a private/incognito window so your test data doesn't mix with your real data. Or use **Explore with demo data** on the empty Home page (or **Settings → Demo data**) to get sample transactions to play with.

**Adding**
- [ ] Click **Add transaction**, enter an expense, and save. It appears on Home and on Transactions.
- [ ] Press **N** on the keyboard. The form opens.
- [ ] On a phone (or a narrow window), tap the **+** button. The form opens.

**Validation**
- [ ] Try saving with an empty amount, `0`, `-5` and `abc`. Each shows an error and nothing is saved.
- [ ] Enter `12.345`. It's saved as `12.35`.
- [ ] Try a transfer from an account to the same account. It's refused.

**Editing & deleting**
- [ ] Click a transaction, change its amount, and save. The new amount shows everywhere.
- [ ] Delete it, then click **Undo**. It comes back.

**Numbers**
- [ ] On Home, check that Income − Spending = Left over.
- [ ] Add a transfer. Income and Spending don't change, but the two account balances do.

**Budgets & reports**
- [ ] Set a budget and spend close to it. The label changes from "On track" to "Close to limit" (80%) and then "Over budget" (over 100%).
- [ ] On Reports, switch between 6 months, 12 months, this year and all time.

**Look & feel**
- [ ] Switch between light and dark mode in Settings. Everything is readable.
- [ ] Make the window narrow. The bottom menu appears and nothing is cut off.
- [ ] Press **Esc** in a pop-up. It closes.

**Security**
- [ ] Set a PIN in Settings, then lock the website. It asks for the PIN.
- [ ] Turn on **Hide amounts**. All money amounts are blurred.

**Installing & offline**
- [ ] On the live site, go to **Settings → Install** and install it. It opens in its own window with the 💰 icon.
- [ ] Open the installed version, turn off Wi-Fi, and reopen it. It still opens and shows your data.

> The PIN lock and installing need `https` or `localhost`, so test it on the live site or through the local server from step 2, not by double-clicking `index.html`.

## Before you push changes

1. Check every JavaScript file for typing mistakes (syntax errors):
   ```
   for f in expense-tracker/js/*.js expense-tracker/js/views/*.js; do node --check "$f"; done
   ```
   No output means no errors.
2. Run the automated checks (or ask Claude Code to test). Make sure there are **0 failed**.
3. Open the website and quickly try the thing you changed.
