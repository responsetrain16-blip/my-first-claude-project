// Automated checks for the Finance Tracker.
// Usage: NODE_PATH=<dir>/node_modules node check.js <app-url> [screenshot-dir]
// Runs in a fresh, temporary browser profile, so it never touches real user data.
// It only reads and clicks; it never edits the app's files.

const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const URL = process.argv[2] || "http://127.0.0.1:8799/index.html";
const SHOTS = process.argv[3] || path.join(require("os").tmpdir(), "expense-tracker-shots");
const CHROME = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
fs.mkdirSync(SHOTS, { recursive: true });

const results = { pass: 0, fail: 0, note: 0 };
const pass = (msg) => { results.pass++; console.log("PASS  " + msg); };
const fail = (msg) => { results.fail++; console.log("FAIL  " + msg); };
const note = (msg) => { results.note++; console.log("NOTE  " + msg); };
const check = (ok, msg, detail = "") => (ok ? pass(msg) : fail(msg + (detail ? ` (${detail})` : "")));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const near = (a, b) => Math.abs(a - b) < 0.005;

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--no-first-run"] });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("dialog", (d) => d.dismiss());
  await page.setViewport({ width: 1366, height: 900 });

  // Start from a clean slate inside this temporary profile
  await page.goto(URL, { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });

  const app = (fn, ...args) => page.evaluate(fn, ...args);
  const openForm = async (how = "button") => {
    if (how === "button") {
      // Desktop has "Add transaction" in the sidebar; phones have the round "+" button
      const desktop = await page.$eval("#add-btn", (b) => b.offsetParent !== null);
      await page.click(desktop ? "#add-btn" : "#fab");
    }
    else if (how === "key") { await page.click("body"); await page.keyboard.press("n"); }
    await page.waitForSelector("dialog[open] .amount-input", { timeout: 2000 });
  };
  const closeForm = async () => { await page.keyboard.press("Escape"); await wait(150); };
  const formError = () => page.$eval("dialog[open] .form-error", (e) => (e.hidden ? "" : e.textContent)).catch(() => "");
  const submit = async () => { await page.click("dialog[open] button[type=submit]"); await wait(250); };
  const count = () => app(() => Store.state.transactions.length);

  // ---------------- Adding ----------------
  console.log("\n== Adding expenses ==");
  try { await openForm("button"); pass("'Add transaction' button opens the form"); await closeForm(); } catch { fail("'Add transaction' button opens the form"); }
  try { await openForm("key"); pass("N key opens the form"); await closeForm(); } catch { fail("N key opens the form"); }

  await openForm();
  await page.type("dialog[open] .amount-input", "200");
  await page.click("dialog[open] .chip:nth-child(2) span"); // Groceries
  await page.type("dialog[open] input[list]", "Weekly shop");
  await submit();
  const added = await app(() => {
    const t = Store.state.transactions.find((x) => x.description === "Weekly shop");
    return t && { amount: t.amount, type: t.type, category: Store.getCategory(t.categoryId)?.name, date: t.date, today: Utils.todayStr() };
  });
  check(added && added.amount === 200 && added.type === "expense", "expense is saved with the right amount", JSON.stringify(added));
  check(added && added.category === "Groceries", "chosen category is saved", added?.category);
  check(added && added.date === added.today, "date defaults to today");
  check(!(await page.$("dialog[open]")), "form closes after saving");
  check(await page.$eval("#toasts", (t) => t.textContent.includes("added")), "a confirmation message appears");
  await page.evaluate(() => { location.hash = "#/transactions"; });
  await wait(250);
  check(await page.$$eval(".tx-title", (els) => els.some((e) => e.textContent === "Weekly shop")), "new expense appears in the Transactions list");

  // ---------------- Validation ----------------
  console.log("\n== Validation ==");
  for (const [input, label] of [["", "empty amount"], ["0", "zero"], ["-5", "negative amount"], ["abc", "text"], ["99999999999999", "absurdly large amount"]]) {
    const before = await count();
    await openForm();
    if (input) await page.type("dialog[open] .amount-input", input);
    await submit();
    const err = await formError();
    check(err && (await count()) === before, `${label} is rejected with a message`, err || "was accepted");
    await closeForm();
  }
  {
    const before = await count();
    await openForm();
    await page.type("dialog[open] .amount-input", "12abc");
    await submit();
    if ((await count()) > before) note("'12abc' is accepted as 12. Lenient; may be fine, but worth knowing");
    else pass("'12abc' is rejected");
    await closeForm();
  }
  {
    await openForm();
    await page.type("dialog[open] .amount-input", "12.345");
    await page.type("dialog[open] input[list]", "Rounding test");
    await submit();
    const amt = await app(() => Store.state.transactions.find((t) => t.description === "Rounding test")?.amount);
    check(amt === 12.35, "amounts are rounded to 2 decimal places (12.345 → 12.35)", String(amt));
  }
  {
    const before = await count();
    await openForm();
    await page.type("dialog[open] .amount-input", "10");
    await page.$eval('dialog[open] input[type="date"]', (el) => { el.value = ""; });
    await submit();
    check((await formError()) && (await count()) === before, "missing date is rejected with a message");
    await closeForm();
  }
  {
    const before = await count();
    await app(() => UI.openTransactionForm(null, { type: "transfer" }));
    await page.waitForSelector("dialog[open] .amount-input");
    await page.type("dialog[open] .amount-input", "10");
    const selects = await page.$$("dialog[open] select");
    const firstValue = await selects[0].evaluate((s) => s.value);
    await selects[1].select(firstValue);
    await submit();
    check((await formError()) && (await count()) === before, "transfer to the same account is rejected");
    await closeForm();
  }
  {
    const future = await app(() => Utils.addDays(Utils.todayStr(), 400));
    const before = await count();
    await openForm();
    await page.type("dialog[open] .amount-input", "5");
    await page.$eval('dialog[open] input[type="date"]', (el, v) => { el.value = v; }, future);
    await submit();
    if ((await count()) > before) {
      note(`a date over a year in the future (${future}) is accepted without warning`);
      await app((d) => { const t = Store.state.transactions.find((x) => x.date === d); if (t) Store.deleteTransaction(t.id); }, future);
    } else pass("far-future dates are rejected");
    await closeForm();
  }

  // ---------------- Editing & deleting ----------------
  console.log("\n== Editing & deleting ==");
  await page.evaluate(() => { location.hash = "#/transactions"; });
  await wait(250);
  const rows = await page.$$(".tx-row");
  let editedRow = null;
  for (const r of rows) if ((await r.$eval(".tx-title", (e) => e.textContent)) === "Weekly shop") editedRow = r;
  if (!editedRow) fail("could not find the expense to edit");
  else {
    await editedRow.click();
    await page.waitForSelector("dialog[open] .amount-input");
    check(await page.$eval("dialog[open] .amount-input", (e) => e.value === "200"), "edit form is pre-filled with the saved amount");
    await page.$eval("dialog[open] .amount-input", (e) => { e.value = ""; });
    await page.type("dialog[open] .amount-input", "150");
    await page.$eval("dialog[open] input[list]", (e) => { e.value = ""; });
    await page.type("dialog[open] input[list]", "Weekly shop (edited)");
    await submit();
    const edited = await app(() => Store.state.transactions.find((t) => t.description === "Weekly shop (edited)"));
    check(edited && edited.amount === 150, "edited amount and description are saved");
    check(!(await app(() => Store.state.transactions.some((t) => t.description === "Weekly shop"))), "editing changes the transaction instead of adding a copy");

    const before = await count();
    await app(() => UI.openTransactionForm(Store.state.transactions.find((t) => t.description === "Weekly shop (edited)")));
    await page.waitForSelector("dialog[open] .danger-text");
    await page.click("dialog[open] .danger-text");
    await wait(250);
    check((await count()) === before - 1, "delete removes the transaction");
    const undo = await page.$(".toast-action");
    if (undo) { await undo.click(); await wait(250); }
    const restored = await app(() => Store.state.transactions.find((t) => t.description === "Weekly shop (edited)"));
    check(restored && restored.amount === 150, "Undo restores the deleted transaction exactly");
  }

  // ---------------- Calculations ----------------
  console.log("\n== Calculations ==");
  const calc = await app(() => {
    localStorage.clear();
    Store.resetAll();
    const [cash, bank] = Store.state.accounts;
    bank.openingBalance = 1000;
    Store.commit();
    const today = Utils.todayStr();
    const lastMonth = Utils.monthRange(Utils.addMonthsToKey(Utils.currentMonthKey(), -1)).from;
    const cat = (type, name) => Store.categoriesOf(type).find((c) => c.name === name).id;
    const add = (type, amount, name, account, date = today, extra = {}) =>
      Store.addTransaction({ type, amount, categoryId: name ? cat(type, name) : null, accountId: account.id, date, description: "calc", tags: [], ...extra });
    add("income", 2500, "Salary", bank);
    add("expense", 0.1, "Food & Dining", cash);
    add("expense", 0.2, "Food & Dining", cash);
    add("expense", 799.7, "Housing", bank);
    add("transfer", 300, null, bank, today, { toAccountId: cash.id });
    add("expense", 999, "Shopping", bank, lastMonth); // must NOT appear in this month
    Store.setBudget(cat("expense", "Food & Dining"), 0.35); // 0.30 spent → 86% → warning
    Store.setBudget(cat("expense", "Housing"), 700);        // over
    Store.setBudget(cat("expense", "Groceries"), 100);      // 0% → ok
    const month = Finance.monthTotals(Utils.currentMonthKey());
    const status = Object.fromEntries(Finance.budgetStatus(Utils.currentMonthKey()).map((b) => [b.category.name, b.status]));
    return {
      month, status,
      cash: Finance.accountBalance(cash), bank: Finance.accountBalance(bank), total: Finance.totalBalance(),
      prev: Finance.monthTotals(Utils.addMonthsToKey(Utils.currentMonthKey(), -1)),
    };
  });
  check(near(calc.month.income, 2500), "this month's income = 2,500", calc.month.income);
  check(near(calc.month.expense, 800), "this month's spending = 0.10 + 0.20 + 799.70 = 800 (transfers excluded)", calc.month.expense);
  check(near(calc.month.net, 1700), "left over = income − spending = 1,700", calc.month.net);
  check(near(calc.month.savingsRate, 0.68), "savings rate = 1,700 ÷ 2,500 = 68%", calc.month.savingsRate);
  check(near(calc.prev.expense, 999), "last month's expense stays in last month", calc.prev.expense);
  check(near(calc.cash, 299.7), "cash balance = 0 − 0.30 + 300 transfer = 299.70", calc.cash);
  check(near(calc.bank, 1401.3), "bank balance = 1,000 + 2,500 − 799.70 − 999 − 300 = 1,401.30", calc.bank);
  check(near(calc.total, calc.cash + calc.bank), "total balance = sum of accounts", calc.total);
  check(calc.status["Food & Dining"] === "warning", "budget at 86% shows 'Close to limit'", calc.status["Food & Dining"]);
  check(calc.status.Housing === "over", "budget over 100% shows 'Over budget'", calc.status.Housing);
  check(calc.status.Groceries === "ok", "unused budget shows 'On track'", calc.status.Groceries);

  // On-screen numbers match the data
  await page.evaluate(() => { location.hash = "#/dashboard"; });
  await wait(300);
  const tiles = await page.$$eval(".tile", (ts) => Object.fromEntries(ts.map((t) => [t.querySelector(".tile-label").textContent.trim(), t.querySelector(".tile-value").textContent.trim()])));
  const money = (n) => app((v) => Utils.formatMoney(v), n);
  check(tiles["Income this month"] === (await money(2500)), "Home shows this month's income correctly", tiles["Income this month"]);
  check(tiles["Spent this month"] === (await money(800)), "Home shows this month's spending correctly", tiles["Spent this month"]);
  check(tiles["Left over"] === (await money(1700)), "Home shows 'Left over' correctly", tiles["Left over"]);
  check(tiles["Savings rate"] === "68%", "Home shows the savings rate correctly", tiles["Savings rate"]);

  // ---------------- Monthly summaries ----------------
  console.log("\n== Monthly summaries ==");
  await page.evaluate(() => { location.hash = "#/budgets"; });
  await wait(250);
  check(await page.$eval(".month-label", (e, label) => e.textContent === label, await app(() => Utils.monthLabel(Utils.currentMonthKey()))), "Budgets opens on the current month");
  check(await page.$eval('[aria-label="Next month"]', (b) => b.disabled), "can't move Budgets into future months");
  await page.click('[aria-label="Previous month"]');
  await wait(250);
  const lastMonthSpent = await page.$$eval(".budget-card .budget-spent", (els) => els.map((e) => e.textContent));
  check(lastMonthSpent.every((t) => /[^\d]0[.,]00/.test(t) || t.endsWith("0.00")), "budgets for last month don't include this month's spending", lastMonthSpent.join(" | "));

  await page.evaluate(() => { location.hash = "#/reports"; });
  await wait(300);
  const tableRows = async () => {
    await page.evaluate(() => [...document.querySelectorAll(".card-actions button")].find((b) => b.textContent.includes("Table"))?.click());
    await wait(150);
    return page.$$eval(".data-table tbody tr", (trs) => trs.map((tr) => [...tr.children].map((c) => c.textContent)));
  };
  const six = await tableRows();
  check(six.length === 6, "Reports '6 months' shows 6 months", `${six.length} rows`);
  const current = six[six.length - 1];
  check(current && current[1] === (await money(2500)) && current[2] === (await money(800)), "Reports' current month matches the dashboard", current?.join(" | "));
  await page.evaluate(() => [...document.querySelectorAll(".segment span")].find((s) => s.textContent === "12 months").click());
  await wait(300);
  check((await tableRows()).length === 12, "Reports '12 months' shows 12 months");

  // ---------------- Monthly analysis (top card on Reports) ----------------
  // Same test data: this month 0.10 + 0.20 + 799.70 = 800 spent; last month 999 (Shopping).
  console.log("\n== Monthly analysis ==");
  const analysis = () => page.$eval(".analysis-card", (c) => ({
    first: c.compareDocumentPosition(document.querySelector(".page-actions")) === Node.DOCUMENT_POSITION_FOLLOWING,
    month: c.querySelector(".month-label").textContent,
    tiles: [...c.querySelectorAll(".tile")].map((t) => ({
      label: t.querySelector(".tile-label").textContent.trim(),
      value: t.querySelector(".tile-value").textContent.trim(),
      delta: t.querySelector(".tile-delta")?.textContent.trim() || "",
    })),
    summary: [...c.querySelectorAll(".analysis-summary li")].map((l) => l.textContent),
    empty: c.querySelector(".empty-state h3")?.textContent || "",
    prevDisabled: c.querySelector('[aria-label="Previous month"]').disabled,
    nextDisabled: c.querySelector('[aria-label="Next month"]').disabled,
  })).catch(() => null);
  const tile = (a, start) => a?.tiles.find((t) => t.label.startsWith(start)) || {};
  const thisLabel = await app(() => Utils.monthLabel(Utils.currentMonthKey()));
  const lastLabel = await app(() => Utils.monthLabel(Utils.addMonthsToKey(Utils.currentMonthKey(), -1)));
  const savedBefore = await app(() => localStorage.getItem("finance-tracker-v2"));

  let a = await analysis();
  check(a && a.first, "Monthly analysis card is shown above the Reports range picker");
  check(a?.month === thisLabel, "Monthly analysis opens on the current month", a?.month);
  check(a?.nextDisabled, "can't move Monthly analysis into future months");
  check(tile(a, "Spent in").value === (await money(800)), "analysis total = this month's expenses only (800; income and transfers excluded)", tile(a, "Spent in").value);
  check(/20% less/.test(tile(a, "Spent in").delta), "analysis shows 20% less than last month (800 vs 999)", tile(a, "Spent in").delta);
  check(tile(a, "Compared with").value === (await app(() => Utils.formatMoney(-199, { sign: true }))), "analysis shows the change in money (−199)", tile(a, "Compared with").value);
  check(/Housing/.test(tile(a, "Top category").value), "analysis names the top category (Housing)", tile(a, "Top category").value);
  check(a && a.summary.length >= 3 && a.summary.length <= 5, "analysis summary has 3 to 5 sentences", String(a?.summary.length));
  check(a?.summary.some((s) => s.includes("isn't over yet")), "summary notes that the current month isn't over yet");

  await app(() => App.setPrivacy(true));
  await wait(250);
  const privacy = await page.$eval(".analysis-card", (c) => {
    const amounts = [...c.querySelectorAll(".money")];
    const walker = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    let leaks = 0;
    while (walker.nextNode()) if (/\d[.,]\d\d/.test(walker.currentNode.textContent) && !walker.currentNode.parentElement.closest(".money")) leaks++;
    return { amounts: amounts.length, blurred: amounts.every((e) => getComputedStyle(e).filter.includes("blur")), leaks };
  });
  check(privacy.amounts > 0 && privacy.blurred && privacy.leaks === 0, "'Hide amounts' blurs every amount in the analysis, including the summary", JSON.stringify(privacy));
  await app(() => App.setPrivacy(false));
  await wait(250);

  await page.click('.analysis-card [aria-label="Previous month"]');
  await wait(250);
  a = await analysis();
  check(a?.month === lastLabel, "'Previous month' moves the analysis back one month", a?.month);
  check(tile(a, "Spent in").value === (await money(999)), "analysis recalculates for last month (999)", tile(a, "Spent in").value);
  check(tile(a, "Compared with").value === "Nothing to compare", "analysis says 'Nothing to compare' when the month before has no spending", tile(a, "Compared with").value);
  check(a?.prevDisabled, "can't move the analysis before the first month with transactions");
  // Settings → privacy writes to storage, so compare only the transactions
  const sameTransactions = await app((before) => JSON.stringify(JSON.parse(before).transactions) === JSON.stringify(JSON.parse(localStorage.getItem("finance-tracker-v2")).transactions), savedBefore);
  check(sameTransactions, "looking at the analysis doesn't change saved transactions");

  // A month with only income shows the friendly empty message
  const twoAgo = await app(() => {
    const date = Utils.monthRange(Utils.addMonthsToKey(Utils.currentMonthKey(), -2)).from;
    const [, bank] = Store.state.accounts;
    return Store.addTransaction({ type: "income", amount: 10, categoryId: Store.categoriesOf("income")[0].id, accountId: bank.id, date, description: "analysis empty-month test", tags: [] }).id;
  });
  await wait(250);
  await page.click('.analysis-card [aria-label="Previous month"]');
  await wait(250);
  a = await analysis();
  const twoAgoLabel = await app(() => Utils.monthLabel(Utils.addMonthsToKey(Utils.currentMonthKey(), -2)));
  check(a?.empty === `No spending recorded in ${twoAgoLabel}`, "a month with no expenses shows 'No spending recorded in …'", a?.empty);
  await page.click('.analysis-card [aria-label="Next month"]');
  await wait(250);
  check((await analysis())?.month === lastLabel, "month arrows still work from an empty month");
  await app((id) => Store.deleteTransaction(id), twoAgo);
  await wait(250);

  // ---------------- UI problems ----------------
  console.log("\n== UI ==");
  await app(() => Store.loadDemoData());
  const routes = ["dashboard", "transactions", "budgets", "goals", "reports", "settings"];
  for (const [w, h, size] of [[1366, 900, "desktop"], [390, 844, "phone"]]) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: size === "phone" ? 2 : 1 });
    for (const theme of ["light", "dark"]) {
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: theme }]);
      for (const r of routes) {
        await page.evaluate((x) => { location.hash = "#/" + x; }, r);
        await wait(250);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        if (overflow > 1) fail(`${r} scrolls sideways by ${overflow}px on ${size} (${theme})`);
        const clipped = await page.evaluate(() => [...document.querySelectorAll("#view *")].filter((el) => {
          const s = getComputedStyle(el);
          return el.children.length === 0 && el.textContent.trim() && s.overflow === "visible" && el.scrollWidth > el.clientWidth + 2 && s.display !== "inline";
        }).length);
        if (clipped) note(`${r} has ${clipped} element(s) whose text is wider than their box on ${size} (${theme}); check the screenshot`);
        await page.screenshot({ path: path.join(SHOTS, `${size}-${theme}-${r}.png`), fullPage: true });
      }
    }
  }
  pass(`screenshots saved to ${SHOTS}`);

  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  try { await openForm("button"); pass("the phone '+' button opens the form"); } catch { fail("the phone '+' button opens the form"); }
  const fits = await page.$eval("dialog[open]", (d) => d.getBoundingClientRect().width <= window.innerWidth);
  check(fits, "the transaction form fits on a phone screen");
  await page.screenshot({ path: path.join(SHOTS, "phone-form.png") });
  await page.keyboard.press("Escape");
  await wait(200);
  check(!(await page.$("dialog[open]")), "pop-ups close with Esc");

  const unlabeled = await page.evaluate(() => [...document.querySelectorAll("button, input, select, textarea")]
    .filter((el) => el.offsetParent !== null && !el.classList.contains("visually-hidden"))
    .filter((el) => !(el.getAttribute("aria-label") || el.textContent.trim() || el.labels?.length || el.title || el.placeholder)).length);
  check(unlabeled === 0, "every visible button and input has a label", `${unlabeled} unlabeled`);

  check(errors.length === 0, "no JavaScript errors in the console", errors.slice(0, 3).join(" | "));

  await browser.close();
  console.log(`\nSUMMARY: ${results.pass} passed, ${results.fail} failed, ${results.note} notes`);
  process.exit(results.fail ? 1 : 0);
})().catch((e) => { console.error("Checker crashed:", e); process.exit(2); });
