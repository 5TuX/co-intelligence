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

# Pull latest from remote
echo "Pulling $MARKETPLACE_NAME marketplace..."
git -C "$MARKETPLACE_DIR" pull origin main 2>&1

# Read latest version from marketplace
LATEST=$(jq -r '.plugins[0].version' "$MARKETPLACE_DIR/.claude-plugin/marketplace.json")
if [ -z "$LATEST" ]; then
    echo "ERROR: could not read version from marketplace.json"
    exit 1
fi

echo ""
echo "INSTALLED=$INSTALLED"
echo "LATEST=$LATEST"

if [ "$INSTALLED" = "$LATEST" ]; then
    echo "STATUS=up-to-date"
else
    echo "STATUS=update-available"
fi

# Subcommand: apply-update — sync marketplace files into all cache directories
if [ "${2:-}" = "apply-update" ]; then
    PLUGIN_NAME="${KEY%%@*}"
    CACHE_BASE="$HOME/.claude/plugins/cache/$MARKETPLACE_NAME/$PLUGIN_NAME"

    # Sync into every version directory (Claude Code may recreate them)
    SYNCED=0
    for dir in "$CACHE_BASE"/*/; do
        [ -d "$dir" ] || continue
        rsync -a --delete --exclude .git "$MARKETPLACE_DIR/" "$dir"
        echo "SYNCED=$dir"
        SYNCED=$((SYNCED + 1))
    done

    if [ "$SYNCED" -eq 0 ]; then
        echo "ERROR: no cache directories found in $CACHE_BASE"
        exit 1
    fi

    echo "DONE=synced $SYNCED cache dir(s)"
fi
