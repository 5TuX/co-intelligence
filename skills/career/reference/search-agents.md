# Search Phase — Agent Specifications (Step 2)

**Use parallel agents aggressively.** After reading user data (step 1), spawn multiple agents to work concurrently.

**Pass to all agents:** today's date (for `after:` queries), learning context from Step 1.5, and the required output format below.

**Agent output format:** All search agents must return results as a list of objects:
```json
[{"role": "...", "company": "...", "url": "...", "location": "...", "domain": "...", "level": "...", "salary": "...", "mission": "...", "tools": "...", "source": "...", "notes": "..."}]
```

Field guidelines:
- **`level`** — demanded study level and/or years of experience. Concise format: `"MSc, 5-7y"`, `"3-4y"`, `"PhD pref."`, `"BSc, 2y+"`. Leave empty if not specified.
- **`salary`** — advertised compensation, **always expressed as gross €/month**. Convert annual to monthly (÷12). Concise format: `"€4.2-6.3K/mo"`, `"€2.3K/mo"`. If source gives net, note it: `"€2.2-2.8K/mo net"`. Convert other currencies to EUR (approx rates: $1≈€0.92, £1≈€1.17). Leave empty if not disclosed.

**Level/salary recovery techniques** — many job boards hide this data from the visible page but embed it in structured data. When scraping, always check:
1. **Schema.org JSON-LD** (`<script type="application/ld+json">`) — look for `baseSalary` (with `minValue`/`maxValue`/`currency`/`unitText`), `experienceRequirements`, `educationRequirements`, `qualifications`. WTTJ, Built In, and Hellowork reliably embed these.
2. **Lever API** — for `jobs.lever.co/<company>/<uuid>` listings, fetch `https://api.lever.co/v0/postings/<company>/<uuid>` for structured data including `createdAt`. Note: Lever pages do NOT show salary.
3. **Built In metadata** — look for `monthsOfExperience` and `credentialCategory` in schema.org data.
4. **French public sector scales** — INRIA, CNRS, and university positions use published salary grids. INRIA pages show the bracket (e.g., "€2,348–2,631/mo gross"). CAMMA/ICube use IE/IR/CRCN public sector grades.
5. **ABG pages** — show the thesis subject date next to "Sujet de Thèse" which serves as the publication date.
6. **Hellowork** — classifies seniority explicitly (e.g., "Confirmé (3 à 5 ans)") in structured data.
7. **WTTJ Cloudflare workaround** — if initial fetch returns 403, retry; WTTJ JSON-LD contains `baseSalary`, `experienceRequirements`, and `educationRequirements` when accessible.
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

---

## Novelty-Zero Protocol

**Before spawning search agents**, the orchestrator MUST read `metrics.yaml` and check the last 3 runs' `new_offers` count. If 2+ of the last 3 runs had `new_offers: 0` (or total new_offers across the last 3 runs < 3), activate **Novelty-Zero Mode** for this run.

When Novelty-Zero Mode is active:

1. **Query blacklist** — Read `search-log.yaml`, extract every query that returned `high_match: 0` for 2+ consecutive runs. These queries are **BANNED** for this run. The agent must not repeat them or trivial variations (adding/removing a year, shuffling OR terms counts as trivial).

2. **60% novel queries** — At least 60% of queries this run must be **structurally different** from any query in search-log.yaml. "Structurally different" means: different `site:` domain, different keyword axis (company name vs skill, tool vs domain), or different search tactic (forum, social, funding, community, career-page-direct).

3. **Mandatory deep tactics** — `reference/deep-search-tactics.md` sections G, H, I, and J are **no longer optional**. The deep search agent MUST execute at least 3 queries from section G (all G1-G6 in Novelty-Zero Mode), at least 2 from section H (all in Novelty-Zero Mode), and at least 2 each from sections I and J.

4. **Forced refinement agents** — Gap Analysis and Non-Obvious agents are spawned **unconditionally**, regardless of initial result count.

5. **Forced community/social + funding agents** — The Community & Social Search agent and Funding & Career Page Monitor agent (defined below) are spawned **unconditionally**.

6. **Seniority audit** — Log how many candidate offers were rejected by the seniority gate this run. If >50% of total finds were rejected by seniority alone, flag in admin_notes: "Seniority ceiling may be too restrictive — N/M offers rejected. Consider raising max_required_years by 1."

Log in admin_notes: `"Novelty-Zero Mode activated: N consecutive runs with 0 new offers. Blacklisted M queries."`

---

## General agents (use sources-general.yaml, run once for all users)

**Agent: General job board search**
Search all sources in `sources-general.yaml`. Collect raw results into a shared pool. Include clickable URLs.

**Agent: Agentic job search intelligence**
Search the web for new AI-powered job search strategies, tools, and repos (e.g. AI resume tailoring, automated application agents, networking bots, LinkedIn optimization tools, agentic job matching). Look for GitHub repos, blog posts, and emerging approaches. Include clickable links.

**Agent: Market trends + skill gaps**
Search the internet for current AI/ML job market trends. Cross-reference with ALL target users' skill levels to identify highest-ROI gaps. Search for cool ideas around users' recent work topics.

## Per-user agents (use DATA_DIR/<handle>/sources.yaml, one set per user)

For EACH target user, spawn:

**Agent: User-specific source search — <handle>**
Search all sources in `DATA_DIR/<handle>/sources.yaml`. Follow the user's `search_notes` from their profile — these contain specific labs, companies, institutions, and domains to check. Include clickable URLs. Apply that user's ethical filtering.

**Agent: Deep search — <handle>**
Read `reference/deep-search-tactics.md` for the full tactics reference. Adapt all strategies to this user's profile:
- Use the user's skills (from profile.yaml) to construct role keyword variants
- Use the user's location_priority for geographic targeting
- Use the user's ethical_filter.prioritize for domain-specific dork queries
- Use the user's search_notes for company/lab-specific searches
- Read the user's goals.md to determine seniority level for negative keyword filtering

**Agent: Community & social search — <handle>**
Search non-traditional sources invisible to standard ATS dorking:

1. **HN Who is Hiring** — Use hnhiring.com (filterable) or Algolia HN API (`hn.algolia.com/api/v1/search?tags=comment&query=<skill> AND (<location> OR remote)`) to search WITHIN comments of the current month's thread. Filter by user skills and location.

2. **Reddit hiring threads** — Search for recent posts:
   - `site:reddit.com/r/MachineLearning "[H]" OR "hiring" "<skill>" after:<30d>`
   - `site:reddit.com/r/MLjobs "<skill>" "<location>" after:<30d>`
   - `site:reddit.com/r/cscareerquestionsEU "<skill>" France OR remote after:<30d>`

3. **Twitter/X hiring signals** — Search for recent posts:
   - `"hiring" OR "we're hiring" "<skill>" "<location>" site:x.com after:<30d>`
   - Search target companies: `"<company>" "hiring" site:x.com after:<30d>`

4. **Community job channels** — Search these communities for postings:
   - DataTalks.Club (datatalks.club) job board
   - MLOps Community job channels
   - HuggingFace Discord (#jobs)
   - Learn AI Together Discord (66k members)
   - Pattern: `site:discord.com OR site:datatalks.club "<skill>" "hiring" OR "job"`

5. **Newsletter job boards** — Check directly: AI Engineer newsletter, The Batch (deeplearning.ai), TLDR AI newsletter

6. **Niche boards** — Check these that are NOT in sources.yaml: Station F jobs (jobs.stationf.co), AAAI Career Center (aaai.org/careers), Bot-Jobs (bot-jobs.com), Jobtensor (jobtensor.com), Untapped.io, LesJeudis (lesjeudis.com)

Note the source community in the `source` field.

**Agent: Funding & career page monitor — <handle>**
Proactively find companies hiring before they post on aggregators:

1. **Recently funded companies** — Search for startups in user's preferred domains that raised funding in the last 6 months:
   - `"series A" OR "series B" OR "raised" OR "funding" "<domain>" France OR Europe 2026`
   - Check sifted.eu, techcrunch.com for recent funding rounds
   - For each funded company found, visit their careers/jobs page directly

2. **Direct career page visits** — For high-priority companies already in sources.yaml that haven't yielded offers recently, visit their careers page directly (not via aggregator). Companies post to their own site days before aggregators index them.

3. **French tech ecosystem lists** — Check career pages of companies from:
   - La French Tech Next40/FT120 company list
   - TECH500 (tech500.co) — top 500 French startups
   - France Digitale portfolio companies

4. **Google Alerts simulation** — Highly specific recency queries:
   - `"<exact-skill>" "recrutement" OR "CDI" OR "hiring" site:.fr after:<7d>`
   - `"<company-from-sources>" "engineer" OR "ingénieur" after:<7d>`

Flag source as "direct-career-page" or "funding-signal" in results.

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
   **Staleness threshold**: sources with `source_type: announcement` or `news` whose `published_date` is older than 6 months are likely obsolete. Either remove them (archive to archive.md with reason) or convert to a tip (e.g., "European AI Office hires technology specialists — check EPSO/EU careers portal directly").
4. **Discover new sources** — search the web for:
   - Job boards and aggregators recommended by AI/ML professionals (blog posts, Reddit, HN, Twitter/X)
   - Niche boards matching target users' profiles
   - Community job boards (Discord, Slack, newsletters)
   - New platforms or aggregators that have emerged recently
5. **Add discoveries** with correct priority, keywords, URL, `discovered: YYYY-MM-DD`, and optionally `recommended_by:`.
6. **Add `last_checked: YYYY-MM-DD`** to each source after validation.
7. Return summary: sources added, removed (with reason), flagged as problematic (including any stale announcements detected).

**Prioritize sources not checked in the last 30 days** (check `last_checked` field). Skip sources validated within the last 7 days to save time.

## Refinement agents (spawned by orchestrator AFTER initial search agents return)

**Trigger:** Spawn if ANY of the following are true:
- Initial search agents found fewer than 15 **NEW** offers this run (not total catalog — genuinely new finds not already in offers.json)
- Novelty-Zero Mode is active (see protocol above)
- The user's total catalog has fewer than 20 offers

In **Novelty-Zero Mode**, these agents are **MANDATORY** regardless of initial results.

**Agent: Gap analysis — <handle>**
Analyzes what initial results miss (gaps in geography, domain, seniority). Generates 3-5 alternative query reformulations targeting the gaps. Uses the user's profile for context. Returns only net-new results in the standard output format.

When analyzing gaps, specifically check:
- Companies in sources.yaml that have **NEVER** yielded an offer — visit their careers page directly
- Role title variants not yet tried: `"ML engineer"` vs `"machine learning engineer"` vs `"AI developer"` vs `"ingénieur IA"` vs `"data scientist ML"` vs `"deep learning engineer"` vs `"computer vision engineer"` vs `"NLP engineer"` vs `"AI research engineer"`
- Adjacent domains from the user's `also_look_for` list in profile.yaml
- Location variants: city names in local language, department codes, region names (e.g., Strasbourg → `"Bas-Rhin"`, `"67000"`, `"Grand Est"`, `"Alsace"`)

**Agent: Non-obvious strategies — <handle>**
Uses tactics from `reference/deep-search-tactics.md` sections G, H, I, and J. Constructs composite queries combining ALL operators. Looks for informal hiring posts, recently-funded startups, conference back-channels. Tests non-English queries for bilingual regions. Searches for companies the user would love but hasn't heard of. Returns only net-new results in the standard output format.

## Post-search agent (runs AFTER all search and refinement agents return)

**Agent: Strategy suggestions**
Based on all search results, generate strategy recommendations. Split into:
- Per-user tips (personalized CV suggestions, skill gap advice, application tactics)
- Admin-only notes (process improvements, source edits, tool/repo discoveries, SKILL.md changes)

This agent must wait for all search and refinement agents to complete before running.
