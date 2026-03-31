---
name: plugin-update
description: Use when the user wants to update an installed Claude Code plugin to the latest version from its marketplace. Works around the known stale marketplace cache bug (issues #33253, #16866, #38271) where `claude plugin update` fails to detect new versions. Works for any marketplace plugin, not just co-intelligence.
argument-hint: "[plugin@marketplace] (default: co-intelligence)"
effort: low
---

# Plugin Update

Pull the latest version of any marketplace plugin. This is a generic workaround
for Claude Code's stale marketplace cache bug, where `claude plugin update`
never runs `git pull` and always reports "already at latest."

Works for co-intelligence and any other community plugin distributed via a
git-based marketplace.

## Signature

After parsing, print:
```
plugin-update
  Plugin: <key or "list">
  Installed: <version or "n/a">
  Latest: <version or "pending">

  Usage: <plugin@marketplace> | (no args = list installed)
```

## Argument Parsing

- No argument -> update co-intelligence (`co-intelligence@co-intelligence`)
- `<plugin@marketplace>` -> update that specific plugin
- `<name>` (no @) -> try to infer the full key from installed_plugins.json. If ambiguous, show matches and ask.
- `list` -> list all installed plugins with versions

## Workflow

### 0. Preflight

Verify jq is available:
```bash
command -v jq >/dev/null || echo "MISSING: jq (install via scoop/apt/brew)"
```
If missing, tell the user and stop.

Locate the update script bundled with this skill:
```bash
SCRIPT_DIR="$(dirname "$(readlink -f ~/.claude/plugins/cache/co-intelligence/co-intelligence/*/skills/plugin-update/update.sh 2>/dev/null | head -1)")"
```
If the script is not found, it may also be at `~/.claude/scripts/plugin-update.sh`.

### 1. Run update check

```bash
bash <script-path>/update.sh <plugin@marketplace>
```

Parse the output for `INSTALLED=`, `LATEST=`, and `STATUS=` lines.

### 2. Present decision

- **STATUS=up-to-date**: "Already at v<version>. No action needed."
- **STATUS=files-current**: "Files already match v<latest> but registry still shows v<installed>. Fixing registry..." then immediately run `apply-update` to sync the registry (no confirmation needed since no files are changing).
- **STATUS=update-available**: "Update available: v<installed> -> v<latest>. Install? (y/n)"
- **STATUS=not-installed**: "Plugin not found in installed plugins. Use `claude plugin install <key>` first."

### 3. Apply update

If user approves:
```bash
bash <script-path>/update.sh <plugin@marketplace> apply-update
```

This syncs files from the marketplace into all cache version directories.
Claude Code owns the directory names and registry; we just update the
files inside.

### 4. Post-install

After a successful apply, tell the user:
"Updated to v<latest>. Please run `/reload-plugins` to activate in this session."

Wait for the user to confirm they ran it, then confirm: "Reloaded. You're on v<latest>."

Note: `/reload-plugins` is a built-in CLI command that only the user can run
from the prompt. The model cannot execute it programmatically.

## Rules

- Always show the version comparison before installing
- Never force-install without user approval
- If git pull fails (network, auth), show the error and stop
- This skill can update ANY marketplace plugin, including co-intelligence itself
