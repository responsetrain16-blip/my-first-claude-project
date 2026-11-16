// ============================================================
// sw.js — the "service worker": a small helper the browser runs
// in the background so the website opens even with no internet.
//
// It keeps a copy of the website's files (not your data — that's
// in localStorage) and uses them when you're offline.
// ============================================================
"use strict";

// Change this name whenever the list below changes, so old copies are cleared out
const CACHE = "finance-tracker-v1";

const FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/styles.css",
  "js/utils.js",
  "js/store.js",
  "js/charts.js",
  "js/ui.js",
  "js/security.js",
  "js/views/dashboard.js",
  "js/views/transactions.js",
  "js/views/budgets.js",
  "js/views/goals.js",
  "js/views/reports.js",
  "js/views/settings.js",
  "js/app.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
];

// First visit: save a copy of every file
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

// Remove copies saved by older versions
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()));
});

// Every request: try the internet first so you always get the newest version,
// and fall back to the saved copy when you're offline.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })
        .then((saved) => saved || (request.mode === "navigate" ? caches.match("index.html") : undefined))
        .then((saved) => saved || Response.error())));
});
