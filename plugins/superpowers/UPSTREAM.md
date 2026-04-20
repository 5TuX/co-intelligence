# Upstream

- **Source:** https://github.com/obra/superpowers
- **License:** MIT
- **Last synced:** 2026-04-20 at commit `1f20bef3f59b85ad7b52718f822e37c4478a3ff5` (upstream `v5.0.7`)

## Simplifications applied

- Claude Code only — dropped Codex, Cursor, OpenCode, Copilot CLI, and Gemini CLI install paths.
- Kept all 14 skills, the `code-reviewer` agent, and the hooks directory byte-for-byte from upstream.
- Removed repo-level scaffolding not used by the plugin bundle: `commands/`, `docs/`, `tests/`, `scripts/`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `RELEASE-NOTES.md`, `gemini-extension.json`, `GEMINI.md`, `package.json`.
- Added `.claude-plugin/plugin.json` with the marketplace version anchor (`5.0.7-5tux.1`).
- `CLAUDE.md` is retained as reference for the upstream's contributor philosophy — note its PR rules apply to `obra/superpowers`, not to this fork.

## To sync

Planned: `scripts/sync-upstream.sh superpowers` will fetch the upstream repo, show `git log SHA..HEAD` and `git diff` against the recorded SHA, and let changes be ported selectively. Not yet implemented — run the fetch manually until then.
