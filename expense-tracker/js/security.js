// ============================================================
// security.js — the optional PIN lock
//
// • Your PIN is never saved. Only a scrambled "fingerprint" of it
//   (PBKDF2-SHA-256 with a random salt) is stored, so it can be checked
//   without being readable.
// • The app locks when it opens and after a period of inactivity.
// • Too many wrong tries pause the keypad for a while.
//
// Note: this keeps casual onlookers out. Your data itself lives
// unencrypted in this browser, so also protect your device with
// its own password.
// ============================================================
"use strict";

const Security = (() => {
  const { h, icon } = Utils;
  const ITERATIONS = 150000;
  const MAX_TRIES = 5;

  let locked = false;
  let lastActivity = Date.now();
  let hiddenAt = null;
  let failedTries = 0;
  let pausedUntil = 0;

  const supported = !!(window.crypto && crypto.subtle && window.isSecureContext);

  const toBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
  const fromBase64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

  async function fingerprint(pin, saltBase64) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt: fromBase64(saltBase64), iterations: ITERATIONS }, key, 256);
    return toBase64(bits);
  }

  const hasPin = () => !!Store.state.settings.pinHash;

  async function setPin(pin) {
    const salt = toBase64(crypto.getRandomValues(new Uint8Array(16)));
    const pinHash = await fingerprint(pin, salt);
    Store.updateSettings({ pinHash, pinSalt: salt });
  }

  function removePin() {
    Store.updateSettings({ pinHash: null, pinSalt: null });
  }

  async function checkPin(pin) {
    const { pinHash, pinSalt } = Store.state.settings;
    if (!pinHash || !pinSalt) return true;
    const attempt = await fingerprint(pin, pinSalt);
    // Compare every character, so the time taken doesn't hint at how close a guess was
    let diff = attempt.length ^ pinHash.length;
    for (let i = 0; i < Math.max(attempt.length, pinHash.length); i++) {
      diff |= (attempt.charCodeAt(i) || 0) ^ (pinHash.charCodeAt(i) || 0);
    }
    return diff === 0;
  }

  // ---------- Locking and unlocking ----------

  function lock() {
    if (!hasPin() || locked) return;
    locked = true;
    // Close any open pop-ups so nothing shows above the lock screen
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
    const app = document.getElementById("app");
    app.inert = true;
    app.setAttribute("aria-hidden", "true");
    document.body.classList.add("is-locked");
    renderLockScreen();
  }

  function unlock() {
    locked = false;
    failedTries = 0;
    lastActivity = Date.now();
    const app = document.getElementById("app");
    app.inert = false;
    app.removeAttribute("aria-hidden");
    app.hidden = false;
    document.body.classList.remove("is-locked");
    const screen = document.getElementById("lock-screen");
    screen.hidden = true;
    screen.replaceChildren();
  }

  const isLocked = () => locked;

  function renderLockScreen() {
    const screen = document.getElementById("lock-screen");
    let entered = "";
    const dots = h("div", { class: "pin-dots", "aria-hidden": "true" });
    const message = h("p", { class: "lock-message", role: "status", "aria-live": "polite" });
    // A real (visually hidden) input, so keyboards and screen readers work too
    const input = h("input", { type: "password", inputmode: "numeric", autocomplete: "off", maxlength: 8, class: "visually-hidden", "aria-label": "PIN" });

    const drawDots = () => {
      dots.replaceChildren(...Array.from({ length: Math.max(4, entered.length) }, (_, i) =>
        h("span", { class: i < entered.length ? "dot filled" : "dot" })));
    };

    async function attempt() {
      if (Date.now() < pausedUntil) return;
      if (entered.length < 4) {
        message.textContent = "Enter your PIN (4–8 digits).";
        return;
      }
      const ok = await checkPin(entered);
      if (ok) return unlock();
      failedTries++;
      entered = "";
      input.value = "";
      drawDots();
      dots.classList.remove("shake");
      void dots.offsetWidth; // restart the shake animation
      dots.classList.add("shake");
      if (failedTries >= MAX_TRIES) {
        pausedUntil = Date.now() + 30000;
        failedTries = 0;
        countdown();
      } else {
        message.textContent = `Wrong PIN. ${MAX_TRIES - failedTries} ${MAX_TRIES - failedTries === 1 ? "try" : "tries"} left before a short pause.`;
      }
    }

    function countdown() {
      const left = Math.ceil((pausedUntil - Date.now()) / 1000);
      if (left <= 0) {
        message.textContent = "You can try again now.";
        return;
      }
      message.textContent = `Too many wrong tries. Try again in ${left}s.`;
      setTimeout(countdown, 1000);
    }

    function press(key) {
      if (Date.now() < pausedUntil) return;
      if (key === "back") entered = entered.slice(0, -1);
      else if (key === "ok") return attempt();
      else if (entered.length < 8) entered += key;
      input.value = entered;
      drawDots();
      message.textContent = "";
    }

    input.addEventListener("input", () => {
      entered = input.value.replace(/\D/g, "").slice(0, 8);
      input.value = entered;
      drawDots();
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") attempt(); });

    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "ok"];
    const keypad = h("div", { class: "keypad" }, keys.map((k) =>
      h("button", {
        type: "button", class: `key ${k === "ok" ? "key-ok" : ""}`,
        "aria-label": k === "back" ? "Delete digit" : k === "ok" ? "Unlock" : k,
        onClick: () => { press(k); input.focus({ preventScroll: true }); },
      }, k === "back" ? icon("left", 22) : k === "ok" ? icon("check", 22) : k)));

    const forgot = h("button", { class: "btn btn-ghost btn-small", type: "button", text: "Forgot PIN?", onClick: forgotPin });

    screen.replaceChildren(h("div", { class: "lock-box" },
      h("div", { class: "lock-icon" }, icon("lock", 28)),
      h("h1", { text: "Finance Tracker is locked" }),
      h("p", { class: "lock-sub", text: "Enter your PIN to continue" }),
      input, dots, message, keypad, forgot));
    screen.hidden = false;
    drawDots();
    input.focus();
  }

  // Without the PIN, the only way back in is to start fresh.
  function forgotPin() {
    const screen = document.getElementById("lock-screen");
    const keepBox = screen.firstChild;
    const box = h("div", { class: "lock-box" },
      h("h1", { text: "Forgot your PIN?" }),
      h("p", { class: "lock-sub", text: "For your privacy, the PIN can't be recovered. You can erase everything on this device and start again. If you have a backup file, you can restore it afterwards in Settings." }),
      h("div", { class: "lock-actions" },
        h("button", { class: "btn btn-ghost", type: "button", text: "Go back", onClick: () => screen.replaceChildren(keepBox) }),
        h("button", { class: "btn btn-danger", type: "button", text: "Erase all data", onClick: () => {
          Store.resetAll();
          unlock();
          UI.toast("All data erased. You're starting fresh.");
        } })));
    screen.replaceChildren(box);
  }

  // ---------- Auto-lock after inactivity ----------
  function startAutoLock() {
    const markActive = () => { lastActivity = Date.now(); };
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach((type) =>
      window.addEventListener(type, markActive, { passive: true, capture: true }));

    const idleTooLong = (since) => {
      const minutes = Store.state.settings.autoLockMinutes;
      return minutes > 0 && Date.now() - since >= minutes * 60000;
    };

    setInterval(() => { if (!locked && idleTooLong(lastActivity)) lock(); }, 10000);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && !locked && idleTooLong(hiddenAt)) lock();
    });
  }

  // ---------- "Set PIN" window (used from Settings) ----------
  function openPinSetup() {
    if (!supported) {
      UI.toast("PIN lock needs a secure (https) page. Open the app from its GitHub Pages address to use it.", { tone: "error", duration: 7000 });
      return;
    }
    const pin1 = h("input", { type: "password", inputmode: "numeric", autocomplete: "new-password", maxlength: 8, pattern: "\\d*" });
    const pin2 = h("input", { type: "password", inputmode: "numeric", autocomplete: "new-password", maxlength: 8, pattern: "\\d*" });
    const error = h("p", { class: "form-error", role: "alert", hidden: true });
    const save = h("button", { class: "btn btn-primary", type: "submit", text: "Save PIN" });
    const cancel = h("button", { class: "btn btn-ghost", type: "button", text: "Cancel" });
    const form = h("form", { novalidate: true },
      h("p", { class: "muted", text: "Choose a 4 to 8 digit PIN. You'll need it each time you open the app." }),
      UI.field("New PIN", pin1),
      UI.field("Repeat PIN", pin2),
      error,
      h("div", { class: "form-footer" }, h("div"), h("div", { class: "footer-right" }, cancel, save)));
    const { close } = UI.openModal({ title: hasPin() ? "Change PIN" : "Set a PIN", body: form, size: "modal-small" });
    cancel.addEventListener("click", close);
    pin1.focus();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fail = (msg) => { error.textContent = msg; error.hidden = false; };
      if (!/^\d{4,8}$/.test(pin1.value)) return fail("The PIN must be 4 to 8 digits.");
      if (pin1.value !== pin2.value) return fail("The two PINs don't match.");
      if (/^(\d)\1+$/.test(pin1.value) || "0123456789".includes(pin1.value) || "9876543210".includes(pin1.value)) {
        return fail("That PIN is too easy to guess. Try a less obvious one.");
      }
      save.disabled = true;
      await setPin(pin1.value);
      close();
      UI.toast("PIN saved. The app will ask for it when it opens.");
    });
  }

  return { supported, hasPin, setPin, removePin, lock, unlock, isLocked, startAutoLock, openPinSetup };
})();
