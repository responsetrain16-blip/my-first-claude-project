# ADR 0001: Use React to build the frontend of the Expense Tracker

- **Status:** Proposed
- **Date:** 2026-11-16

> **What is an ADR?** ADR stands for *Architecture Decision Record*. It's a short note that records an important decision about how a project is built: what we decided, why, and what else we considered. Like keeping the receipt for a big purchase, it helps anyone looking later (including future you) understand *why* things are the way they are.
>
> **What does "Proposed" mean?** This decision has been suggested but not carried out yet. **Today the Expense Tracker is built with plain HTML, CSS and JavaScript, not React.** This document explains why switching to React would be a good idea. If we go ahead and rebuild the app with React, the status will change to "Accepted".

## First, some words we'll use

- **Frontend:** the part of an app you see and click: the buttons, forms, lists and charts. (The opposite, the *backend*, is a computer somewhere else that stores data. Our app doesn't have one: your data stays in your own browser.)
- **HTML, CSS and JavaScript:** the three languages every website is made of. HTML is the *content* (the words "Add transaction"), CSS is the *look* (that button is blue and rounded), and JavaScript is the *behaviour* (clicking it opens the form).
- **React:** a free toolkit made by Meta (the company behind Facebook) that helps people build the frontend of websites. It's written in JavaScript.
- **Framework or library:** ready-made code that someone else wrote and shared, so you don't have to build everything from scratch. React is a *library*; some similar tools call themselves *frameworks*. For this document you can treat the words as meaning the same thing.

## 1. What problem are we trying to solve?

The Expense Tracker started small: one list of transactions. It has grown into a full website with six pages (Home, Transactions, Budgets, Goals, Reports and Settings), charts, a PIN lock, savings goals, repeating payments and more.

As an app grows, the hardest job is **keeping what's on screen in step with your data**.

**A real example from our app:** you add a $40 grocery expense. Straight away, all of these need to change:

- the new transaction appears in the **Transactions** list
- **"Spending this month"** on Home goes up by $40
- the **Groceries budget** bar fills up, and might change from "On track" to "Close to limit"
- your **account balance** goes down by $40
- the **charts** on Reports change

If you then click **Undo**, every one of those has to change back.

Right now, our app handles this simply: after *any* change, it throws away the whole page and redraws it from scratch. That works, but it causes problems as the app grows:

- **Lost focus:** if the page is redrawn while you're typing, the text box you were typing in disappears and you lose your place. Our Transactions page needed a special workaround for exactly this, redrawing only the list while you type in the search box.
- **Wasted effort:** changing one number means rebuilding everything on the page, like reprinting a whole bank statement because one line changed.
- **More code to look after:** our code has its own home-made tools for building page elements and showing pop-ups. Every home-made tool is something we have to fix and maintain ourselves.

## 2. Why do we need React?

React was created to solve exactly this problem.

With React, you describe **what the screen should look like for the data you have**, and React works out **what needs to change** on screen.

**Real-life comparison:** imagine you ask a decorator to redo a room. Our current approach is like emptying the whole room and moving all the furniture back in, just to move one chair. React is like a decorator who compares the room with the plan, notices only the chair is in the wrong place, and moves just that chair.

For our Expense Tracker, that means:

- Adding the $40 grocery expense updates only the parts that changed: one new row, a few numbers and one budget bar. Everything else stays exactly as it was.
- The search box on Transactions keeps your typing without special workarounds.

React also lets us build the screen from **components**. A *component* is a reusable building block, like a LEGO brick. In our app:

- a **transaction row** (icon, description, category, date and amount) appears on both Home and Transactions
- a **budget bar** appears on Home and Budgets
- the **"Add transaction" form** opens from the button, the phone "+" button and the **N** key

Each would be built once as a component and reused everywhere. Fix a mistake in the transaction row once, and it's fixed on every page.

## 3. What other options could we have chosen?

| Option | What it is | In simple terms |
|--------|------------|-----------------|
| **Keep plain HTML, CSS and JavaScript** | What we use today: no extra tools | Cooking everything from scratch with no recipe book |
| **React** | The most widely used frontend library | A very popular recipe book that millions of cooks use |
| **Vue** | A similar library, known for being gentle to learn | Another popular recipe book, with simpler instructions |
| **Svelte** | A newer tool that produces very small, fast websites | A clever recipe book that does lots of prep work for you in advance |
| **Angular** | A large, complete framework made by Google, often used by big companies | A full professional kitchen: everything included, but a lot to learn |

All of these would work. The choice comes down to which one helps *us* most.

## 4. Why is React a good choice?

- **It's the most popular.** More people use React than any other option. That means more tutorials, videos, courses and answers online when you're stuck, and more people who can review or help with our project.
- **It's great for learning.** This is a learning project. React skills are asked for in a very large number of web developer jobs, so time spent on React carries over to other projects and careers.
- **AI help is strong.** Because so much React code exists, tools like Claude Code know it very well and can explain it clearly.
- **It's stable and long-lived.** React has been used since 2013 by very large websites, so it's unlikely to disappear.
- **It fits our app's shape.** Our app is lots of small repeated pieces (rows, cards, bars, forms) that change when data changes. That's exactly what components and React's "work out what changed" approach are designed for.
- **Ready-made pieces are available.** Others have shared React components for charts, date pickers and forms, so we could use those instead of maintaining our own.

**Why React over the others?** Vue and Svelte are excellent and a little easier to learn, but they have smaller communities, so there's less help available. Angular is powerful but much heavier than a personal finance app needs. Plain JavaScript (what we have) works today, but as the app grows we'd keep building our own versions of tools that React already provides.

## 5. Advantages and disadvantages

### ✅ Advantages

| Advantage | What it means for our Expense Tracker |
|-----------|----------------------------------------|
| The screen stays in step with the data | Add, edit or undo a transaction and every total, list and budget bar updates correctly |
| Only what changed is updated | Faster updates, and you don't lose your place while typing in the search or form |
| Reusable components | The transaction row, budget bar and form are built once and used everywhere |
| Huge community | Easy to find tutorials, answers and people to review the project |
| Useful skill | Learning React is valuable beyond this project |
| Shared building blocks | We could use well-tested charts and date pickers instead of our hand-made ones |

### ❌ Disadvantages

| Disadvantage | What it means for our Expense Tracker |
|--------------|----------------------------------------|
| **Big rewrite** | Every page of the app would need to be rebuilt. That's a lot of work, and while it happens new bugs could appear. |
| **Needs a build step** | React code is usually written in a special format called *JSX* (HTML-like code mixed into JavaScript) that browsers can't read directly. A tool has to *build* (translate) it into normal files first. Today you can just double-click `index.html`; with React you'd need to run a command first. |
| **Extra tools to install** | We'd need *Node.js* (a program that runs JavaScript on your computer) and *npm* (a tool that downloads shared code, called *packages* or *dependencies*). Today the app needs nothing installed. |
| **Publishing gets more complicated** | GitHub Pages currently publishes our files exactly as they are. With React, we'd need to build the app first, usually by setting up an automatic step on GitHub. |
| **More to learn** | You'd need to learn React's ideas (components, *state*, which is data that can change, and *props*, which is information passed into a component) on top of HTML, CSS and JavaScript. |
| **Ongoing updates** | React and its packages release new versions. We'd need to update them from time to time and check nothing breaks. |
| **More to keep secure** | Each downloaded package is code written by someone else. We'd need to keep an eye on security updates. (Our privacy promise doesn't change: React runs in your browser, and your data would still never leave it.) |
| **Slightly bigger download** | Visitors' browsers would download React itself as well as our code, so the first visit is a little slower. |

## Decision

**We propose** rebuilding the Expense Tracker's frontend with React, because the app has grown to the point where keeping the screen in step with the data is the main source of complexity, and React is the most widely supported way to handle that.

This is **not** carried out yet. The app currently stays as plain HTML, CSS and JavaScript.

## What happens if we accept this?

If we decide to go ahead:

- This ADR's status changes from **Proposed** to **Accepted**.
- The app is rebuilt with React, page by page.
- These documents are updated to match, because they currently say the app uses "no frameworks": `ARCHITECTURE.md`, `CONTRIBUTING.md`, `TESTING.md`, `CLAUDE.md` and `expense-tracker/README.md`.
- The tester skill is re-run to make sure the new version does everything the old one did, with the same numbers.
