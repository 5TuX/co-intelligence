# co-intelligence

Skills for human–AI collaborative work. A Claude Code plugin marketplace bundling simplified ports of upstream skill plugins plus original work.

## Install

```text
/plugin marketplace add 5TuX/co-intelligence
/plugin install <plugin>@co-intelligence
```

Replace `<plugin>` with any of the names below.

## Plugins

| Plugin                             | Description                                                         | Attribution                                                                                       |
|------------------------------------|---------------------------------------------------------------------|---------------------------------------------------------------------------------------------------|
| [caveman](plugins/caveman)         | Ultra-compressed caveman-style responses (~75% token reduction).    | Adapted from [JuliusBrussee/caveman](https://github.com/JuliusBrussee/caveman) (MIT).             |
| [superpowers](plugins/superpowers) | TDD, debugging, collaboration, and proven development workflows.    | Adapted from [obra/superpowers](https://github.com/obra/superpowers) (MIT) by Jesse Vincent.      |
| [autoresearch](plugins/autoresearch) | Karpathy-style iterative code-driven research loops.              | Original, by 5TuX.                                                                                |

Each adapted plugin ships an `UPSTREAM.md` with its source URL, pinned upstream commit, and the list of simplifications applied when porting.

## Principles

- **Scope separation.** Each plugin owns one coherent domain — one upstream fork, or one original concept. No bundling unrelated work.
- **No redundancy.** Before porting a skill, check it doesn't duplicate existing plugins or Claude Code default behavior. Unresolved overlaps tracked internally.
- **Upstream-faithful.** Adapted plugins ship verbatim content where possible; every deviation lives in that plugin's README § "What's different from upstream".

## License

MIT — see each plugin's `LICENSE` file.
