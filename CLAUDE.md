# co-intelligence — repo conventions

A Claude Code plugin marketplace. Three plugins under `plugins/`: two adapted forks (`caveman`, `superpowers`) and one original (`autoresearch`). Maintained by 5TuX.

## Repo map

```
.claude-plugin/marketplace.json     authoritative plugin registry
plugins/<name>/
    .claude-plugin/plugin.json      plugin metadata + version anchor
    README.md                       per-plugin README (shared skeleton)
    upstream.lock.json              adapted plugins only — pinned SHA + repo URL (machine state)
    README.md § "What's different…" adapted plugins — human-readable upstream deltas
    LICENSE                         MIT
    skills/ agents/ hooks/          plugin content
scripts/check-consistency.sh        mechanical repo checks
.githooks/pre-commit                runs the check; install via `git config core.hooksPath .githooks`
```

## Version scheme (adapted plugins)

`plugin.json` versions for `caveman` and `superpowers` follow **`UPSTREAM-5tux.N`**:

- `UPSTREAM` = the exact upstream version ported (e.g. `1.6.0`, `5.0.7`).
- `5tux.N` = this marketplace's patch counter for edits on top of that upstream version. Starts at `.0`, bumps with every commit that changes behavior (not README-only).

Examples: `1.6.0-5tux.0`, `5.0.7-5tux.1`.

When porting a new upstream release: reset the suffix to `.0`, port changes by hand, then run `scripts/sync-upstream.js <plugin> --bump` to rewrite the new SHA/tag/date into `upstream.lock.json`.

## Files that must agree

When you touch **any** of these, check the others in the same commit:

| If you change...                            | Re-check...                                                                                             |
|---------------------------------------------|---------------------------------------------------------------------------------------------------------|
| `plugins/<p>/.claude-plugin/plugin.json`    | `plugins/<p>/README.md` version line, `.claude-plugin/marketplace.json` description if it duplicates.   |
| `.claude-plugin/marketplace.json`           | `README.md` (root) plugin table, per-plugin descriptions.                                               |
| upstream port                               | `plugins/<p>/upstream.lock.json` via `sync-upstream.js --bump`, `plugin.json` version, README § "What's different from upstream". |
| adding/removing a skill under `skills/`     | `plugins/<p>/README.md` "What's included" and § "What's different from upstream".                                 |

`scripts/check-consistency.sh` enforces the mechanical subset of this. The pre-commit hook blocks commits that break it.

## Per-plugin README skeleton

Both adapted plugin READMEs (`caveman`, `superpowers`) use the same section order:

1. Title + tagline
2. Attribution
3. What's included
4. What's different from upstream
5. Install
6. Usage (plugin-specific subsections nest here)
7. Upstream sync (pointer to upstream.lock.json and scripts/sync-upstream.js)
8. License

Plugin-specific sections are added only where they carry real content. Do not pad for symmetry.

## Upstream sync workflow

1. `node scripts/sync-upstream.js <plugin>` — report mode: prints commits since pin, per-file diffs for tracked files, and candidate additions from upstream. Zero writes.
2. Review output with the user. Port desired changes by hand into `plugins/<p>/`.
3. Update `plugins/<p>/README.md` § "What's different from upstream" (Simplifications / Additions subsections) for any behavior change.
4. Run the plugin's tests if they exist (e.g. `plugins/caveman/tests/`). Note absence in commit message otherwise.
5. Bump `plugin.json` version to `NEW_UPSTREAM-5tux.N` only if behavior changed.
6. `node scripts/sync-upstream.js <plugin> --bump` — rewrites `upstream.lock.json` with new SHA, tag, and date.
7. Run `scripts/check-consistency.sh`. Commit.

## Rules (adapted plugins)

These apply to any commit touching `plugins/caveman/` or `plugins/superpowers/`.

- **R1 — documentation required.** Any commit that modifies an adapted plugin's source (anything under `plugins/<p>/` other than `README.md` and `upstream.lock.json`) must also stage `plugins/<p>/README.md`. Enforced by `scripts/check-consistency.sh --staged` via `.githooks/pre-commit`.
- **R2 — tests required.** Run the plugin's existing tests before committing behavior changes (e.g. `node --test plugins/caveman/tests/` if present). If the plugin has no tests, say so explicitly in the commit message. Advisory — not mechanically enforced.
- **R3 — sync workflow.** Upstream syncs use `sync-upstream.js <plugin>` (report) → manual port → README update → tests → `sync-upstream.js <plugin> --bump`. Lock file shape validated by `check-consistency.sh`.

## Setup after clone

```bash
git config core.hooksPath .githooks
```

This wires `.githooks/pre-commit` to run the consistency check on every commit. One-time per clone.

## Personal notes

Put machine-specific or in-progress notes in `CLAUDE.local.md` (gitignored). This file is for conventions that apply to anyone working on the repo.
