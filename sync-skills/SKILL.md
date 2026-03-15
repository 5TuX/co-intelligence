---
name: sync-skills
description: >
  Use when the user says /sync-skills to commit and optionally push
  skill changes to the git repo. Shows what changed, drafts a commit message,
  and handles both the skills repo and user data repos.
argument-hint: "[push]"
---

# Sync Skills

Commit skill changes to the `~/.claude/skills/` git repo. Optionally push.

## Step 1 — Check Status

```bash
git -C ~/.claude/skills status
```

If nothing to commit, say so and stop.

## Step 2 — Show Changes

Show a summary of what changed:
- Run `git -C ~/.claude/skills diff --stat` for modified files.
- Run `git -C ~/.claude/skills status` for untracked files.
- Group changes by skill (directory name).

## Step 3 — Safety Check

Before staging, verify no sensitive files are being tracked:
- Check `.gitignore` is present and covers `**/users/*/`, `.env`, credentials.
- Warn if any file in a `users/` directory (except `_example/`) would be committed.
- Warn if any `.env`, `.key`, or `credentials.*` file would be committed.

If warnings, stop and ask user to confirm or fix.

## Step 4 — Commit

1. Stage all changes: `git -C ~/.claude/skills add -A`
2. Draft a commit message from the changes:
   - List skills that changed (e.g., "job-search, refine-skill, sync-skills")
   - Summarize the nature of changes (new skill, refinement, config, docs)
   - Keep it concise (1-2 lines)
3. Show the draft message to the user. Ask to confirm or edit.
4. Commit.

## Step 5 — Push (optional)

If argument is `push`, or user confirms:
1. Check if a remote is configured: `git -C ~/.claude/skills remote -v`
2. If no remote, suggest: `git -C ~/.claude/skills remote add origin <url>`
3. If remote exists, push: `git -C ~/.claude/skills push`

## Step 6 — User Data Repos

After the skills repo is committed, check if any user data repos need syncing:
```bash
find ~/.claude/skills -path "*/users/*/.git" -maxdepth 4
```

For each found, run `git status` and offer to commit those too (separate commits, separate repos).

## Rules

- Never commit user data to the skills repo.
- Always show the commit message before committing.
- Never force-push.
