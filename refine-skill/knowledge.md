# Refine-Skill Knowledge Base

Living document. Updated after each refinement session.
Read this at the start of every `/refine-skill` invocation.

## Pitfalls

Things that break skills or degrade quality. Check every skill against these.

### Critical (will break things)

1. **Brackets in YAML frontmatter** — `[]` or `{}` in the description field kill ALL slash commands, not just the broken one. Use quotes or `>` folded scalar.
2. **SKILL.md over 15,000 chars** — Content beyond 15K is silently dropped. No warning.
3. **Subagents don't inherit CLAUDE.md** — Instructions a subagent needs must be repeated in the skill or passed explicitly.
4. **Subagents can't spawn sub-subagents** — Flat fan-out only. Don't design nested delegation.
5. **context: fork may not persist writes** — Files written in a forked context may vanish after the skill returns.
6. **"Never use X" without alternative** — Agent gets stuck. Always pair a prohibition with a concrete alternative.

7. **"Soft dead" links pass verification** — A URL that returns 200 but shows unrelated content (homepage, wiki, generic page) instead of the expected resource. Automated link checkers miss these. Require LLM verification that the page contains the expected content.

8. **`argument-hint` out of sync with actual modes** — The `argument-hint` YAML field controls the hint text shown in the Claude Code UI next to the slash command. When new modes are added to a skill, update `argument-hint` too or users won't discover them.

9. **Schema drift between reference files** — When multiple files define the same output format (e.g., JSON schema for agent results), they can silently diverge. Always have a single source of truth and point to it from secondary files rather than duplicating the schema.

10. **Broken file references after renames** — When user files or reference files are renamed/restructured, skills that reference the old names silently break. During health check, extract all file paths from SKILL.md and reference files and verify each exists on disk. This is CRITICAL, not just structural.

11. **Support files (README, ROADMAP) go stale** — When SKILL.md evolves, support files like README.md, ROADMAP.md, and architecture.md often aren't updated. Check these explicitly each refinement, not just SKILL.md.

12. **User data inside skill directory** — storing personal data (profiles, CVs, job offers) inside `~/.claude/skills/<skill>/` couples code to data, bloats the repo, and requires complex .gitignore rules. User data should live outside the skill tree entirely (e.g., `~/Documents/_me/references/`). The skill references the external path via a config constant (like `DATA_DIR`).

### Structural (degrades quality)

7. **Overloaded single SKILL.md** — Everything in one file = everything loaded every time. Extract reference material to separate files.
8. **Instruction overloading** — Too many unrelated requirements dilute attention. Group related instructions; split unrelated ones.
9. **Vague success criteria** — "Write a good X" vs. specific dimensions. Always specify what "done" looks like.
10. **Missing edge cases** — No argument handling, empty input, missing files. Add explicit error paths.
11. **@-file docs embed entire file every run** — Prefer "read path/to/docs.md" pattern.
12. **No verification steps** — Without "run X to confirm Y," errors propagate silently.

### Token Waste

13. **Repeating context available elsewhere** — If CLAUDE.md already says it, reference it.
14. **Verbose examples where a pattern suffices** — One good example beats three mediocre ones.
15. **Explaining obvious things** — Don't tell Claude what markdown is. Focus on what Claude gets wrong.

## Strategies

What works well when building and refining skills.

1. **SKILL.md as table of contents** — Keep it lean. Point to detail files.
2. **Static content first** — First ~1,024 tokens should rarely change (prompt caching).
3. **Document what Claude gets wrong** — Not comprehensive manuals. Focus corrections on observed failures.
4. **Clear success criteria per step** — "After this, file X should contain Y" or "run Z to verify."
5. **CLI tools for deterministic ops** — Python scripts for rendering, validation, link checking.
6. **Few-shot examples over abstract rules** — Show the exact format once.
7. **Organize by function (modes), not chronology** — Each mode is self-contained.
8. **Keep active context under 60% of window** — ~120K tokens.
9. **Argument parsing first** — Resolve mode/target before loading anything mode-specific.
10. **Ask before committing** — Matches user preference, avoids unwanted side effects.

## References

Curated resources on skill design and prompt optimization. Refined over successive runs.

- Self-Refine (Madaan et al.) — generate/feedback/improve loop: https://github.com/madaan/self-refine
- Microsoft PromptWizard — self-evolving prompt optimization: https://github.com/microsoft/PromptWizard
- Iterative Prompt Skill Refinement pattern: https://github.com/nibzard/awesome-agentic-patterns/blob/main/patterns/iterative-prompt-skill-refinement.md
- Claude Code Skills Marketplace (includes skill quality review): https://github.com/daymade/claude-code-skills
- Claude Code Best Practices (community compilation): https://rosmur.github.io/claudecode-best-practices/
- Anthropic official skill best practices: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Self-Improving Claude Code Skills (video): https://www.youtube.com/watch?v=wQ0duoTeAAU
- AutoPDL — automatic prompt optimization for LLM agents (IBM): https://arxiv.org/pdf/2504.04365
- Claude meta-skill collection: https://github.com/YYH211/Claude-meta-skill

## Per-Skill Notes

Observations about specific skills. Updated after refinements.

### career
- ~216 lines, ~13.4K chars — WARN (approaching 15K truncation limit, monitor)
- Renamed from `job-search` in v2.0.0 (2026-03-25). Absorbed the `note` skill as `/career note` mode.
- User data externalized from `users/<handle>/` to `~/Documents/_me/references/career/<handle>/` (outside skill dir)
- User template moved from `users/_example/` to `templates/user-template/`
- Python package renamed from `job_search` to `career`; CLI commands from `js-*` to `career-*`
- Extracted to: clean-mode.md, learning-loop.md, search-agents.md, update-phase.md, final-report.md, comments-processing.md, new-user-flow.md, update-user-flow.md
- Has Python package for deterministic ops (good pattern)
- Uses `context: fork` — writes in fork may not persist (pitfall #5)
- Complex multi-user system with learning loops (young, few runs)
- Support files (README.md) tend to go stale when SKILL.md evolves — check each refinement
- **SCOPE: search and discovery only.** User explicitly does not want application help (resume tailoring, ATS optimization, cover letters). Do NOT propose application-related features when refining this skill.

### report
- 195 lines, ~8.1K chars — healthy size
- Good patterns: modes, anti-AI rules, verification steps
- Extracted reference material to context/ directory

### agent
- 62 lines, ~2.2K chars — healthy size
- Multi-mode with clear format specifications

### setup
- 248 lines, ~10.5K chars — WARN (size, but well under 15K)
- Good: extracted architecture to separate file
- Has verification with PASS/FAIL output
- Has `/setup scan` mode to capture live state (MCP servers, plugins, skills) → updates architecture.md for cross-machine sync
- Expected state (MCP servers, plugins) lives in architecture.md, not hardcoded in SKILL.md — single source of truth

### refine-skill
- 164 lines, ~7.4K chars — healthy size
- Uses knowledge.md + analysis.md reference files
- Tidy Mode (`tidy-only`) replaces the former standalone `tidy-skills-repo` skill (deleted 2026-03-25)
- All Mode now uses plan-then-apply: proposes changes for all skills first, then applies after approval

## Refinement Log

Chronological record of all refinement sessions.

### 2026-03-16 — Full audit (all 8 skills)
- **job-search**: CRITICAL fix — extracted 4 sections to reference files (31K → 12.5K chars)
- **note**: fixed broken file references (Summary.md → removed, Learning path.md → Direction.md)
- **setup**: fixed stale file reference (Summary.md → Direction.md)
- **report**: removed self-contradicting em dash in ban rule, added pandoc install check
- **agent**: simplified cross-platform path, added write verification, renumbered steps
- **myplay**, **tidy-skills-repo**, **refine-skill**: no changes needed
- Pattern observed: `Summary.md` was referenced in 3 skills but never existed — likely a renamed/removed file

### 2026-03-18 — Full audit (8 skills, context7-mcp deleted)
- **context7-mcp**: deleted — redundant with MCP server tool descriptions
- **job-search**: trimmed SKILL.md (236→178 lines, 13.5K→9.6K chars). Removed shared resources tree, extracted final report to `final-report.md`, consolidated bottom pointer sections into reference table. Replaced deprecated "Top 10" report format with "Run delta" (new/removed/totals).
- **agent**: removed Unix-only fallback path from chat file description
- **myplay**, **note**, **report**, **setup**, **sync-skills**, **refine-skill**: no changes needed
- Pattern observed: fixed-count report formats ("Top 10") become awkward when catalogs are small (<15 offers). Use delta-based reporting instead.

### 2026-03-18 — Full audit (8 skills)
- **job-search**: deleted orphaned `career-reference.md`, fixed nested subagent pattern in `deep-search-tactics.md` (moved to flat fan-out in `search-agents.md`), aligned output format schema, updated stale `Dashboard.html` references in README.md and ROADMAP.md
- **setup**: updated stale `architecture.md` — added 3 missing skills to table, removed dead `career/` reference, updated directory tree
- **agent**, **myplay**, **note**, **report**, **sync-skills**, **refine-skill**: no changes needed
- Pattern observed: support files (README, ROADMAP, architecture.md) go stale when SKILL.md evolves — check these explicitly each refinement, not just SKILL.md itself
- New pitfall candidate: reference files with their own output format schemas can drift from the canonical schema in the main spec file. Always have a single source of truth and point to it.

### 2026-03-25 — Full audit (8→7 skills)
- **refine-skill**: simplified argument parsing (removed `self` and `push`, merged `<name>` and `<name> apply`), embedded self-refinement logic into Step 1, changed tidy argument to `tidy-only`, All Mode now uses plan-then-apply workflow
- **tidy-skills-repo**: DELETED — fully redundant with `/refine-skill tidy-only`
- **job-search**: extracted comments.json processing (~2.5K chars) to `reference/comments-processing.md` (14,984→~12,500 chars, was dangerously near 15K truncation)
- **report**: added Quarto 1.8+ features to tips (brand support, PDF accessibility, Typst, lualatex)
- **setup**: deduplicated identical Windows/Linux MCP templates into single block
- **agent**, **note**: no changes needed
- Research: Quarto 1.8+ (brand, PDF/A, Typst), Claude Code skill char budget = 2% of context window, hooks for guaranteed execution, A2A/ACP protocols (not relevant for lightweight agent skill)
- Pattern observed: user prefers unified plan-then-apply over per-skill apply in All Mode
