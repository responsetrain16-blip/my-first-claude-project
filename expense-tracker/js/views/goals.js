// ============================================================
// Goals — saving up for something
// ============================================================
"use strict";

Views.goals = (() => {
  const { h, money, icon } = Utils;
  const GOAL_ICONS = ["🎯", "🛟", "🏖️", "🏠", "🚗", "🎓", "💍", "💻", "🎁", "👶", "🏥", "📈"];

  function openGoalForm(goal = null) {
    let chosenIcon = goal?.icon || GOAL_ICONS[0];
    const name = h("input", { type: "text", maxlength: 60, placeholder: "e.g. Emergency fund", value: goal?.name || "" });
    const target = h("input", { type: "text", inputmode: "decimal", placeholder: "0.00", value: goal ? String(goal.target) : "" });
    const starting = h("input", { type: "text", inputmode: "decimal", placeholder: "0.00" });
    const deadline = h("input", { type: "date", value: goal?.deadline || "", min: Utils.todayStr() });
    const icons = h("div", { class: "chip-grid icon-grid", role: "radiogroup", "aria-label": "Icon" }, GOAL_ICONS.map((emoji) =>
      h("label", { class: "chip icon-chip" },
        h("input", { type: "radio", name: "goal-icon", value: emoji, checked: emoji === chosenIcon, onChange: () => { chosenIcon = emoji; } }),
        h("span", { "aria-label": emoji, text: emoji }))));
    const error = h("p", { class: "form-error", role: "alert", hidden: true });

    const save = h("button", { class: "btn btn-primary", type: "submit", text: goal ? "Save" : "Create goal" });
    const cancel = h("button", { class: "btn btn-ghost", type: "button", text: "Cancel" });
    const form = h("form", { novalidate: true },
      UI.field("Name", name),
      h("div", { class: "field" }, h("span", { class: "field-label", text: "Icon" }), icons),
      h("div", { class: "field-row" }, UI.field("Target amount", target), UI.field("Target date (optional)", deadline)),
      goal ? null : UI.field("Already saved (optional)", starting),
      error,
      h("div", { class: "form-footer" }, h("div"), h("div", { class: "footer-right" }, cancel, save)));
    const { close } = UI.openModal({ title: goal ? "Edit goal" : "New savings goal", body: form });
    cancel.addEventListener("click", close);
    name.focus();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fail = (msg) => { error.textContent = msg; error.hidden = false; };
      const targetValue = Utils.parseAmount(target.value);
      const startValue = starting.value ? Utils.parseAmount(starting.value) : 0;
      if (!name.value.trim()) return fail("Please give your goal a name.");
      if (!(targetValue > 0)) return fail("Please enter a target amount greater than 0.");
      if (!(startValue >= 0)) return fail("The starting amount can't be negative.");
      const data = { name: name.value.trim(), icon: chosenIcon, target: targetValue, deadline: deadline.value || null };
      if (goal) {
        Store.saveGoal({ ...data, id: goal.id });
      } else {
        const contributions = startValue > 0 ? [{ id: Utils.uid(), date: Utils.todayStr(), amount: startValue, note: "Starting amount" }] : [];
        Store.saveGoal({ ...data, contributions });
      }
      close();
      UI.toast(goal ? "Goal updated" : "Goal created — good luck!");
    });
  }

  function openContribution(goal, direction = 1) {
    const amount = h("input", { type: "text", inputmode: "decimal", placeholder: "0.00" });
    const note = h("input", { type: "text", maxlength: 80, placeholder: "Optional" });
    const error = h("p", { class: "form-error", role: "alert", hidden: true });
    const save = h("button", { class: "btn btn-primary", type: "submit", text: direction > 0 ? "Add money" : "Withdraw" });
    const cancel = h("button", { class: "btn btn-ghost", type: "button", text: "Cancel" });
    const saved = Finance.goalSaved(goal);
    const form = h("form", { novalidate: true },
      h("p", { class: "muted" }, "Saved so far: ", money(saved), " of ", money(goal.target)),
      UI.field("Amount", amount), UI.field("Note", note), error,
      h("div", { class: "form-footer" }, h("div"), h("div", { class: "footer-right" }, cancel, save)));
    const { close } = UI.openModal({ title: `${direction > 0 ? "Add to" : "Withdraw from"} ${goal.name}`, body: form, size: "modal-small" });
    cancel.addEventListener("click", close);
    amount.focus();

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = Utils.parseAmount(amount.value);
      const fail = (msg) => { error.textContent = msg; error.hidden = false; };
      if (!(value > 0)) return fail("Please enter an amount greater than 0.");
      if (direction < 0 && value > saved) return fail(`You can withdraw at most ${Utils.formatMoney(saved)}.`);
      Store.addContribution(goal.id, direction * value, note.value.trim());
      close();
      const nowSaved = saved + direction * value;
      UI.toast(direction > 0 && nowSaved >= goal.target && saved < goal.target ? `🎉 You reached your goal: ${goal.name}!` : "Saved");
    });
  }

  function openGoalDetails(goal) {
    const saved = Finance.goalSaved(goal);
    const history = [...goal.contributions].reverse();
    const actions = h("div", { class: "button-row" },
      h("button", { class: "btn btn-primary", type: "button", onClick: () => { close(); openContribution(goal, 1); } }, icon("plus", 16), "Add money"),
      h("button", { class: "btn btn-ghost", type: "button", disabled: saved <= 0, onClick: () => { close(); openContribution(goal, -1); } }, "Withdraw"),
      h("button", { class: "btn btn-ghost", type: "button", onClick: () => { close(); openGoalForm(goal); } }, icon("edit", 16), "Edit"),
      h("button", { class: "btn btn-ghost danger-text", type: "button", onClick: async () => {
        close();
        if (await UI.confirm({ title: "Delete goal?", message: `"${goal.name}" and its history will be removed. You can undo this straight afterwards.`, confirmLabel: "Delete", danger: true })) {
          await App.safely(`Delete goal “${goal.name}”`, () => Store.deleteGoal(goal.id), "Goal deleted");
        }
      } }, icon("trash", 16), "Delete"));

    const body = h("div", { class: "goal-details" },
      goalProgress(goal),
      actions,
      h("h3", { class: "section-title", text: "History" }),
      history.length
        ? h("ul", { class: "mini-list" }, history.map((c) => h("li", { class: "row-between" },
            h("span", null, h("span", { class: "muted", text: Utils.formatDate(c.date) }), c.note ? ` · ${c.note}` : ""),
            h("span", { class: `tx-amount ${c.amount > 0 ? "income" : "expense"}` }, money(c.amount, { sign: true })))))
        : h("p", { class: "muted", text: "No money added yet." }));
    const { close } = UI.openModal({ title: `${goal.icon} ${goal.name}`, body });
  }

  function goalProgress(goal) {
    const saved = Finance.goalSaved(goal);
    const ratio = saved / goal.target;
    const done = saved >= goal.target;
    const plan = Finance.goalMonthlyNeeded(goal);
    let planText = null;
    if (done) planText = UI.statusBadge("done");
    else if (plan?.overdue) planText = h("span", { class: "badge badge-warning" }, icon("alert", 14), "Target date has passed");
    else if (plan) planText = h("span", { class: "muted small" }, "Save ", money(plan.perMonth), ` a month to reach it by ${Utils.formatDate(goal.deadline)}`);

    return h("div", { class: "goal-progress" },
      h("div", { class: "budget-numbers" }, h("span", { class: "budget-spent" }, money(saved)), h("span", { class: "muted" }, " of ", money(goal.target))),
      UI.meter(ratio, done ? "done" : "ok", `${goal.name} progress`),
      h("div", { class: "row-between" },
        h("span", { class: "muted small", text: `${Math.min(100, Math.round(ratio * 100))}% saved` }),
        done ? null : h("span", { class: "muted small" }, money(goal.target - saved), " to go")),
      planText);
  }

  function render(root) {
    const { goals } = Store.state;
    root.append(h("div", { class: "page-actions" },
      h("button", { class: "btn btn-primary", type: "button", onClick: () => openGoalForm() }, icon("plus", 18), "New goal")));

    if (!goals.length) {
      root.append(UI.card(null, {}, UI.emptyState({
        emoji: "🐷", title: "Save for what matters",
        text: "Create a goal, like an emergency fund or a holiday, and add money to it as you go. We'll show how much to save each month.",
        actions: h("button", { class: "btn btn-primary", type: "button", text: "Create your first goal", onClick: () => openGoalForm() }),
      })));
      return;
    }

    const totalSaved = Utils.sum(goals, Finance.goalSaved);
    const totalTarget = Utils.sum(goals, (g) => g.target);
    root.append(h("div", { class: "tiles" },
      UI.statTile({ label: "Total saved", value: money(totalSaved) }),
      UI.statTile({ label: "Total of all targets", value: money(totalTarget) }),
      UI.statTile({ label: "Goals reached", value: `${goals.filter((g) => Finance.goalSaved(g) >= g.target).length} of ${goals.length}` })));

    root.append(h("div", { class: "goal-grid" }, goals.map((goal) =>
      h("article", { class: "card goal-card" },
        h("button", { class: "goal-head", type: "button", onClick: () => openGoalDetails(goal) },
          h("span", { class: "goal-icon", "aria-hidden": "true", text: goal.icon }),
          h("span", null, h("span", { class: "goal-name", text: goal.name }),
            h("span", { class: "muted small", text: goal.deadline ? `By ${Utils.formatDate(goal.deadline)}` : "No target date" }))),
        goalProgress(goal),
        h("div", { class: "button-row" },
          h("button", { class: "btn btn-secondary btn-small", type: "button", onClick: () => openContribution(goal, 1) }, icon("plus", 16), "Add money"),
          h("button", { class: "btn btn-ghost btn-small", type: "button", text: "Details", onClick: () => openGoalDetails(goal) }))))));
  }

  return { title: "Savings goals", render };
})();
