# Claude Code Skills Collection

A personal collection of [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills — slash commands that extend Claude's capabilities with domain-specific workflows.

## Skills

| Skill | Command | What it does |
|-------|---------|-------------|
| **career** | `/career` | AI-powered job search with learning loop, ethical filtering, multi-user support, and note capture |
| **refine-skill** | `/refine-skill` | Meta-skill that analyzes and improves other skills (and itself) |
| **report** | `/report` | Technical report writing with Pandoc ODT/PDF output and BibTeX citations |
| **agent** | `/agent` | Multi-agent chat channel coordination |
| **setup** | `/setup` | Verify, repair, or initialize Claude Code setup; `/setup scan` syncs config across machines |

## Installation

```bash
# Clone into your Claude Code skills directory
git clone https://github.com/YOUR_USERNAME/claude-skills.git ~/.claude/skills

# Install career Python dependencies
cd ~/.claude/skills/career && uv sync
```

Skills are automatically available as slash commands in Claude Code.

## Directory Structure

```
~/.claude/skills/
├── README.md               # This file
├── .gitignore              # Excludes generated HTML, secrets
├── agent/                  # Multi-agent chat coordination
│   └── SKILL.md
├── career/                 # AI career management engine
│   ├── SKILL.md            #   Orchestration (search, clean, note modes)
│   ├── README.md           #   Detailed documentation
│   ├── pyproject.toml      #   Python dependencies
│   ├── career/             #   Python automation package
│   │   ├── models.py       #     Pydantic schemas
│   │   ├── clean.py        #     CLI: career-clean (link validator + offer cleaner)
│   │   ├── render.py       #     CLI: career-render (JSON → HTML)
│   │   ├── schedule.py     #     CLI: career-schedule (profile → learning path)
│   │   ├── links.py        #     CLI: career-validate-links
│   │   ├── sources.py      #     CLI: career-validate-sources
│   │   └── templates/      #     Jinja2 HTML templates
│   ├── sources-general.yaml
│   ├── reference/          #   Extracted protocol files
│   └── templates/
│       └── user-template/  #     Blueprint for new users
├── refine-skill/           # Meta-skill for iterative improvement
│   ├── SKILL.md
│   ├── knowledge.md
│   ├── analysis.md
│   └── history/
├── report/                 # Technical report writing
│   └── SKILL.md
└── setup/                  # Environment setup
    ├── SKILL.md
    └── architecture.md
```

## User Data

Career user data (CVs, job offers, preferences) lives **outside** the skills directory at `~/Documents/_me/references/career/<handle>/`. This separates code from data and keeps the skills repo clean.

## Creating New Skills

1. Create a directory: `~/.claude/skills/your-skill/`
2. Add a `SKILL.md` with YAML frontmatter (`name`, `description`, `argument-hint`)
3. Restart your Claude Code session
4. Invoke with `/your-skill`

See [Anthropic's skill authoring guide](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) and use `/refine-skill your-skill` to improve it.

## License

MIT
