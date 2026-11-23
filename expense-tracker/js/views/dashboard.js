// ============================================================
// Dashboard — a quick overview of this month
// ============================================================
"use strict";

Views.dashboard = {
  title: "Dashboard",
  render(root) {
    const { h, money, formatMoney, icon } = Utils;
    const { state } = Store;
    const month = Utils.currentMonthKey();
    const lastMonth = Utils.addMonthsToKey(month, -1);
    const now = Finance.monthTotals(month);
    const before = Finance.monthTotals(lastMonth);

    // ----- First visit: friendly welcome -----
    if (state.transactions.length === 0) {
      root.append(UI.card(null, { className: "welcome" },
        UI.emptyState({
          emoji: "👋",
          title: "Welcome to your Finance Tracker",
          text: "Record what you earn and spend, set budgets, and save toward goals. Everything stays private on this device.",
          actions: [
            h("button", { class: "btn btn-primary", type: "button", onClick: () => UI.openTransactionForm() }, icon("plus", 18), "Add your first transaction"),
            h("button", { class: "btn btn-ghost", type: "button", text: "Explore with demo data", onClick: async () => {
              if (await UI.confirm({ title: "Load demo data?", message: "This fills the app with three months of example transactions, budgets and goals. You can erase it later in Settings.", confirmLabel: "Load demo data" })) {
                await App.safely("Load demo data", () => Store.loadDemoData(), "Demo data loaded — have a look around!");
              }
            } }),
          ],
        })));
    }

    // ----- Backup reminder: the data lives only in this browser -----
    const today = Utils.todayStr();
    const { lastBackupAt, backupReminderSnoozedUntil } = state.settings;
    const daysSinceBackup = lastBackupAt ? Utils.daysBetween(lastBackupAt, today) : null;
    const backupDue = state.transactions.length > 0
      && (daysSinceBackup === null || daysSinceBackup >= 30)
      && !(backupReminderSnoozedUntil && backupReminderSnoozedUntil > today);
    if (backupDue) {
      root.append(h("section", { class: "card backup-reminder", "aria-label": "Backup reminder" },
        h("span", { class: "backup-reminder-icon", "aria-hidden": "true" }, icon("download", 22)),
        h("div", { class: "backup-reminder-text" },
          h("p", { class: "backup-reminder-title", text: daysSinceBackup === null ? "You haven't backed up your data yet" : `Last backup: ${daysSinceBackup} days ago` }),
          h("p", { class: "muted small", text: "Your data is only stored in this browser. A backup file keeps it safe if the browser is cleared or you change device." })),
        h("div", { class: "button-row backup-reminder-actions" },
          h("button", { class: "btn btn-primary btn-small", type: "button", onClick: App.downloadBackup }, icon("download", 16), "Download backup"),
          h("button", { class: "btn btn-ghost btn-small", type: "button", text: "Remind me later", onClick: () => {
            Store.updateSettings({ backupReminderSnoozedUntil: Utils.addDays(today, 7) });
            UI.toast("OK, I'll remind you again in a week.");
          } }))));
    }

    // ----- Headline: total balance -----
    const balance = Finance.totalBalance();
    const hero = h("section", { class: "hero" },
      h("div", null,
        h("p", { class: "hero-label", text: "Total balance" }),
        h("p", { class: "hero-value" }, money(balance)),
        h("p", { class: "hero-sub", text: `Across ${state.accounts.length} account${state.accounts.length === 1 ? "" : "s"} · ${Utils.monthLabel(month)}` })),
      h("div", { class: "hero-actions" },
        h("button", { class: "btn btn-primary", type: "button", onClick: () => UI.openTransactionForm(null, { type: "expense" }) }, icon("down", 18), "Expense"),
        h("button", { class: "btn btn-secondary", type: "button", onClick: () => UI.openTransactionForm(null, { type: "income" }) }, icon("up", 18), "Income")));
    root.append(hero);

    // ----- This month at a glance -----
    // No arrow when there is nothing to compare, or nothing changed
    const change = (a, b) => (b && Math.abs(a - b) / b >= 0.005 ? (a - b) / b : null);
    const pct = (r) => `${Math.abs(Math.round(r * 100))}% vs last month`;
    const incomeChange = change(now.income, before.income);
    const expenseChange = change(now.expense, before.expense);
    const rate = now.savingsRate;

    root.append(h("div", { class: "tiles" },
      UI.statTile({ label: "Income this month", value: money(now.income), swatch: "var(--series-1)",
        delta: incomeChange, deltaGood: incomeChange >= 0, deltaText: incomeChange === null ? "" : pct(incomeChange) }),
      UI.statTile({ label: "Spent this month", value: money(now.expense), swatch: "var(--series-2)",
        delta: expenseChange, deltaGood: expenseChange <= 0, deltaText: expenseChange === null ? "" : pct(expenseChange) }),
      UI.statTile({ label: "Left over", value: money(now.net) }),
      UI.statTile({ label: "Savings rate", value: rate === null ? "—" : Math.round(rate * 100) + "%" }),
    ));

    const grid = h("div", { class: "dash-grid" });
    root.append(grid);

    // ----- Budget alerts -----
    const budgets = Finance.budgetStatus(month);
    grid.append(UI.card("Budgets", {
      subtitle: budgets.length ? `${budgets.filter((b) => b.status !== "ok").length} need attention` : null,
      actions: h("a", { class: "btn btn-ghost btn-small", href: "#/budgets", text: "See all" }),
    }, budgets.length
      ? h("ul", { class: "mini-list" }, budgets.slice(0, 4).map((b) => h("li", { class: "budget-mini" },
          h("div", { class: "row-between" },
            h("span", null, h("span", { "aria-hidden": "true", text: b.category.icon + " " }), b.category.name),
            h("span", { class: "muted" }, money(b.spent), " of ", money(b.budget.amount))),
          UI.meter(b.ratio, b.status, b.category.name),
          b.status !== "ok" ? UI.statusBadge(b.status) : null)))
      : UI.emptyState({ emoji: "🎯", title: "No budgets yet", text: "Set monthly limits for categories to keep spending in check.",
          actions: h("a", { class: "btn btn-ghost", href: "#/budgets", text: "Create a budget" }) })));

    // ----- Where the money went -----
    const { from, to } = Utils.monthRange(month);
    const spending = Finance.byCategory(Finance.inRange(from, to)).slice(0, 5);
    grid.append(UI.card("Spending by category", {
      subtitle: Utils.monthLabel(month),
      actions: h("a", { class: "btn btn-ghost btn-small", href: "#/reports", text: "Reports" }),
    }, spending.length
      ? Charts.barList(spending.map((g) => ({ icon: g.category.icon, name: g.category.name, value: g.total })), { total: now.expense, color: "var(--series-2)" })
      : h("p", { class: "muted", text: "No spending recorded this month yet." })));

    // ----- Recent transactions -----
    const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date) || 0).slice(0, 6);
    grid.append(UI.card("Recent transactions", {
      actions: h("a", { class: "btn btn-ghost btn-small", href: "#/transactions", text: "See all" }),
    }, recent.length
      ? h("ul", { class: "tx-list" }, recent.map(UI.transactionRow))
      : h("p", { class: "muted", text: "Nothing here yet." })));

    // ----- Accounts -----
    grid.append(UI.card("Accounts", {
      actions: h("a", { class: "btn btn-ghost btn-small", href: "#/settings", text: "Manage" }),
    }, h("ul", { class: "mini-list" }, state.accounts.map((a) => h("li", { class: "row-between account-row" },
      h("span", null, h("span", { "aria-hidden": "true", text: Store.ACCOUNT_TYPES[a.type].icon + " " }), a.name),
      h("strong", null, money(Finance.accountBalance(a))))))));

    // ----- Savings goals -----
    if (state.goals.length) {
      grid.append(UI.card("Savings goals", {
        actions: h("a", { class: "btn btn-ghost btn-small", href: "#/goals", text: "See all" }),
      }, h("ul", { class: "mini-list" }, state.goals.slice(0, 3).map((g) => {
        const saved = Finance.goalSaved(g);
        return h("li", { class: "budget-mini" },
          h("div", { class: "row-between" },
            h("span", null, h("span", { "aria-hidden": "true", text: g.icon + " " }), g.name),
            h("span", { class: "muted" }, money(saved), " of ", money(g.target))),
          UI.meter(saved / g.target, saved >= g.target ? "done" : "ok", g.name));
      }))));
    }

    // ----- Coming up (repeating transactions) -----
    const soon = Utils.addDays(Utils.todayStr(), 30);
    const upcoming = state.recurring.filter((r) => r.nextDate <= soon).sort((a, b) => a.nextDate.localeCompare(b.nextDate)).slice(0, 5);
    if (upcoming.length) {
      grid.append(UI.card("Coming up", { subtitle: "Repeating transactions in the next 30 days" },
        h("ul", { class: "mini-list" }, upcoming.map((r) => {
          const t = r.template;
          const name = t.description || Store.getCategory(t.categoryId)?.name || "Transfer";
          const sign = t.type === "income" ? 1 : t.type === "expense" ? -1 : 0;
          return h("li", { class: "row-between" },
            h("span", null, h("span", { class: "muted", text: Utils.formatDate(r.nextDate, "relative") + " · " }), name),
            h("span", { class: `tx-amount ${t.type}` }, money(sign * t.amount, { sign: sign > 0 })));
        }))));
    }

    // ----- Last 6 months -----
    const keys = Utils.monthKeysBetween(Utils.addMonthsToKey(month, -5), month);
    const months = Finance.monthly(keys);
    grid.append(Charts.card({
      title: "Income vs. spending",
      subtitle: "Last 6 months",
      className: "span-2",
      draw: (el) => Charts.columns(el, {
        labels: keys.map((k) => ({ short: Utils.monthLabel(k, "short"), long: Utils.monthLabel(k) })),
        series: [
          { name: "Income", color: "var(--series-1)", values: months.map((m) => m.income) },
          { name: "Spending", color: "var(--series-2)", values: months.map((m) => m.expense) },
        ],
        ariaLabel: `Income and spending for the last 6 months. This month: income ${formatMoney(now.income)}, spending ${formatMoney(now.expense)}.`,
      }),
      table: { columns: ["Month", "Income", "Spending", "Left over"], rows: months.map((m) => [Utils.monthLabel(m.key), m.income, m.expense, m.net]) },
    }));
  },
};
