# Check Phase

Subagent instructions for `plugin-update`. Run both steps and return the
structured report. Do not interact with the user.

## Step 0 — Preflight

Verify jq is available:
```bash
command -v jq >/dev/null 2>&1 && echo "OK" || echo "MISSING"
```

If missing, return immediately:
```
SCRIPT_DIR: n/a
INSTALLED: n/a
LATEST: n/a
STATUS: preflight-failed
ERROR: jq not found. Install via scoop/apt/brew.
```

Locate the update script:
```bash
SCRIPT=$(readlink -f ~/.claude/plugins/cache/co-intelligence/co-intelligence/*/skills/plugin-update/update.sh 2>/dev/null | head -1)
echo "${SCRIPT:-MISSING}"
```

Fall back to `~/.claude/scripts/plugin-update.sh` if the glob finds nothing.

If neither path exists, return:
```
SCRIPT_DIR: n/a
INSTALLED: n/a
LATEST: n/a
STATUS: preflight-failed
ERROR: update.sh not found in plugin cache or ~/.claude/scripts/
```

## Step 1 — Run update check

```bash
bash <SCRIPT_DIR>/update.sh <plugin@marketplace>
```

Parse output for `INSTALLED=`, `LATEST=`, `STATUS=`, and `COMMITS=` lines.

## Return Format

Return exactly this block:

```
SCRIPT_DIR: <resolved dirname of update.sh>
INSTALLED: <version>
LATEST: <version>
STATUS: <up-to-date|files-changed|files-current|update-available|not-installed|preflight-failed>
COMMITS: <N or n/a>
ERROR: <message or n/a>
```
