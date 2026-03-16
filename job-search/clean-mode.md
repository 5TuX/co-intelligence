# Clean Mode (`/job-search clean [handles]`)

When clean mode is triggered explicitly via `/job-search clean`, run steps C1-C4 for each target user and then stop (do not continue to the search phase).

## C1. Run the automated cleaner

For EACH target user:
```bash
uv run js-clean users/<handle>/ --timeout 15
```

Read the generated `users/<handle>/clean-report.json`.

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
uv run js-render users/<handle>/offers.json --template offers --user-dir users/<handle>/
```

## C2.5. Soft dead link scan (LLM content verification)

After resolving flagged offers, scan ALL remaining offers for soft-dead links. These are URLs that return 200 OK but don't show the actual job listing. Skip offers whose URL was already verified in C2 (Playwright already confirmed the listing).

For each unverified offer, use WebFetch (or Playwright for JS-rendered pages) and verify:
- The page contains a **specific job description** with responsibilities, requirements, or qualifications
- The page is for **this specific role** (not a generic careers/tenders/jobs listing page)
- The page describes a **paid position** (not a volunteer call, community contribution, or "get involved" page)

**Remove** if:
- The URL shows a blog post, wiki, homepage, or generic listing page
- The URL shows a tenders/procurement page without a specific role description
- The page has no job-specific content (no responsibilities, no requirements, no application instructions)

**Keep** if the page clearly shows the specific job posting with role details.

Mark removed offers with reason: "soft dead link — <what the page actually shows>"

After removing soft-dead offers, update `offers.json` and re-render (same as C2).

## C3. Archive removed offers

For all removed offers (both auto-removed by `js-clean` and LLM-confirmed), append to the "Removed Offers" section of `users/<handle>/Job-Search-Reference.md`:
- Use the existing location-based subsection structure (Strasbourg, France/Nearby, Remote International, etc.)
- Format: `- ~~Company — Role~~ — <reason> (<date>)`
- The `detail` field from clean-report.json provides the reason.

## C4. Summary and commit

Print a summary to the user: N offers checked, N removed, N flagged (N resolved by LLM review).

Commit the changes:
```bash
git -C ~/.claude/skills/job-search/users/<handle> add offers.json Offers.html Job-Search-Reference.md clean-report.json
git -C ~/.claude/skills/job-search/users/<handle> commit -m "career: clean — removed N dead/stale offers"
```
