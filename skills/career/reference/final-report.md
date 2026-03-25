# Final Report Format (Step 8)

**Report summary with clickable links** — always include offer URLs in the terminal output.

**Final report MUST include ALL of these sections — never skip any:**

## A) Run delta (per user)

For each user, show what changed this run:

1. **New offers added** — markdown table with columns: `Role`, `Company`, `Location`, `Match`, `URL`. Include ALL new offers, not a fixed cutoff.
2. **Offers removed** — list with reason (dead link, expired, generic URL, etc.)
3. **Catalog totals** — "N offers total (X new, Y removed)"

Sort new offers by match score descending. All offers (new and existing) are in `Dashboard.html` — this section highlights only what's new.

## B) Hidden gems — offers found via deep search only

List any offers the deep search agent found that were NOT on standard job boards. These are the highest-value finds. If none, note that and suggest refined dork queries to try next time.

## C) Strategy & process improvement suggestions

Based on the agentic intelligence agent's findings, always present concrete suggestions for improving the job search process itself. This section is **mandatory** — every run must include it. Cover:
- New tools, repos, or platforms discovered that could help
- Workflow changes or automation opportunities
- Proposed edits to this skill (`SKILL.md`) or source files — describe the change and why, for user approval
- What worked well this run vs. what could be better
- Any emerging job search trends or strategies worth adopting

## Match scoring reference

The `match` field is an integer 0-10 (10 = perfect fit, 8-9 = excellent, 6-7 = very good, 4-5 = good, below 4 = marginal). The HTML renders each score with a color gradient from red (0) through yellow (5) to green (10).
