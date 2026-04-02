# Check Phase - Publish

Subagent instructions for `plugin publish`. Run both steps and return the
structured report. Do not interact with the user.

## Step 0 - Preflight

Locate the publish script. Try these paths in order:
1. Skill directory: find this skill's directory via cache or marketplace, look for `publish.sh`
2. Marketplace: `~/.claude/plugins/marketplaces/co-intelligence/skills/plugin/publish.sh`
3. Fallback: `~/.claude/scripts/plugin-publish.sh`

```bash
# Try marketplace first
SCRIPT="$HOME/.claude/plugins/marketplaces/co-intelligence/skills/plugin/publish.sh"
[ -f "$SCRIPT" ] || SCRIPT=$(find "$HOME/.claude/plugins/cache" -path "*/skills/plugin/publish.sh" 2>/dev/null | head -1)
[ -f "$SCRIPT" ] || SCRIPT="$HOME/.claude/scripts/plugin-publish.sh"
[ -f "$SCRIPT" ] && echo "OK: $SCRIPT" || echo "MISSING"
```

If missing, return immediately:
```
SCRIPT: n/a
STATUS: preflight-failed
DIFF: n/a
ERROR: publish.sh not found
```

## Step 1 - Check for changes

```bash
bash <SCRIPT> <plugin-name>
```

Capture all output (the diff). If exit non-zero, include stderr in ERROR field.
If output indicates no file changes (empty diff or "nothing to publish"),
set STATUS=no-changes. Otherwise set STATUS=changes-ready.

## Return Format

```
SCRIPT: <resolved path>
STATUS: <preflight-failed|no-changes|changes-ready>
DIFF: <diff output, or n/a>
ERROR: <message or n/a>
```
