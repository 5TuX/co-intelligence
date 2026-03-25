---
name: refine-skill
description: >
  Use when the user says /refine-skill to analyze and improve Claude Code skills.
  With no argument, refines all skills. Use "tidy-only" to only audit/commit the repo.
argument-hint: "<name> [apply <changes>] | tidy-only | (empty = all)"
---

# Refine Skill

Understand what a skill does, research how to do it better, and propose substantive improvements.
Accumulates knowledge over time in `knowledge.md` — gets better at refining with each use.

## Argument Parsing

```
/refine-skill                       → refine all skills sequentially, then tidy repo
/refine-skill <name>                → refine one skill, then tidy repo
/refine-skill <name> apply <changes> → apply user-specified changes + auto-discovered refinements, then tidy repo
/refine-skill tidy-only             → only audit structure, update docs, commit
```

Parse $ARGUMENTS. If `tidy-only`, jump to Tidy Mode. Otherwise, proceed with refinement.
If empty, list directories in `~/.claude/skills/` and process each one sequentially.
If arguments contain `apply`, split into skill name and change request (everything after `apply`).
Verify `~/.claude/skills/<target>/SKILL.md` exists. If not, list available skills and stop.

## Step 1 — Understand the Skill

1. Read `knowledge.md` in this skill's directory (pitfalls, strategies, per-skill notes).
2. Read `history/<target>.md` if it exists (previous refinements).
3. Read the target skill's `SKILL.md` entirely.
4. List all files in the target skill's directory. Read key reference files to understand the full picture.
5. **Summarize in your own words:** What does this skill do? What is its core workflow? What problem does it solve for the user?
6. If target is `refine-skill`: also review `knowledge.md` for stale/redundant entries, and check if SKILL.md instructions match what actually happens during refinements.

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

Combine insights from your understanding, research, user feedback, and knowledge.md pitfalls.
If user provided changes via `apply`, include those as `[USER]` changes (priority) alongside auto-discovered `[REFINE]` changes. Propose:

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

## Step 7 — Tidy the Repo

Runs automatically after refinements. Also available standalone via `/refine-skill tidy-only`.
Operates on `~/.claude/skills/`.

### 7a. Audit Structure
1. List all skill directories.
2. For each, verify `SKILL.md` exists and has valid YAML frontmatter (name, description).
3. Flag: missing `SKILL.md`, brackets `[]{}` in YAML description, nested `.git` dirs, ungitignored user data/credentials, orphan directories.
4. Report as table. Auto-fix safe issues (e.g., missing `.gitkeep`). Ask before destructive fixes.

### 7b. Update README
Compare `~/.claude/skills/README.md` against actual contents:
- Skills table: every skill dir with SKILL.md listed with correct name, command, description.
- Directory structure tree: reflects actual files.
- Installation section: still accurate.
Apply updates if needed. Show diff.

### 7c. Check .gitignore
Verify coverage: `**/users/*/` (except `_example/`), `*.html` (generated), `.env`, `credentials.*`, `*.key`, `__pycache__/`, `*.pyc`, `uv.lock`. Propose additions if needed.

### 7d. Show Changes
```bash
git -C ~/.claude/skills diff --stat
git -C ~/.claude/skills status
```
Group by skill: modified files, new untracked, deleted.

### 7e. Safety Check
Scan for sensitive content before staging:
- Files in `users/` (except `_example/`) about to be committed
- `.env`, `.key`, `credentials.*` files
- Files containing `API_KEY=`, `password=`, `token=`
If warnings, stop and ask.

### 7f. Commit
1. Stage: `git -C ~/.claude/skills add -A`
2. Draft concise commit message (list changed skills, nature of changes).
3. Show draft. Ask user to confirm or edit.
4. Commit.

### 7g. User Data Repos
Check for nested user data repos: `find ~/.claude/skills -path "*/users/*/.git" -maxdepth 4`.
For each, show status and offer to commit separately.

## All Mode (default)

When no argument is provided:
- List all skill directories in `~/.claude/skills/`.
- **Plan phase:** For each skill, run Steps 1-5 (understand, research, health check, questions, propose). Collect all proposed changes across all skills into a single unified plan.
- **Present the unified plan** to the user: one numbered list covering all skills with changes. Ask: "Apply all, pick specific numbers, or skip?"
- **Apply phase:** After user approval, apply all approved changes (Step 6) across all skills.
- Then run Step 7 (tidy).

## Tidy Mode (`/refine-skill tidy-only`)

Skip Steps 1-6. Run Step 7 directly.

## Rules

- Never apply changes without explicit approval.
- Always show diffs before applying.
- Understand before optimizing — read the skill, research the domain, then propose.
- Keep SKILL.md files under 15K chars (hard limit); prefer under 200 lines but don't sacrifice substance for brevity.
- Ask before committing (user preference).
- Never commit user data to the skills repo.
- Always update README if skills were added or removed.
