# Changelog

## v2.0.0 — 2026-03-25

### Breaking Changes

- Renamed skill from `job-search` to `career` — invoke with `/career` instead of `/job-search`
- Renamed Python package from `job_search` to `career`
- Renamed all CLI commands: `js-render` → `career-render`, `js-clean` → `career-clean`, `js-validate-links` → `career-validate-links`, `js-validate-sources` → `career-validate-sources`, `js-schedule` → `career-schedule`
- Moved user data from `users/<handle>/` inside the skill to `~/Documents/_me/references/career/<handle>/` (external)
- User template moved from `users/_example/` to `templates/user-template/`

### Features

- Merged `/note` skill into `/career note` mode — quick capture of learnings, gotchas, tips to career files
- Flexible note targeting: `/career note <content>` (admin) or `/career note <handle> <content>`
- Intelligent routing: notes automatically placed in the right file and section (journal.md, cv.md skills, cv.md strengths)

## v1.0.0 — 2026-03-20

Initial public release.

### Features

- Multi-user job search with independent profiles, preferences, and career files
- Parallel search agents: general boards, user-specific sources, deep search (ATS X-ray, Google dorking, PDF mining), community/social search, funding monitoring
- Conversational preference learning — asks targeted questions after each run, builds a preference model
- Novelty-Zero Protocol — detects search saturation and automatically activates expanded search vectors (community channels, funding signals, career page monitoring, lesser-known ATS platforms)
- Ethical filtering — exclude sectors, prioritize domains
- Dark-themed interactive HTML dashboard with sortable columns, deadline badges, user scoring, and editable comments
- Learning path management — skill demand analysis, priority scoring, resource curation
- Automated link validation with Playwright fallback for CAPTCHA-protected pages
- Clean mode for catalog maintenance (dead link removal, stale offer archival)
- CLI tools: `js-render`, `js-clean`, `js-validate-links`, `js-validate-sources`, `js-schedule`
