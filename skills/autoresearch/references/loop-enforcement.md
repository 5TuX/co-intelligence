# Loop Enforcement

Mechanisms that enforce the never-stop behavior at the system level,
beyond prompt instructions. Create ALL survival files during session init.

## 1. Stop Hook (MOST RELIABLE - recommended setup)

A Claude Code Stop hook that blocks the agent from stopping while
`.loop-active` exists AND belongs to the current session. When the hook
returns exit code 2, Claude is forced to continue. The stderr message
is injected as context.

### Instance Isolation

`.loop-active` contains the `${CLAUDE_SESSION_ID}` of the session that
started the loop. The Stop hook compares this against the current session
ID. Only the instance that owns the loop is blocked - other Claude Code
instances pass through freely.

**Setup** (add to the `Stop` array in `.claude/settings.json`):

```json
{
  "matcher": "",
  "hooks": [
    {
      "type": "command",
      "command": "INPUT=$(cat); CURRENT_SID=$(printf '%s' \"$INPUT\" | jq -r '.session_id // empty' 2>/dev/null); [ -z \"$CURRENT_SID\" ] && exit 0; for f in ~/.claude/plugins/data/*/autoresearch/*/.loop-active; do [ -f \"$f\" ] || continue; SID=$(head -1 \"$f\" | tr -d '\\r\\n'); [ -n \"$SID\" ] && [ \"$SID\" = \"$CURRENT_SID\" ] || continue; DIR=$(dirname \"$f\"); echo \"AUTORESEARCH LOOP ACTIVE in $DIR. Never stop. Once the last trial is completed, immediately write the next trial and run it. Read $DIR/.autoresearch-directives if you need to recover context.\" >&2; exit 2; done"
    }
  ]
}
```

**Dependency:** `jq` must be installed (`apt install jq` / `brew install jq`).
The hook parses Claude Code's stdin JSON to get the current session ID.

**Important notes:**

- **Must be in settings.json, NOT in a plugin hooks.json.** Plugin-installed
  Stop hooks with exit code 2 fail silently (GitHub #10412). settings.json
  hooks work correctly.
- **Instance-isolated via session ID.** Claude Code sends a JSON payload
  on stdin for every Stop event, including `{"session_id": "..."}`. The
  hook parses it with `jq`, reads the session ID from the first line of
  `.loop-active`, and only blocks if both are non-empty and equal. Other
  Claude Code instances (unrelated chats, setup sessions, code reviews)
  pass through freely because their session IDs don't match.
- **Non-empty guards are mandatory.** If `.loop-active` is empty or the
  stdin JSON lacks a session ID, the hook must fall through — otherwise
  empty-string collisions would block unrelated sessions. The `-n` checks
  in the command above enforce this.
- **Does NOT check `stop_hook_active`.** This is intentional. We want to
  block EVERY stop attempt as long as `.loop-active` exists for this session.
- **Exit code 2 displays as "Stop hook error"** in the Claude Code UI
  (GitHub #34600). This is cosmetic - the hook is working correctly.
  The stderr message still reaches the agent as continuation instructions.
- **Project-level sessions:** If the session lives in a project directory
  (not plugin data), add a project-specific Stop hook in `.claude/settings.json`
  that checks the project path, using the same session ID comparison pattern.

### Stop Hook Installation Check

The skill MUST verify the Stop hook is installed during both new session
init and resume. If not installed, the skill should:

1. Print a clear warning that the loop has NO technical enforcement
2. Offer to install via the `update-config` skill
3. Proceed anyway (the loop still works, just without the safety net)

The hook is the ONLY defense that survives context compression AND
operates at the system level. Without it, all enforcement is prompt-based
and will eventually degrade in long sessions.

## 2. .claude/CLAUDE.md (SURVIVES AUTOCOMPACT)

Create `.claude/CLAUDE.md` inside the experiment directory at session init.
CLAUDE.md files are ALWAYS loaded into the system context, surviving any
context compression. This is the most reliable persistence mechanism.


```bash
mkdir -p "$SESSION_DIR/.claude"
cat > "$SESSION_DIR/.claude/CLAUDE.md" << 'EOF'
# Autoresearch Loop Active

You are running an autonomous research loop. Core rules:

## Per-iteration contract (4 tool calls, in order)

1. **Write** `approaches/<PREV>/commentary.md` (skip on iteration 1).
   Fields: Result, Vs. hypothesis, Visualization, Vs. bibliography, Lessons.
2. **Write** `approaches/<NNN>/rationale.md`.
   Fields: Idea, Hypothesis, Builds on (cite bibliography.md entries by
   BibTeX key if the trial is based on them), What we'll learn.
3. **Write** `approaches/<NNN>/approach.py`.
4. **Bash** `eval_and_record.py approaches/<NNN>` (background if
   estimated > background_threshold_seconds).

## Never stop

- NEVER STOP. Only the user stops the loop. If they say "stop" /
  "pause" / "that's enough", run `rm .loop-active` in the same turn,
  acknowledge briefly, end.
- NEVER pause to ask "should I keep going?" or write progress summaries.
- Message format after Bash: `**NNN: KEEP/DISCARD** (score). [Next idea.]`
  followed by the next tool call. Two lines max.

## Artifact handling

- ALL visualization, git commits, report updates, and README updates
  are handled by `eval_and_record.py`. NEVER do these as separate tool
  calls — they are exit points.
- Per-iteration, you ONLY write: commentary.md (previous), rationale.md
  (new), approach.py (new). Everything else is produced by
  `eval_and_record.py`.
- BEFORE writing commentary/rationale: read the previous trial's
  `visualization.png`, `scores.json`, `metrics.json`,
  `training_progress.json`, `live.log`. You are multimodal — the
  visualization is often the most informative.

## Sidecar discipline

- `rationale.md` — written BEFORE `approach.py`. Cite bibliography
  entries by BibTeX key when applicable.
- `commentary.md` — written AFTER eval, on the NEXT iteration.
  Reassess the rationale's hypothesis and any cited papers.
- Analysis lives in sidecars, not in message text.

## Live logging

- Every `approach.py` defines `_log()` helper that writes to `live.log`
  AND stdout with `flush=True`.
- Training loops call `_log()` at start, each epoch, and completion.
- Iterative training also writes `training_progress.json` per epoch.
- Eval launches redirect stdout+stderr to `live.log` via
  `> approaches/<NNN>/live.log 2>&1`.

## Runtime management

- Estimate runtime in thinking mode before launching.
- If > `background_threshold_seconds` (from loop-settings.json): use
  `run_in_background: true` and monitor `training_progress.json` every
  30-60s. Soft-kill (pkill/wmic) if diverging or over budget.
- Save model checkpoints every epoch. Warm-start from prior
  approaches' checkpoints when architectures match. Per-approach
  `.gitignore` auto-excludes weights from git but keeps them on disk.
- Use Optuna for hyperparameter tuning when the approach has tunable
  knobs (10-30 trial studies).

## Plateau handling

- If eval prints `!! SEARCH_NEEDED`: delegate to
  `co-intelligence:bibliography` in micro-mode (1 wave, target from
  `loop-settings.json`). Append discovered papers to `bibliography.md`.
  Generate new approach ideas grounded in the papers. Then continue.
- Never substitute generic web search for the bibliography delegation.
- After 5 discards in one paradigm: rotate to a different category.
  After 10 across all categories: invent a new category.

## Forbidden words

Never use during the loop: *converging*, *plateau*, *exhaustive*,
*well-optimized*, *structural bottleneck*, *key findings*,
*key learnings*, *confirmed optimal*. These are rationalization
vectors for stopping.

## Forbidden patterns (fail-fast contract)

These turn the loop into theater. Never introduce them in
`approach.py`, `fixed/evaluate.py`, `fixed/visualize.py`, or
`eval_and_record.py`.

- NEVER write bare `except Exception: pass` or `except Exception: continue`
  in evaluate.py or visualize.py. Crashes must be loud and recorded,
  not silently skipped.
- NEVER fall back to a synthetic prediction (median, mean, zero,
  last value) when the real model raises. A crashed approach scores
  at the worst possible value for the primary metric direction
  (`+inf` if lower is better, `-inf` if higher is better), not a
  neutral middle.
- NEVER render a visualization that fabricates data for failed
  timesteps. If the model couldn't predict at a cutoff, the plot
  must show the crash (empty, red marker, explicit annotation), not
  an imputed line.
- PREFER guard clauses (precondition checks) over try/except
  catch-alls. Example: if a model crashes on constant inputs, check
  `np.ptp(y) > 1e-12` before calling it and return a well-defined
  constant forecast, not a try/except wrapping the call.
- A single silent `except` in the eval stack invalidates every
  keep/discard decision that followed it. This is how v2 drifted for
  800 approaches.

## Reading order on context recovery

If you lose context after autocompact, read these in order:
1. `.autoresearch-directives` — core rules (this file, short version)
2. `.loop-state` — where you left off
3. `loop-settings.json` — current loop tuning
4. `results.json` — full approach history
5. Last 2-3 `approaches/<NNN>/commentary.md` files — recent thinking
6. `experiment-plan.md` — task definition
EOF
```

## 3. .autoresearch-directives (context recovery checkpoint)

Written at session start. If the agent loses context after autocompact,
reading this file restores the directives and current position. Short
version of `.claude/CLAUDE.md` — the numbered rule list without the
sectioned framing.

```bash
cat > "$SESSION_DIR/.autoresearch-directives" << 'EOF'
# Autoresearch core directives — read this if you lost context

1. NEVER STOP. Only the user stops the loop. Say "stop" → `rm .loop-active`.
2. Each iteration: Write commentary.md (previous), rationale.md (new),
   approach.py (new), Bash eval_and_record.py. Skip commentary on iteration 1.
3. Cite bibliography.md entries by BibTeX key in rationale.md Builds on
   and commentary.md Vs. bibliography. Both sidecars are 5-15 lines.
4. ALL visualization, git, reporting is in eval_and_record.py. NEVER do
   them as separate tool calls — they are exit points.
5. Analysis lives in sidecars, not message text. Message format:
   `**NNN: KEEP/DISCARD** (score). [Next idea.]\n<tool call>`
6. BEFORE each trial: read the previous visualization.png and artifacts.
   You are multimodal. Visual analysis drives better hypotheses.
7. Every approach.py has `_log()` helper. Training writes training_progress.json
   per epoch. Eval redirects stdout+stderr to live.log.
8. For long trials (> background_threshold_seconds from loop-settings.json):
   run eval in background, monitor training_progress.json.
9. Save checkpoints every epoch. Warm-start from prior approaches when
   architectures match. Per-approach .gitignore auto-excludes weights.
10. If eval says `!! SEARCH_NEEDED`: delegate to co-intelligence:bibliography
    (micro-mode, 1 wave), append discoveries to bibliography.md, generate
    new ideas from them. Never substitute generic web search.
11. If eval says `!! MISSING_RATIONALE`: write rationale.md (Idea, Hypothesis,
    Builds on, What we'll learn) and re-run.
12. If eval says `!! RESEARCH_INCOMPLETE`: delegate to co-intelligence:bibliography
    in short-form mode to seed bibliography.md with ≥10 entries.
13. After 5 consecutive discards: rotate paradigm category. After 10: invent
    a new category. Paradigm list is in loop-settings.json.
14. FAIL-FAST: no bare `except` in eval/viz; no synthetic fallbacks when the
    model crashes (score at worst value); no imputed visualizations.
15. Forbidden words: converging, plateau, exhaustive, well-optimized,
    structural bottleneck, key findings, key learnings, confirmed optimal.

Reading order on context recovery:
1. This file   2. .loop-state   3. loop-settings.json   4. results.json
5. Last 2-3 commentary.md files   6. experiment-plan.md
EOF
```

## 4. .loop-state (position checkpoint)

Updated automatically by `eval_and_record.py` after each approach.
Contains: last approach number, best score, total count.

If the agent loses context, it reads `.loop-state` + `results.json` to
know exactly where it left off.

## Autocompact survival strategy

Context compression (autocompact) can strip skill instructions from
the conversation window. Known limitations (mid-2026):

- Context buffer is ~33K tokens (16.5% of 200K window)
- `UserPromptSubmit` hook does NOT fire after compaction (GitHub #26597)

**The Stop hook and the survival files solve two different problems.**
Do not conflate them:

- **Stop enforcement** — only the Stop hook prevents the loop from
  ending. CLAUDE.md and `.autoresearch-directives` are prose rules
  the agent can read, but prose doesn't physically block a Stop
  event. If the hook is missing or broken, the loop has no real
  enforcement regardless of how many survival files exist.
- **Content recovery** — CLAUDE.md, `.autoresearch-directives`, and
  `.loop-state` exist so that after autocompact strips SKILL.md from
  the window, the agent can re-read them and remember WHAT to do next
  (how the loop works, where it left off, which file to touch). They
  tell the agent what to do; they don't stop it from stopping.

Both layers are necessary. CLAUDE.md survives autocompact because
Claude Code always reloads it into system context;
`.autoresearch-directives` is a file the agent reads on demand;
`.loop-state` is the position checkpoint.

### Reading order on context recovery

If the agent notices context was compressed (doesn't remember recent
approaches), it should read these files before continuing, in order:

1. `.autoresearch-directives` — core rules (short)
2. `.loop-state` — where it left off (last approach #, best score)
3. `loop-settings.json` — current loop tuning
4. `results.json` — full approach history
5. Last 2-3 `approaches/<NNN>/commentary.md` files — recent thinking
6. `experiment-plan.md` — task definition (immutable)

## Stopping the loop

The loop stops when `.loop-active` is removed from the session directory.
The Stop hook only checks for file presence and session ID — nothing else.
There are two equivalent ways to remove the file:

1. **Natural-language stop (the primary path).** The user types *"stop"*,
   *"pause"*, *"that's enough"*, *"I'm done"*, or any equivalent. The agent
   recognizes this as a stop signal, runs `rm "$SESSION_DIR/.loop-active"`
   via Bash in the same turn, acknowledges briefly, and ends the turn. The
   hook finds no file on the next stop attempt and passes through. This is
   how stopping normally works during a session.

2. **Manual shell (the escape hatch).** Run
   `rm ~/.claude/plugins/data/*/autoresearch/<tag>/.loop-active` in any
   terminal. Always available, independent of Claude Code state. Useful
   when the agent is mid-trial and you want to intervene directly.

Both do the same thing: they remove the file the Stop hook gates on. The
session directory, results, approaches, and report are all preserved.
Restart by saying *"resume <tag>"* or *"continue that session"* —
natural language only.

**The hook does not read message text.** The agent-driven path works
because the agent has been trained to translate natural-language stop
requests into the `rm` operation *before* attempting to end its turn.
This is a feature, not a workaround: the user stops the loop
conversationally while enforcement stays purely file-based.
