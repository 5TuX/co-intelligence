---
name: job-search
description: >
  Use when the user says /job-search or asks for a full career refresh,
  job search, CV analysis, or skill gap review.
disable-model-invocation: true
context: fork
argument-hint: "[user1,user2] | all | clean [handle] | new-user | update-user <handle>"
---

# Job Search & Career Refresh (Multi-User)

Full career refresh — job search, CV refinement, skill gap analysis.
Runs in a forked context to avoid polluting the main conversation.
Supports multiple users with independent profiles, preferences, and career files.

**Admin identity:** The admin/operator is always the user running the Claude Code session. Other users are "friends." Admin sees process notes in their summary; friends only get personalized tips.

## Argument Parsing

```
/job-search                       → search for ALL users (list dirs under users/)
/job-search dimit                 → search for dimit only
/job-search dimit,alice           → search for listed users
/job-search clean                 → clean mode for ALL users (validate links, remove dead offers)
/job-search clean dimit           → clean mode for dimit only
/job-search new-user              → interactive user creation (see §New-User Creation)
/job-search update-user <handle>  → interactive profile update (see §Update-User)
```

Parse the argument first. If a comma-separated list, split on `,` and trim whitespace.
To discover available users, list directories under `users/` within this skill's directory.
If a requested handle has no directory, error with: "User '<handle>' not found. Available users: <list>. Use `/job-search new-user` to create."

## User System

All user data lives in `users/<handle>/` within this skill's directory (`~/.claude/skills/job-search/users/<handle>/`).

Each user has:
```
users/<handle>/
├── profile.yaml            # Preferences, ethical filters, location, skills, learning path
├── sources.yaml            # User-specific job sources
├── Dashboard.html          # Unified HTML (offers + summary + schedule, tabbed)
├── Job-Search-Reference.md # Removed offers history, skill gaps, tips
├── Direction.md            # Vision, goals, skills inventory, roadmap
├── CV.md                   # Living CV + portfolio readiness tracker
├── Human-Expertise.md      # Strengths profile, expertise log
├── Journal.md              # Chronological session log
├── Topics/                 # Standalone thematic notes (optional)
├── learned-preferences.md  # Auto-generated preference model (learning loop)
├── feedback.yaml           # Q&A history from conversational feedback (learning loop)
├── search-log.yaml         # Per-run query performance log (learning loop)
└── metrics.yaml            # Run-over-run quality metrics (learning loop)
```

See admin identity note above.

## Feedback

For each user, load any files listed in their `profile.yaml` `feedback_files` field (paths are relative to this skill's directory).

## Instructions

### Step 0: Parse arguments and determine mode

- If argument is `new-user` → jump to §New-User Creation
- If argument is `update-user <handle>` → jump to §Update-User
- If argument starts with `clean` → jump to §Clean Mode. Remaining args (if any) are user handles.
- Otherwise → search mode. Determine target users:
  - No argument → all users (list `users/` subdirectories)
  - Comma-separated handles → those users only
  - Single handle → that user only

Read `clean-mode.md` for the full clean mode protocol (C1-C4).

---

### Step 1: Read user data

For EACH target user:
1. Read `users/<handle>/profile.yaml` — extract location_priority, skills, ethical_filter, search_notes, feedback_files, learning_path
2. Read career files from `users/<handle>/`: `Direction.md`, `CV.md`, `Human-Expertise.md`, `Journal.md`, `Job-Search-Reference.md`
3. Read existing `users/<handle>/Dashboard.html` (or `Offers.html` if Dashboard.html doesn't exist yet) to know what's already tracked
4. Read `users/<handle>/sources.yaml` for user-specific sources
5. Read `sources-general.yaml` (shared, read once)
6. Load feedback files listed in profile.yaml
7. Read learning-loop files (if they exist — gracefully skip if missing):
   - `users/<handle>/learned-preferences.md` — accumulated preference model from past feedback
   - `users/<handle>/feedback.yaml` — raw Q&A history from past runs
   - `users/<handle>/search-log.yaml` — per-run query performance log
   - `users/<handle>/metrics.yaml` — run-over-run quality metrics

### Step 1.5: Adaptive strategy review (learning loop)

Read `learning-loop.md` § "Pre-Search" for the full protocol. Internalize past preferences, query performance, and metrics trends to form a search plan. Skip if no learning-loop files exist yet.

### Step 1.7: Automatic clean (pre-search)

Before searching for new offers, clean stale ones from the existing catalog. Run Clean Mode steps C1-C3 for each target user. This ensures the catalog is fresh before new offers are merged in.

Skip C4 (commit) — changes will be committed in Step 6 along with everything else.

If `offers.json` does not exist for a user (first run), this step is a no-op.

### Step 2: Search phase — spawn parallel agents

Read `search-agents.md` for agent specifications, output format, and field guidelines. Spawn all agents described there (general, per-user, maintenance, post-search).

### Steps 3-4: Distribution & update phase

Read `update-phase.md` for the full protocol. Covers: ethical filtering, location/skills scoring, offers.json generation, link validation, HTML rendering, LLM verification, stale offer handling, people tracking, learning path updates, Direction.md updates, and CV suggestions.

**Gate rule: No offer enters offers.json without a verified link pointing to the actual job listing.** If a URL cannot be confirmed to show the specific position, drop the offer entirely. A working URL that doesn't show the offer is the same as a dead link.

### Step 5: Summary phase

For EVERY target user, ALWAYS generate the unified `Dashboard.html`.

The dashboard combines all views in a single tabbed HTML file: **Offers** (persistent catalog), **Run Summary** (tips + admin notes), and **Learning Path** (if the user has a learning_path in profile.yaml). The "Last updated" date is shown at the top.

1. Write `users/<handle>/summary-data.json` — same `RenderContext` schema as offers.json, but add `tips` (per-user advice) and `admin_notes` (admin-only process notes). Mark hidden gems with `hidden_gem: true`.
2. Render the unified dashboard:
```bash
uv run js-render users/<handle>/
```
This reads `offers.json`, `summary-data.json`, and `profile.yaml` (for schedule) and produces a single `Dashboard.html`.

**Summary contents:**
- Urgent deadlines banner
- Single table of ALL offers found this run with columns: `#`, `Role`, `Company`, `Location`, `Domain`, `Level / Salary`, `Mission`, `Tools`, `Match`. Deadlines appear as inline badges next to the role name. Hidden gems marked in Notes.
- Per-user tips: personalized CV suggestions, skill gap advice, application tactics tailored to their profile. If the user has a `learning_path` in their profile, suggest adjustments based on what the current run's offers demand most
- **Admin-only notes** (ONLY in the admin/operator's summary): process improvements, proposed source edits, tool/repo discoveries, SKILL.md change suggestions, what worked well vs. what could be better

### Step 6: Git commits

For the admin user (the operator, e.g. dimit), commit career file changes:
```bash
git -C ~/.claude/skills/job-search/users/<admin-handle> add -A
git -C ~/.claude/skills/job-search/users/<admin-handle> commit -m "career: job search refresh"
```

For other users (friends), only commit if their user directory has a `.git/` subdirectory:
```bash
# Check first:
if [ -d ~/.claude/skills/job-search/users/<handle>/.git ]; then
  git -C ~/.claude/skills/job-search/users/<handle> add -A
  git -C ~/.claude/skills/job-search/users/<handle> commit -m "career: job search refresh"
fi
```

### Steps 6.5-7: Post-search learning loop

Read `learning-loop.md` § "Post-Search" and § "Post-Report" for the full protocol. Covers: search-log.yaml updates, metrics.yaml updates, conversational feedback questions, preference recording, and learning-loop commits.

**Single-user runs only:** After presenting the final report, ask the user 3-5 targeted questions to refine the target user's profile for next time. See learning-loop.md § "Post-Report" for question selection strategy. Wait for answers before committing learning-loop files. **Skip this step when running for multiple users** — sharpening questions are only useful when focused on one person's search.

### Step 8: Final report

Read `final-report.md` for the required report format. All sections are mandatory — never skip any.

---

## Reference Files

| Topic | File |
|-------|------|
| Deep search tactics | `deep-search-tactics.md` |
| Clean mode (C1-C4) | `clean-mode.md` |
| Search agents & output format | `search-agents.md` |
| Distribution & update (Steps 3-4) | `update-phase.md` |
| Final report format (Step 8) | `final-report.md` |
| Learning loop protocol | `learning-loop.md` |
| New-user creation flow | `new-user-flow.md` |
| Update-user flow | `update-user-flow.md` |
| HTML templates & models | `job_search/templates/`, `job_search/models.py` |
| General sources | `sources-general.yaml` |
| User-specific sources | `users/<handle>/sources.yaml` |
