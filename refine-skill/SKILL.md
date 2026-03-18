---
name: refine-skill
description: >
  Use when the user says /refine-skill to analyze and improve Claude Code skills.
  With no argument, refines all skills. Use "self" to refine the refiner itself.
argument-hint: "<skill-name> | self | <name> apply <changes> | (empty = all)"
---

# Refine Skill

Understand what a skill does, research how to do it better, and propose substantive improvements.
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

## Step 1 — Understand the Skill

1. Read `knowledge.md` in this skill's directory (pitfalls, strategies, per-skill notes).
2. Read `history/<target>.md` if it exists (previous refinements).
3. Read the target skill's `SKILL.md` entirely.
4. List all files in the target skill's directory. Read key reference files to understand the full picture.
5. **Summarize in your own words:** What does this skill do? What is its core workflow? What problem does it solve for the user?

## Step 2 — Research Best Practices

Search the web for current best practices related to what the skill does:

- If it's a job search skill → search for modern job search automation, ATS strategies, how recruiters use AI
- If it's a report writing skill → search for technical writing tools, pandoc workflows, citation management
- If it's a meta-skill (refine, sync) → search for prompt engineering best practices, Claude Code skill design
- For any skill → search for competing tools, recent blog posts, community patterns

Look for: **What are experts doing today that this skill doesn't do yet?** What has changed since the skill was last updated? Are there new tools, APIs, or approaches?

## Step 3 — Health Check (quick)

Read `analysis.md` for the rubric. Report a compact table of size, frontmatter validity, brackets, and any CRITICAL issues. This is a sanity check, not the main focus — flag problems but don't optimize for line count unless the skill is approaching the 15K char truncation limit.

## Step 4 — Ask 2-3 Questions

Based on your understanding and research, ask targeted questions:

- "I found [X approach/tool] — is that something you'd want integrated?"
- "What goes wrong most often when you use this skill?"
- "Is there a workflow gap? Something the skill should handle but doesn't?"
- "The skill currently does [X] — should it also do [Y] based on [research finding]?"

Wait for answers before proceeding.

## Step 5 — Propose Changes

Combine insights from your understanding, research, user feedback, and knowledge.md pitfalls. Propose:

1. A numbered list of improvements with rationale.
2. For each, a diff preview showing the actual change.
3. Classify each:
   - **FUNCTIONAL** — makes the skill do its job better (new capability, better workflow)
   - **CORRECTNESS** — fixes something wrong or outdated
   - **QUALITY** — improves output quality (better prompts, smarter defaults)
   - **STRUCTURE** — reorganization, extraction to reference files
   - **TOKEN-SAVE** — only when approaching size limits

**Priority order:** FUNCTIONAL > CORRECTNESS > QUALITY > STRUCTURE > TOKEN-SAVE. Line count optimization is a last resort, not a goal.

Ask: "Apply all, pick specific numbers, or skip?"

## Step 6 — Apply and Record

1. Apply approved changes.
2. Show before/after size comparison (brief — one line).
3. Append entry to `history/<target>.md`:
   ```
   ## YYYY-MM-DD
   - Changes: <what was applied>
   - Research: <key findings that informed changes>
   - User feedback: <from questions>
   ```
4. If a new pitfall or strategy was discovered: "Add to knowledge base? (y/n)"
5. If references in `knowledge.md` seem outdated, propose updates.
6. Ask user before committing.

## Self-Refinement

When argument is `self`:
- Review `knowledge.md` for stale or redundant entries.
- Check if SKILL.md instructions match what actually happens during refinements.
- Search online for newer Claude Code skill design resources and prompt optimization techniques.
- Propose knowledge.md updates.

## All Mode (default)

When no argument is provided:
- List all skill directories in `~/.claude/skills/`.
- For each skill: run Steps 1-6. Between skills, summarize what was done and ask "Continue to next skill?"
- At the end, show a summary table of all skills with changes made.

## Apply Mode (`/refine-skill <name> apply <changes>`)

When the user provides specific changes to apply:

1. Parse: skill name + everything after "apply" is the user's change request.
2. Run Steps 1-3 as usual (understand + research + health check).
3. **Merge two change sources:**
   - The user's requested changes (priority — apply these first).
   - Refinements discovered through research and analysis (propose alongside).
4. Show unified proposal: user changes marked `[USER]`, auto-discovered marked `[REFINE]`.
5. Apply all approved changes in one pass.
6. Record in history, noting which changes were user-driven vs. auto-discovered.

## Rules

- Never apply changes without explicit approval.
- Always show diffs before applying.
- Understand before optimizing — read the skill, research the domain, then propose.
- Keep SKILL.md files under 15K chars (hard limit); prefer under 200 lines but don't sacrifice substance for brevity.
- Ask before committing (user preference).
