# Check Phase - Update

Subagent instructions for `plugin update`. Run both steps and return the
structured report. Do not interact with the user.

## Step 0 - Preflight

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

Locate the update script. Try these paths in order:
1. Marketplace: `~/.claude/plugins/marketplaces/co-intelligence/skills/plugin/update.sh`
2. Cache: `~/.claude/plugins/cache/co-intelligence/co-intelligence/*/skills/plugin/update.sh`
3. Legacy cache: `~/.claude/plugins/cache/co-intelligence/co-intelligence/*/skills/plugin-update/update.sh`
4. Fallback: `~/.claude/scripts/plugin-update.sh`

If none found, return:
```
SCRIPT_DIR: n/a
INSTALLED: n/a
LATEST: n/a
STATUS: preflight-failed
ERROR: update.sh not found
```

## Step 1 - Run update check

```bash
bash <SCRIPT_PATH> <plugin@marketplace>
```

Parse output for `INSTALLED=`, `LATEST=`, `STATUS=`, and `COMMITS=` lines.

## Return Format

```
SCRIPT_DIR: <resolved dirname of update.sh>
INSTALLED: <version>
LATEST: <version>
STATUS: <up-to-date|files-changed|files-current|update-available|not-installed|preflight-failed>
COMMITS: <N or n/a>
ERROR: <message or n/a>
```
