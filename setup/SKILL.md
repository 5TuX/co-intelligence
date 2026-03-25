---
name: setup
description: >
  Use when the user says /setup or asks to verify, repair, or initialize
  the Claude Code setup on the current machine.
disable-model-invocation: true
---

# Claude Code Setup Verifier & Repair

Check that all symlinks, config files, and paths are correctly configured.
Fix anything broken. For architecture details and drive paths, see `architecture.md`
in this skill's directory.

## Verification Instructions

1. **Detect the Drive root**: resolve the symlink target of `~/.claude/CLAUDE.md` and extract the Drive root path from it (everything before `/claude/CLAUDE.md`).

2. **Run all verification tests**:

```bash
# Symlinks
ls -la ~/.claude/CLAUDE.md ~/.claude/settings.json ~/.claude/skills

# Content readable
head -1 ~/.claude/CLAUDE.md
python3 -c "import json,sys; json.load(open(sys.argv[1])); print('settings.json: valid JSON')" ~/.claude/settings.json

# Skills populated
ls ~/.claude/skills/

# local.md exists
cat ~/.claude/local.md

# Career dir exists and has expected files
ls ~/.claude/skills/job-search/users/dimit/*.md ~/.claude/skills/job-search/users/dimit/Topics/ || echo "ERROR: career dir missing or incomplete"

# Career dir has expected files
ls ~/.claude/skills/job-search/users/dimit/Direction.md ~/.claude/skills/job-search/users/dimit/CV.md > /dev/null 2>&1 && echo "Career files: present" || echo "ERROR: career files missing"

# Plugin enabled
python3 -c "import json; d=json.load(open('$HOME/.claude/settings.json')); print('superpowers plugin:', 'enabled' if d.get('enabledPlugins',{}).get('superpowers@claude-plugins-official') else 'MISSING')"

# MCP servers configured
python3 -c "
import json, sys
try:
    d = json.load(open('$HOME/.claude.json'))
    servers = d.get('mcpServers', {})
    expected = {'tavily', 'playwright', 'context7'}
    found = set(servers.keys()) & expected
    missing = expected - found
    for s in sorted(found): print(f'MCP {s}: configured')
    for s in sorted(missing): print(f'MCP {s}: MISSING')
except Exception as e:
    print(f'ERROR reading .claude.json: {e}')
"
```

3. **Report results** clearly:
   - List each check as PASS or FAIL with the actual value found
   - For any FAIL, explain what is wrong and what the expected value should be

4. **Offer to fix** any failed checks:
   - Missing or broken symlink → recreate it (see `architecture.md` for drive paths by OS)
   - Missing `local.md` → create it with inferred paths
   - Missing career dir → flag for manual action (needs files from another machine)
   - Missing git repo in career dir → `git init && git add -A && git commit -m "career: initial import"`
   - Missing plugin → add `enabledPlugins` key to `settings.json` (see `architecture.md`)
   - Missing MCP server → add to `~/.claude.json` `mcpServers` block (see `architecture.md` for templates); prompt user for API keys
   - Ask user before making any changes

5. After fixing, **re-run verification** and confirm all checks pass.

## Expected Passing State

| Check | Expected |
|---|---|
| `~/.claude/CLAUDE.md` | Symlink → Drive path, readable |
| `~/.claude/settings.json` | Symlink → Drive path, valid JSON |
| `~/.claude/skills/` | Symlink/Junction → Drive skills dir, contains skill subdirs |
| `~/.claude/local.md` | Plain file, machine-specific paths |
| `~/.claude/skills/job-search/users/dimit/` | Directory with Direction.md, Journal.md, CV.md, Human-Expertise.md, Topics/, etc. |
| `~/.claude/skills/job-search/users/dimit/` | Files synced via Google Drive (no git repo required) |
| `settings.json` → `enabledPlugins` | `superpowers@claude-plugins-official: true` |
| `~/.claude.json` → `mcpServers.tavily` | stdio, `npx tavily-mcp@latest`, env `TAVILY_API_KEY` set |
| `~/.claude.json` → `mcpServers.playwright` | stdio, `npx @playwright/mcp@latest` |
| `~/.claude.json` → `mcpServers.context7` | http, `https://mcp.context7.com/mcp`, header `CONTEXT7_API_KEY` set |

## First-Time Setup on a New Machine

### Step 1 — Install Claude Code
```bash
npm install -g @anthropic-ai/claude-code
```

### Step 2 — Identify your Drive path
Find where Google Drive syncs on this machine (see `architecture.md` for paths by OS).

### Step 3 — Link CLAUDE.md
**Linux / Mac:**
```bash
ln -s "$DRIVE/claude/CLAUDE.md" ~/.claude/CLAUDE.md
```
**Windows (PowerShell — requires Developer Mode or admin):**
```powershell
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude\CLAUDE.md" -Target "$DRIVE\claude\CLAUDE.md"
```

### Step 4 — Link settings.json
**Linux / Mac:**
```bash
ln -s "$DRIVE/claude/settings.json" ~/.claude/settings.json
```
**Windows:**
```powershell
New-Item -ItemType SymbolicLink -Path "$env:USERPROFILE\.claude\settings.json" -Target "$DRIVE\claude\settings.json"
```

### Step 5 — Link skills/
**Linux / Mac:**
```bash
ln -s "$DRIVE/claude/skills" ~/.claude/skills
```
**Windows (use Junction, not symlink):**
```powershell
New-Item -ItemType Junction -Path "$env:USERPROFILE\.claude\skills" -Target "$DRIVE\claude\skills"
```

### Step 6 — Create local.md
Create `~/.claude/local.md` with paths for this machine (see `architecture.md` for format).

### Step 7 — Set up career directory
```bash
mkdir -p ~/.claude/skills/job-search/users/dimit/Topics
# Copy career files from another machine or let Google Drive sync them
```

### Step 8 — Enable the superpowers plugin

The plugin is already declared in `settings.json` (synced via Drive). Verify it loaded:
```bash
claude /plugins
```
If not listed, install it:
```
/plugin install superpowers@claude-plugins-official
```

### Step 9 — Configure MCP servers

MCP servers live in `~/.claude.json` under the `mcpServers` key. This file is **local** (not synced), so you must configure it per machine.

See `architecture.md` for the full JSON templates. The key steps:

1. Open (or create) `~/.claude.json` and add the `mcpServers` block.
2. For **playwright** — no secrets needed, just add the config.
3. For **tavily** — get your API key from https://tavily.com and set `TAVILY_API_KEY`.
4. For **context7** — get your API key from https://context7.com and set the `CONTEXT7_API_KEY` header.

**Windows note:** MCP stdio servers must use `cmd /c npx ...` (not bare `npx`) because Claude Code on Windows needs `cmd` as the shell wrapper.

**Linux / Mac:** Use `npx` directly as the command (no `cmd /c` wrapper).

## Known Issues & Gotchas

- **Windows `ln -s` for dirs**: Git Bash `ln -s` on a directory creates a copy, not a link. Always use PowerShell `New-Item -ItemType Junction`.
- **Windows `/skills` panel**: Claude Code does not follow symlinks when scanning `skills/`. Use a Junction for the `skills/` directory.
- **Windows SymbolicLink for files**: Requires Developer Mode enabled in Windows Settings, or running PowerShell as admin.
- **Career dir not synced via Drive**: `~/.claude/skills/job-search/users/dimit/` is local and git-tracked. To migrate to a new machine, copy the directory.
- **Fixing broken links**: If Drive folder is renamed/remounted, symlinks break. Delete the broken link and re-run the relevant setup step.
