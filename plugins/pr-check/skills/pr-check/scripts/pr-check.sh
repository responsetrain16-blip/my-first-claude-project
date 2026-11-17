#!/usr/bin/env bash
# ============================================================
# pr-check.sh — automatic checks for a pull request (or any set of changes)
#
# Usage (run from the top folder of the repository):
#   bash pr-check.sh [base]
#
#   base  what to compare against (default: origin/main).
#         Everything changed since the branch split from <base> is checked,
#         including changes you haven't committed yet.
#
# Prints one line per check: PASS, FAIL, WARN or NOTE.
# Exits with 1 if anything FAILed, so it can also be used in automation.
# Works with the bash that ships with macOS (3.2) and on Linux.
# ============================================================
set -u

BASE="${1:-origin/main}"
FAILS=0; WARNS=0; PASSES=0

pass() { PASSES=$((PASSES + 1)); echo "PASS  $1"; }
fail() { FAILS=$((FAILS + 1));   echo "FAIL  $1"; }
warn() { WARNS=$((WARNS + 1));   echo "WARN  $1"; }
note() { echo "NOTE  $1"; }

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "This isn't a git repository. Run the check from inside the project."; exit 2
fi
cd "$(git rev-parse --show-toplevel)" || exit 2

if ! git rev-parse --verify --quiet "$BASE" >/dev/null; then
  echo "Can't find '$BASE' to compare against. Try: git fetch origin   (or pass another base, e.g. main)"; exit 2
fi
MB="$(git merge-base "$BASE" HEAD)"

# ---------- What changed ----------
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
CHANGED="$TMP/changed"; ADDED_FILES="$TMP/added-files"; DELETED="$TMP/deleted"
{
  git diff --name-only --diff-filter=ACMR "$MB"
  git ls-files --others --exclude-standard
} | sort -u > "$CHANGED"
{
  git diff --name-only --diff-filter=A "$MB"
  git ls-files --others --exclude-standard
} | sort -u > "$ADDED_FILES"
git diff --name-only --diff-filter=D "$MB" | sort -u > "$DELETED"

# Lines that were added in one file (all lines for a brand-new file)
added_lines() {
  if grep -qxF "$1" "$ADDED_FILES"; then sed 's/^/+/' "$1"
  else git diff -U0 "$MB" -- "$1" | grep '^+' | grep -v '^+++'
  fi
}

echo "== Changes compared with $BASE =="
if [ ! -s "$CHANGED" ] && [ ! -s "$DELETED" ]; then
  echo "No changes found. Nothing to check."; exit 0
fi
sed 's/^/  changed: /' "$CHANGED"
sed 's/^/  deleted: /' "$DELETED"
echo

# ---------- 1. Files that should never be committed ----------
echo "== 1. Unwanted files =="
JUNK="$(grep -E '(^|/)(\.DS_Store|node_modules/|\.env(\..*)?$|settings\.local\.json$|.*\.log$|.*\.(pem|key|p12)$)' "$CHANGED")"
if [ -n "$JUNK" ]; then
  fail "files that shouldn't be in the repository: $(echo $JUNK)"
else
  pass "no junk, personal settings or key files"
fi
BIG=""
while IFS= read -r f; do
  [ -f "$f" ] || continue
  size=$(wc -c < "$f" | tr -d ' ')
  [ "$size" -gt 1000000 ] && BIG="$BIG $f ($((size / 1024)) KB)"
done < "$CHANGED"
if [ -n "$BIG" ]; then warn "large files (over 1 MB):$BIG"; else pass "no files over 1 MB"; fi

# ---------- 2. Secrets ----------
echo; echo "== 2. Secrets =="
SECRET_RE='-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|(api[_-]?key|secret|password|passwd|token)["'"'"']?[[:space:]]*[:=][[:space:]]*["'"'"'][^"'"'"']{8,}["'"'"']'
SECRETS=""
while IFS= read -r f; do
  [ -f "$f" ] || continue
  case "$f" in *.png|*.jpg|*.jpeg|*.gif|*.ico|*.webp) continue ;; esac
  added_lines "$f" | grep -Eiq -- "$SECRET_RE" && SECRETS="$SECRETS $f"
done < "$CHANGED"
if [ -n "$SECRETS" ]; then fail "possible password, token or key in:$SECRETS"; else pass "no passwords, tokens or keys found"; fi

# ---------- 3. Syntax ----------
echo; echo "== 3. Syntax =="
JS_COUNT=0; JS_BAD=""
if command -v node >/dev/null 2>&1; then
  while IFS= read -r f; do
    case "$f" in *.js|*.mjs|*.cjs) ;; *) continue ;; esac
    [ -f "$f" ] || continue
    JS_COUNT=$((JS_COUNT + 1))
    node --check "$f" 2>"$TMP/err" || JS_BAD="$JS_BAD $f"
  done < "$CHANGED"
  if [ -n "$JS_BAD" ]; then fail "JavaScript syntax errors in:$JS_BAD"
  elif [ "$JS_COUNT" -gt 0 ]; then pass "JavaScript syntax OK ($JS_COUNT file(s))"
  else note "no JavaScript files changed"; fi
else
  warn "Node.js isn't installed, so JavaScript syntax wasn't checked"
fi
JSON_BAD=""; JSON_COUNT=0
while IFS= read -r f; do
  case "$f" in *.json|*.webmanifest) ;; *) continue ;; esac
  [ -f "$f" ] || continue
  JSON_COUNT=$((JSON_COUNT + 1))
  python3 -c 'import json,sys; json.load(open(sys.argv[1]))' "$f" 2>/dev/null || JSON_BAD="$JSON_BAD $f"
done < "$CHANGED"
if [ -n "$JSON_BAD" ]; then fail "broken JSON in:$JSON_BAD"
elif [ "$JSON_COUNT" -gt 0 ]; then pass "JSON files are valid ($JSON_COUNT file(s))"; fi
SH_BAD=""; SH_COUNT=0
while IFS= read -r f; do
  case "$f" in *.sh) ;; *) continue ;; esac
  [ -f "$f" ] || continue
  SH_COUNT=$((SH_COUNT + 1))
  bash -n "$f" 2>/dev/null || SH_BAD="$SH_BAD $f"
done < "$CHANGED"
if [ -n "$SH_BAD" ]; then fail "shell script syntax errors in:$SH_BAD"
elif [ "$SH_COUNT" -gt 0 ]; then pass "shell scripts are valid ($SH_COUNT file(s))"; fi

# ---------- 4. Finance Tracker rules (see CONTRIBUTING.md) ----------
echo; echo "== 4. Finance Tracker rules =="
APP_JS="$(grep -E '^expense-tracker/.*\.js$' "$CHANGED")"
APP_HTML="$(grep -E '^expense-tracker/.*\.html$' "$CHANGED")"
if [ -z "$APP_JS$APP_HTML" ]; then
  note "no website code changed"
else
  rule() { # rule <FAIL|WARN> <regex> <problem message> <ok message> <files...>
    level="$1"; re="$2"; msg="$3"; ok="$4"; shift 4; hits=""
    for f in "$@"; do
      [ -f "$f" ] || continue
      added_lines "$f" | grep -Eq -- "$re" && hits="$hits $f"
    done
    if [ -n "$hits" ]; then
      if [ "$level" = FAIL ]; then fail "$msg:$hits"; else warn "$msg:$hits"; fi
    else
      pass "$ok"
    fi
  }
  # shellcheck disable=SC2086
  set -- $APP_JS $APP_HTML
  rule FAIL 'innerHTML|outerHTML|insertAdjacentHTML|document\.write' "unsafe HTML building (use Utils.h instead)" "no unsafe HTML building" "$@"
  rule FAIL '(^|[^.a-zA-Z])eval\(|new Function\(' "eval or new Function (runs text as code)" "no eval or new Function" "$@"
  rule FAIL '<script[^>]+src=["'"'"']https?:|from ["'"'"']https?:|import\(["'"'"']https?:' "outside libraries loaded from the internet (project is plain JS only)" "no outside libraries" "$@"
  NOT_SW=""; for f in "$@"; do [ "$f" = expense-tracker/sw.js ] || NOT_SW="$NOT_SW $f"; done
  # shellcheck disable=SC2086
  [ -n "$NOT_SW" ] && rule FAIL '(^|[^a-zA-Z])fetch\(|XMLHttpRequest|sendBeacon|new WebSocket|new EventSource' "code that sends data over the internet (data must stay in the browser)" "nothing sends data over the internet" $NOT_SW
  rule WARN 'toISOString\(' "toISOString() can give the wrong day (use the Utils date helpers)" "no toISOString() date mistakes" "$@"
  rule WARN 'console\.log\(' "leftover console.log debugging" "no leftover console.log" "$@"
  NOT_STORE=""; for f in $APP_JS; do [ "$f" = expense-tracker/js/store.js ] || [ "$f" = expense-tracker/js/security.js ] || NOT_STORE="$NOT_STORE $f"; done
  # shellcheck disable=SC2086
  [ -n "$NOT_STORE" ] && rule WARN 'localStorage\.(setItem|removeItem|clear)' "localStorage changed outside Store (use Store functions)" "data is only saved through Store" $NOT_STORE
fi

# New script files must be loaded by index.html, and cached for offline use by sw.js
NEW_APP_FILES="$(grep -E '^expense-tracker/' "$ADDED_FILES" | grep -vE '(README\.md|\.DS_Store)$')"
if [ -n "$NEW_APP_FILES" ]; then
  MISSING_TAG=""; MISSING_SW=""
  for f in $NEW_APP_FILES; do
    rel="${f#expense-tracker/}"
    case "$rel" in js/*.js) grep -qF "src=\"$rel\"" expense-tracker/index.html || MISSING_TAG="$MISSING_TAG $rel" ;; esac
    [ "$rel" = sw.js ] && continue
    [ -f expense-tracker/sw.js ] && { grep -qF "\"$rel\"" expense-tracker/sw.js || MISSING_SW="$MISSING_SW $rel"; }
  done
  if [ -n "$MISSING_TAG" ]; then fail "new script not added to index.html:$MISSING_TAG"; else pass "new scripts are loaded by index.html"; fi
  if [ -n "$MISSING_SW" ]; then warn "new file not in the FILES list in sw.js (won't work offline until first visit):$MISSING_SW"; else pass "new files are in the offline list (sw.js)"; fi
fi
if git diff -U0 "$MB" -- expense-tracker/sw.js 2>/dev/null | grep -E '^[+-] ' | grep -vqE 'CACHE ='; then
  git diff -U0 "$MB" -- expense-tracker/sw.js | grep -qE '^\+const CACHE' || warn "sw.js changed but the CACHE name wasn't changed, so phones may keep the old offline copy"
fi

# ---------- 5. Plugins ----------
if grep -qE '^(plugins/|\.claude-plugin/)' "$CHANGED"; then
  echo; echo "== 5. Plugins =="
  if command -v claude >/dev/null 2>&1; then
    for p in $(grep -E '^plugins/[^/]+/' "$CHANGED" | cut -d/ -f1-2 | sort -u); do
      [ -d "$p" ] || continue
      if claude plugin validate "$p" >"$TMP/pv" 2>&1 && grep -q "Validation passed" "$TMP/pv"; then pass "plugin $p is valid"; else fail "plugin $p failed validation (run: claude plugin validate $p)"; fi
    done
    if [ -f .claude-plugin/marketplace.json ]; then
      if claude plugin validate . >"$TMP/mv" 2>&1 && grep -q "Validation passed" "$TMP/mv"; then pass "marketplace.json is valid"; else fail "marketplace.json failed validation (run: claude plugin validate .)"; fi
      for p in $(grep -E '^plugins/[^/]+/\.claude-plugin/plugin\.json$' "$ADDED_FILES" | cut -d/ -f2); do
        grep -qF "\"./plugins/$p\"" .claude-plugin/marketplace.json || fail "new plugin '$p' isn't listed in .claude-plugin/marketplace.json"
      done
    fi
  else
    warn "Claude Code CLI not found, so plugins weren't validated"
  fi
fi

# ---------- 6. Documentation ----------
echo; echo "== 6. Documentation =="
CODE_CHANGED="$(grep -vE '\.md$' "$CHANGED" | grep -E '^(expense-tracker|plugins)/')"
DOCS_CHANGED="$(grep -E '\.md$' "$CHANGED")"
if [ -n "$CODE_CHANGED" ] && [ -z "$DOCS_CHANGED" ]; then
  note "code changed but no documents did. Check whether README, ARCHITECTURE, TESTING or CLAUDE.md need updating"
else
  pass "documents were updated alongside the code (or only docs changed)"
fi
NEW_TOP="$(grep -E '^[^/]+(/)?' "$ADDED_FILES" | cut -d/ -f1 | sort -u)"
MISSING_README=""
for t in $NEW_TOP; do
  grep -qF "\`$t" README.md 2>/dev/null || MISSING_README="$MISSING_README $t"
done
if [ -n "$MISSING_README" ]; then note "new top-level file/folder not in the README files table:$MISSING_README"; fi

# ---------- Summary ----------
echo
echo "SUMMARY: $PASSES passed, $FAILS failed, $WARNS warnings"
if [ "$FAILS" -gt 0 ]; then echo "RESULT: NOT READY: fix the FAIL lines first"; exit 1; fi
echo "RESULT: automatic checks OK. Now run the website tests and review the diff (see the skill)"
exit 0
