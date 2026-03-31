# Architecture Reference

Supporting file for the `/setup` skill. Loaded on demand, not at startup.
This is the **template**. On first run, it's copied to `$PLUGIN_DATA/setup/architecture.md` where the skill reads and updates it.

## Architecture Overview

```
~/.claude/ (local)                 User data (external)
-----------------------------------  -----------------------------------
plugins/                             DATA_DIR/ (from config.local.yaml)
  cache/co-intelligence/...            <admin_user>/
~/.claude.json (local)                   goals.md, cv.md, Topics/, etc.
  mcpServers:
    tavily, playwright, context7
```

The plugin installs into the standard Claude Code plugin cache. User data lives outside the plugin at a configurable path.

---

## CLAUDE_PLUGIN_ROOT

ECC hooks in `settings.json` reference `${CLAUDE_PLUGIN_ROOT}` to locate hook scripts. This must be set as an **OS-level user environment variable** on each machine. Do NOT put it in `settings.json` (synced) or `~/.bashrc` (not sourced by hook subprocesses).

**Windows (PowerShell):**
```powershell
$eccBase = "$env:USERPROFILE\.claude\plugins\cache\everything-claude-code\everything-claude-code"
$latest = (Get-ChildItem $eccBase -Directory | Sort-Object Name -Descending | Select-Object -First 1).FullName
[Environment]::SetEnvironmentVariable("CLAUDE_PLUGIN_ROOT", $latest, "User")
```

**Linux:**
```bash
# ~/.config/environment.d/claude.conf
CLAUDE_PLUGIN_ROOT=/home/<user>/.claude/plugins/cache/everything-claude-code/everything-claude-code/<version>
```

After upgrading ECC, re-run to update the path. Without this, all ECC hooks fail with "hook error" on every tool use.

---

---

## Expected Plugins

### Marketplace Registration

```bash
claude plugin marketplace add affaan-m/everything-claude-code
claude plugin marketplace add 5TuX/co-intelligence
```

### Install Commands

```bash
claude plugin install superpowers@claude-plugins-official
claude plugin install everything-claude-code@everything-claude-code
claude plugin install co-intelligence@co-intelligence
```

### Installed Versions

| Plugin | Marketplace | Version |
|---|---|---|
| `superpowers@claude-plugins-official` | claude-plugins-official | (check locally) |
| `everything-claude-code@everything-claude-code` | everything-claude-code | (check locally) |
| `co-intelligence@co-intelligence` | co-intelligence | (check locally) |

---

## Expected MCP Servers

MCP servers are in `~/.claude.json` (local, not synced). API keys are **never synced** - each machine needs its own.

| Server | Transport | Needs API key |
|---|---|---|
| playwright | stdio | no |
| tavily | HTTP | yes |
| context7 | HTTP | yes |

### MCP Add Commands

```bash
claude mcp add -s user playwright -- npx -y @playwright/mcp@latest
claude mcp add -s user -t http tavily "https://mcp.tavily.com/mcp/?tavilyApiKey=YOUR_KEY"
claude mcp add -s user -t http context7 "https://mcp.context7.com/mcp" -H "CONTEXT7_API_KEY: YOUR_KEY"
```

### API Key Sources

| Server | Get key at |
|---|---|
| tavily | https://tavily.com |
| context7 | https://context7.com |
| playwright | (no key needed) |

### Available MCP Catalog

A full catalog of 25+ available MCPs (github, supabase, firecrawl, railway, exa, etc.) is stored in `~/.claude/mcp-configs/mcp-servers.json`. Copy individual configs from there into `~/.claude.json` as needed.

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

### Drive Path by OS

| OS | Drive sync root (`$DRIVE`) |
|---|---|
| **Linux (rclone/gdrive)** | `~/Documents/gdrive-shared` |
| **Mac (Google Drive app)** | `~/Google Drive/SharedDocuments/_me` |
| **Windows** | `~/Documents/_me` (Documents is a junction to gdrive) |

The exact path is set in `config.local.yaml` as `drive_root`.

### Synced Files

Files/dirs in `$DRIVE/claude/` linked into `~/.claude/`.

| File/Dir | Link in `~/.claude/` | Type | Notes |
|---|---|---|---|
| `CLAUDE.md` | `CLAUDE.md` | symlink | Global user preferences |
| `settings.json` | `settings.json` | symlink | Plugins, hooks, statusLine |
| `skills/` | `skills` | symlink | Custom skills |
| `scripts/` | `scripts` | junction | Hook runners + statusline script |
| `rules/` | `rules` | junction | ECC language rules |
| `hooks/` | `hooks` | junction | hooks.json |
| `agents/` | `agents` | junction | Custom agents not in plugin |

### ECC Rules

Rules come from the ECC plugin cache at `~/.claude/plugins/cache/everything-claude-code/everything-claude-code/<version>/rules/`.

To refresh rules from ECC after a plugin update:
```powershell
$eccDir = (Get-ChildItem "$env:USERPROFILE\.claude\plugins\cache\everything-claude-code\everything-claude-code" | Sort-Object Name -Descending | Select-Object -First 1).FullName
$rulesDir = "$env:USERPROFILE\Documents\_me\claude\rules"   # adjust to your $DRIVE

foreach ($lang in @("common","cpp","csharp","golang","java","kotlin","perl","php","python","rust","swift","typescript","zh")) {
    Copy-Item -Recurse -Force "$eccDir\rules\$lang" "$rulesDir\$lang"
}
```

Expected rule sets: `common`, `cpp`, `csharp`, `golang`, `java`, `kotlin`, `perl`, `php`, `python`, `rust`, `swift`, `typescript`, `zh`

### Google Drive Sync Commands

**Linux (rclone):**
```bash
rclone config   # add a remote called "gdrive"
rclone sync gdrive:_me/claude ~/Documents/_me/claude   # sync down
rclone sync ~/Documents/_me/claude gdrive:_me/claude   # sync up
```

**Cleanup:** Google Drive may create conflict duplicates like `settings (1).json`. Periodically delete them.
