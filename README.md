# co-intelligence

A Claude Code plugin for human-AI collaborative work. Inspired by [Ethan Mollick's co-intelligence concept](https://www.oneusefulthing.org/p/i-cyborg-using-co-intelligence).

## Skills

| Skill | Command | What it does |
|-------|---------|-------------|
| **career** | `/co-intelligence:career` | AI-powered job search with learning loop, ethical filtering, multi-user support, and note capture |
| **skillsmith** | `/co-intelligence:skillsmith` | Create, refine, and delete Claude Code skills |
| **report** | `/co-intelligence:report` | Technical report writing with Quarto ODT/PDF output and BibTeX citations |
| **setup** | `/co-intelligence:setup` | Apply, verify, and evolve Claude Code setup across machines |
| **agent** | `/co-intelligence:agent` | Multi-agent chat channel coordination |

## Getting Started

### Quick install

```bash
claude plugin marketplace add 5TuX/co-intelligence
claude plugin install co-intelligence@co-intelligence
```

### First-time machine setup

If you're setting up Claude Code from scratch (new machine, fresh install), see the full bootstrap guide:

**[`skills/setup/bootstrap.md`](skills/setup/bootstrap.md)**

It covers Google Drive sync, symlinks/junctions, plugin installation, MCP server configuration, and environment variables - everything needed to go from a bare machine to a working setup.

After bootstrapping, run `/co-intelligence:setup` to verify everything is configured correctly.

### First-use config

On first invocation of `career` or `setup`, you'll be prompted to create a local config:

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
