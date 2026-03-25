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

2. **Detect the Python command**: On Windows, Python is typically `python` (not `python3`). Try `python --version` first; fall back to `python3`. Use whichever works for all subsequent Python commands in this session. Assign it to a shell variable: `PY=$(command -v python3 || command -v python)`.

3. **Run all verification tests**. Each check below MUST be a **separate, independent Bash call** so that one failure does not cancel the others. Run independent checks in parallel where possible.

### Check: Symlinks
```bash
ls -la ~/.claude/CLAUDE.md ~/.claude/settings.json ~/.claude/skills
```

### Check: CLAUDE.md readable
```bash
head -1 ~/.claude/CLAUDE.md
```

### Check: settings.json valid JSON
**Important (Windows):** `$HOME` in Git Bash expands to `/c/Users/...` which Python cannot read. Always use `os.environ.get('USERPROFILE', os.path.expanduser('~'))` inside Python to build paths, or pass the path as a `sys.argv` argument resolved by the shell with `"$(cygpath -w ~/.claude/settings.json)"` on Windows.

```bash
PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
SETTINGS="$(cygpath -w ~/.claude/settings.json 2>/dev/null || echo ~/.claude/settings.json)"
$PY -c "import json,sys; json.load(open(sys.argv[1])); print('settings.json: valid JSON')" "$SETTINGS"
```

### Check: Skills populated
```bash
ls ~/.claude/skills/
```

### Check: local.md exists
```bash
test -f ~/.claude/local.md && echo "local.md: present" || echo "local.md: MISSING"
```

### Check: Career dir
```bash
ls ~/.claude/skills/job-search/users/dimit/*.md ~/.claude/skills/job-search/users/dimit/Topics/ 2>&1 || echo "ERROR: career dir missing or incomplete"
```

### Check: Career key files
```bash
ls ~/.claude/skills/job-search/users/dimit/Direction.md ~/.claude/skills/job-search/users/dimit/CV.md > /dev/null 2>&1 && echo "Career files: present" || echo "ERROR: career files missing"
```

### Check: Plugin enabled
```bash
PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
SETTINGS="$(cygpath -w ~/.claude/settings.json 2>/dev/null || echo ~/.claude/settings.json)"
$PY -c "
import json, sys
d = json.load(open(sys.argv[1]))
print('superpowers plugin:', 'enabled' if d.get('enabledPlugins',{}).get('superpowers@claude-plugins-official') else 'MISSING')
" "$SETTINGS"
```

### Check: MCP servers configured
```bash
PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
CJSON="$(cygpath -w ~/.claude.json 2>/dev/null || echo ~/.claude.json)"
$PY -c "
import json, sys
try:
    d = json.load(open(sys.argv[1]))
    servers = d.get('mcpServers', {})
    expected = {'tavily', 'playwright', 'context7'}
    found = set(servers.keys()) & expected
    missing = expected - found
    for s in sorted(found): print(f'MCP {s}: configured')
    for s in sorted(missing): print(f'MCP {s}: MISSING')
except Exception as e:
    print(f'ERROR reading .claude.json: {e}')
" "$CJSON"
```

5. **Report results** clearly:
   - List each check as PASS or FAIL with the actual value found
   - For any FAIL, explain what is wrong and what the expected value should be

6. **Offer to fix** any failed checks:
   - Missing or broken symlink → recreate it (see `architecture.md` for drive paths by OS)
   - Missing `local.md` → create it with inferred paths
   - Missing career dir → flag for manual action (needs files from another machine)
   - Missing git repo in career dir → `git init && git add -A && git commit -m "career: initial import"`
   - Missing plugin → add `enabledPlugins` key to `settings.json` (see `architecture.md`)
   - Missing MCP server → add to `~/.claude.json` `mcpServers` block (see `architecture.md` for templates); prompt user for API keys
   - Ask user before making any changes

7. After fixing, **re-run verification** and confirm all checks pass.

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

- **Windows: `python3` not found**: Windows installs Python as `python`, not `python3`. Always detect with `PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)` and use `$PY` thereafter.
- **Windows: `$HOME` MSYS path breaks Python**: In Git Bash, `$HOME` expands to `/c/Users/...` — Python cannot open these MSYS-translated paths. Use `cygpath -w` to convert to Windows paths before passing to Python, or pass paths via `sys.argv` resolved by the shell: `"$(cygpath -w ~/.claude/settings.json)"`.
- **Parallel Bash calls**: When running multiple Bash tool calls in parallel, if one errors the others may be cancelled. Each verification check MUST be a separate, independent Bash call so failures are isolated.
- **Windows `ln -s` for dirs**: Git Bash `ln -s` on a directory creates a copy, not a link. Always use PowerShell `New-Item -ItemType Junction`.
- **Windows `/skills` panel**: Claude Code does not follow symlinks when scanning `skills/`. Use a Junction for the `skills/` directory.
- **Windows SymbolicLink for files**: Requires Developer Mode enabled in Windows Settings, or running PowerShell as admin.
- **Career dir not synced via Drive**: `~/.claude/skills/job-search/users/dimit/` is local and git-tracked. To migrate to a new machine, copy the directory.
- **Fixing broken links**: If Drive folder is renamed/remounted, symlinks break. Delete the broken link and re-run the relevant setup step.
