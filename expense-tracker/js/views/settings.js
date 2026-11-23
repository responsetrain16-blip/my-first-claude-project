// ============================================================
// Settings — preferences, accounts, categories, security, data
// ============================================================
"use strict";

Views.settings = (() => {
  const { h, money, icon } = Utils;

  const CURRENCIES = [
    ["USD", "US dollar ($)"], ["EUR", "Euro (€)"], ["GBP", "British pound (£)"], ["INR", "Indian rupee (₹)"],
    ["JPY", "Japanese yen (¥)"], ["CNY", "Chinese yuan (¥)"], ["CAD", "Canadian dollar"], ["AUD", "Australian dollar"],
    ["NZD", "New Zealand dollar"], ["CHF", "Swiss franc"], ["SEK", "Swedish krona"], ["NOK", "Norwegian krone"],
    ["DKK", "Danish krone"], ["PLN", "Polish złoty"], ["BRL", "Brazilian real"], ["MXN", "Mexican peso"],
    ["ZAR", "South African rand"], ["NGN", "Nigerian naira"], ["KES", "Kenyan shilling"], ["AED", "UAE dirham"],
    ["SAR", "Saudi riyal"], ["SGD", "Singapore dollar"], ["HKD", "Hong Kong dollar"], ["KRW", "South Korean won"],
    ["PHP", "Philippine peso"], ["IDR", "Indonesian rupiah"], ["MYR", "Malaysian ringgit"], ["THB", "Thai baht"],
    ["VND", "Vietnamese dong"], ["PKR", "Pakistani rupee"], ["BDT", "Bangladeshi taka"], ["TRY", "Turkish lira"],
  ];
  const CATEGORY_ICONS = ["🍔", "🛒", "🚌", "🚗", "⛽", "🏠", "💡", "📱", "🛍️", "🎬", "🎮", "💊", "🏋️", "📚", "✈️", "💇", "🎁", "🐶", "👶", "☕", "🍺", "🧾", "💼", "💻", "🏪", "📈", "💰", "↩️", "🏦", "📦"];

  // ---------- Accounts ----------
  function openAccountForm(account = null) {
    const name = h("input", { type: "text", maxlength: 40, value: account?.name || "", placeholder: "e.g. Everyday bank" });
    const type = UI.select(Object.entries(Store.ACCOUNT_TYPES).map(([k, v]) => [k, `${v.icon} ${v.label}`]), account?.type || "bank");
    const opening = h("input", { type: "text", inputmode: "decimal", value: account ? String(account.openingBalance) : "", placeholder: "0.00" });
    const error = h("p", { class: "form-error", role: "alert", hidden: true });
    const save = h("button", { class: "btn btn-primary", type: "submit", text: account ? "Save" : "Add account" });
    const cancel = h("button", { class: "btn btn-ghost", type: "button", text: "Cancel" });
    const remove = account ? h("button", { class: "btn btn-ghost danger-text", type: "button" }, icon("trash", 16), "Delete") : h("div");
    const form = h("form", { novalidate: true },
      UI.field("Name", name), UI.field("Type", type),
      UI.field("Starting balance", opening, "How much was in this account before you started tracking. Use a minus sign for money owed, e.g. on a credit card."),
      error, h("div", { class: "form-footer" }, remove, h("div", { class: "footer-right" }, cancel, save)));
    const { close } = UI.openModal({ title: account ? "Edit account" : "New account", body: form, size: "modal-small" });
    cancel.addEventListener("click", close);
    name.focus();

    remove.addEventListener?.("click", async () => {
      if (!account) return;
      close();
      if (!(await UI.confirm({ title: "Delete account?", message: `Delete "${account.name}"?`, confirmLabel: "Delete", danger: true }))) return;
      const problem = Store.deleteAccount(account.id);
      UI.toast(problem || "Account deleted", { tone: problem ? "error" : "" });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const balance = opening.value.trim() ? Utils.parseAmount(opening.value.replace("−", "-")) : 0;
      const fail = (msg) => { error.textContent = msg; error.hidden = false; };
      if (!name.value.trim()) return fail("Please enter a name.");
      if (!Number.isFinite(balance)) return fail("Please enter a valid starting balance.");
      Store.saveAccount({ id: account?.id, name: name.value.trim(), type: type.value, openingBalance: balance });
      close();
      UI.toast(account ? "Account updated" : "Account added");
    });
  }

  // ---------- Categories ----------
  function openCategoryForm(category = null, presetType = "expense") {
    let chosenIcon = category?.icon || CATEGORY_ICONS[0];
    let chosenType = category?.type || presetType;
    const name = h("input", { type: "text", maxlength: 40, value: category?.name || "", placeholder: "e.g. Pets" });
    const icons = h("div", { class: "chip-grid icon-grid", role: "radiogroup", "aria-label": "Icon" }, CATEGORY_ICONS.map((emoji) =>
      h("label", { class: "chip icon-chip" },
        h("input", { type: "radio", name: "cat-icon", value: emoji, checked: emoji === chosenIcon, onChange: () => { chosenIcon = emoji; } }),
        h("span", { text: emoji }))));
    const error = h("p", { class: "form-error", role: "alert", hidden: true });
    const save = h("button", { class: "btn btn-primary", type: "submit", text: category ? "Save" : "Add category" });
    const cancel = h("button", { class: "btn btn-ghost", type: "button", text: "Cancel" });
    const canDelete = category && !category.system;
    const remove = canDelete ? h("button", { class: "btn btn-ghost danger-text", type: "button" }, icon("trash", 16), "Delete") : h("div");

    const form = h("form", { novalidate: true },
      category ? null : h("div", { class: "field" }, h("span", { class: "field-label", text: "Type" }),
        UI.segmented("cat-type", [["expense", "Expense"], ["income", "Income"]], chosenType, (v) => { chosenType = v; })),
      UI.field("Name", name),
      h("div", { class: "field" }, h("span", { class: "field-label", text: "Icon" }), icons),
      error, h("div", { class: "form-footer" }, remove, h("div", { class: "footer-right" }, cancel, save)));
    const { close } = UI.openModal({ title: category ? "Edit category" : "New category", body: form });
    cancel.addEventListener("click", close);
    name.focus();

    if (canDelete) {
      remove.addEventListener("click", async () => {
        close();
        const count = Store.state.transactions.filter((t) => t.categoryId === category.id).length;
        const message = count
          ? `Its ${count} transaction${count === 1 ? "" : "s"} will move to "Other", and any budget for it will be removed.`
          : "This category isn't used by any transactions.";
        if (await UI.confirm({ title: `Delete "${category.name}"?`, message, confirmLabel: "Delete", danger: true })) {
          await App.safely(`Delete category “${category.name}”`, () => Store.deleteCategory(category.id), "Category deleted");
        }
      });
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = name.value.trim();
      if (!value) {
        error.textContent = "Please enter a name.";
        error.hidden = false;
        return;
      }
      const duplicate = Store.categoriesOf(chosenType).some((c) => c.name.toLowerCase() === value.toLowerCase() && c.id !== category?.id);
      if (duplicate) {
        error.textContent = "A category with that name already exists.";
        error.hidden = false;
        return;
      }
      Store.saveCategory({ id: category?.id, type: chosenType, name: value, icon: chosenIcon });
      close();
      UI.toast(category ? "Category updated" : "Category added");
    });
  }

  // ---------- Data: backup & restore ----------
  function restore() {
    const input = h("input", { type: "file", accept: ".json,application/json" });
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      if (file.size > 20 * 1024 * 1024) return UI.toast("That file is too large to be a backup.", { tone: "error" });
      const ok = await UI.confirm({
        title: "Restore from backup?",
        message: "This replaces ALL data in the app with the data from the backup file. Your current PIN stays the same.",
        confirmLabel: "Replace my data", danger: true,
      });
      if (!ok) return;
      // Check the file first, so a bad file doesn't replace the safety copy
      let text;
      try {
        text = await file.text();
        Store.parseBackup(text);
      } catch (err) {
        return UI.toast(err instanceof SyntaxError ? "That file isn't a valid backup." : err.message, { tone: "error" });
      }
      await App.safely("Restore backup", () => {
        Store.importData(text);
        App.applySettings();
      }, "Backup restored");
    });
    input.click();
  }

  // ---------- The page ----------
  function render(root) {
    const { state } = Store;
    const s = state.settings;

    const row = (label, description, control) => h("div", { class: "setting-row" },
      h("div", null, h("div", { class: "setting-label", text: label }), description ? h("div", { class: "muted small", text: description }) : null),
      h("div", { class: "setting-control" }, control));

    // Preferences
    const currency = UI.select(CURRENCIES.some(([c]) => c === s.currency) ? CURRENCIES : [[s.currency, s.currency], ...CURRENCIES], s.currency, { "aria-label": "Currency" });
    currency.addEventListener("change", () => {
      Utils.setCurrency(currency.value);
      Store.updateSettings({ currency: currency.value });
      UI.toast("Currency updated");
    });
    const theme = UI.segmented("theme", [["system", "Auto"], ["light", "Light"], ["dark", "Dark"]], s.theme, (value) => {
      Store.updateSettings({ theme: value });
      App.applyTheme();
    });

    root.append(UI.card("Preferences", {},
      row("Currency", "Used to show all amounts. Changing it doesn't convert existing amounts.", currency),
      row("Appearance", "Auto follows your device's light or dark setting.", theme),
      row("Hide amounts", "Blurs numbers on screen, for using the app in public.",
        h("label", { class: "switch" },
          h("input", { type: "checkbox", role: "switch", checked: s.privacy, "aria-label": "Hide amounts", onChange: (e) => App.setPrivacy(e.target.checked) }),
          h("span", { class: "switch-track" })))));

    // Install on this device
    let installControl;
    let installHelp;
    if (App.isInstalled()) {
      installHelp = "Finance Tracker is installed. It opens from your home screen or app list.";
      installControl = h("span", { class: "badge badge-done" }, icon("check", 14), "Installed");
    } else if (App.canInstall()) {
      installHelp = "Add it to your home screen or computer. It opens in its own window and works without internet.";
      installControl = h("button", { class: "btn btn-primary btn-small", type: "button", onClick: App.install }, icon("download", 16), "Install");
    } else if (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
      installHelp = "In Safari, tap the Share button, then \"Add to Home Screen\".";
    } else {
      installHelp = "Use your browser's menu and choose \"Install\" or \"Add to Home Screen\". (In Safari on a Mac: File → Add to Dock.)";
    }
    root.append(UI.card("Install", {}, row("Install on this device", installHelp, installControl || null)));

    // Security
    const autoLock = UI.select([["1", "After 1 minute"], ["5", "After 5 minutes"], ["15", "After 15 minutes"], ["30", "After 30 minutes"], ["0", "Never"]], String(s.autoLockMinutes), { "aria-label": "Auto-lock" });
    autoLock.addEventListener("change", () => Store.updateSettings({ autoLockMinutes: Number(autoLock.value) }));
    const hasPin = Security.hasPin();
    root.append(UI.card("Privacy & security", {},
      row("PIN lock", hasPin ? "On. The app asks for your PIN when it opens." : "Ask for a PIN when the app opens.",
        h("div", { class: "button-row" },
          h("button", { class: "btn btn-secondary btn-small", type: "button", text: hasPin ? "Change PIN" : "Set PIN", onClick: Security.openPinSetup }),
          hasPin ? h("button", { class: "btn btn-ghost btn-small danger-text", type: "button", text: "Turn off", onClick: async () => {
            if (await UI.confirm({ title: "Turn off PIN lock?", message: "Anyone using this device will be able to open the app.", confirmLabel: "Turn off", danger: true })) {
              Security.removePin();
              UI.toast("PIN lock turned off");
            }
          } }) : null)),
      hasPin ? row("Auto-lock", "Lock the app when it hasn't been used for a while.", autoLock) : null,
      hasPin ? row("Lock now", null, h("button", { class: "btn btn-ghost btn-small", type: "button", onClick: Security.lock }, icon("lock", 16), "Lock")) : null,
      h("p", { class: "muted small privacy-note" },
        "🔒 Your data never leaves this device. It's stored only in this browser — there's no account, no server and no tracking. The PIN keeps others from opening the app; for full protection, also lock your device with a password.")));

    // Accounts
    root.append(UI.card("Accounts", {
      actions: h("button", { class: "btn btn-ghost btn-small", type: "button", onClick: () => openAccountForm() }, icon("plus", 16), "Add"),
    }, h("ul", { class: "manage-list" }, state.accounts.map((a) => h("li", null,
      h("button", { class: "manage-row", type: "button", onClick: () => openAccountForm(a) },
        h("span", { class: "tx-icon", "aria-hidden": "true", text: Store.ACCOUNT_TYPES[a.type].icon }),
        h("span", { class: "manage-main" }, h("span", { text: a.name }), h("span", { class: "muted small", text: Store.ACCOUNT_TYPES[a.type].label })),
        money(Finance.accountBalance(a)),
        icon("right", 16)))))));

    // Categories
    const categoryList = (type) => h("div", { class: "category-chips" }, Store.categoriesOf(type).map((c) =>
      h("button", { class: "chip-button", type: "button", onClick: () => openCategoryForm(c) },
        h("span", { "aria-hidden": "true", text: c.icon }), c.name)));
    root.append(UI.card("Categories", {
      actions: h("button", { class: "btn btn-ghost btn-small", type: "button", onClick: () => openCategoryForm() }, icon("plus", 16), "Add"),
    },
      h("h3", { class: "section-title", text: "Expenses" }), categoryList("expense"),
      h("h3", { class: "section-title", text: "Income" }), categoryList("income")));

    // Repeating transactions
    root.append(UI.card("Repeating transactions", { subtitle: "Added automatically when they're due" },
      state.recurring.length
        ? h("ul", { class: "manage-list" }, state.recurring.map((r) => {
            const t = r.template;
            const name = t.description || Store.getCategory(t.categoryId)?.name || "Transfer";
            const freq = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" }[r.frequency];
            return h("li", { class: "manage-row static" },
              h("span", { class: "tx-icon", "aria-hidden": "true" }, icon("repeat", 18)),
              h("span", { class: "manage-main" }, h("span", { text: name }),
                h("span", { class: "muted small", text: `${freq} · next on ${Utils.formatDate(r.nextDate)}` })),
              money(t.type === "expense" ? -t.amount : t.amount),
              h("button", { class: "btn btn-ghost btn-small danger-text", type: "button", text: "Stop", onClick: async () => {
                if (await UI.confirm({ title: "Stop repeating?", message: `"${name}" won't be added again. Transactions already added stay.`, confirmLabel: "Stop" })) {
                  Store.deleteRecurring(r.id);
                  UI.toast("Repeating transaction stopped");
                }
              } }));
          }))
        : h("p", { class: "muted", text: "None yet. When adding a transaction, open \"Notes, tags & repeat\" to make it repeat." })));

    // Data
    const lastBackup = s.lastBackupAt ? `Last backup: ${Utils.formatDate(s.lastBackupAt)}.` : "You haven't downloaded a backup yet.";
    const safetyCopy = Store.safetyCopyInfo();
    const takenAt = safetyCopy && new Date(safetyCopy.takenAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    root.append(UI.card("Your data", {},
      row("Back up", `Download all your data as a file. Do this regularly! ${lastBackup}`,
        h("button", { class: "btn btn-secondary btn-small", type: "button", onClick: App.downloadBackup }, icon("download", 16), "Download backup")),
      row("Restore", "Load data from a backup file.",
        h("button", { class: "btn btn-ghost btn-small", type: "button", onClick: restore }, icon("upload", 16), "Restore")),
      safetyCopy ? row("Undo last big change", `${safetyCopy.label} (${takenAt}). A copy of your data from just before it was kept.`,
        h("button", { class: "btn btn-ghost btn-small", type: "button", text: "Undo", onClick: async () => {
          if (await UI.confirm({
            title: "Undo last big change?",
            message: `Your data goes back to how it was just before this change: ${safetyCopy.label} (${takenAt}). Anything you added or changed since then will be lost.`,
            confirmLabel: "Undo it", danger: true,
          })) App.undoBigChange();
        } })) : null,
      row("Demo data", "Replace everything with example data to try the app.",
        h("button", { class: "btn btn-ghost btn-small", type: "button", text: "Load demo", onClick: async () => {
          if (await UI.confirm({ title: "Load demo data?", message: "This replaces all your current data with example data. You can undo it afterwards.", confirmLabel: "Load demo data", danger: state.transactions.length > 0 })) {
            await App.safely("Load demo data", () => Store.loadDemoData(), "Demo data loaded");
          }
        } })),
      row("Erase everything", "Delete all transactions, budgets, goals and settings on this device.",
        h("button", { class: "btn btn-danger btn-small", type: "button", text: "Erase all", onClick: async () => {
          if (await UI.confirm({ title: "Erase all data?", message: "Everything will be deleted from this device. You'll have 10 seconds to undo; after that it's permanent. Download a backup first if you might want it back.", confirmLabel: "Erase everything", danger: true })) {
            // The undo copy is kept only in memory, never saved (see Store.resetAll)
            const undo = Store.resetAll({ allowUndo: true });
            App.applySettings();
            UI.toast("All data erased", { actionLabel: "Undo", duration: 10000, onAction: () => {
              undo();
              App.applySettings();
              UI.toast("Your data is back.");
            } });
          }
        } }))));

    root.append(h("p", { class: "muted small about", text: "Finance Tracker · Made with Claude Code · Keyboard shortcuts: N = new transaction, / = search" }));
  }

  return { title: "Settings", render };
})();
