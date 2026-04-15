---
name: autoresearch
description: Use when running autonomous iterative research on any well-defined task. Adapts Karpathy's autoresearch workflow - guides the user to design the experiment, then an AI agent tests approaches in a sandbox forever, logs everything (even failures), and never stops until the user says so.
argument-hint: 'describe a task, list sessions, or resume an existing one — all natural language'
---

# Autoresearch

Autonomous iterative research loop adapted from Karpathy's autoresearch
(https://github.com/karpathy/autoresearch). Guides you through designing
a rigorous experiment, then runs a NEVER-STOP loop testing approaches in a
sandbox, logging everything, and producing a living research report.

---

## PRIME DIRECTIVE

**YOU DO NOT STOP. EVER. The user tells you when to stop. Nothing else does.**

- Do NOT pause to ask the human if you should continue.
- Do NOT summarize progress and wait for a response.
- Do NOT write analysis paragraphs in message text.
- Do NOT offer choices about direction.
- Do NOT end a message with text. End it with a tool call.
- Do NOT worry about context window. Auto-compact handles it.
- Do NOT decide the loop is "done." You are a hypothesis generator.
  Deciding when to stop is the user's job, not yours.

**What stops the loop:** Only one thing — the user asks you to stop. When
they do, you delete `$SESSION_DIR/.loop-active` via Bash in the same turn,
acknowledge briefly, and end the turn. See §Stopping the loop for details.

Nothing else stops the loop. Not "diminishing returns." Not "I've explored
all directions." Not a fixed approach count. Not a time budget. The Stop
hook enforces this mechanically: until `.loop-active` is gone, every
turn-end is blocked and you are forced to write the next approach.

**Obligation contract:** Finishing approach N means you OWE approach N+1.

---

## Core Loop Contract

**Each iteration = exactly 2 tool calls. No exceptions.**

```
TOOL 1 (Write): approaches/<NNN>_<name>/approach.py
TOOL 2 (Bash):  cd <session_dir> && python3 eval_and_record.py approaches/<NNN>_<name>
```

For long trials (>60s estimated): use `run_in_background: true` on the Bash
call. Monitor `training_progress.json` while waiting. Soft-kill if stalled or
projected time far exceeds budget. When notified of completion, process result.

`eval_and_record.py` handles EVERYTHING after the approach is written:
evaluation, scoring, keep/discard, visualization, git commit, progress.png,
report.md update, README update, .loop-state update.

**NEVER do any of these as separate tool calls:**
- Generate or save plots
- Git add/commit
- Update report.md, README.md, or progress.png
- Run matplotlib or any visualization code

If you catch yourself writing code for any of the above outside
eval_and_record.py, STOP. You are creating an exit point.

Read `references/experiment-loop.md` for the full loop protocol including
anti-patterns, self-check rules, and escalation strategy.

---

## Rules

### NEVER rules

- Do NOT modify `fixed/evaluate.py` or `fixed/data_prep.py` after session starts.
- Do NOT stop the loop. See PRIME DIRECTIVE.
- Do NOT ask "should I keep going?" or write progress summaries in message text.
- Do NOT end a message with text as the last content block. Last block MUST be tool_use.
- Do NOT self-censor approach ideas because they "probably won't improve the score."
- Do NOT use these words during the loop: "converging", "plateau", "exhaustive",
  "well-optimized", "structural bottleneck", "key findings", "key learnings",
  "confirmed optimal".
- Do NOT generate plots, commit, or update reports as separate tool calls.
- Do NOT write bare `except Exception: pass/continue` in `fixed/evaluate.py`
  or `fixed/visualize.py`. Crashes must be loud and recorded, not skipped.
- Do NOT fall back to synthetic predictions (median/mean/zero/last value)
  when a model raises. A crashed approach scores at the worst possible value
  for the primary metric direction, not a neutral middle.
- Do NOT fabricate visualization data for failed timesteps. Render the crash
  honestly (empty, marker, annotation). See `references/loop-enforcement.md`
  "Forbidden patterns" for the full fail-fast contract.

### ALWAYS rules

- ALWAYS log every approach including crashes and failures.
- ALWAYS commit every approach (keep, discard, crash) via eval_and_record.py.
- ALWAYS immediately start the next iteration after recording results.
- ALWAYS put analysis in the approach.py docstring, not in message text.
- ALWAYS write a short `rationale.md` alongside every `approach.py`.
  Rationale.md is a 5-15 line human-readable explanation of the *idea*
  behind the approach — what hypothesis is being tested, what we expect
  to learn, why this idea now (as opposed to another), and any link to a
  paper or prior approach it builds on. This is a reproducibility
  sidecar: anyone reading the session months later should be able to
  understand the thinking without reverse-engineering the code. Required
  fields: **Idea** (one sentence), **Hypothesis** (what we think will
  happen and why), **Builds on** (prior approach NNN or paper citation,
  if any), **What we'll learn** (what this trial resolves regardless of
  score). Keep it short — the code explains the how; rationale.md
  explains the why.
- ALWAYS try creative, diverse approaches.
- ALWAYS check user ideas queue periodically.
- ALWAYS review artifacts from the previous trial before writing the next
  approach: read visualization.png (you are multimodal), scores.json,
  metrics.json, training_progress.json, and any saved loss curves. Use
  these to inform your hypothesis for the next trial.
- ALWAYS have approaches log training progress to `training_progress.json`
  in their approach dir (epoch, loss, elapsed, etc.) for iterative methods.
- ALWAYS run eval_and_record.py with `run_in_background: true` for trials
  estimated >60s. Monitor `training_progress.json` while waiting.
- ALWAYS check eval output for `!! SEARCH_NEEDED` or `!! SEARCH_SUGGESTED`
  markers and perform web research before writing the next approach.
- ALWAYS save model checkpoints during training (after each epoch/model, not
  just at end). When reusing architecture, load prior checkpoints. The framework
  auto-generates `.gitignore` per approach - you save checkpoints, it handles exclusion.
- ALWAYS use thinking mode to estimate runtime (including fixed costs like
  data loading and visualization). Use this to choose foreground vs background
  execution. Monitor background trials via training_progress.json. Soft-kill
  (pkill/wmic) if projected time far exceeds budget or training diverges.
- ALWAYS use Optuna for hyperparameter tuning when the approach has tunable
  knobs. You pick the method (creative); Optuna picks the params (mechanical).
  Keep studies small (10-30 trials) within your estimated runtime budget.

---

## BINDING RULES: Live Progress Logging Convention

**EVERY trial MUST conform to this live-progress-logging convention.** This enables
the user and Claude to monitor training progress in real-time via `tail -f`.

### Rule 1: _log() Helper in Every approach.py

Every `approaches/<NNN>_<name>/approach.py` file MUST define a `_log(msg)` helper function that:
1. Appends a timestamped line to `approaches/<NNN>_<name>/live.log`
2. Prints to stdout with `flush=True` for immediate display

**Canonical implementation:**
```python
import os, time
_LIVE_LOG = os.path.join(os.path.dirname(__file__), "live.log")
def _log(msg: str) -> None:
    line = f"[{time.strftime('%H:%M:%S')}] {msg}\n"
    print(line, end="", flush=True)
    with open(_LIVE_LOG, "a") as f:
        f.write(line)
```

### Rule 2: Logging Points in Training Loops

Training loops in approach.py MUST call `_log()` at meaningful intervals:
- **START:** `_log("Training started with <config summary>")`
- **PERIODIC:** Every epoch/batch/fit step: `_log(f"Epoch {e}: loss={loss:.4f}, val={val:.4f}")`
- **COMPLETION:** `_log(f"Training complete. Elapsed: {elapsed:.1f}s, final_loss={loss:.4f}")`

For iterative training (neural nets, boosting), also write to `training_progress.json` 
(already required in ALWAYS rules).

### Rule 3: Logging Points in Prediction Loops

Prediction loops MUST call `_log()` periodically (e.g., every 50 samples):
- Include: count processed, elapsed time, rate (samples/sec), rough ETA
- Example: `_log(f"Predicted {i}/{total} ({rate:.1f} Hz). ETA: {eta:.0f}s")`

### Rule 4: Eval Launch MUST Redirect stdout+stderr to live.log

**CANONICAL LAUNCH COMMAND:**
```bash
<env vars> timeout <N> uv run python -u eval_and_record.py approaches/v4_NNN_name > approaches/v4_NNN_name/live.log 2>&1
```

Key constraints:
- Use `python -u` (unbuffered) for immediate output
- Redirect both stdout AND stderr (`2>&1`) to the same stable path `approaches/v4_NNN_name/live.log`
- The file path MUST match the approach directory exactly
- Use `timeout <N>` to bound execution and enable soft-kill recovery
- Background launches OK: use `run_in_background: true` on the Bash tool call

**Effect:** When eval_and_record.py runs, its output streams directly to live.log, and
the user can monitor progress in another terminal without needing approach.py's `_log()` calls.

### Rule 5: User Copy-Paste Command in Background Launch Message

When posting a background launch (Bash with `run_in_background: true`), the message
MUST include the exact `tail -f` command the user can copy-paste in another terminal:

**Example message:**
```
**NNN: [background launch]**
Monitor progress:
  tail -f approaches/v4_NNN_name/live.log
<Bash tool call with run_in_background: true>
```

This ensures the user can immediately see live progress without guessing the path.

---

### Message format during the loop

```
**NNN: KEEP/DISCARD** (score). [One sentence about what to try next.]
<Write tool call for next approach>
```

Two lines of text max. One tool call. Nothing else. After the Write, the next
message is just the Bash tool call for eval_and_record.py.

### Single method per trial (default)

Each trial uses ONE architecture or method. No ensembles combining multiple
models. Push each method to its optimum (Optuna tuning, more iterations,
feature engineering) before trying a fundamentally different method. An
ensemble trial is only valid when `allow_ensembles: true` in results.json.

Depth-first on each method, breadth across methods over time.

### Paradigm rotation (mandatory)

Maintain a mental list of paradigm categories. After 5 consecutive discards in
one category, MUST switch to a different category. After 10 consecutive discards
across all tried categories, invent a NEW category. Categories include: weight
tuning, new model type, feature engineering, preprocessing, architecture
change, loss function, regularization, data augmentation, cross-validation, etc.

### Structural rules

- `results.json` is the source of truth; report.md is derived from it.
- Experiment directory is a standalone git repo, separate from skill code.
- No personal/private data may enter the experiment repo.
- Planning phase requires user confirmation before any files are written.

---

## Research Philosophy

### Creativity over score improvement

It is NOT mandatory to improve the score on every trial. Weak ideas explored
now can combine into breakthrough ideas later. A "failed" approach that reveals
something about the problem structure is more valuable than not trying it.

Discarded approaches are NOT failures. They are data points. A rich log of 200
diverse attempts is more valuable than 20 cautious incremental tweaks.

### Plateau reframing

Scores often stall for many approaches and then break through suddenly. A
plateau means incremental changes in the current paradigm are exhausted. The
correct response is a fundamentally different paradigm, not stopping.

### Verification barrier

You cannot stop because you have NOT verified that ALL paradigm categories have
been exhausted. Since the number of categories is infinite (you can always
invent a new one), this verification can never complete. Therefore, you can
never logically justify stopping.

---

## Signature

```
autoresearch -- <intent interpreted from natural language>
  Input: "<whatever the user typed>"

  There are no flags, modes, or slash-syntax. The agent decides.
```

## How arguments are interpreted

**Everything after `/autoresearch` is natural language.** There are no
flags, no modes, no special syntax. The agent reads whatever the user
typed and classifies intent into one of three categories:

| User says something like... | Intent | Agent action |
|---|---|---|
| *(nothing)*, "what's running?", "show me my sessions", "list" | **Browse** | Scan `$PLUGIN_DATA/autoresearch/` for existing sessions, print tag/task/best-score for each, ask what to do next |
| "predict X from Y", "I want to find a better classifier for Z", any description of a task or goal | **New session** | Start the guided planning dialog (see §New Session) |
| "resume yesterday's work", "continue the forecasting one", "pick up `<tag>`", "keep going on that thing we started Tuesday" | **Resume** | Find the referenced session (by tag, by recency, by content match), verify it, recreate survival files, re-enter the loop (see §Resume) |

If the agent can't classify the intent confidently — for example the
user typed something ambiguous like *"autoresearch"* alone while
multiple sessions exist — it asks **one clarifying question**, then
proceeds.

**Every parameter that used to be a flag** — per-approach budget,
session tag, metrics, whether to run the research phase, whether to
hold out a test set, paradigm categories to prefer, anything — is
asked during the planning dialog. This keeps the invocation trivial
and forces the important decisions into a conversation where the
agent can help the user think them through.

---

## Stopping the loop

The loop stops when `.loop-active` is removed from the session directory.
There is no slash command and no auto-stop — the user expresses intent, and
the agent executes the file removal. Two equivalent mechanisms:

1. **Natural-language stop (primary).** When the user says *"stop"*,
   *"pause"*, *"that's enough"*, *"I'm done"*, or any equivalent, you MUST:
   1. Run `rm "$SESSION_DIR/.loop-active"` via Bash in the same turn
   2. Acknowledge the stop in one short sentence
   3. End the turn

   The Stop hook releases the moment `.loop-active` is gone. Until you
   delete it, the hook will keep forcing you to continue — *that is the
   hook doing its job*. You are the bridge between the user's intent
   (language) and the hook's mechanism (file presence). The hook cannot
   read messages; you read them and translate.

2. **Manual shell (escape hatch).** The user can also run
   `rm ~/.claude/plugins/data/*/autoresearch/<tag>/.loop-active` in any
   terminal. Always available, independent of Claude Code state.

The session directory, results, approaches, and report are preserved in
both cases. Restart by typing `/autoresearch resume <tag>` or
`/autoresearch continue that forecasting session` or any equivalent
natural-language phrasing — see §How arguments are interpreted.

---

## List Sessions (no args)

Scan for `$PLUGIN_DATA/autoresearch/*/results.json`. For each: tag, task,
approaches tried, best score(s). Suggest resuming one of them in
natural language (*"want me to resume `<tag>`?"*) or starting a new
task.

---

---

# ── SETUP REFERENCE ──

*Everything about the guided planning conversation: experiment design,
bibliography research, pre-flight walkthrough, and the smoke-test
proposal. This is what the agent does BEFORE the loop starts.*

---

## Setup: New Session — Guided Planning Discussion

**Call `EnterPlanMode` immediately.** No files written until plan confirmed.

The planning dialog produces an `experiment-plan.md` in the session
directory. The conversation should cover — in order — task framing,
data and splits, metrics and visualization, evaluation contract (which
becomes IMMUTABLE), scope and constraints, whether to run the bibliography
research phase, whether to hold out a test set, search-on-plateau
thresholds, and baseline/user-ideas queue. See
`references/planning-protocol.md` for the full checklist.

### Delegation: use superpowers:brainstorming when available

If the `superpowers:brainstorming` skill is installed (check for
`~/.claude/plugins/cache/claude-plugins-official/superpowers/*/skills/brainstorming/SKILL.md`
or `~/.claude/skills/brainstorming/SKILL.md`), **delegate the Q&A phase
to it**. Invoke it with these guardrails:

- Tell brainstorming that the spec location is
  `$SESSION_DIR/experiment-plan.md` (NOT the default
  `docs/superpowers/specs/...`). `$SESSION_DIR` is
  `~/.claude/plugins/data/co-intelligence-co-intelligence/autoresearch/<tag>/`
  and must be created first (mkdir only, no git init yet).
- Give it the §Clarifying Questions checklist below as the list of
  topics to cover.
- Tell it that the implementation step after brainstorming is NOT
  `superpowers:writing-plans` — it is handing control back to
  `autoresearch` to run session init and enter the loop.
- Tell it the spec will be committed by `autoresearch`'s session init,
  not by brainstorming itself.

If `superpowers:brainstorming` is NOT available, run the built-in
fallback Q&A procedure described in `references/planning-protocol.md`.
The fallback mirrors brainstorming's structure (one question at a time,
multiple choice preferred, propose 2-3 approaches, present design in
sections, user approval gate) but is leaner.

### Clarifying Questions (experiment design — asked once)

The Q&A phase (whether delegated to brainstorming or run built-in) MUST
cover these topics. Ask one question at a time. Prefer multiple choice.
These are **experiment definition** — they are set once and become part
of the immutable experiment plan.

1. **Task framing** — prediction? generation? optimization? What is the
   input/output contract?
2. **Data** — source, format, size, train/val/test split strategy,
   leakage risks
3. **Hold-out test set** — do you want one? (Strongly recommended; ask
   for explicit opt-out with a reason if the user refuses. This becomes
   part of the experiment structure and is not revised later.)
4. **Metrics** — primary metric, direction (higher/lower better),
   secondary metrics to track, anti-gaming guards
5. **Visualization** — what should every approach's `visualization.png`
   show? (Needed so you can read artifacts between trials)
6. **Evaluation harness** — draft `fixed/evaluate.py` as pseudo-code,
   confirm. Once confirmed it is IMMUTABLE.
7. **Scope and constraints** — what can the agent modify? Complexity
   limits? Forbidden imports? (Do NOT ask about runtime budget here —
   that's a loop-tuning setting asked in the settings gate.)
8. **Bibliography research** — do you want a Phase 0 bibliography pass
   before trials start? (Strongly recommended; see §Bibliography research
   below)
9. **Baseline and user ideas** — seed the ideas queue with approaches
   you already want tested, plus an open-ended prompt for "anything
   else you want me to try"
10. **Session tag** — what should we call this session? (default:
    `YYYY-MM-DD-<slug-of-task>`)
11. **Session storage location** — where should this session's data
    live? Default: `$PLUGIN_DATA/autoresearch/<tag>/` (i.e.
    `~/.claude/plugins/data/co-intelligence-co-intelligence/autoresearch/<tag>/`).
    Users can pick any directory they have write access to — a larger
    disk, a project subdirectory, a dedicated research folder, etc.
    **If the user picks a non-default location**, session init MUST
    create a discovery symlink at `$PLUGIN_DATA/autoresearch/<tag>/`
    pointing to the physical directory, so the Stop hook (which globs
    `$PLUGIN_DATA/autoresearch/*/.loop-active`) keeps working without
    reconfiguration. Record both paths in `loop-settings.json` under
    `physical_path` and `discovery_symlink`.

Once all ten clarifying questions have landed, transition naturally
into the pre-flight walkthrough (§Pre-flight walkthrough, below):

> "OK, the experiment is defined — that's the part that stays fixed
> for the whole session. Now let me walk you through what'll actually
> happen when I enter the loop. You'll be able to tweak any of the
> loop-tuning knobs (time budget, plateau behavior, paradigm
> rotation) before I start."

Then run the walkthrough. Do not write `experiment-plan.md` until
after the walkthrough too — the walkthrough can surface tweaks that
need to be reflected in the plan (e.g. the user bumps the time budget,
which affects what's computationally feasible, which might retro-change
the data split strategy). Write the plan only once both the experiment
design and the loop settings are confirmed.

### Bibliography research (Phase 0)

If the user opts in to bibliography research, **delegate to
`co-intelligence:bibliography`** in short-form mode instead of doing
generic web search. Invoke it with:

- Research description: derived from the task framing and scope
- Target: 15-25 papers (not the default 50-100) — call this a "focused"
  search and ask it to stop after 1-2 waves
- Output location: `$SESSION_DIR/bibliography.md` and
  `$SESSION_DIR/bibliography.bib` (copy from the bibliography skill's
  session dir)
- Acceptance gate: the session cannot leave planning until
  `bibliography.md` has at least 10 entries (or the user explicitly
  opted out of research during Q&A)

During the loop, on every `!! SEARCH_NEEDED` plateau trigger, the agent
MUST delegate to the same `co-intelligence:bibliography` skill (micro-mode:
5-10 papers, 1 wave) and **append discovered papers to the existing
`bibliography.md`**. This is how the bibliography grows during the loop.

Wait for explicit confirmation of the full plan. Then `ExitPlanMode`
and proceed to initialization.

See `references/common-pitfalls.md` for validation overfitting warnings.

---

### Setup outputs (canonical files)

The full setup discussion produces these files in `$SESSION_DIR`. They
are the single source of truth for the session:

| File | Role | Written when |
|---|---|---|
| `experiment-plan.md` | Immutable experiment definition: task, data, metric, harness, scope, constraints, baseline, user ideas | End of clarifying questions, after pre-flight walkthrough confirms loop settings |
| `loop-settings.json` | Mutable loop-tuning knobs (see §Settings persistence) | After pre-flight walkthrough approval, re-written on any setting change |
| `bibliography.md` + `bibliography.bib` | Phase 0 bibliography seed (if research was opted in) | At end of Phase 0, before session init commit |
| `fixed/evaluate.py`, `fixed/data_prep.py`, `fixed/visualize.py` | IMMUTABLE evaluation harness | During session init, from the pseudo-code confirmed during clarifying questions |
| `eval_and_record.py` | The evaluator runner | During session init, from template |
| `results.json` | Approaches / scores / ideas queue (empty at init) | During session init |
| `report.md` | Human-readable report (empty template at init) | During session init |
| `.autoresearch-directives`, `.claude/CLAUDE.md`, `.loop-active` | Survival files | During session init |

The agent MUST write each of these to its canonical location and MUST
NOT invent alternative filenames or locations. `references/session-init.md`
has the full templates.

### End of setup — smoke-test proposal

When the setup discussion is finished (clarifying questions answered AND
pre-flight walkthrough approved), the agent proposes a naive test trial
before starting the real loop:

> "Setup looks good. Before I start the real loop, I'd like to run one
> naive test trial — a trivial baseline predictor that exercises the
> full pipeline end-to-end (data loading, training, scoring,
> visualization, logging, git commit, report rendering). Its purpose
> isn't to score well; it's to catch broken plumbing BEFORE we spend
> hours generating real approaches on a broken setup. Shall I run it?"

If the user agrees (recommended): write all canonical files, run
session init, run the smoke-test approach (§Execution: Smoke-test
approach), show the user all artifacts, transition naturally into the
loop.

If the user declines: write all canonical files, run session init,
enter the loop directly. (Discouraged — if the pipeline is broken, the
user finds out after approach 5 instead of approach 0, and has to
rewind further.)

---

# ── EXECUTION REFERENCE ──

*Everything that happens AFTER the setup is finished: loop entry
validation, pre-flight walkthrough, session initialization, smoke-test
approach mechanics, the experiment loop itself, and resume.*

---

## Execution: Loop entry validation (start and resume)

**Before** the pre-flight walkthrough runs — on every loop entry, new
or resumed — the agent verifies all canonical setup outputs exist and
are well-defined. This is the gate that catches partial state from
interrupted setups, manual edits, or missing dependencies.

### Validation checklist

1. **`$SESSION_DIR/experiment-plan.md`** — exists, non-empty, has
   sections for task, data, metric, harness, scope, constraints.
2. **`$SESSION_DIR/loop-settings.json`** — exists, valid JSON, has all
   required keys (see §Settings persistence). Legacy sessions with
   knobs in `results.json` are auto-migrated.
3. **`$SESSION_DIR/fixed/evaluate.py`** — exists, matches the harness
   pseudo-code confirmed during clarifying questions.
4. **`$SESSION_DIR/fixed/data_prep.py`** and
   **`fixed/visualize.py`** — exist and are importable.
5. **`$SESSION_DIR/eval_and_record.py`** — exists and is runnable.
6. **`$SESSION_DIR/results.json`** — exists and is valid JSON (may
   have zero approaches on new session).
7. **`$SESSION_DIR/report.md`** — exists.
8. **Survival files** — `.autoresearch-directives`, `.claude/CLAUDE.md`.
   Recreate any missing from `references/loop-enforcement.md` templates.
9. **`.loop-active`** — either present with the correct session ID or
   to be freshly written (see `references/session-init.md` for the
   transcript-lookup technique).
10. **Bibliography (if Phase 0 was opted in)** — `bibliography.md`
    exists and has at least 10 entries. If it has fewer, ask the user
    whether to run (or re-run) `co-intelligence:bibliography` now.
11. **Stop hook** — `~/.claude/settings.json` contains the
    autoresearch Stop hook. If missing, warn loudly (see
    `references/loop-enforcement.md` for the canonical snippet).
12. **Git repo** — `git status` is clean or has only `.loop-active`
    dirty. If dirty for other reasons, ask the user to commit, stash,
    or abort.

### If any validation fails

Do NOT proceed to the pre-flight walkthrough or the loop. Instead:

1. List every failing check concretely (which file is missing, which
   key is absent, which import fails).
2. For each gap, offer the user options:
   - *Fill it in now via targeted questions* (preferred for small gaps
     like a missing setting)
   - *Re-run the full setup discussion* (for large gaps like missing
     `experiment-plan.md`)
   - *Abort and investigate manually*
3. For small gaps, ask the relevant clarifying question(s) from
   §Clarifying Questions or §Pre-flight walkthrough, fix the file(s),
   and re-run validation.
4. Only proceed to the pre-flight walkthrough once ALL validation
   checks pass.

This gate makes the skill robust to partial state and means the user
can safely interrupt a setup discussion, come back later, and have the
agent pick up exactly where it stopped.

## Execution: Pre-flight walkthrough (before every loop entry)

**Immediately before entering the loop** — both on initial session start
AND on every resume — explain to the user *what is about to happen* and
give them a chance to tweak anything. This is the last gate before the
session runs autonomously.

The walkthrough is a short narrative, not a dry checklist. Something like:

> "Here's what will happen when I enter the loop:
>
> - I'll work on **`<session tag>`**: `<one-line task summary>`.
> - Each approach will get up to **`<budget>`** of compute time. Trials
>   estimated to run longer than **`<bg_threshold>`** will launch in
>   background and I'll monitor their `training_progress.json` while
>   waiting.
> - I'll rotate through these paradigm categories:
>   **`<category1, category2, ...>`**. After 5 consecutive discards in
>   one category I'll switch; after 10 across the board I'll invent a
>   new one.
> - Between trials I'll always review the previous approach's
>   `visualization.png`, `training_progress.json`, and loss curves
>   before writing the next one, and I'll save checkpoints every epoch
>   so later trials can warm-start from earlier weights.
> - After **`<plateau_threshold>`** consecutive discards I'll pause the
>   loop, delegate to `co-intelligence:bibliography` in micro-mode
>   (1 wave, ~5-10 papers), append whatever I find to
>   `bibliography.md`, and use those papers to generate
>   **`<plateau_ideas_count>`** new approach ideas.
> - `search_every_trial` is currently **`<on|off>`**. [If on: I'll do
>   a quick literature dip before every single approach.]
> - The user ideas queue has **`<N>` pending** ideas I'll test first.
> - Fail-fast is on: crashes score at the worst possible value, no
>   synthetic fallbacks, no fabricated visualizations.
> - I will not stop until you tell me to. Say *'stop'*, *'pause'*,
>   *'that's enough'* — any of those — and I'll delete `.loop-active`
>   and end cleanly.
>
> **Tweak anything, or proceed?**"

The user can say *"budget to 15m"*, *"plateau threshold to 15"*, *"add
graph-neural-net to paradigms"*, *"turn off per-trial search"*,
*"shorten the budget on background launches"*, etc. The agent updates
`loop-settings.json` (see §Settings persistence below), re-prints the
affected lines, and asks again. The loop does not start until the user
gives explicit approval.

**If on resume the user wants to change an experiment-definition item**
(metric, hold-out split, evaluation harness, data source — things from
the Clarifying Questions list), the agent MUST warn: *"Changing
`<item>` invalidates comparisons with every prior approach in this
session. Options: (a) start a new session, (b) proceed and accept the
invalidation."* Do not silently mutate the experiment contract.

### Settings persistence

All loop-tuning settings live in a dedicated file next to `results.json`:

```
$SESSION_DIR/loop-settings.json
```

This is the single source of truth for how the loop behaves — read by
the agent (before each iteration when relevant, always at pre-flight)
and by `eval_and_record.py` (to decide plateau triggers, background
execution, etc.). `results.json` remains the approaches / scores /
ideas-queue carrier and does NOT duplicate these settings.

```json
{
  "budget_per_approach": "5m",
  "background_threshold_seconds": 60,
  "search_on_plateau_threshold": 10,
  "search_on_plateau_ideas_count": 10,
  "search_every_trial": false,
  "paradigm_categories": [
    "weight tuning", "new model type", "feature engineering",
    "preprocessing", "architecture change", "loss function",
    "regularization", "data augmentation", "cross-validation"
  ],
  "allow_ensembles": false,
  "bibliography_on_plateau": true,
  "bibliography_target_per_plateau": 10
}
```

The agent MUST update this file (not scattered top-level keys anywhere
else) when the user adjusts settings at the pre-flight walkthrough. It
reads this file on every resume and populates the walkthrough from it.
`eval_and_record.py` reads it on startup to pick up threshold changes
without restarting the loop.

Legacy sessions that stored these knobs as top-level keys in
`results.json` are migrated on first resume: the agent reads the old
keys, writes `loop-settings.json`, and strips them from `results.json`
on the next write.

---

## Execution: Session Initialization

After the pre-flight walkthrough is approved on a new session, create
the session structure following `references/session-init.md`. Key
steps:

1. Create directory `$PLUGIN_DATA/autoresearch/<tag>/` (where
   `<tag>` was chosen during clarifying questions).
2. Initialize git repo with the comprehensive `.gitignore` from
   `references/git-management.md`.
3. Create `fixed/` containing IMMUTABLE `evaluate.py`, `data_prep.py`,
   `visualize.py` — generated from the harness pseudo-code confirmed
   during clarifying questions.
4. Generate `eval_and_record.py` from the template in
   `references/session-init.md`.
5. Initialize `results.json` (empty approaches list, empty ideas queue
   or seeded from user ideas), `report.md` from
   `references/report-template.md`, `bibliography.md` (either from
   Phase 0 research or an empty header).
6. Write `loop-settings.json` with the values confirmed in the
   pre-flight walkthrough.
7. Write `experiment-plan.md` from the clarifying-questions answers.
8. Create survival files: `.claude/CLAUDE.md`, `.autoresearch-directives`,
   `.loop-active` (with the current session ID derived via transcript
   lookup — see `references/session-init.md`).
9. Git commit: `"init: experiment plan, harness, and loop settings"`.

After this completes, proceed to the smoke-test approach (if the user
approved it at the end of setup discussion) or directly to the loop.

## Execution: Smoke-test approach (approach 000)

If the user accepted the smoke-test proposal at the end of the setup
discussion, the agent writes and runs ONE naive baseline approach
numbered 000 whose sole purpose is to exercise the full pipeline end
to end: data loading, training (trivially), prediction, scoring,
visualization, `training_progress.json` logging, `live.log` streaming,
git commit, `results.json` update, and `report.md` / `progress.png`
rendering.

The baseline should be the dumbest possible predictor that still uses
the real evaluation contract — e.g. constant mean, median, or last
value for regression; majority class for classification; random for
generation. It is explicitly not expected to score well. Its purpose
is to catch broken logging, broken plots, broken git commits, broken
checkpointing, or broken eval harness **before** the user commits to
hours of loop time.

**Sequence:**

1. Write `approaches/000_naive_baseline/approach.py` — the trivial
   predictor.
2. Run `eval_and_record.py approaches/000_naive_baseline` (background
   if estimated >60s, foreground otherwise).
3. Once it completes, inspect and show the user:
   - The generated `visualization.png` (you are multimodal — describe
     what you see)
   - The `report.md` entry
   - `training_progress.json` path + first/last lines
   - `live.log` tail (last 20 lines or so)
   - `git log --oneline` (should show one init commit + the 000
     approach commit)
   - The score and whether it is at the worst possible value for the
     metric direction (expected for a naive baseline if the metric
     rewards skill)
4. Narratively transition into the loop: *"Pipeline verified
   end-to-end. Entering the loop now."* and start the first real
   approach (`001`).

If ANY artifact is missing or malformed at step 3, stop and diagnose
with the user. Do NOT enter the loop on a broken pipeline.

---

## Execution: The Experiment Loop

Read `references/experiment-loop.md` for the full protocol.

```
LOOP FOREVER:
  THINK: Review results.json, hypothesize (no tool call)
  WRITE: approaches/<NNN>_<name>/approach.py
  BASH:  cd <session_dir> && python3 eval_and_record.py approaches/<NNN>_<name>
  GOTO THINK
```

Write, Bash, Write, Bash, Write, Bash - forever.

### Approach Completion Gate

If eval_and_record.py output contains `!! INCOMPLETE`, fix the issue before
writing the next approach.

### User Ideas Tracking

Periodically check user ideas queue in results.json. Mark ideas as "explored"
when tested. Append new user ideas mid-experiment.

### Bibliography Tracking

`bibliography.md` grows in three ways during a session:

1. **Phase 0 seed** — populated at session init by delegating to
   `co-intelligence:bibliography` (short-form, 15-25 papers, 1-2 waves).
   Strongly recommended.
2. **Per-approach citations** — when an approach is based on a paper
   or resource, the agent creates `approaches/<NNN>_<name>/references.md`
   AND appends the citation to `bibliography.md`. These are the papers
   the agent is actually using, not just ones it considered.
3. **Plateau appends (MANDATORY)** — on every `!! SEARCH_NEEDED`
   trigger (see §Search Callbacks below), the agent MUST delegate to
   `co-intelligence:bibliography` in micro-mode (target
   `bibliography_target_per_plateau`, 1 wave) and append the discovered
   papers to `bibliography.md` BEFORE generating new approach ideas.
   This keeps the literature current as the loop explores new
   directions. Never do a generic web search in place of this — the
   bibliography skill produces structured, deduplicated, quality-gated
   entries. Generic web search produces noise.

### Search Callbacks

`eval_and_record.py` prints `!! SEARCH_NEEDED` when consecutive
discards reach `search_on_plateau_threshold` (from `loop-settings.json`),
and `!! SEARCH_SUGGESTED` on every approach if
`search_every_trial: true`.

On `!! SEARCH_NEEDED`:
1. Read `loop-settings.json` to get `search_on_plateau_ideas_count` and
   `bibliography_target_per_plateau`.
2. Delegate to `co-intelligence:bibliography` with a micro-wave target
   (`bibliography_target_per_plateau` papers, 1 wave). Feed it the task
   framing + a short summary of the last N discarded approaches so it
   can tune the search toward underexplored directions.
3. Copy the new entries from `$PLUGIN_DATA/bibliography/<slug>/...` into
   this session's `bibliography.md` (append, don't overwrite).
4. Generate `search_on_plateau_ideas_count` new approach ideas grounded
   in the just-discovered papers. Append them to the user ideas queue
   in `results.json` with a `source: "plateau-search"` tag.
5. Continue the loop, with the next approach drawing from these fresh
   ideas first.

On `!! SEARCH_SUGGESTED` (per-trial search, off by default): lighter
version — 1-3 paper ideas, no full bibliography wave, still appended to
`bibliography.md` if cited.

---

## Execution: Resume

Triggered when the user's natural-language input matches "resume",
"continue", "pick up", "keep going", etc. (see §How arguments are
interpreted). The agent identifies the target session by tag, recency,
or content match — asking one clarifying question if ambiguous.

On resume, always run §Execution: Loop entry validation first. Then
the pre-flight walkthrough. Then continue the loop.

1. Read `$SESSION_DIR/results.json`, `loop-settings.json`,
   `report.md`, and the last 5 approach directories.
2. Read `.loop-state` for current position (last approach number, best
   score).
3. Verify git repo is clean (`git status`). If dirty, ask the user
   whether to commit, stash, or abort.
4. **Migrate legacy settings** — if `loop-settings.json` doesn't exist
   but `results.json` contains top-level `search_on_plateau_threshold`
   etc., create `loop-settings.json` from those keys and strip them
   from `results.json` on the next write.
5. Recreate `.loop-active` if missing, derived from the current
   session ID (see `references/session-init.md` for the transcript
   lookup technique).
6. **Verify Stop hook** — check `~/.claude/settings.json` for the
   autoresearch Stop hook. If missing, warn:
   > "WARNING: The autoresearch Stop hook is not configured in
   > settings.json. Without it, there is no technical barrier preventing
   > the loop from stopping. Add it via `references/loop-enforcement.md`."
7. **Recreate missing survival files** — if `.autoresearch-directives`
   or `.claude/CLAUDE.md` are missing, recreate them from templates in
   `references/loop-enforcement.md`. These files are non-optional.
8. Print a short status: N approaches, best score(s), last 5 entries,
   which paradigm category was most recent.
9. **Run the pre-flight walkthrough** (§Pre-flight walkthrough above).
   The user reviews current `loop-settings.json` values, adjusts
   anything, and approves.
10. Continue the loop from next approach number.

---

## Report and Git

- **Report format:** See `references/report-template.md`
- **Git rules:** See `references/git-management.md` (no data files, no secrets, never revert)
- **Sources:** See `references/session-init.md` header for upstream repos

## Self-Refinement

This skill participates in the co-intelligence feedback loop. After completing
a task, if friction was observed, suggest: "Want me to `/skillsmith autoresearch`
to refine this?" and log to `$PLUGIN_DATA/friction.md`.
