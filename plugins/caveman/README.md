# caveman

*why use many token when few do trick*

Ultra-compressed response mode for Claude Code. Cuts ~75% of output tokens while preserving technical accuracy.

## Attribution

Adapted from [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) (MIT) by Julius Brussee. Maintained in the `co-intelligence` marketplace by 5TuX.

- Upstream version: `v1.6.0`
- Marketplace version: `1.6.0-5tux.0`

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
| Ultra *(default)* | `/caveman ultra` | Maximum compression. Telegraphic. Abbreviate everything.           |

Ultra is the default in this marketplace — the SessionStart hook enforces it every new session. Switch to `lite`/`full` per session as needed. Level persists until changed or session ends.

## Upstream sync

See [`UPSTREAM.md`](UPSTREAM.md) for the source URL, pinned commit, and the list of simplifications applied when porting.

## License

MIT — see [`LICENSE`](LICENSE).
