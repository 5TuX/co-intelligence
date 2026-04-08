---
name: plugin
description: >
  Plugin lifecycle management: create, publish, update. Use when the user
  wants to package local skills into a plugin, push plugin changes to GitHub,
  or pull the latest version of an installed plugin. Triggers on: "publish
  plugin", "update plugin", "create plugin", "pluginify", "push my plugin",
  "check for updates", "plugin publish", "plugin update", "plugin create".
argument-hint: "create <name> <skills> | publish [<name>] [-y] | update [<plugin@marketplace>]"
---

# Plugin Lifecycle

Manage Claude Code plugins: create from local skills, publish to GitHub,
pull updates.

## Signature

```
plugin -- <mode>
  Mode: <create|publish|update>
  Target: <name or "pending">

  Modes: create <name> <skills> | publish [name] | update [plugin@marketplace]
```

## Argument Parsing

| Pattern | Mode |
|---------|------|
| `create <name> <skills>` | Package local skills into a new plugin |
| `publish [<name>] [-y]` | Push plugin changes to GitHub (default: co-intelligence). `-y` skips confirmation. |
| `update [<plugin@marketplace>]` | Pull latest version (default: co-intelligence) |
| (no args) | Ask which mode |

---

## Mode: create

Package local skills into a Claude Code plugin with dual-registration
autocomplete. Read `references/create-protocol.md` for the full protocol.

**Summary:**
1. Validate: check each skill exists in `~/.claude/skills/`
2. Scaffold: create `marketplaces/<name>/` with `.claude-plugin/`, `skills/`, `commands/`
3. Generate `plugin.json` (ask user for description)
4. Copy skills, verify frontmatter
5. Generate command shims (NO `name` field - pitfall #14-15 from knowledge.md)
6. Confirm and offer: install locally, init git, remove originals

---

## Mode: publish

Publish local changes to a plugin's GitHub repo.

### 1. Dispatch check subagent

Read `check-publish.md`. Dispatch a subagent with those instructions,
passing `<plugin-name>` as target. Wait for the structured report.

### 2. Present decision

- **STATUS=preflight-failed**: Show error. Stop.
- **STATUS=no-changes**: "Nothing to publish." Done.
- **STATUS=changes-ready**: Show full diff and a drafted commit message.
  If `-y` flag: skip confirmation, proceed directly to step 3.
  Otherwise ask: **"Publish? (y/n)"** - this is the ONLY confirmation gate.

### 3. Automated pipeline (after user says yes)

If user confirms, run steps 3a-3d without further prompts:

**3a. Commit**
```bash
cd ~/.claude/plugins/marketplaces/<name>
git add -A
git commit -m "<message>"
```

**3b. Version bump**
Increment patch in `.claude-plugin/plugin.json`, commit separately.

**3c. Push**
```bash
cd ~/.claude/plugins/marketplaces/<name>
git push origin main
```

**3d. Report**
Print: "Published <name> v<new_version>. Run `/reload-plugins` to activate."

**Rules:** Always show diff before the single confirmation. Never force-push.
One yes = commit + bump + push. No intermediate prompts.

---

## Mode: update

Pull the latest version of any marketplace plugin.

### 1. Dispatch check subagent

Read `check-update.md`. Dispatch a subagent with those instructions,
passing `<plugin@marketplace>` as target. Wait for the structured report.

### 2. Present decision

- **STATUS=preflight-failed**: Show error. Stop.
- **STATUS=not-installed**: "Plugin not found. Install first." Stop.
- **STATUS=up-to-date**: "Already at latest. No action needed." Done.
- **STATUS=files-changed**: "Version unchanged but N new commits pulled. Sync cache? (y/n)"
- **STATUS=files-current**: "Files match latest but registry lags. Sync registry? (y/n)"
- **STATUS=update-available**: "Update available: vOLD -> vNEW. Install? (y/n)"

Always wait for user confirmation.

### 3. Apply

```bash
bash <SCRIPT_DIR>/update.sh <plugin@marketplace> apply-update
```

### 4. Post-install

"Updated to vX.Y.Z. Please run `/reload-plugins` to activate."

**Rules:** Always show version comparison. Never force-install. If preflight
fails, do not offer skip options.

## Self-Refinement

This skill participates in the co-intelligence feedback loop. After completing
a task, if friction was observed (user corrections, workarounds, missing modes,
suboptimal output), suggest: "Want me to `/skillsmith plugin` to refine this?"
and log the observation to `$PLUGIN_DATA/friction.md`. See
`references/self-refinement.md` for the full protocol.
