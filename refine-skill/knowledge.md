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

10. **Support files (README, ROADMAP) go stale** — When SKILL.md evolves, support files like README.md, ROADMAP.md, and architecture.md often aren't updated. Check these explicitly each refinement, not just SKILL.md.

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

### job-search
- ~175 lines, ~9.6K chars — OK (was 31K CRITICAL → 12.5K → 9.6K)
- Extracted to: clean-mode.md, learning-loop.md, search-agents.md, update-phase.md, final-report.md
- Has Python package for deterministic ops (good pattern)
- Uses `context: fork` — writes in fork may not persist (pitfall #5)
- Complex multi-user system with learning loops (young, few runs)
- Nested subagent pattern was broken (pitfall #4) — restructured to flat fan-out in 2026-03-18
- `career-reference.md` deleted as orphaned (2026-03-18) — content was superseded by other reference files
- Support files (README.md, ROADMAP.md) tend to go stale when SKILL.md evolves — check each refinement
- **SCOPE: search and discovery only.** User explicitly does not want application help (resume tailoring, ATS optimization, cover letters). Do NOT propose application-related features when refining this skill.

### report
- 166 lines, ~6.5K chars — healthy size
- Good patterns: modes, anti-AI rules, verification steps
- Extracted reference material to context/ directory

### myplay
- 34 lines, ~1.5K chars — minimal, focused
- Single purpose, clear steps

### note
- 29 lines, ~1.2K chars — minimal, focused
- Single purpose, clear steps
- Had stale file references (Summary.md, Learning path.md) — fixed 2026-03-16

### agent
- 62 lines, ~2.2K chars — healthy size
- Multi-mode with clear format specifications

### setup
- 123 lines, ~4.8K chars — healthy size
- Good: extracted architecture to separate file
- Has verification with PASS/FAIL output

### sync-skills
- 101 lines, ~3.2K chars — healthy size
- Well-structured 8-step workflow with safety checks

### refine-skill
- 128 lines, ~4.9K chars — healthy size
- Uses knowledge.md + analysis.md reference files

## Refinement Log

Chronological record of all refinement sessions.

### 2026-03-16 — Full audit (all 8 skills)
- **job-search**: CRITICAL fix — extracted 4 sections to reference files (31K → 12.5K chars)
- **note**: fixed broken file references (Summary.md → removed, Learning path.md → Direction.md)
- **setup**: fixed stale file reference (Summary.md → Direction.md)
- **report**: removed self-contradicting em dash in ban rule, added pandoc install check
- **agent**: simplified cross-platform path, added write verification, renumbered steps
- **myplay**, **sync-skills**, **refine-skill**: no changes needed
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
