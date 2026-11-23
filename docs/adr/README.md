# Architecture Decision Records (ADRs)

An **ADR** is a short note that records **one important decision** about how this project is built: what we decided, why, and what's good and bad about it. Each one has the same four parts: **Status**, **Context** (the problem and the options), **Decision** and **Consequences**.

They're numbered in the order they were written. If a decision changes, a new ADR replaces the old one, and the old one is marked as replaced rather than deleted.

| No. | Decision | In one sentence |
|-----|----------|-----------------|
| [0001](0001-store-data-in-the-browser.md) | Store all data in the user's own browser | Your money data never leaves your device |
| [0002](0002-plain-html-css-javascript-no-framework.md) | Plain HTML, CSS and JavaScript, no framework | Nothing to install; open `index.html` and it works |
| [0003](0003-hand-drawn-svg-charts.md) | Draw the charts ourselves | No chart library to download; charts match the website and work offline |
| [0004](0004-pin-stored-as-a-scrambled-fingerprint.md) | Optional PIN, stored only as a scrambled fingerprint | The PIN itself is never saved |
| [0005](0005-host-on-github-pages.md) | Publish for free with GitHub Pages | Merging into `main` updates the live website |
| [0006](0006-installable-and-works-offline.md) | Installable and works offline | Add it to your home screen; it opens with no internet |
| [0007](0007-colour-blind-safe-colours.md) | Colour-blind-safe colours, never colour alone | Blue/orange charts; every status has an icon and a word |
| [0008](0008-safety-copy-and-backup-reminder.md) | Safety copy before big changes, and a backup reminder | Big changes can be undone, and you're reminded to back up |
