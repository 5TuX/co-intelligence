# Changelog

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
