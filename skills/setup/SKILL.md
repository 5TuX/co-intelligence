---
name: setup
description: >
  Use when the user says /setup or asks to verify, repair, or initialize
  the Claude Code setup on the current machine.
argument-hint: "[scan]"
---

# Claude Code Setup Verifier, Repair & Sync

Check that all symlinks, config files, and paths are correctly configured.
Fix anything broken. Scan the live setup to keep `architecture.md` in sync across machines.
For architecture details and drive paths, see `architecture.md` (in `$PLUGIN_DATA/setup/`).

## Argument Parsing

```
/setup          → verify and repair (default)
/setup scan     → scan current machine, update architecture.md for cross-machine sync
```

- If argument is `scan` → jump to §Scan Mode
- Otherwise → verification mode (default)

## Data Directory

At the start of every invocation:
1. Resolve `CLAUDE_PLUGIN_DATA` env var → `$PLUGIN_DATA`
2. Create `$PLUGIN_DATA/setup/` if it doesn't exist
3. If `$PLUGIN_DATA/setup/architecture.md` doesn't exist, copy from `templates/architecture.md` in this skill's directory
4. Read `$PLUGIN_DATA/config.local.yaml` for `admin_user` and `data_dir`. If missing, error: "Missing config — run: `cp ${CLAUDE_PLUGIN_ROOT}/templates/config.local.yaml.example ${CLAUDE_PLUGIN_DATA}/config.local.yaml` and edit it."

All references to `architecture.md` and `config.local.yaml` below mean the copies in `$PLUGIN_DATA/`.

---

## Verification Mode (default)

### Step 1: Detect environment

1. **Detect the Drive root**: resolve the symlink target of `~/.claude/CLAUDE.md` and extract the Drive root path from it (everything before `/claude/CLAUDE.md`).

2. **Detect the Python command**: On Windows, Python is typically `python` (not `python3`). Try `python --version` first; fall back to `python3`. Use whichever works for all subsequent Python commands in this session. Assign it to a shell variable: `PY=$(command -v python3 || command -v python)`.

3. **Read expected state**: Read `architecture.md` § "Expected State" to get the expected MCP servers, plugins, and checks. Do NOT hardcode these — always read from architecture.md.

### Step 2: Run verification tests

Each check below MUST be a **separate, independent Bash call** so that one failure does not cancel the others. Run independent checks in parallel where possible.

#### Check: Symlinks
```bash
ls -la ~/.claude/CLAUDE.md ~/.claude/settings.json ~/.claude/skills
```

#### Check: CLAUDE.md readable
```bash
head -1 ~/.claude/CLAUDE.md
```

#### Check: settings.json valid JSON
**Important (Windows):** `$HOME` in Git Bash expands to `/c/Users/...` which Python cannot read. Always use `os.environ.get('USERPROFILE', os.path.expanduser('~'))` inside Python to build paths, or pass the path as a `sys.argv` argument resolved by the shell with `"$(cygpath -w ~/.claude/settings.json)"` on Windows.

```bash
PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
SETTINGS="$(cygpath -w ~/.claude/settings.json 2>/dev/null || echo ~/.claude/settings.json)"
$PY -c "import json,sys; json.load(open(sys.argv[1])); print('settings.json: valid JSON')" "$SETTINGS"
```

#### Check: Skills populated
```bash
ls ${CLAUDE_PLUGIN_ROOT}/skills/
```

#### Check: Career dir
Use `data_dir` and `admin_user` from config.local.yaml to construct the path:
```bash
ls DATA_DIR/ADMIN_USER/*.md DATA_DIR/ADMIN_USER/Topics/ 2>&1 || echo "ERROR: career dir missing or incomplete"
```

#### Check: Career key files
```bash
ls DATA_DIR/ADMIN_USER/goals.md DATA_DIR/ADMIN_USER/cv.md > /dev/null 2>&1 && echo "Career files: present" || echo "ERROR: career files missing"
```

#### Check: Plugins enabled
Read the "Expected Plugins" table from `architecture.md`. For each plugin, verify it's present in `settings.json`:
```bash
PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
SETTINGS="$(cygpath -w ~/.claude/settings.json 2>/dev/null || echo ~/.claude/settings.json)"
$PY -c "
import json, sys
d = json.load(open(sys.argv[1]))
print('superpowers plugin:', 'enabled' if d.get('enabledPlugins',{}).get('superpowers@claude-plugins-official') else 'MISSING')
" "$SETTINGS"
```

#### Check: MCP servers configured
Read the "Expected MCP Servers" table from `architecture.md` to get the list of expected server names. Then check each:
```bash
MCP_OUT=$(claude mcp list 2>&1)
echo "$MCP_OUT"
# Check each server from architecture.md Expected MCP Servers table
for srv in <names from architecture.md>; do
  echo "$MCP_OUT" | grep -qi "$srv" && echo "MCP $srv: configured" || echo "MCP $srv: MISSING"
done
```

### Step 3: Report and fix

**Report results** clearly:
- List each check as PASS or FAIL with the actual value found
- For any FAIL, explain what is wrong and what the expected value should be

**Offer to fix** any failed checks by **printing the commands the user should run** (prefixed with `!` so they can paste directly into the Claude Code prompt). Do NOT edit config files directly — give the user the commands and let them execute.
- Missing or broken symlink → print the PowerShell (Windows) or `ln -s` (Linux/Mac) command (see `architecture.md` for drive paths by OS)
- Missing career dir → flag for manual action (needs files from another machine)
- Missing plugin → print the install command
- Missing MCP server → print `claude mcp add` commands from `architecture.md` § "MCP add commands"; prompt user for API keys
- Ask user before making any changes

After fixing, **re-run verification** and confirm all checks pass.

---

## Scan Mode (`/setup scan`)

Captures the live setup state and updates `architecture.md` so other machines can sync.

### Step 1: Discover live state

Run these in parallel:

**MCP servers:**
```bash
claude mcp list 2>&1
```
Parse the output to extract all configured server names, transport types, and scopes.
**Filter:** Only track user-configured servers. Ignore platform-managed servers (e.g., `claude.ai Gmail`, `claude.ai Google Calendar`) — these are built-in integrations that vary by account, not part of the reproducible setup.

**Plugins:**
```bash
PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
SETTINGS="$(cygpath -w ~/.claude/settings.json 2>/dev/null || echo ~/.claude/settings.json)"
$PY -c "
import json, sys
d = json.load(open(sys.argv[1]))
plugins = d.get('enabledPlugins', {})
for name, enabled in plugins.items():
    if enabled: print(name)
" "$SETTINGS"
```

**Skills:**
```bash
ls ${CLAUDE_PLUGIN_ROOT}/skills/
```

### Step 2: Compare against architecture.md

Read `architecture.md` and compare:
- **Skills table** — any new skill directories? Any removed?
- **Expected MCP Servers table** — any new servers discovered? Any listed but not installed?
- **Expected Plugins table** — any new plugins enabled? Any removed?
- **Architecture diagram** — does it still reflect reality?

### Step 3: Show diff and update

Present the differences clearly:
```
New since last scan:
  + MCP server: <name> (<transport>)
  + Plugin: <name>
  + Skill: <name>/

Removed since last scan:
  - MCP server: <name>
  - Skill: <name>/

Unchanged: <count> MCP servers, <count> plugins, <count> skills
```

If there are changes:
1. Update `architecture.md`: Skills table, Expected MCP Servers table, Expected Plugins table, architecture diagram, and MCP add commands section (add install commands for new servers).
2. Show the updated architecture.md content. If the user wants to persist changes to the plugin repo, they must do so manually from the source checkout.

If no changes: "Setup is in sync with architecture.md — nothing to update."

---

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

### Step 6 — Create local config
```bash
cp ${CLAUDE_PLUGIN_ROOT}/templates/config.local.yaml.example $PLUGIN_DATA/config.local.yaml
# Edit config.local.yaml with your handle and data directory path
```

### Step 7 — Set up career directory
```bash
mkdir -p DATA_DIR/ADMIN_USER/Topics
# (Use the data_dir and admin_user values from config.local.yaml)
# Copy career files from another machine or let Google Drive sync them
```

### Step 8 — Enable plugins
Read `architecture.md` § "Expected Plugins" and install any listed plugins.

### Step 9 — Configure MCP servers
MCP servers are **local** (not synced), so you must configure them per machine.
Read `architecture.md` § "MCP add commands" and run each command, substituting your API keys.

**API keys:** Get tavily key from https://tavily.com, context7 key from https://context7.com. Playwright needs no key.

## Known Issues & Gotchas

- **Windows: `python3` not found**: Windows installs Python as `python`, not `python3`. Always detect with `PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)` and use `$PY` thereafter.
- **Windows: `$HOME` MSYS path breaks Python**: In Git Bash, `$HOME` expands to `/c/Users/...` — Python cannot open these MSYS-translated paths. Use `cygpath -w` to convert to Windows paths before passing to Python, or pass paths via `sys.argv` resolved by the shell: `"$(cygpath -w ~/.claude/settings.json)"`.
- **Parallel Bash calls**: When running multiple Bash tool calls in parallel, if one errors the others may be cancelled. Each verification check MUST be a separate, independent Bash call so failures are isolated.
- **Windows `ln -s` for dirs**: Git Bash `ln -s` on a directory creates a copy, not a link. Always use PowerShell `New-Item -ItemType Junction`.
- **Windows `/skills` panel**: Claude Code does not follow symlinks when scanning `skills/`. Use a Junction for the `skills/` directory.
- **Windows SymbolicLink for files**: Requires Developer Mode enabled in Windows Settings, or running PowerShell as admin.
- **Career dir not synced via Drive**: The career data directory (see `config.local.yaml` → `data_dir`) is local. To migrate to a new machine, copy the directory.
- **`claude mcp add` default scope is `local`**: Without `-s user`, servers are added to the project-local config and won't appear globally. Always use `-s user` for user-wide MCP servers.
- **Windows Git Bash mangles `/c` arg**: `claude mcp add ... -- cmd /c npx ...` in Git Bash translates `/c` to `C:/`, breaking the command. After adding playwright on Windows, verify `~/.claude.json` and manually fix `"C:/"` to `"/c"` if needed.
- **Fixing broken links**: If Drive folder is renamed/remounted, symlinks break. Delete the broken link and re-run the relevant setup step.
