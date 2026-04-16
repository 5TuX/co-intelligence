# Create Protocol

Package local skills into a Claude Code plugin with dual-registration autocomplete.

## 1. Validate inputs

- Parse `<plugin-name>` (first arg after `create`) and `<skills>` (comma-separated
  or space-separated remaining args).
- For each skill, verify `~/.claude/skills/<skill>/SKILL.md` exists. List missing
  ones and stop if any are missing.
- Check target directory `~/.claude/plugins/marketplaces/<plugin-name>/` does not
  already exist. If it does, warn and ask: "Plugin directory exists. Add skills to
  existing plugin, or abort?"

## 2. Scaffold plugin structure

```
~/.claude/plugins/marketplaces/<plugin-name>/
  .claude-plugin/
    plugin.json
  skills/
    <skill1>/          (copied from ~/.claude/skills/<skill1>/)
    <skill2>/          (copied from ~/.claude/skills/<skill2>/)
  commands/
    <skill1>.md        (auto-generated shim)
    <skill2>.md        (auto-generated shim)
```

## 3. Generate plugin.json

```json
{
  "name": "<plugin-name>",
  "description": "<ask user for a one-line description>",
  "version": "0.1.0",
  "author": { "name": "<from git config>" },
  "license": "MIT",
  "skills": ["./skills/"],
  "commands": ["./commands/"]
}
```

## 4. Copy skills

Copy each `~/.claude/skills/<skill>/` to `<plugin>/skills/<skill>/`.
Verify each SKILL.md has valid frontmatter (`name`, `description`).

## 5. Generate command shims (dual registration)

For each skill, read its SKILL.md frontmatter and create `commands/<skill>.md`:
```
---
description: <shortened description, under 200 chars>
argument-hint: <skill's argument syntax, e.g. "<name> [options]" — this is the only place it's defined>
---

Invoke the `<plugin-name>:<skill>` skill with $ARGUMENTS.
```

**Key rule:** command shims must NOT have a `name` field. This gives them the
plugin namespace prefix in autocomplete (knowledge.md pitfall #14-15).

## 6. Confirm and finalize

Show the generated structure as a tree. Ask: "Plugin scaffolded. Next steps?"

Offer:
- **Install locally**: copy to cache directory for immediate testing
- **Init git repo**: `git init` in the plugin directory
- **Remove originals**: delete local skills from `~/.claude/skills/` (ask first)
- **Skip**: leave as-is

## 7. Record

- Append entry to `$PLUGIN_DATA/skillsmith/history/pluginify.md`
- Update knowledge.md per-skill notes if relevant
