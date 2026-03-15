---
name: note
description: >
  Use when the user says /note, or when during a work session you encounter
  something worth capturing: a gotcha, a learning, a tip, a skill-level change.
  Proactively offer to use this when something notable happens.
argument-hint: "<what to capture>"
---

# Quick Note Capture

Append a learning note, gotcha, tip, or skill update to the career files.

## Instructions

1. Take the content from $ARGUMENTS (everything after "note").
2. Read `~/.claude/skills/job-search/users/dimit/Summary.md` for context on the career directory.
3. Determine where the note belongs:
   - Technical concept, gotcha, or tool tip → `~/.claude/skills/job-search/users/dimit/Journal.md`
     (under today's date, appending to current session entry if one exists)
   - Skill level update → `~/.claude/skills/job-search/users/dimit/Learning path.md`
   - Both → both files
4. Append the note with today's date and a brief context tag (e.g. project name or topic).
5. Do NOT update `Summary.md` unless the note represents a major shift — this is a quick capture.
6. Commit:
   ```bash
   git -C ~/.claude/skills/job-search/users/dimit add -A
   git -C ~/.claude/skills/job-search/users/dimit commit -m "career: note — <short label>"
   ```
7. Confirm in one line what was added and where.
