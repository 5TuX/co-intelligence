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
├── profile.yaml            # Preferences, ethical filters, location, skills, weekly schedule
├── sources.yaml            # User-specific job sources
├── Offers.html             # Active offers (styled HTML)
├── summary.html            # Last generated search summary
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

## Shared Resources (skill root)

```
~/.claude/skills/job-search/
├── SKILL.md                # This file — orchestration + shared tactics
├── pyproject.toml           # Python deps (jinja2, httpx, pydantic, pyyaml)
├── job_search/              # Python package — automation scripts
│   ├── models.py            #   Pydantic: Offer, Source, RenderContext, etc.
│   ├── render.py            #   CLI: js-render (JSON → HTML via Jinja2)
│   ├── links.py             #   CLI: js-validate-links (async link checking)
│   ├── sources.py           #   CLI: js-validate-sources (YAML validation)
│   └── templates/           #   Jinja2 templates (base, offers, summary)
├── sources-general.yaml    # Broad AI/ML job boards (used for all users)
├── career-reference.md     # General reference (shared)
├── feedback_cv_honesty.md  # General feedback (shared)
└── users/                  # Per-user directories
```

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
1. Read `users/<handle>/profile.yaml` — extract location_priority, skills, ethical_filter, search_notes, feedback_files, weekly_schedule
2. Read career files from `users/<handle>/`: `Direction.md`, `CV.md`, `Human-Expertise.md`, `Journal.md`, `Job-Search-Reference.md`
3. Read existing `users/<handle>/Offers.html` to know what's already tracked
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

Read `update-phase.md` for the full protocol. Covers: ethical filtering, location/skills scoring, offers.json generation, link validation, HTML rendering, LLM verification, stale offer handling, people tracking, weekly schedule updates, Direction.md updates, and CV suggestions.

**Gate rule: No offer enters offers.json without a verified link pointing to the actual job listing.** If a URL cannot be confirmed to show the specific position, drop the offer entirely. A working URL that doesn't show the offer is the same as a dead link.

### Step 5: Summary phase

For EVERY target user, ALWAYS generate `users/<handle>/summary.html`.

**summary.html is the run digest** — same full offer table as Offers.html, plus actionable advice and admin notes. Offers.html is the persistent catalog (survives across runs); summary.html is a snapshot of the current run's results with commentary.

1. Write `users/<handle>/summary-data.json` — same `RenderContext` schema as offers.json, but add `tips` (per-user advice) and `admin_notes` (admin-only process notes). Mark hidden gems with `hidden_gem: true`.
2. Render to HTML:
```bash
uv run js-render users/<handle>/summary-data.json --template summary --user-dir users/<handle>/
```

**Summary contents:**
- Urgent deadlines banner
- Single table of ALL offers found this run with columns: `#`, `Role`, `Company`, `Location`, `Domain`, `Level / Salary`, `Mission`, `Tools`, `Match`. Deadlines appear as inline badges next to the role name. Hidden gems marked in Notes.
- Per-user tips: personalized CV suggestions, skill gap advice, application tactics tailored to their profile. If the user has a `weekly_schedule` in their profile, suggest adjustments based on what the current run's offers demand most
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

**MANDATORY: After presenting the final report, you MUST ask the user 3-5 targeted questions to refine their profile for next time.** Do not skip this step. See learning-loop.md § "Post-Report" for question selection strategy. Wait for answers before committing learning-loop files.

### Step 8: Final report

**Report summary with clickable links** — always include offer URLs in the terminal output. Include a dedicated section for agentic strategy suggestions.

**Final report MUST include ALL of these sections — never skip any:**

#### A) Top 10 best-fit offers table (per user)

For each user, a markdown table of exactly 10 job offers, selected from ALL offers found (not just new ones), ranked by overall fit (technical match + location). Location ranking comes from the user's `location_priority` in profile.yaml. Columns: `#`, `Role`, `Company`, `Location`, `Distance`, `URL`, `Source` (indicate if found via dorking/X-ray vs standard board). If more than 10 offers were found total, pick the 10 best-fit. All offers still go into Offers.html — this table is just a curated highlight for quick scanning.

#### A.5) Hidden gems — offers found via deep search only

List any offers the deep search agent found that were NOT on standard job boards. These are the highest-value finds. If none, note that and suggest refined dork queries to try next time.

#### B) Strategy & process improvement suggestions

Based on the agentic intelligence agent's findings, always present concrete suggestions for improving the job search process itself. This section is **mandatory** — every run must include it. Cover:
- New tools, repos, or platforms discovered that could help
- Workflow changes or automation opportunities
- Proposed edits to this skill (`SKILL.md`) or source files — describe the change and why, for user approval
- What worked well this run vs. what could be better
- Any emerging job search trends or strategies worth adopting

---

## Deep Search Tactics

**Extracted to `deep-search-tactics.md`** — loaded by the deep search agent only. Includes: Google Forums (udm=8), ATS X-ray, company dorking, hidden document search, domain-specific searches, temporal filtering, invisible job queries, funding signals, conference back-channels, non-English variants, and agent self-refinement protocol.

---

## HTML Templates & CSS

CSS and HTML templates live in `job_search/templates/`:
- `base.html.j2` — shared CSS and layout (canonical CSS source)
- `offers.html.j2` — full catalog template (renders to `Offers.html`)
- `summary.html.j2` — run digest template (renders to `summary.html`)

Data models are defined in `job_search/models.py` — see `RenderContext` for the JSON schema that feeds both templates.

**Match scoring:** The `match` field is an integer 0-10 (10 = perfect fit, 8-9 = excellent, 6-7 = very good, 4-5 = good, below 4 = marginal). The HTML renders each score with a color gradient from red (0) through yellow (5) to green (10).

---

## New-User Creation (`/job-search new-user`)

**Full flow in `new-user-flow.md`.** Interactive questionnaire covering: basics, location, skills, domain preferences, special interests, custom sources, career docs import, PhD interest. Generates `users/<handle>/` with profile and skeleton files (copied from `users/_example/`).

---

## Update-User (`/job-search update-user <handle>`)

**Full flow in `update-user-flow.md`.** Reads current profile, displays summary, accepts changes interactively.

---

## Source References

- **General sources** (all users): `sources-general.yaml` in this skill's root directory
- **User-specific sources**: `users/<handle>/sources.yaml` in each user's directory
