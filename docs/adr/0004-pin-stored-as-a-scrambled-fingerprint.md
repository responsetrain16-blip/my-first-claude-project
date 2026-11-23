# ADR 0004: Protect the app with an optional PIN, stored only as a scrambled "fingerprint"

## Status

Accepted. This is how the PIN lock works today.

## Context

The Finance Tracker holds private money information. People may use it on a shared computer, or hand their phone to someone else, so they wanted a way to **lock the app** with a PIN.

The PIN has to be saved somewhere so the app can check it next time. Because all data lives in the browser (see ADR 0001), anything saved can be read by someone who knows where to look. The options were:

- **Save the PIN as it is:** simple, but anyone who peeks at the stored data would see the PIN.
- **Save a scrambled "fingerprint" of the PIN:** a *hash* is a one-way calculation: easy to work out from the PIN, but practically impossible to turn back into the PIN. To check a PIN, the app scrambles what you type and compares the two fingerprints.
- **Lock (encrypt) all the data with the PIN:** the strongest option, but if you forget the PIN, your data is lost forever, and every part of the app would need to unlock data before using it.

## Decision

The PIN is **optional**, and it is **never saved**. Only its scrambled fingerprint is stored (in `security.js`):

- The fingerprint is made with **PBKDF2-SHA-256**, repeated **150,000 times**, with a **random "salt"** (extra random characters mixed in, so two people with the same PIN get different fingerprints). The repetition makes guessing PINs slow.
- The app **locks when it opens** and after a period of no activity (5 minutes by default).
- After **5 wrong tries**, the keypad pauses for 30 seconds.
- When locking, any open pop-ups are closed and the page behind the lock screen is made un-clickable, so nothing shows or can be used.
- **Forgot your PIN?** It can't be recovered. The only way back in is to erase all data on that device (and restore a backup file if you have one). This erase can't be undone, so it can't be used to get past the PIN (see ADR 0008).
- The PIN needs a **secure connection** (https, or the computer's own `localhost`), because the browser's scrambling tools only work there.

## Consequences

**Good:**
- **The PIN itself is never stored**, so it can't be read from the browser's storage.
- **Guessing is slow:** both the 150,000 repeats and the pause after 5 wrong tries make trying every PIN impractical.
- **Optional:** people who don't need it never see it.

**Bad:**
- **Keeps casual onlookers out, not experts:** the money data itself is **not encrypted**. Someone with full access to the device and technical skills could read it from the browser's storage. The app says so, and recommends also locking the device with its own password.
- **Forgetting the PIN means erasing the data on that device.** Only a downloaded backup can bring it back.
- **Doesn't work from `file://`:** the PIN option is only available when the website is opened over https or `localhost`.
