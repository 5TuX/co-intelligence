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

## License

MIT — see each plugin's `LICENSE` file.
