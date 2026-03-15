# Career Reference

Supporting file for the `/job-search` skill — loaded on demand, not at startup.

## Multi-User Directory Structure

```
~/.claude/skills/job-search/
├── SKILL.md                        # Multi-user orchestration + shared search tactics
├── sources-general.yaml            # Broad AI/ML job boards (shared across all users)
├── career-reference.md             # This file
├── feedback_cv_honesty.md          # General feedback (shared)
├── users/
│   └── <handle>/                   # One directory per user
│       ├── profile.yaml            # User prefs, email, ethical filters, skills
│       ├── sources.yaml            # User-specific job sources
│       ├── Offers.html             # Active offers (styled HTML, clickable links)
│       ├── email-summary.html      # Last generated email summary
│       ├── Job-Search-Reference.md # Removed offers history, skill gaps, tips
│       ├── Direction.md            # Vision, goals, skills inventory, roadmap
│       ├── CV.md                   # Living CV + portfolio tracker
│       ├── Human-Expertise.md      # Strengths profile, expertise log
│       ├── Journal.md              # Chronological session log
│       └── Topics/                 # Standalone thematic notes (optional)
```

## User Management

- `/job-search new-user` — interactive questionnaire to create a new user
- `/job-search update-user <handle>` — modify an existing user's profile
- Each user's data is fully self-contained in their directory

## Topics/ Convention

- Use `Topics/` for **standalone, reusable reference notes** on a specific technical concept, tool, or domain
- One file per topic, named clearly (e.g. `RAG-Systems.md`, `MCP-Servers.md`)
- Format: short definition → gotchas → code snippets → references
- These should be student-friendly — someone should be able to read them cold and learn
- Journal.md gets the raw session notes; Topics/ gets the distilled, evergreen version

## Git / Committing Rules

After making changes to a user's career files:

1. **Commit** using the user's directory as the git root:
   ```bash
   git -C ~/.claude/skills/job-search/users/<handle> add -A
   git -C ~/.claude/skills/job-search/users/<handle> commit -m "career: <short description>"
   ```
2. **Always commit after an update** — every session that touches any career file should end with a commit
3. **Commit message convention**: `career: <what changed>`
4. **One commit per session** — group all changes into a single commit
5. **Do not push** — commit locally only
6. Only commit if the user's directory has a git repo (check with `git -C ... rev-parse` first)
