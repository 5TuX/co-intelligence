# job-search — Refinement History

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
