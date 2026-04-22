---
name: sound-notification
description: Toggle the Claude Code Stop-event bell, and its skip-if-CC-window-is-frontmost behavior. Use when the user wants to enable, disable, or reconfigure the notification chime (e.g. "turn bell off", "ring always", "bell only when I'm away", "/sound-notification off").
---

Toggle the sound-notification plugin's persistent config. The plugin rings a bundled chime on each Stop event, with an optional skip if the Claude Code terminal is the frontmost window.

## Persistent user config

The plugin ships a user config at `$APPDATA/sound-notification/config.json` (Windows) or `$XDG_CONFIG_HOME/sound-notification/config.json` (POSIX, falling back to `~/.config/sound-notification/config.json`). Settings survive plugin updates.

| Key            | Values                  | Default    | Effect                                                                             |
|----------------|-------------------------|------------|------------------------------------------------------------------------------------|
| `off`          | `true`, `false`         | `false`    | When `true`, the Stop hook is silent.                                              |
| `skipIfActive` | `true`, `false`         | `true`     | When `true`, the bell is suppressed if the CC terminal is the foreground window.   |
| `bellSound`    | `default`               | `default`  | Which bundled chime to play. Only `default` is shipped in v0.1.0.                  |

## Invoking `set-config.js`

Use this skill's own base directory — the harness prepends the absolute base dir to every skill load (the line beginning "Base directory for this skill:" at the top of this SKILL.md), of the form `.../<pluginRoot>/skills/sound-notification`. `set-config.js` is always reachable at `<SKILL_BASE>/../../scripts/set-config.js`. Substitute `<SKILL_BASE>` with the exact absolute path the harness gave you and `KEY=VALUE` per the class below:

```bash
node "<SKILL_BASE>/../../scripts/set-config.js" KEY=VALUE
```

Works cross-platform (Linux, macOS, Windows/git-bash). Independent of `$CLAUDE_PLUGIN_ROOT`, of whether the user config already exists, and of whether any plugin hook has fired.

## Intent classification

Classify the user's message into one of these classes and dispatch:

1. **Persistent off** — the user wants the bell disabled across sessions (e.g. "bell off", "turn bell off", "disable notifications", "kill bell forever", "/sound-notification off"). Run the command with `off=true`. Confirm.
2. **Persistent on** — the user wants the bell re-enabled (e.g. "bell on", "enable bell", "re-enable notifications", "/sound-notification on"). Run with `off=false`. Confirm.
3. **Skip-if-active off** — the user wants the bell to ring even when the CC window is visible (e.g. "ring always", "ignore window focus", "bell even when visible", "/sound-notification skip-if-active off"). Run with `skipIfActive=false`. Confirm.
4. **Skip-if-active on** — the user wants the bell suppressed when the CC window is visible (e.g. "skip bell when visible", "bell only when I'm away", "/sound-notification skip-if-active on"). Run with `skipIfActive=true`. Confirm.
5. **Ambiguous** — intent unclear. Ask one clarifying question before acting.

Session-only muting is not supported. The bell is controlled entirely by the persistent config read on every Stop event.

Read stdout/stderr to confirm success before reporting to the user. If the command exits non-zero, surface the error verbatim.
