# Skillsmith Knowledge Base

Living document. Updated after each refinement session.
Read this at the start of every `/skillsmith` invocation.

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

8. **`argument-hint` belongs in command files only, not SKILL.md** — Only `commands/<name>.md` controls the hint shown in the Claude Code UI. The `argument-hint` in `SKILL.md` frontmatter is never displayed to users. Having it in both places causes silent drift — the command file shows stale flags while SKILL.md has the correct natural-language hint (or vice versa). **Fix:** keep `argument-hint` exclusively in `commands/<name>.md`. Remove it from all SKILL.md files. During refinement, check that the command file's hint matches the skill's current argument parsing section.

9. **Schema drift between reference files** — When multiple files define the same output format (e.g., JSON schema for agent results), they can silently diverge. Always have a single source of truth and point to it from secondary files rather than duplicating the schema.

10. **Broken file references after renames** — When user files or reference files are renamed/restructured, skills that reference the old names silently break. During health check, extract all file paths from SKILL.md and reference files and verify each exists on disk. This is CRITICAL, not just structural.

11. **Support files (README, ROADMAP) go stale** — When SKILL.md evolves, support files like README.md, ROADMAP.md, and architecture.md often aren't updated. Check these explicitly each refinement, not just SKILL.md.

12. **User data inside skill directory** — storing personal data (profiles, CVs, job offers) inside `~/.claude/skills/<skill>/` couples code to data, bloats the repo, and requires complex .gitignore rules. User data should live outside the skill tree entirely (path configured in `config.local.yaml`). The skill references the external path via a config constant (like `DATA_DIR`).

13. **Personal notes committed to published template** — `templates/knowledge.md` ships to every user who installs the plugin. Never add Per-Skill Notes or Refinement Log entries to the template. Those sections must stay blank (placeholder only). Only Pitfalls, Strategies, and References belong in the template — they are general knowledge. Per-skill observations and session history accumulate in the user's data copy (`$PLUGIN_DATA/skillsmith/knowledge.md`) and are never committed back to the plugin source.

14. **Silent `except` in evaluation or visualization code** — Skills that run an autonomous loop with an evaluation harness (autoresearch, benchmark suites, evaluator-in-the-loop skills) MUST forbid `except Exception: pass/continue` in the eval and visualization stack. A single silent except invalidates every keep/discard decision that followed it. Postmortem: v2 sales-forecast drifted for 800 approaches because its evaluator silently skipped crashed cutoffs and its visualizer fell back to `np.median(series.tail(9))` on failure. The score looked stable, the plots looked clean, and the entire run was theater. Crashes must be LOUD and recorded. Fail-fast is a property of the whole stack (loader + evaluator + visualizer), not any one file.

15. **Goodhart's Law at machine speed** — Any skill that runs an autonomous optimization loop against a fixed metric WILL overfit to that metric's quirks. Skills that optimize must: (a) pick a metric where gaming it and improving the underlying task are hard to distinguish, (b) add guard metrics that catch divergence, (c) enforce a `min_improvement` threshold below which "wins" are auto-discarded as noise, (d) reserve a hold-out test set the loop NEVER sees. Cerebras: *"we left an AI agent running overnight. By morning, it had stopped doing what we asked. It had gone off on its own side quest."* Without all four defenses, long-running autonomous skills drift off-task within hours.

16. **Noise as signal** — "Improvements" below inherent measurement noise (random seeds, VM contention, floating-point order-of-operations) aren't real. Autonomous optimization skills MUST enforce a `min_improvement` gate where `|new - best| < threshold` is auto-discarded regardless of direction. Rule of thumb: if two top candidates differ by less than 2% of the primary metric value, neither is reliably better — re-run on a fresh random seed before promoting. Seventy approaches deep, noise-as-signal dominates the leaderboard.

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
11. **CSO (Claude Search Optimization)** — Description fields are how Claude decides which skills to load. Use concrete triggers and symptoms, not abstract terms. Include error messages, tool names, and synonyms the user might say. When refining, check if the description contains terms someone would use when they need the skill.
12. **Subagent dispatch for I/O-heavy phases** — When a skill has bash-heavy setup (preflight checks, script location, running scripts) followed by user-interactive decisions, split into: (a) subagent for all I/O, returns a structured report; (b) main agent reads report and drives all user confirmation. Benefits: main context stays clean, user-confirmation gates are explicit, preflight failures stop cleanly before any interactive prompt. Extract subagent instructions to a reference file (e.g. check.md) and define a fixed return format the main agent can parse.

13. **Structured per-iteration memory for autonomous skills** — Autonomous skills that iterate (loops, benchmark suites, batch processors) cannot rely on conversation memory. Conversation memory doesn't survive autocompact, doesn't survive restarts, and causes the agent to repeat experiments it already tried 30 iterations ago. The fix: a structured state file (e.g. `results.json`, `state.json`) that the agent reads at the START of every iteration and appends to at the END. The state file is the source of truth; the agent's conversation memory is disposable. Reddit: *"without LOG.md and LEARNING.md, the agent repeats experiments it already tried. Forced logging after every run gives the agent memory across the infinite loop."*

14. **Immutable evaluation contract** — When an autonomous agent optimizes against a metric, the evaluator MUST be immutable after the user agrees to it. Otherwise the agent will edit the evaluator to "improve" more easily. Bake this in: put the evaluation code in a dedicated directory (e.g. `fixed/`), explicitly forbid modification in the skill's rules, and agree on the evaluation contract with the user during planning before any optimization runs. Immutability is the counter-defense to metric-gaming.

15. **Hook-enforced "never stop" for autonomous loops** — Skills that need to run until a user interrupt cannot rely on prose rules alone. LLMs rationalize their way out of "never stop" instructions over long sessions, especially after autocompact. The only reliable enforcement is a system-level Stop hook in `~/.claude/settings.json` that returns `exit 2` while a session marker file exists AND belongs to the current session (via `session_id` parsed from the hook's stdin JSON, NOT from `${CLAUDE_SESSION_ID}` which is not exposed as an env var). Prose rules degrade; hooks don't.

16. **Three-file handshake for complex contracts** — When a skill's design is complex enough that "here's what the agent should do" can't fit in one file, split into: (a) a short operational checklist ("which question to ask next") that the agent consults in flow, (b) a deep-content reference ("why each question matters, what the best answer looks like") the agent consults when the user pushes back or when drafting concrete artifacts, (c) a canonical spec reference ("the shape of the files produced by the discussion"). Autoresearch uses this pattern with `clarifying-questions.md` + `planning-protocol.md` + `session-init.md`. Keeps the operational flow lean without losing the depth.

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

_(none yet — notes accumulate here as you refine skills)_

## Refinement Log

Chronological record of all refinement sessions.

_(none yet — entries accumulate here after each session)_
