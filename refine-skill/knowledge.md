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
- ~550 lines, ~32K chars — CRITICAL: over 15K limit, content likely truncated
- Has Python package for deterministic ops (good pattern)
- Uses `context: fork` — writes in fork may not persist (pitfall #5)
- Complex multi-user system with learning loops

### report
- 164 lines, ~6.4K chars — healthy size
- Good patterns: modes, anti-AI rules, verification steps
- Extracted reference material to context/ directory

### myplay
- 34 lines, ~1.5K chars — minimal, focused
- Single purpose, clear steps

### note
- 31 lines, ~1.3K chars — minimal, focused
- Single purpose, clear steps

### agent
- 66 lines, ~2.3K chars — healthy size
- Multi-mode with clear format specifications

### setup
- 123 lines, ~4.8K chars — healthy size
- Good: extracted architecture to separate file
- Has verification with PASS/FAIL output

## Refinement Log

Chronological record of all refinement sessions.

(No entries yet — grows with use.)
