# superpowers

Agentic skills framework for Claude Code — TDD, debugging, collaboration patterns, and proven development workflows, built on composable skills.

## Attribution

Adapted from [obra/superpowers](https://github.com/obra/superpowers) (MIT) by [Jesse Vincent](https://blog.fsck.com) and [Prime Radiant](https://primeradiant.com). Maintained in the `co-intelligence` marketplace by 5TuX.

- Upstream version: `v5.0.7`
- Marketplace version: `5.0.7-5tux.1`

See [`LICENSE`](LICENSE) for the original copyright notice. If Superpowers has helped your work, consider [sponsoring Jesse's open-source work](https://github.com/sponsors/obra).

## What's included

- **14 skills** under `skills/` — brainstorming, writing-plans, executing-plans, subagent-driven-development, dispatching-parallel-agents, using-git-worktrees, finishing-a-development-branch, test-driven-development, systematic-debugging, verification-before-completion, requesting-code-review, receiving-code-review, writing-skills, using-superpowers.
- **`code-reviewer` agent** (`agents/code-reviewer.md`) — two-stage review agent invoked between implementation tasks.
- **Hooks** (`hooks/`) — session-start and cross-editor hook config, byte-identical to upstream.
- **`CLAUDE.md`** — upstream's contributor philosophy (retained for reference; its PR rules apply to `obra/superpowers`, not to this fork).

## What's different from upstream

Skills, agents, and hooks are byte-identical to upstream `v5.0.7`. What's dropped is repo-level scaffolding not used by the plugin bundle: `commands/`, `docs/`, `tests/`, `scripts/`, `CHANGELOG.md`, `CODE_OF_CONDUCT.md`, `RELEASE-NOTES.md`, `package.json`, plus non-Claude-Code install paths (`gemini-extension.json`, `GEMINI.md`). See [`UPSTREAM.md`](UPSTREAM.md) for the full list.

## Install

```text
/plugin marketplace add 5TuX/co-intelligence
/plugin install superpowers@co-intelligence
```

Skills trigger automatically — the agent checks for relevant skills before any task.

## Usage

Once installed, the workflow activates on its own. You rarely invoke skills by name; the agent picks them based on what you're doing.

### Workflow

1. **brainstorming** — before writing code. Refines rough ideas through questions, presents design in chunks, saves design doc.
2. **using-git-worktrees** — after design approval. Creates isolated workspace, verifies clean test baseline.
3. **writing-plans** — with approved design. Breaks work into 2–5-minute tasks with exact file paths, code, and verification steps.
4. **subagent-driven-development** or **executing-plans** — dispatches a fresh subagent per task with two-stage review (spec compliance, then code quality), or executes in batches with checkpoints.
5. **test-driven-development** — during implementation. RED-GREEN-REFACTOR: failing test first, minimal code, commit.
6. **requesting-code-review** — between tasks. Reports issues by severity; critical issues block progress.
7. **finishing-a-development-branch** — when tasks complete. Verifies tests, presents merge/PR/keep/discard options, cleans up the worktree.

## Philosophy

- **Test-Driven Development** — write tests first, always.
- **Systematic over ad-hoc** — process over guessing.
- **Complexity reduction** — simplicity as primary goal.
- **Evidence over claims** — verify before declaring success.

Read the [original release announcement](https://blog.fsck.com/2025/10/09/superpowers/).

## Upstream sync

See [`UPSTREAM.md`](UPSTREAM.md) for the source URL, pinned commit, and the list of simplifications applied when porting.

## License

MIT — see [`LICENSE`](LICENSE).
