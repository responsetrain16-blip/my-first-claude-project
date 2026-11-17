---
name: pr-check
description: Review a pull request (or the current uncommitted/unpushed changes) in the my-first-claude-project repository before it is merged or pushed — understand its purpose, review changed files and logic, verify functionality and validation, make sure existing features still work, check security, run the automatic checks and website tests, check documentation — then report with a final recommendation (Approve, Request Changes or Needs Further Review) without changing any code. Use when asked to check, review or verify a PR, a branch, or changes before pushing.
---

# PR Check

**Purpose:** Review pull requests to ensure code changes are correct, functionality works as expected, and existing features are not affected.

You are a careful reviewer for this repository. The repository owner is a beginner, so explain every problem in simple English and say how to fix it.

## Golden rules

- **Never mark a check as passed without verifying it.** If you couldn't run or check something, say so: it is "not checked", not "passed".
- **Do not approve a PR automatically.** Your recommendation is advice for the user, who decides.
- **Check, don't change.** Never edit, commit, push, merge, approve or close anything. Fix things only if the user asks after reading the report.
- **Don't touch the user's work.** Check other branches and PRs in a **temporary git worktree** in a temp folder, never by switching the user's current branch. Remove the worktree when you're done.
- **Never touch real data.** Browser tests use a fresh, temporary browser profile.
- **Post to GitHub only if asked.** Don't comment on a PR unless the user asks you to.

## Before you start: get the changes

| The user gives… | Check this | Compare against (`<base>`) |
|---|---|---|
| A PR number, e.g. `12` | `gh pr view 12 --json number,title,body,headRefName,baseRefName,author,commits`, then `git fetch origin pull/12/head` and `git worktree add <temp-dir> FETCH_HEAD` | `origin/<baseRefName>` (run `git fetch origin` first) |
| A branch name | `git fetch origin <branch>`, then `git worktree add <temp-dir> origin/<branch>` (or the local branch) | `origin/main` |
| Nothing | The current folder as it is now, including uncommitted changes | `origin/main` |

Run all the steps below **inside** the folder you're checking.

## PR review steps

### 1. Understand the PR
Read the PR title, description and commit messages to understand the purpose of the changes. For local changes, use what the user said they were doing. Write down in one sentence what the PR is supposed to do; every later step checks against that.

### 2. Review changed files
Identify which files have been **added, modified or deleted**:
```
git diff --stat <base>...HEAD
git status -s
```
Then run the automatic checks script, which also lists every changed file:
```
bash <this skill's base directory>/scripts/pr-check.sh <base>
```
(In this repository: `plugins/pr-check/skills/pr-check/scripts/pr-check.sh`.) It prints `PASS`, `FAIL`, `WARN` or `NOTE` per check and exits with 1 if anything failed. It covers unwanted files, secrets, syntax, Finance Tracker rules, offline/install files, plugins and documentation reminders. Its results feed into steps 3, 7 and 9. It only looks at **added lines**, so it won't complain about old code the change didn't touch.

Flag anything **unrelated** to the PR's purpose that sneaked in.

### 3. Check code changes
Read the whole diff (`git diff <base>...HEAD` plus any uncommitted changes). Look for:
- **Incorrect logic:** wrong maths, wrong comparisons, off-by-one dates, missed cases such as empty lists, editing vs adding, or undo/delete.
- **Duplicate code:** something that already exists in `Utils`, `Store`, `Finance` or `UI` and should be reused.
- **Potential bugs**, plus the script's **syntax** results (`node --check`, JSON, `bash -n`).
- **Project rules** (from `CONTRIBUTING.md` and `CLAUDE.md`): build the page with `Utils.h()` (never `innerHTML`); save data only through `Store`; dates with the `Utils` date helpers (never `toISOString()`); money rounded to 2 decimals; transfers never counted as income or spending; new scripts added to `index.html`; new files added to `FILES` in `sw.js`, with `CACHE` renamed when `sw.js` changes.
- **Beginner-friendly code:** short plain-English comments in the existing style, and clear names.

### 4. Verify functionality
Check whether the changes do what step 1 says they should. If `expense-tracker/` changed, **try the change in Chrome** using a fresh temporary profile, at phone (390px) and desktop (1366px) width. Serve the folder you're checking (on a free port, not the user's main folder). For example: if the PR adds a button, click it; if it changes a total, check the number. **Look at the screenshots yourself.** An error message that's off-screen or hidden counts as a problem.

### 5. Check validation
Verify input validation and error handling for anything the change touches:
- Bad input is rejected **with a clear, visible message**: empty, zero, negative, letters, huge numbers, invalid or far-off dates.
- Good input, including edge cases right at the limit, is still accepted.
- Nothing is saved when there's an error, and the user isn't left stuck.

### 6. Check existing features
Ensure the changes don't break existing functionality. Run the full website tests from the `expense-tracker-tester` plugin (`/test-tracker`, or follow its skill), against the folder you're checking:
```
NODE_PATH=<temp>/node_modules node plugins/expense-tracker-tester/skills/expense-tracker-tester/scripts/check.js http://127.0.0.1:<port>/index.html <screenshot-dir>
```
(Install the browser driver once in a temp folder: `npm install puppeteer-core@23.11.1`.) Any `FAIL` means **Request Changes**. Also check the browser console for JavaScript errors.

If nothing in `expense-tracker/` changed, say "website not affected" and skip this step.

### 7. Check security
Look for exposed passwords, API keys or other security risks:
- The script's **unwanted files** and **secrets** results, e.g. `.env`, keys, tokens, `settings.local.json`, `.DS_Store`.
- **Privacy:** nothing may send the user's financial data over the internet (`fetch`, `XMLHttpRequest` etc., except in `sw.js`), and no outside libraries.
- **Safe page building:** no `innerHTML` with user-typed text, and no `eval`.
- PIN and lock changes keep the PIN hashed, never stored in plain text.

### 8. Run tests
Make sure every test that applies was **actually run**, and record the numbers:
- Automatic checks script (step 2): X passed, Y failed, Z warnings
- Website tests (step 6): X passed, Y failed, Z notes
- Plugin validation, when `plugins/` or `.claude-plugin/` changed: the script runs `claude plugin validate`
- Your browser try-out (step 4): what you tried and what happened

If a test couldn't run (e.g. no Chrome or Node), say so. Don't mark it as passed.

### 9. Check documentation
Verify whether the README or other documentation needs updating:
- If the change adds or changes something a user sees, are `README.md`, `expense-tracker/README.md`, `TESTING.md` and `ARCHITECTURE.md` updated? Is `CLAUDE.md` updated for anything that changes how the code works?
- For every button, menu or message named in changed documents, `grep` the code for the **exact** text.
- New top-level files or folders should be in the README's files table (the script reminds you).

### 10. Prepare review report
First clean up: remove the temporary worktree (`git worktree remove <temp-dir>`) and stop any server you started. Then summarise findings and give recommendations in the format below.

## Expected output

Reply in plain English using this format:

```
## PR check: <PR number and title, or "local changes"> — <date>

**Final recommendation:** ✅ Approve | ❌ Request Changes | 🔍 Needs Further Review

### PR summary
<One or two sentences: what the PR does and why.>

### Files reviewed
- `<file>`: added / modified / deleted, and what changed

### Passed checks
| Check | Result |
|---|---|
| … | ✅ <what was verified, with numbers> |

### Failed checks
| Check | Result |
|---|---|
| … | ❌ <what failed> |
(or "None")

### Issues and potential risks
1. <Problem> — <where (file:line)> — <why it matters> — <how to fix, in simple words>

### Suggested improvements
- <Idea> — <why it helps> (optional, not required to merge)
```

**Choosing the final recommendation:**
- **❌ Request Changes:** any `FAIL` from the script or the website tests, a JavaScript error, a secret or privacy risk, a real bug, or the PR doesn't do what it says.
- **🔍 Needs Further Review:** a check couldn't be run, something can't be confirmed (e.g. needs a real phone), or a question only the user can answer.
- **✅ Approve:** every check was run and passed, and the read-through found no issues. Warnings and suggestions may remain, but list them.

End by asking whether the user wants you to fix anything, or to post the report as a comment on the PR (`gh pr comment <number> --body-file <file>`). Never approve or merge it yourself.
