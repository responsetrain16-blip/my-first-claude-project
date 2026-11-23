# ADR 0006: Make the website installable and usable offline

## Status

Accepted. This is how the Finance Tracker works today.

## Context

People record spending on the go: in a shop, on a bus, sometimes with no internet. A normal website won't open without a connection, and opening a browser and typing an address every time is slow.

A **Progressive Web App (PWA)** is a website that can behave like an app:

- It can be **installed**, getting its own icon on the phone's home screen or the computer's dock, and opening in its own window.
- It can **work offline**, using a background helper called a **service worker** that keeps a copy of the website's files.

The alternative, building real phone apps for the App Store and Google Play, would mean different code for each, developer accounts and app-store reviews.

## Decision

We make the Finance Tracker a **PWA**:

- `manifest.webmanifest` and the `icons/` folder describe the app (name, colours, icons) so it can be installed.
- `sw.js` is the **service worker**. It keeps a copy of the website's files (**not your data**: that's in the browser's storage, see ADR 0001). It's **network-first**: it always tries the internet first, so you get the newest version, and uses the saved copy only when you're offline.
- It only switches on over a secure connection (https or `localhost`), never when `index.html` is opened from a file.
- **Settings → Install** shows an Install button where the browser supports it, or explains how to do it yourself (for example, in Safari: Share → "Add to Home Screen").

## Consequences

**Good:**
- **Works with no internet:** once opened, the app keeps working offline, and your data is always on the device anyway.
- **Feels like an app:** its own icon and window, with no app store needed.
- **One set of code** for phones and computers.
- **Always up to date when online**, thanks to network-first.

**Bad:**
- **An extra list to maintain:** when a file is added or renamed, its name must be added to the `FILES` list in `sw.js` and the cache name changed, or offline use may break.
- **Offline copy can be out of date:** if you only ever open the app offline, you won't get new versions until you're back online.
- **Browsers differ:** some (like Safari on iPhone) don't show an Install button, so people must use the browser's menu instead.
- **A little more to understand:** service workers run in the background, which can be confusing when testing changes.
