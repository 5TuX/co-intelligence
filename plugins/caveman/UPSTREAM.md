# Upstream

- **Source:** https://github.com/JuliusBrussee/caveman
- **License:** MIT
- **Last synced:** 2026-04-20 at commit `c2ed24b3e5d412cd0c25197b2bc9af587621fd99` (upstream `v1.6.0`)

## Simplifications applied

- Claude Code only — dropped Codex, Cursor, Windsurf, Cline, Copilot, Gemini CLI install paths and their rule/instruction files.
- Kept only the core `caveman` skill. Removed `caveman-commit`, `caveman-review`, `caveman-help`, and `compress` skills.
- Removed benchmarks, evals, tests, docs, statusline helper, hooks installer scripts, single-file `caveman.skill` distribution, `AGENTS.md` / `GEMINI.md` / `CLAUDE.md` multi-agent configs, and release assets.
- Replaced upstream auto-activation machinery with two Claude Code hooks in `.claude-plugin/plugin.json` backed by node scripts under `scripts/`: `SessionStart` announces the active level from config, `UserPromptSubmit` emits a per-turn drift reminder gated by config. Hook behavior (default level, reminder toggle, permanent off) is driven by a persistent user config (`%APPDATA%\caveman\config.json` on Windows, `~/.config/caveman/config.json` on POSIX) merged over shipped `config.default.json`. Off-switch intent detection is agent-driven (see `skills/caveman/SKILL.md`) and writes via `scripts/set-config.js`.
- `skills/caveman/SKILL.md` was trimmed (66 → 49 lines) for this marketplace.

## To sync

Planned: `scripts/sync-upstream.sh caveman` will fetch the upstream repo, show `git log SHA..HEAD` and `git diff` against the recorded SHA, and let changes be ported selectively. Not yet implemented — run the fetch manually until then.
