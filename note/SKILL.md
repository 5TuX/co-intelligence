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
2. Determine where the note belongs:
   - Technical concept, gotcha, or tool tip → `~/.claude/skills/job-search/users/dimit/journal.md`
     (under today's date, appending to current session entry if one exists)
   - Skill level update → `~/.claude/skills/job-search/users/dimit/cv.md` (skills inventory section)
   - Human expertise moment (caught a bug, key insight, judgment call) → `~/.claude/skills/job-search/users/dimit/cv.md` (strengths section)
   - Multiple targets → append to each
3. Append the note with today's date and a brief context tag (e.g. project name or topic).
4. Confirm in one line what was added and where.
