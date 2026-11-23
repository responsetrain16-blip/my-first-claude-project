# ADR 0008: Keep a safety copy before big changes, and remind people to back up

## Status

Accepted on 24 November 2026 (pull request #5). This is how the Finance Tracker works today.

## Context

ADR 0001 keeps all data only in the user's browser. It listed the downsides honestly: **data can be lost**, and **backups are up to you**.

Several actions in the app replace or remove a lot of data at once, and before this decision **none could be undone**:

- **Restore backup** and **Load demo data** replace *all* data.
- **Erase everything** deletes *all* data.
- **Deleting a category** moves its transactions to "Other" and removes its budget.
- **Deleting a goal** removes its whole saving history.

There was also nothing reminding people to download a backup file, which is the only protection if the browser's data is cleared or the device is lost.

Options considered:

- **Keep a full history of changes:** powerful, but uses much more storage (browsers allow only a few megabytes) and is harder to understand.
- **Download backups automatically:** browsers don't let websites save files without the user clicking, and it would fill the Downloads folder.
- **Back up to an online service:** would break ADR 0001 (nothing leaves the device).
- **Keep one safety copy in the browser, plus a reminder to download backups:** simple, private, and covers the most common mistakes.

## Decision

**1. A safety copy before big changes.** Just before restoring a backup, loading demo data, or deleting a category or goal, the app saves a copy of all data in a second storage slot (`finance-tracker-v2-safety`). The message afterwards has an **Undo** button for 10 seconds, and **Settings → Your data → Undo last big change** works later too. Details:
- Only the **latest** copy is kept.
- Undo keeps the device's **current PIN**.
- If the copy can't be saved (for example, storage is full), the app **asks before going ahead**.
- A bad backup file is rejected *before* the safety copy is touched.

**2. Erase everything is different.** People often erase on purpose, for example before giving a phone away, and the screen promises the data will be gone. So **Erase everything** gets an Undo for **10 seconds only**, kept in memory and never saved. Close the page and the erase is final.

**3. Forgot PIN can never be undone.** Erasing always deletes the safety copy. Otherwise, someone could choose "Forgot PIN → Erase", then Undo, and get past the PIN (see ADR 0004). While building this, we also found and fixed a bug where the old screen stayed visible after "Forgot PIN → Erase".

**4. A backup reminder.** If there is data and no backup has been downloaded in **30 days** (or ever), Home shows a reminder card with **Download backup** and **Remind me later** (hides it for 7 days). Settings shows the date of the last backup. The card uses neutral colours, not warning colours (see ADR 0007).

## Consequences

**Good:**
- **Mistakes can be undone:** a wrong restore, an accidental demo load, a deleted category or goal.
- **People are nudged to keep real backups,** the only protection against losing the device or clearing the browser.
- **Still private:** nothing leaves the device (ADR 0001 is unchanged).
- **The PIN stays meaningful:** erasing can't be used to get past it.

**Bad:**
- **The safety copy lives in the same browser,** so it protects against *mistakes*, not against clearing browser data or losing the device. Only a downloaded backup does that.
- **Only one level of Undo:** a second big change replaces the first copy.
- **Undoing later loses newer changes:** if you add expenses after a big change and then undo it, those new expenses are lost (the app warns about this).
- **Uses more storage:** while a safety copy exists, the data is stored twice. That's small for normal use, but it's why there's a "storage full" warning.
- **A reminder can feel like nagging,** which is why "Remind me later" exists.
