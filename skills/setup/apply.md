# Apply Mode

Reference -> machine. Read `architecture.md` expected state, compare to machine, fix discrepancies, detect drift.

---

## Phase 1 - Check

Read `$PLUGIN_DATA/setup/architecture.md` to get the expected state tables. Run each check below as a **separate, independent Bash call** so one failure does not cancel others. Run independent checks in parallel where possible.

### Environment detection

1. **Detect OS**: `uname -s` - use result to select Windows vs Linux commands throughout.
2. **Detect Python**: `PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)`
3. **Read config**: Read `$PLUGIN_DATA/config.local.yaml` for `admin_user`, `data_dir`, and optionally `drive_root`.

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

### Check: Career dir

Use `data_dir` and `admin_user` from `config.local.yaml`:
```bash
ls DATA_DIR/ADMIN_USER/*.md DATA_DIR/ADMIN_USER/Topics/ 2>&1 || echo "FAIL: career dir missing"
```

---

## Phase 2 - Report and Fix

**Report results** as a table:

```
Check                  Status    Detail
-----                  ------    ------
config.local.yaml      PASS
Career dir             PASS
Plugin: <name>         PASS
Plugin: <name>         MISSING
MCP: <name>            PASS
MCP: <name>            MISSING
...
```

For each FAIL or MISSING, **offer to fix**:
- Print the fix command with `!` prefix so user can paste directly
- Ask before executing: "Fix this? (y/n)"
- For missing plugins: print `! claude plugin install <name>`
- For missing MCPs: print `claude mcp add` commands from `architecture.md`; prompt user for API keys (never auto-fill)
- For missing career dir: print mkdir command

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
