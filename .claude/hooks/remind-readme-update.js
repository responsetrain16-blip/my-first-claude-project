// Hook: keep README.md up to date with a short summary of every change.
//
// Claude Code runs this automatically each time Claude finishes replying
// (the "Stop" event, see "hooks" in .claude/settings.json).
//
// It asks Git which files have changed since the last commit (saved
// version). If files changed but README.md didn't, it tells Claude to
// carry on and add a one-line summary to the "Recent changes" section of
// README.md before finishing. Otherwise it stays quiet.
//
// To avoid nagging, it only asks once for the same set of changes: a
// fingerprint of the changes is remembered in a small file inside the
// hidden .git folder (never committed).

const { spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

// Files that don't need a README summary on their own.
const IGNORE = new Set(["README.md", ".claude/settings.local.json"]);
const IGNORE_NAMES = new Set([".DS_Store"]);

const git = (args, cwd) => spawnSync("git", args, { cwd, encoding: "utf8" });

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let data = {};
  try { data = JSON.parse(input); } catch { /* carry on with defaults */ }

  // Claude is already continuing because of this hook: don't ask again.
  if (data.stop_hook_active) process.exit(0);

  const dir = process.env.CLAUDE_PROJECT_DIR || data.cwd || process.cwd();

  // List changed files (-z keeps names with spaces intact).
  const status = git(["status", "--porcelain", "-z", "--untracked-files=all"], dir);
  if (status.status !== 0) process.exit(0); // Not a Git project: nothing to do.

  const changed = [];
  const newFiles = []; // files Git isn't tracking yet
  const parts = status.stdout.split("\0").filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const code = parts[i].slice(0, 2);
    const file = parts[i].slice(3);
    changed.push(file);
    if (code === "??") newFiles.push(file);
    if (code.includes("R") || code.includes("C")) i++; // skip a rename's old name
  }

  if (changed.includes("README.md")) process.exit(0); // README already updated.

  const relevant = changed.filter((f) => !IGNORE.has(f) && !IGNORE_NAMES.has(path.basename(f)));
  if (relevant.length === 0) process.exit(0); // Nothing worth summarising.

  // Fingerprint of the current changes, so we only ask once per change.
  // `git diff` doesn't look inside brand-new files, so add their size and
  // last-modified time too.
  const hash = crypto.createHash("sha1").update(relevant.join("\n"));
  hash.update(git(["diff", "HEAD"], dir).stdout || "");
  for (const f of newFiles) {
    try { const s = fs.statSync(path.join(dir, f)); hash.update(`${f}:${s.size}:${s.mtimeMs}`); } catch { /* gone */ }
  }
  const fingerprint = hash.digest("hex");
  const gitDir = git(["rev-parse", "--absolute-git-dir"], dir).stdout.trim();
  const memo = path.join(gitDir, "claude-readme-reminder");
  try {
    if (fs.readFileSync(memo, "utf8") === fingerprint) process.exit(0);
  } catch { /* first time */ }
  try { fs.writeFileSync(memo, fingerprint); } catch { /* not fatal */ }

  const list = relevant.slice(0, 15).map((f) => `- ${f}`).join("\n");
  const more = relevant.length > 15 ? `\n- …and ${relevant.length - 15} more` : "";

  process.stdout.write(JSON.stringify({
    decision: "block",
    reason:
      `These files changed since the last commit, but README.md hasn't been updated:\n${list}${more}\n\n` +
      "Before finishing, add ONE short, plain-English line at the top of the \"## Recent changes\" " +
      "section of README.md, in the form `- **YYYY-MM-DD:** what changed and why it matters`. " +
      "Also update any other README section this change makes out of date. Keep it brief and " +
      "beginner-friendly. If the change is too small to matter to a reader (e.g. a typo), " +
      "say so in one sentence and don't edit README.md.",
  }));
});
