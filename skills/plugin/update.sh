#!/usr/bin/env bash
# plugin-update.sh - Check and apply plugin updates.
# Reads latest version from GitHub API directly, detects code changes via commits.
# Usage: plugin-update.sh <plugin@marketplace>
# Usage: plugin-update.sh <plugin@marketplace> apply-update
# Usage: plugin-update.sh              (list all installed plugins)

set -euo pipefail

PLUGINS_FILE="$HOME/.claude/plugins/installed_plugins.json"
MARKETPLACES="$HOME/.claude/plugins/marketplaces"

PY=$(command -v python3 2>/dev/null || command -v python 2>/dev/null || echo "")

# Read version from a GitHub repo file via API + base64 decode
# Args: <owner/repo> <file_path> <python_extract_expression>
gh_read_version() {
    local repo="$1" path="$2" expr="$3"
    [ -z "$PY" ] && return 1
    command -v gh >/dev/null 2>&1 || return 1
    local content
    content=$(gh api "repos/$repo/contents/$path" --jq '.content' 2>/dev/null) || return 1
    [ -z "$content" ] && return 1
    echo "$content" | $PY -c "$expr" 2>/dev/null | tr -d '\r'
}

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

# State file to persist LOCAL_HEAD across check/apply invocations
STATE_FILE="/tmp/plugin-update-${MARKETPLACE_NAME}.hash"

# Record local HEAD before any network operations
LOCAL_HEAD=$(git -C "$MARKETPLACE_DIR" rev-parse HEAD)

# --- Read latest version from GitHub API (not local clone) ---
REMOTE_URL=$(git -C "$MARKETPLACE_DIR" remote get-url origin 2>/dev/null || echo "")
OWNER_REPO=$(echo "$REMOTE_URL" | sed -E 's|.*github\.com[:/]([^/]+/[^/.]+)(\.git)?$|\1|')

LATEST=""
if [ -n "$OWNER_REPO" ] && [ -n "$PY" ] && command -v gh >/dev/null 2>&1; then
    # plugin.json is authoritative for version
    LATEST=$(gh_read_version "$OWNER_REPO" ".claude-plugin/plugin.json" "
import sys,json,base64
try:
    d=json.loads(base64.b64decode(sys.stdin.read().strip()))
    v=d.get('version','')
    if v: print(v)
except: pass
") || true
    # Fallback to marketplace.json
    if [ -z "$LATEST" ]; then
        LATEST=$(gh_read_version "$OWNER_REPO" ".claude-plugin/marketplace.json" "
import sys,json,base64
try:
    d=json.loads(base64.b64decode(sys.stdin.read().strip()))
    v=d.get('plugins',[{}])[0].get('version','')
    if v: print(v)
except: pass
") || true
    fi
fi

# Last resort: read from local clone (plugin.json is authoritative, same as API path)
if [ -z "$LATEST" ]; then
    LATEST=$(jq -r '.version' "$MARKETPLACE_DIR/.claude-plugin/plugin.json" 2>/dev/null | tr -d '\r')
fi
if [ -z "$LATEST" ]; then
    LATEST=$(jq -r '.plugins[0].version' "$MARKETPLACE_DIR/.claude-plugin/marketplace.json" 2>/dev/null | tr -d '\r')
fi

if [ -z "$LATEST" ]; then
    echo "ERROR: could not determine latest version"
    exit 1
fi

# --- Detect code changes via commit comparison ---
git -C "$MARKETPLACE_DIR" fetch origin main >/dev/null 2>&1 || true
REMOTE_HEAD=$(git -C "$MARKETPLACE_DIR" rev-parse origin/main 2>/dev/null || echo "")

COMMITS_BEHIND=0
CHANGES_SUMMARY=""
if [ -n "$REMOTE_HEAD" ] && [ "$LOCAL_HEAD" != "$REMOTE_HEAD" ]; then
    COMMITS_BEHIND=$(git -C "$MARKETPLACE_DIR" rev-list --count "HEAD..origin/main" 2>/dev/null || echo 0)
    if [ "$COMMITS_BEHIND" -gt 0 ]; then
        # `|| true` swallows SIGPIPE (141) when git has >20 commits and head -20
        # closes the pipe early — set -o pipefail would otherwise kill the script.
        CHANGES_SUMMARY=$(git -C "$MARKETPLACE_DIR" log --oneline "HEAD..origin/main" 2>/dev/null | head -20 || true)
        echo "$LOCAL_HEAD" > "$STATE_FILE"
    fi
fi

PLUGIN_NAME="${KEY%%@*}"
CACHE_BASE="$HOME/.claude/plugins/cache/$MARKETPLACE_NAME/$PLUGIN_NAME"

# --- Detect marketplace -> cache drift (catches no-version-bump publishes) ---
CACHE_DIRTY=0
if [ "$COMMITS_BEHIND" -eq 0 ]; then
    CACHE_SAMPLE=""
    for dir in "$CACHE_BASE"/*/; do
        [ -d "$dir" ] && CACHE_SAMPLE="$dir" && break
    done
    if [ -n "$CACHE_SAMPLE" ]; then
        CACHE_DIFF=$(diff -rq --exclude='.git' "$MARKETPLACE_DIR" "$CACHE_SAMPLE" 2>/dev/null || true)
        if [ -n "$CACHE_DIFF" ]; then
            CACHE_DIRTY=1
        fi
    fi
fi

# --- Output ---
echo ""
echo "INSTALLED=$INSTALLED"
echo "LATEST=$LATEST"
echo "COMMITS_BEHIND=$COMMITS_BEHIND"

if [ "$INSTALLED" != "$LATEST" ]; then
    echo "STATUS=update-available"
elif [ "$COMMITS_BEHIND" -gt 0 ]; then
    echo "STATUS=files-changed"
elif [ "$CACHE_DIRTY" -eq 1 ]; then
    echo "STATUS=cache-stale"
else
    echo "STATUS=up-to-date"
fi

if [ -n "$CHANGES_SUMMARY" ]; then
    echo "CHANGES_START"
    echo "$CHANGES_SUMMARY"
    echo "CHANGES_END"
fi

# Subcommand: apply-update - sync marketplace files into all cache directories
if [ "${2:-}" = "apply-update" ]; then
    # Restore before hash for change summary (saved during check phase)
    SUMMARY_FROM=""
    if [ -f "$STATE_FILE" ]; then
        SUMMARY_FROM=$(cat "$STATE_FILE")
        rm -f "$STATE_FILE"
    fi

    # Merge fetched changes into working directory (fetch already happened in check phase)
    git -C "$MARKETPLACE_DIR" merge origin/main --ff-only 2>&1 || \
        git -C "$MARKETPLACE_DIR" pull origin main 2>&1

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

    # Hint to clean old cache versions if more than 3 exist
    CACHE_COUNT=0
    CACHE_OLD=""
    for dir in "$CACHE_BASE"/*/; do
        [ -d "$dir" ] || continue
        CACHE_COUNT=$((CACHE_COUNT + 1))
        ver=$(basename "$dir")
        if [ "$ver" != "$LATEST" ]; then
            CACHE_OLD="${CACHE_OLD}${ver} "
        fi
    done
    if [ "$CACHE_COUNT" -gt 3 ]; then
        echo "CACHE_CLEANUP_HINT=$((CACHE_COUNT - 1)) old versions: ${CACHE_OLD% }"
    fi
fi
