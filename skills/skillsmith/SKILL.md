---
name: skillsmith
description: Use when the user asks to create, refine, delete, or audit Claude Code skills. Operates on ~/.claude/skills/ by default (local skills only, not plugin skills). With no argument, refines all local skills.
argument-hint: "<name> [<changes>] | new <name> | delete <name> | tidy-only | (empty = all)"
---

# Skillsmith

Create, refine, and manage Claude Code skills.
Accumulates knowledge over time in `knowledge.md` — gets better with each use.

## Argument Parsing

```
/skillsmith                         → refine all skills, then tidy repo
/skillsmith <name>                  → refine one skill, then tidy repo
/skillsmith <name> <changes>        → user-specified changes + auto-discovered refinements
/skillsmith new <name>              → create a new skill
/skillsmith delete <name>           → delete a skill (with dependency check)
/skillsmith tidy-only               → only audit structure, update docs, commit
```

Parse $ARGUMENTS:
- If `tidy-only` → jump to §Tidy Mode
- If `new <name>` → jump to §Create Mode
- If `delete <name>` → jump to §Delete Mode
- If empty → All Mode (refine all skills)
- Otherwise → first word is the skill name; everything after is desired changes (if any). First look in `~/.claude/skills/<target>/SKILL.md`. If not found there, check plugin caches (`~/.claude/plugins/cache/*/*/latest/skills/<target>/SKILL.md`). If found only in a plugin cache, warn: "This is a plugin skill. Modifications will be local until published. Proceed?" and wait for confirmation.

## Signature

After parsing arguments, ALWAYS print a signature block before doing anything
else. This makes the resolved mode and target visible to the user:

```
skillsmith — <mode>
  Target: <name or "all">
  Changes: "<user-provided changes or none>"

  Modes: <name> [changes] | new <name> | delete <name> | tidy-only | (no args = all)
```

Example:
```
skillsmith — refine
  Target: claude-setup
  Changes: "add bashrc auto-resolve for CLAUDE_PLUGIN_ROOT"

  Modes: <name> [changes] | new <name> | delete <name> | tidy-only | (no args = all)
```

## Data Directory

This skill stores mutable state in the plugin data directory. At the start of every invocation:
1. Resolve `CLAUDE_PLUGIN_DATA` env var → `$PLUGIN_DATA`
2. Create `$PLUGIN_DATA/skillsmith/` if it doesn't exist
3. If `$PLUGIN_DATA/skillsmith/knowledge.md` doesn't exist, copy from `templates/knowledge.md` in this skill's directory
4. If `$PLUGIN_DATA/skillsmith/history/` doesn't exist, create it

All references to `knowledge.md` and `history/` below mean the copies in `$PLUGIN_DATA/skillsmith/`.

---

## Create Mode (`/skillsmith new <name>`)

### 1. Gather intent
Ask the user:
- What does this skill do? What problem does it solve?
- What triggers it? (When would someone invoke it?)
- Does it need modes/arguments?

### 2. Scaffold
Create `~/.claude/skills/<name>/SKILL.md` with:
- Frontmatter: `name`, `description` (start with "Use when...", trigger-focused, no workflow summary, under 500 chars, third person)
- `argument-hint` if the skill takes arguments
- Skeleton sections: overview, argument parsing (if needed), instructions, rules

### 3. Delegate to superpowers:writing-skills
Invoke `superpowers:writing-skills` for the TDD creation cycle — baseline testing, pressure scenarios, refinement. This handles the quality methodology; skillsmith handles the repo integration.

### 4. Register and tidy
- Add entry to `knowledge.md` per-skill notes
- Create `history/<name>.md` with creation date
- Run §Tidy (README update, .gitignore check, safety check, commit)

---

## Delete Mode (`/skillsmith delete <name>`)

### 1. Verify skill exists
Check `~/.claude/skills/<name>/SKILL.md` exists. If not, list available skills and stop.

### 2. Dependency check
Scan ALL other skills for references to the target:
- Grep all `SKILL.md` and reference files for `<name>` (skill name, command name, directory name)
- Check `knowledge.md` for per-skill notes referencing the target
- Check `config.local.yaml` and `architecture.md` for references

If dependencies found, show them and ask: "These skills reference `<name>`. Proceed with deletion? The references will need manual cleanup."

### 3. Confirm deletion
Show the skill's SKILL.md summary and ask: "Delete `<name>/` and all its files? This cannot be undone."

### 4. Delete and clean up
- Remove `~/.claude/skills/<name>/` directory
- Remove entry from `knowledge.md` per-skill notes
- Archive `history/<name>.md` content to a "Deleted Skills" section in knowledge.md (preserve history)
- Run §Tidy (README update, commit)

---

## Refine Mode (default)

### Step 1 — Understand the Skill

1. Read `$PLUGIN_DATA/skillsmith/knowledge.md` (pitfalls, strategies, per-skill notes).
2. Read `history/<target>.md` if it exists (previous refinements).
3. Read the target skill's `SKILL.md` entirely.
4. List all files in the target skill's directory. Read key reference files to understand the full picture.
5. **Summarize in your own words:** What does this skill do? What is its core workflow? What problem does it solve for the user?
6. If target is `skillsmith`: also review `knowledge.md` for stale/redundant entries, and check if SKILL.md instructions match what actually happens during refinements.

### Step 2 — Research Best Practices (MANDATORY)

**This step is NOT optional.** Always run at least one web search before
proposing changes. Without current context, you risk proposing outdated
patterns or missing better approaches that already exist.

Search the web for current best practices related to what the skill does:

- If it's a career/job search skill → search for modern job search automation, ATS strategies
- If it's a report writing skill → search for technical writing tools, pandoc workflows
- If it's a meta-skill → search for prompt engineering best practices, Claude Code skill design
- If it's a setup/config skill → search for dotfile management, cross-platform setup automation
- For any skill → search for competing tools, recent blog posts, community patterns

Run 1-2 searches. Summarize findings in 3-5 bullets before proceeding.
Look for: **What are experts doing today that this skill doesn't do yet?**

### Step 3 — Health Check (quick)

**Gate check:** Before running the health check, verify that web search results
from Step 2 are present in this conversation. If you cannot point to specific
search findings from this session, STOP and run Step 2 now. Do not proceed
past this point without completed research.

Read `analysis.md` for the rubric. Report a compact table of size, frontmatter validity, brackets, description quality, and any CRITICAL issues.

### Step 4 — Ask 2-3 Questions

Based on your understanding and research, ask targeted questions. Wait for answers before proceeding.

### Step 5 — Propose Changes

Combine insights from understanding, research, user feedback, and knowledge.md pitfalls.
If user provided desired changes, include those as `[USER]` changes (priority) alongside auto-discovered `[REFINE]` changes. Propose:

1. A numbered list of improvements with rationale.
2. For each, a diff preview showing the actual change.
3. Classify: **FUNCTIONAL** > **CORRECTNESS** > **QUALITY** > **STRUCTURE** > **TOKEN-SAVE**

Ask: "Apply all, pick specific numbers, or skip?"

### Step 6 — Apply and Record

1. Apply approved changes.
2. Show before/after size comparison (brief — one line).
3. Append entry to `$PLUGIN_DATA/skillsmith/history/<target>.md`.
4. If a new pitfall or strategy was discovered: "Add to knowledge base? (y/n)"

---

## Tidy Mode (`/skillsmith tidy-only`)

Runs automatically after refinements. Also available standalone.
Operates on `~/.claude/skills/`.

### 7a. Audit Structure
1. List all skill directories.
2. For each, verify `SKILL.md` exists and has valid YAML frontmatter (name, description).
3. Flag: missing `SKILL.md`, brackets `[]{}` in YAML description, nested `.git` dirs, data separation violations, orphan directories, missing signature block.
4. Report as table. Auto-fix safe issues. Ask before destructive fixes.

### 7b. Update README
Compare `~/.claude/skills/README.md` against actual contents. Apply updates if needed (create if missing).

### 7c. Check .gitignore
Verify coverage: `config.local.yaml`, `*.html`, `.env`, `credentials.*`, `*.key`, `__pycache__/`, `*.pyc`, `uv.lock`.

### 7d. Show Changes
Show files modified during this session. If `~/.claude/skills/` is a git repo,
use `git diff --stat`. Otherwise list recently modified files.

### 7e. Safety Check
Scan for sensitive content and data separation violations before staging:
- Personal data files inside skill dirs (`profile.yaml`, `offers.json`, `cv.md`, per-user subdirectories)
- `.env`, `.key`, `credentials.*` files
- Files containing `API_KEY=`, `password=`, `token=`

### 7f. Summary
Show a summary of all changes made during this session. If `~/.claude/skills/`
is a git repo, offer to stage and commit. Otherwise just list what changed.

## All Mode (default)

When no argument is provided:
- List all skill directories.
- **Plan phase:** For each skill, run Steps 1-5. Collect all proposed changes into a unified plan.
- **Present the unified plan.** Ask: "Apply all, pick specific numbers, or skip?"
- **Apply phase:** Apply approved changes (Step 6) across all skills.
- Then run §Tidy.

## Rules

- Never apply changes without explicit approval.
- Always show diffs before applying.
- Understand before optimizing — read the skill, research the domain, then propose.
- Keep SKILL.md files under 15K chars (hard limit); prefer under 200 lines but don't sacrifice substance for brevity.
- If `~/.claude/skills/` is a git repo, ask before committing. If not, skip git operations.
- Never assume how skills are synced between machines.
- Default scope is `~/.claude/skills/` (local skills). Plugin skills in `~/.claude/plugins/cache/` can be modified when explicitly targeted, but always warn first that changes are local until published.
- Enforce data separation: skill directories contain code and config only. User/personal data must live outside `~/.claude/skills/` (path configured in `config.local.yaml`). Flag violations during health check and tidy.
- Always update README if skills were added or removed.
- Every skill must have a signature block that prints on invocation. During refine and tidy, flag skills missing a signature as STRUCTURAL and offer to add one.
- Web research (Step 2) is mandatory during refinement. Never skip it.
