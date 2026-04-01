---
name: plugin-update
description: Use when the user wants to update, upgrade, or check for a newer version of an installed Claude Code plugin. Also use when the user says "update co-intelligence", "check for plugin updates", or "is there a new version". Works around the known stale marketplace cache bug (issues #33253, #16866, #38271) where `claude plugin update` fails to detect new versions. Works for any marketplace plugin, not just co-intelligence.
argument-hint: "[plugin@marketplace] (default: co-intelligence)"
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

### 1. Dispatch check subagent

Read `check.md` from this skill's directory. Dispatch a subagent with those
instructions, passing `<plugin@marketplace>` as the target.

Wait for the subagent's structured report before continuing.

### 2. Present decision

Using the subagent's report:

- **STATUS=preflight-failed**: Show the error and stop. Do not attempt apply.
- **STATUS=not-installed**: "Plugin not found. Use `claude plugin install <key>` first." Stop.
- **STATUS=up-to-date**: "Already at v<version>. No action needed." Done.
- **STATUS=files-changed**: "Version unchanged at v<version> but <N> new commits were pulled. Sync cache? (y/n)"
- **STATUS=files-current**: "Files already match v<latest> but registry still shows v<installed>. Sync registry? (y/n)"
- **STATUS=update-available**: "Update available: v<installed> -> v<latest>. Install? (y/n)"

Always wait for user confirmation before applying.

### 3. Apply update

If user approves:
```bash
bash <SCRIPT_DIR>/update.sh <plugin@marketplace> apply-update
```

`<SCRIPT_DIR>` comes from the subagent's report.

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
- If preflight fails, do not offer force or skip options — the user must fix the underlying issue before retrying
- This skill can update ANY marketplace plugin, including co-intelligence itself
