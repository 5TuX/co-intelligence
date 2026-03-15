---
name: sync-skills
description: >
  Use when the user says /sync-skills to audit, update docs, fix issues,
  commit and optionally push the skills repo. Keeps README, structure,
  and gitignore in sync with actual skill contents.
argument-hint: "[push]"
---

# Sync Skills

Audit the skills repo, update documentation, fix issues, commit, and optionally push.
Runs from `~/.claude/skills/`.

## Step 1 — Audit Structure

1. List all skill directories in `~/.claude/skills/`.
2. For each, verify `SKILL.md` exists and has valid YAML frontmatter (name, description).
3. Flag issues:
   - Missing `SKILL.md`
   - Brackets `[]{}` in YAML description (kills all slash commands)
   - Nested `.git` directories that shouldn't exist (skills repo is the parent)
   - Files that should be gitignored but aren't (user data, `.env`, credentials)
   - Orphan directories (no SKILL.md, not a support directory)

Report findings as a table. Fix automatically what's safe (e.g., add missing `.gitkeep`). Ask before fixing anything destructive.

## Step 2 — Update README

Read `~/.claude/skills/README.md`. Compare the skills table and directory structure against the actual contents:

1. **Skills table**: ensure every skill directory with a SKILL.md is listed with correct name, command, and description. Remove entries for deleted skills. Add entries for new skills.
2. **Directory structure**: update the tree to reflect actual files and directories.
3. **Installation section**: verify instructions are still accurate.

Apply updates to README.md if anything changed. Show diff.

## Step 3 — Check .gitignore

Verify `.gitignore` covers:
- `**/users/*/` (except `_example/`)
- `*.html` (generated, except templates)
- `.env`, `credentials.*`, `*.key`
- `__pycache__/`, `*.pyc`, `uv.lock`

If new patterns are needed (new skill added data files, etc.), propose additions.

## Step 4 — Show Changes

```bash
git -C ~/.claude/skills diff --stat
git -C ~/.claude/skills status
```

Group changes by skill. Show:
- Modified files per skill
- New untracked files
- Deleted files

## Step 5 — Safety Check

Before staging, scan for sensitive content:
- Any file in `users/` (except `_example/`) about to be committed
- Any `.env`, `.key`, `credentials.*` file
- Any file containing patterns like `API_KEY=`, `password=`, `token=`

If warnings, stop and ask.

## Step 6 — Commit

1. Stage: `git -C ~/.claude/skills add -A`
2. Draft commit message:
   - List skills that changed
   - Summarize nature (new skill, refinement, docs update, bugfix)
   - Concise (1-2 lines)
3. Show draft. Ask user to confirm or edit.
4. Commit.

## Step 7 — Push (optional)

If argument is `push` or user confirms:
1. Check remote: `git -C ~/.claude/skills remote -v`
2. If no remote, suggest adding one.
3. If remote exists, push.

## Step 8 — User Data Repos

Check if any user data repos need syncing:
```bash
find ~/.claude/skills -path "*/users/*/.git" -maxdepth 4
```

For each found, show status and offer to commit (separate repos, separate commits).

## Rules

- Never commit user data to the skills repo.
- Always show commit message before committing.
- Never force-push.
- Always update README if skills were added or removed.
