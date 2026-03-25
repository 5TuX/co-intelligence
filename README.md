# Claude Code Skills Collection

A personal collection of [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills — slash commands that extend Claude's capabilities with domain-specific workflows.

## Skills

| Skill | Command | What it does |
|-------|---------|-------------|
| **job-search** | `/job-search` | AI-powered job search with learning loop, ethical filtering, multi-user support |
| **refine-skill** | `/refine-skill` | Meta-skill that analyzes and improves other skills (and itself) |
| **report** | `/report` | Technical report writing with Pandoc ODT/PDF output and BibTeX citations |
| **note** | `/note` | Quick capture of learnings, gotchas, tips to career files |
| **myplay** | `/myplay` | Log moments of demonstrated human expertise |
| **agent** | `/agent` | Multi-agent chat channel coordination |
| **setup** | `/setup` | Verify, repair, or initialize Claude Code setup on a machine |

## Installation

```bash
# Clone into your Claude Code skills directory
git clone https://github.com/YOUR_USERNAME/claude-skills.git ~/.claude/skills

# Install job-search Python dependencies
cd ~/.claude/skills/job-search && uv sync
```

Skills are automatically available as slash commands in Claude Code.

## Directory Structure

```
~/.claude/skills/
├── README.md               # This file
├── .gitignore              # Excludes user data, generated HTML, secrets
├── agent/                  # Multi-agent chat coordination
│   └── SKILL.md
├── job-search/             # AI job search engine
│   ├── SKILL.md            #   Orchestration (~178 lines)
│   ├── README.md           #   Detailed documentation
│   ├── ROADMAP.md          #   Development roadmap
│   ├── pyproject.toml      #   Python dependencies
│   ├── job_search/         #   Python automation package
│   │   ├── models.py       #     Pydantic schemas
│   │   ├── clean.py        #     CLI: js-clean (link validator + offer cleaner)
│   │   ├── render.py       #     CLI: js-render (JSON → HTML)
│   │   ├── schedule.py     #     CLI: js-schedule (profile → schedule.html)
│   │   ├── links.py        #     CLI: js-validate-links
│   │   ├── sources.py      #     CLI: js-validate-sources
│   │   └── templates/      #     Jinja2 HTML templates
│   ├── sources-general.yaml
│   ├── reference/           #   Extracted protocol files
│   │   ├── clean-mode.md
│   │   ├── comments-processing.md
│   │   ├── deep-search-tactics.md
│   │   ├── final-report.md
│   │   ├── learning-loop.md
│   │   ├── new-user-flow.md
│   │   ├── search-agents.md
│   │   ├── update-phase.md
│   │   └── update-user-flow.md
│   └── users/              #   Per-user data (gitignored)
│       └── _example/       #     Template for new users
├── refine-skill/           # Meta-skill for iterative improvement
│   ├── SKILL.md            #   Main instructions
│   ├── knowledge.md        #   Living knowledge base (pitfalls, strategies)
│   ├── analysis.md         #   Health check rubric
│   └── history/            #   Per-skill refinement logs
├── report/                 # Technical report writing
│   └── SKILL.md
├── note/                   # Quick note capture
│   └── SKILL.md
├── myplay/                 # Human expertise logging
│   └── SKILL.md
└── setup/                  # Environment setup
    ├── SKILL.md
    └── architecture.md     #   Drive paths and symlink layout by OS
```

## Privacy

All personal data (career files, CVs, job offers, preferences) lives in gitignored `users/` directories. The repo contains only skill logic, templates, and shared configuration. Each user can optionally track their private data in a separate git repo inside their user directory.

## Creating New Skills

1. Create a directory: `~/.claude/skills/your-skill/`
2. Add a `SKILL.md` with YAML frontmatter (`name`, `description`, `argument-hint`)
3. Restart your Claude Code session
4. Invoke with `/your-skill`

See [Anthropic's skill authoring guide](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) and use `/refine-skill your-skill` to improve it.

## License

MIT
