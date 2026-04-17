# co-intelligence

A Claude Code plugin for human-AI collaborative work. Inspired by [Ethan Mollick's co-intelligence concept](https://www.oneusefulthing.org/p/i-cyborg-using-co-intelligence).

## Skills

| Skill | Command | What it does |
|-------|---------|-------------|
| **autoresearch** | `/co-intelligence:autoresearch` | Autonomous iterative research loop adapted from Karpathy's autoresearch - design experiments, run a never-stop loop, log everything |
| **bibliography** | `/co-intelligence:bibliography` | Deep scientific literature search - build comprehensive bibliographies (50-100 papers) from a natural-language description, with abstracts, citation metrics, and BibTeX |
| **career** | `/co-intelligence:career` | AI-powered job search with learning loop, ethical filtering, multi-user support, and note capture |
| **plugin** | `/co-intelligence:plugin` | Plugin lifecycle management - create plugins from local skills, publish changes to GitHub, pull updates |
| **report** | `/co-intelligence:report` | Technical report writing with Quarto ODT/PDF output and BibTeX citations |
| **skillsmith** | `/co-intelligence:skillsmith` | Create, refine, and delete Claude Code skills |

## Getting Started

### Quick install

```bash
claude plugin marketplace add 5TuX/co-intelligence
claude plugin install co-intelligence@co-intelligence
```

### First-use config

On first invocation of `career`, you'll be prompted to create a local config:

```bash
cp ${CLAUDE_PLUGIN_ROOT}/templates/config.local.yaml.example ${CLAUDE_PLUGIN_DATA}/config.local.yaml
# Edit with your handle, data directory, and Drive root path
```

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code)
- Python 3.11+ with [uv](https://docs.astral.sh/uv/) (for career skill CLI tools)

## User Data

Career user data (CVs, job offers, preferences) lives outside the plugin at `DATA_DIR/<handle>/` (configured in your `config.local.yaml`). The plugin never stores personal data.

## License

MIT
