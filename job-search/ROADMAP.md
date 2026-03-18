# Development Roadmap

## Vision

The best job search is a conversation, not a form. This skill turns Claude Code into a career partner that learns what you actually want through dialogue — asking the right questions, remembering your answers, and getting sharper every run. No auto-apply. No spray-and-pray. Just increasingly precise matching between who you are and where you'd thrive.

---

## Current Features

### Core Search Engine
- [x] Multi-user support — each user gets an isolated profile and data directory
- [x] Parallel agent architecture — spawns multiple search agents concurrently for speed
- [x] General + user-specific source lists (YAML-based, validated)
- [x] Deep search tactics: Google dorking, ATS X-ray (Greenhouse, Lever, Ashby, Workday, etc.), company career page scraping, hidden document search (PDF/doc), forum/community mining
- [x] Agent self-refinement — each search agent spawns sub-agents for gap analysis and non-obvious strategies
- [x] Temporal filtering — date-constrained searches to surface fresh postings only
- [x] Non-English language search variants for bilingual regions

### Smart Filtering & Matching
- [x] Ethical filtering — hard exclude sectors/companies, soft prioritize preferred domains
- [x] Location-aware scoring with nuanced priority system
- [x] Skills matching against user profile (strong + learning + gaps)
- [x] Cross-user result sharing — offers found for one user can match another
- [x] Stale offer detection — automated link validation + LLM-based date verification
- [x] Announcement/news source detection — flags one-time postings vs. evergreen job boards

### Learning Loop
- [x] Conversational feedback after each run (3-5 targeted questions)
- [x] Preference model that builds over time (`learned-preferences.md`)
- [x] Search performance tracking (`search-log.yaml`) — identifies high/low-yield queries
- [x] Run-over-run metrics (`metrics.yaml`) — novelty and precision trends
- [x] Adaptive search strategy — doubles down on what works, drops what doesn't
- [x] Convergence — asks fewer questions as preferences solidify

### Output & Career Management
- [x] Styled HTML offer catalogs (`Offers.html`) — persistent across runs
- [x] Per-run summary digests (`summary.html`) — snapshot with commentary
- [x] Automated link validation (async, concurrent)
- [x] CV suggestions cross-referenced with Human-Expertise profile
- [x] Career direction tracking (`Direction.md`)
- [x] Removed offer archival with reasons
- [x] People-to-follow tracking (hiring managers, researchers, lab leads)
- [x] Market trends + skill gap analysis
- [x] Hidden gem flagging — offers found only via deep search

### User Onboarding
- [x] Interactive new-user creation (`/job-search new-user`)
- [x] Interactive profile updates (`/job-search update-user <handle>`)
- [x] Source list auto-maintenance (validate, prune, discover new sources)

### Tooling
- [x] `js-clean` — catalog cleaner: validates all links, auto-removes dead/expired/stale, flags CAPTCHA/redirect for LLM review, re-renders HTML. Runs standalone (`/job-search clean`) or automatically before each search (Step 1.7)
- [x] `js-validate-links` — async link checker with expired/CAPTCHA/redirect detection
- [x] `js-validate-sources` — YAML source file validator
- [x] `js-render` — JSON-to-HTML renderer via Jinja2 templates

### UI
- [x] Sortable table columns — click any column header to sort (both Offers.html and summary.html)
- [x] Numeric match scoring (0-10) with red-yellow-green color gradient
- [x] Dedicated columns: Level/Salary (merged), Mission, Tools
- [x] Deadline inline badges next to role name — red <7d, orange <30d
- [x] Removed Source, Notes, and Deadline columns (info moved to dedicated fields or badges)
- [x] Salaries normalized to gross €/month (all currencies converted)

### Learning & Career Development
- [x] Learning path in profile.yaml — prioritized skills with difficulty, curated resources with clickable URLs
- [x] Learning path auto-review each run — checks skill relevance vs. current offers, suggests re-prioritization, tracks progress

---

## Planned / Ideas

### Better Preference Discovery
- [ ] **Offer reaction cards** — after presenting top offers, let the user swipe-style react (interested / not interested / maybe) to rapidly train the preference model
- [ ] **Preference conflict detection** — surface when stated preferences contradict observed behavior (e.g., says "remote preferred" but always clicks office-based roles)
- [ ] **Salary expectation modeling** — learn salary ranges per location/role through conversation, use as a soft filter
- [ ] **"Why not this one?"** — when the user rejects a seemingly good match, ask why and record the signal

### Smarter Search
- [ ] **Company intelligence profiles** — build dossiers on interesting companies (culture, tech stack, growth trajectory, Glassdoor sentiment) to inform matching
- [ ] **Network-aware search** — track the user's professional network and flag when connections work at companies with open roles
- [ ] **Funding signal monitoring** — watch for recently funded startups in preferred domains (Crunchbase, TechCrunch, etc.)
- [ ] **Conference/meetup calendar integration** — surface hiring events, career fairs, and networking opportunities
- [ ] **"Companies like X"** — when the user loves a company, automatically find similar ones (same domain, size, culture, tech stack)
- [ ] **Passive monitoring mode** — lightweight scheduled runs that only alert when high-match offers appear (vs. full search runs)

### Better Outputs
- [ ] **Application tracker** — track which offers the user actually applied to, interview stages, outcomes — feeds back into the preference model
- [ ] **Cover letter drafts** — generate tailored cover letters based on CV + offer + company intelligence (with user approval)
- [ ] **Interview prep** — when the user gets an interview, generate prep material based on the company dossier and role requirements
- [ ] **Weekly digest emails** — scheduled summaries sent via email (for users who don't run the skill daily)
- [ ] **Offer comparison view** — side-by-side comparison of top offers on dimensions that matter to the user

### Profile Intelligence
- [ ] **Skill trajectory visualization** — show how the user's skills have evolved over time based on what they're learning
- [ ] **Market positioning** — "your profile is strongest for X roles in Y locations" based on accumulated search data
- [ ] **Gap-closing recommendations** — "learning Z would unlock N more roles in your preferred domain" with specific courses/projects
- [ ] **Portfolio suggestions** — based on what offers ask for, suggest side projects that would strengthen applications

### Multi-User & Social
- [ ] **Anonymized benchmarking** — "users with similar profiles are seeing N offers/run in domain X" (opt-in)
- [ ] **Shared source contributions** — users can propose additions to `sources-general.yaml` via PR
- [ ] **Friend referral matching** — if user A finds a role that's better for user B, surface it

### Technical Improvements
- [ ] **Test suite** — unit tests for models, link validator, source validator, render pipeline
- [ ] **CI pipeline** — automated testing on PRs
- [ ] **Source health dashboard** — track which sources consistently yield results vs. which are dead weight
- [ ] **Offer deduplication** — detect the same role posted on multiple boards
- [ ] **Rate limiting / politeness** — respect robots.txt and rate-limit web fetches
- [ ] **Structured offer extraction** — parse salary, requirements, benefits from offer pages into structured data
- [ ] **Plugin architecture** — let users add custom search strategies or output formats

---

## Inspired By Other Projects

Ideas worth stealing from the ecosystem (see README for project links):

- **Score-then-filter pipeline** (LinkedInJobSniper, Job Search Agent Template) — score every offer 0-100 against the user profile, surface only high matches. Currently we use match tiers (excellent/very-good/good); a numeric score would enable sharper filtering and trend tracking.
- **"Claude fills, you submit"** (AI-Job-Coach) — the right philosophy. AI handles research, drafting, and analysis; human maintains agency over every decision. Already our approach, but worth making explicit.
- **Daily digest via GitHub Actions** (LinkedInJobSniper) — zero-cost scheduled runs that only alert when high-match offers appear. Could work as a lightweight "monitoring mode" between full search runs.
- **Anti-AI-writing detection** (AI-Job-Coach) — when generating cover letters or outreach messages, actively make them sound human. Relevant for future cover letter features.
- **Research-grounded methodology** (AI-Job-Coach) — Granovetter's weak tie theory, Spence's signaling theory. Our approach is intuition-driven; grounding it in career development research would add rigor.
- **Hybrid ML + LLM** (Smart Career Advisor) — trained classifier for fast consistent scoring + LLM for creative work. Could improve matching consistency across runs.
- **Notion/tracker integration** (Job Search Agent Template) — structured application tracking beyond our HTML catalogs.
- **Company intelligence profiles** — several tools build dossiers on companies (culture, tech stack, Glassdoor sentiment). Would make our matching much richer.

---

## Skill Health & Known Pitfalls

Issues identified through research and analysis. Some are fixed, some need investigation.

### Fixed (this session)
- **SKILL.md over 500 lines** — extracted Deep Search Tactics, New-User, Update-User to separate files (672 → 474 lines, ~30% token reduction)
- **Strategy suggestions agent ran in parallel with search agents** — moved to post-search (it depends on results)
- **No output format spec for agents** — added JSON schema requirement so Step 3 merge works reliably
- **Admin identity ambiguous** — added explicit resolution rule
- **No graceful degradation** — added failure handling instructions
- **Source maintenance checked all sources every run** — added priority based on `last_checked` date
- **Date not passed to search agents** — added explicit instruction to pass today's date

### Needs Investigation
- [ ] **`context: fork` vs filesystem writes** — known Claude Code issue where forked context writes may succeed in ephemeral sandbox then vanish. Need to verify whether `/job-search` file writes actually persist. If not, consider removing `context: fork` from frontmatter.
- [ ] **`context: fork` vs multi-turn conversation** — Step 7 (conversational feedback) requires back-and-forth with the user. If fork doesn't support this, the entire learning loop needs restructuring (e.g., output questions in final report, handle answers via `/job-search feedback` subcommand).
- [ ] **CLAUDE.md commit conflict** — global "ask before committing" may conflict with Step 6 auto-commit. Need to decide: override for skill runs, or always ask.
- [ ] **Agent count explosion** — with refinement sub-agents, a 2-user run could spawn 24+ agents. Consider making refinement conditional (only when initial results < 5 offers).
- [ ] **Nested subagents may not work** — Claude Code subagents cannot spawn other subagents. The "Agent Self-Refinement" pattern in `deep-search-tactics.md` (where each search agent spawns 2 sub-agents) may silently fail. Need to test. If confirmed, restructure as flat fan-out from the orchestrator instead.
- [ ] **Model routing for cost savings** — search worker agents could use Sonnet (cheaper) while the orchestrator stays on Opus. Set via `CLAUDE_CODE_SUBAGENT_MODEL` env var or `model` frontmatter field.
- [ ] **Worker return size** — search agents may return too much context, bloating the orchestrator. Cap worker summaries to ~2,000 tokens. Currently no explicit limit.
- [ ] **`allowed-tools` for read-only agents** — source maintenance and market trends agents should be restricted to `Read, Grep, Glob, WebFetch, WebSearch` to prevent accidental writes.

### Claude Code Skill Gotchas (general)
These apply to any Claude Code skill. Documented here for reference:
- **Brackets in YAML frontmatter** kill ALL slash commands, not just the broken one
- **Prettier reformats frontmatter** — add `# prettier-ignore` if using Prettier
- **Naming a command `/skill`** collides with built-in Skill tool
- **No hot-reload** — editing skills requires restarting the session (except `--add-dir` dirs)
- **15,000 char skill description budget** — too many skills = silent drops. Check with `/context`. Increase with `SLASH_COMMAND_TOOL_CHAR_BUDGET=30000`
- **Subagents don't inherit CLAUDE.md** — instructions are "documentation, not enforcement"
- **Subagents cannot spawn sub-subagents** — flat fan-out only, no nesting
- **Skills don't auto-trigger reliably** (~55% accuracy) — `disable-model-invocation: true` + manual `/command` is more reliable
- **Keep active context under 60% of window** (~120k tokens) to avoid context rot
- **Static content first in SKILL.md** — first 1,024 tokens should be stable for prompt caching

---

## Non-Goals

These are explicitly out of scope:

- **Auto-apply** — this tool helps you find and evaluate opportunities, not spam applications
- **LinkedIn automation** — no automated messaging, connection requests, or profile updates
- **Resume keyword stuffing** — CV suggestions are honest and based on real experience
- **Scraping at scale** — searches are targeted and respectful, not bulk crawling
