# Bootstrap: First-Time Setup

How to go from a bare machine to a fully working co-intelligence setup.

After completing these steps, use `/setup` (apply mode) to verify everything and `/setup edit` to evolve the setup over time.

---

## Basic Setup

These steps are all most users need.

### Step 1 - Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

### Step 2 - Install the plugin

```bash
claude plugin marketplace add 5TuX/co-intelligence
claude plugin install co-intelligence@co-intelligence
```

### Step 3 - Create local config

```bash
cp ${CLAUDE_PLUGIN_ROOT}/templates/config.local.yaml.example ${CLAUDE_PLUGIN_DATA}/config.local.yaml
```

Edit `config.local.yaml` with your user handle and data directory path.

### Step 4 - Configure MCP servers (optional)

Some skills work better with MCP servers for web search and documentation lookup:

```bash
claude mcp add -s user playwright -- npx -y @playwright/mcp@latest
claude mcp add -s user -t http tavily "https://mcp.tavily.com/mcp/?tavilyApiKey=YOUR_KEY"
claude mcp add -s user -t http context7 "https://mcp.context7.com/mcp" -H "CONTEXT7_API_KEY: YOUR_KEY"
```

Get API keys:
- Tavily: https://tavily.com
- Context7: https://context7.com
- Playwright: no key needed

### Step 5 - Verify

Start a new Claude Code session and run:
```
/co-intelligence:setup
```

This checks your setup and reports any issues.

---

## Advanced: Multi-Machine Sync with Google Drive

If you use Claude Code on multiple machines and want to keep settings, skills, and rules in sync via Google Drive, the sections below cover that setup. **This is entirely optional** - the plugin works fine without it.

### Google Drive sync

**Windows:** Google Drive desktop app syncs `Documents\_me\` automatically.

**Linux (rclone):**
```bash
rclone config   # add a remote called "gdrive"
rclone sync gdrive:_me/claude ~/Documents/_me/claude
```

**Mac:** Google Drive desktop app. Sync root is typically `~/Google Drive/SharedDocuments/_me`.

### Symlinks and junctions

Link GDrive-synced config files into `~/.claude/` so Claude Code picks them up.

**Windows (PowerShell):**
```powershell
$src = "$env:USERPROFILE\Documents\_me\claude"   # adjust to your Drive root
$dst = "$env:USERPROFILE\.claude"

# Symlinks for files (requires Developer Mode)
New-Item -ItemType SymbolicLink -Path "$dst\CLAUDE.md"      -Target "$src\CLAUDE.md"      -Force
New-Item -ItemType SymbolicLink -Path "$dst\settings.json"  -Target "$src\settings.json"  -Force
New-Item -ItemType SymbolicLink -Path "$dst\skills"         -Target "$src\skills"         -Force

# Junctions for directories (no admin needed)
foreach ($dir in @('scripts', 'rules', 'hooks', 'agents')) {
    cmd /c "mklink /J `"$dst\$dir`" `"$src\$dir`""
}
```

**Linux / Mac:**
```bash
SRC=~/Documents/_me/claude   # adjust to your Drive root
DST=~/.claude

for item in CLAUDE.md settings.json skills scripts rules hooks agents; do
    ln -sf "$SRC/$item" "$DST/$item"
done
```

### CLAUDE_PLUGIN_ROOT (for ECC hooks)

If you use the Everything Claude Code plugin with hooks, set this as an OS-level user env var:

**Windows (PowerShell):**
```powershell
$eccBase = "$env:USERPROFILE\.claude\plugins\cache\everything-claude-code\everything-claude-code"
$latest = (Get-ChildItem $eccBase -Directory | Sort-Object Name -Descending | Select-Object -First 1).FullName
[Environment]::SetEnvironmentVariable("CLAUDE_PLUGIN_ROOT", $latest, "User")
```

**Linux:**
```bash
# Add to ~/.config/environment.d/claude.conf
CLAUDE_PLUGIN_ROOT=~/.claude/plugins/cache/everything-claude-code/everything-claude-code/<version>
```

### Scoop dependencies (Windows only)

If using the ECC statusLine feature, install `jq` and `bc`:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
scoop install jq bc
```

Add to Git Bash PATH in `~/.bashrc`:
```bash
export PATH="$PATH:/c/Users/$USER/scoop/shims"
```

---

## Troubleshooting

- **Hook errors on every tool use:** `CLAUDE_PLUGIN_ROOT` is not set or points to wrong version. See the CLAUDE_PLUGIN_ROOT section above.
- **Skills not showing in autocomplete:** Restart Claude Code after plugin install.
- **`python3` not found (Windows):** Windows uses `python`, not `python3`. The setup skill handles this automatically.
- **Symlink creation fails (Windows):** Enable Developer Mode in Windows Settings, or use admin PowerShell.
- **Git Bash `ln -s` on directories:** Creates a copy, not a link. Always use PowerShell junctions for directories on Windows.
