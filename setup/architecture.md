# Architecture Reference

Supporting file for the `/setup` skill — loaded on demand, not at startup.

## Architecture Overview

```
Google Drive ($DRIVE)              ~/.claude/ (local)
────────────────────────           ───────────────────────────────────
$DRIVE/claude/                     CLAUDE.md      → symlink to Drive
  CLAUDE.md                        settings.json  → symlink to Drive
  settings.json                    skills/        → symlink/junction to Drive
  skills/                          local.md       ← plain file, NOT synced
    note/SKILL.md                  keybindings.json ← plain file (optional)
    career/SKILL.md
    job-search/SKILL.md            projects/      ← Claude cache, never touch
      users/dimit/                 ← career data (git-tracked, inside job-search skill)
    setup/SKILL.md
    agent/SKILL.md
    report/SKILL.md

                                   projects/      ← Claude cache, never touch
```

### Drive Path by OS

| OS | Drive sync root (`$DRIVE`) |
|---|---|
| **Linux (rclone/gdrive)** | `~/Documents/gdrive-shared` |
| **Mac (Google Drive app)** | `~/Google Drive/SharedDocuments/_me` |
| **Windows** | `~/Documents/_me` (Documents is a junction to gdrive) |

### File Inventory

**Synced via Drive (never edit directly in `~/.claude/`):**

| File | Drive path | Link type |
|---|---|---|
| `CLAUDE.md` | `$DRIVE/claude/CLAUDE.md` | Symlink (file) |
| `settings.json` | `$DRIVE/claude/settings.json` | Symlink (file) |
| `skills/` | `$DRIVE/claude/skills/` | Symlink (dir) / Junction on Windows |

**Local only (never synced):**

| File | Purpose |
|---|---|
| `local.md` | Machine-specific paths |
| `keybindings.json` | Custom key bindings (optional) |
| `career/` | Career data: CV, journal, offers, expertise, topics (git-tracked) |
| `projects/` | Claude's local cache — do not touch |

### local.md Format

```markdown
# Machine-Local Paths
```

### Skills

| Skill | Command | What it does |
|---|---|---|
| `note/SKILL.md` | `/note` | Quick capture of gotchas, learnings, tips |
| `career/SKILL.md` | `/career` | Expertise logging and strengths reinforcement |
| `job-search/SKILL.md` | `/job-search` | Full career refresh, job search, CV analysis |
| `setup/SKILL.md` | `/setup` | Verify and repair setup |
| `agent/SKILL.md` | `/agent` | Multi-agent chat channel |
| `report/SKILL.md` | `/report` | Technical report generation |
