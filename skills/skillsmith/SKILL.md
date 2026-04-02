---
name: skillsmith
description: Use when the user asks to create, modify, edit, update, refine, fix, improve, delete, or audit any Claude Code skill or SKILL.md file - including plugin skills. Also use when the user says "make a skill", "change this skill", "add a mode to skill X", "modify plugin-update to do Y", "edit the co-intelligence skill", or mentions skill quality. MUST be used for all skill modifications - never edit SKILL.md files directly without this skill. With no argument, refines local skills only (~/.claude/skills/). When a specific skill name is given, works for both local and plugin skills.
argument-hint: "<name> [<changes>] | new <name> | delete <name> | pluginify <plugin-name> <skills> | tidy-only | (empty = all)"
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
/skillsmith pluginify <name> <skills> → package local skills into a plugin
```

Parse $ARGUMENTS:
- If `tidy-only` → jump to §Tidy Mode
- If `new <name>` → jump to §Create Mode
- If `delete <name>` → jump to §Delete Mode
- If `pluginify <name> <skills>` → jump to §Pluginify Mode
- If empty → All Mode (refine all skills)
- Otherwise → first word is the skill name; everything after is desired changes (if any). Resolve the skill path in order:
  1. Local: `~/.claude/skills/<target>/SKILL.md`
  2. Marketplace: `~/.claude/plugins/marketplaces/*/skills/<target>/SKILL.md` — you are the plugin author. Edit here. Warn: "Editing marketplace source for <plugin>. Run `plugin-refresh-cache.sh <plugin>` after to test locally."
  3. Cache (fallback): `~/.claude/plugins/cache/*/*/*/skills/<target>/SKILL.md` — no local marketplace. Warn: "No marketplace repo found. Editing cache copy - changes are local only."

## Signature

After parsing arguments, ALWAYS print a signature block before doing anything
else. This makes the resolved mode and target visible to the user:

```
skillsmith — <mode>
  Target: <name or "all">
  Changes: "<user-provided changes or none>"

  Modes: <name> [changes] | new <name> | delete <name> | pluginify <name> <skills> | tidy-only | (no args = all)
```

Example:
```
skillsmith — refine
  Target: claude-setup
  Changes: "add bashrc auto-resolve for CLAUDE_PLUGIN_ROOT"

  Modes: <name> [changes] | new <name> | delete <name> | pluginify <name> <skills> | tidy-only | (no args = all)
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

### 2. Domain Research
After gathering intent, detect the skill's purpose/domain and search for how people solve that specific problem in the real world:
- Search for existing tools, libraries, repos, and workflows that address the same use case
- Look for challenges, common pitfalls, and proven solutions in that domain
- Search GitHub for reference implementations (use `gh search code` or `gh search repos`)

If useful references are found, include a `## References` section in the generated SKILL.md. For repos, pin the exact commit SHA so future refinements can diff against it. Format:
```
## References
- <description>: <url> (commit: <sha>)
```

### 3. Scaffold
Create `~/.claude/skills/<name>/SKILL.md` with:
- Frontmatter: `name`, `description` (start with "Use when...", trigger-focused, no workflow summary, under 500 chars, third person)
- `argument-hint` if the skill takes arguments
- Skeleton sections: overview, argument parsing (if needed), instructions, rules

### 4. Delegate to superpowers:writing-skills
Invoke `superpowers:writing-skills` for the TDD creation cycle — baseline testing, pressure scenarios, refinement. This handles the quality methodology; skillsmith handles the repo integration.

### 5. Register and tidy
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

### Step 2b — Domain Research (MANDATORY)

After skill-design best practices, research the skill's specific domain/use case:
- Detect the skill's purpose (e.g., "job search automation", "technical report generation", "multi-agent coordination")
- Search for how people solve that problem: tools, libraries, workflows, challenges, and proven solutions
- Search GitHub for reference implementations (`gh search repos`, `gh search code`)
- Look for blog posts, case studies, or post-mortems about that specific domain

Run 1-2 searches. Summarize findings in 3-5 bullets.
Look for: **What are the known challenges and best solutions in this domain?**

If useful references are found, add or update a `## References` section in the skill's SKILL.md. For repos, pin the exact commit SHA so future refinements can diff against it:
```
## References
- <description>: <url> (commit: <sha>)
```

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
3. For FUNCTIONAL changes that alter skill behavior (new modes, changed
   workflows, new rules), invoke `superpowers:writing-skills` to run a pressure
   scenario verifying the change works. Skip for STRUCTURAL/QUALITY/TOKEN-SAVE
   changes (formatting, signatures, description rewrites).
4. Append entry to `$PLUGIN_DATA/skillsmith/history/<target>.md`.
5. If a new pitfall or strategy was discovered: "Add to knowledge base? (y/n)"

---

## Pluginify Mode (`/skillsmith pluginify <plugin-name> <skill1,skill2,...>`)

Package local skills into a Claude Code plugin with dual-registration autocomplete.

### 1. Validate inputs
- Parse `<plugin-name>` (first arg after `pluginify`) and `<skills>` (comma-separated list or space-separated remaining args).
- For each skill, verify `~/.claude/skills/<skill>/SKILL.md` exists. List missing ones and stop if any are missing.
- Check target directory `~/.claude/plugins/marketplaces/<plugin-name>/` does not already exist. If it does, warn and ask: "Plugin directory exists. Add skills to existing plugin, or abort?"

### 2. Scaffold plugin structure
Create the following structure:

```
~/.claude/plugins/marketplaces/<plugin-name>/
  .claude-plugin/
    plugin.json
  skills/
    <skill1>/          (copied from ~/.claude/skills/<skill1>/)
    <skill2>/          (copied from ~/.claude/skills/<skill2>/)
    ...
  commands/
    <skill1>.md        (auto-generated shim)
    <skill2>.md        (auto-generated shim)
    ...
```

### 3. Generate plugin.json
```json
{
  "name": "<plugin-name>",
  "description": "<ask user for a one-line description>",
  "version": "0.1.0",
  "author": { "name": "<from git config>" },
  "license": "MIT",
  "skills": ["./skills/"],
  "commands": ["./commands/"]
}
```

### 4. Copy skills
For each skill, copy `~/.claude/skills/<skill>/` to `<plugin>/skills/<skill>/`.
Verify each SKILL.md has valid frontmatter (`name`, `description`).

### 5. Generate command shims (dual registration)
For each skill, read its SKILL.md frontmatter and create `commands/<skill>.md`:
```
---
description: <shortened version of skill description, under 200 chars>
argument-hint: <copied from SKILL.md if present>
---

Invoke the `<plugin-name>:<skill>` skill with $ARGUMENTS.
```

**Key rule:** command shims must NOT have a `name` field. This is what gives them the plugin namespace prefix in autocomplete (see knowledge.md pitfall #14-15).

### 6. Confirm and finalize
Show the generated structure as a tree. Ask: "Plugin scaffolded. Next steps?"

Offer:
- **Install locally**: copy to cache directory for immediate testing
- **Init git repo**: `git init` in the plugin directory
- **Remove originals**: delete the local skills from `~/.claude/skills/` (ask first)
- **Skip**: just leave the structure as-is

### 7. Record
- Append entry to `$PLUGIN_DATA/skillsmith/history/pluginify.md`
- Update knowledge.md per-skill notes if relevant

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
- Default scope is `~/.claude/skills/` (local skills). Plugin skills resolve marketplace-first (`~/.claude/plugins/marketplaces/`), cache as fallback. Marketplace edits are the source of truth for authors; cache edits are local-only.
- Enforce data separation: skill directories contain code and config only. User/personal data must live outside `~/.claude/skills/` (path configured in `config.local.yaml`). Flag violations during health check and tidy.
- Always update README if skills were added or removed.
- Every skill must have a signature block that prints on invocation. During refine and tidy, flag skills missing a signature as STRUCTURAL and offer to add one.
- Web research (Step 2) is mandatory during refinement. Never skip it.
