#!/usr/bin/env bash
# plugin-update.sh - Pull latest marketplace and compare versions.
# Usage: plugin-update.sh <plugin@marketplace>
# Usage: plugin-update.sh              (list all installed plugins)
# Example: plugin-update.sh co-intelligence@co-intelligence

set -euo pipefail

PLUGINS_FILE="$HOME/.claude/plugins/installed_plugins.json"
MARKETPLACES="$HOME/.claude/plugins/marketplaces"

# No argument: list installed plugins with versions
if [ -z "${1:-}" ]; then
    echo "=== Installed plugins ==="
    jq -r '.plugins | to_entries[] | "\(.key)  v\(.value[0].version)"' "$PLUGINS_FILE"
    exit 0
fi

KEY="$1"

# Validate key format (plugin@marketplace)
if [[ "$KEY" != *@* ]]; then
    echo "ERROR: expected format <plugin>@<marketplace>, got: $KEY"
    echo "Installed plugins:"
    jq -r '.plugins | keys[]' "$PLUGINS_FILE"
    exit 1
fi

MARKETPLACE_NAME="${KEY#*@}"
MARKETPLACE_DIR="$MARKETPLACES/$MARKETPLACE_NAME"

# Validate marketplace exists
if [ ! -d "$MARKETPLACE_DIR/.git" ]; then
    echo "ERROR: $MARKETPLACE_DIR is not a git repo"
    exit 1
fi

# Read installed version
INSTALLED=$(jq -r --arg key "$KEY" '.plugins[$key][0].version // empty' "$PLUGINS_FILE")
if [ -z "$INSTALLED" ]; then
    echo "STATUS=not-installed"
    echo "ERROR: $KEY not found in installed_plugins.json"
    exit 1
fi

# State file to persist BEFORE_HASH across check/apply invocations
STATE_FILE="/tmp/plugin-update-${MARKETPLACE_NAME}.hash"

# Pull latest from remote
echo "Pulling $MARKETPLACE_NAME marketplace..."
BEFORE_HASH=$(git -C "$MARKETPLACE_DIR" rev-parse HEAD)
git -C "$MARKETPLACE_DIR" pull origin main 2>&1
AFTER_HASH=$(git -C "$MARKETPLACE_DIR" rev-parse HEAD)

# Count new commits pulled
COMMITS_PULLED=0
if [ "$BEFORE_HASH" != "$AFTER_HASH" ]; then
    COMMITS_PULLED=$(git -C "$MARKETPLACE_DIR" rev-list --count "${BEFORE_HASH}..${AFTER_HASH}")
    echo "$BEFORE_HASH" > "$STATE_FILE"
fi

# Read latest version from marketplace
LATEST=$(jq -r '.plugins[0].version' "$MARKETPLACE_DIR/.claude-plugin/marketplace.json")
if [ -z "$LATEST" ]; then
    echo "ERROR: could not read version from marketplace.json"
    exit 1
fi

PLUGIN_NAME="${KEY%%@*}"
CACHE_BASE="$HOME/.claude/plugins/cache/$MARKETPLACE_NAME/$PLUGIN_NAME"

# Check actual file state in cache - may be ahead of registry
CACHE_FILE_VER=""
for dir in "$CACHE_BASE"/*/; do
    [ -d "$dir" ] || continue
    v=$(jq -r '.plugins[0].version // empty' "$dir/.claude-plugin/marketplace.json" 2>/dev/null || echo "")
    [ -n "$v" ] && CACHE_FILE_VER="$v" && break
done

echo ""
echo "INSTALLED=$INSTALLED"
echo "LATEST=$LATEST"

if [ "$INSTALLED" = "$LATEST" ]; then
    if [ "$COMMITS_PULLED" -gt 0 ]; then
        echo "COMMITS_PULLED=$COMMITS_PULLED"
        echo "STATUS=files-changed"
    else
        echo "STATUS=up-to-date"
    fi
elif [ -n "$CACHE_FILE_VER" ] && [ "$CACHE_FILE_VER" = "$LATEST" ]; then
    # Files already match upstream but registry lags
    echo "CACHE_VERSION=$CACHE_FILE_VER"
    echo "STATUS=files-current"
else
    echo "STATUS=update-available"
fi

# Subcommand: apply-update - sync marketplace files into all cache directories
if [ "${2:-}" = "apply-update" ]; then
    # Restore before hash for change summary (saved during check phase)
    SUMMARY_FROM=""
    if [ -f "$STATE_FILE" ]; then
        SUMMARY_FROM=$(cat "$STATE_FILE")
        rm -f "$STATE_FILE"
    fi

    # Sync into every version directory (Claude Code may recreate them)
    SYNCED=0
    for dir in "$CACHE_BASE"/*/; do
        [ -d "$dir" ] || continue
        # Clean target (excluding .git), then copy fresh from marketplace
        find "$dir" -mindepth 1 -not -path '*/.git/*' -not -name '.git' -delete 2>/dev/null || true
        ( cd "$MARKETPLACE_DIR" && find . -not -path './.git/*' -not -name '.git' -not -path './.git' -not -path '.' | while IFS= read -r f; do
            if [ -d "$f" ]; then
                mkdir -p "$dir/$f"
            else
                cp "$f" "$dir/$f"
            fi
        done )
        echo "SYNCED=$dir"
        SYNCED=$((SYNCED + 1))
    done

    if [ "$SYNCED" -eq 0 ]; then
        echo "ERROR: no cache directories found in $CACHE_BASE"
        exit 1
    fi

    echo "DONE=synced $SYNCED cache dir(s)"

    # Update registry to reflect new version
    UPDATED_JSON=$(jq --arg key "$KEY" --arg ver "$LATEST" \
        '.plugins[$key][0].version = $ver' "$PLUGINS_FILE")
    echo "$UPDATED_JSON" > "$PLUGINS_FILE.tmp" && mv "$PLUGINS_FILE.tmp" "$PLUGINS_FILE"
    echo "REGISTRY_UPDATED=$LATEST"

    # Print change summary
    SUMMARY_TO=$(git -C "$MARKETPLACE_DIR" rev-parse HEAD)
    if [ -n "$SUMMARY_FROM" ] && [ "$SUMMARY_FROM" != "$SUMMARY_TO" ]; then
        echo ""
        echo "=== Changes ==="
        git -C "$MARKETPLACE_DIR" log --oneline "${SUMMARY_FROM}..${SUMMARY_TO}"
        echo ""
        git -C "$MARKETPLACE_DIR" diff --stat "$SUMMARY_FROM" "$SUMMARY_TO"
    fi
fi
