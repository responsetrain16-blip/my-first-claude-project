---
name: pr-check
description: Check a pull request (or the current uncommitted/unpushed changes) in the my-first-claude-project repository before it is merged or pushed — junk files, secrets, syntax, Finance Tracker code rules, offline/install files, plugin validity, website tests, a real browser try-out and a read-through of the diff — then give a clear "ready / not ready" report without changing any code. Use when asked to check, review or verify a PR, a branch, or changes before pushing.
---

# PR Check

You are a careful reviewer for this repository. Your job is to decide whether a set of changes is **safe to merge (or push)**, and explain why in simple English. The repository owner is a beginner, so explain every problem plainly and say how to fix it.

## Golden rules

- **Check, don't change.** Never edit, commit, push, merge, approve or close anything. Only report. Fix things only if the user asks after reading the report.
- **Don't touch the user's work.** Check other branches and PRs in a **temporary git worktree** in your scratchpad or a temp folder, never by switching the user's current branch. Delete the worktree when you're done.
- **Never touch real data.** Browser tests use a fresh, temporary browser profile.
- **Post to GitHub only if asked.** Don't comment on a PR unless the user asks you to.

## Step 1: Decide what to check

| The user gives… | Check this | Compare against |
|---|---|---|
| A PR number, e.g. `12` | `gh pr view 12 --json number,title,body,headRefName,baseRefName,author,commits` then `git fetch origin pull/12/head` and `git worktree add <temp-dir> FETCH_HEAD` | `origin/<baseRefName>` (run `git fetch origin` first) |
| A branch name | `git fetch origin <branch>` then `git worktree add <temp-dir> origin/<branch>` (or the local branch) | `origin/main` |
| Nothing | The current folder as it is now, including uncommitted changes | `origin/main` |

Run all later steps **inside** the folder you're checking.

## Step 2: Run the automatic checks

```
bash <this skill's base directory>/scripts/pr-check.sh <base>
```

(In this repository the script is at `plugins/pr-check/skills/pr-check/scripts/pr-check.sh`.)

It prints `PASS`, `FAIL`, `WARN` or `NOTE` for each check and exits with 1 if anything failed. It covers:

1. **Unwanted files:** `.DS_Store`, `node_modules/`, `.env`, `settings.local.json`, logs, key files, and files over 1 MB
2. **Secrets:** passwords, tokens, API keys or private keys in added lines
3. **Syntax:** `node --check` on changed JavaScript; changed JSON and `.webmanifest` files must load; `bash -n` on changed shell scripts
4. **Finance Tracker rules** (from `CONTRIBUTING.md`): no `innerHTML` (use `Utils.h`), no `eval`, no outside libraries, nothing sending data over the internet (except `sw.js`), no `toISOString()` dates, no leftover `console.log`, and data saved only through `Store`. New scripts must be in `index.html`, new files in the `FILES` list of `sw.js`, and the `CACHE` name changed when `sw.js` changes.
5. **Plugins:** `claude plugin validate` on changed plugins and on `.claude-plugin/marketplace.json`; new plugins must be listed in the marketplace
6. **Documentation:** a reminder when code changed but no documents did, and when a new top-level file isn't in the README files table

The script only looks at **added lines**, so it won't complain about old code the change didn't touch.

## Step 3: Test the website (only if `expense-tracker/` changed)

1. Run the full website tests from the `expense-tracker-tester` plugin (`/test-tracker`, or follow its skill). Serve the folder you're checking, not the user's main folder if they differ. Any `FAIL` there means the PR is **not ready**.
2. **Try the actual change in Chrome**, using a fresh temporary profile at phone (390px) and desktop (1366px) width. Tests only cover what they were written for, so check the new behaviour directly. For example: if the PR adds a button, click it; if it changes a total, check the number. Look at the screenshots yourself.
3. Check the browser console for JavaScript errors.

## Step 4: Read the changes yourself

Read the whole diff (`git diff <base>...HEAD` plus any uncommitted changes) and check what a script can't:

- **Does it do what it says?** Compare with the PR title and description (or what the user said). Note anything missing, half-done, or unrelated sneaked in.
- **Correctness:** look for bugs, such as wrong maths, dates, empty lists, or undo/delete paths. Money must stay rounded to 2 decimals, and transfers must not count as income or spending.
- **Docs match the code:** for every button, menu or label named in changed documents, `grep` the code for the exact text. Check README, ARCHITECTURE, TESTING, CONTRIBUTING and CLAUDE.md still describe how things really work.
- **Beginner-friendly:** new code has short plain-English comments in the existing style, and names are clear.
- **Commit messages** say what changed and why.

## Step 5: Report

Clean up any temporary worktree (`git worktree remove <temp-dir>`) and server first. Then reply in this format, in plain English:

```
## PR check: <PR number and title, or "local changes"> — <date>

**Verdict:** ✅ Ready to merge | ⚠️ Ready after small fixes | ❌ Not ready

| Check | Result |
|---|---|
| Unwanted files & secrets | ✅ / ❌ … |
| Syntax | … |
| Finance Tracker rules | … |
| Install & offline files | … (or "not affected") |
| Plugins | … (or "not affected") |
| Website tests | X passed, Y failed (or "not affected") |
| Tried in the browser | what you tried and what happened |
| Code read-through | … |
| Documentation | … |

### ❌ Must fix before merging
1. <Problem> — <where (file:line)> — <how to fix, in simple words>

### ⚠️ Worth fixing
- …

### ✅ Looks good
- …
```

Choosing the verdict:
- **❌ Not ready:** any `FAIL` from the script or the website tests, a JavaScript error, a secret, or a real bug.
- **⚠️ Ready after small fixes:** only warnings, notes or small doc fixes.
- **✅ Ready to merge:** everything passed and the read-through found nothing.

End by asking whether the user wants you to fix anything, or to post the report as a comment on the PR (`gh pr comment <number> --body-file <file>`).
