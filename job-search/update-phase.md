# Distribution & Update Phase (Steps 3-4)

## Step 3: Distribution phase

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

## Step 4: Update phase (per user)

For EACH target user:

### 4a. Validate links (automated)

Run the link validator against the offers JSON:
```bash
uv run js-validate-links users/<handle>/offers.json --output users/<handle>/link-results.json
```
Read `link-results.json`. Remove offers with status `dead` or `expired`. Mark `captcha` offers as UNCERTAIN in notes. Log removed offers.

### 4b. Render Dashboard.html (automated)

After cleaning dead links from `offers.json`, render the unified dashboard:
```bash
uv run js-render users/<handle>/
```

Dashboard.html is a **single tabbed HTML** combining: **Offers** (full catalog table with columns: `#`, `Role`, `Company`, `Location`, `Domain`, `Level / Salary`, `Mission`, `Tools`, `Match`), **Run Summary** (tips + admin notes), and **Learning Path** (if user has learning_path in profile.yaml). Deadlines appear as inline badges. The "Last updated" date is shown at the top.

### 4b2. Generic URL pattern check (automated)

Before LLM verification, scan all offer URLs for generic careers page patterns. **Remove** any offer whose URL matches these patterns (no job-specific identifier):
- `jobs.lever.co/<company>` or `jobs.eu.lever.co/<company>` (no UUID after company name)
- `apply.workable.com/<company>` (no `/j/<id>` suffix)
- `jobs.ashbyhq.com/<company>` (no UUID after company name)
- `boards.greenhouse.io/<company>` (no `/jobs/<id>` suffix)
- URLs ending in `/careers`, `/jobs`, `/open-roles`, `/hiring`, `/open-positions` with no further path
- URLs that are clearly a company homepage (`https://company.com/` or `https://company.com`)

These are hub/index pages, not specific listings. Log removed offers with reason "generic careers page URL — no specific job listing linked".

**Exception:** Academic/lab pages (e.g., university department openings pages) where per-position URLs don't exist are acceptable if the page clearly describes specific positions. These should have a note in the `notes` field explaining this.

### 4c. Additional link verification (LLM)

For new offers not yet validated, verify with WebFetch. Do NOT add links that:
- Return 404 or redirect to a generic search/home page
- Show "this offer is no longer available", "expired", "archived", or "position filled"
- Are behind a CAPTCHA wall (mark as UNCERTAIN and note it)
- Redirect to a different job listing
- **Have no dates from the current year or the previous 3 months** — if a page only shows dates from a year ago or older, it is stale and must be excluded. Academic/research pages are especially prone to this.
- **Are from a news/announcement source older than 6 months** — if the source URL is a press release, news article, or one-time announcement (not an active job board) and its publication date is >6 months old, treat any offers from it as unverified. Prefer finding the same role on the employer's actual careers page instead.
- **Mention only previous-year deadlines** — if the page references a specific deadline or application window from a prior year (e.g., "deadline: 15 September 2024"), the offer is stale regardless of whether the page is still live. This is common with institutional/government job announcements that stay published indefinitely.
- **Land on a page that doesn't contain the specific job listing** — if the URL loads but shows a company homepage, a generic careers page, a blog post, a wiki, or any page without a concrete job description with responsibilities/requirements, it is a dead link. The page must show the actual offer.
- **Show a community/volunteer call** instead of a job listing — verify the page describes a paid position with a job description, not a volunteer contribution request or a general "get involved" page

### 4d. Date verification

When in doubt, check copyright dates, last-updated timestamps, and whether any content references recent dates. Listings with only old dates are stale.

### 4e. Stale offer handling

When removing stale offers from the dashboard, move them to the "Removed Offers" section in `users/<handle>/Job-Search-Reference.md` (under the appropriate subsection) with a brief reason. Also update skill gaps, tips, and adjacent roles sections if market data warrants it.

### 4f. Update People to Follow / Contact

During searches, collect interesting people: lab leads, hiring managers, researchers publishing at the intersection of AI and the user's preferred domains. Add them with affiliation, domain, why they're interesting, and how to reach them. Remove people who have moved on or are no longer relevant.

### 4g. Update learning path

If the user has a `learning_path` in their profile, review it against the current run's results:
1. **Check skill relevance** — are the listed skills still the most demanded by active offers? Count tool/skill frequency across all offers and compare.
2. **Suggest adjustments** — if a new skill emerges as high-demand (e.g., a wave of offers asking for Go or Rust), propose adding it or re-prioritizing.
3. **Update resources** — if a resource link is dead or a better resource exists (newer course, official tutorial updated), replace it.
4. **Track progress** — if the user mentions completing a resource or achieving proficiency in a skill, move it from `learning` to `strong` in the skills section and propose removing or deprioritizing it in the learning path.

Only modify the learning path with user approval. Present proposed changes as a diff in the final report.

### 4h. Update Direction.md

Update `users/<handle>/Direction.md` — update skill levels if recent work changed them, add new skill gaps, refresh market demand notes.

### 4i. CV suggestions

Suggest CV improvements based on what current offers are asking for. Cross-reference with the user's `Human-Expertise.md` to highlight underrepresented strengths. **Display proposed changes for user approval before writing to CV.md.**
