# Upstream sync tooling + third-party plugin rules

**Date:** 2026-04-21
**Status:** approved (brainstorming)

## Problem

The `co-intelligence` marketplace vendors two adapted upstreams (`caveman`, `superpowers`). Today, sync with upstream is fully manual and there is no mechanical rule that ensures modifications to vendored code are documented or tested. Per-plugin metadata is split between `UPSTREAM.md` (human narrative + pinned SHA) and the per-plugin README "What's different from upstream" section, producing duplication and drift risk.

## Goals

1. One source of truth per concern for upstream tracking (machine pin vs. human narrative).
2. Explicit, documented behaviors required when modifying vendored plugins, with mechanical enforcement where cheap.
3. A scripted, testable, non-destructive sync workflow that lowers the cost of staying current with upstream.
4. Execute one sync cycle for both adapted plugins using the new tool.

## Non-goals

- Automating code ports from upstream into `plugins/<p>/`. All porting stays manual.
- Automating `plugin.json` version bumps. The `5tux.N` counter is a human judgement.
- Running or enforcing tests from the pre-commit hook (too much false-positive risk).
- Parsing markdown to drive tooling behavior. Machine state lives in JSON.

## Design

### Metadata split

Remove `plugins/<p>/UPSTREAM.md`. Replace with two single-purpose surfaces:

- `plugins/<p>/upstream.lock.json` — machine truth, rewritten by `sync-upstream.js --bump`.
  ```json
  {
    "repo": "https://github.com/JuliusBrussee/caveman",
    "pinned_sha": "c2ed24b3e5d412cd0c25197b2bc9af587621fd99",
    "pinned_tag": "v1.6.0",
    "last_synced_date": "2026-04-20",
    "ignore_globs": ["install.sh", "docs/**", ".github/**"]
  }
  ```
  `ignore_globs` is optional; when present it filters the "candidate additions" section in report mode.

- `plugins/<p>/README.md` § "What's different from upstream" — human narrative. Two subsections:
  - **Simplifications** — what was dropped from upstream.
  - **Additions** — what this marketplace layers on top (e.g. caveman's node hooks, config persistence).

The README's existing § 7 "Upstream sync" retains a short pointer to `scripts/sync-upstream.js` (replaces old `UPSTREAM.md` "To sync" paragraph).

### Rules in CLAUDE.md

Add a new "Rules" section (distinct from the existing "conventions" content). Three rules:

- **R1 — documentation required.** Any commit that modifies `plugins/<adapted>/` beyond `README.md` and `upstream.lock.json` must also stage `plugins/<adapted>/README.md`. Enforced via `check-consistency.sh --staged` in `.githooks/pre-commit`.
- **R2 — tests required.** Any change to vendored plugin source must run that plugin's existing tests before commit (e.g. `plugins/caveman/tests/`). If the plugin has no tests, the commit message must state so. Advisory — not mechanically enforced.
- **R3 — sync workflow.** Upstream syncs use `sync-upstream.js <p>` → manual port → update README "What's different" → run tests → `sync-upstream.js <p> --bump`. Enforced partially: `upstream.lock.json` shape/format validated by `check-consistency.sh`.

### `scripts/sync-upstream.js`

Node, no runtime deps. Two modes:

**Report mode (default):**
1. Read `plugins/<p>/upstream.lock.json` → `{repo, pinned_sha, ignore_globs?}`.
2. Shallow-clone `repo` into `/tmp/sync-upstream-<p>-<pid>/`, cleanup on exit (including failure paths).
3. Resolve upstream HEAD SHA and tag (`git describe --tags --always`).
4. Compute include-set = intersection of `git ls-files` under `plugins/<p>/` and files at upstream HEAD.
5. Print:
   - **Commits since pin** — `git log <pinned_sha>..HEAD --oneline`.
   - **Changed (tracked both sides)** — per-file diff for include-set files that differ.
   - **Candidate additions** — files at upstream HEAD not in our tree, minus `ignore_globs`.
   - **Suggested next steps** — one-line reminder to port by hand + bump.
6. Silent on "ours-only" files (present in our tree, absent upstream — e.g. `plugins/caveman/scripts/`).
7. Pure read. Never writes anything in plugin source, lock file, or README.
8. Exit 0 on success (with or without diffs). Non-zero only on fetch/parse errors.

**Bump mode (`--bump`):**
1. Re-fetch upstream HEAD SHA and tag.
2. Rewrite `upstream.lock.json` with new `pinned_sha`, `pinned_tag`, `last_synced_date` (today).
3. Print reminder: "pin bumped. don't forget to update `plugin.json` version if behavior changed."
4. Never mutates plugin source.

### Tests — `tests/sync-upstream/`

Node's built-in `node:test`. Fixture strategy: `init.sh` builds two scratch repos in `$TMPDIR` — a fake upstream with three commits and a fake plugin snapshot pinned to the first commit. Test suite calls `init.sh` in `before()`.

Cases:
- `report-up-to-date` — lock at HEAD → "no changes" output.
- `report-with-changes` — lock at c1 → shows commits c2/c3, diff for modified file, flags c2's new file as candidate addition.
- `ours-only-silent` — our-only files never appear in any output section.
- `ignored-paths` — globs in `ignore_globs` (e.g. `install.sh`) excluded from candidate additions.
- `bump-writes-lock` — `--bump` rewrites `pinned_sha`, `pinned_tag`, `last_synced_date`; no other files touched.
- `bump-idempotent` — `--bump` on up-to-date pin writes identical SHA and tag (date may refresh).
- `missing-lock` — useful error when `upstream.lock.json` absent.
- `unknown-plugin` — useful error when plugin dir doesn't exist.

Run: `node --test tests/sync-upstream/`.

### `scripts/check-consistency.sh` updates

1. Replace the `UPSTREAM.md` existence check with an `upstream.lock.json` existence + shape check:
   - Parses as JSON.
   - Has `repo`, `pinned_sha`, `pinned_tag`, `last_synced_date`.
   - `pinned_sha` matches `^[0-9a-f]{40}$`.
2. For adapted plugins, assert `plugins/<p>/README.md` contains a heading matching `/^## What's different from upstream\s*$/m` (presence only, not content).
3. New flag `--staged`. When set, enforce R1: for each adapted plugin, if any staged file under `plugins/<p>/` is neither `README.md` nor `upstream.lock.json`, then `plugins/<p>/README.md` must also be staged. Default invocation (no flag) skips this check and remains safe to run any time.
4. `.githooks/pre-commit` passes `--staged`.

### First sync execution

Separate commits after tooling lands:

1. `node scripts/sync-upstream.js caveman` — review output vs pinned `c2ed24b`.
2. `node scripts/sync-upstream.js superpowers` — review output vs pinned `1f20bef`.
3. For each plugin: user confirms which changes to port; port by hand.
4. Update README "What's different from upstream" for any simplification changes or new additions.
5. Run `plugins/caveman/tests/` if present. Note superpowers has no plugin-level tests per R2.
6. Bump `plugin.json` version `5tux.N` only if behavior changed.
7. `sync-upstream.js <plugin> --bump`.
8. `scripts/check-consistency.sh` green before commit.

## Implementation order

Single branch, multiple commits. Each passes `check-consistency.sh`.

| # | commit | main files |
|---|---|---|
| 1 | CLAUDE.md: Rules section + conventions table updates | `CLAUDE.md` |
| 2 | migrate metadata: add `upstream.lock.json`, fold narrative into README, remove `UPSTREAM.md` | `plugins/*/upstream.lock.json`, `plugins/*/README.md`, delete `plugins/*/UPSTREAM.md` |
| 3 | extend `check-consistency.sh` (lock validation, README marker, `--staged`) + wire pre-commit | `scripts/check-consistency.sh`, `.githooks/pre-commit` |
| 4 | `sync-upstream.js` + tests + fixtures | `scripts/sync-upstream.js`, `tests/sync-upstream/**` |
| 5 | sync caveman (report + port + bump) | per outcome |
| 6 | sync superpowers (report + port + bump) | per outcome |

Commits 1–4 are tooling; pins stay untouched. Commits 5–6 execute the first real sync cycle.

## Risks and trade-offs

- **R1 false positives.** A purely mechanical staged-diff rule can't tell whether a change actually alters upstream behavior. Accepting false positives (a "typo fix" still requires a README mention) in exchange for zero missed cases. Escape hatch: user can add a one-line note to the README and move on.
- **No automated port apply.** Keeps the tool simple and auditable but means every sync requires human time proportional to upstream diff size. Acceptable given sync frequency (low).
- **Shallow clone cost.** Each report invocation clones upstream. For typical upstream repos (< 10 MB) this is a few seconds. Not optimized further.
- **`node:test` vs third-party runner.** Built-in test runner is less featured than Vitest/Jest, but avoids adding a package manifest or dependencies to this repo.
