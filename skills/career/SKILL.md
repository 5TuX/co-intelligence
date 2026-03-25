---
name: career
description: Use when the user asks for a career refresh, job search, CV analysis, skill gap review, or wants to capture a learning note. Proactively offer note mode when something notable happens during a work session.
context: fork
argument-hint: "[user1,user2] | clean [user] | note [user] <content> | new-user | update-user <user>"
---

# Career — Search, Discovery & Notes (Multi-User)

Full career refresh — job **discovery**, CV refinement, skill gap analysis, and **note capture**.
Runs in a forked context to avoid polluting the main conversation.
Supports multiple users with independent profiles, preferences, and career files.

**Scope: search and discovery only.** This skill finds, validates, and organizes job offers. It does NOT help with applications, resume tailoring, cover letters, or ATS keyword optimization. The output is a curated, verified catalog of opportunities — what the user does with them is up to them.

**Admin identity:** The admin/operator is always the user running the Claude Code session. Other users are "friends." Admin sees process notes in their summary; friends only get personalized tips.

## Data Directory

This skill runs as part of the `co-intelligence` plugin. At the start of every invocation:
1. Resolve `CLAUDE_PLUGIN_DATA` environment variable → `$PLUGIN_DATA`
2. Read `$PLUGIN_DATA/config.local.yaml` to get `data_dir` (→ **DATA_DIR**) and `admin_user` (→ **ADMIN_USER**)
3. If config is missing, error: "Missing config — run: `cp ${CLAUDE_PLUGIN_ROOT}/templates/config.local.yaml.example ${CLAUDE_PLUGIN_DATA}/config.local.yaml` and edit it."

## CLI Tools

Before running any `career-*` CLI command, activate the plugin venv:
```bash
source $PLUGIN_DATA/career-venv/bin/activate 2>/dev/null || source $PLUGIN_DATA/career-venv/Scripts/activate
```
Then run commands normally (e.g., `career-render DATA_DIR/<handle>/`).

## Argument Parsing

```
/career                          → search for ALL users (list dirs under DATA_DIR)
/career <user>                   → search for one user
/career <user1>,<user2>          → search for listed users
/career clean                    → clean mode for ALL users (validate links, remove dead offers)
/career clean <user>             → clean mode for one user
/career note <content>           → note mode for ADMIN_USER
/career note <user> <content>    → note mode for specified user
/career new-user                 → interactive user creation (see §New-User Creation)
/career update-user <user>       → interactive profile update (see §Update-User)
```

Parse the argument first. If a comma-separated list, split on `,` and trim whitespace.
To discover available users, list directories under `DATA_DIR`.
If a requested user has no directory, error with: "User 'X' not found. Available users: <list>. Use `/career new-user` to create."

## User System

All user data lives in `DATA_DIR/<handle>/` (path from `config.local.yaml`).

Each user has:
```
DATA_DIR/<handle>/
├── profile.yaml            # Preferences, ethical filters, location, skills, learning path
├── sources.yaml            # User-specific job sources
├── Dashboard.html          # Unified HTML (offers + summary + schedule, tabbed)
├── comments.json           # User comments + scores on offers (URL → text, _scores → {URL → int}), edited via Dashboard
├── archive.md              # Removed offers history, skill gaps, tips
├── goals.md                # Vision, goals, roadmap
├── cv.md                   # Living CV + skills inventory + strengths + portfolio
├── market.md               # Market demand, skill gaps, trends
├── journal.md              # Chronological session log
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
- If argument is `update-user <name>` → jump to §Update-User
- If argument starts with `clean` → jump to §Clean Mode. Remaining args (if any) are user names.
- If argument starts with `note` → jump to §Note Mode.
- Otherwise → search mode. Determine target users:
  - No argument → all users (list `DATA_DIR` subdirectories)
  - Comma-separated names → those users only
  - Single name → that user only

Read `reference/clean-mode.md` for the full clean mode protocol (C1-C4).

---

### Note Mode

When the argument starts with `note`:

1. **Parse user vs content:** Take the text after `note`. If the first word matches an existing user directory in `DATA_DIR`, use that as the target user and treat the rest as content. Otherwise, default to `ADMIN_USER` and treat all text as content.
2. **Classify and route** the content to the right file and section:
   - Technical concept, gotcha, or tool tip → `DATA_DIR/<handle>/journal.md` (under today's date heading, appending to the current session entry if one exists)
   - Skill level update (e.g. "now comfortable with async Python") → `DATA_DIR/<handle>/cv.md` (skills inventory section)
   - Human expertise moment (caught a bug, key insight, judgment call) → `DATA_DIR/<handle>/cv.md` (strengths section)
   - Multiple targets → append to each
3. **Append** with today's date and a brief context tag (e.g. project name or topic).
4. **Git commit** if `DATA_DIR/<handle>/.git/` exists.
5. **Confirm** in one line what was added and where.

---

### Step 1: Read user data

For EACH target user:
1. Read `DATA_DIR/<handle>/profile.yaml` — extract location_priority, skills, ethical_filter, search_notes, feedback_files, learning_path
2. Read career files from `DATA_DIR/<handle>/`: `goals.md`, `cv.md`, `journal.md`, `archive.md`
3. Read existing `DATA_DIR/<handle>/Dashboard.html` (or `Offers.html` if Dashboard.html doesn't exist yet) to know what's already tracked
4. Read `DATA_DIR/<handle>/sources.yaml` for user-specific sources
5. Read `sources-general.yaml` (shared, read once)
6. Load feedback files listed in profile.yaml
7. Read learning-loop files (if they exist — gracefully skip if missing):
   - `DATA_DIR/<handle>/learned-preferences.md` — accumulated preference model from past feedback
   - `DATA_DIR/<handle>/feedback.yaml` — raw Q&A history from past runs
   - `DATA_DIR/<handle>/search-log.yaml` — per-run query performance log
   - `DATA_DIR/<handle>/metrics.yaml` — run-over-run quality metrics
8. Read `DATA_DIR/<handle>/comments.json` and process per `reference/comments-processing.md` (intent detection, scoring overrides, profile updates, cleanup).

### Step 1.5: Adaptive strategy review (learning loop)

Read `reference/learning-loop.md` § "Pre-Search" for the full protocol. Internalize past preferences, query performance, and metrics trends to form a search plan. Skip if no learning-loop files exist yet.

**Novelty-Zero Detection:** After reading `metrics.yaml`, check if 2+ of the last 3 runs had `new_offers: 0` OR if total new_offers across the last 3 runs < 3. If so, activate **Novelty-Zero Mode** for this run. This mode changes agent behavior as defined in `reference/search-agents.md` — read those instructions carefully. Log the activation in admin_notes: `"Novelty-Zero Mode activated: N consecutive runs with 0 new offers."`

**Seniority ceiling review (Novelty-Zero Mode only):** When catalog is < 15 offers and novelty has been 0 for 2+ runs, check if the seniority ceiling (`max_required_years`) is causing excessive filtering. Log in admin_notes how many offers were rejected by the seniority gate in the last run. If >50% of total finds were rejected by seniority alone, note this as a potential bottleneck and suggest the user consider raising the ceiling by 1 year in the feedback questions.

### Step 1.7: Automatic clean (pre-search)

Before searching for new offers, clean stale ones from the existing catalog. Run Clean Mode steps C1-C3 for each target user. This ensures the catalog is fresh before new offers are merged in.

Skip C4 (commit) — changes will be committed in Step 6 along with everything else.

If `offers.json` does not exist for a user (first run), this step is a no-op.

### Step 2: Search phase — spawn parallel agents

Read `reference/search-agents.md` for agent specifications, output format, and field guidelines. Spawn all agents described there (general, per-user, maintenance, post-search).

**After initial search agents return, check results:**
- Count genuinely NEW offers (not already in offers.json) found by initial agents
- If new offers < 5 OR Novelty-Zero Mode is active: spawn ALL refinement agents (Gap Analysis + Non-Obvious) AND the Community & Social Search agent AND the Funding & Career Page Monitor agent
- The refinement agent trigger in reference/search-agents.md uses "fewer than 15 offers" — this means fewer than 15 NEW offers found THIS RUN, not total catalog size. With a catalog of 11 and novelty at 0, refinement agents MUST fire.

### Steps 3-4: Distribution & update phase

Read `reference/update-phase.md` for the full protocol. Covers: ethical filtering, location/skills scoring, offers.json generation, link validation, HTML rendering, LLM verification, stale offer handling, people tracking, learning path updates, goals.md updates, and CV suggestions.

**Gate rule: No offer enters offers.json without a verified link pointing to the actual job listing.** If a URL cannot be confirmed to show the specific position, drop the offer entirely. A working URL that doesn't show the offer is the same as a dead link.

### Step 5: Summary phase

For EVERY target user, ALWAYS generate the unified `Dashboard.html`.

The dashboard combines all views in a single tabbed HTML file: **Offers** (persistent catalog), **Run Summary** (tips + admin notes), and **Learning Path** (if the user has a learning_path in profile.yaml). The "Last updated" date is shown at the top.

1. Write `DATA_DIR/<handle>/summary-data.json` — same `RenderContext` schema as offers.json, but add `tips` (per-user advice) and `admin_notes` (admin-only process notes). Mark hidden gems with `hidden_gem: true`.
2. Render the unified dashboard:
```bash
career-render DATA_DIR/<handle>/
```
This reads `offers.json`, `summary-data.json`, and `profile.yaml` (for schedule) and produces a single `Dashboard.html`.

**Summary contents:**
- Urgent deadlines banner
- Single table of ALL offers found this run with columns: `#`, `Role`, `Company`, `Location`, `Domain`, `Level / Salary`, `Mission`, `Tools`, `Published`, `Match`, `Your Score`, `Comment`. Deadlines appear as inline badges next to the role name. Hidden gems marked in Notes. The `Your Score` column lets the user enter their own 0-10 match score; the `Comment` column is user-editable. Both are persisted via `comments.json` (scores under the `_scores` key).
- Per-user tips: personalized CV suggestions, skill gap advice, application tactics tailored to their profile. If the user has a `learning_path` in their profile, suggest adjustments based on what the current run's offers demand most
- **Admin-only notes** (ONLY in the admin/operator's summary): process improvements, proposed source edits, tool/repo discoveries, SKILL.md change suggestions, what worked well vs. what could be better

### Step 6: Git commits

For each user, only commit if their user directory has a `.git/` subdirectory:
```bash
if [ -d DATA_DIR/<handle>/.git ]; then
  git -C DATA_DIR/<handle> add -A
  git -C DATA_DIR/<handle> commit -m "career: job search refresh"
fi
```
If no `.git/` exists, skip — files are synced via Google Drive.

### Steps 6.5-7: Post-search learning loop

Read `reference/learning-loop.md` § "Post-Search" and § "Post-Report" for the full protocol. Covers: search-log.yaml updates, metrics.yaml updates, conversational feedback questions, preference recording, and learning-loop commits.

**Single-user runs only:** After presenting the final report, ask the user 3-5 targeted questions to refine the target user's profile for next time. See reference/learning-loop.md § "Post-Report" for question selection strategy. Wait for answers before committing learning-loop files. **Skip this step when running for multiple users** — sharpening questions are only useful when focused on one person's search.

### Step 8: Final report

Read `reference/final-report.md` for the required report format. All sections are mandatory — never skip any.

---

## Reference Files

| Topic | File |
|-------|------|
| Deep search tactics | `reference/deep-search-tactics.md` |
| Clean mode (C1-C4) | `reference/clean-mode.md` |
| Search agents & output format | `reference/search-agents.md` |
| Distribution & update (Steps 3-4) | `reference/update-phase.md` |
| Final report format (Step 8) | `reference/final-report.md` |
| Comments processing | `reference/comments-processing.md` |
| Learning loop protocol | `reference/learning-loop.md` |
| New-user creation flow | `reference/new-user-flow.md` |
| Update-user flow | `reference/update-user-flow.md` |
| HTML templates & models | `career/templates/`, `career/models.py` |
| General sources | `sources-general.yaml` |
| User-specific sources | `DATA_DIR/<handle>/sources.yaml` |
