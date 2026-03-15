---
name: refine-skill
description: >
  Use when the user says /refine-skill to analyze and improve Claude Code skills.
  With no argument, refines all skills. Use "self" to refine the refiner itself.
argument-hint: "<skill-name> | self | <name> apply <changes> | (empty = all)"
---

# Refine Skill

Analyze a Claude Code skill and propose targeted improvements.
Accumulates knowledge over time in `knowledge.md` — gets better at refining with each use.

## Argument Parsing

```
/refine-skill          → refine all skills in ~/.claude/skills/ sequentially
/refine-skill <name>   → refine ~/.claude/skills/<name>/SKILL.md
/refine-skill self     → refine this skill (refine-skill itself)
```

Parse $ARGUMENTS. If empty, list directories in `~/.claude/skills/` and process each one sequentially.
If `self`, set target to `refine-skill`.
Verify `~/.claude/skills/<target>/SKILL.md` exists. If not, list available skills and stop.

## Step 1 — Load Context

1. Read `knowledge.md` in this skill's directory (pitfalls, strategies, references).
2. Read `history/<target>.md` if it exists (previous refinements for this skill).
3. Read the target skill's `SKILL.md` entirely.
4. List all files in the target skill's directory to understand its structure.

## Step 2 — Health Check

Read `analysis.md` in this skill's directory for the full rubric. Report a table:

| Metric | Value | Status |
|--------|-------|--------|
| SKILL.md size (chars) | N | OK / WARN / CRITICAL |
| Estimated tokens | N | OK / WARN / CRITICAL |
| Lines | N | OK / WARN |
| Frontmatter valid | yes/no | — |
| Brackets in YAML | yes/no | CRITICAL if yes |
| Steps count | N | — |
| Verification steps | N | WARN if 0 |
| Reference files | N | — |

## Step 3 — Ask 2-3 Questions

Based on health check and content, pick the most informative questions:

- "What goes wrong most often when you use this skill?"
- "Is there a mode or edge case it should handle but doesn't?"
- "Does it produce too much output? Too little?"
- "This SKILL.md is [N] chars. Want me to focus on size reduction?"
- "This skill has [no / N] reference files. Want me to extract sections?"
- (Self-refine only) "What about the refine process itself should change?"

Wait for answers before proceeding.

## Step 4 — Propose Changes

Analyze the skill against pitfalls and strategies in `knowledge.md`. Propose:

1. A numbered list of improvements with rationale.
2. For each, a diff preview:
   ```diff
   - old line
   + new line
   ```
3. Classify each: STRUCTURE, TOKEN-SAVE, CORRECTNESS, CLARITY, MISSING-FEATURE.

Ask: "Apply all, pick specific numbers, or skip?"

## Step 5 — Apply and Record

1. Apply approved changes.
2. Re-run health check. Show before/after comparison.
3. Append entry to `history/<target>.md`:
   ```
   ## YYYY-MM-DD
   - Changes: <what was applied>
   - Before: <size> chars, <lines> lines
   - After: <size> chars, <lines> lines
   - User feedback: <from questions>
   ```
4. If a new pitfall or strategy was discovered: "I noticed [X]. Add to knowledge base? (y/n)"
5. If references in `knowledge.md` seem outdated, search online for newer resources and propose updates.
6. Ask user before committing.

## Self-Refinement

When argument is `self`:
- Review `knowledge.md` for stale or redundant entries.
- Check if SKILL.md instructions match what actually happens during refinements.
- Propose knowledge.md cleanups (merge similar pitfalls, promote recurring strategies).
- Check references — search online for newer/better resources if any seem outdated.

## All Mode (default)

When no argument is provided:
- List all skill directories in `~/.claude/skills/`.
- For each skill: run Steps 1-5. Between skills, summarize what was done and ask "Continue to next skill?"
- At the end, show a summary table of all skills with before/after health metrics.

## Apply Mode (`/refine-skill <name> apply <changes>`)

When the user provides specific changes to apply:

1. Parse: skill name + everything after "apply" is the user's change request.
2. Load context (Step 1) and run health check (Step 2) as usual.
3. **Merge two change sources:**
   - The user's requested changes (priority — apply these first).
   - Refinements discovered by analyzing against `knowledge.md` (propose alongside).
4. Show unified proposal: user changes marked `[USER]`, auto-discovered marked `[REFINE]`.
5. Apply all approved changes in one pass.
6. Record in history, noting which changes were user-driven vs. auto-discovered.

This mode is the recommended way to modify skills — you get your changes + free improvements in one shot.

## Rules

- Never apply changes without explicit approval.
- Always show diffs before applying.
- Keep SKILL.md files under 200 lines; extract to reference files.
- Use "see path/to/file.md" pattern, not @-file embeds.
- Token estimate: 1 token per ~4 chars.
- Ask before committing (user preference).
