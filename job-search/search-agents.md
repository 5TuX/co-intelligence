# Search Phase — Agent Specifications (Step 2)

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

**URL requirements — CRITICAL:**
- **Every `url` must point to a specific job listing**, not a generic careers page, company homepage, or job board search. The URL, when visited, must show a concrete job description with responsibilities/requirements.
- **Reject generic ATS hub URLs** — these are URLs that point to a company's job listing index, not a specific role:
  - Lever: `jobs.lever.co/<company>` without a job UUID (e.g., `jobs.lever.co/veepee` is INVALID; `jobs.lever.co/mistral/<uuid>` is valid)
  - Workable: `apply.workable.com/<company>` without `/j/<id>` (e.g., `apply.workable.com/huggingface` is INVALID)
  - Ashby: `jobs.ashbyhq.com/<company>` without a job UUID
  - Greenhouse: `boards.greenhouse.io/<company>` without `/jobs/<id>`
  - WTTJ: `welcometothejungle.com/.../companies/<co>` without `/jobs/<slug>`
  - Generic `/careers`, `/jobs`, `/open-roles`, `/hiring` pages
- **If you can only find the company's careers hub** but not a direct link to the specific role, **do not add the offer**. Note the company name and available roles in the `admin_notes` instead, so the next run can attempt to find direct links.
- **Academic/lab pages** (e.g., `camma.unistra.fr/opening_scientists/`) are acceptable ONLY when the lab doesn't provide per-position URLs AND the page clearly describes the specific position(s). Note this in the offer's `notes` field.

**Graceful degradation:** If an agent fails or times out, log the failure and continue with results from other agents. Note the gap in the final report. Do not retry failed agents.

## General agents (use sources-general.yaml, run once for all users)

**Agent: General job board search**
Search all sources in `sources-general.yaml`. Collect raw results into a shared pool. Include clickable URLs.

**Agent: Agentic job search intelligence**
Search the web for new AI-powered job search strategies, tools, and repos (e.g. AI resume tailoring, automated application agents, networking bots, LinkedIn optimization tools, agentic job matching). Look for GitHub repos, blog posts, and emerging approaches. Include clickable links.

**Agent: Market trends + skill gaps**
Search the internet for current AI/ML job market trends. Cross-reference with ALL target users' skill levels to identify highest-ROI gaps. Search for cool ideas around users' recent work topics.

## Per-user agents (use users/<handle>/sources.yaml, one set per user)

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

## Shared maintenance agent

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

## Post-search agent (runs AFTER search agents return)

**Agent: Strategy suggestions**
Based on all search results, generate strategy recommendations. Split into:
- Per-user tips (personalized CV suggestions, skill gap advice, application tactics)
- Admin-only notes (process improvements, source edits, tool/repo discoveries, SKILL.md changes)

This agent must wait for all search agents to complete before running.
