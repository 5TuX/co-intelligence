# Search Dispatch Protocol (Step 2)

Fire-and-forget dispatch. The career skill dispatches multiple background
agents in parallel, returns control to the user, and assembles results
when all complete.

## Agent Groups

Dispatch these agents with `run_in_background: true`. Each agent runs its
tasks sequentially. See `search-agents.md` for detailed task specifications
and output format.

### Agent A: General searches (shared, run once)

Tasks (sequential within this agent):
1. General job board search (all sources from `sources-general.yaml`)
2. Agentic job search intelligence (new tools, strategies, repos)
3. Market trends + skill gaps (cross-referenced with ALL target users)

**Context to pass:** `sources-general.yaml` content, all target users' skill
summaries (extracted from profiles), today's date, learning context from
Step 1.5.

### Agent B: Per-user searches (one agent per target user)

For each target user `<handle>`, dispatch a separate agent. Tasks:
1. User-specific source search (`sources.yaml`)
2. Deep search (tactics from `reference/deep-search-tactics.md`)
3. Community & social search (HN, Reddit, Twitter/X, communities)
4. Funding & career page monitor (recently funded companies, direct career pages)

**Context to pass:** Full `profile.yaml`, `sources.yaml`, `goals.md`, `cv.md`,
existing `offers.json` (for dedup), learning-loop files (for Novelty-Zero
detection), today's date, user's `search_notes`.

If Novelty-Zero Mode is active for this user, pass the activation flag and
blacklisted queries from `search-log.yaml`.

### Agent C: Source maintenance (shared, run once)

Task: source list maintenance from `search-agents.md`.

**Context to pass:** `sources-general.yaml`, all users' `sources.yaml`,
today's date.

## Dispatch Count

- 1 user: 3 agents (A + B + C)
- 2 users: 4 agents (A + B x 2 + C)
- N users: 2 + N agents

## Result Format

Each agent writes results to `$PLUGIN_DATA/career-results/<agent-id>.json`:

| Agent | File |
|-------|------|
| General | `general.json` |
| Per-user | `<handle>.json` |
| Maintenance | `maintenance.json` |

Schema (same output format as search-agents.md, wrapped in metadata):
```json
{
  "agent": "<agent-id>",
  "completed": "<ISO timestamp>",
  "offers": [{"role": "...", "company": "...", "url": "...", ...}],
  "source_changes": [],
  "admin_notes": "",
  "errors": []
}
```

## Assembly (Step 2.5)

When ALL dispatched agents have returned:

1. Read all files from `$PLUGIN_DATA/career-results/`
2. Merge offers into unified pool, deduplicate by URL
3. Apply source changes from maintenance agent to source YAML files
4. Count genuinely NEW offers per user (not in existing `offers.json`)
5. **Refinement trigger:** if new offers < 5 for any user OR Novelty-Zero
   Mode is active, dispatch refinement agents (Gap Analysis + Non-Obvious
   from `search-agents.md`) as background agents, one per user needing
   refinement. Wait for completion, merge additional results.
6. Proceed to Step 3 (distribution & update phase).
