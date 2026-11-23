# ADR 0002: Build with plain HTML, CSS and JavaScript (no framework)

## Status

Accepted. This is how the Finance Tracker is built today.

## Context

Every website is made of three languages: **HTML** (the content), **CSS** (the look) and **JavaScript** (what happens when you click). Many websites also use a **framework**: ready-made code written by someone else, such as **React** (made by Meta). A framework does a lot of work for you, but you have to install it and learn its way of doing things.

The Finance Tracker has grown from a single list into six pages (Home, Transactions, Budgets, Goals, Reports and Settings) with charts, a PIN lock and savings goals. The hardest job in an app like this is **keeping the screen in step with the data**: when you add a $40 expense, the list, the monthly totals, the budget bars and the charts all have to change.

There were two main ways to do this:

- **Use a framework like React:** it updates the screen automatically when data changes. But it needs extra tools to be installed and a **build step** (a program that turns your code into the files the browser runs) before the website works. An earlier draft of ADR 0001 proposed React; it was set aside.
- **Use plain HTML, CSS and JavaScript:** nothing to install. The browser runs the files exactly as they are written.

This is the owner's first coding project, so being able to open any file and understand it mattered a lot.

## Decision

We build the website with **plain HTML, CSS and JavaScript only**: no framework, no build step, no outside libraries and no `package.json`.

To keep it simple and still tidy:

- The code is split into files with one job each (`store.js` keeps the data, `charts.js` draws charts, one file per page in `views/`, and so on).
- The files are loaded as **classic scripts** in a fixed order in `index.html`, so the website even works when `index.html` is opened straight from your computer (`file://`).
- Instead of updating bits of the screen, the app **redraws the whole current page** every time data changes. This is simple and hard to get wrong.
- Screen elements are built with a small helper, `Utils.h()`, which puts text in safely (so typed text can never be run as code).

## Consequences

**Good:**
- **Nothing to install:** open `index.html` and it works, on any computer.
- **Easy to read:** what you see in the file is exactly what the browser runs.
- **Fast and small:** no extra code to download.
- **Works with GitHub Pages as-is** (see ADR 0005): no build step needed before publishing.
- **Safe by default:** one helper builds the screen, so it's easy to check that user text is never treated as code.

**Bad:**
- **More code written by hand:** things React would do for us (like updating the screen) we wrote ourselves.
- **Load order matters:** a file can only use code from files loaded above it in `index.html`. Getting the order wrong breaks the website.
- **Redrawing the whole page** is a little wasteful. It's fast enough for this app, but one exception was needed: the Transactions page redraws only its list while you type in the filters, so the text box doesn't lose your typing.
- **Fewer ready-made solutions:** with a popular framework, there are many examples and add-ons to copy from.
