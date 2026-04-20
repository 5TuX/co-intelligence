# co-intelligence — repo conventions

A Claude Code plugin marketplace. Three plugins under `plugins/`: two adapted forks (`caveman`, `superpowers`) and one original (`autoresearch`). Maintained by 5TuX.

## Repo map

```
.claude-plugin/marketplace.json     authoritative plugin registry
plugins/<name>/
    .claude-plugin/plugin.json      plugin metadata + version anchor
    README.md                       per-plugin README (shared skeleton)
    UPSTREAM.md                     adapted plugins only — source + pinned SHA + simplifications
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

When porting a new upstream release: reset the suffix to `.0` and update `UPSTREAM.md`'s `Last synced` line with the new commit SHA.

## Files that must agree

When you touch **any** of these, check the others in the same commit:

| If you change...                            | Re-check...                                                                                             |
|---------------------------------------------|---------------------------------------------------------------------------------------------------------|
| `plugins/<p>/.claude-plugin/plugin.json`    | `plugins/<p>/README.md` version line, `.claude-plugin/marketplace.json` description if it duplicates.   |
| `.claude-plugin/marketplace.json`           | `README.md` (root) plugin table, per-plugin descriptions.                                               |
| upstream port                               | `plugins/<p>/UPSTREAM.md` (SHA + simplifications), `plugins/<p>/plugin.json` version, README if shipped skills/hooks changed. |
| adding/removing a skill under `skills/`     | `plugins/<p>/README.md` "What's included", UPSTREAM.md simplifications.                                 |

`scripts/check-consistency.sh` enforces the mechanical subset of this. The pre-commit hook blocks commits that break it.

## Per-plugin README skeleton

Both adapted plugin READMEs (`caveman`, `superpowers`) use the same section order:

1. Title + tagline
2. Attribution
3. What's included
4. What's different from upstream
5. Install
6. Usage (plugin-specific subsections nest here)
7. Upstream sync (pointer to UPSTREAM.md)
8. License

Plugin-specific sections are added only where they carry real content. Do not pad for symmetry.

## Upstream sync workflow

1. `git ls-remote --tags <upstream-url>` to find the tag SHA for the new release.
2. Shallow-clone the tag into `/tmp`, diff against `plugins/<p>/`.
3. Port desired changes selectively (this marketplace drops install paths for non-Claude-Code agents and upstream repo scaffolding — see each `UPSTREAM.md` for the exclusion list).
4. Update `plugins/<p>/UPSTREAM.md` `Last synced` line with new date + SHA + upstream version.
5. Bump `plugin.json` version to `NEW_UPSTREAM-5tux.0`.
6. Update `README.md` if skills/hooks/agents changed.
7. Run `scripts/check-consistency.sh`.

A helper script (`scripts/sync-upstream.sh`) is planned but not yet written.

## Setup after clone

```bash
git config core.hooksPath .githooks
```

This wires `.githooks/pre-commit` to run the consistency check on every commit. One-time per clone.

## Personal notes

Put machine-specific or in-progress notes in `CLAUDE.local.md` (gitignored). This file is for conventions that apply to anyone working on the repo.
