# co-intelligence

A Claude Code plugin for human-AI collaborative work. Inspired by [Ethan Mollick's co-intelligence concept](https://www.oneusefulthing.org/p/i-cyborg-using-co-intelligence).

## Skills

| Skill | Command | What it does |
|-------|---------|-------------|
| **career** | `/co-intelligence:career` | AI-powered job search with learning loop, ethical filtering, multi-user support, and note capture |
| **skillsmith** | `/co-intelligence:skillsmith` | Create, refine, and delete Claude Code skills |
| **report** | `/co-intelligence:report` | Technical report writing with Quarto ODT/PDF output and BibTeX citations |
| **agent** | `/co-intelligence:agent` | Multi-agent chat channel coordination |

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
