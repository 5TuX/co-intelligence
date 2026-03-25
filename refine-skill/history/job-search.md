# job-search — Refinement History

## 2026-03-25
- Changes: extracted comments.json processing (~2.5K chars) to `reference/comments-processing.md`, replaced inline block with pointer
- Before: 14,984 chars, 209 lines
- After: ~12,500 chars, ~186 lines
- Research: ATS landscape unchanged; skill scope (discovery only) remains correct
- User feedback: simplify without losing content

## 2026-03-16
- Changes: extracted 4 sections to reference files to fix CRITICAL size issue (>15K silent truncation)
  - `clean-mode.md` — C1-C4 clean protocol
  - `learning-loop.md` — Steps 1.5, 6.5, 7 (adaptive strategy, performance logging, conversational feedback)
  - `search-agents.md` — Step 2 agent specifications and output format
  - `update-phase.md` — Steps 3-4 (distribution, filtering, link validation, renders, updates)
  - Also fixed duplicate step label (two `4h` → `4h` + `4i`)
- Before: 31,755 chars, 551 lines (CRITICAL — over 15K limit)
- After: 12,459 chars, 231 lines (OK — under 15K)
- User feedback: learning loop is active but young (few runs), clean mode works, no observed truncation issues yet but skill was likely being silently truncated

## 2026-03-16 (apply mode)
- Changes: [USER] made post-search questions MANDATORY with bold callout in SKILL.md, [USER] added stricter link verification rules in update-phase.md (reject soft-dead links, volunteer/community calls), [REFINE] added gate rule in SKILL.md — no offer without verified link
- Before: 12,459 chars, 231 lines
- After: 13,003 chars, 235 lines
- User feedback: The Document Foundation offer had a dead link that wasn't caught; post-search questions were being skipped

## 2026-03-16 (apply mode — soft dead links)
- Changes: [USER] added C2.5 step to clean-mode.md — LLM content verification for soft-dead links (URLs that load but don't show actual job listing), skips already-verified URLs from C2
- Before: clean-mode.md 47 lines
- After: clean-mode.md 67 lines
- User feedback: Document Foundation /tenders/ page passed both httpx and Playwright checks but showed no actual job listing

## 2026-03-18
- Changes:
  - Deleted orphaned `career-reference.md` (unreferenced, content superseded by other reference files)
  - Fixed nested subagent pattern in `deep-search-tactics.md` — removed "Agent Self-Refinement" section that instructed agents to spawn sub-agents (impossible: subagents can't spawn sub-subagents). Moved refinement to `search-agents.md` as flat fan-out from orchestrator (gap-analysis + non-obvious-strategies agents, conditional on <15 results)
  - Fixed `deep-search-tactics.md` output format — aligned with full schema from `search-agents.md` (was missing `level`, `salary`, `mission`, `tools` fields)
  - Fixed `ROADMAP.md` — updated `Offers.html`/`summary.html` references to `Dashboard.html`, marked nested subagent issue as resolved
  - Fixed `README.md` — removed career-reference.md from tree, updated all `Offers.html`/`summary.html` references to `Dashboard.html`, updated CLI tool examples
- Research: Claude Code subagents confirmed flat fan-out only (no nesting). Orchestrator-level conditional refinement is the standard pattern.
- User feedback: never noticed subagent nesting or file staleness issues
