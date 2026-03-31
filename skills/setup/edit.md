# Edit Mode

Intent -> reference -> machine. A thin wrapper around apply.

The user states what they want changed. The skill updates `architecture.md` first, then runs apply logic to converge the machine.

---

## Argument Parsing

Everything after `edit` is the intent. Examples:

```
/setup edit add mcp exa
/setup edit remove mcp tavily
/setup edit add plugin superpowers@claude-plugins-official
/setup edit remove plugin superpowers@claude-plugins-official
/setup edit add synced-file hooks junction
/setup edit remove synced-file hooks
/setup edit update ecc-rules
/setup edit update claude-plugin-root
/setup edit add scoop-package jq
```

If no arguments after `edit`, ask the user: "What do you want to change?"

---

## Workflow

### Step 1 - Parse intent

Extract the action (`add`, `remove`, `update`) and the target (category + name).

Supported categories:
- `mcp` - MCP server in Expected MCP Servers table
- `plugin` - plugin in Expected Plugins table
- `synced-file` - entry in Synced Files table (third arg is link type: `symlink` or `junction`)
- `ecc-rules` - refresh ECC rule sets
- `claude-plugin-root` - update CLAUDE_PLUGIN_ROOT env var
- `scoop-package` - Windows scoop dependency

If the intent is ambiguous, ask for clarification before proceeding.

### Step 2 - Read current state

Read `$PLUGIN_DATA/setup/architecture.md` to understand the current baseline.

### Step 3 - Update architecture.md

Modify the appropriate table/section in `architecture.md`:

**add mcp `<name>`:**
- Add row to Expected MCP Servers table: `| <name> | <transport> | <needs key?> |`
- Add install command to MCP add commands section
- Ask user for transport type (http/stdio) and whether it needs an API key
- Use `YOUR_KEY` placeholder, never store real keys

**remove mcp `<name>`:**
- Remove row from Expected MCP Servers table
- Remove install command from MCP add commands section

**add plugin `<name>`:**
- Add row to Expected Plugins table

**remove plugin `<name>`:**
- Remove row from Expected Plugins table

**add synced-file `<name>` `<type>`:**
- Add row to Synced Files table with link type

**remove synced-file `<name>`:**
- Remove row from Synced Files table

**update ecc-rules:**
- No architecture.md change needed (rule sets list stays the same)

**update claude-plugin-root:**
- No architecture.md change needed (just needs re-pointing to latest version)

Show the diff of changes to architecture.md. Ask: "Apply this change? (y/n)"

### Step 4 - Run apply

After architecture.md is updated, run the apply logic (see `apply.md`). The newly added item will show as FAIL (not yet on machine), and the fix flow will install/configure it.

### Step 5 - Confirm

Show summary of what changed:
```
Updated architecture.md:
  + Added MCP server: exa (http, needs API key)

Applied to machine:
  + Configured MCP: exa
```

---

## Rules

- Always update architecture.md BEFORE touching the machine
- Never store API keys in architecture.md - use `YOUR_KEY` placeholders
- For removals: remove from machine first (if applicable), then update architecture.md
- If the user's intent would break the setup (e.g. removing a required plugin), warn and confirm
