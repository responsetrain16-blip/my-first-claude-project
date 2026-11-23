# ADR 0005: Publish the website for free with GitHub Pages

## Status

Accepted. The website is live at https://responsetrain16-blip.github.io/my-first-claude-project/expense-tracker/

## Context

To use the Finance Tracker on a phone or share it with others, it needs to be on the internet. *Hosting* means putting the website's files on a computer that's always online so anyone can open them.

Options included:

- **A paid hosting service or your own server:** can run code on the server and store data there, but costs money and needs looking after.
- **GitHub Pages:** a free service from GitHub that publishes the files from a GitHub repository as a website. It only *shares files*: it can't run server code or store anyone's data.

The project's code already lives on GitHub. The website is plain files with no build step (ADR 0002), and all data stays in the user's browser (ADR 0001), so it doesn't need a server at all.

## Decision

We publish the website with **GitHub Pages**, from the `main` branch (the repository's root folder). Every time a change is merged into `main`, the live website **updates by itself within a minute or two**.

Because `main` *is* the live website, changes are made on a separate **branch**, proposed as a **pull request**, checked (with the `pr-check` and tester plugins), and only then merged into `main`.

## Consequences

**Good:**
- **Free**, with no server to pay for, update or protect.
- **Automatic:** merging a pull request is all it takes to publish.
- **Secure connection (https)** included, which the PIN lock (ADR 0004) and the offline/install feature (ADR 0006) need.
- **Fits the other decisions:** plain files and no server data.

**Bad:**
- **No server:** the website can never store data online or sync between devices without changing ADR 0001 and moving to a different host.
- **Every merge to `main` goes live straight away**, so a mistake reaches users quickly. Branches, pull requests and checks are how we guard against that.
- **The code is public:** the repository is public, so anyone can read the website's code. (Users' data is never in the repository; it stays in each person's browser.)
- **Depends on GitHub:** if GitHub Pages changes its rules or has an outage, the website is affected.
