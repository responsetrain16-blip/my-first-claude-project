// ============================================================
// store.js — where all your data lives
//
// Everything is saved in this browser's localStorage. Nothing is
// ever sent to a server. "Store" saves and changes data;
// "Finance" does the math (totals, balances, budgets).
// ============================================================
"use strict";

const Store = (() => {
  const STORAGE_KEY = "finance-tracker-v2";
  const LEGACY_KEY = "expense-tracker-transactions"; // data from the first, simpler version
  const VERSION = 2;

  const DEFAULT_CATEGORIES = [
    ["expense", "Food & Dining", "🍔"], ["expense", "Groceries", "🛒"],
    ["expense", "Transport", "🚌"], ["expense", "Housing", "🏠"],
    ["expense", "Bills & Utilities", "💡"], ["expense", "Shopping", "🛍️"],
    ["expense", "Entertainment", "🎬"], ["expense", "Health", "💊"],
    ["expense", "Education", "📚"], ["expense", "Travel", "✈️"],
    ["expense", "Personal Care", "💇"], ["expense", "Gifts & Donations", "🎁"],
    ["expense", "Other", "📦", true],
    ["income", "Salary", "💼"], ["income", "Freelance", "💻"],
    ["income", "Business", "🏪"], ["income", "Investments", "📈"],
    ["income", "Gifts", "🎁"], ["income", "Refunds", "↩️"],
    ["income", "Other", "💰", true],
  ];

  const ACCOUNT_TYPES = {
    cash: { label: "Cash", icon: "💵" },
    bank: { label: "Bank account", icon: "🏦" },
    card: { label: "Credit card", icon: "💳" },
    savings: { label: "Savings", icon: "🐷" },
    other: { label: "Other", icon: "👛" },
  };

  let state = null;
  const listeners = new Set();

  function defaultState() {
    return {
      version: VERSION,
      settings: {
        currency: "USD",
        theme: "system",        // "system", "light" or "dark"
        privacy: false,         // blur amounts on screen
        pinHash: null,          // see security.js — the PIN itself is never stored
        pinSalt: null,
        autoLockMinutes: 5,
        lastAccountId: null,
      },
      accounts: [
        { id: Utils.uid(), name: "Cash", type: "cash", openingBalance: 0 },
        { id: Utils.uid(), name: "Bank account", type: "bank", openingBalance: 0 },
      ],
      categories: DEFAULT_CATEGORIES.map(([type, name, icon, system]) => ({
        id: Utils.uid(), type, name, icon, system: !!system,
      })),
      transactions: [],
      recurring: [],
      budgets: [],
      goals: [],
    };
  }

  // ---------- Loading & saving ----------

  function load() {
    let saved = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) saved = JSON.parse(raw);
    } catch {
      saved = null;
    }

    if (saved) {
      state = sanitize(saved);
    } else {
      state = defaultState();
      migrateLegacy();
      persist();
    }
    return state;
  }

  // Brings over transactions from the first version of the tracker.
  // The old data is left in place, untouched, just in case.
  function migrateLegacy() {
    let old;
    try {
      old = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
    } catch {
      return;
    }
    if (!Array.isArray(old) || old.length === 0) return;

    const renamed = { Food: "Food & Dining", Rent: "Housing", Bills: "Bills & Utilities", Gift: "Gifts" };
    const account = state.accounts[0];
    for (const t of old) {
      const amount = Number(t?.amount);
      if (!t || !["income", "expense"].includes(t.type) || !(amount > 0) || !Utils.isDateStr(t.date)) continue;
      const name = renamed[t.category] || t.category;
      const category = state.categories.find((c) => c.type === t.type && c.name === name) || otherCategory(t.type);
      state.transactions.push({
        id: Utils.uid(), type: t.type, amount: Math.round(amount * 100) / 100,
        categoryId: category.id, accountId: account.id, toAccountId: null,
        date: t.date, description: String(t.description || "").slice(0, 120),
        notes: "", tags: [], recurringId: null,
      });
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      UI.toast("Couldn't save — your browser storage may be full or blocked.", { tone: "error" });
      return false;
    }
  }

  // Call after every change: saves, then tells the screen to redraw.
  function commit() {
    persist();
    listeners.forEach((fn) => fn());
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  // ---------- Cleaning data from storage or a backup file ----------
  // Anything unexpected is dropped, so a damaged or tampered file can't break the app.

  const str = (v, max = 120) => (typeof v === "string" ? v.slice(0, max) : "");
  const num = (v) => (Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) / 100 : 0);
  const id = (v) => (typeof v === "string" && /^[\w-]{1,64}$/.test(v) ? v : Utils.uid());

  function sanitize(input) {
    const clean = defaultState();
    if (!input || typeof input !== "object") return clean;

    const s = input.settings || {};
    clean.settings = {
      currency: /^[A-Z]{3}$/.test(s.currency) ? s.currency : "USD",
      theme: ["system", "light", "dark"].includes(s.theme) ? s.theme : "system",
      privacy: !!s.privacy,
      pinHash: typeof s.pinHash === "string" ? s.pinHash : null,
      pinSalt: typeof s.pinSalt === "string" ? s.pinSalt : null,
      autoLockMinutes: [0, 1, 5, 15, 30].includes(s.autoLockMinutes) ? s.autoLockMinutes : 5,
      lastAccountId: typeof s.lastAccountId === "string" ? s.lastAccountId : null,
    };

    if (Array.isArray(input.accounts) && input.accounts.length) {
      clean.accounts = input.accounts.filter(Boolean).map((a) => ({
        id: id(a.id), name: str(a.name, 40) || "Account",
        type: ACCOUNT_TYPES[a.type] ? a.type : "other", openingBalance: num(a.openingBalance),
      }));
    }

    if (Array.isArray(input.categories) && input.categories.length) {
      clean.categories = input.categories
        .filter((c) => c && ["income", "expense"].includes(c.type))
        .map((c) => ({ id: id(c.id), type: c.type, name: str(c.name, 40) || "Category", icon: str(c.icon, 8) || "•", system: !!c.system }));
      // There must always be an "Other" category for each type
      for (const type of ["income", "expense"]) {
        if (!clean.categories.some((c) => c.type === type && c.system)) {
          clean.categories.push({ id: Utils.uid(), type, name: "Other", icon: type === "income" ? "💰" : "📦", system: true });
        }
      }
    }

    const accountIds = new Set(clean.accounts.map((a) => a.id));
    const categoryById = new Map(clean.categories.map((c) => [c.id, c]));

    const cleanTx = (t) => {
      if (!t || !["income", "expense", "transfer"].includes(t.type)) return null;
      const amount = num(t.amount);
      if (!(amount > 0) || !Utils.isDateStr(t.date)) return null;
      const tx = {
        id: id(t.id), type: t.type, amount, date: t.date,
        accountId: accountIds.has(t.accountId) ? t.accountId : clean.accounts[0].id,
        toAccountId: null, categoryId: null,
        description: str(t.description), notes: str(t.notes, 500),
        tags: Array.isArray(t.tags) ? t.tags.map((x) => str(x, 30)).filter(Boolean).slice(0, 10) : [],
        recurringId: typeof t.recurringId === "string" ? t.recurringId : null,
      };
      if (t.type === "transfer") {
        if (!accountIds.has(t.toAccountId) || t.toAccountId === tx.accountId) return null;
        tx.toAccountId = t.toAccountId;
      } else {
        const cat = categoryById.get(t.categoryId);
        tx.categoryId = cat && cat.type === t.type ? cat.id : clean.categories.find((c) => c.type === t.type && c.system).id;
      }
      return tx;
    };

    clean.transactions = (Array.isArray(input.transactions) ? input.transactions : []).map(cleanTx).filter(Boolean);

    clean.recurring = (Array.isArray(input.recurring) ? input.recurring : [])
      .filter((r) => r && ["daily", "weekly", "monthly", "yearly"].includes(r.frequency) && Utils.isDateStr(r.nextDate))
      .map((r) => {
        const template = cleanTx({ ...r.template, date: r.nextDate });
        return template && {
          id: id(r.id), frequency: r.frequency, nextDate: r.nextDate,
          anchorDay: Utils.clamp(Math.round(num(r.anchorDay)) || 1, 1, 31),
          endDate: Utils.isDateStr(r.endDate) ? r.endDate : null, template,
        };
      })
      .filter(Boolean);

    clean.budgets = (Array.isArray(input.budgets) ? input.budgets : [])
      .filter((b) => b && categoryById.get(b.categoryId)?.type === "expense" && num(b.amount) > 0)
      .map((b) => ({ id: id(b.id), categoryId: b.categoryId, amount: num(b.amount) }));

    clean.goals = (Array.isArray(input.goals) ? input.goals : []).filter(Boolean).map((g) => ({
      id: id(g.id), name: str(g.name, 60) || "Goal", icon: str(g.icon, 8) || "🎯",
      target: Math.max(num(g.target), 0.01), deadline: Utils.isDateStr(g.deadline) ? g.deadline : null,
      createdAt: Utils.isDateStr(g.createdAt) ? g.createdAt : Utils.todayStr(),
      contributions: (Array.isArray(g.contributions) ? g.contributions : [])
        .filter((c) => c && Utils.isDateStr(c.date) && num(c.amount) !== 0)
        .map((c) => ({ id: id(c.id), date: c.date, amount: num(c.amount), note: str(c.note, 80) })),
    }));

    return clean;
  }

  // ---------- Looking things up ----------

  const getAccount = (accountId) => state.accounts.find((a) => a.id === accountId);
  const getCategory = (categoryId) => state.categories.find((c) => c.id === categoryId);
  const getGoal = (goalId) => state.goals.find((g) => g.id === goalId);
  const categoriesOf = (type) => state.categories.filter((c) => c.type === type);
  const otherCategory = (type) => state.categories.find((c) => c.type === type && c.system);

  // ---------- Transactions ----------

  function addTransaction(data) {
    const tx = { id: Utils.uid(), notes: "", tags: [], recurringId: null, toAccountId: null, categoryId: null, ...data };
    state.transactions.push(tx);
    state.settings.lastAccountId = tx.accountId;
    commit();
    return tx;
  }

  function updateTransaction(txId, changes) {
    const tx = state.transactions.find((t) => t.id === txId);
    if (tx) Object.assign(tx, changes);
    commit();
  }

  function deleteTransaction(txId) {
    const index = state.transactions.findIndex((t) => t.id === txId);
    if (index === -1) return null;
    const [removed] = state.transactions.splice(index, 1);
    commit();
    return removed;
  }

  function restoreTransaction(tx) {
    state.transactions.push(tx);
    commit();
  }

  // ---------- Recurring transactions ----------

  function addRecurring(tx, frequency) {
    const anchorDay = Utils.parseDate(tx.date).getDate();
    const { id: _ignored, date: _date, ...template } = tx;
    const rule = {
      id: Utils.uid(), frequency, anchorDay, endDate: null,
      nextDate: Utils.nextOccurrence(tx.date, frequency, anchorDay), template,
    };
    state.recurring.push(rule);
    tx.recurringId = rule.id;
    processRecurring(false);
    commit();
    return rule;
  }

  function deleteRecurring(ruleId) {
    state.recurring = state.recurring.filter((r) => r.id !== ruleId);
    commit();
  }

  // Creates any repeating transactions that have come due (up to today).
  function processRecurring(shouldCommit = true) {
    const today = Utils.todayStr();
    let created = 0;
    for (const rule of state.recurring) {
      let guard = 0;
      while (rule.nextDate <= today && (!rule.endDate || rule.nextDate <= rule.endDate) && guard++ < 400) {
        state.transactions.push({ ...rule.template, id: Utils.uid(), date: rule.nextDate, recurringId: rule.id });
        rule.nextDate = Utils.nextOccurrence(rule.nextDate, rule.frequency, rule.anchorDay);
        created++;
      }
    }
    if (created && shouldCommit) commit();
    return created;
  }

  // ---------- Accounts ----------

  function saveAccount(data) {
    if (data.id) Object.assign(getAccount(data.id), data);
    else state.accounts.push({ ...data, id: Utils.uid() });
    commit();
  }

  // Returns an error message, or null if the account was deleted.
  function deleteAccount(accountId) {
    if (state.accounts.length <= 1) return "You need at least one account.";
    const used = state.transactions.filter((t) => t.accountId === accountId || t.toAccountId === accountId).length;
    if (used) return `This account has ${used} transaction${used === 1 ? "" : "s"}. Delete or move them first.`;
    state.accounts = state.accounts.filter((a) => a.id !== accountId);
    state.recurring = state.recurring.filter((r) => r.template.accountId !== accountId && r.template.toAccountId !== accountId);
    commit();
    return null;
  }

  // ---------- Categories ----------

  function saveCategory(data) {
    if (data.id) Object.assign(getCategory(data.id), data);
    else state.categories.push({ ...data, id: Utils.uid(), system: false });
    commit();
  }

  // Transactions in a deleted category move to "Other".
  function deleteCategory(categoryId) {
    const category = getCategory(categoryId);
    if (!category || category.system) return;
    const fallback = otherCategory(category.type);
    for (const t of state.transactions) if (t.categoryId === categoryId) t.categoryId = fallback.id;
    for (const r of state.recurring) if (r.template.categoryId === categoryId) r.template.categoryId = fallback.id;
    state.budgets = state.budgets.filter((b) => b.categoryId !== categoryId);
    state.categories = state.categories.filter((c) => c.id !== categoryId);
    commit();
  }

  // ---------- Budgets (monthly spending limits per category) ----------

  function setBudget(categoryId, amount) {
    const existing = state.budgets.find((b) => b.categoryId === categoryId);
    if (!(amount > 0)) state.budgets = state.budgets.filter((b) => b.categoryId !== categoryId);
    else if (existing) existing.amount = amount;
    else state.budgets.push({ id: Utils.uid(), categoryId, amount });
    commit();
  }

  // ---------- Savings goals ----------

  function saveGoal(data) {
    if (data.id) Object.assign(getGoal(data.id), data);
    else state.goals.push({ contributions: [], createdAt: Utils.todayStr(), ...data, id: Utils.uid() });
    commit();
  }

  function deleteGoal(goalId) {
    state.goals = state.goals.filter((g) => g.id !== goalId);
    commit();
  }

  function addContribution(goalId, amount, note = "") {
    const goal = getGoal(goalId);
    if (!goal) return;
    goal.contributions.push({ id: Utils.uid(), date: Utils.todayStr(), amount, note });
    commit();
  }

  // ---------- Settings ----------

  function updateSettings(changes) {
    Object.assign(state.settings, changes);
    commit();
  }

  // ---------- Backup, restore, demo data ----------

  function exportData() {
    return JSON.stringify({ app: "finance-tracker", exportedAt: new Date().toISOString(), ...state }, null, 2);
  }

  function importData(json) {
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.transactions)) {
      throw new Error("This file doesn't look like a Finance Tracker backup.");
    }
    const keep = { pinHash: state.settings.pinHash, pinSalt: state.settings.pinSalt };
    state = sanitize(parsed);
    Object.assign(state.settings, keep); // keep the PIN of this device
    processRecurring(false);
    commit();
  }

  function resetAll() {
    state = defaultState();
    try {
      localStorage.removeItem(LEGACY_KEY);
    } catch { /* ignore */ }
    commit();
  }

  // Fills the app with three months of realistic example data to explore.
  function loadDemoData() {
    const settings = { ...state.settings };
    state = defaultState();
    state.settings = { ...settings, lastAccountId: null };
    const [cash, bank] = state.accounts;
    bank.openingBalance = 2400;
    cash.openingBalance = 150;
    state.accounts.push({ id: Utils.uid(), name: "Credit card", type: "card", openingBalance: 0 });
    const card = state.accounts[2];

    const cat = (type, name) => state.categories.find((c) => c.type === type && c.name === name).id;
    const today = Utils.todayStr();
    const add = (date, type, amount, category, account, description, tags = []) => {
      if (date > today) return;
      state.transactions.push({
        id: Utils.uid(), type, amount, date, accountId: account.id, toAccountId: null,
        categoryId: cat(type, category), description, notes: "", tags, recurringId: null,
      });
    };

    let seed = 7; // simple repeatable "random" numbers
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const pick = (list) => list[Math.floor(rand() * list.length)];

    for (let m = -3; m <= 0; m++) {
      const key = Utils.addMonthsToKey(Utils.currentMonthKey(), m);
      const d = (day) => `${key}-${String(day).padStart(2, "0")}`;
      add(d(1), "income", 3850, "Salary", bank, "Monthly salary");
      add(d(2), "expense", 1250, "Housing", bank, "Rent");
      add(d(5), "expense", 64.99, "Bills & Utilities", bank, "Phone & internet");
      add(d(8), "expense", 15.99, "Entertainment", card, "Streaming subscription", ["subscription"]);
      add(d(12), "expense", 48 + Math.round(rand() * 40), "Bills & Utilities", bank, "Electricity");
      if (m % 2 === 0) add(d(18), "income", 450 + Math.round(rand() * 300), "Freelance", bank, "Website project");
      add(d(20), "expense", 45, "Health", card, "Gym membership", ["subscription"]);
      for (let day = 1; day <= 28; day += 3 + Math.floor(rand() * 3)) {
        add(d(day), "expense", Math.round((25 + rand() * 70) * 100) / 100, "Groceries", card, pick(["Supermarket", "Farmers market", "Grocery store"]));
      }
      for (let day = 2; day <= 28; day += 2 + Math.floor(rand() * 4)) {
        add(d(day), "expense", Math.round((6 + rand() * 30) * 100) / 100, "Food & Dining", pick([cash, card]), pick(["Coffee", "Lunch", "Dinner out", "Takeaway"]));
      }
      for (let day = 3; day <= 28; day += 6) add(d(day), "expense", 2.75 * 2, "Transport", cash, "Bus fare");
      add(d(14), "expense", Math.round((40 + rand() * 120) * 100) / 100, "Shopping", card, pick(["Clothes", "Shoes", "Home items"]));
      add(d(22), "expense", Math.round((20 + rand() * 40) * 100) / 100, "Entertainment", card, pick(["Cinema", "Concert tickets", "Board game"]));
      if (d(25) <= today) {
        state.transactions.push({
          id: Utils.uid(), type: "transfer", amount: 300, date: d(25), accountId: bank.id, toAccountId: card.id,
          categoryId: null, description: "Credit card payment", notes: "", tags: [], recurringId: null,
        });
      }
    }

    state.budgets = [
      ["Groceries", 450], ["Food & Dining", 250], ["Shopping", 150], ["Entertainment", 80], ["Transport", 60],
    ].map(([name, amount]) => ({ id: Utils.uid(), categoryId: cat("expense", name), amount }));

    state.goals = [
      { name: "Emergency fund", icon: "🛟", target: 5000, saved: 1800, months: 10 },
      { name: "Summer holiday", icon: "🏖️", target: 1500, saved: 620, months: 7 },
    ].map((g) => ({
      id: Utils.uid(), name: g.name, icon: g.icon, target: g.target, createdAt: today,
      deadline: Utils.monthRange(Utils.addMonthsToKey(Utils.currentMonthKey(), g.months)).to,
      contributions: [{ id: Utils.uid(), date: today, amount: g.saved, note: "Starting amount" }],
    }));

    const salary = state.transactions.find((t) => t.description === "Monthly salary" && t.date.startsWith(Utils.currentMonthKey()));
    if (salary) {
      const rule = { id: Utils.uid(), frequency: "monthly", anchorDay: 1, endDate: null,
        nextDate: Utils.nextOccurrence(salary.date, "monthly", 1), template: { ...salary } };
      delete rule.template.id;
      delete rule.template.date;
      salary.recurringId = rule.id;
      state.recurring.push(rule);
    }
    commit();
  }

  return {
    ACCOUNT_TYPES,
    get state() { return state; },
    load, subscribe, commit,
    getAccount, getCategory, getGoal, categoriesOf, otherCategory,
    addTransaction, updateTransaction, deleteTransaction, restoreTransaction,
    addRecurring, deleteRecurring, processRecurring,
    saveAccount, deleteAccount, saveCategory, deleteCategory,
    setBudget, saveGoal, deleteGoal, addContribution, updateSettings,
    exportData, importData, resetAll, loadDemoData,
  };
})();

// ============================================================
// Finance — calculations based on the stored data
// ============================================================
const Finance = (() => {
  const { sum } = Utils;

  function inRange(from, to) {
    return Store.state.transactions.filter((t) => (!from || t.date >= from) && (!to || t.date <= to));
  }

  function totals(list) {
    const income = sum(list.filter((t) => t.type === "income"), (t) => t.amount);
    const expense = sum(list.filter((t) => t.type === "expense"), (t) => t.amount);
    return { income, expense, net: income - expense, savingsRate: income > 0 ? (income - expense) / income : null };
  }

  function monthTotals(key) {
    const { from, to } = Utils.monthRange(key);
    return totals(inRange(from, to));
  }

  // [{ category, total, count }] largest first
  function byCategory(list, type = "expense") {
    const groups = new Map();
    for (const t of list) {
      if (t.type !== type) continue;
      const entry = groups.get(t.categoryId) || { category: Store.getCategory(t.categoryId), total: 0, count: 0 };
      entry.total += t.amount;
      entry.count++;
      groups.set(t.categoryId, entry);
    }
    return [...groups.values()].filter((g) => g.category).sort((a, b) => b.total - a.total);
  }

  // How much money is in an account (optionally on a given date)
  function accountBalance(account, upTo = null) {
    let balance = account.openingBalance;
    for (const t of Store.state.transactions) {
      if (upTo && t.date > upTo) continue;
      if (t.type === "income" && t.accountId === account.id) balance += t.amount;
      else if (t.type === "expense" && t.accountId === account.id) balance -= t.amount;
      else if (t.type === "transfer") {
        if (t.accountId === account.id) balance -= t.amount;
        if (t.toAccountId === account.id) balance += t.amount;
      }
    }
    return balance;
  }

  function totalBalance(upTo = null) {
    return sum(Store.state.accounts, (a) => accountBalance(a, upTo));
  }

  // One entry per month: { key, income, expense, net }
  function monthly(keys) {
    return keys.map((key) => ({ key, ...monthTotals(key) }));
  }

  function firstMonthKey() {
    const dates = Store.state.transactions.map((t) => t.date).sort();
    return dates.length ? Utils.monthKey(dates[0]) : Utils.currentMonthKey();
  }

  // Each budget with how much has been spent in the given month
  function budgetStatus(key) {
    const { from, to } = Utils.monthRange(key);
    const spentBy = new Map(byCategory(inRange(from, to)).map((g) => [g.category.id, g.total]));
    return Store.state.budgets
      .map((budget) => {
        const category = Store.getCategory(budget.categoryId);
        const spent = spentBy.get(budget.categoryId) || 0;
        const ratio = spent / budget.amount;
        const status = ratio > 1 ? "over" : ratio >= 0.8 ? "warning" : "ok";
        return { budget, category, spent, ratio, status, remaining: budget.amount - spent };
      })
      .filter((b) => b.category)
      .sort((a, b) => b.ratio - a.ratio);
  }

  function goalSaved(goal) {
    return Math.max(0, sum(goal.contributions, (c) => c.amount));
  }

  // How much needs saving each month to reach the goal on time
  function goalMonthlyNeeded(goal) {
    const remaining = goal.target - goalSaved(goal);
    if (!goal.deadline || remaining <= 0) return null;
    const today = Utils.todayStr();
    if (goal.deadline < today) return { overdue: true, remaining };
    const [y1, m1] = today.split("-").map(Number);
    const [y2, m2] = goal.deadline.split("-").map(Number);
    const months = Math.max(1, (y2 - y1) * 12 + (m2 - m1) + 1);
    return { overdue: false, perMonth: remaining / months, months };
  }

  return { inRange, totals, monthTotals, byCategory, accountBalance, totalBalance, monthly, firstMonthKey, budgetStatus, goalSaved, goalMonthlyNeeded };
})();
