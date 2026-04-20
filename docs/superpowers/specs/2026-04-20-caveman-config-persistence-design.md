# Caveman Plugin — Persistent Cross-Platform Config

**Status:** approved (brainstorming) — awaiting implementation plan
**Date:** 2026-04-20
**Plugin:** `plugins/caveman/` (marketplace version `1.6.0-5tux.1`)

## Problem

The caveman plugin currently hardcodes its default intensity level (`ultra`) and reminder text in `SessionStart` and `UserPromptSubmit` hook strings inside `plugin.json`. This has three consequences:

1. Users cannot change the default level without editing the plugin's manifest (lost on plugin update).
2. There is no persistent off-switch — users who want caveman disabled must either uninstall the plugin or rely on agent discipline per session.
3. Any future setting (e.g., toggling the per-turn reminder) requires another manifest edit.

## Goals

- Move plugin behavior (`defaultLevel`, `remindEveryTurn`, `off`) into a config file.
- Persist user settings across plugin updates on Linux, macOS, and Windows.
- Ship sensible defaults in-plugin, let the user override without touching the plugin directory.
- Provide a reliable permanent-off mechanism that survives sessions and updates.
- Keep session-only "stop caveman" behavior as agent-discipline (no file writes for transient off).

## Non-goals

- Persistent per-session intensity memory (current-session `/caveman lite` stays session-only).
- Per-project config (single user-scoped config across all projects).
- Migration of existing users' settings (this is the first config — plugin installs inherit defaults).

## Architecture

```
$CLAUDE_PLUGIN_ROOT (= ~/.claude/plugins/cache/<marketplace>/caveman/ or platform equivalent)
├── .claude-plugin/plugin.json      hooks invoke node scripts/hook-*.js
├── config.default.json             shipped defaults (version-controlled)
├── scripts/
│   ├── caveman-config.js           shared lib: path resolution, read+merge, atomic write
│   ├── hook-session-start.js       SessionStart handler
│   ├── hook-user-prompt.js         UserPromptSubmit handler
│   └── set-config.js               CLI used by agent to write user config
└── tests/                          node:test unit tests

User config (persistent, cross-update):
- Linux/macOS: $XDG_CONFIG_HOME/caveman/config.json  (fallback ~/.config/caveman/config.json)
- Windows:     %APPDATA%\caveman\config.json         (fallback %USERPROFILE%\.config\caveman\config.json)
```

Node is assumed available (Claude Code ships with it). Hook `command` strings use `node scripts/<file>.js` with the plugin directory as cwd — relative paths work on all three OSes without shell-variable expansion issues.

## Components

### `config.default.json` (shipped)

```json
{
  "defaultLevel": "full",
  "remindEveryTurn": true,
  "off": false
}
```

Version-controlled. Read by `caveman-config.read()` and merged under any user config.

### `scripts/caveman-config.js` (shared library)

Module exports:

- `userConfigPath()` — resolves platform-specific user config path. Decision order:
  1. If `process.platform === 'win32'`: use `%APPDATA%\caveman\config.json`. If `APPDATA` is unset, fall back to `%USERPROFILE%\.config\caveman\config.json`.
  2. Otherwise (POSIX): use `$XDG_CONFIG_HOME/caveman/config.json` if `XDG_CONFIG_HOME` is set, else `~/.config/caveman/config.json`.
- `read()` — returns `{...pluginDefault, ...userConfig}`. If user file missing or malformed, returns plugin default alone (malformed case logs to stderr).
- `write(partial)` — merges `partial` into existing user config (preserving other keys), `mkdir -p` on the config dir, writes to a temp file, then `renameSync` for atomicity on all three OSes.

### `scripts/hook-session-start.js`

```
const cfg = read();
if (cfg.off) process.exit(0);
console.log(`caveman active at ${cfg.defaultLevel} level.`);
```

### `scripts/hook-user-prompt.js`

```
const cfg = read();
if (cfg.off) process.exit(0);
if (cfg.remindEveryTurn) console.log("keep talk caveman");
```

Reads stdin but does not parse the prompt. All user-intent detection is delegated to the agent (see "Off-switch toggle flow" below).

### `scripts/set-config.js` (CLI)

Invoked by the agent via the Bash tool when the user's intent is to change persistent config. Usage:

```
node scripts/set-config.js <key>=<value> [<key>=<value> ...]
```

Validation:

- `off`, `remindEveryTurn` — `true` or `false` only.
- `defaultLevel` — `lite`, `full`, or `ultra` only.
- Unknown keys or invalid values → print usage to stderr, exit 1.
- Valid args → call `write(partial)`, print confirmation to stdout, exit 0.

### `.claude-plugin/plugin.json` (updated)

```json
"hooks": {
  "SessionStart":     [{"hooks": [{"type": "command", "command": "node scripts/hook-session-start.js"}]}],
  "UserPromptSubmit": [{"hooks": [{"type": "command", "command": "node scripts/hook-user-prompt.js"}]}]
}
```

## Data flow

### Session start

1. Claude Code fires `SessionStart` → runs `node scripts/hook-session-start.js` with cwd at the plugin root.
2. Script calls `caveman-config.read()`, which resolves the user config path for the current OS, reads the user config if it exists, and merges over the plugin default. The user's `defaultLevel` wins when set; otherwise the plugin default does.
3. If `cfg.off` is true, the script exits silently (no session start announcement).
4. Otherwise it prints `caveman active at <level> level.` which Claude Code injects as agent context.

### Each user turn

1. Claude Code fires `UserPromptSubmit` → runs `node scripts/hook-user-prompt.js` (user prompt on stdin; unused by this hook).
2. Script reads config. If `off`, exits silently. If `remindEveryTurn` is true, prints `keep talk caveman`. Otherwise silent.

### Off-switch toggle flow (agent-driven)

1. The user expresses intent in natural language (e.g., "disable caveman permanently", "kill caveman for good", "caveman on", "resume caveman", "stop caveman").
2. The agent classifies the intent:
   - **Persistent off** — invoke `node "$CLAUDE_PLUGIN_ROOT/scripts/set-config.js" off=true`, then report the change.
   - **Persistent on** — invoke `node "$CLAUDE_PLUGIN_ROOT/scripts/set-config.js" off=false`, then report the change.
   - **Session-only stop** — acknowledge and stop responding in caveman for this session; do not write the config. Mention the permanent trigger so the user knows how to make it permanent.
   - **Ambiguous** — ask one clarifying question before acting.
3. The skill's `SKILL.md` adds rules codifying these four classes so the agent behaves consistently across sessions.

### Write atomicity

`caveman-config.write(partial)` executes:

1. `fs.mkdirSync(configDir, { recursive: true })`
2. Read the existing user config if present; start from `{}` otherwise.
3. `merged = { ...existingUser, ...partial }`.
4. Write `merged` JSON to `config.json.tmp` (same dir).
5. `fs.renameSync(tmp, finalPath)` — atomic on NTFS, ext4, APFS.

## Error handling

Hooks must never abort the Claude Code session. Strategy: fail silent to stdout, log details to stderr.

| Failure                              | Behavior                                                                 |
|--------------------------------------|--------------------------------------------------------------------------|
| `config.default.json` missing/corrupt | stderr log. `read()` returns hardcoded fallback `{defaultLevel:"full", remindEveryTurn:true, off:false}`. Hooks continue. |
| User config malformed JSON           | stderr log. `read()` returns plugin default only (user config ignored until fixed). |
| User config file missing             | Silent. `read()` returns plugin default. First-run path.                 |
| `mkdir` fails (permission)           | `write()` throws → `set-config.js` prints error + exits 1. Agent reports to user. |
| `renameSync` fails                   | `write()` throws → same as above.                                         |
| `UserPromptSubmit` stdin JSON parse fail | stderr log. Hook exits silent (skip reminder this turn).              |
| `set-config.js` bad arg              | Print usage to stderr, exit 1. Agent reports to user.                    |
| `%APPDATA%` unset on Windows         | Fall back to `%USERPROFILE%\.config\caveman\config.json`.                |
| `$XDG_CONFIG_HOME` unset on POSIX    | Fall back to `~/.config/caveman/config.json`.                            |
| Node not installed                   | Hook fails; Claude Code surfaces the error. Out of scope (Node is a Claude Code prerequisite). |

No retry logic. Hooks are best-effort per turn; the next turn retries naturally.

## Testing

### Unit tests

Use Node's built-in `node:test` runner — zero dependencies. Layout:

```
plugins/caveman/tests/
├── caveman-config.test.js
├── hook-session-start.test.js
├── hook-user-prompt.test.js
└── set-config.test.js
```

Cases:

| Target                           | Cases                                                                                                           |
|----------------------------------|-----------------------------------------------------------------------------------------------------------------|
| `caveman-config.userConfigPath()` | Mock env: `APPDATA` → Windows path. `XDG_CONFIG_HOME` → XDG path. Neither → `~/.config/caveman/config.json`.    |
| `caveman-config.read()`          | User missing → returns default. User malformed → returns default + stderr. User valid partial → merged. User overrides all → user as-is. |
| `caveman-config.write()`         | First write → mkdir + atomic rename. Second write → preserves other keys. Permission-fail path → throws.       |
| `hook-session-start`             | `off=true` → silent. `off=false, level=lite` → `"caveman active at lite level."`.                               |
| `hook-user-prompt`               | `off=true` → silent. `off=false, remindEveryTurn=false` → silent. Both on → `"keep talk caveman"`. Malformed stdin → silent + stderr. |
| `set-config`                     | `off=true` → writes, exit 0. `off=maybe` → stderr + exit 1. Unknown key → exit 1. `defaultLevel=lite` → writes. Invalid level → exit 1. |

Runner: `node --test tests/` from plugin root.

### Manual smoke tests

1. Fresh install → start Claude Code in any dir → expect `caveman active at full level.` as injected context.
2. Ask agent to disable permanently → next session → expect silence.
3. Run a plugin update (simulate by overwriting `config.default.json` with a different default level) → user config should still win.
4. Test on all three OSes (Ubuntu, macOS, Windows) — verify config file lands at the expected platform path.

### Repo-level check (deferred)

Extending `scripts/check-consistency.sh` to verify `config.default.json` exists and has valid JSON with the required keys is optional follow-up. Add only if drift occurs.

## Open questions

None at brainstorm close. All five design sections were approved inline.

## Files touched

- `plugins/caveman/.claude-plugin/plugin.json` — replace hook commands with node script invocations.
- `plugins/caveman/config.default.json` — new.
- `plugins/caveman/scripts/caveman-config.js` — new.
- `plugins/caveman/scripts/hook-session-start.js` — new.
- `plugins/caveman/scripts/hook-user-prompt.js` — new.
- `plugins/caveman/scripts/set-config.js` — new.
- `plugins/caveman/skills/caveman/SKILL.md` — add off-switch intent-classification rules.
- `plugins/caveman/tests/*.test.js` — new.
- `plugins/caveman/UPSTREAM.md` — record hook architecture change under "Simplifications applied".
- `plugins/caveman/README.md` — document config file location + on/off triggers.

Version bump: each behavior-change commit bumps the `5tux.N` suffix per `CLAUDE.md` repo rules. Final version on merge is at least `1.6.0-5tux.2`.
