// ============================================================
// Reports — charts and numbers to understand your money
// ============================================================
"use strict";

Views.reports = (() => {
  const { h, money, formatMoney, icon } = Utils;
  let range = "6m";

  function monthKeys() {
    const current = Utils.currentMonthKey();
    if (range === "6m") return Utils.monthKeysBetween(Utils.addMonthsToKey(current, -5), current);
    if (range === "12m") return Utils.monthKeysBetween(Utils.addMonthsToKey(current, -11), current);
    if (range === "year") return Utils.monthKeysBetween(`${current.slice(0, 4)}-01`, current);
    const first = Finance.firstMonthKey();
    return Utils.monthKeysBetween(first < current ? first : current, current);
  }

  function render(root) {
    const keys = monthKeys();
    const from = Utils.monthRange(keys[0]).from;
    const to = Utils.monthRange(keys[keys.length - 1]).to;
    const list = Finance.inRange(from, to);
    const totals = Finance.totals(list);
    const months = Finance.monthly(keys);
    const labels = keys.map((k) => ({ short: Utils.monthLabel(k, "short") + (keys.length > 12 ? " " + k.slice(2, 4) : ""), long: Utils.monthLabel(k) }));

    // Range picker
    root.append(h("div", { class: "page-actions" },
      UI.segmented("report-range", [["6m", "6 months"], ["12m", "12 months"], ["year", "This year"], ["all", "All time"]], range,
        (value) => { range = value; App.render(); })));

    if (!Store.state.transactions.length) {
      root.append(UI.card(null, {}, UI.emptyState({ emoji: "📊", title: "Nothing to report yet", text: "Once you've added some transactions, charts and insights will appear here." })));
      return;
    }

    // Key numbers
    const avgSpend = totals.expense / keys.length;
    const avgIncome = totals.income / keys.length;
    root.append(h("div", { class: "tiles tiles-3" },
      UI.statTile({ label: "Total income", value: money(totals.income), swatch: "var(--series-1)" }),
      UI.statTile({ label: "Total spending", value: money(totals.expense), swatch: "var(--series-2)" }),
      UI.statTile({ label: "Net saved", value: money(totals.net, { sign: true }) }),
      UI.statTile({ label: "Savings rate", value: totals.savingsRate === null ? "—" : Math.round(totals.savingsRate * 100) + "%" }),
      UI.statTile({ label: "Average spending / month", value: money(avgSpend) }),
      UI.statTile({ label: "Average income / month", value: money(avgIncome) })));

    const grid = h("div", { class: "report-grid" });
    root.append(grid);

    // 1. Income vs spending by month
    grid.append(Charts.card({
      title: "Income vs. spending", subtitle: "Per month", className: "span-2",
      draw: (el) => Charts.columns(el, {
        labels,
        series: [
          { name: "Income", color: "var(--series-1)", values: months.map((m) => m.income) },
          { name: "Spending", color: "var(--series-2)", values: months.map((m) => m.expense) },
        ],
        height: 260,
        ariaLabel: `Monthly income and spending, ${labels[0].long} to ${labels[labels.length - 1].long}`,
      }),
      table: { columns: ["Month", "Income", "Spending", "Left over"], rows: months.map((m) => [Utils.monthLabel(m.key), m.income, m.expense, m.net]) },
    }));

    // 2. Total balance over time
    const balances = keys.map((k) => Finance.totalBalance(Utils.monthRange(k).to));
    grid.append(Charts.card({
      title: "Total balance", subtitle: "At the end of each month", className: "span-2",
      draw: (el) => Charts.line(el, {
        labels, values: balances, color: "var(--series-1)", name: "Balance",
        ariaLabel: `Total balance over time, now ${formatMoney(balances[balances.length - 1])}`,
      }),
      table: { columns: ["Month", "Balance"], rows: keys.map((k, i) => [Utils.monthLabel(k), balances[i]]) },
    }));

    // 3. Spending by category
    const spending = Finance.byCategory(list, "expense");
    grid.append(Charts.card({
      title: "Spending by category",
      subtitle: `${labels[0].long} – ${labels[labels.length - 1].long}`,
      draw: (el) => el.append(spending.length
        ? Charts.barList(spending.map((g) => ({ icon: g.category.icon, name: g.category.name, value: g.total })), { total: totals.expense, color: "var(--series-2)" })
        : h("p", { class: "muted", text: "No spending in this period." })),
      table: { columns: ["Category", "Spent", "Share", "Avg / month"], rows: spending.map((g) => [g.category.name, g.total, Utils.percent(g.total, totals.expense), g.total / keys.length]) },
    }));

    // 4. Income by source
    const income = Finance.byCategory(list, "income");
    grid.append(Charts.card({
      title: "Income by source",
      subtitle: `${labels[0].long} – ${labels[labels.length - 1].long}`,
      draw: (el) => el.append(income.length
        ? Charts.barList(income.map((g) => ({ icon: g.category.icon, name: g.category.name, value: g.total })), { total: totals.income, color: "var(--series-1)" })
        : h("p", { class: "muted", text: "No income in this period." })),
      table: { columns: ["Source", "Received", "Share"], rows: income.map((g) => [g.category.name, g.total, Utils.percent(g.total, totals.income)]) },
    }));

    // 5. Biggest expenses
    const biggest = list.filter((t) => t.type === "expense").sort((a, b) => b.amount - a.amount).slice(0, 6);
    grid.append(UI.card("Largest expenses", { subtitle: "In this period" },
      biggest.length ? h("ul", { class: "tx-list show-dates" }, biggest.map((t) => {
        const row = UI.transactionRow(t);
        row.querySelector(".tx-meta").prepend(Utils.formatDate(t.date) + " · ");
        return row;
      })) : h("p", { class: "muted", text: "No expenses in this period." })));

    // 6. Insights in plain words
    grid.append(UI.card("Insights", {}, h("ul", { class: "insights" }, insights(months, spending, totals).map((text) =>
      h("li", null, h("span", { class: "insight-icon", "aria-hidden": "true" }, icon("check", 16)), text)))));
  }

  // A few plain-language observations about the period
  function insights(months, spending, totals) {
    const notes = [];
    const withData = months.filter((m) => m.income || m.expense);
    if (spending[0]) {
      notes.push(`Your biggest spending category is ${spending[0].category.name} (${Utils.percent(spending[0].total, totals.expense)} of all spending).`);
    }
    if (withData.length >= 2) {
      const best = [...withData].sort((a, b) => b.net - a.net)[0];
      const priciest = [...withData].sort((a, b) => b.expense - a.expense)[0];
      notes.push(`You saved the most in ${Utils.monthLabel(best.key)} (${formatMoney(best.net, { sign: true })}).`);
      notes.push(`Spending was highest in ${Utils.monthLabel(priciest.key)} at ${formatMoney(priciest.expense)}.`);
    }
    const positive = withData.filter((m) => m.net > 0).length;
    if (withData.length) notes.push(`You spent less than you earned in ${positive} of ${withData.length} month${withData.length === 1 ? "" : "s"}.`);
    const subs = Store.state.transactions.filter((t) => t.type === "expense" && t.tags.includes("subscription") && t.date >= Utils.addDays(Utils.todayStr(), -31));
    if (subs.length) notes.push(`Subscriptions tagged #subscription cost you ${formatMoney(Utils.sum(subs, (t) => t.amount))} in the last month.`);
    if (!notes.length) notes.push("Add more transactions to see insights here.");
    return notes;
  }

  return { title: "Reports", render };
})();
