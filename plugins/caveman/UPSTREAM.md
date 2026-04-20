# Upstream

- **Source:** https://github.com/JuliusBrussee/caveman
- **License:** MIT
- **Last synced:** 2026-04-20 at commit `c2ed24b3e5d412cd0c25197b2bc9af587621fd99` (upstream `v1.6.0`)

## Simplifications applied

- Claude Code only — dropped Codex, Cursor, Windsurf, Cline, Copilot, Gemini CLI install paths and their rule/instruction files.
- Kept only the core `caveman` skill. Removed `caveman-commit`, `caveman-review`, `caveman-help`, and `compress` skills.
- Removed benchmarks, evals, tests, docs, statusline helper, hooks installer scripts, single-file `caveman.skill` distribution, `AGENTS.md` / `GEMINI.md` / `CLAUDE.md` multi-agent configs, and release assets.
- Replaced upstream auto-activation machinery with two Claude Code hooks in `.claude-plugin/plugin.json`: a `SessionStart` hook setting ultra as the default intensity, and a `UserPromptSubmit` hook injecting `keep talk caveman` each turn to prevent drift.
- `skills/caveman/SKILL.md` was trimmed (66 → 49 lines) for this marketplace.

## To sync

Planned: `scripts/sync-upstream.sh caveman` will fetch the upstream repo, show `git log SHA..HEAD` and `git diff` against the recorded SHA, and let changes be ported selectively. Not yet implemented — run the fetch manually until then.
