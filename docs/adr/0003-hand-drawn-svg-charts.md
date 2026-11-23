# ADR 0003: Draw the charts ourselves (no chart library)

## Status

Accepted. This is how the Finance Tracker's charts work today.

## Context

The Finance Tracker shows several charts: income vs. spending per month (columns), total balance over time (a line), and spending by category (ranked bars).

There were two main ways to make them:

- **Use a chart library:** ready-made code (for example Chart.js) that draws many kinds of charts for you. It has to be downloaded with the website, often from another company's server (a *CDN*), and it brings its own look.
- **Draw them ourselves with SVG:** *SVG* is a way of drawing shapes (rectangles, lines, text) inside a web page using code. Every browser understands it, with nothing to download.

The project already uses no outside code at all (see ADR 0002), and the charts only need three simple shapes.

## Decision

We **draw all charts ourselves** in `charts.js`, using SVG:

- `Charts.columns()`: monthly income vs. spending
- `Charts.line()`: a value over time, such as total balance
- `Charts.barList()`: ranked horizontal bars, such as spending by category

Every chart has a **hover tooltip** showing exact numbers, and `Charts.card()` adds a **Chart / Table** button so the same numbers can be read as a table. The colours come from the website's colour settings in `styles.css`, so the charts change automatically in dark mode (see ADR 0007).

## Consequences

**Good:**
- **Nothing extra to download:** the website stays small and fast.
- **Private:** no request goes to another company's server just to draw a chart.
- **Works offline** with no extra effort (see ADR 0006).
- **Looks consistent:** the charts use exactly the same colours, fonts and dark mode as the rest of the website.
- **Accessible:** the Table button means the numbers can be read without seeing colours or shapes, for example with a screen reader.

**Bad:**
- **More work:** every chart, tooltip and axis label had to be written by hand.
- **Fewer chart types:** adding a new kind of chart (say, a pie chart) means writing it from scratch.
- **We must maintain it ourselves:** if a chart has a bug, there's no library update to fix it for us.
