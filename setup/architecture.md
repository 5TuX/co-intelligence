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
    agent/SKILL.md                 keybindings.json ← plain file (optional)
    job-search/SKILL.md
      users/dimit/                 ← career data (inside job-search skill)
    myplay/SKILL.md                projects/      ← Claude cache, never touch
    note/SKILL.md
    refine-skill/SKILL.md
    report/SKILL.md
    setup/SKILL.md
    sync-skills/SKILL.md
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
| `projects/` | Claude's local cache — do not touch |

### local.md Format

```markdown
# Machine-Local Paths
```

### Skills

| Skill | Command | What it does |
|---|---|---|
| `agent/SKILL.md` | `/agent` | Multi-agent chat channel |
| `job-search/SKILL.md` | `/job-search` | Full career refresh, job search, CV analysis |
| `myplay/SKILL.md` | `/myplay` | Log human expertise moments |
| `note/SKILL.md` | `/note` | Quick capture of gotchas, learnings, tips |
| `refine-skill/SKILL.md` | `/refine-skill` | Analyze and improve skills |
| `report/SKILL.md` | `/report` | Technical report generation |
| `setup/SKILL.md` | `/setup` | Verify and repair setup |
| `sync-skills/SKILL.md` | `/sync-skills` | Audit, update docs, commit skills repo |
