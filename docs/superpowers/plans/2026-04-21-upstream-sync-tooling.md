# Upstream Sync Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a node-based, report-only upstream-sync tool for the `caveman` and `superpowers` adapted plugins, migrate upstream metadata from `UPSTREAM.md` to `upstream.lock.json` + README narrative, and add documented + mechanically-enforced rules for modifying vendored plugins.

**Architecture:** Machine state (pinned SHA, repo URL, tag, last-synced date) lives in a per-plugin `upstream.lock.json`. Human narrative (simplifications + additions) lives in each plugin's `README.md § What's different from upstream`. `scripts/sync-upstream.js` reports diffs against the pinned SHA in default mode, and rewrites only the lock file in `--bump` mode — never auto-applies code changes. `scripts/check-consistency.sh` validates metadata shape and enforces a staged-diff rule that a README change accompany any source change to adapted plugins. Tests use node's built-in `node:test` with shell-built git fixture repos in `$TMPDIR`.

**Tech Stack:** Node.js (built-ins only — `node:child_process`, `node:fs`, `node:path`, `node:test`, `node:assert`), Bash, Git, jq.

**Spec reference:** `docs/superpowers/specs/2026-04-21-upstream-sync-tooling-design.md`

---

## File Structure

### New files
- `plugins/caveman/upstream.lock.json` — machine pin for caveman.
- `plugins/superpowers/upstream.lock.json` — machine pin for superpowers.
- `scripts/sync-upstream.js` — node CLI with report + `--bump` modes.
- `tests/sync-upstream/sync-upstream.test.js` — `node:test` suite.
- `tests/sync-upstream/fixtures/init.sh` — builds scratch upstream + plugin repos per test run.

### Modified files
- `CLAUDE.md` — new "Rules" section; update repo map and conventions table to reference `upstream.lock.json` + README § "What's different from upstream"; rewrite "Upstream sync workflow" section.
- `plugins/caveman/README.md` — expand § "What's different from upstream" into **Simplifications** + **Additions** subsections (content sourced from current `UPSTREAM.md`); rewrite § "Upstream sync" to point at `scripts/sync-upstream.js`.
- `plugins/superpowers/README.md` — same pattern.
- `scripts/check-consistency.sh` — swap `UPSTREAM.md` existence check for `upstream.lock.json` shape validation; assert README contains `## What's different from upstream` heading; add `--staged` flag that enforces R1.
- `.githooks/pre-commit` — pass `--staged` to `check-consistency.sh`.

### Deleted files
- `plugins/caveman/UPSTREAM.md`
- `plugins/superpowers/UPSTREAM.md`

---

## Task 1: Add Rules section + refactor CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Replace the repo map `UPSTREAM.md` line**

Edit `CLAUDE.md` repo map block (around line 7–17). Replace:
```
    UPSTREAM.md                     adapted plugins only — source + pinned SHA + simplifications
```
with:
```
    upstream.lock.json              adapted plugins only — pinned SHA + repo URL (machine state)
    README.md § "What's different…" adapted plugins — human-readable upstream deltas
```

- [ ] **Step 2: Update "Version scheme" paragraph about sync bookkeeping**

Replace the sentence at line 28:
```
When porting a new upstream release: reset the suffix to `.0` and update `UPSTREAM.md`'s `Last synced` line with the new commit SHA.
```
with:
```
When porting a new upstream release: reset the suffix to `.0`, port changes by hand, then run `scripts/sync-upstream.js <plugin> --bump` to rewrite the new SHA/tag/date into `upstream.lock.json`.
```

- [ ] **Step 3: Replace the "Files that must agree" table rows**

Replace the existing table (rows 3 and 4 — `upstream port` and `adding/removing a skill`) with:

```markdown
| If you change...                            | Re-check...                                                                                                        |
|---------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| `plugins/<p>/.claude-plugin/plugin.json`    | `plugins/<p>/README.md` version line, `.claude-plugin/marketplace.json` description if it duplicates.              |
| `.claude-plugin/marketplace.json`           | `README.md` (root) plugin table, per-plugin descriptions.                                                          |
| upstream port                               | `plugins/<p>/upstream.lock.json` via `sync-upstream.js --bump`, `plugin.json` version, README § "What's different from upstream". |
| adding/removing a skill under `skills/`     | `plugins/<p>/README.md` "What's included" and § "What's different from upstream".                                  |
```

- [ ] **Step 4: Replace "Upstream sync workflow" section**

Replace the current 7-step list (lines 58–68) with:

```markdown
## Upstream sync workflow

1. `node scripts/sync-upstream.js <plugin>` — report mode: prints commits since pin, per-file diffs for tracked files, and candidate additions from upstream. Zero writes.
2. Review output with the user. Port desired changes by hand into `plugins/<p>/`.
3. Update `plugins/<p>/README.md` § "What's different from upstream" (Simplifications / Additions subsections) for any behavior change.
4. Run the plugin's tests if they exist (e.g. `plugins/caveman/tests/`). Note absence in commit message otherwise.
5. Bump `plugin.json` version to `NEW_UPSTREAM-5tux.N` only if behavior changed.
6. `node scripts/sync-upstream.js <plugin> --bump` — rewrites `upstream.lock.json` with new SHA, tag, and date.
7. Run `scripts/check-consistency.sh`. Commit.
```

- [ ] **Step 5: Insert new "Rules" section above "Setup after clone"**

Insert after the "Upstream sync workflow" section, before "Setup after clone":

```markdown
## Rules (adapted plugins)

These apply to any commit touching `plugins/caveman/` or `plugins/superpowers/`.

- **R1 — documentation required.** Any commit that modifies an adapted plugin's source (anything under `plugins/<p>/` other than `README.md` and `upstream.lock.json`) must also stage `plugins/<p>/README.md`. Enforced by `scripts/check-consistency.sh --staged` via `.githooks/pre-commit`.
- **R2 — tests required.** Run the plugin's existing tests before committing behavior changes (e.g. `node --test plugins/caveman/tests/` if present). If the plugin has no tests, say so explicitly in the commit message. Advisory — not mechanically enforced.
- **R3 — sync workflow.** Upstream syncs use `sync-upstream.js <plugin>` (report) → manual port → README update → tests → `sync-upstream.js <plugin> --bump`. Lock file shape validated by `check-consistency.sh`.
```

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md
git commit -m "Add Rules section and migrate CLAUDE.md to upstream.lock.json refs"
```

Expected: pre-commit passes (no plugin source changes yet, so R1 inapplicable; consistency checks still pass against current state since UPSTREAM.md files still exist).

---

## Task 2: Create upstream.lock.json for both adapted plugins

**Files:**
- Create: `plugins/caveman/upstream.lock.json`
- Create: `plugins/superpowers/upstream.lock.json`

- [ ] **Step 1: Create caveman lock file**

Write `plugins/caveman/upstream.lock.json`:
```json
{
  "repo": "https://github.com/JuliusBrussee/caveman",
  "pinned_sha": "c2ed24b3e5d412cd0c25197b2bc9af587621fd99",
  "pinned_tag": "v1.6.0",
  "last_synced_date": "2026-04-20",
  "ignore_globs": [
    ".github/**",
    "docs/**",
    "benchmarks/**",
    "evals/**",
    "install.sh",
    "AGENTS.md",
    "GEMINI.md",
    "CLAUDE.md",
    "README.md",
    "LICENSE",
    "CHANGELOG.md",
    "package.json",
    "package-lock.json"
  ]
}
```

(SHA and tag sourced from current `plugins/caveman/UPSTREAM.md`. `ignore_globs` mirrors the simplifications listed there.)

- [ ] **Step 2: Create superpowers lock file**

Write `plugins/superpowers/upstream.lock.json`:
```json
{
  "repo": "https://github.com/obra/superpowers",
  "pinned_sha": "1f20bef3f59b85ad7b52718f822e37c4478a3ff5",
  "pinned_tag": "v5.0.7",
  "last_synced_date": "2026-04-20",
  "ignore_globs": [
    "commands/**",
    "docs/**",
    "tests/**",
    "scripts/**",
    ".github/**",
    "CHANGELOG.md",
    "CODE_OF_CONDUCT.md",
    "RELEASE-NOTES.md",
    "gemini-extension.json",
    "GEMINI.md",
    "package.json",
    "package-lock.json",
    "README.md",
    "LICENSE"
  ]
}
```

- [ ] **Step 3: Validate JSON parses**

Run: `jq empty plugins/caveman/upstream.lock.json && jq empty plugins/superpowers/upstream.lock.json`
Expected: exit 0, no output.

- [ ] **Step 4: Commit**

```bash
git add plugins/caveman/upstream.lock.json plugins/superpowers/upstream.lock.json
git commit -m "Add upstream.lock.json for adapted plugins"
```

---

## Task 3: Migrate upstream narratives into plugin READMEs

**Files:**
- Modify: `plugins/caveman/README.md`
- Modify: `plugins/superpowers/README.md`

- [ ] **Step 1: Rewrite caveman § "What's different from upstream"**

Replace the current § "What's different from upstream" content in `plugins/caveman/README.md` (the paragraph after line 29) with:

```markdown
## What's different from upstream

### Simplifications

- Claude Code only — dropped Codex, Cursor, Windsurf, Cline, Copilot, and Gemini CLI install paths along with their rule/instruction files.
- Kept only the core `caveman` skill. Removed `caveman-commit`, `caveman-review`, `caveman-help`, and `compress`.
- Removed benchmarks, evals, tests, docs, statusline helper, hooks installer scripts, single-file `caveman.skill` distribution, `AGENTS.md` / `GEMINI.md` / `CLAUDE.md` multi-agent configs, and release assets.
- `skills/caveman/SKILL.md` was trimmed (66 → 49 lines) for this marketplace.

### Additions

- Two Claude Code hooks in `.claude-plugin/plugin.json` backed by node scripts under `scripts/`: `SessionStart` announces the active level from config; `UserPromptSubmit` emits a per-turn drift reminder gated by config.
- Persistent user config merged over shipped `config.default.json` (`%APPDATA%\caveman\config.json` on Windows, `~/.config/caveman/config.json` on POSIX). Controls default level, reminder toggle, and permanent off state.
- Agent-driven off-switch intent detection (see `skills/caveman/SKILL.md`) writes via `scripts/set-config.js`.
```

- [ ] **Step 2: Rewrite caveman § "Upstream sync"**

Replace the current § "Upstream sync" content (lines 80–82) with:

```markdown
## Upstream sync

Machine state (repo URL, pinned SHA, tag, last-synced date) lives in [`upstream.lock.json`](upstream.lock.json). Run `node scripts/sync-upstream.js caveman` from the repo root to see what's changed upstream since the pin. See the repo-level [`CLAUDE.md`](../../CLAUDE.md) § "Upstream sync workflow" for the full process.
```

- [ ] **Step 3: Rewrite superpowers § "What's different from upstream"**

Replace the current § "What's different from upstream" content in `plugins/superpowers/README.md` (line 21–23) with:

```markdown
## What's different from upstream

### Simplifications

- Claude Code only — dropped Codex, Cursor, OpenCode, Copilot CLI, and Gemini CLI install paths.
- Removed repo-level scaffolding not used by the plugin bundle: `commands/`, `docs/`, `tests/`, `scripts/`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `RELEASE-NOTES.md`, `gemini-extension.json`, `GEMINI.md`, `package.json`.

### Additions

- `.claude-plugin/plugin.json` with the marketplace version anchor.
- `CLAUDE.md` is retained from upstream for reference — note its PR rules apply to `obra/superpowers`, not to this fork.

Skills, agents, and hooks are byte-identical to upstream `v5.0.7`.
```

- [ ] **Step 4: Rewrite superpowers § "Upstream sync"**

Replace § "Upstream sync" content (lines 57–59) with:

```markdown
## Upstream sync

Machine state (repo URL, pinned SHA, tag, last-synced date) lives in [`upstream.lock.json`](upstream.lock.json). Run `node scripts/sync-upstream.js superpowers` from the repo root to see what's changed upstream since the pin. See the repo-level [`CLAUDE.md`](../../CLAUDE.md) § "Upstream sync workflow" for the full process.
```

- [ ] **Step 5: Commit**

```bash
git add plugins/caveman/README.md plugins/superpowers/README.md
git commit -m "Migrate upstream narratives into plugin READMEs"
```

Note: `check-consistency.sh` still passes because `UPSTREAM.md` files still exist; the consistency script hasn't yet been updated to require `upstream.lock.json`.

---

## Task 4: Delete UPSTREAM.md files

**Files:**
- Delete: `plugins/caveman/UPSTREAM.md`
- Delete: `plugins/superpowers/UPSTREAM.md`

- [ ] **Step 1: Delete both files**

```bash
git rm plugins/caveman/UPSTREAM.md plugins/superpowers/UPSTREAM.md
```

- [ ] **Step 2: Verify `check-consistency.sh` still passes**

Run: `scripts/check-consistency.sh`

Expected output: all three plugins marked `✓` and `all checks passed`. (The existing script checks `UPSTREAM.md` — this will now FAIL for adapted plugins.)

**If it fails as expected** (red `✗` saying `adapted plugin missing UPSTREAM.md`): that's fine — Task 5 fixes the script. Do NOT commit yet. Proceed to Task 5 and bundle Tasks 4+5 into one commit at the end of Task 5.

- [ ] **Step 3: Stage the deletion (do not commit yet)**

```bash
git status
```

Expected: `deleted: plugins/caveman/UPSTREAM.md` and `deleted: plugins/superpowers/UPSTREAM.md` staged. Commit happens at the end of Task 5.

---

## Task 5: Update check-consistency.sh — lock validation + README heading check

**Files:**
- Modify: `scripts/check-consistency.sh`

- [ ] **Step 1: Replace the UPSTREAM.md check block**

In `scripts/check-consistency.sh`, locate the block (around lines 52–57):

```bash
    if is_adapted "$p"; then
        [[ "$version" =~ $version_anchor_re ]] \
            || err "$p: version '$version' doesn't match UPSTREAM-5tux.N scheme"
        [[ -f "$plugin_dir/UPSTREAM.md" ]] \
            || err "$p: adapted plugin missing UPSTREAM.md"
    fi
```

Replace with:

```bash
    if is_adapted "$p"; then
        [[ "$version" =~ $version_anchor_re ]] \
            || err "$p: version '$version' doesn't match UPSTREAM-5tux.N scheme"

        lock="$plugin_dir/upstream.lock.json"
        if [[ ! -f "$lock" ]]; then
            err "$p: adapted plugin missing upstream.lock.json"
        elif ! jq empty "$lock" 2>/dev/null; then
            err "$p: upstream.lock.json is not valid JSON"
        else
            for key in repo pinned_sha pinned_tag last_synced_date; do
                value=$(jq -r ".${key} // empty" "$lock")
                [[ -n "$value" ]] || err "$p: upstream.lock.json missing key '$key'"
            done
            sha=$(jq -r '.pinned_sha' "$lock")
            [[ "$sha" =~ ^[0-9a-f]{40}$ ]] \
                || err "$p: upstream.lock.json pinned_sha '$sha' not a 40-char hex"
        fi

        grep -qE '^## What'"'"'s different from upstream[[:space:]]*$' "$plugin_dir/README.md" \
            || err "$p: README.md missing '## What'\\''s different from upstream' heading"
    fi
```

- [ ] **Step 2: Run the updated script**

Run: `scripts/check-consistency.sh`

Expected: `caveman` and `superpowers` marked `✓` with their version numbers, `all checks passed`. (The old UPSTREAM.md check is gone; new lock.json check passes because Task 2 created the files.)

- [ ] **Step 3: Smoke-test failure path — temporarily break caveman lock**

```bash
mv plugins/caveman/upstream.lock.json /tmp/caveman-lock-backup.json
scripts/check-consistency.sh; echo "exit=$?"
mv /tmp/caveman-lock-backup.json plugins/caveman/upstream.lock.json
```

Expected: script prints `✗ caveman: adapted plugin missing upstream.lock.json` and exits non-zero.

- [ ] **Step 4: Smoke-test failure path — break pinned_sha format**

```bash
cp plugins/caveman/upstream.lock.json /tmp/caveman-lock-backup.json
jq '.pinned_sha = "not-a-sha"' /tmp/caveman-lock-backup.json > plugins/caveman/upstream.lock.json
scripts/check-consistency.sh; echo "exit=$?"
cp /tmp/caveman-lock-backup.json plugins/caveman/upstream.lock.json
rm /tmp/caveman-lock-backup.json
```

Expected: script prints `✗ caveman: upstream.lock.json pinned_sha 'not-a-sha' not a 40-char hex` and exits non-zero.

- [ ] **Step 5: Commit (bundles Task 4 deletion + Task 5 script update)**

```bash
git add -u scripts/check-consistency.sh plugins/caveman/UPSTREAM.md plugins/superpowers/UPSTREAM.md
git commit -m "Validate upstream.lock.json shape and drop UPSTREAM.md"
```

Expected: consistency check passes as pre-commit hook. Commit succeeds.

---

## Task 6: Add --staged flag to check-consistency.sh (R1 enforcement)

**Files:**
- Modify: `scripts/check-consistency.sh`
- Modify: `.githooks/pre-commit`

- [ ] **Step 1: Add argument parsing at top of check-consistency.sh**

In `scripts/check-consistency.sh`, after the `set -euo pipefail` line and before `repo_root=`, insert:

```bash
staged_mode=0
for arg in "$@"; do
    case "$arg" in
        --staged) staged_mode=1 ;;
        *) printf 'unknown arg: %s\n' "$arg" >&2; exit 2 ;;
    esac
done
```

- [ ] **Step 2: Add the R1 enforcement block at end of script (before the final fail check)**

Insert before the `if [[ $fail -ne 0 ]]; then` block at the bottom of the script:

```bash
if [[ "$staged_mode" -eq 1 ]]; then
    echo "» R1: adapted plugin source changes need a staged README.md"
    mapfile -t staged < <(git diff --cached --name-only --diff-filter=ACMRD)
    for p in "${adapted_plugins[@]}"; do
        readme="plugins/$p/README.md"
        lock="plugins/$p/upstream.lock.json"
        touched_source=0
        touched_readme=0
        for f in "${staged[@]}"; do
            [[ "$f" == plugins/"$p"/* ]] || continue
            if [[ "$f" == "$readme" ]]; then
                touched_readme=1
            elif [[ "$f" == "$lock" ]]; then
                :
            else
                touched_source=1
            fi
        done
        if [[ $touched_source -eq 1 && $touched_readme -eq 0 ]]; then
            err "$p: source changed but $readme not staged (R1)"
        elif [[ $touched_source -eq 1 ]]; then
            ok "$p R1 (source + README both staged)"
        fi
    done
fi
```

- [ ] **Step 3: Verify non-staged invocation still works**

Run: `scripts/check-consistency.sh`

Expected: all three plugins `✓`, no R1 section printed, `all checks passed`.

- [ ] **Step 4: Verify --staged with no plugin changes passes**

Run: `scripts/check-consistency.sh --staged`

Expected: R1 section header prints, no plugin flagged (nothing staged under `plugins/<adapted>/`), `all checks passed`.

- [ ] **Step 5: Simulate R1 violation**

```bash
# Make a fake source change without touching README:
echo "# noop" >> plugins/caveman/skills/caveman/SKILL.md
git add plugins/caveman/skills/caveman/SKILL.md
scripts/check-consistency.sh --staged; echo "exit=$?"
# Clean up:
git restore --staged plugins/caveman/skills/caveman/SKILL.md
git checkout -- plugins/caveman/skills/caveman/SKILL.md
```

Expected: `✗ caveman: source changed but plugins/caveman/README.md not staged (R1)`, exit 1.

- [ ] **Step 6: Wire .githooks/pre-commit to pass --staged**

Replace contents of `.githooks/pre-commit` with:

```bash
#!/usr/bin/env bash
# Runs repo consistency checks before each commit.
# Install once per clone: git config core.hooksPath .githooks
exec "$(git rev-parse --show-toplevel)/scripts/check-consistency.sh" --staged
```

- [ ] **Step 7: Commit**

```bash
git add scripts/check-consistency.sh .githooks/pre-commit
git commit -m "Enforce R1 via check-consistency.sh --staged in pre-commit"
```

Expected: pre-commit passes (only `scripts/` and `.githooks/` files staged, no adapted-plugin source touched).

---

## Task 7: Write fixture builder for sync-upstream tests

**Files:**
- Create: `tests/sync-upstream/fixtures/init.sh`

- [ ] **Step 1: Create the fixtures directory**

```bash
mkdir -p tests/sync-upstream/fixtures
```

- [ ] **Step 2: Write init.sh — builds fake upstream + plugin snapshot in a caller-supplied directory**

Write `tests/sync-upstream/fixtures/init.sh`:

```bash
#!/usr/bin/env bash
# Builds two git repos in $1:
#   $1/upstream/      — fake upstream with 3 commits
#   $1/plugin-root/   — fake repo containing plugins/fake-plugin/ pinned to c1
#
# Designed to be re-runnable: wipes $1 first.

set -euo pipefail

base="${1:?usage: init.sh <target-dir>}"
rm -rf "$base"
mkdir -p "$base"

# ─── fake upstream ────────────────────────────────────────────────
up="$base/upstream"
mkdir -p "$up"
cd "$up"
git init -q -b main
git config user.email test@example.com
git config user.name test

mkdir -p skills/foo
cat > skills/foo/SKILL.md <<'EOF'
initial foo skill content
EOF
cat > install.sh <<'EOF'
#!/usr/bin/env bash
echo install
EOF
cat > README.md <<'EOF'
upstream readme
EOF
mkdir -p docs
cat > docs/guide.md <<'EOF'
original guide
EOF
git add -A
git commit -q -m "c1: initial"
c1=$(git rev-parse HEAD)
echo "$c1" > "$base/c1.sha"

cat > skills/foo/SKILL.md <<'EOF'
updated foo skill content
with a second line
EOF
mkdir -p skills/bar
cat > skills/bar/SKILL.md <<'EOF'
new bar skill
EOF
git add -A
git commit -q -m "c2: update foo, add bar"
echo "$(git rev-parse HEAD)" > "$base/c2.sha"

cat > docs/guide.md <<'EOF'
updated guide
EOF
git add -A
git commit -q -m "c3: update guide"
echo "$(git rev-parse HEAD)" > "$base/c3.sha"

# ─── fake plugin root ─────────────────────────────────────────────
root="$base/plugin-root"
mkdir -p "$root/plugins/fake-plugin/skills/foo"
mkdir -p "$root/plugins/fake-plugin/scripts"
cd "$root"
git init -q -b main
git config user.email test@example.com
git config user.name test

cat > plugins/fake-plugin/skills/foo/SKILL.md <<'EOF'
initial foo skill content
EOF
cat > plugins/fake-plugin/scripts/our-custom.js <<'EOF'
// ours-only, not in upstream
EOF
cat > plugins/fake-plugin/README.md <<'EOF'
# fake-plugin

## What's different from upstream

test fixture
EOF

# Lock file pinned at c1 by default; tests may overwrite.
cat > plugins/fake-plugin/upstream.lock.json <<EOF
{
  "repo": "$up",
  "pinned_sha": "$c1",
  "pinned_tag": "c1",
  "last_synced_date": "2026-01-01",
  "ignore_globs": ["install.sh", "README.md"]
}
EOF

git add -A
git commit -q -m "initial fake plugin"
```

- [ ] **Step 3: Make init.sh executable**

```bash
chmod +x tests/sync-upstream/fixtures/init.sh
```

- [ ] **Step 4: Smoke-test the fixture builder**

```bash
tmp=$(mktemp -d)
bash tests/sync-upstream/fixtures/init.sh "$tmp"
ls "$tmp" "$tmp/upstream" "$tmp/plugin-root/plugins/fake-plugin"
cat "$tmp/c1.sha" "$tmp/c2.sha" "$tmp/c3.sha"
rm -rf "$tmp"
```

Expected: `$tmp/upstream/` and `$tmp/plugin-root/plugins/fake-plugin/` both populated; three distinct 40-char SHAs printed.

- [ ] **Step 5: Commit**

```bash
git add tests/sync-upstream/fixtures/init.sh
git commit -m "Add sync-upstream fixture builder"
```

---

## Task 8: Create test harness + first failing test (report up-to-date)

**Files:**
- Create: `tests/sync-upstream/sync-upstream.test.js`

- [ ] **Step 1: Write the test file with one test**

Write `tests/sync-upstream/sync-upstream.test.js`:

```javascript
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync, readFileSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const REPO_ROOT = resolve(__dirname, '..', '..');
const SCRIPT = join(REPO_ROOT, 'scripts', 'sync-upstream.js');
const INIT = join(REPO_ROOT, 'tests', 'sync-upstream', 'fixtures', 'init.sh');

let fixtureDir;

before(() => {
    fixtureDir = mkdtempSync(join(tmpdir(), 'sync-upstream-'));
    const r = spawnSync('bash', [INIT, fixtureDir], { encoding: 'utf8' });
    if (r.status !== 0) {
        throw new Error(`init.sh failed: ${r.stderr}`);
    }
});

after(() => {
    if (fixtureDir) rmSync(fixtureDir, { recursive: true, force: true });
});

function runSync(args, { cwd } = {}) {
    return spawnSync('node', [SCRIPT, ...args], {
        encoding: 'utf8',
        cwd: cwd ?? join(fixtureDir, 'plugin-root'),
    });
}

function setLockSha(sha) {
    const lockPath = join(fixtureDir, 'plugin-root', 'plugins', 'fake-plugin', 'upstream.lock.json');
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
    lock.pinned_sha = sha;
    writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
}

function readSha(name) {
    return readFileSync(join(fixtureDir, `${name}.sha`), 'utf8').trim();
}

test('report mode is up-to-date when lock points at HEAD', () => {
    setLockSha(readSha('c3'));
    const r = runSync(['fake-plugin']);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /no changes/i);
});
```

- [ ] **Step 2: Run the test to confirm it fails**

Run: `node --test tests/sync-upstream/sync-upstream.test.js`

Expected: FAIL — test errors because `scripts/sync-upstream.js` doesn't exist yet. Error resembles `Cannot find module '…/scripts/sync-upstream.js'` or `ENOENT`.

---

## Task 9: Implement sync-upstream.js skeleton — read lock, clone upstream, detect up-to-date

**Files:**
- Create: `scripts/sync-upstream.js`

- [ ] **Step 1: Write the minimal script to pass Task 8's test**

Write `scripts/sync-upstream.js`:

```javascript
#!/usr/bin/env node
'use strict';

const { spawnSync } = require('node:child_process');
const { readFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');

function die(msg, code = 1) {
    process.stderr.write(`sync-upstream: ${msg}\n`);
    process.exit(code);
}

function parseArgs(argv) {
    const args = { plugin: null, bump: false };
    for (const a of argv) {
        if (a === '--bump') args.bump = true;
        else if (a.startsWith('--')) die(`unknown flag: ${a}`, 2);
        else if (!args.plugin) args.plugin = a;
        else die(`unexpected positional arg: ${a}`, 2);
    }
    if (!args.plugin) die('usage: sync-upstream.js <plugin> [--bump]', 2);
    return args;
}

function loadLock(pluginDir) {
    const lockPath = join(pluginDir, 'upstream.lock.json');
    if (!existsSync(lockPath)) die(`missing ${lockPath}`);
    try {
        return { path: lockPath, data: JSON.parse(readFileSync(lockPath, 'utf8')) };
    } catch (e) {
        die(`invalid JSON in ${lockPath}: ${e.message}`);
    }
}

function git(args, opts = {}) {
    const r = spawnSync('git', args, { encoding: 'utf8', ...opts });
    if (r.status !== 0) {
        die(`git ${args.join(' ')} failed: ${r.stderr.trim() || r.stdout.trim()}`);
    }
    return r.stdout;
}

function cloneUpstream(repo) {
    const dir = mkdtempSync(join(tmpdir(), 'sync-upstream-'));
    git(['clone', '--quiet', repo, dir]);
    return dir;
}

function listTrackedFiles(repoRoot, subdir) {
    const out = git(['-C', repoRoot, 'ls-files', subdir]);
    return out.split('\n').filter(Boolean);
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const repoRoot = process.cwd();
    const pluginDir = join(repoRoot, 'plugins', args.plugin);
    if (!existsSync(pluginDir)) die(`plugin dir not found: ${pluginDir}`);

    const lock = loadLock(pluginDir);
    const { repo, pinned_sha } = lock.data;

    const upstream = cloneUpstream(repo);
    try {
        const headSha = git(['-C', upstream, 'rev-parse', 'HEAD']).trim();
        if (headSha === pinned_sha) {
            process.stdout.write(`no changes. upstream HEAD == pinned (${pinned_sha.slice(0, 10)}).\n`);
            return;
        }
        // Task 10 adds the diff path. For now, just log.
        process.stdout.write(`upstream has moved: ${pinned_sha.slice(0, 10)} → ${headSha.slice(0, 10)}\n`);
    } finally {
        rmSync(upstream, { recursive: true, force: true });
    }
}

main();
```

- [ ] **Step 2: Make the script executable**

```bash
chmod +x scripts/sync-upstream.js
```

- [ ] **Step 3: Run the test — it should now pass**

Run: `node --test tests/sync-upstream/sync-upstream.test.js`

Expected: PASS — 1 test passing, 0 failing.

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-upstream.js tests/sync-upstream/sync-upstream.test.js
git commit -m "Implement sync-upstream report up-to-date path with test"
```

---

## Task 10: Add test + impl for report-with-changes (commits list + per-file diffs + candidate additions)

**Files:**
- Modify: `tests/sync-upstream/sync-upstream.test.js`
- Modify: `scripts/sync-upstream.js`

- [ ] **Step 1: Append three tests to the test file**

Append to `tests/sync-upstream/sync-upstream.test.js` after the existing test:

```javascript
test('report shows commits, changed files, and candidate additions when behind', () => {
    setLockSha(readSha('c1'));
    const r = runSync(['fake-plugin']);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);
    assert.match(r.stdout, /c2: update foo, add bar/, 'lists c2 commit message');
    assert.match(r.stdout, /c3: update guide/, 'lists c3 commit message');
    assert.match(r.stdout, /skills\/foo\/SKILL\.md/, 'shows changed tracked file');
    assert.match(r.stdout, /updated foo skill content/, 'shows diff content of changed file');
    assert.match(r.stdout, /skills\/bar\/SKILL\.md/, 'flags new upstream file as candidate addition');
});

test('our-only files never appear in output', () => {
    setLockSha(readSha('c1'));
    const r = runSync(['fake-plugin']);
    assert.equal(r.status, 0);
    assert.doesNotMatch(r.stdout, /our-custom\.js/, 'ours-only file suppressed');
});

test('files in ignore_globs are excluded from candidate additions', () => {
    setLockSha(readSha('c1'));
    const r = runSync(['fake-plugin']);
    assert.equal(r.status, 0);
    assert.doesNotMatch(r.stdout, /install\.sh/, 'install.sh filtered by ignore_globs');
    assert.doesNotMatch(r.stdout, /^\s*README\.md\s*$/m, 'README.md filtered by ignore_globs');
});
```

- [ ] **Step 2: Run the tests to confirm the new ones fail**

Run: `node --test tests/sync-upstream/sync-upstream.test.js`

Expected: first test passes, three new tests fail (the current impl only prints a one-liner, no commits/diffs/candidates).

- [ ] **Step 3: Extend `scripts/sync-upstream.js` to produce the report**

In `scripts/sync-upstream.js`:

1. Add a glob-matching helper below `listTrackedFiles`:

```javascript
function globToRegExp(glob) {
    // Minimal ** / * support — sufficient for our ignore_globs shape.
    let re = '';
    let i = 0;
    while (i < glob.length) {
        const c = glob[i];
        if (c === '*' && glob[i + 1] === '*') {
            re += '.*';
            i += 2;
            if (glob[i] === '/') i += 1;
        } else if (c === '*') {
            re += '[^/]*';
            i += 1;
        } else if (c === '?') {
            re += '[^/]';
            i += 1;
        } else if (/[.+^${}()|[\]\\]/.test(c)) {
            re += '\\' + c;
            i += 1;
        } else {
            re += c;
            i += 1;
        }
    }
    return new RegExp('^' + re + '$');
}

function matchesAny(path, globs) {
    return globs.some((g) => globToRegExp(g).test(path));
}
```

2. Replace the entire block inside `try { ... }` in `main()` (from `const headSha = …` through the second `process.stdout.write(...)`) with:

```javascript
        const headSha = git(['-C', upstream, 'rev-parse', 'HEAD']).trim();
        if (headSha === pinned_sha) {
            process.stdout.write(`no changes. upstream HEAD == pinned (${pinned_sha.slice(0, 10)}).\n`);
            return;
        }

        const ignoreGlobs = Array.isArray(lock.data.ignore_globs) ? lock.data.ignore_globs : [];
        const pluginRel = `plugins/${args.plugin}`;
        const ourFiles = new Set(
            listTrackedFiles(repoRoot, pluginRel).map((f) =>
                f.startsWith(pluginRel + '/') ? f.slice(pluginRel.length + 1) : f
            )
        );
        const upstreamFiles = new Set(listTrackedFiles(upstream, '.').map((f) => f.replace(/^\.\//, '')));

        const changedBoth = [];
        for (const f of ourFiles) {
            if (!upstreamFiles.has(f)) continue;
            const diff = git(
                ['-C', upstream, 'diff', '--no-color', `${pinned_sha}..${headSha}`, '--', f],
                { maxBuffer: 50 * 1024 * 1024 }
            );
            if (diff.trim()) changedBoth.push({ file: f, diff });
        }

        const candidates = [...upstreamFiles]
            .filter((f) => !ourFiles.has(f))
            .filter((f) => !matchesAny(f, ignoreGlobs))
            .sort();

        const commits = git([
            '-C', upstream, 'log', '--oneline', '--no-color', `${pinned_sha}..${headSha}`,
        ]);

        process.stdout.write(`== sync-upstream: ${args.plugin} ==\n`);
        process.stdout.write(`pinned: ${pinned_sha.slice(0, 10)}  upstream HEAD: ${headSha.slice(0, 10)}\n\n`);
        process.stdout.write('-- commits since pin --\n');
        process.stdout.write(commits || '(none)\n');
        process.stdout.write('\n-- changed files (tracked both sides) --\n');
        if (changedBoth.length === 0) process.stdout.write('(none)\n');
        for (const c of changedBoth) {
            process.stdout.write(`\n### ${c.file}\n`);
            process.stdout.write(c.diff);
        }
        process.stdout.write('\n-- candidate additions (upstream files we do not ship) --\n');
        if (candidates.length === 0) process.stdout.write('(none)\n');
        else for (const f of candidates) process.stdout.write(`  ${f}\n`);
        process.stdout.write('\nNext: port by hand, update README "What\'s different from upstream", run tests, then sync-upstream.js <plugin> --bump.\n');
```

- [ ] **Step 4: Run tests — all four should now pass**

Run: `node --test tests/sync-upstream/sync-upstream.test.js`

Expected: all four tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-upstream.js tests/sync-upstream/sync-upstream.test.js
git commit -m "Report commits, tracked-file diffs, and candidate additions"
```

---

## Task 11: Add --bump mode + tests

**Files:**
- Modify: `tests/sync-upstream/sync-upstream.test.js`
- Modify: `scripts/sync-upstream.js`

- [ ] **Step 1: Append bump tests**

Append to `tests/sync-upstream/sync-upstream.test.js`:

```javascript
test('--bump rewrites lock to upstream HEAD sha/tag/date', () => {
    setLockSha(readSha('c1'));
    const lockPath = join(fixtureDir, 'plugin-root', 'plugins', 'fake-plugin', 'upstream.lock.json');
    const before = JSON.parse(readFileSync(lockPath, 'utf8'));

    const r = runSync(['fake-plugin', '--bump']);
    assert.equal(r.status, 0, `stderr: ${r.stderr}`);

    const after = JSON.parse(readFileSync(lockPath, 'utf8'));
    assert.equal(after.pinned_sha, readSha('c3'));
    assert.equal(after.repo, before.repo);
    assert.ok(after.pinned_tag, 'pinned_tag populated');
    assert.match(after.last_synced_date, /^\d{4}-\d{2}-\d{2}$/);
});

test('--bump on up-to-date pin is a no-op sha-wise', () => {
    setLockSha(readSha('c3'));
    const lockPath = join(fixtureDir, 'plugin-root', 'plugins', 'fake-plugin', 'upstream.lock.json');

    const r = runSync(['fake-plugin', '--bump']);
    assert.equal(r.status, 0);

    const after = JSON.parse(readFileSync(lockPath, 'utf8'));
    assert.equal(after.pinned_sha, readSha('c3'));
});
```

- [ ] **Step 2: Run tests — confirm bump tests fail**

Run: `node --test tests/sync-upstream/sync-upstream.test.js`

Expected: report tests pass, both bump tests fail (`--bump` path not implemented yet; the script currently ignores the flag after parsing).

- [ ] **Step 3: Wire --bump handling in sync-upstream.js**

In `scripts/sync-upstream.js`, replace the `main()` function body. Find the existing `main()` (starts with `const args = parseArgs(...)`) and replace everything inside `try { ... } finally { ... }` so that it branches on `args.bump`.

New `main()` body (replace the whole function):

```javascript
function today() {
    return new Date().toISOString().slice(0, 10);
}

function describeTag(upstream, sha) {
    const r = spawnSync('git', ['-C', upstream, 'describe', '--tags', '--exact-match', sha], {
        encoding: 'utf8',
    });
    if (r.status === 0) return r.stdout.trim();
    // Fall back: nearest reachable tag, if any.
    const r2 = spawnSync('git', ['-C', upstream, 'describe', '--tags', '--always', sha], {
        encoding: 'utf8',
    });
    return r2.status === 0 ? r2.stdout.trim() : sha.slice(0, 10);
}

function writeLock(lock, data) {
    writeFileSync(lock.path, JSON.stringify(data, null, 2) + '\n');
}

function runBump(lock, upstream, args) {
    const headSha = git(['-C', upstream, 'rev-parse', 'HEAD']).trim();
    const tag = describeTag(upstream, headSha);
    const next = {
        ...lock.data,
        pinned_sha: headSha,
        pinned_tag: tag,
        last_synced_date: today(),
    };
    writeLock(lock, next);
    process.stdout.write(`pin bumped: ${lock.data.pinned_sha.slice(0, 10)} → ${headSha.slice(0, 10)} (${tag}).\n`);
    process.stdout.write('don\'t forget to update plugin.json version if behavior changed.\n');
}

function runReport(lock, upstream, args, repoRoot) {
    const { pinned_sha } = lock.data;
    const headSha = git(['-C', upstream, 'rev-parse', 'HEAD']).trim();
    if (headSha === pinned_sha) {
        process.stdout.write(`no changes. upstream HEAD == pinned (${pinned_sha.slice(0, 10)}).\n`);
        return;
    }

    const ignoreGlobs = Array.isArray(lock.data.ignore_globs) ? lock.data.ignore_globs : [];
    const pluginRel = `plugins/${args.plugin}`;
    const ourFiles = new Set(
        listTrackedFiles(repoRoot, pluginRel).map((f) =>
            f.startsWith(pluginRel + '/') ? f.slice(pluginRel.length + 1) : f
        )
    );
    const upstreamFiles = new Set(listTrackedFiles(upstream, '.').map((f) => f.replace(/^\.\//, '')));

    const changedBoth = [];
    for (const f of ourFiles) {
        if (!upstreamFiles.has(f)) continue;
        const diff = git(
            ['-C', upstream, 'diff', '--no-color', `${pinned_sha}..${headSha}`, '--', f],
            { maxBuffer: 50 * 1024 * 1024 }
        );
        if (diff.trim()) changedBoth.push({ file: f, diff });
    }

    const candidates = [...upstreamFiles]
        .filter((f) => !ourFiles.has(f))
        .filter((f) => !matchesAny(f, ignoreGlobs))
        .sort();

    const commits = git([
        '-C', upstream, 'log', '--oneline', '--no-color', `${pinned_sha}..${headSha}`,
    ]);

    process.stdout.write(`== sync-upstream: ${args.plugin} ==\n`);
    process.stdout.write(`pinned: ${pinned_sha.slice(0, 10)}  upstream HEAD: ${headSha.slice(0, 10)}\n\n`);
    process.stdout.write('-- commits since pin --\n');
    process.stdout.write(commits || '(none)\n');
    process.stdout.write('\n-- changed files (tracked both sides) --\n');
    if (changedBoth.length === 0) process.stdout.write('(none)\n');
    for (const c of changedBoth) {
        process.stdout.write(`\n### ${c.file}\n`);
        process.stdout.write(c.diff);
    }
    process.stdout.write('\n-- candidate additions (upstream files we do not ship) --\n');
    if (candidates.length === 0) process.stdout.write('(none)\n');
    else for (const f of candidates) process.stdout.write(`  ${f}\n`);
    process.stdout.write('\nNext: port by hand, update README "What\'s different from upstream", run tests, then sync-upstream.js <plugin> --bump.\n');
}

function main() {
    const args = parseArgs(process.argv.slice(2));
    const repoRoot = process.cwd();
    const pluginDir = join(repoRoot, 'plugins', args.plugin);
    if (!existsSync(pluginDir)) die(`plugin dir not found: ${pluginDir}`);

    const lock = loadLock(pluginDir);
    const upstream = cloneUpstream(lock.data.repo);
    try {
        if (args.bump) runBump(lock, upstream, args);
        else runReport(lock, upstream, args, repoRoot);
    } finally {
        rmSync(upstream, { recursive: true, force: true });
    }
}

main();
```

- [ ] **Step 4: Run all tests — all six should pass**

Run: `node --test tests/sync-upstream/sync-upstream.test.js`

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-upstream.js tests/sync-upstream/sync-upstream.test.js
git commit -m "Add --bump mode to sync-upstream"
```

---

## Task 12: Add error-case tests

**Files:**
- Modify: `tests/sync-upstream/sync-upstream.test.js`

- [ ] **Step 1: Append error-case tests**

Append to `tests/sync-upstream/sync-upstream.test.js`:

```javascript
test('missing lock file produces useful error', () => {
    const r = spawnSync('node', [SCRIPT, 'no-such-plugin'], {
        encoding: 'utf8',
        cwd: join(fixtureDir, 'plugin-root'),
    });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /plugin dir not found/i);
});

test('lock with invalid JSON produces useful error', () => {
    const lockPath = join(fixtureDir, 'plugin-root', 'plugins', 'fake-plugin', 'upstream.lock.json');
    const backup = readFileSync(lockPath, 'utf8');
    writeFileSync(lockPath, '{ not json');
    try {
        const r = runSync(['fake-plugin']);
        assert.notEqual(r.status, 0);
        assert.match(r.stderr, /invalid JSON/i);
    } finally {
        writeFileSync(lockPath, backup);
    }
});

test('unknown flag exits non-zero', () => {
    const r = runSync(['fake-plugin', '--bogus']);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /unknown flag/i);
});
```

- [ ] **Step 2: Run tests**

Run: `node --test tests/sync-upstream/sync-upstream.test.js`

Expected: 9 tests pass (6 existing + 3 new). The error paths are already covered by `die()` in the script; no impl change needed.

- [ ] **Step 3: Commit**

```bash
git add tests/sync-upstream/sync-upstream.test.js
git commit -m "Test sync-upstream error paths"
```

---

## Task 13: Run sync against caveman and handle result

**Files (possibly):**
- Modify: `plugins/caveman/README.md`
- Modify: `plugins/caveman/upstream.lock.json`
- Modify: `plugins/caveman/.claude-plugin/plugin.json` (only if behavior changed)
- Modify: `plugins/caveman/skills/...` (only if behavior ported)

- [ ] **Step 1: Run report mode**

```bash
node scripts/sync-upstream.js caveman | tee /tmp/caveman-sync-report.txt
```

Expected: either `no changes` (SHA still current) OR a full report with commits + diffs + candidate additions.

- [ ] **Step 2: Present report to the human partner**

**STOP. Do not port anything automatically.** Copy the report contents into a response to the user and ask:
> "Here's what upstream caveman has changed since `c2ed24b`. Which (if any) of these changes should I port into `plugins/caveman/`? For each one, say port/skip. Candidate additions need an explicit decision too — leave out = skip."

- [ ] **Step 3: Apply ports per user's decisions (only if any)**

For each file the user approves:
- Use `Edit` to update `plugins/caveman/<file>` with the upstream version (the report shows the diff; apply it directly). For candidate additions, `Write` the file.
- If the port changes behavior, update `plugins/caveman/README.md` § "What's different from upstream" Simplifications/Additions subsections to reflect the new state (e.g. move an item out of Simplifications if we now ship it).

- [ ] **Step 4: Run caveman's tests (if any changes were made)**

```bash
ls plugins/caveman/tests/ 2>/dev/null
```

If tests exist, run them with the command the caveman plugin's test layout uses (inspect first if unclear).

- [ ] **Step 5: Bump plugin.json version if behavior changed**

If any behavior changed:
- Read current version in `plugins/caveman/.claude-plugin/plugin.json`.
- Bump `5tux.N`: e.g. `1.6.0-5tux.4` → `1.6.0-5tux.5`. If upstream tag changed (e.g. `v1.6.1`), reset to `1.6.1-5tux.0`.
- Update version line in `plugins/caveman/README.md` to match.

- [ ] **Step 6: Run --bump to refresh the lock**

```bash
node scripts/sync-upstream.js caveman --bump
```

Expected: stdout reports SHA transition. `plugins/caveman/upstream.lock.json` `pinned_sha`, `pinned_tag`, `last_synced_date` all updated.

- [ ] **Step 7: Run consistency check**

```bash
scripts/check-consistency.sh
```

Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add plugins/caveman/
git commit -m "Sync caveman with upstream <upstream-version>"
```

If no ports happened and the pin hasn't changed, skip the commit entirely (nothing to record). If only the lock bumped (same SHA, new date), still commit with message `"Refresh caveman upstream.lock.json timestamp"`.

---

## Task 14: Run sync against superpowers and handle result

**Files (possibly):**
- Modify: `plugins/superpowers/README.md`
- Modify: `plugins/superpowers/upstream.lock.json`
- Modify: `plugins/superpowers/.claude-plugin/plugin.json`
- Modify: `plugins/superpowers/<any ported file>`

- [ ] **Step 1: Run report mode**

```bash
node scripts/sync-upstream.js superpowers | tee /tmp/superpowers-sync-report.txt
```

- [ ] **Step 2: Present report to the human partner**

Same template as Task 13 Step 2, but for superpowers (`1f20bef` baseline).

- [ ] **Step 3: Apply approved ports**

Per user's decisions. Same pattern as Task 13 Step 3. Note superpowers has no plugin-level test suite — R2 requires stating this in the commit message.

- [ ] **Step 4: Bump plugin.json version if behavior changed**

Pattern matches Task 13 Step 5. Current version: `5.0.7-5tux.1`.

- [ ] **Step 5: Run --bump**

```bash
node scripts/sync-upstream.js superpowers --bump
```

- [ ] **Step 6: Run consistency check**

```bash
scripts/check-consistency.sh
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add plugins/superpowers/
git commit -m "Sync superpowers with upstream <upstream-version> (plugin has no tests per R2)"
```

Skip entirely if no changes. Skip R2 note if behavior didn't change.

---

## Self-Review

**Spec coverage** — spec items → task mapping:

- Metadata split (lock.json + README narrative) → Tasks 2, 3, 4.
- Rules in CLAUDE.md (R1/R2/R3) → Task 1 Step 5.
- R1 enforcement → Tasks 5, 6.
- sync-upstream.js report mode → Tasks 9, 10.
- sync-upstream.js --bump mode → Task 11.
- node:test + fixture → Tasks 7, 8, 10, 11, 12.
- check-consistency.sh lock validation + README marker → Task 5.
- First sync execution → Tasks 13, 14.

**Placeholder scan** — no "TBD", no "appropriate error handling", no "similar to Task N" references without code. All code steps include full code.

**Type/name consistency** — `lock.data.pinned_sha`, `lock.data.repo`, `lock.data.ignore_globs` consistent across tasks. `runReport`/`runBump` signatures match the call sites. Lock file keys (`repo`, `pinned_sha`, `pinned_tag`, `last_synced_date`, `ignore_globs`) identical in spec, lock-file creation (Task 2), check-consistency update (Task 5), and script (Task 9+).

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-04-21-upstream-sync-tooling.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

**Which approach?**
