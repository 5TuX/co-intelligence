# Architecture Reference

Supporting file for the `/setup` skill. Loaded on demand, not at startup.
This is the **template**. On first run, it's copied to `$PLUGIN_DATA/setup/architecture.md` where the skill reads and updates it.

## Architecture Overview

```
Google Drive ($DRIVE)              ~/.claude/ (local)
-------------------------------    -----------------------------------
$DRIVE/claude/                     CLAUDE.md      -> symlink to Drive
  CLAUDE.md                        settings.json  -> symlink to Drive
  settings.json                    skills/        -> symlink/junction
  skills/                          scripts/       -> junction to Drive
    agent/SKILL.md                 rules/         -> junction to Drive
    career/SKILL.md                hooks/         -> junction to Drive
    skillsmith/SKILL.md            agents/        -> junction to Drive
    report/SKILL.md
    setup/SKILL.md               ~/.claude.json (local, NOT synced)
                                 -----------------------------------
User data (external):            mcpServers:
DATA_DIR/ (from config)            tavily      (http, needs API key)
  <admin_user>/                    playwright  (stdio, no key)
  <other users>/                   context7    (http, needs API key)
```

### Drive Path by OS

| OS | Drive sync root (`$DRIVE`) |
|---|---|
| **Linux (rclone/gdrive)** | `~/Documents/gdrive-shared` |
| **Mac (Google Drive app)** | `~/Google Drive/SharedDocuments/_me` |
| **Windows** | `~/Documents/_me` (Documents is a junction to gdrive) |

The exact path is set in `config.local.yaml` as `drive_root`.

---

## Synced Files

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

**Notes:**
- Files (CLAUDE.md, settings.json) use symlinks. Directories use junctions (no admin on Windows).
- `plugins/` is NOT synced - managed by the plugin system, too large.
- On Linux, use `ln -sf` for everything (no junction distinction).

### Link Creation Commands

**Windows (PowerShell, no admin needed for junctions):**
```powershell
$src = "$env:USERPROFILE\Documents\_me\claude"   # adjust to your $DRIVE
$dst = "$env:USERPROFILE\.claude"

# Symlinks for files (requires Developer Mode or admin)
New-Item -ItemType SymbolicLink -Path "$dst\CLAUDE.md"      -Target "$src\CLAUDE.md"      -Force
New-Item -ItemType SymbolicLink -Path "$dst\settings.json"  -Target "$src\settings.json"  -Force
New-Item -ItemType SymbolicLink -Path "$dst\skills"         -Target "$src\skills"         -Force

# Junctions for directories (no admin needed)
foreach ($dir in @('scripts', 'rules', 'hooks', 'agents')) {
    cmd /c "mklink /J `"$dst\$dir`" `"$src\$dir`""
}
```

**Linux:**
```bash
SRC=~/Documents/_me/claude   # adjust to your $DRIVE
DST=~/.claude

ln -sf "$SRC/CLAUDE.md"     "$DST/CLAUDE.md"
ln -sf "$SRC/settings.json" "$DST/settings.json"
ln -sf "$SRC/skills"        "$DST/skills"
ln -sf "$SRC/scripts"       "$DST/scripts"
ln -sf "$SRC/rules"         "$DST/rules"
ln -sf "$SRC/hooks"         "$DST/hooks"
ln -sf "$SRC/agents"        "$DST/agents"
```

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

## statusLine

Configured in `settings.json`:
```json
"statusLine": {
  "type": "command",
  "command": "bash ~/.claude/scripts/statusline-command.sh"
}
```

The script is in the synced `scripts/` directory. Requires `jq` and `bc`.

### Scoop Dependencies (Windows only)

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
scoop install jq bc
```

Add Scoop to Git Bash's PATH: add `export PATH="$PATH:/c/Users/$USER/scoop/shims"` to `~/.bashrc`.

---

## Expected Plugins

Registered via `extraKnownMarketplaces` in `settings.json` (synced via GDrive).

### Marketplace Registration

If registering manually (e.g. fresh machine before GDrive sync):
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

## ECC Rules

Rules come from the ECC plugin cache at `~/.claude/plugins/cache/everything-claude-code/everything-claude-code/<version>/rules/`. They are synced via GDrive in the `rules/` directory.

On a new machine after GDrive sync, the junction just needs to be recreated - no manual copy needed.

To refresh rules from ECC after a plugin update:
```powershell
$eccDir = (Get-ChildItem "$env:USERPROFILE\.claude\plugins\cache\everything-claude-code\everything-claude-code" | Sort-Object Name -Descending | Select-Object -First 1).FullName
$rulesDir = "$env:USERPROFILE\Documents\_me\claude\rules"   # adjust to your $DRIVE

foreach ($lang in @("common","cpp","csharp","golang","java","kotlin","perl","php","python","rust","swift","typescript","zh")) {
    Copy-Item -Recurse -Force "$eccDir\rules\$lang" "$rulesDir\$lang"
}
```

### Expected Rule Sets

`common`, `cpp`, `csharp`, `golang`, `java`, `kotlin`, `perl`, `php`, `python`, `rust`, `swift`, `typescript`, `zh`

> **WARNING:** Do NOT run `npx ecc-install` without cleanup flags. It installs 60+ commands, 30 agents, and ~50 skill dirs directly into `~/.claude/`, duplicating what the plugin already serves.

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

## Google Drive Sync

**Windows:** Google Drive desktop app syncs `Documents\_me\` automatically.

**Linux (rclone):**
```bash
# One-time setup
rclone config   # add a remote called "gdrive"

# Sync down (restore to new machine)
rclone sync gdrive:_me/claude ~/Documents/_me/claude

# Sync up (push local changes)
rclone sync ~/Documents/_me/claude gdrive:_me/claude
```

Drive path is `_me/claude` relative to Drive root (`My Drive/_me/claude`).

**Cleanup:** Google Drive may create conflict duplicates like `settings (1).json`. Periodically check for and delete them.

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
| `~/.claude/CLAUDE.md` | Symlink -> `$DRIVE/claude/CLAUDE.md`, readable |
| `~/.claude/settings.json` | Symlink -> `$DRIVE/claude/settings.json`, valid JSON |
| `~/.claude/skills/` | Symlink/Junction -> `$DRIVE/claude/skills/`, contains skill subdirs |
| `~/.claude/scripts/` | Junction -> `$DRIVE/claude/scripts/` |
| `~/.claude/rules/` | Junction -> `$DRIVE/claude/rules/` |
| `~/.claude/hooks/` | Junction -> `$DRIVE/claude/hooks/` |
| `~/.claude/agents/` | Junction -> `$DRIVE/claude/agents/` |
| `CLAUDE_PLUGIN_ROOT` | Set, points to latest ECC version dir |
| `DATA_DIR/ADMIN_USER/` | Directory with goals.md, cv.md, Topics/, etc. |
| Plugins | All entries in Expected Plugins table enabled |
| MCP servers | All entries in Expected MCP Servers table configured |
| ECC rules | All expected rule sets present in `$DRIVE/claude/rules/` |
| statusLine | Script exists, jq + bc available |
