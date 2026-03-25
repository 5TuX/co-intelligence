---
name: skillsmith
description: >
  Use when the user says /skillsmith or asks to create, refine, delete, or audit
  Claude Code skills. With no argument, refines all skills.
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
- Otherwise → first word is the skill name; everything after is desired changes (if any). Verify `${CLAUDE_PLUGIN_ROOT}/skills/<target>/SKILL.md` exists.

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
Create `${CLAUDE_PLUGIN_ROOT}/skills/<name>/SKILL.md` with:
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
Check `${CLAUDE_PLUGIN_ROOT}/skills/<name>/SKILL.md` exists. If not, list available skills and stop.

### 2. Dependency check
Scan ALL other skills for references to the target:
- Grep all `SKILL.md` and reference files for `<name>` (skill name, command name, directory name)
- Check `knowledge.md` for per-skill notes referencing the target
- Check `config.local.yaml` and `architecture.md` for references

If dependencies found, show them and ask: "These skills reference `<name>`. Proceed with deletion? The references will need manual cleanup."

### 3. Confirm deletion
Show the skill's SKILL.md summary and ask: "Delete `<name>/` and all its files? This cannot be undone."

### 4. Delete and clean up
- Remove `${CLAUDE_PLUGIN_ROOT}/skills/<name>/` directory
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

### Step 2 — Research Best Practices

Search the web for current best practices related to what the skill does:

- If it's a career/job search skill → search for modern job search automation, ATS strategies
- If it's a report writing skill → search for technical writing tools, pandoc workflows
- If it's a meta-skill → search for prompt engineering best practices, Claude Code skill design
- For any skill → search for competing tools, recent blog posts, community patterns

Look for: **What are experts doing today that this skill doesn't do yet?**

### Step 3 — Health Check (quick)

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
Operates on `${CLAUDE_PLUGIN_ROOT}/skills/`.

### 7a. Audit Structure
1. List all skill directories.
2. For each, verify `SKILL.md` exists and has valid YAML frontmatter (name, description).
3. Flag: missing `SKILL.md`, brackets `[]{}` in YAML description, nested `.git` dirs, data separation violations, orphan directories.
4. Report as table. Auto-fix safe issues. Ask before destructive fixes.

### 7b. Update README
Compare `${CLAUDE_PLUGIN_ROOT}/README.md` against actual contents. Apply updates if needed.

### 7c. Check .gitignore
Verify coverage: `config.local.yaml`, `*.html`, `.env`, `credentials.*`, `*.key`, `__pycache__/`, `*.pyc`, `uv.lock`.

### 7d. Show Changes
```bash
git -C ${CLAUDE_PLUGIN_ROOT} diff --stat
git -C ${CLAUDE_PLUGIN_ROOT} status
```

### 7e. Safety Check
Scan for sensitive content and data separation violations before staging:
- Personal data files inside skill dirs (`profile.yaml`, `offers.json`, `cv.md`, per-user subdirectories)
- `.env`, `.key`, `credentials.*` files
- Files containing `API_KEY=`, `password=`, `token=`

### 7f. Commit
Stage, draft commit message, show draft, ask user to confirm, commit.

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
- Ask before committing (user preference).
- Never commit user data to the skills repo.
- Enforce data separation: skill directories contain code and config only. User/personal data must live outside `${CLAUDE_PLUGIN_ROOT}/` (path configured in `config.local.yaml`). Flag violations during health check and tidy.
- Always update README if skills were added or removed.
