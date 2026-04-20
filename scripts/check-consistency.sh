#!/usr/bin/env bash
# Verify plugin metadata, READMEs, and marketplace.json agree.
# Exits non-zero on any inconsistency. Safe to run any time.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

fail=0
err() { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; fail=1; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$*"; }

adapted_plugins=(caveman superpowers)
version_anchor_re='^[0-9]+\.[0-9]+\.[0-9]+-5tux\.[0-9]+$'

is_adapted() {
    local name="$1" candidate
    for candidate in "${adapted_plugins[@]}"; do [[ "$candidate" == "$name" ]] && return 0; done
    return 1
}

echo "» marketplace.json vs plugins/"
marketplace_json=".claude-plugin/marketplace.json"
[[ -f "$marketplace_json" ]] || { err "missing $marketplace_json"; exit 1; }

mapfile -t listed_plugins < <(jq -r '.plugins[].name' "$marketplace_json")
mapfile -t dir_plugins    < <(find plugins -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort)

for p in "${listed_plugins[@]}"; do
    [[ -d "plugins/$p" ]] || err "marketplace lists '$p' but plugins/$p/ missing"
done
for p in "${dir_plugins[@]}"; do
    printf '%s\n' "${listed_plugins[@]}" | grep -qx "$p" \
        || err "plugins/$p/ exists but not listed in marketplace.json"
done

echo "» per-plugin checks"
for p in "${dir_plugins[@]}"; do
    plugin_dir="plugins/$p"
    plugin_json="$plugin_dir/.claude-plugin/plugin.json"
    plugin_fail_before=$fail

    [[ -f "$plugin_json" ]]          || { err "$p: missing $plugin_json"; continue; }
    [[ -f "$plugin_dir/README.md" ]] || err "$p: missing README.md"
    [[ -f "$plugin_dir/LICENSE" ]]   || err "$p: missing LICENSE"

    name_in_json=$(jq -r '.name' "$plugin_json")
    [[ "$name_in_json" == "$p" ]] || err "$p: plugin.json name='$name_in_json' != dir name"

    version=$(jq -r '.version' "$plugin_json")
    if is_adapted "$p"; then
        [[ "$version" =~ $version_anchor_re ]] \
            || err "$p: version '$version' doesn't match UPSTREAM-5tux.N scheme"
        [[ -f "$plugin_dir/UPSTREAM.md" ]] \
            || err "$p: adapted plugin missing UPSTREAM.md"
    fi

    [[ $fail -eq $plugin_fail_before ]] && ok "$p ($version)"
done

if [[ $fail -ne 0 ]]; then
    printf '\n\033[31mconsistency check failed\033[0m\n' >&2
    exit 1
fi
printf '\n\033[32mall checks passed\033[0m\n'
