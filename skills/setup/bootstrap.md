# Bootstrap: First-Time Setup

How to go from a bare machine to a fully working Claude Code setup.

After completing these steps, use `/setup` (apply mode) to verify everything and `/setup edit` to evolve the setup over time.

---

## Step 1 - Install Claude Code

```bash
npm install -g @anthropic-ai/claude-code
```

## Step 2 - Set up Google Drive sync

**Windows:** Install Google Drive desktop app. It syncs `Documents\_me\` automatically.

**Linux (rclone):**
```bash
rclone config   # add a remote called "gdrive"
rclone sync gdrive:_me/claude ~/Documents/_me/claude
```

**Mac:** Install Google Drive desktop app. Sync root is typically `~/Google Drive/SharedDocuments/_me`.

After sync, verify `$DRIVE/claude/` contains `CLAUDE.md`, `settings.json`, `skills/`, `scripts/`, `rules/`, `hooks/`, `agents/`.

## Step 3 - Create symlinks and junctions

Link the synced files into `~/.claude/`. Replace `$DRIVE` with your actual Drive root (see `architecture.md` for OS-specific paths).

**Windows (PowerShell):**
```powershell
$src = "$env:USERPROFILE\Documents\_me\claude"
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
SRC=~/Documents/_me/claude
DST=~/.claude

for item in CLAUDE.md settings.json skills scripts rules hooks agents; do
    ln -sf "$SRC/$item" "$DST/$item"
done
```

## Step 4 - Register marketplaces and install plugins

```bash
claude plugin marketplace add affaan-m/everything-claude-code
claude plugin marketplace add 5TuX/co-intelligence
claude plugin install superpowers@claude-plugins-official
claude plugin install everything-claude-code@everything-claude-code
claude plugin install co-intelligence@co-intelligence
```

## Step 5 - Set CLAUDE_PLUGIN_ROOT

ECC hooks need this env var. Set it as an OS-level user variable (not in .bashrc).

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

## Step 6 - Install scoop dependencies (Windows only)

The statusLine script needs `jq` and `bc`:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression
scoop install jq bc
```

Add to Git Bash PATH in `~/.bashrc`:
```bash
export PATH="$PATH:/c/Users/$USER/scoop/shims"
```

## Step 7 - Create local config

```bash
cp ${CLAUDE_PLUGIN_ROOT}/templates/config.local.yaml.example ${CLAUDE_PLUGIN_DATA}/config.local.yaml
```

Edit `config.local.yaml` with your user handle, data directory, and Drive root path.

## Step 8 - Configure MCP servers

MCP servers are local (not synced). Configure per machine:

```bash
claude mcp add -s user playwright -- npx -y @playwright/mcp@latest
claude mcp add -s user -t http tavily "https://mcp.tavily.com/mcp/?tavilyApiKey=YOUR_KEY"
claude mcp add -s user -t http context7 "https://mcp.context7.com/mcp" -H "CONTEXT7_API_KEY: YOUR_KEY"
```

Get API keys:
- Tavily: https://tavily.com
- Context7: https://context7.com
- Playwright: no key needed

## Step 9 - Verify

Start a new Claude Code session and run:
```
/co-intelligence:setup
```

This runs apply mode, which checks everything above and reports any remaining issues.

---

## Troubleshooting

- **Hook errors on every tool use:** `CLAUDE_PLUGIN_ROOT` is not set or points to wrong version. Re-run Step 5.
- **Skills not showing in autocomplete:** Restart Claude Code after plugin install. Check that `~/.claude/skills/` junction points to the right place.
- **`python3` not found (Windows):** Windows uses `python`, not `python3`. The setup skill handles this automatically.
- **Symlink creation fails (Windows):** Enable Developer Mode in Windows Settings, or use admin PowerShell.
- **Git Bash `ln -s` on directories:** Creates a copy, not a link. Always use PowerShell junctions for directories on Windows.
