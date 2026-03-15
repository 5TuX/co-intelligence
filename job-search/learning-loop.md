# Learning Loop

Tracks search performance across runs and adapts strategy over time.

## Pre-Search: Adaptive Strategy Review (Step 1.5)

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

---

## Post-Search: Log Performance (Step 6.5)

After generating results but before the final report, update the learning-loop files:

### 6.5a: Update search-log.yaml

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

### 6.5b: Update metrics.yaml

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

---

## Post-Report: Conversational Feedback (Step 7)

**This is the key step for incremental improvement.** After presenting results in the final report, ask the user 3-5 targeted questions to learn their preferences.

### Question selection strategy

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

### After the user answers

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
