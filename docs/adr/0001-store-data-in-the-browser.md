# ADR 0001: Store all data in the user's own browser

## Status

Accepted. This is how the Expense Tracker works today.

## Context

The Expense Tracker holds private information: what you earn, what you spend, your account balances and your savings goals. That data has to be saved somewhere, so it's still there next time you open the website.

There were two main ways to do this:

- **On a server:** a *server* is a computer on the internet that stores data for many people, like a bank keeping everyone's records in its own building. You would need an account and a password, and someone would have to run, pay for and protect that computer.
- **In the browser:** every web browser (Chrome, Safari, Edge…) has a small private storage area for each website, called *localStorage*. It's like a notebook kept in a drawer on your own computer, which only that website can open.

The project is built with plain HTML, CSS and JavaScript and published for free on *GitHub Pages*, a service that shares the website's files but cannot run a server or store anyone's data.

## Decision

We store all of the website's data **only in the user's own browser**, using localStorage. Nothing is ever sent to a server.

All data is kept together and saved under one name (`finance-tracker-v2`). Because data can be lost if the browser is cleared, the website lets people **download a backup file** and **restore** it later, from **Settings → Your data**.

## Consequences

**Good:**
- **Private by design:** your financial data never leaves your device, so it can't be leaked from a server or seen by anyone else.
- **No accounts or passwords:** open the website and start using it straight away.
- **Free and simple:** no server to run, pay for or look after, so it works on GitHub Pages.
- **Fast:** saving happens instantly on your own computer, with no waiting for the internet.

**Bad:**
- **No syncing between devices:** expenses added on your phone don't appear on your laptop.
- **Data can be lost:** clearing your browser data, or losing the device, deletes everything unless you've downloaded a backup.
- **Backups are up to you:** the website can't back up your data automatically, so you have to remember to download backups.
- **Limited space:** browsers allow only a few megabytes per website. That's plenty for years of transactions, but not for things like photos of receipts.
