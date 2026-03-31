# Apply Mode

Reference -> machine. Read `architecture.md` expected state, compare to machine, fix discrepancies, detect drift.

---

## Phase 1 - Check

Read `$PLUGIN_DATA/setup/architecture.md` to get the expected state tables. Run each check below as a **separate, independent Bash call** so one failure does not cancel others. Run independent checks in parallel where possible.

### Environment detection

1. **Detect OS**: `uname -s` - use result to select Windows vs Linux commands throughout.
2. **Detect Drive root**: Read `drive_root` from `$PLUGIN_DATA/config.local.yaml`. Assign to `$DRIVE`.
3. **Detect Python**: `PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)`

### Check: GDrive sync

Verify `$DRIVE/claude/` exists and has content:
```bash
ls "$DRIVE/claude/CLAUDE.md" "$DRIVE/claude/settings.json" "$DRIVE/claude/skills/"
```

### Check: Symlinks and junctions

For each entry in `architecture.md` "Synced Files" table, verify the link exists in `~/.claude/` and points to the correct target:
```bash
ls -la ~/.claude/CLAUDE.md ~/.claude/settings.json ~/.claude/skills ~/.claude/scripts ~/.claude/rules ~/.claude/hooks ~/.claude/agents
```

### Check: CLAUDE.md readable

```bash
head -1 ~/.claude/CLAUDE.md
```

### Check: settings.json valid JSON

**Windows note:** `$HOME` in Git Bash expands to `/c/Users/...` which Python cannot read. Use `cygpath -w` to convert paths.

```bash
PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
SETTINGS="$(cygpath -w ~/.claude/settings.json 2>/dev/null || echo ~/.claude/settings.json)"
$PY -c "import json,sys; json.load(open(sys.argv[1])); print('settings.json: valid JSON')" "$SETTINGS"
```

### Check: CLAUDE_PLUGIN_ROOT

Verify the env var is set and points to a valid ECC version directory:
```bash
echo "CLAUDE_PLUGIN_ROOT=$CLAUDE_PLUGIN_ROOT"
ls "$CLAUDE_PLUGIN_ROOT/skills/" 2>/dev/null && echo "PASS" || echo "FAIL: directory missing or empty"
```

Compare against latest available version:
```bash
ls ~/.claude/plugins/cache/everything-claude-code/everything-claude-code/ | sort -V | tail -1
```

### Check: Plugins enabled

Read "Expected Plugins" table from `architecture.md`. For each plugin, verify it's in `settings.json`:
```bash
PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
SETTINGS="$(cygpath -w ~/.claude/settings.json 2>/dev/null || echo ~/.claude/settings.json)"
$PY -c "
import json, sys
d = json.load(open(sys.argv[1]))
plugins = d.get('enabledPlugins', {})
for name, enabled in plugins.items():
    if enabled: print(f'  {name}: enabled')
" "$SETTINGS"
```

### Check: MCP servers configured

Read "Expected MCP Servers" table from `architecture.md`. Check each:
```bash
MCP_OUT=$(claude mcp list 2>&1)
echo "$MCP_OUT"
```
Compare output against expected servers. Report each as PASS or MISSING.

### Check: Skills populated

```bash
ls ${CLAUDE_PLUGIN_ROOT}/skills/
```

### Check: Career dir

Use `data_dir` and `admin_user` from `config.local.yaml`:
```bash
ls DATA_DIR/ADMIN_USER/*.md DATA_DIR/ADMIN_USER/Topics/ 2>&1 || echo "FAIL: career dir missing"
```

### Check: Scoop + jq + bc (Windows only)

```bash
command -v jq && echo "jq: PASS" || echo "jq: MISSING"
command -v bc && echo "bc: PASS" || echo "bc: MISSING"
```

Check `~/.bashrc` for scoop shims PATH entry.

### Check: statusLine

Verify `settings.json` has a `statusLine` entry and the referenced script exists:
```bash
ls ~/.claude/scripts/statusline-command.sh 2>/dev/null && echo "PASS" || echo "FAIL"
```

### Check: ECC rules

Compare rule directories in `$DRIVE/claude/rules/` against the "Expected Rule Sets" list in `architecture.md`.

---

## Phase 2 - Report and Fix

**Report results** as a table:

```
Check                  Status    Detail
-----                  ------    ------
GDrive sync            PASS
Symlink: CLAUDE.md     PASS      -> $DRIVE/claude/CLAUDE.md
Symlink: skills/       FAIL      missing
CLAUDE_PLUGIN_ROOT     WARN      v1.8.0 (latest: v1.9.0)
Plugin: superpowers    PASS
MCP: tavily            MISSING
...
```

For each FAIL or MISSING, **offer to fix**:
- Print the fix command with `!` prefix so user can paste directly
- Ask before executing: "Fix this? (y/n)"
- For missing symlinks/junctions:
  - Windows: `mklink /J` for dirs, `New-Item -ItemType SymbolicLink` for files
  - Linux: `ln -sf` for all
- For missing plugins: print `! claude plugin install <name>`
- For missing MCPs: print `claude mcp add` commands from `architecture.md`; prompt user for API keys (never auto-fill)
- For stale CLAUDE_PLUGIN_ROOT: print the PowerShell/bash command to update
- For missing scoop packages: `! scoop install jq bc`

After fixing, **re-run failed checks** to confirm they pass.

---

## Phase 3 - Drift Detection

After all expected-state checks are done, detect anything on the machine NOT in the reference.

### Discover live state

Run in parallel:

**Plugins on machine:**
```bash
PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
SETTINGS="$(cygpath -w ~/.claude/settings.json 2>/dev/null || echo ~/.claude/settings.json)"
$PY -c "
import json, sys
d = json.load(open(sys.argv[1]))
for name, enabled in d.get('enabledPlugins', {}).items():
    if enabled: print(name)
" "$SETTINGS"
```

**MCPs on machine:**
```bash
claude mcp list 2>&1
```
Filter out platform-managed servers (e.g. `claude.ai Gmail`, `claude.ai Google Calendar`).

**Synced files on machine:**
```bash
ls -la ~/.claude/ | grep -E '^l|JUNCTION'
```

### Compare and offer

For each item found on machine but not in `architecture.md`:

```
Drift detected:
  + Plugin: co-intelligence@co-intelligence (not in reference)
  + MCP: exa (not in reference)

For each: [accept] [accept all] [skip]
```

- **accept**: Add the item to the appropriate table in `$PLUGIN_DATA/setup/architecture.md`
- **accept all**: Add all remaining drift items
- **skip**: Leave architecture.md unchanged (item stays as undocumented on this machine)

For items in the reference but NOT on the machine: these were already caught in Phase 2 as FAILs.

---

## Known Issues

- **Windows `python3` not found**: Windows has `python`, not `python3`. Always detect with `PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)`.
- **Windows `$HOME` MSYS path breaks Python**: Use `cygpath -w` before passing paths to Python.
- **Windows `ln -s` for dirs**: Git Bash `ln -s` on a directory creates a copy. Use PowerShell `New-Item -ItemType Junction`.
- **Windows SymbolicLink for files**: Requires Developer Mode or admin.
- **`claude mcp add` default scope is `local`**: Always use `-s user` for global MCP servers.
- **Windows Git Bash mangles `/c` arg**: After adding playwright on Windows, verify `~/.claude.json` and fix `"C:/"` to `"/c"` if needed.
