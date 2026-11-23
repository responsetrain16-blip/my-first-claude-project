// ============================================================
// app.js — starts the app and moves between pages
// ============================================================
"use strict";

const App = (() => {
  const { h, icon } = Utils;

  const NAV = [
    { id: "dashboard", label: "Home", icon: "home" },
    { id: "transactions", label: "Transactions", icon: "list" },
    { id: "budgets", label: "Budgets", icon: "budget" },
    { id: "goals", label: "Goals", icon: "target" },
    { id: "reports", label: "Reports", icon: "chart" },
    { id: "settings", label: "Settings", icon: "settings" },
  ];

  let current = "dashboard";
  let lastWidth = window.innerWidth;

  // ---------- Pages ----------
  function routeFromHash() {
    const id = location.hash.replace(/^#\/?/, "");
    return Views[id] ? id : "dashboard";
  }

  function render() {
    const view = document.getElementById("view");
    const scroll = window.scrollY;
    view.replaceChildren();
    Views[current].render(view);
    window.scrollTo(0, scroll);
  }

  function navigate() {
    const next = routeFromHash();
    const changed = next !== current;
    current = next;
    document.title = `${Views[current].title} · Finance Tracker`;
    document.getElementById("page-title").textContent = Views[current].title;
    document.querySelectorAll("[data-nav]").forEach((link) => {
      if (link.dataset.nav === current) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    render();
    if (changed) {
      window.scrollTo(0, 0);
      document.getElementById("view").focus({ preventScroll: true });
    }
  }

  function buildNav() {
    const link = (item, className) => h("a", { class: className, href: `#/${item.id}`, dataset: { nav: item.id } },
      icon(item.icon, 22), h("span", { text: item.label }));
    document.getElementById("side-nav").replaceChildren(...NAV.map((item) => link(item, "side-link")));
    // The phone navigation bar has room for five; Settings is in the top bar there
    document.getElementById("bottom-nav").replaceChildren(...NAV.slice(0, 5).map((item) => link(item, "bottom-link")));
  }

  // ---------- Theme & privacy ----------
  function applyTheme() {
    const theme = Store.state.settings.theme;
    if (theme === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }

  function setPrivacy(on) {
    if (Store.state.settings.privacy !== on) Store.updateSettings({ privacy: on });
    document.body.classList.toggle("privacy", on);
    const button = document.getElementById("privacy-btn");
    button.replaceChildren(icon(on ? "eyeOff" : "eye"));
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "Show amounts" : "Hide amounts");
    button.title = on ? "Show amounts" : "Hide amounts";
  }

  // After all data is swapped (restore, undo, erase), use its currency, theme and privacy setting.
  function applySettings() {
    Utils.setCurrency(Store.state.settings.currency);
    applyTheme();
    setPrivacy(Store.state.settings.privacy);
  }

  // ---------- Backups & Undo for big changes ----------
  function downloadBackup() {
    Utils.download(`finance-backup-${Utils.todayStr()}.json`, Store.exportData(), "application/json");
    Store.updateSettings({ lastBackupAt: Utils.todayStr(), backupReminderSnoozedUntil: null });
    UI.toast("Backup downloaded. Keep it somewhere safe.");
  }

  // Runs a big change (e.g. restore, demo data, deleting a category or goal).
  // A safety copy is saved first, and the message afterwards offers Undo.
  // If the copy can't be saved, it asks before going ahead.
  async function safely(label, change, doneMessage) {
    const saved = Store.saveSafetyCopy(label);
    if (!saved && !(await UI.confirm({
      title: "Couldn't make a safety copy",
      message: "Your browser storage may be full, so this change can't be undone. If you're not sure, cancel and download a backup first.",
      confirmLabel: "Go ahead anyway", danger: true,
    }))) return;
    change();
    UI.toast(doneMessage, saved ? { actionLabel: "Undo", onAction: undoBigChange, duration: 10000 } : {});
  }

  function undoBigChange() {
    if (!Store.undoBigChange()) return UI.toast("There's nothing to undo.", { tone: "error" });
    applySettings();
    UI.toast("Change undone. Your data is back as it was.");
  }

  function updateLockButton() {
    document.getElementById("lock-btn").hidden = !Security.hasPin();
  }

  // ---------- Start ----------
  function start() {
    Store.load();
    Utils.setCurrency(Store.state.settings.currency);
    applyTheme();
    Store.processRecurring();
    buildNav();

    document.getElementById("add-btn").append(icon("plus", 20), h("span", { text: "Add transaction" }));
    document.getElementById("fab").append(icon("plus", 26));
    document.getElementById("lock-btn").append(icon("lock"));
    document.getElementById("settings-btn").append(icon("settings"));
    for (const id of ["add-btn", "fab"]) document.getElementById(id).addEventListener("click", () => UI.openTransactionForm());

    // On phones, tuck the "+" button away while scrolling down so it doesn't
    // cover amounts, and bring it back when scrolling up.
    let lastScroll = window.scrollY;
    window.addEventListener("scroll", () => {
      const now = window.scrollY;
      document.getElementById("fab").classList.toggle("is-hidden", now > lastScroll && now > 80);
      lastScroll = now;
    }, { passive: true });
    document.getElementById("lock-btn").addEventListener("click", Security.lock);
    document.getElementById("privacy-btn").addEventListener("click", () => setPrivacy(!Store.state.settings.privacy));
    setPrivacy(Store.state.settings.privacy);
    updateLockButton();

    // Redraw the page whenever data changes
    Store.subscribe(() => {
      updateLockButton();
      if (!Security.isLocked()) render();
    });

    window.addEventListener("hashchange", navigate);

    // Charts are sized to the screen, so redraw when the width changes
    window.addEventListener("resize", Utils.debounce(() => {
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
        render();
      }
    }, 200));

    // When you come back to the app on a new day, add any repeating transactions that are now due
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) Store.processRecurring();
    });

    // Keyboard shortcuts: N = new transaction, / = search
    document.addEventListener("keydown", (e) => {
      if (Security.isLocked() || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector("dialog[open]") || e.target.closest("input, textarea, select")) return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        UI.openTransactionForm();
      } else if (e.key === "/") {
        e.preventDefault();
        if (current !== "transactions") location.hash = "#/transactions";
        setTimeout(() => Views.transactions.focusSearch(), 0);
      }
    });

    setUpInstall();
    navigate();
    Security.startAutoLock();

    if (Security.hasPin()) Security.lock();
    else document.getElementById("app").hidden = false;
  }

  // ---------- Installing on a phone or computer ----------
  // The browser offers installing only on https or localhost, not when
  // index.html is opened straight from your computer (file://).
  let installPrompt = null;

  function setUpInstall() {
    if ("serviceWorker" in navigator && window.isSecureContext && location.protocol !== "file:") {
      navigator.serviceWorker.register("sw.js").catch(() => { /* offline support is optional */ });
    }
    // Chrome and Edge tell us when the website can be installed
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      installPrompt = event;
      if (current === "settings") render();
    });
    window.addEventListener("appinstalled", () => {
      installPrompt = null;
      UI.toast("Installed! Look for Finance Tracker on your home screen.");
      if (current === "settings") render();
    });
  }

  function isInstalled() {
    return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  }

  function canInstall() {
    return installPrompt !== null;
  }

  async function install() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    if (current === "settings") render();
  }

  return {
    start, render, applyTheme, setPrivacy, applySettings, isInstalled, canInstall, install,
    downloadBackup, safely, undoBigChange,
  };
})();

document.addEventListener("DOMContentLoaded", App.start);
