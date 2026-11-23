# ADR 0007: Use colour-blind-safe colours, and never use colour alone

## Status

Accepted. This is how the Finance Tracker uses colour today.

## Context

The Finance Tracker uses colour to tell things apart: income vs. spending in the charts, and whether a budget is fine, close to its limit or over it.

About 1 in 12 men and 1 in 200 women have some form of **colour blindness**. The most common kind makes **red and green** hard to tell apart, which are exactly the colours many money apps use for "good" and "bad". Colours that look clear in light mode can also become hard to see in **dark mode**.

## Decision

1. **Chart colours:** income is **blue** (`--series-1`) and spending is **orange** (`--series-2`). Blue and orange stay easy to tell apart for the most common kinds of colour blindness, and they were checked in both light and dark mode.
2. **Status colours** (green, amber, red) are **kept only for status**: whether a budget is on track, close to its limit or over, and whether a goal is reached. They aren't used for decoration, so they always mean something.
3. **Never colour alone:** every status also has an **icon and a word**, for example ✓ **"On track"**, ⚠ **"Close to limit"**, ⚠ **"Over budget"**. Charts also have a **Table** button (see ADR 0003).
4. **All colours are named settings** ("tokens") at the top of `styles.css`, with separate values for dark mode, so they can be checked and changed in one place.
5. New features that aren't about status use **neutral colours**. For example, the backup reminder on Home uses the website's blue, not warning amber (see ADR 0008).

## Consequences

**Good:**
- **Readable for more people,** including those with colour blindness or using a screen reader.
- **Clear meaning:** red, amber and green always mean "budget or goal status", never anything else.
- **Dark mode works properly,** because every colour has a checked dark version.
- **Easy to change:** one place to update every colour.

**Bad:**
- **Less freedom in design:** some colour choices are ruled out, for example green for income and red for spending.
- **More to check:** every new colour must be tested for colour blindness and for both light and dark mode.
- **Slightly more on screen:** icons and words next to colours take a little extra space.
