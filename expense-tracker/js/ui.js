// ============================================================
// ui.js — reusable pieces of the interface:
// pop-up windows, notifications, form fields, list rows,
// and the "Add / edit transaction" form.
// ============================================================
"use strict";

// Each page of the app registers itself here (see the files in js/views/)
const Views = {};

const UI = (() => {
  const { h, icon, money, formatDate } = Utils;

  // ---------- Pop-up windows (modals) ----------
  // Uses the browser's built-in <dialog>, which handles focus and the Esc key.
  function openModal({ title, body, footer, size = "" }) {
    const dialog = h("dialog", { class: `modal ${size}`, "aria-label": title });
    const close = () => dialog.close();
    dialog.append(
      h("header", { class: "modal-header" },
        h("h2", { text: title }),
        h("button", { class: "icon-btn", type: "button", "aria-label": "Close", onClick: close }, icon("x"))),
      h("div", { class: "modal-body" }, body),
    );
    if (footer) dialog.append(h("footer", { class: "modal-footer" }, footer));
    // Clicking the dark area outside the window closes it
    dialog.addEventListener("click", (e) => { if (e.target === dialog) close(); });
    dialog.addEventListener("close", () => dialog.remove());
    document.body.append(dialog);
    dialog.showModal();
    return { dialog, close };
  }

  // Asks a yes/no question. Usage: if (await UI.confirm({...})) { ... }
  function confirm({ title, message, confirmLabel = "OK", danger = false }) {
    return new Promise((resolve) => {
      let answer = false;
      const yes = h("button", { class: `btn ${danger ? "btn-danger" : "btn-primary"}`, type: "button", text: confirmLabel });
      const no = h("button", { class: "btn btn-ghost", type: "button", text: "Cancel" });
      const { dialog, close } = openModal({ title, body: h("p", { class: "confirm-text", text: message }), footer: [no, yes], size: "modal-small" });
      yes.addEventListener("click", () => { answer = true; close(); });
      no.addEventListener("click", close);
      dialog.addEventListener("close", () => resolve(answer));
      no.focus();
    });
  }

  // ---------- Small notifications at the bottom of the screen ----------
  function toast(message, { actionLabel, onAction, tone = "", duration = 4500 } = {}) {
    const region = document.getElementById("toasts");
    const el = h("div", { class: `toast ${tone}` }, h("span", { text: message }));
    const dismiss = () => {
      el.classList.add("leaving");
      setTimeout(() => el.remove(), 200);
    };
    if (actionLabel) {
      el.append(h("button", { class: "toast-action", type: "button", text: actionLabel, onClick: () => { onAction(); dismiss(); } }));
    }
    region.append(el);
    setTimeout(dismiss, duration);
  }

  // ---------- Form helpers ----------
  let fieldCount = 0;
  function field(label, input, hint) {
    const inputId = input.id || `field-${++fieldCount}`;
    input.id = inputId;
    return h("div", { class: "field" },
      h("label", { for: inputId, text: label }),
      input,
      hint ? h("p", { class: "hint", text: hint }) : null);
  }

  function select(options, value, props = {}) {
    return h("select", { ...props, value }, options.map(([v, label]) => h("option", { value: v, text: label })));
  }

  // A row of connected buttons where one is chosen (like radio buttons)
  function segmented(name, options, value, onChange) {
    return h("div", { class: "segmented", role: "radiogroup" }, options.map(([v, label]) =>
      h("label", { class: "segment" },
        h("input", { type: "radio", name, value: v, checked: v === value, onChange: () => onChange(v) }),
        h("span", { text: label }))));
  }

  function emptyState({ emoji, title, text, actions }) {
    return h("div", { class: "empty-state" },
      h("div", { class: "empty-emoji", "aria-hidden": "true", text: emoji }),
      h("h3", { text: title }),
      text ? h("p", { text }) : null,
      actions ? h("div", { class: "empty-actions" }, actions) : null);
  }

  function card(title, { actions, subtitle, className = "" } = {}, ...children) {
    return h("section", { class: `card ${className}` },
      title ? h("header", { class: "card-header" },
        h("div", null, h("h2", { class: "card-title", text: title }), subtitle ? h("p", { class: "card-subtitle", text: subtitle }) : null),
        actions ? h("div", { class: "card-actions" }, actions) : null) : null,
      children);
  }

  // A progress bar. status: "ok" | "warning" | "over" | "done"
  function meter(ratio, status = "ok", label = "") {
    return h("div", {
      class: `meter meter-${status}`, role: "progressbar", "aria-label": label,
      "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(Math.min(ratio, 1) * 100),
    }, h("div", { class: "meter-fill", style: { width: Math.min(100, Math.max(0, ratio * 100)) + "%" } }));
  }

  // Status is always shown with an icon and words, never by color alone
  function statusBadge(status) {
    const map = {
      ok: ["check", "On track"], warning: ["alert", "Close to limit"],
      over: ["alert", "Over budget"], done: ["check", "Goal reached"],
    };
    const [iconName, text] = map[status];
    return h("span", { class: `badge badge-${status}` }, icon(iconName, 14), text);
  }

  function statTile({ label, value, delta, deltaGood, deltaText, swatch }) {
    return h("div", { class: "tile" },
      h("span", { class: "tile-label" }, swatch ? h("span", { class: "swatch", style: { background: swatch } }) : null, label),
      h("span", { class: "tile-value" }, value),
      delta !== undefined && delta !== null
        ? h("span", { class: `tile-delta ${deltaGood ? "good" : "bad"}` }, icon(delta >= 0 ? "up" : "down", 14), deltaText)
        : null);
  }

  // ---------- One row in a transaction list ----------
  function transactionRow(t) {
    const category = Store.getCategory(t.categoryId);
    const account = Store.getAccount(t.accountId);
    const isTransfer = t.type === "transfer";
    const title = t.description || (isTransfer ? "Transfer" : category?.name || "Transaction");
    const meta = isTransfer
      ? [`${account?.name || "?"} → ${Store.getAccount(t.toAccountId)?.name || "?"}`]
      : [category?.name, account?.name];
    const sign = t.type === "income" ? 1 : t.type === "expense" ? -1 : 0;

    return h("li", null,
      h("button", { class: "tx-row", type: "button", onClick: () => openTransactionForm(t) },
        h("span", { class: "tx-icon", "aria-hidden": "true", text: isTransfer ? "🔁" : category?.icon || "•" }),
        h("span", { class: "tx-main" },
          h("span", { class: "tx-title", text: title }),
          h("span", { class: "tx-meta" },
            meta.filter(Boolean).join(" · "),
            // Dated after today: still counted in totals, but labelled so it isn't a surprise
            t.date > Utils.todayStr() ? h("span", { class: "tag tag-upcoming", text: "Upcoming" }) : null,
            t.recurringId ? h("span", { class: "tx-repeat", title: "Repeating" }, icon("repeat", 12)) : null,
            t.tags.map((tag) => h("span", { class: "tag", text: "#" + tag })))),
        h("span", { class: `tx-amount ${t.type}` }, money(sign * t.amount, { sign: sign > 0 }))));
  }

  // ---------- Budget alert ----------
  // How a category's budget stands in the month of `date`, or null if it has no budget.
  function budgetFor(categoryId, date) {
    return Finance.budgetStatus(Utils.monthKey(date)).find((b) => b.budget.categoryId === categoryId) || null;
  }

  // A short warning when saving an expense pushed its budget to "Close to limit" (80%)
  // or over it, or added more to a budget that was already over. Empty text otherwise.
  function budgetAlert(before, after, date) {
    // Only when spending in that budget actually went up (not for edits that lower it)
    if (!after || !before || after.spent <= before.spent + 0.004) return "";
    const key = Utils.monthKey(date);
    const when = key === Utils.currentMonthKey() ? "this month" : `in ${Utils.monthLabel(key)}`;
    const percent = `${Math.round(after.ratio * 100)}%`;
    // With "Hide amounts" on, show only the percentage so no amounts appear on screen
    const detail = Store.state.settings.privacy
      ? `${percent} used`
      : `${Utils.formatMoney(after.spent)} of ${Utils.formatMoney(after.budget.amount)} (${percent})`;
    const name = after.category.name;
    if (after.status === "over") {
      return before.status === "over"
        ? `⚠ Still over budget: ${name} ${when} is at ${detail}.`
        : `⚠ Over budget: ${name} ${when} is now at ${detail}.`;
    }
    if (after.status === "warning" && before.status === "ok") {
      return `⚠ Close to limit: ${name} ${when} is at ${detail}.`;
    }
    return "";
  }

  // ---------- Add / edit a transaction ----------
  function openTransactionForm(existing = null, preset = {}) {
    const { state } = Store;
    const isEdit = !!existing;
    const draft = existing
      ? { ...existing, tags: [...existing.tags] }
      : {
          type: "expense", amount: "", categoryId: null, toAccountId: null, date: Utils.todayStr(),
          description: "", notes: "", tags: [],
          accountId: Store.getAccount(state.settings.lastAccountId) ? state.settings.lastAccountId : state.accounts[0].id,
          ...preset,
        };
    let categoryChosenByUser = isEdit;

    const amountInput = h("input", {
      type: "text", inputmode: "decimal", autocomplete: "off", class: "amount-input",
      placeholder: "0.00", value: draft.amount === "" ? "" : String(draft.amount), required: true,
    });
    const categoryGrid = h("div", { class: "chip-grid", role: "radiogroup", "aria-label": "Category" });
    const accountSelect = select(state.accounts.map((a) => [a.id, a.name]), draft.accountId);
    const toAccountSelect = select(state.accounts.map((a) => [a.id, a.name]), draft.toAccountId || state.accounts.find((a) => a.id !== draft.accountId)?.id);
    const dateInput = h("input", { type: "date", value: draft.date, required: true });

    // Suggest descriptions you've used before
    const pastDescriptions = [...new Set(state.transactions.map((t) => t.description).filter(Boolean))].slice(-200);
    const listId = "desc-suggestions";
    const descInput = h("input", { type: "text", list: listId, maxlength: 120, placeholder: "What was it for?", value: draft.description, autocomplete: "off" });
    const datalist = h("datalist", { id: listId }, pastDescriptions.map((d) => h("option", { value: d })));
    const notesInput = h("textarea", { rows: 2, maxlength: 500, placeholder: "Optional", value: draft.notes });
    const tagsInput = h("input", { type: "text", placeholder: "e.g. holiday, work", value: draft.tags.join(", "), maxlength: 200 });
    const repeatSelect = select([["", "Doesn't repeat"], ["weekly", "Every week"], ["monthly", "Every month"], ["yearly", "Every year"]], "");
    const error = h("p", { class: "form-error", role: "alert", hidden: true });

    const categoryField = h("div", { class: "field" }, h("span", { class: "field-label", text: "Category" }), categoryGrid);
    const fromLabel = h("span");
    const accountField = field("Account", accountSelect);
    accountField.querySelector("label").replaceChildren(fromLabel);
    const toField = field("To account", toAccountSelect);

    function renderCategories() {
      categoryGrid.replaceChildren(...Store.categoriesOf(draft.type).map((c) =>
        h("label", { class: "chip" },
          h("input", { type: "radio", name: "category", value: c.id, checked: c.id === draft.categoryId,
            onChange: () => { draft.categoryId = c.id; categoryChosenByUser = true; } }),
          h("span", null, h("span", { class: "chip-icon", "aria-hidden": "true", text: c.icon }), c.name))));
    }

    function updateType(type) {
      draft.type = type;
      if (type !== "transfer" && Store.getCategory(draft.categoryId)?.type !== type) draft.categoryId = null;
      const isTransfer = type === "transfer";
      categoryField.hidden = isTransfer;
      toField.hidden = !isTransfer;
      fromLabel.textContent = isTransfer ? "From account" : "Account";
      if (!isTransfer) renderCategories();
    }

    // Picking a description you've used before fills in its category
    descInput.addEventListener("change", () => {
      if (categoryChosenByUser || draft.type === "transfer") return;
      const previous = [...state.transactions].reverse().find((t) => t.description === descInput.value && t.type === draft.type);
      if (previous) {
        draft.categoryId = previous.categoryId;
        renderCategories();
      }
    });

    const typeToggle = UI.segmented("tx-type", [["expense", "Expense"], ["income", "Income"], ["transfer", "Transfer"]], draft.type, updateType);

    const form = h("form", { class: "tx-form", novalidate: true },
      typeToggle,
      field("Amount", amountInput),
      categoryField,
      h("div", { class: "field-row" }, accountField, toField, field("Date", dateInput)),
      field("Description", descInput),
      datalist,
      h("details", { class: "more-options", open: !!(draft.notes || draft.tags.length) || null },
        h("summary", { text: "Notes, tags & repeat" }),
        field("Notes", notesInput),
        field("Tags", tagsInput, "Separate tags with commas."),
        isEdit ? null : field("Repeat", repeatSelect, "Repeating transactions are added automatically when they're due.")),
      error,
    );

    const save = h("button", { class: "btn btn-primary", type: "submit", text: isEdit ? "Save changes" : "Add transaction" });
    const cancel = h("button", { class: "btn btn-ghost", type: "button", text: "Cancel" });
    const footerLeft = isEdit ? h("div", { class: "footer-left" },
      h("button", { class: "btn btn-ghost danger-text", type: "button", onClick: remove }, icon("trash", 16), "Delete"),
      h("button", { class: "btn btn-ghost", type: "button", onClick: duplicate }, icon("copy", 16), "Duplicate")) : null;
    form.append(h("div", { class: "form-footer" }, footerLeft, h("div", { class: "footer-right" }, cancel, save)));

    const { close } = openModal({ title: isEdit ? "Edit transaction" : "New transaction", body: form });
    cancel.addEventListener("click", close);
    updateType(draft.type);
    amountInput.focus();

    function showError(message, input) {
      error.textContent = message;
      error.hidden = false;
      input?.focus();
      // On small screens the message can end up below the bottom edge, so
      // scroll just enough to show all of it
      error.scrollIntoView({ block: "nearest" });
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const amount = Utils.parseAmount(amountInput.value);
      if (!(amount > 0)) return showError("Please enter an amount greater than 0.", amountInput);
      if (amount > 1e12) return showError("That amount is too large.", amountInput);
      if (!Utils.isDateStr(dateInput.value)) return showError("Please choose a valid date.", dateInput);
      // A date more than a year ahead is almost always a typo (e.g. 2062 instead of 2026)
      if (dateInput.value > Utils.addDays(Utils.todayStr(), 366)) {
        return showError("That date is more than a year away. Please check the year.", dateInput);
      }
      if (draft.type === "transfer" && accountSelect.value === toAccountSelect.value) {
        return showError("Choose two different accounts for a transfer.", toAccountSelect);
      }
      const categoryId = draft.type === "transfer" ? null : draft.categoryId || Store.otherCategory(draft.type).id;

      const data = {
        type: draft.type, amount, categoryId, date: dateInput.value,
        accountId: accountSelect.value,
        toAccountId: draft.type === "transfer" ? toAccountSelect.value : null,
        description: descInput.value.trim(),
        notes: notesInput.value.trim(),
        tags: tagsInput.value.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean).slice(0, 10),
      };

      // Remember how this category's budget stood before saving, to spot a limit being crossed
      const budgetBefore = data.type === "expense" ? budgetFor(data.categoryId, data.date) : null;

      let message;
      if (isEdit) {
        Store.updateTransaction(existing.id, data);
        message = "Transaction updated.";
      } else {
        const tx = Store.addTransaction(data);
        if (repeatSelect.value) Store.addRecurring(tx, repeatSelect.value);
        message = repeatSelect.value ? "Repeating transaction added." : "Transaction added.";
      }
      const alert = data.type === "expense" ? budgetAlert(budgetBefore, budgetFor(data.categoryId, data.date), data.date) : "";
      toast(alert ? `${message} ${alert}` : message, alert ? { duration: 9000 } : {});
      close();
    });

    function remove() {
      const removed = Store.deleteTransaction(existing.id);
      close();
      toast("Transaction deleted", { actionLabel: "Undo", onAction: () => Store.restoreTransaction(removed) });
    }

    function duplicate() {
      close();
      const { id, recurringId, ...copy } = existing;
      openTransactionForm(null, { ...copy, date: Utils.todayStr(), tags: [...existing.tags] });
    }
  }

  return { openModal, confirm, toast, field, select, segmented, emptyState, card, meter, statusBadge, statTile, transactionRow, openTransactionForm };
})();
