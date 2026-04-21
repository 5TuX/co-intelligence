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

This is a simplified Claude Code port. It ships only the core skill — upstream's additional skills (`caveman-commit`, `caveman-review`, `caveman-help`, `compress`) and non-Claude-Code distribution paths (Codex, Cursor, Windsurf, Cline, Copilot, Gemini CLI) are not included. Statusline helpers, hooks installer scripts, benchmarks, evals, and docs are also omitted. See [`UPSTREAM.md`](UPSTREAM.md) for the full list.

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

See [`UPSTREAM.md`](UPSTREAM.md) for the source URL, pinned commit, and the list of simplifications applied when porting.

## License

MIT — see [`LICENSE`](LICENSE).
