// ============================================================
// Budgets — monthly spending limits for each category
// ============================================================
"use strict";

Views.budgets = (() => {
  const { h, money, icon } = Utils;
  let month = Utils.currentMonthKey();

  function openBudgetForm(categoryId = null) {
    const existing = categoryId ? Store.state.budgets.find((b) => b.categoryId === categoryId) : null;
    const used = new Set(Store.state.budgets.map((b) => b.categoryId));
    const options = Store.categoriesOf("expense")
      .filter((c) => c.id === categoryId || !used.has(c.id))
      .map((c) => [c.id, `${c.icon} ${c.name}`]);
    if (!options.length) {
      UI.toast("Every category already has a budget.");
      return;
    }

    // Suggest a limit based on the average of the last 3 months
    const suggest = (catId) => {
      const keys = [1, 2, 3].map((n) => Utils.addMonthsToKey(Utils.currentMonthKey(), -n));
      const total = Utils.sum(keys, (k) => {
        const { from, to } = Utils.monthRange(k);
        return Utils.sum(Finance.inRange(from, to).filter((t) => t.type === "expense" && t.categoryId === catId), (t) => t.amount);
      });
      return total / 3;
    };

    const catSelect = UI.select(options, categoryId || options[0][0], { disabled: !!existing });
    const amount = h("input", { type: "text", inputmode: "decimal", placeholder: "0.00", value: existing ? String(existing.amount) : "" });
    const hint = h("p", { class: "hint" });
    const updateHint = () => {
      const avg = suggest(catSelect.value);
      hint.textContent = avg > 0 ? `You spent about ${Utils.formatMoney(avg)} a month here over the last 3 months.` : "";
    };
    catSelect.addEventListener("change", updateHint);
    updateHint();

    const error = h("p", { class: "form-error", role: "alert", hidden: true });
    const save = h("button", { class: "btn btn-primary", type: "submit", text: existing ? "Save" : "Create budget" });
    const cancel = h("button", { class: "btn btn-ghost", type: "button", text: "Cancel" });
    const remove = existing ? h("button", { class: "btn btn-ghost danger-text", type: "button" }, icon("trash", 16), "Remove") : h("div");

    const form = h("form", { novalidate: true },
      UI.field("Category", catSelect),
      UI.field("Monthly limit", amount),
      hint, error,
      h("div", { class: "form-footer" }, remove, h("div", { class: "footer-right" }, cancel, save)));
    const { close } = UI.openModal({ title: existing ? "Edit budget" : "New budget", body: form, size: "modal-small" });
    cancel.addEventListener("click", close);
    amount.focus();

    if (existing) {
      remove.addEventListener("click", () => {
        Store.setBudget(existing.categoryId, 0);
        close();
        UI.toast("Budget removed");
      });
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = Utils.parseAmount(amount.value);
      if (!(value > 0)) {
        error.textContent = "Please enter a limit greater than 0.";
        error.hidden = false;
        return;
      }
      Store.setBudget(catSelect.value, value);
      close();
      UI.toast(existing ? "Budget updated" : "Budget created");
    });
  }

  function render(root) {
    const statuses = Finance.budgetStatus(month);
    const isCurrent = month === Utils.currentMonthKey();
    const totalBudget = Utils.sum(statuses, (b) => b.budget.amount);
    const totalSpent = Utils.sum(statuses, (b) => b.spent);
    const remaining = totalBudget - totalSpent;

    // Month switcher
    root.append(h("div", { class: "page-actions" },
      h("div", { class: "month-switcher" },
        h("button", { class: "icon-btn", type: "button", "aria-label": "Previous month", onClick: () => { month = Utils.addMonthsToKey(month, -1); App.render(); } }, icon("left")),
        h("span", { class: "month-label", text: Utils.monthLabel(month) }),
        h("button", { class: "icon-btn", type: "button", "aria-label": "Next month", disabled: isCurrent, onClick: () => { month = Utils.addMonthsToKey(month, 1); App.render(); } }, icon("right"))),
      h("button", { class: "btn btn-primary", type: "button", onClick: () => openBudgetForm() }, icon("plus", 18), "New budget")));

    if (!statuses.length) {
      root.append(UI.card(null, {}, UI.emptyState({
        emoji: "🎯", title: "Plan your spending",
        text: "A budget is a monthly limit for a category, like $400 for groceries. You'll see how much is left and get a heads-up when you're close.",
        actions: h("button", { class: "btn btn-primary", type: "button", text: "Create your first budget", onClick: () => openBudgetForm() }),
      })));
      return;
    }

    // Overview
    const [y, m] = month.split("-").map(Number);
    const daysLeft = isCurrent ? Utils.daysInMonth(y, m) - new Date().getDate() + 1 : 0;
    const overallRatio = totalBudget ? totalSpent / totalBudget : 0;
    const overallStatus = overallRatio > 1 ? "over" : overallRatio >= 0.8 ? "warning" : "ok";

    root.append(UI.card(null, { className: "budget-overview" },
      h("div", { class: "tiles tiles-inline" },
        UI.statTile({ label: "Budgeted", value: money(totalBudget) }),
        UI.statTile({ label: "Spent", value: money(totalSpent) }),
        UI.statTile({ label: remaining >= 0 ? "Left to spend" : "Over by", value: money(Math.abs(remaining)) })),
      UI.meter(overallRatio, overallStatus, "Total budget used"),
      h("div", { class: "row-between overview-foot" },
        UI.statusBadge(overallStatus),
        isCurrent && remaining > 0
          ? h("span", { class: "muted" }, "About ", money(remaining / daysLeft), ` a day for the next ${daysLeft} day${daysLeft === 1 ? "" : "s"}`)
          : null)));

    // One card per budget
    root.append(h("div", { class: "budget-grid" }, statuses.map((b) =>
      h("button", { class: "card budget-card", type: "button", onClick: () => openBudgetForm(b.category.id) },
        h("div", { class: "row-between" },
          h("span", { class: "budget-name" }, h("span", { class: "tx-icon", "aria-hidden": "true", text: b.category.icon }), b.category.name),
          UI.statusBadge(b.status)),
        h("div", { class: "budget-numbers" },
          h("span", { class: "budget-spent" }, money(b.spent)),
          h("span", { class: "muted" }, " of ", money(b.budget.amount))),
        UI.meter(b.ratio, b.status, `${b.category.name} budget used`),
        h("p", { class: "muted small" },
          b.remaining >= 0 ? [money(b.remaining), " left"] : [money(-b.remaining), " over the limit"],
          ` · ${Math.round(b.ratio * 100)}% used`)))));

    // Spending in categories without a budget
    const { from, to } = Utils.monthRange(month);
    const budgeted = new Set(Store.state.budgets.map((b) => b.categoryId));
    const unbudgeted = Finance.byCategory(Finance.inRange(from, to)).filter((g) => !budgeted.has(g.category.id));
    if (unbudgeted.length) {
      root.append(UI.card("Spending without a budget", { subtitle: "Tap a category to set a limit" },
        Charts.barList(unbudgeted.map((g) => ({ icon: g.category.icon, name: g.category.name, value: g.total, id: g.category.id })),
          { color: "var(--series-2)", onClick: (item) => openBudgetForm(item.id) })));
    }
  }

  return { title: "Budgets", render, openBudgetForm };
})();
