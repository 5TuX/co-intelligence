# karpathy

*Surface assumptions. Simplify. Touch only what you must. Define success.*

Behavioral guidelines to reduce common LLM coding mistakes. A small marketplace port of [Jiayuan Zhang's `andrej-karpathy-skills`](https://github.com/forrestchang/andrej-karpathy-skills), which distills Andrej Karpathy's observations on LLM coding pitfalls into a single skill.

## Attribution

Adapted from [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills) (MIT) by Jiayuan Zhang. Maintained in the `co-intelligence` marketplace by 5TuX.

- Upstream publishes no semver releases — SHA pinned in [`upstream.lock.json`](upstream.lock.json).
- Marketplace version: `0.0.0-5tux.0`

See [`LICENSE`](LICENSE) for notes on the upstream license declaration.

## What's included

- **`karpathy-guidelines` skill** (`skills/karpathy-guidelines/SKILL.md`) — four behavioral principles derived from Karpathy's LLM coding observations: think before coding, simplicity first, surgical changes, goal-driven execution. Byte-identical to upstream.

## What's different from upstream

### Simplifications

- Claude Code only — dropped Cursor, Gemini, and other install paths shipped upstream.
- Dropped upstream's root-level `CLAUDE.md`, `CURSOR.md`, `EXAMPLES.md`, `README.md`, and `README.zh.md` from the port (install metadata for upstream's multi-harness layout).

### Additions

- `.claude-plugin/plugin.json` with marketplace version anchor.
- `upstream.lock.json` for SHA-pinned sync workflow.
- `LICENSE` file documenting the upstream's license declaration (upstream ships no LICENSE file of its own; declares "MIT" in README).

### Overlap with existing Claude Code behavior

Some principles partially overlap existing behavior — kept all four for upstream-faithful porting, cross-harness portability, and reinforcement at skill trigger time:

- **Principle 2 (simplicity)** and **Principle 3 (surgical changes)** restate parts of Claude Code's default system prompt ("don't add features beyond the task", "don't refactor adjacent code").
- **Principle 4 (goal-driven execution)** partially overlaps `superpowers:verification-before-completion` — but focuses on goal-framing and verifiable plan structure *before* implementation, where superpowers' skill focuses on verification *after*.
- **Principle 1 (think before coding)** is the clearest value-add — no existing skill or default behavior enforces explicit assumption-surfacing before implementing.

## Install

```text
/plugin marketplace add 5TuX/co-intelligence
/plugin install karpathy@co-intelligence
```

## Usage

The skill's frontmatter description triggers it automatically when writing, reviewing, or refactoring code. No explicit invocation required. Principles layer on top of whatever other skills are active.

## Upstream sync

Machine state lives in [`upstream.lock.json`](upstream.lock.json). Run `node scripts/sync-upstream.js karpathy` from the repo root to see what's changed upstream since the pin. See the repo-level [`CLAUDE.md`](../../CLAUDE.md) § "Upstream sync workflow" for the full process.

## License

MIT as declared by upstream. See [`LICENSE`](LICENSE).
