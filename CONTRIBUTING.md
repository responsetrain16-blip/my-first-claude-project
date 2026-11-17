# Contributing

Thanks for your interest in helping! 🙌 This is a beginner's learning project, so questions, small fixes and friendly suggestions are all very welcome.

## Ways to help

- **Report a bug:** something doesn't work as expected.
- **Suggest an idea:** a feature or improvement for the Finance Tracker.
- **Improve the docs:** fix a typo or explain something more clearly.
- **Fix something:** send a change yourself (see below).

## Reporting a bug or suggesting an idea

Open an **Issue** on GitHub (the "Issues" tab at the top of the repository) and include:

1. **What happened**, and what you expected to happen
2. **How to make it happen again**, step by step
3. **Where:** your browser (e.g. Chrome, Safari) and whether you're on a phone or computer
4. A **screenshot**, if it helps

> ⚠️ **Never share your real financial data** in an issue or screenshot. Use the website's demo data instead (**Explore with demo data** on the empty Home page, or **Settings → Demo data**).

## Making a change

1. **Fork** the repository (the "Fork" button on GitHub makes your own copy).
2. **Clone** your copy to your computer and create a new branch for your change:
   ```
   git checkout -b fix-short-description
   ```
3. **Open the website:** there's nothing to install. Open `expense-tracker/index.html` in your browser, or start a local server:
   ```
   python3 -m http.server 8799 --bind 127.0.0.1 --directory expense-tracker
   ```
   then visit http://127.0.0.1:8799/index.html
4. **Make your change.** Read [ARCHITECTURE.md](ARCHITECTURE.md) first to see how the code fits together.
5. **Test it** by following [TESTING.md](TESTING.md). If you use Claude Code, `/pr-check` runs all the checks for you. At a minimum, check for syntax errors:
   ```
   for f in expense-tracker/js/*.js expense-tracker/js/views/*.js; do node --check "$f"; done
   ```
   and try your change in the browser at phone and desktop size, in light and dark mode.
6. **Commit** with a short message that says what changed, e.g. `Fix budget total when a category is deleted`.
7. **Push** to your fork and open a **Pull Request**. Describe what you changed and why, and how you tested it.

Small, focused pull requests (one fix or feature each) are much easier to review than big ones.

## Project rules

These keep the website simple, safe and easy for beginners to follow.

- **Plain HTML, CSS and JavaScript only.** No frameworks, libraries, build tools or `npm` packages in the website.
- **Keep data private.** All data stays in the browser's `localStorage`. Never add code that sends data to a server or a third party.
- **Build the page safely.** Create elements with `Utils.h()` and `Utils.svg()`. Never put user-typed text into `innerHTML`.
- **Change data through `Store`.** Every change to data goes through a `Store` function. Totals and balances are calculated by `Finance`, never saved.
- **Use the date helpers.** Dates are `"YYYY-MM-DD"` strings. Use the helpers in `utils.js`, not `toISOString()`, which can give the wrong day.
- **Mind the script order.** Each file in `index.html` may only use things from files loaded above it.
- **Use the colour tokens.** Use the variables at the top of `css/styles.css`, and make sure new colours work in dark mode too.
- **Write beginner-friendly comments** in plain English, like the existing code.

## Be kind

Everyone here is learning. Be patient and respectful, and assume good intentions. Thank you for helping! 💙

## License

By contributing, you agree that your contributions will be shared under the project's [MIT License](LICENSE.md).
