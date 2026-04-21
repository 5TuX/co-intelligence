# caveman

*why use many token when few do trick*

Ultra-compressed response mode for Claude Code. Cuts ~75% of output tokens while preserving technical accuracy.

## Attribution

Adapted from [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) (MIT) by Julius Brussee. Maintained in the `co-intelligence` marketplace by 5TuX.

- Upstream version: `v1.6.0`
- Marketplace version: `1.6.0-5tux.4`

See [`LICENSE`](LICENSE) for the original copyright notice.

## What's included

- **`caveman` skill** (`skills/caveman/SKILL.md`) — the core compression rules with `lite`, `full`, and `ultra` intensity levels.
- **SessionStart hook** (`.claude-plugin/plugin.json`) — auto-activates caveman ultra mode at the start of every Claude Code session.

Quick illustration (upstream example):

> **Normal:** "The reason your React component is re-rendering is likely because you're creating a new object reference on each render cycle..." *(69 tokens)*
>
> **Caveman:** "New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`." *(19 tokens)*

Same fix. 75% less word. Brain still big.

## What's different from upstream

### Simplifications

- Claude Code only — dropped Codex, Cursor, Windsurf, Cline, Copilot, and Gemini CLI install paths along with their rule/instruction files.
- Kept only the core `caveman` skill. Removed `caveman-commit`, `caveman-review`, `caveman-help`, and `compress`.
- Removed benchmarks, evals, tests, docs, statusline helper, hooks installer scripts, single-file `caveman.skill` distribution, `AGENTS.md` / `GEMINI.md` / `CLAUDE.md` multi-agent configs, and release assets.
- `skills/caveman/SKILL.md` was trimmed (66 → 49 lines) for this marketplace.

### Additions

- Two Claude Code hooks in `.claude-plugin/plugin.json` backed by node scripts under `scripts/`: `SessionStart` announces the active level from config; `UserPromptSubmit` emits a per-turn drift reminder gated by config.
- Persistent user config merged over shipped `config.default.json` (`%APPDATA%\caveman\config.json` on Windows, `~/.config/caveman/config.json` on POSIX). Controls default level, reminder toggle, and permanent off state.
- Agent-driven off-switch intent detection (see `skills/caveman/SKILL.md`) writes via `scripts/set-config.js`.

## Install

```text
/plugin marketplace add 5TuX/co-intelligence
/plugin install caveman@co-intelligence
```

The SessionStart hook activates caveman ultra mode on every new session automatically.

### Configuration

The plugin ships defaults in `config.default.json`. User overrides persist across plugin updates at:

- **Linux / macOS:** `$XDG_CONFIG_HOME/caveman/config.json` (falls back to `~/.config/caveman/config.json`)
- **Windows:** `%APPDATA%\caveman\config.json` (falls back to `%USERPROFILE%\.config\caveman\config.json`)

Keys:

| Key               | Values                | Default  | Effect                                                     |
|-------------------|-----------------------|----------|------------------------------------------------------------|
| `defaultLevel`    | `lite`, `full`, `ultra` | `full`   | Level announced at session start.                          |
| `remindEveryTurn` | `true`, `false`       | `true`   | Whether the per-turn `keep talk caveman` reminder fires.   |
| `off`             | `true`, `false`       | `false`  | When `true`, both hooks are silent — caveman is disabled.  |

Ask the agent to change persistent settings in natural language (e.g. "disable caveman permanently", "caveman on"). The agent calls `scripts/set-config.js` to write the user config.

## Usage

Trigger with any of:

- `/caveman`
- "talk like caveman"
- "caveman mode"
- "less tokens please"

Stop with: "stop caveman" or "normal mode".

### Intensity levels

| Level            | Trigger          | What it do                                                         |
|------------------|------------------|--------------------------------------------------------------------|
| Lite             | `/caveman lite`  | Drop filler, keep grammar. Professional but no fluff.              |
| Full             | `/caveman full`  | Drop articles, fragments, full grunt.                              |
| Ultra            | `/caveman ultra` | Maximum compression. Telegraphic. Abbreviate everything.           |

The shipped default is `full`. The SessionStart hook reads the user config and announces the active level at session start — change `defaultLevel` in the user config (see **Configuration** above) to persist a different default across sessions. Switch ad-hoc within a session with the triggers below; the change is session-scoped only.

## Upstream sync

Machine state (repo URL, pinned SHA, tag, last-synced date) lives in [`upstream.lock.json`](upstream.lock.json). Run `node scripts/sync-upstream.js caveman` from the repo root to see what's changed upstream since the pin. See the repo-level [`CLAUDE.md`](../../CLAUDE.md) § "Upstream sync workflow" for the full process.

## License

MIT — see [`LICENSE`](LICENSE).
