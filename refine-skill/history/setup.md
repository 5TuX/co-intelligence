# setup — Refinement History

## 2026-03-25 (b)
- Changes: added `/setup scan` mode (discover live MCP servers, plugins, skills → update architecture.md for cross-machine sync). Moved expected state table from SKILL.md to architecture.md (single source of truth). Made verification checks read from architecture.md instead of hardcoded values. Added `argument-hint: "[scan]"` to frontmatter.
- Before: 201 lines, 9,693 chars
- After: 248 lines, 10,470 chars
- User feedback: "setup must have a mode to scan the current setup (new plugins/MCPs) and update itself so other machines can sync"

## 2026-03-25
- Changes: deduplicated identical Windows/Linux MCP add templates into single "all platforms" block
- Before: 10,028 chars, 208 lines
- After: ~9,600 chars, 203 lines
- Research: chezmoi is a modern alternative for dotfile management but current Google Drive symlink approach works for user
- User feedback: simplify without losing content

## 2026-03-16
- Changes: fixed stale file reference (Summary.md → Direction.md) in expected passing state table
- Before: 4,794 chars, 123 lines
- After: ~4,800 chars, 123 lines
- User feedback: none — consistency fix

## 2026-03-18
- Changes: updated `architecture.md` — fixed stale skills table (added myplay, refine-skill, sync-skills; removed career/SKILL.md), removed orphaned `career/` from local-only files table, updated directory tree to reflect all 8 current skills alphabetically
- Research: no new findings — straightforward staleness fix
- User feedback: not using `.claude/agents/` yet, skipped adding it
