#!/usr/bin/env bash
# plugin-publish.sh - Show uncommitted changes in a plugin's marketplace repo.
# Usage: plugin-publish.sh <plugin-name>
# Example: plugin-publish.sh co-intelligence

set -euo pipefail

PLUGIN="${1:?Usage: plugin-publish.sh <plugin-name>}"

MARKETPLACE="$HOME/.claude/plugins/marketplaces/$PLUGIN"

if [ ! -d "$MARKETPLACE/.git" ]; then
    echo "ERROR: $MARKETPLACE is not a git repo"
    exit 1
fi

# Show what changed
cd "$MARKETPLACE"
echo ""
echo "=== Changes ==="
git diff --stat
git status --short

# Check if there's anything to commit
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
    echo ""
    echo "Nothing to publish - $PLUGIN marketplace is up to date."
    exit 0
fi
