# Experiment Loop Protocol

Full protocol for the autonomous experiment loop.

## The Loop

LOOP FOREVER (or until user interrupts):

### 1. REVIEW (thinking only, no tool call needed)
Read results.json. Identify:
- What has been tried (all statuses, including crashes)
- What has NOT been tried (paradigm gaps)
- Which approaches came closest (even if discarded)
- Patterns: what seems to help? what seems to hurt?
- User ideas queue: any unexplored suggestions?

### 2. HYPOTHESIZE (thinking only, no tool call needed)
Form a specific hypothesis:
> "I believe <approach> will improve <metric> because <reason>.
> This has not been tried because <gap>."

Strategy:
- Prefer breadth early (explore different paradigms)
- Depth later (refine what works)
- When stuck: combine near-misses, try opposites, revisit user ideas,
  try radically different paradigms, look at bibliography for inspiration
- Do NOT self-censor ideas that "probably won't beat the best." Try them.

### 3. WRITE (tool call 1: Write)
Write `approaches/<NNN>_<name>/approach.py`:
- Implement `run(data)` cleanly
- Self-contained, no hardcoded paths
- Put your hypothesis and analysis in the **docstring**, not in message text
- If based on a paper/resource, create `references.md` in the same dir

### 4. EVALUATE (tool call 2: Bash)

**CRITICAL: This is ONE Bash call. Nothing else.**

```bash
cd <session_dir> && python3 eval_and_record.py approaches/<NNN>_<name>
```

`eval_and_record.py` handles everything:
1. Loads and runs the approach
2. Computes scores and metrics
3. Writes scores.json and metrics.json
4. Generates visualization via fixed/visualize.py
5. Determines keep/discard
6. Git commits the approach
7. Regenerates progress.png
8. Appends to report.md experiment log
9. Updates README.md stats
10. Updates .loop-state
11. Git commits progress files
12. Prints one-line result

**NEVER do any of these as separate tool calls.** If you find yourself writing
matplotlib code, running git commands, or updating report.md outside of
eval_and_record.py, STOP. You are creating exit points that break the loop.

### 5. GOTO 1 (THIS IS MANDATORY)

When Bash output appears, your response MUST follow this EXACT structure:

```
**NNN: KEEP/DISCARD** (score). [One sentence about what to try next.]
<Write tool call for NEXT approach>
```

That is it. Nothing else. No analysis paragraph. No "key learnings" list.
No summary table. Those go in the approach.py docstring.

**The iteration is exactly 2 tool calls:**
1. **Write** the approach file (step 3)
2. **Bash** eval_and_record.py (step 4)

Repeat forever. Write, Bash, Write, Bash, Write, Bash.

## Anti-Patterns (FORBIDDEN)

### Separate plot generation
```
# WRONG - creates exit point
Write: approach.py
Bash: python3 eval_and_record.py approaches/005_foo
Bash: python3 -c "import matplotlib; ..."  # <-- EXIT POINT
Write: next approach
```

```
# CORRECT - eval_and_record.py handles everything
Write: approach.py
Bash: python3 eval_and_record.py approaches/005_foo
Write: next approach  # immediately
```

### Separate git commits
```
# WRONG
Bash: python3 eval_and_record.py approaches/005_foo
Bash: git add . && git commit -m "..."  # <-- EXIT POINT
```

### Progress summaries in message text
```
# WRONG
**005: KEEP** (0.891). Here's a summary of what we've learned so far:
- Attention mechanisms work well on this data type
- Feature scaling doesn't help because...
[agent stops here because message ends in text]

# CORRECT
**005: KEEP** (0.891). Try multi-head attention next.
<Write tool call>
```

## Self-Check Before Sending

Before sending your message, verify:
1. Last content block is a tool_use (not text)
2. Message text is at most 2-3 lines
3. No analysis, summaries, or "key learnings" in message text
4. All analysis is in the approach.py docstring

## Approach Naming

| Situation | Folder name |
|-----------|-------------|
| Normal | `003_relu_instead_of_gelu` |
| Crash | `005_deep_mlp` (status in scores.json) |
| Baseline | `001_baseline` |

Use `NNN_descriptive_name`. Score is in scores.json, not the folder name.

## Consecutive Discard Escalation

| Discards | Action |
|----------|--------|
| 5 in one category | Switch to a different paradigm category |
| 10 across all categories | Invent a NEW category |
| 20+ | Re-read entire results.json, combine near-misses, try radical ideas |

**After 50+ approaches:** Mine the log for second-order insights (combinations).
**After 100+ approaches:** You are doing exactly what the user asked. Keep going.

## Approach Completion Gate

Before moving to the next approach, eval_and_record.py output must NOT
contain `!! INCOMPLETE`. If it does, diagnose and fix the missing artifact
before writing the next approach. Common fixes:
- Plots missing: check if fixed/visualize.py has a bug, re-run
- Scores missing: check if evaluate() threw an exception
- Never skip a broken approach to move on. Fix it first.

## Autocompact Recovery

If you notice context was compressed (you don't remember recent approaches):
1. Read `.autoresearch-directives` - core rules
2. Read `.loop-state` - where you left off
3. Read `results.json` - full approach history (focus on last 10)
4. Read `experiment-plan.md` - task definition
5. Resume the loop from the next approach number
