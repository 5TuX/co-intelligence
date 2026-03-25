# refine-skill — Refinement History

## 2026-03-25 (b)
- Changes: enforced data separation principle — added structural check 10 to analysis.md, added rule to SKILL.md, updated tidy steps 7c/7e (removed outdated `users/` references, replaced with data separation violation scan), removed step 7g (no nested user repos), added pitfall 12 to knowledge.md
- Before: 161 lines, 7,642 chars
- After: ~158 lines, ~7,600 chars
- User feedback: "refine-skill must enforce principle of separation between skills and skill data"

## 2026-03-25
- Changes: removed `self` argument (embedded self-refinement into Step 1), removed push logic, merged `<name>` and `<name> apply` into single flow, renamed tidy argument to `tidy-only`, All Mode now plan-then-apply
- Before: 4,899 chars, 128 lines
- After: ~7,400 chars, 164 lines
- Research: Claude Code skill char budget = 2% of context window, hooks for guaranteed execution, prompt-as-contract pattern
- User feedback: prefers "tidy-only" over "tidy", wants unified plan before applying, simplify redundant options

## 2026-03-16
- Changes: none — skill is healthy, successfully refined all 8 skills this session
- Size: 4,899 chars, 128 lines
- User feedback: no issues reported
