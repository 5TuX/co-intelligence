# Architecture Reference

Supporting file for the `/setup` skill. Loaded on demand, not at startup.
This is the **template**. On first run, it's copied to `$PLUGIN_DATA/setup/architecture.md` where the skill reads and updates it.

The tables below start empty. Use `/setup` (apply mode with drift detection) or `/setup edit` to populate them from your machine.

## Architecture Overview

```
~/.claude/ (local)                 User data (external)
-----------------------------------  -----------------------------------
plugins/                             DATA_DIR/ (from config.local.yaml)
  cache/co-intelligence/...            <admin_user>/
~/.claude.json (local)                   goals.md, cv.md, Topics/, etc.
  mcpServers: (user-configured)
```

The plugin installs into the standard Claude Code plugin cache. User data lives outside the plugin at a configurable path.

---

## Expected Plugins

Populated by `/setup` drift detection or `/setup edit add plugin <name>`.

| Plugin | Marketplace | Version |
|---|---|---|
| `co-intelligence@co-intelligence` | co-intelligence | (check locally) |

### Marketplace Registration

```bash
claude plugin marketplace add 5TuX/co-intelligence
```

---

## Expected MCP Servers

Populated by `/setup` drift detection or `/setup edit add mcp <name>`.

MCP servers are in `~/.claude.json` (local, not synced). API keys are **never synced** - each machine needs its own.

| Server | Transport | Needs API key |
|---|---|---|

### MCP Add Commands

Add commands here as you configure servers:
```bash
# Example:
# claude mcp add -s user -t http <name> "<url>"
```

---

## Skills

| Skill | Command | What it does |
|---|---|---|
| `agent/SKILL.md` | `/agent` | Multi-agent chat channel |
| `career/SKILL.md` | `/career` | Career refresh, job search, CV analysis |
| `skillsmith/SKILL.md` | `/skillsmith` | Create, refine, and delete skills |
| `report/SKILL.md` | `/report` | Technical report generation |
| `setup/SKILL.md` | `/setup` | Verify, repair, and evolve setup |

---

## Expected State Summary

The apply mode checks the machine against this table.

| Check | Expected |
|---|---|
| `DATA_DIR/ADMIN_USER/` | Directory with goals.md, cv.md, Topics/, etc. |
| Plugins | All entries in Expected Plugins table enabled |
| MCP servers | All entries in Expected MCP Servers table configured |
| `config.local.yaml` | Exists in `$PLUGIN_DATA/`, has admin_user and data_dir |

---

## Advanced: Multi-Machine Sync

The sections below are for users who sync Claude Code configuration across multiple machines via Google Drive (or similar). **This is entirely optional** - the plugin works without it.

### Synced Files

If you use cloud sync, you can link config files from a shared directory into `~/.claude/`:

| File/Dir | Link in `~/.claude/` | Type | Notes |
|---|---|---|---|

The exact sync root path can be set in `config.local.yaml` as `drive_root`.

### Link Creation

**Windows (PowerShell):**
```powershell
$src = "YOUR_SYNC_ROOT\claude"
$dst = "$env:USERPROFILE\.claude"

# Symlinks for files (requires Developer Mode)
New-Item -ItemType SymbolicLink -Path "$dst\<file>" -Target "$src\<file>" -Force

# Junctions for directories (no admin needed)
cmd /c "mklink /J `"$dst\<dir>`" `"$src\<dir>`""
```

**Linux / Mac:**
```bash
ln -sf "$SRC/<item>" "$DST/<item>"
```
