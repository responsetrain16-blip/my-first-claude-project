// Hook: check JavaScript for typing mistakes right after Claude edits it.
//
// Claude Code runs this automatically after every Edit or Write (see
// "hooks" in .claude/settings.json). It receives details of the edit as
// JSON on standard input.
//
// - If the edited file is a Finance Tracker script (expense-tracker/js/...js),
//   it runs `node --check` on it, which finds syntax mistakes without
//   running the app.
// - All good, or not a Finance Tracker script: it exits quietly (code 0).
// - Mistake found: it prints the error and exits with code 2, which tells
//   Claude Code to show the error to Claude so it can fix it straight away.

const { spawnSync } = require("child_process");
const path = require("path");

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let filePath = "";
  try {
    const data = JSON.parse(input);
    filePath = (data.tool_input && data.tool_input.file_path) || "";
  } catch {
    process.exit(0); // Couldn't read the details: don't get in the way.
  }

  // Only check the app's own JavaScript files.
  const normalised = filePath.split(path.sep).join("/");
  if (!/\/expense-tracker\/js\/.+\.js$/.test(normalised)) process.exit(0);

  const result = spawnSync(process.execPath, ["--check", filePath], { encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(
      `Syntax error in ${filePath}. Please fix it:\n${result.stderr || result.stdout}`
    );
    process.exit(2);
  }
});
