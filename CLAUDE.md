# co-intelligence — repo conventions

Claude Code plugin marketplace. 4 plugins in `plugins/`: 3 adapted forks (`caveman`, `superpowers`, `karpathy`) + 1 original (`autoresearch`). Maintainer: 5TuX.

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

`plugin.json` versions for `caveman`/`superpowers` = **`UPSTREAM-5tux.N`**:

- `UPSTREAM` = exact upstream version ported (e.g. `1.6.0`, `5.0.7`).
- `5tux.N` = marketplace patch counter on top of that upstream. Start `.0`, bump per commit that changes behavior (not README-only).

Examples: `1.6.0-5tux.0`, `5.0.7-5tux.1`.

New upstream release port: reset suffix to `.0`, port by hand, run `scripts/sync-upstream.js <plugin> --bump` → rewrites SHA/tag/date in `upstream.lock.json`.

## Files that must agree

Touch any → check others same commit:

| If you change...                            | Re-check...                                                                                             |
|---------------------------------------------|---------------------------------------------------------------------------------------------------------|
| `plugins/<p>/.claude-plugin/plugin.json`    | `plugins/<p>/README.md` version line, `.claude-plugin/marketplace.json` description if it duplicates.   |
| `.claude-plugin/marketplace.json`           | `README.md` (root) plugin table, per-plugin descriptions.                                               |
| upstream port                               | `plugins/<p>/upstream.lock.json` via `sync-upstream.js --bump`, `plugin.json` version, README § "What's different from upstream". |
| adding/removing a skill under `skills/`     | `plugins/<p>/README.md` "What's included" and § "What's different from upstream".                                 |
| adding/porting any skill/hook/agent         | Grep all `plugins/*/` + read `ROADMAP.md` § Redundancies before writing. Document intentional overlap in `plugins/<p>/README.md`. |

`scripts/check-consistency.sh` enforces mechanical subset. Pre-commit hook blocks violating commits.

## Per-plugin README skeleton

Both adapted READMEs (`caveman`, `superpowers`) share section order:

1. Title + tagline
2. Attribution
3. What's included
4. What's different from upstream
5. Install
6. Usage (plugin-specific subsections nest here)
7. Upstream sync (pointer to upstream.lock.json and scripts/sync-upstream.js)
8. License

Add plugin-specific sections only when real content. No padding for symmetry.

## Upstream sync workflow

1. `node scripts/sync-upstream.js <plugin>` — report mode: commits since pin, per-file diffs, candidate additions. Zero writes.
2. Review w/ user. Port desired changes by hand to `plugins/<p>/`.
3. Update `plugins/<p>/README.md` § "What's different from upstream" (Simplifications / Additions) per behavior change.
4. Run plugin tests if exist (e.g. `plugins/caveman/tests/`). Note absence in commit msg otherwise.
5. Bump `plugin.json` to `NEW_UPSTREAM-5tux.N` only if behavior changed.
6. `node scripts/sync-upstream.js <plugin> --bump` → rewrites `upstream.lock.json` w/ new SHA, tag, date.
7. Run `scripts/check-consistency.sh`. Commit.

## Rules (adapted plugins)

Apply to any commit touching an adapted plugin (`plugins/caveman/`, `plugins/superpowers/`, `plugins/karpathy/`).

- **R1 — docs required.** Commit modifying adapted plugin source (under `plugins/<p>/` except `README.md` + `upstream.lock.json`) must also stage `plugins/<p>/README.md`. Enforced by `scripts/check-consistency.sh --staged` via `.githooks/pre-commit`.
- **R2 — tests required.** Run existing plugin tests before committing behavior changes (e.g. `node --test plugins/caveman/tests/` if present). No tests → say so in commit msg. Advisory, not mechanically enforced.
- **R3 — sync workflow.** Upstream syncs: `sync-upstream.js <plugin>` (report) → manual port → README update → tests → `sync-upstream.js <plugin> --bump`. Lock shape validated by `check-consistency.sh`.
- **R4 — no dup work.** Before port/add skill/hook/agent: (a) grep `plugins/` for overlap, (b) check CC default sys prompt for identical guidance, (c) check target plugin's own skills. Resolve: drop, merge, or doc in README § "What's different from upstream" why dup intentional. Unresolved → `ROADMAP.md` § Redundancies.

## Python execution

Repo has no pinned python envs, requirements.txt, pip. All plugin python scripts run via `uv run --with <pkg> [--with <pkg>] python3 …`. Why: skills ship zero-install — `uv` resolves deps on first invoke + caches. Consumers need only `uv`.

- No commit of `requirements.txt`, `pyproject.toml`, `venv/` in plugin dirs.
- No `pip install` or `python -m venv` suggestions in any SKILL.md.
- Each plugin SKILL.md invoking python MUST state explicit `uv run --with …` invocation (copy/paste ready).

## Setup after clone

```bash
git config core.hooksPath .githooks
```

Wires `.githooks/pre-commit` → consistency check per commit. One-time per clone.

## Roadmap

Private `ROADMAP.md` at repo root (gitignored). Internal scratchpad tracking per-plugin features, deltas, redundancies, ideas.

- Read relevant section BEFORE any repo change.
- Update AFTER any change: mark ✓ done, move entries, add new ideas. Cite commit SHAs when relevant.
- Scope-separated per plugin. Cross-plugin stuff lives in `## repo-level / meta` or `## Redundancies`.
- Symbols: ✓ done · → doing · ◦ next · ? idea/maybe.

## Personal notes

Machine-specific / in-progress notes → `CLAUDE.local.md` (gitignored). This file = repo-wide conventions.