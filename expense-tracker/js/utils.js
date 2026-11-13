// ============================================================
// utils.js — small helper functions used all over the app
// ============================================================
"use strict";

const Utils = (() => {
  // ---------- Building page elements ----------
  // h("div", { class: "card" }, "Hello") creates <div class="card">Hello</div>.
  // Text is always inserted as plain text (never as HTML), which keeps the
  // app safe from anyone sneaking code into a description or note.
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    appendChildren(el, children);
    applyProps(el, props);
    return el;
  }

  // Same idea for SVG (used for icons and charts)
  function svg(tag, props, ...children) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    appendChildren(el, children);
    applyProps(el, props, true);
    return el;
  }

  function applyProps(el, props, isSvg = false) {
    if (!props) return;
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === "class") el.setAttribute("class", value);
      else if (key === "text") el.textContent = value;
      else if (key === "style") Object.assign(el.style, value);
      else if (key === "dataset") Object.assign(el.dataset, value);
      else if (key.startsWith("on") && typeof value === "function") {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (!isSvg && ["value", "checked", "selected", "disabled", "hidden", "required"].includes(key)) {
        el[key] = value;
      } else {
        el.setAttribute(key, value === true ? "" : value);
      }
    }
  }

  function appendChildren(el, children) {
    for (const child of children.flat(Infinity)) {
      if (child === null || child === undefined || child === false) continue;
      el.append(child instanceof Node ? child : String(child));
    }
  }

  // ---------- Icons (simple line drawings, 24×24) ----------
  const ICONS = {
    home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
    list: "M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01",
    budget: "M21 12A9 9 0 1 1 12 3v9zM15 3.5A9 9 0 0 1 20.5 9H15z",
    target: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 12h.01",
    chart: "M3 20h18M6 16v-5M11 16V6M16 16v-8",
    settings: "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM9 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    plus: "M12 5v14M5 12h14",
    lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
    search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
    x: "M6 6l12 12M18 6 6 18",
    trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
    edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
    copy: "M9 9h11v11H9zM5 15H4V4h11v1",
    repeat: "M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3",
    up: "M12 19V5M5 12l7-7 7 7",
    down: "M12 5v14M19 12l-7 7-7-7",
    wallet: "M3 7h15a3 3 0 0 1 3 3v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l12-4v4M16 14h.01",
    check: "M5 12l5 5 9-10",
    alert: "M12 9v4M12 17h.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z",
    download: "M12 3v12M7 10l5 5 5-5M5 21h14",
    upload: "M12 15V3M7 8l5-5 5 5M5 21h14",
    left: "M15 18l-6-6 6-6",
    right: "M9 18l6-6-6-6",
    table: "M3 5h18v14H3zM3 10h18M9 10v9",
    transfer: "M7 7h13l-4-4M17 17H4l4 4",
    eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
    eyeOff: "M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2",
  };

  function icon(name, size = 20) {
    return svg("svg", {
      class: "icon", width: size, height: size, viewBox: "0 0 24 24", fill: "none",
      stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round",
      "stroke-linejoin": "round", "aria-hidden": "true", focusable: "false",
    }, svg("path", { d: ICONS[name] || "" }));
  }

  // ---------- Dates ----------
  // Dates are stored as text like "2026-11-13" so they never shift between time zones.
  const pad = (n) => String(n).padStart(2, "0");

  function toDateStr(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  function todayStr() {
    return toDateStr(new Date());
  }
  function parseDate(str) {
    const [y, m, d] = str.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  function isDateStr(str) {
    return typeof str === "string" && /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(parseDate(str));
  }
  function addDays(str, days) {
    const d = parseDate(str);
    d.setDate(d.getDate() + days);
    return toDateStr(d);
  }
  function daysInMonth(year, month) {
    // month is 1–12
    return new Date(year, month, 0).getDate();
  }
  function daysBetween(fromStr, toStr) {
    return Math.round((parseDate(toStr) - parseDate(fromStr)) / 86400000);
  }

  // "2026-11-13" → "2026-11"
  const monthKey = (str) => str.slice(0, 7);
  const currentMonthKey = () => monthKey(todayStr());

  function addMonthsToKey(key, n) {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }
  function monthRange(key) {
    const [y, m] = key.split("-").map(Number);
    return { from: `${key}-01`, to: `${key}-${pad(daysInMonth(y, m))}` };
  }
  function monthKeysBetween(fromKey, toKey) {
    const keys = [];
    for (let k = fromKey; k <= toKey; k = addMonthsToKey(k, 1)) keys.push(k);
    return keys;
  }
  function monthLabel(key, style = "long") {
    const [y, m] = key.split("-").map(Number);
    const opts = style === "short" ? { month: "short" } : { month: "long", year: "numeric" };
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, opts);
  }

  function formatDate(str, style = "medium") {
    if (!str) return "";
    if (style === "relative") {
      const diff = daysBetween(todayStr(), str);
      if (diff === 0) return "Today";
      if (diff === -1) return "Yesterday";
      if (diff === 1) return "Tomorrow";
    }
    const d = parseDate(str);
    const sameYear = d.getFullYear() === new Date().getFullYear();
    const opts = style === "long"
      ? { weekday: "long", day: "numeric", month: "long", year: sameYear ? undefined : "numeric" }
      : { day: "numeric", month: "short", year: sameYear ? undefined : "numeric" };
    return d.toLocaleDateString(undefined, opts);
  }

  // Moves a date forward by one week, month or year.
  // anchorDay keeps "the 31st" meaning "the last day" in shorter months.
  function nextOccurrence(str, frequency, anchorDay) {
    const d = parseDate(str);
    if (frequency === "daily") return addDays(str, 1);
    if (frequency === "weekly") return addDays(str, 7);
    const year = d.getFullYear() + (frequency === "yearly" ? 1 : 0);
    let month = d.getMonth() + 1 + (frequency === "monthly" ? 1 : 0);
    const finalYear = year + (month > 12 ? 1 : 0);
    if (month > 12) month = 1;
    const day = Math.min(anchorDay || d.getDate(), daysInMonth(finalYear, month));
    return `${finalYear}-${pad(month)}-${pad(day)}`;
  }

  // ---------- Money ----------
  let currency = "USD";
  const formatters = new Map();

  function setCurrency(code) {
    currency = code || "USD";
    formatters.clear();
  }

  // style: "standard" ($1,234.50), "whole" ($1,235) or "compact" ($1.2K)
  function formatter(style) {
    const key = currency + "-" + style;
    if (!formatters.has(key)) {
      const options = {
        standard: {},
        whole: { minimumFractionDigits: 0, maximumFractionDigits: 0 },
        compact: { notation: "compact", maximumFractionDigits: 1 },
      }[style];
      try {
        formatters.set(key, new Intl.NumberFormat(undefined, { style: "currency", currency, ...options }));
      } catch {
        formatters.set(key, new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      }
    }
    return formatters.get(key);
  }

  // formatMoney(1234.5) → "$1,234.50"; with { sign: true } → "+$1,234.50"
  // { compact: true } shortens big numbers ($12.5K), "always" shortens every number;
  // { whole: true } drops the cents
  function formatMoney(amount, { compact = false, whole = false, sign = false } = {}) {
    const value = Math.abs(amount) < 0.005 ? 0 : amount;
    const style = compact === "always" || (compact && Math.abs(value) >= 10000) ? "compact" : whole || compact ? "whole" : "standard";
    const text = formatter(style).format(Math.abs(value));
    if (value < 0) return "−" + text;
    if (sign && value > 0) return "+" + text;
    return text;
  }

  // Same as formatMoney, but wrapped in a <span class="money"> so the
  // "hide amounts" privacy switch can blur it.
  function money(amount, options) {
    return h("span", { class: "money", text: formatMoney(amount, options) });
  }

  function parseAmount(text) {
    if (typeof text === "number") return text;
    const cleaned = String(text).trim().replace(/[^\d.,-]/g, "").replace(",", ".");
    const value = Number(cleaned);
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : NaN;
  }

  // ---------- Other helpers ----------
  function uid() {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  const sum = (list, pick = (x) => x) => list.reduce((total, item) => total + pick(item), 0);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

  function percent(part, whole) {
    if (!whole) return "0%";
    return Math.round((part / whole) * 100) + "%";
  }

  function debounce(fn, wait = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  }

  // Turns a value into a safe spreadsheet cell. Cells starting with = + - @
  // are prefixed with ' so spreadsheet apps never run them as formulas.
  function csvCell(value) {
    let text = String(value ?? "");
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = "'" + text;
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function download(filename, content, type = "text/plain") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = h("a", { href: url, download: filename });
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return {
    h, svg, icon,
    toDateStr, todayStr, parseDate, isDateStr, addDays, daysInMonth, daysBetween,
    monthKey, currentMonthKey, addMonthsToKey, monthRange, monthKeysBetween, monthLabel,
    formatDate, nextOccurrence,
    setCurrency, formatMoney, money, parseAmount,
    uid, sum, clamp, percent, debounce, csvCell, download,
  };
})();
