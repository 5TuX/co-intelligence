# Clean Mode (`/career clean [handles]`)

When clean mode is triggered explicitly via `/career clean`, run steps C1-C4 for each target user and then stop (do not continue to the search phase).

## C0. Process user comments

Before cleaning, read `DATA_DIR/<handle>/comments.json` and apply the full comment rules from SKILL.md Step 1.8:
- **Delete requests** — `"delete this"`, `"remove"`, `"drop"` → remove offer immediately. Archive to archive.md. Remove comment from `comments.json`.
- **Rejection comments** — `"not interested"`, `"skip"`, `"pass"`, etc. → same as delete.
- **Protected offers** — `"applied"`, `"sent CV"`, `"interview"`, `"in progress"` → must NOT be removed even if the link is dead. Mark notes with "link dead but user applied — keeping".
- **Profile changes** — `"I don't like [domain]"`, `"avoid [industry]"` → update `profile.yaml` exclusions, then remove ALL matching offers. Log in final report.
- **Skill changes** — comments implying skill modifications → queue for user confirmation (do not apply automatically).
- Remove consumed action comments from `comments.json` after processing. Keep neutral/tracking comments.

## C1. Run the automated cleaner

For EACH target user:
```bash
uv run career-clean DATA_DIR/<handle>/ --timeout 15
```

Read the generated `DATA_DIR/<handle>/clean-report.json`.

## C1.5. Generic URL pattern check

Before handling flagged offers, scan all offer URLs for generic careers page patterns. **Remove** any offer whose URL matches:
- `jobs.lever.co/<company>` or `jobs.eu.lever.co/<company>` (no UUID after company)
- `apply.workable.com/<company>` (no `/j/<id>` suffix)
- `jobs.ashbyhq.com/<company>` (no UUID after company)
- `boards.greenhouse.io/<company>` (no `/jobs/<id>` suffix)
- URLs ending in `/careers`, `/jobs`, `/open-roles`, `/hiring`, `/open-positions` with no further path

These are hub pages, not specific listings. Log with reason "generic careers page URL". Academic/lab pages are exempt if the page clearly describes specific positions.

## C2. Handle flagged offers (LLM review)

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
uv run career-render DATA_DIR/<handle>/
```

## C2.5. Soft dead link scan (LLM content verification)

After resolving flagged offers, scan ALL remaining offers for soft-dead links. These are URLs that return 200 OK but don't show the actual job listing. Skip offers whose URL was already verified in C2 (Playwright already confirmed the listing).

For each unverified offer, use WebFetch (or Playwright for JS-rendered pages) and verify:
- The page contains a **specific job description** with responsibilities, requirements, or qualifications
- The page is for **this specific role** (not a generic careers/tenders/jobs listing page)
- The page describes a **paid position** (not a volunteer call, community contribution, or "get involved" page)
- The listing is **currently active** — check for banners, notices, or elements saying "this position is no longer available", "position filled", "expired", "closed", "no longer accepting applications". WTTJ and similar platforms keep the full job page visible but add a dismissal banner — always check for this.
- The listing is **from the current year** — if the page only mentions deadlines, dates, or timeframes from a previous year (e.g., "deadline: 2024", "apply by December 2024", "published in 2024") and no current-year dates, it is stale. News/announcement pages are especially prone to this. Check the page's publication date, deadline mentions, and any year references.

**Remove** if:
- The URL shows a blog post, wiki, homepage, or generic listing page
- The URL shows a tenders/procurement page without a specific role description
- The page has no job-specific content (no responsibilities, no requirements, no application instructions)
- The page shows the listing but includes an "unavailable" / "expired" / "position filled" banner or notice

**Keep** if the page clearly shows the specific job posting with role details.

Mark removed offers with reason: "soft dead link — <what the page actually shows>"

After removing soft-dead offers, update `offers.json` and re-render (same as C2).

## C3. Archive removed offers

For all removed offers (both auto-removed by `career-clean` and LLM-confirmed), append to the "Removed Offers" section of `DATA_DIR/<handle>/archive.md`:
- Use the existing location-based subsection structure (Strasbourg, France/Nearby, Remote International, etc.)
- Format: `- ~~Company — Role~~ — <reason> (<date>)`
- The `detail` field from clean-report.json provides the reason.

## C4. Summary and commit

Print a summary to the user: N offers checked, N removed, N flagged (N resolved by LLM review).

If the user directory has a `.git/` subdirectory, commit the changes:
```bash
if [ -d DATA_DIR/<handle>/.git ]; then
  git -C DATA_DIR/<handle> add offers.json Dashboard.html archive.md clean-report.json
  git -C DATA_DIR/<handle> commit -m "career: clean — removed N dead/stale offers"
fi
```
