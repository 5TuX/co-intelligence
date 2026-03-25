# /job-search — AI-Powered Job Search Skill for Claude Code

A Claude Code skill that turns your terminal into a conversational career partner. It learns what you actually want through dialogue, searches aggressively across dozens of sources, and gets sharper every run.

**This is not an auto-apply bot.** The goal is the most efficient job search possible: asking the right questions, learning your preferences, finding roles you'd never discover on your own, and presenting them clearly so you can make great decisions.

## What It Does

- **Conversational preference learning** — asks targeted questions after each run, builds a preference model that improves over time
- **Deep search** — goes beyond job boards: ATS X-ray searches (Greenhouse, Lever, Workday...), Google dorking, PDF/document mining, forum/community scraping, funding signal detection
- **Ethical filtering** — exclude sectors you don't want (adtech, surveillance, etc.), prioritize domains you care about (healthcare, environment, open source, etc.)
- **Multi-user** — run searches for yourself and friends, each with independent profiles
- **Adaptive strategy** — tracks which search queries yield results and which don't, adjusts automatically
- **Automated validation** — checks every link, detects expired/stale offers, archives dead ones
- **Rich HTML output** — sortable tables with columns for level, salary, mission, tools, match score (0-10 color-coded), and deadline alerts

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) (CLI)
- Python 3.11+ with [uv](https://docs.astral.sh/uv/)

## Installation

1. Clone into your Claude Code skills directory:
   ```bash
   git clone https://github.com/5TuX/job-search-skill.git ~/.claude/skills/job-search
   ```

2. Install Python dependencies:
   ```bash
   cd ~/.claude/skills/job-search
   uv sync
   ```

3. Create your user profile:
   ```bash
   # Option A: Interactive setup (recommended)
   # In Claude Code, run:
   /job-search new-user

   # Option B: Manual setup
   cp -r users/_example users/your-handle
   # Edit users/your-handle/profile.yaml with your details
   ```

4. Run your first search:
   ```
   /job-search your-handle
   ```

## How It Works

```
/job-search your-handle
        |
        v
  Read your profile, sources, preferences, and past feedback
        |
        v
  Spawn parallel search agents:
    - General job boards (sources-general.yaml)
    - Your custom sources (sources.yaml)
    - Deep search (ATS X-ray, dorking, forums, PDFs)
    - Source maintenance (validate, prune, discover)
    - Market trends + skill gaps
        |
        v
  Filter results through your ethical preferences and location priorities
        |
        v
  Validate every link, remove dead/stale offers
        |
        v
  Generate Dashboard.html (tabbed: offers catalog + run summary + learning path)
        |
        v
  Ask 3-5 targeted questions to learn your preferences better
        |
        v
  Update preference model, search logs, and metrics
```

Each run takes the full learning from all previous runs into account. The more you use it, the better it gets.

## Project Structure

```
~/.claude/skills/job-search/
├── SKILL.md                    # Skill orchestration (the brain, ~470 lines)
├── README.md                   # This file
├── LICENSE                     # MIT
├── CONTRIBUTING.md             # How to contribute
├── CHANGELOG.md                # Version history
├── pyproject.toml              # Python dependencies
├── sources-general.yaml        # Shared job boards (AI/ML focused)
├── reference/                  # Reference docs (loaded on demand)
│   ├── deep-search-tactics.md  #   Search tactics reference (loaded by deep search agent only)
│   ├── new-user-flow.md        #   New user creation flow
│   ├── update-user-flow.md     #   Profile update flow
│   ├── feedback_cv_honesty.md  #   Shared feedback rules
│   ├── search-agents.md        #   Search agent specifications
│   ├── update-phase.md         #   Distribution & update protocol
│   ├── final-report.md         #   Final report format
│   ├── clean-mode.md           #   Clean mode protocol (C1-C4)
│   └── learning-loop.md        #   Learning loop protocol
├── job_search/                 # Python automation package
│   ├── models.py               #   Pydantic schemas (Offer, Source, CleanReport, etc.)
│   ├── clean.py                #   CLI: js-clean (validate links + remove dead offers)
│   ├── schedule.py             #   CLI: js-schedule (profile.yaml → learning path)
│   ├── render.py               #   CLI: js-render (JSON → HTML)
│   ├── links.py                #   CLI: js-validate-links (async link checker)
│   ├── sources.py              #   CLI: js-validate-sources (YAML validator)
│   └── templates/              #   Jinja2 HTML templates
│       ├── base.html.j2        #     Dark theme, sortable tables, score colors
│       ├── dashboard.html.j2   #     Unified tabbed dashboard
│       ├── offers.html.j2      #     Offers table (legacy)
│       ├── summary.html.j2     #     Run summary (legacy)
│       └── schedule.html.j2    #     Learning path
└── users/
    ├── _example/               # Template — copy this to create your profile
    │   ├── profile.yaml
    │   ├── sources.yaml
    │   ├── Direction.md
    │   ├── CV.md
    │   ├── Human-Expertise.md
    │   ├── Job-Search-Reference.md
    │   └── Journal.md
    └── your-handle/            # Your data (gitignored, private)
        ├── profile.yaml        # Your preferences, skills, ethical filters
        ├── sources.yaml        # Your custom job sources
        ├── Dashboard.html      # Unified tabbed dashboard (offers + summary + learning path)
        ├── Direction.md        # Career direction and goals
        ├── CV.md               # Living CV
        ├── Human-Expertise.md  # Your unique strengths
        ├── Journal.md          # Session log
        ├── Job-Search-Reference.md  # Removed offers, tips
        ├── learned-preferences.md   # Auto-built preference model
        ├── feedback.yaml       # Q&A history from feedback loops
        ├── search-log.yaml     # Query performance tracking
        ├── metrics.yaml        # Run-over-run quality metrics
        └── Topics/             # Optional thematic notes
```

## User Data Privacy

All personal data lives in `users/your-handle/` which is **gitignored by default**. The repo never contains anyone's CV, preferences, job offers, or career files. Each user can optionally track their own data in a separate private git repo inside their user directory.

## Commands

| Command | What it does |
|---------|-------------|
| `/job-search` | Run search for all users |
| `/job-search handle` | Run search for one user |
| `/job-search handle1,handle2` | Run search for specific users |
| `/job-search clean` | Validate all links, remove dead/stale offers |
| `/job-search clean handle` | Clean for a specific user only |
| `/job-search new-user` | Interactive profile creation |
| `/job-search update-user handle` | Update an existing profile |

## CLI Tools

```bash
# Generate learning path HTML (reads from profile.yaml, no duplication)
uv run js-schedule users/your-handle/

# Clean dead/stale offers (auto-removes dead, flags CAPTCHA/redirect for review)
uv run js-clean users/your-handle/ [--timeout 15] [--dry-run]

# Validate source YAML files
uv run js-validate-sources sources-general.yaml users/your-handle/sources.yaml

# Check links in an offers JSON file
uv run js-validate-links users/your-handle/offers.json --output results.json

# Render unified dashboard (reads offers.json, summary-data.json, profile.yaml)
uv run js-render users/your-handle/
```

## Customization

### Adding Sources

Edit `users/your-handle/sources.yaml` to add job boards, company career pages, or niche sources specific to your search. See `users/_example/sources.yaml` for the format.

To contribute sources that benefit everyone, add them to `sources-general.yaml` and open a PR.

### Ethical Filtering

In `profile.yaml`, configure:
- `ethical_filter.exclude` — sectors/companies to never show
- `ethical_filter.prioritize` — domains that get a scoring boost
- `ethical_filter.also_look_for` — non-obvious roles where your skills apply

### Learning Path

Define skills to develop in `profile.yaml` under `learning_path`. Each item has a priority (1 = highest), difficulty estimate, rationale, topics, and curated resources with clickable URLs. The skill reviews the learning path each run and suggests adjustments based on what current offers demand — re-prioritizing skills, updating dead resource links, and tracking progress as skills move from `learning` to `strong`.

### Search Notes

Add specific companies, labs, or institutions to always check in `profile.yaml` under `search_notes`.

## Similar Projects

This skill was built independently, but these projects share similar goals (none are auto-apply):

| Project | Approach | Stars |
|---------|----------|-------|
| [AI-Job-Coach](https://github.com/rhowardstone/AI-Job-Coach) | Claude Code skills, research-backed networking focus, "Claude fills, you submit" | 3 |
| [Career Helper](https://github.com/Zal4DW/career-helper) | Claude desktop plugin, 10 skill areas including AI impact assessment | 15 |
| [CommandJobs](https://github.com/nicobrenner/commandjobs) | Terminal TUI, scrapes HN/Workday, GPT matching against resume, SQLite | 168 |
| [Resume Matcher](https://github.com/srbhr/Resume-Matcher) | Resume tailoring with LiteLLM multi-provider, PDF generation | 26.3k |
| [LinkedInJobSniper](https://github.com/711634/LinkedInJobSniper) | Daily LinkedIn scraping + Groq scoring + email digest, zero-cost via GitHub Actions | 53 commits |
| [Job Search Agent Template](https://github.com/mirabelledoiron/job-search-agent-template) | Daily Claude-scored matches delivered to Notion | new |

What makes `/job-search` different: conversational preference learning that improves over time, deep search tactics (ATS X-ray, dorking, PDF mining), multi-user support, and ethical filtering built into the core.

## Contributing

Contributions welcome — especially:
- New sources for `sources-general.yaml`
- Improvements to search tactics in `SKILL.md`
- Bug fixes in the Python tooling
- New Jinja2 templates or output formats

## License

MIT — see [LICENSE](LICENSE).
