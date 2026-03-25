# Comments Processing Protocol

Read `users/<handle>/comments.json` — user's free-form comments and scores on offers. Top-level keys are URL → comment text. The reserved `_scores` key holds a `{ URL → integer }` map of the user's own match scores (0-10). Parse each comment with intent detection (case-insensitive, fuzzy — match the spirit, not exact keywords). **User scores:** When `_scores` is present, compare each user score against the system `match` score. If they diverge by ≥2 points, note the gap in admin_notes and adjust the system score toward the user's score (set system score = user score). This lets the user override AI scoring. Preserve `_scores` in `comments.json` across runs (do not remove on cleanup).

## A. Direct actions on the offer

- **Delete/remove:** `"delete this"`, `"remove"`, `"drop"` → Remove offer from catalog. Archive to Job-Search-Reference.md with the comment.
- **Applied/tracking:** `"applied"`, `"sent CV"`, `"interview"`, `"in progress"` → **NEVER remove**, even if link dies. Mark "applied — tracking" in notes.
- **Rejection:** `"not interested"`, `"skip"`, `"pass"`, `"rejected me"`, `"declined"` → Remove. Archive with comment.
- **Deprioritize:** `"waiting"`, `"pending"`, `"maybe"`, `"later"` → Keep but lower priority.
- **Boost:** `"great fit"`, `"top choice"`, `"priority"`, `"love this"` → Boost match score +1 (cap 10). Mention in tips.
- **Find similar:** `"more like this"`, `"find similar"` → Feed domain/tools/location into search strategy.

## B. Profile/preference changes

Comments that express a general preference, not just about this offer:
- `"I don't like [domain]"`, `"avoid [industry]"`, `"no more [type]"` → **Update `profile.yaml`**: add the domain/industry to `ethical_filter.exclude`. Remove ALL offers matching the excluded domain (not just this one). Log the change in the final report.
- `"I want more [domain]"`, `"prioritize [field]"` → **Update `profile.yaml`**: add to `ethical_filter.prioritize` or `ethical_filter.also_look_for`.
- `"max [N] years experience"`, `"I'm senior now"` → **Update `seniority`** block in profile.yaml.
- `"I moved to [city]"`, `"prefer [location]"` → **Update `location_priority`** in profile.yaml.

## C. Skill/process changes

Comments that imply modifying the skill itself:
- `"add [source] to sources"`, `"check [website]"` → Add to `sources.yaml` (user-level, no confirmation needed).
- `"change how [feature] works"`, `"the skill should [do X]"`, `"stop doing [Y]"` → **ASK THE USER TO CONFIRM** before modifying any skill file (SKILL.md, reference/search-agents.md, reference/update-phase.md, etc.). Present the proposed change and wait for approval.

## D. Neutral comments

Anything that doesn't match A/B/C is informational context. Preserve as-is.

## Cleanup

After processing all comments, remove consumed action comments (A-type deletions, B-type preference updates) from `comments.json`. Keep neutral comments, tracking comments ("applied", "waiting", boost comments), and the `_scores` object.

**Always:** When removing an offer that has a comment, preserve the comment in Job-Search-Reference.md alongside the removal note. When re-rendering the dashboard, pass comments to the template so they appear pre-filled.
