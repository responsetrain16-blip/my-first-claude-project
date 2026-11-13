// ============================================================
// Transactions — search, filter and browse everything
// ============================================================
"use strict";

Views.transactions = (() => {
  const { h, money, icon } = Utils;

  // Filters are remembered while you move between pages
  const filters = { search: "", type: "all", categoryId: "all", accountId: "all", period: "this-month", from: "", to: "", sort: "date-desc" };
  const PAGE_SIZE = 150;
  let shown = PAGE_SIZE;

  function periodRange() {
    const today = Utils.todayStr();
    const month = Utils.currentMonthKey();
    switch (filters.period) {
      case "this-month": return Utils.monthRange(month);
      case "last-month": return Utils.monthRange(Utils.addMonthsToKey(month, -1));
      case "last-90": return { from: Utils.addDays(today, -89), to: today };
      case "this-year": return { from: `${today.slice(0, 4)}-01-01`, to: `${today.slice(0, 4)}-12-31` };
      case "custom": return { from: filters.from || null, to: filters.to || null };
      default: return { from: null, to: null };
    }
  }

  function matching() {
    const { from, to } = periodRange();
    const q = filters.search.trim().toLowerCase();
    const list = Finance.inRange(from, to).filter((t) => {
      if (filters.type !== "all" && t.type !== filters.type) return false;
      if (filters.categoryId !== "all" && t.categoryId !== filters.categoryId) return false;
      if (filters.accountId !== "all" && t.accountId !== filters.accountId && t.toAccountId !== filters.accountId) return false;
      if (q) {
        const category = Store.getCategory(t.categoryId)?.name || "";
        const haystack = [t.description, t.notes, category, ...t.tags, String(t.amount)].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    const sorters = {
      "date-desc": (a, b) => b.date.localeCompare(a.date),
      "date-asc": (a, b) => a.date.localeCompare(b.date),
      "amount-desc": (a, b) => b.amount - a.amount,
      "amount-asc": (a, b) => a.amount - b.amount,
    };
    return list.sort(sorters[filters.sort]);
  }

  function exportCsv(list) {
    const header = ["Date", "Type", "Description", "Category", "Account", "To account", "Amount", "Notes", "Tags"];
    const rows = list.map((t) => [
      t.date, t.type, t.description, Store.getCategory(t.categoryId)?.name || "",
      Store.getAccount(t.accountId)?.name || "", Store.getAccount(t.toAccountId)?.name || "",
      (t.type === "expense" ? -t.amount : t.amount).toFixed(2), t.notes, t.tags.join(" "),
    ]);
    const csv = [header, ...rows].map((r) => r.map(Utils.csvCell).join(",")).join("\r\n");
    Utils.download(`transactions-${Utils.todayStr()}.csv`, "﻿" + csv, "text/csv;charset=utf-8");
    UI.toast(`Exported ${list.length} transaction${list.length === 1 ? "" : "s"}`);
  }

  function render(root) {
    const { state } = Store;
    shown = PAGE_SIZE;

    const listArea = h("div", { class: "tx-results" });
    const summary = h("div", { class: "results-summary", role: "status" });

    const refresh = () => renderList(listArea, summary);

    const search = h("input", {
      type: "search", id: "tx-search", placeholder: "Search descriptions, notes, tags…", value: filters.search,
      "aria-label": "Search transactions", autocomplete: "off",
      onInput: Utils.debounce((e) => { filters.search = e.target.value; shown = PAGE_SIZE; refresh(); }, 150),
    });

    const onFilter = (key) => (e) => { filters[key] = e.target.value; shown = PAGE_SIZE; refresh(); };

    const categoryOptions = [["all", "All categories"],
      ...Store.categoriesOf("expense").map((c) => [c.id, `${c.icon} ${c.name}`]),
      ...Store.categoriesOf("income").map((c) => [c.id, `${c.icon} ${c.name} (income)`])];

    const customDates = h("div", { class: "custom-dates", hidden: filters.period !== "custom" },
      h("input", { type: "date", value: filters.from, "aria-label": "From date", onChange: onFilter("from") }),
      h("span", { text: "to" }),
      h("input", { type: "date", value: filters.to, "aria-label": "To date", onChange: onFilter("to") }));

    const periodSelect = UI.select([
      ["this-month", "This month"], ["last-month", "Last month"], ["last-90", "Last 90 days"],
      ["this-year", "This year"], ["all", "All time"], ["custom", "Custom dates…"],
    ], filters.period, { "aria-label": "Time period" });
    periodSelect.addEventListener("change", (e) => {
      filters.period = e.target.value;
      customDates.hidden = filters.period !== "custom";
      shown = PAGE_SIZE;
      refresh();
    });

    const typeSelect = UI.select([["all", "All types"], ["expense", "Expenses"], ["income", "Income"], ["transfer", "Transfers"]], filters.type, { "aria-label": "Type" });
    typeSelect.addEventListener("change", onFilter("type"));
    const catSelect = UI.select(categoryOptions, filters.categoryId, { "aria-label": "Category" });
    catSelect.addEventListener("change", onFilter("categoryId"));
    const accSelect = UI.select([["all", "All accounts"], ...state.accounts.map((a) => [a.id, a.name])], filters.accountId, { "aria-label": "Account" });
    accSelect.addEventListener("change", onFilter("accountId"));
    const sortSelect = UI.select([["date-desc", "Newest first"], ["date-asc", "Oldest first"], ["amount-desc", "Largest amount"], ["amount-asc", "Smallest amount"]], filters.sort, { "aria-label": "Sort" });
    sortSelect.addEventListener("change", onFilter("sort"));

    const clear = h("button", { class: "btn btn-ghost btn-small", type: "button", text: "Reset filters", onClick: () => {
      Object.assign(filters, { search: "", type: "all", categoryId: "all", accountId: "all", period: "this-month", from: "", to: "", sort: "date-desc" });
      root.replaceChildren();
      render(root);
    } });

    root.append(
      h("div", { class: "page-actions" },
        h("button", { class: "btn btn-primary", type: "button", onClick: () => UI.openTransactionForm() }, icon("plus", 18), "Add transaction"),
        h("button", { class: "btn btn-ghost", type: "button", onClick: () => exportCsv(matching()) }, icon("download", 18), "Export CSV")),
      h("section", { class: "card filters-card" },
        h("div", { class: "search-box" }, icon("search", 18), search),
        h("div", { class: "filter-row" }, periodSelect, typeSelect, catSelect, accSelect, sortSelect, clear),
        customDates),
      summary,
      listArea,
    );
    refresh();
  }

  function renderList(listArea, summary) {
    const list = matching();
    const t = Finance.totals(list);
    summary.replaceChildren(
      h("span", { text: `${list.length} transaction${list.length === 1 ? "" : "s"}` }),
      h("span", null, "In ", money(t.income)),
      h("span", null, "Out ", money(t.expense)),
      h("span", null, "Net ", money(t.net, { sign: true })));

    if (!list.length) {
      listArea.replaceChildren(UI.card(null, {}, UI.emptyState({
        emoji: Store.state.transactions.length ? "🔍" : "🧾",
        title: Store.state.transactions.length ? "No matches" : "No transactions yet",
        text: Store.state.transactions.length ? "Try a different search or time period." : "Add your first income or expense to get started.",
      })));
      return;
    }

    const visible = list.slice(0, shown);
    const byDate = filters.sort.startsWith("date");
    const content = [];

    if (byDate) {
      // Group by day, with each day's total
      const groups = new Map();
      for (const tx of visible) {
        if (!groups.has(tx.date)) groups.set(tx.date, []);
        groups.get(tx.date).push(tx);
      }
      for (const [date, items] of groups) {
        const net = Finance.totals(items).net;
        content.push(h("section", { class: "card day-group" },
          h("header", { class: "day-header" },
            h("h3", { text: Utils.formatDate(date, "relative") === Utils.formatDate(date) ? Utils.formatDate(date, "long") : `${Utils.formatDate(date, "relative")} · ${Utils.formatDate(date)}` }),
            h("span", { class: "muted" }, money(net, { sign: true }))),
          h("ul", { class: "tx-list" }, items.map(UI.transactionRow))));
      }
    } else {
      content.push(h("section", { class: "card" }, h("ul", { class: "tx-list show-dates" }, visible.map((tx) => {
        const row = UI.transactionRow(tx);
        row.querySelector(".tx-meta").prepend(Utils.formatDate(tx.date) + " · ");
        return row;
      }))));
    }

    if (list.length > shown) {
      content.push(h("button", { class: "btn btn-ghost show-more", type: "button", text: `Show more (${list.length - shown} left)`,
        onClick: () => { shown += PAGE_SIZE; renderList(listArea, summary); } }));
    }
    listArea.replaceChildren(...content);
  }

  return {
    title: "Transactions",
    render,
    focusSearch() { document.getElementById("tx-search")?.focus(); },
  };
})();
