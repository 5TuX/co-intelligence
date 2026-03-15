---
name: job-search
description: >
  Use when the user says /job-search or asks for a full career refresh,
  job search, CV analysis, or skill gap review.
disable-model-invocation: true
context: fork
argument-hint: "[user1,user2] | all | new-user | update-user <handle>"
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

### Clean Mode (`/job-search clean [handles]`)

When clean mode is triggered explicitly via `/job-search clean`, run steps C1-C4 for each target user and then stop (do not continue to the search phase).

#### C1. Run the automated cleaner

For EACH target user:
```bash
uv run js-clean users/<handle>/ --timeout 15
```

Read the generated `users/<handle>/clean-report.json`.

#### C2. Handle flagged offers (LLM review)

For each offer in `flagged_offers` from the clean report:
- **redirect** → WebFetch the URL. If it lands on a generic careers/search page (not the specific listing), remove it from `offers.json`. If it reaches the same role at a different URL, update the URL. If the listing is still visible, keep it.
- **captcha** → These are JS-rendered pages (Workable, WTTJ, Ashby, etc.) where `httpx` can't read the body. **Use Playwright MCP (`browser_navigate`)** to load each URL and check if:
  - The page redirects to `?not_found=true`, a generic careers page, or a search page → **remove**
  - The page shows "no longer available", "expired", "position filled" → **remove**
  - The page loads the actual job listing → **keep**
  - The page is blocked by a real CAPTCHA challenge → **keep as UNCERTAIN**
  With 30+ CAPTCHA-flagged offers, batch them: navigate to each URL, check the final page URL and title, and decide. Do NOT blanket-keep all CAPTCHA offers without checking.
- **error** → WebFetch to retry once. Remove only if the page clearly shows the listing is gone. Otherwise mark as UNCERTAIN.

After review, if any additional offers were removed, update `offers.json` and re-render:
```bash
uv run js-render users/<handle>/offers.json --template offers --user-dir users/<handle>/
```

#### C3. Archive removed offers

For all removed offers (both auto-removed by `js-clean` and LLM-confirmed), append to the "Removed Offers" section of `users/<handle>/Job-Search-Reference.md`:
- Use the existing location-based subsection structure (Strasbourg, France/Nearby, Remote International, etc.)
- Format: `- ~~Company — Role~~ — <reason> (<date>)`
- The `detail` field from clean-report.json provides the reason.

#### C4. Summary and commit

Print a summary to the user: N offers checked, N removed, N flagged (N resolved by LLM review).

Commit the changes:
```bash
git -C ~/.claude/skills/job-search/users/<handle> add offers.json Offers.html Job-Search-Reference.md clean-report.json
git -C ~/.claude/skills/job-search/users/<handle> commit -m "career: clean — removed N dead/stale offers"
```

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

Before constructing searches, review what you learned from previous runs:

1. **Read `learned-preferences.md`** — internalize the user's resolved, soft, and low-priority preferences. Use these to weight search queries and match scoring. Pay special attention to the "Unresolved" section — these are open questions you'll ask at the end of this run.

2. **Read `search-log.yaml`** — identify high-yield and low-yield queries from past runs:
   - **Double down** on queries with high `high_match` / `results_found` ratios
   - **Reformulate or drop** queries that returned 0 results or 0 high-match offers for 2+ consecutive runs
   - **Rotate fresh variants** — even high-yield queries should be varied to avoid echo-chamber results

3. **Read `metrics.yaml`** — check trend direction:
   - If `novelty` is dropping (fewer new offers per run), expand search scope or add new sources
   - If `precision` is low (user isn't interested in what you're finding), shift queries toward resolved preferences
   - If both are healthy, maintain course

4. **Synthesize** — form a brief internal search plan: "This run I'll emphasize X, de-emphasize Y, and probe Z." Do NOT output this to the user — it's internal context for the search agents.

If no learning-loop files exist yet (first run with this feature), skip this step and proceed normally.

### Step 1.7: Automatic clean (pre-search)

Before searching for new offers, clean stale ones from the existing catalog. Run Clean Mode steps C1-C3 for each target user. This ensures the catalog is fresh before new offers are merged in.

Skip C4 (commit) — changes will be committed in Step 6 along with everything else.

If `offers.json` does not exist for a user (first run), this step is a no-op.

### Step 2: Search phase — spawn parallel agents

**Use parallel agents aggressively.** After reading user data (step 1), spawn multiple agents to work concurrently.

**Pass to all agents:** today's date (for `after:` queries), learning context from Step 1.5, and the required output format below.

**Agent output format:** All search agents must return results as a list of objects:
```json
[{"role": "...", "company": "...", "url": "...", "location": "...", "domain": "...", "level": "...", "salary": "...", "mission": "...", "tools": "...", "source": "...", "notes": "..."}]
```

Field guidelines:
- **`level`** — demanded study level and/or years of experience. Concise format: `"MSc, 5-7y"`, `"3-4y"`, `"PhD pref."`, `"BSc, 2y+"`. Leave empty if not specified.
- **`salary`** — advertised compensation as gross €/month. Convert all currencies to EUR (approx rates: $1≈€0.92, £1≈€1.17) and divide annual by 12. Concise format: `"€7.5K/mo"`, `"€6.7-11.7K/mo"`. Leave empty if not disclosed.
- **`mission`** — company mission in a few words: `"AI for cancer treatment"`, `"Open-source ML tools"`, `"Medical data interop"`. Captures the "why" of the company.
- **`tools`** — key demanded tools/skills: `"Python, PyTorch, Docker"`, `"LangChain, RAG, Go"`. Focus on the most relevant technical requirements.

**Graceful degradation:** If an agent fails or times out, log the failure and continue with results from other agents. Note the gap in the final report. Do not retry failed agents.

#### General agents (use sources-general.yaml, run once for all users):

**Agent: General job board search**
Search all sources in `sources-general.yaml`. Collect raw results into a shared pool. Include clickable URLs.

**Agent: Agentic job search intelligence**
Search the web for new AI-powered job search strategies, tools, and repos (e.g. AI resume tailoring, automated application agents, networking bots, LinkedIn optimization tools, agentic job matching). Look for GitHub repos, blog posts, and emerging approaches. Include clickable links.

**Agent: Market trends + skill gaps**
Search the internet for current AI/ML job market trends. Cross-reference with ALL target users' skill levels to identify highest-ROI gaps. Search for cool ideas around users' recent work topics.

#### Per-user agents (use users/<handle>/sources.yaml, one set per user):

For EACH target user, spawn:

**Agent: User-specific source search — <handle>**
Search all sources in `users/<handle>/sources.yaml`. Follow the user's `search_notes` from their profile — these contain specific labs, companies, institutions, and domains to check. Include clickable URLs. Apply that user's ethical filtering.

**Agent: Deep search — <handle>**
Read `deep-search-tactics.md` for the full tactics reference. Adapt all strategies to this user's profile:
- Use the user's skills (from profile.yaml) to construct role keyword variants
- Use the user's location_priority for geographic targeting
- Use the user's ethical_filter.prioritize for domain-specific dork queries
- Use the user's search_notes for company/lab-specific searches
- Read the user's Direction.md to determine seniority level for negative keyword filtering

#### Shared maintenance agent:

**Agent: Source list maintenance**
Manage BOTH `sources-general.yaml` AND each user's `sources.yaml`. For each run:
1. **Validate existing sources** — visit each URL to check it still works (returns results, isn't dead, hasn't changed structure). Mark broken or empty sources.
2. **Prune stale/irrelevant sources** — remove sources that are consistently dead, no longer relevant, or redundant.
3. **Detect announcement/news sources** — when validating a source URL, check if it's a one-time announcement rather than an evergreen job board. Indicators:
   - URL path contains `/news/`, `/blog/`, `/press/`, `/announcement/`, or a date pattern (e.g., `/2024/`)
   - Page has a single publication date with no recent updates
   - Content is a static article describing a hiring initiative, not a live listing
   Mark these with `source_type: announcement` or `source_type: news` and record `published_date`.
   **Staleness threshold**: sources with `source_type: announcement` or `news` whose `published_date` is older than 6 months are likely obsolete. Either remove them (archive to Job-Search-Reference.md with reason) or convert to a tip (e.g., "European AI Office hires technology specialists — check EPSO/EU careers portal directly").
4. **Discover new sources** — search the web for:
   - Job boards and aggregators recommended by AI/ML professionals (blog posts, Reddit, HN, Twitter/X)
   - Niche boards matching target users' profiles
   - Community job boards (Discord, Slack, newsletters)
   - New platforms or aggregators that have emerged recently
5. **Add discoveries** with correct priority, keywords, URL, `discovered: YYYY-MM-DD`, and optionally `recommended_by:`.
6. **Add `last_checked: YYYY-MM-DD`** to each source after validation.
7. Return summary: sources added, removed (with reason), flagged as problematic (including any stale announcements detected).

**Prioritize sources not checked in the last 30 days** (check `last_checked` field). Skip sources validated within the last 7 days to save time.

#### Post-search agent (runs AFTER search agents return):

**Agent: Strategy suggestions**
Based on all search results, generate strategy recommendations. Split into:
- Per-user tips (personalized CV suggestions, skill gap advice, application tactics)
- Admin-only notes (process improvements, source edits, tool/repo discoveries, SKILL.md changes)

This agent must wait for all search agents to complete before running.

### Step 3: Distribution phase

Pool ALL results from general + all user-specific agents. For EACH target user, filter the pool:

1. **Hard exclude** — apply user's `ethical_filter.exclude` list from profile.yaml. If a company's core business matches an exclusion, drop it entirely — even if the role title sounds technical. Also apply `ethical_filter.exclude_notes` for nuanced rules.
2. **Prioritize** — score by user's `ethical_filter.prioritize` list. Preferred domains get a boost.
3. **Also look for** — apply `ethical_filter.also_look_for` for non-AI-centric roles where AI skills are a force multiplier.
4. **Location scoring** — score by user's `location_priority` (read from profile.yaml). Apply `location_notes` for nuanced location rules.
5. **Skills match** — score by overlap with user's `skills.strong` + `skills.learning`. Note gaps that the role would help fill.
6. **Cross-user results** — include results from other users' source searches IF they match this user's profile. Exclude results that only match another user's niche.
7. **Flag concerns** in the "Notes" column (e.g. "warning: generative art — may displace artists"). This is a soft filter: still list a role if the technical match is EXCELLENT, but note the concern.

After filtering and scoring, **write `users/<handle>/offers.json`** conforming to the `RenderContext` schema (see `job_search/models.py`).
The JSON must include all offers, people, freelance platforms, and urgent deadlines.

### Step 4: Update phase (per user)

For EACH target user:

#### 4a. Validate links (automated)

Run the link validator against the offers JSON:
```bash
uv run js-validate-links users/<handle>/offers.json --output users/<handle>/link-results.json
```
Read `link-results.json`. Remove offers with status `dead` or `expired`. Mark `captcha` offers as UNCERTAIN in notes. Log removed offers.

#### 4b. Render Offers.html (automated)

After cleaning dead links from `offers.json`, render to HTML:
```bash
uv run js-render users/<handle>/offers.json --template offers --user-dir users/<handle>/
```

Offers.html is the **full catalog** of ALL tracked offers rendered as a single unified table with columns: `#`, `Role`, `Company`, `Location`, `Domain`, `Level / Salary`, `Mission`, `Tools`, `Match`. Deadlines appear as inline badges next to the role name. Match values use CSS classes: `excellent`, `very-good`, `good`.

#### 4c. Additional link verification (LLM)

For new offers not yet validated, verify with WebFetch. Do NOT add links that:
- Return 404 or redirect to a generic search/home page
- Show "this offer is no longer available", "expired", "archived", or "position filled"
- Are behind a CAPTCHA wall (mark as UNCERTAIN and note it)
- Redirect to a different job listing
- **Have no dates from the current year or the previous 3 months** — if a page only shows dates from a year ago or older, it is stale and must be excluded. Academic/research pages are especially prone to this.
- **Are from a news/announcement source older than 6 months** — if the source URL is a press release, news article, or one-time announcement (not an active job board) and its publication date is >6 months old, treat any offers from it as unverified. Prefer finding the same role on the employer's actual careers page instead.

#### 4d. Date verification

When in doubt, check copyright dates, last-updated timestamps, and whether any content references recent dates. Listings with only old dates are stale.

#### 4e. Stale offer handling

When removing stale offers from Offers.html, move them to the "Removed Offers" section in `users/<handle>/Job-Search-Reference.md` (under the appropriate subsection) with a brief reason. Also update skill gaps, tips, and adjacent roles sections if market data warrants it.

#### 4f. Update People to Follow / Contact

During searches, collect interesting people: lab leads, hiring managers, researchers publishing at the intersection of AI and the user's preferred domains. Add them with affiliation, domain, why they're interesting, and how to reach them. Remove people who have moved on or are no longer relevant.

#### 4g. Update weekly learning schedule

If the user has a `weekly_schedule` in their profile, review it against the current run's results:
1. **Check skill relevance** — are the scheduled skills still the most demanded by active offers? Count tool/skill frequency across all offers and compare.
2. **Suggest adjustments** — if a new skill emerges as high-demand (e.g., a wave of offers asking for Go or Rust), propose swapping or adding it.
3. **Update resources** — if a scheduled resource link is dead or a better resource exists (newer course, official tutorial updated), replace it.
4. **Track progress** — if the user mentions completing a resource or achieving proficiency in a skill, move it from `learning` to `strong` in the skills section and propose replacing the schedule slot with the next highest-priority gap.

Only modify the schedule with user approval. Present proposed changes as a diff in the final report.

#### 4h. Update Direction.md

Update `users/<handle>/Direction.md` — update skill levels if recent work changed them, add new skill gaps, refresh market demand notes.

#### 4h. CV suggestions

Suggest CV improvements based on what current offers are asking for. Cross-reference with the user's `Human-Expertise.md` to highlight underrepresented strengths. **Display proposed changes for user approval before writing to CV.md.**

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

### Step 6.5: Post-search learning (learning loop)

After generating results but before the final report, update the learning-loop files:

#### 6.5a: Update search-log.yaml

Append this run's search performance to `users/<handle>/search-log.yaml`:
```yaml
- run: <run_number>
  date: <today>
  queries:
    - query: '<the actual search query used>'
      results_found: <count>
      high_match: <count of excellent/very-good matches from this query>
    # ... repeat for each significant query
  new_offers: <count of offers not in previous Offers.html>
  hidden_gems: <count of hidden gem finds>
  dead_links_found: <count of dead/expired links removed>
```

Estimate query-level performance as best you can — exact attribution isn't critical, directional accuracy is.

#### 6.5b: Update metrics.yaml

Append this run's metrics to `users/<handle>/metrics.yaml`:
```yaml
- run: <run_number>
  date: <today>
  total_offers: <total in Offers.html after this run>
  new_offers: <newly found this run>
  hidden_gems: <count>
  dead_links_removed: <count>
  novelty: <new_offers / total_offers>
  # precision is updated retroactively based on feedback from next run
```

### Step 7: Conversational feedback (learning loop)

**This is the key step for incremental improvement.** After presenting results in the final report, ask the user 3-5 targeted questions to learn their preferences.

#### Question selection strategy

Pick 3-5 offers (or absent categories) that are **maximally informative** — not necessarily the best offers, but the ones whose feedback disambiguates the most about what the user wants.

**Selection criteria — pick questions that:**
1. **Test decision boundaries** — offers where two preferences compete (e.g., great tech stack but wrong location: "which matters more here?")
2. **Probe unresolved preferences** — check the "Unresolved" section of `learned-preferences.md` for open questions from past runs
3. **Explore trade-offs** the user hasn't explicitly resolved (seniority vs. location, salary vs. mission, startup vs. established)
4. **Ask about absent categories** — niches that didn't surface this run but might matter ("no marine AI roles this time — should I dig harder or is it a nice-to-have?")
5. **Never repeat** a question whose answer is already recorded in `feedback.yaml` with high confidence

**Question style:**
- Conversational, not survey-like — frame as natural follow-ups to the results
- Reference specific offers by name to make questions concrete
- Present the trade-off explicitly ("X has great tech but is junior-level — would you trade seniority for this stack?")
- Include 1 question about search strategy itself ("I found 5 roles via Greenhouse X-ray — want me to lean harder into ATS dorking next time?")

**Convergence:** As preferences solidify across runs, ask **fewer questions** (0-2 when the preference profile is mature). Check `feedback.yaml` — if the last 3 runs all confirmed the same preferences, stop asking about them.

**Example:**
```
Before I wrap up, a few quick questions to sharpen future runs:

1. StrangeBee (AI Engineer, MCP/LLM) — you've seen MCP roles before.
   Is this still a top priority, or are you cooling on MCP-specific roles?

2. Credit Mutuel (Junior AI, Strasbourg) — this is local but junior-level.
   Would you take a step down in seniority for Strasbourg proximity?

3. I found 3 Hugging Face roles this run. Are open-source orgs a
   strong draw, or is it just the tech stack that appeals?

4. No marine/ocean AI roles surfaced this run. Should I dig harder
   into that niche, or is it more of a "nice bonus"?
```

#### After the user answers

1. **Record in `feedback.yaml`** — append to `users/<handle>/feedback.yaml`:
```yaml
- run: <run_number>
  date: <today>
  exchanges:
    - question: "<the question you asked>"
      answer: "<user's answer, verbatim or closely paraphrased>"
      signal: "<extracted preference signal, e.g.: location_weight: strasbourg++++, seniority_flex: true_for_strasbourg>"
```

2. **Regenerate `learned-preferences.md`** — read the FULL `feedback.yaml` history and regenerate `users/<handle>/learned-preferences.md` with these sections:

```markdown
## Learned Preferences (auto-generated from <N> runs of feedback)

### Resolved preferences (high confidence)
<!-- Preferences confirmed by 2+ runs or stated emphatically -->

### Soft preferences (moderate confidence)
<!-- Preferences mentioned once or inferred from patterns -->

### Low priority (confirmed by user)
<!-- Things the user explicitly said are not important -->

### Unresolved (will ask next run)
<!-- Open questions that would help refine future searches -->
<!-- These seed the NEXT run's question selection -->

Last updated: <date> | Based on: <N> Q&A exchanges across <M> runs
```

3. **Update `metrics.yaml`** — if the user's answers reveal which past offers they applied to or found valuable, retroactively update the `precision` field for previous runs.

4. **Commit the learning-loop files:**
```bash
git -C ~/.claude/skills/job-search/users/<handle> add feedback.yaml search-log.yaml metrics.yaml learned-preferences.md
git -C ~/.claude/skills/job-search/users/<handle> commit -m "career: learning loop update (run <N>)"
```

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
