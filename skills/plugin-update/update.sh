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

# Subcommand: apply-update — rename cache folder and patch installed_plugins.json
if [ "${2:-}" = "apply-update" ]; then
    PLUGIN_NAME="${KEY%%@*}"
    CACHE_BASE="$HOME/.claude/plugins/cache/$MARKETPLACE_NAME/$PLUGIN_NAME"
    OLD_DIR="$CACHE_BASE/$INSTALLED"
    NEW_DIR="$CACHE_BASE/$LATEST"
    NEW_SHA=$(git -C "$MARKETPLACE_DIR" rev-parse HEAD)

    if [ ! -d "$OLD_DIR" ]; then
        echo "ERROR: cache dir $OLD_DIR not found"
        exit 1
    fi

    # Sync marketplace files into cache
    rsync -a --delete --exclude .git "$MARKETPLACE_DIR/" "$OLD_DIR/"

    # Rename cache folder
    if [ "$OLD_DIR" != "$NEW_DIR" ]; then
        mv "$OLD_DIR" "$NEW_DIR"
        echo "RENAMED=$OLD_DIR -> $NEW_DIR"
    fi

    # Clean up any orphaned version directories
    for dir in "$CACHE_BASE"/*/; do
        [ -d "$dir" ] || continue
        [ "$dir" = "$NEW_DIR/" ] && continue
        rm -rf "$dir"
        echo "CLEANED=${dir%/}"
    done

    # Patch installed_plugins.json
    jq --arg key "$KEY" \
       --arg ver "$LATEST" \
       --arg path "$NEW_DIR" \
       --arg sha "$NEW_SHA" \
       --arg now "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" \
       '.plugins[$key][0].version = $ver
        | .plugins[$key][0].installPath = $path
        | .plugins[$key][0].lastUpdated = $now
        | .plugins[$key][0].gitCommitSha = $sha' \
       "$PLUGINS_FILE" > "$PLUGINS_FILE.tmp" && mv "$PLUGINS_FILE.tmp" "$PLUGINS_FILE"

    echo "PATCHED=installed_plugins.json"
    echo "VERSION=$LATEST"
    echo "SHA=$NEW_SHA"
fi
