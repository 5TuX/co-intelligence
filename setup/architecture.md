# Architecture Reference

Supporting file for the `/setup` skill — loaded on demand, not at startup.

## Architecture Overview

```
Google Drive ($DRIVE)              ~/.claude/ (local)
────────────────────────           ───────────────────────────────────
$DRIVE/claude/                     CLAUDE.md      → symlink to Drive
  CLAUDE.md                        settings.json  → symlink to Drive
  settings.json                    skills/        → symlink/junction to Drive
  skills/                          keybindings.json ← plain file (optional)
    agent/SKILL.md
    career/SKILL.md                projects/      ← Claude cache, never touch
    refine-skill/SKILL.md
    report/SKILL.md              ~/.claude.json (local, NOT synced)
    setup/SKILL.md               ───────────────────────────────────
                                 mcpServers:
                                   tavily      (stdio, needs API key)
User data (external):              playwright  (stdio, no key)
~/Documents/_me/references/        context7    (http, needs API key)
  career/dimit/
  career/iliasse/
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
| `keybindings.json` | Custom key bindings (optional) |
| `~/.claude.json` | Claude Code state + MCP server config (machine-local) |
| `projects/` | Claude's local cache — do not touch |

### Skills

| Skill | Command | What it does |
|---|---|---|
| `agent/SKILL.md` | `/agent` | Multi-agent chat channel |
| `career/SKILL.md` | `/career` | Full career refresh, job search, note capture, CV analysis |
| `refine-skill/SKILL.md` | `/refine-skill` | Analyze and improve skills |
| `report/SKILL.md` | `/report` | Technical report generation |
| `setup/SKILL.md` | `/setup` | Verify and repair setup |

### Plugin

| Setting | Location | Value |
|---|---|---|
| `enabledPlugins` | `settings.json` (synced) | `"superpowers@claude-plugins-official": true` |

### MCP Servers

MCP servers are configured in `~/.claude.json` (local, not synced) under the `mcpServers` key. API keys are **never synced** — each machine needs its own keys.

#### MCP add commands (cross-platform)

Use `claude mcp add -s user` to install globally. Tavily and context7 use HTTP transport (no npx needed). Playwright uses stdio.

```bash
claude mcp add -s user playwright -- npx -y @playwright/mcp@latest
claude mcp add -s user -t http tavily "https://mcp.tavily.com/mcp/?tavilyApiKey=<YOUR_TAVILY_KEY>"
claude mcp add -s user -t http context7 "https://mcp.context7.com/mcp" -H "CONTEXT7_API_KEY: <YOUR_CONTEXT7_KEY>"
```

#### API Key Sources

| Server | Get key at | Transport |
|---|---|---|
| tavily | https://tavily.com | HTTP (key in URL) |
| context7 | https://context7.com | HTTP (key in header) |
| playwright | (no key needed) | stdio |
