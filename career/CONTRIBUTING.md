# Contributing

Thanks for your interest in improving the career skill.

## How to contribute

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Test: run `/career new-user` to verify the skill loads, and `uv run career-render templates/user-template` to verify templates render
4. Open a PR with a clear description of what changed and why

## What's welcome

- **New sources** for `sources-general.yaml` — job boards, ATS platforms, niche boards
- **Search tactic improvements** in `reference/deep-search-tactics.md`
- **Bug fixes** in the Python tooling (`career/`)
- **Template improvements** — new dashboard features, better styling
- **Documentation** — clearer instructions, better examples

## Skill conventions

- `SKILL.md` is the main entry point. Keep it under 500 lines / 10K chars (Anthropic hard limit is 15K)
- Reference docs go in `reference/` — loaded on demand, not at startup
- YAML frontmatter in `SKILL.md` must not contain `[]` or `{}` (breaks Claude Code)
- User data stays in `DATA_DIR/<handle>/` (at `~/Documents/_me/references/career/<handle>/`) which is gitignored
- `templates/user-template/` is the template — keep it clean and generic

## Code style

- Python: standard library style, type hints, Pydantic for models
- Dependencies managed with `uv`
- No hardcoded user paths or personal data in shared code

## Questions?

Open an issue — happy to help.
