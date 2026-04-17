---
name: autoresearch
description: Use when running autonomous iterative research on any well-defined task. Adapts Karpathy's autoresearch workflow - guides the user to design the experiment, then an AI agent tests approaches in a sandbox forever, logs everything (even failures), and never stops until the user says so.
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

**Each iteration = up to 4 tool calls in a fixed order. No exceptions.**

```
TOOL 1 (Write, skip on iteration 1): approaches/<PREV>_<slug>/commentary.md
TOOL 2 (Write):                      approaches/<NNN>_<slug>/rationale.md
TOOL 3 (Write):                      approaches/<NNN>_<slug>/approach.py
TOOL 4 (Bash):                       python3 eval_and_record.py approaches/<NNN>_<slug>
```

Approach folder names are `<NNN>_<slug>` — NO tag prefix. The session
tag lives once in `results.json["tag"]` and in the session directory
name. Commentary is written BEFORE rationale because the lessons from
the previous trial shape the hypothesis for the next one. On iteration
1 (first real approach after the smoke test) skip Tool 1 — the smoke
test's commentary is written during the smoke-test sequence, not
inside the loop.

For trials estimated ≥ `background_threshold_seconds`: launch Tool 4
with `run_in_background: true`, monitor `training_progress.json`
every 30-60s, soft-kill if diverging. Canonical launch command (with
`tee` for Claude Code shell-indicator visibility):
`references/live-logging.md` Rule 4.

`eval_and_record.py` handles EVERYTHING scoring-and-bookkeeping:
evaluation, approach-folder-schema enforcement (auto-moves forbidden
files to `artifacts/`), monitoring-contract check, scoring,
keep/discard, visualization, git commit, `progress.png`, a call to
`update_report.py` (which rewrites Zone A of `report.md`),
`.loop-state`. The agent writes ONLY the three sidecars +
`approach.py` per iteration — plus an occasional Zone B narrative
rewrite when `!! NARRATIVE_DUE` fires.

**NEVER do any of these as separate tool calls outside Tool 4:** plot
generation, `git add/commit`, Zone A `report.md` edits, `progress.png`
updates, matplotlib code. If you catch yourself writing code for any
of those, STOP — you are creating an exit point. (Zone B narrative
edits on `!! NARRATIVE_DUE` or stop ARE a legitimate separate Edit
call; that's the one exception.)

Full loop protocol with anti-patterns, runtime estimation, soft-kill
recovery, and the self-check:
`references/experiment-loop.md`.

---

## Rules

### NEVER rules

- Do NOT modify anything in `fixed/` after session starts
  (`evaluate.py`, `data_prep.py`, `visualize.py`, `paths.py`) or
  `eval_and_record.py` or `update_report.py`. These are immutable.
- Do NOT import from `fixed/` outside the whitelist
  (`fixed.paths.artifacts_dir_for`, `fixed.data_prep.get_data` via
  the harness).
- Do NOT write heavy files (checkpoints, weights, caches) to the
  approach folder. Use `artifacts_dir_for(__file__)`. The harness
  auto-moves violations but keep the logs clean.
- Do NOT hand-edit Zone A of `report.md` (content between
  `<!-- auto:begin -->` and `<!-- auto:end -->`). That's
  `update_report.py`'s territory and your edits will be overwritten.
- Do NOT stop the loop. See PRIME DIRECTIVE.
- Do NOT ask "should I keep going?" or write progress summaries in message text.
- Do NOT end a message with text as the last content block. Last block MUST be tool_use.
- Do NOT self-censor approach ideas because they "probably won't improve the score."
- Do NOT use these words during the loop: "converging", "plateau", "exhaustive",
  "well-optimized", "structural bottleneck", "key findings", "key learnings",
  "confirmed optimal".
- Do NOT generate plots, commit, or hand-edit Zone A of the report as
  separate tool calls. (Zone B narrative edits on NARRATIVE_DUE or
  stop ARE allowed.)
- Do NOT write bare `except Exception: pass/continue` in `fixed/evaluate.py`,
  `fixed/visualize.py`, or `update_report.py`. Crashes must be loud
  and recorded, not skipped.
- Do NOT fall back to synthetic predictions (median/mean/zero/last value)
  when a model raises. A crashed approach scores at the worst possible value
  for the primary metric direction, not a neutral middle.
- Do NOT fabricate visualization data for failed timesteps. Render the crash
  honestly (empty, marker, annotation) or let `visualization.png` be
  absent (absence is itself the honest signal). See
  `references/loop-enforcement.md` "Forbidden patterns" for the full
  fail-fast contract.
- Do NOT include a session tag prefix in approach folder names. Use
  `<NNN>_<slug>` form only.

### ALWAYS rules

- ALWAYS log every approach including crashes and failures.
- ALWAYS commit every approach (keep, discard, crash) via eval_and_record.py.
- ALWAYS immediately start the next iteration after recording results.
- ALWAYS put analysis in the approach.py docstring, not in message text.
- ALWAYS write a short `rationale.md` alongside every `approach.py`
  **before** running eval (5-15 lines, YAML front-matter with
  `parent:` required + optional `source:` and `addresses_user_idea:`;
  prose fields Idea, Hypothesis, Builds on, What we'll learn).
- ALWAYS write a short `commentary.md` **after** eval completes, at
  the start of the next iteration, as part of reviewing the previous
  approach's artifacts (5-15 lines, YAML front-matter with `status:`
  and `summary:`; prose fields Result, Vs. hypothesis, Visualization,
  Vs. bibliography, Lessons).
- If the rationale cites papers from `bibliography.md`, it MUST use
  BibTeX keys (e.g. `[Sur25]`) and the commentary MUST reassess them.
- **Full spec with field definitions, examples, crash handling, and
  git lifecycle: `references/sidecars.md`.**
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
- ALWAYS save model checkpoints during training (after each
  epoch/model, not just at end). Write to
  `artifacts_dir_for(__file__)` (from `fixed.paths`) — the session
  root `.gitignore` excludes `artifacts/` so weights never reach git.
  When reusing architecture, glob prior checkpoints from
  `session_root/artifacts/*/ckpt_*.pkl`.
- ALWAYS rewrite Zone B of `report.md` (Synthesis, What works, What
  doesn't work, Next Steps) when `!! NARRATIVE_DUE` is emitted by
  `eval_and_record.py`, and one final time when the user asks to
  stop (before deleting `.loop-active`). Delete `.narrative-dirty`
  after each Zone B rewrite. See `references/report-updates.md`.
- ALWAYS emit progress from `approach.py` via `_log()` at start and
  end, plus mid-trial lines for any trial running longer than
  `monitoring_required_after_seconds` (default 10s). Silent trials
  are marked `monitoring_violation` and cannot be kept.
- ALWAYS use thinking mode to estimate runtime (including fixed costs like
  data loading and visualization). Use this to choose foreground vs background
  execution. Monitor background trials via training_progress.json. Soft-kill
  (pkill/wmic) if projected time far exceeds budget or training diverges.
- ALWAYS use Optuna for hyperparameter tuning when the approach has tunable
  knobs. You pick the method (creative); Optuna picks the params (mechanical).
  Keep studies small (10-30 trials) within your estimated runtime budget.

---

## Live Progress Logging Contract

**Not a style guide — a contract.** `approach.py` MUST emit progress
output. `eval_and_record.py` counts non-empty lines in `live.log`
post-trial and marks silent trials `monitoring_violation`, which
cannot be kept. Rewrite the SAME approach with `_log()` calls; don't
advance the trial number.

Minimum lines: 2 for any duration (start + end), 3+ if runtime
exceeds `monitoring_required_after_seconds` (default 10s,
configurable).

Trial output is visible in **three** places simultaneously —
`tail -f` in a separate terminal, Claude Code's background-shell
"N shell" indicator, and the committed `live.log` file — with
progress and ETA continuously displayed. The five rules:

1. Every `approach.py` defines a `_log(msg)` helper that writes to
   `live.log` AND stdout with `flush=True`.
2. Training loops call `_log()` at start, every epoch, and on
   completion. **Every periodic log line carries elapsed time,
   percent complete, and ETA** — not just epoch + loss.
3. Prediction loops call `_log()` every ~50 samples with count, rate,
   and ETA.
4. Eval launches use **`tee`** so output streams to both `live.log`
   and stdout simultaneously:
   ```
   timeout <N> stdbuf -oL -eL uv run python -u eval_and_record.py approaches/<NNN>_<slug> 2>&1 \
     | stdbuf -oL tee approaches/<NNN>_<slug>/live.log
   ```
   Claude Code's background-shell indicator captures stdout, so the
   user can watch progress live by clicking the "N shell" tab — no
   second terminal needed (though `tail -f live.log` still works).
5. Background launches include the exact `tail -f` command in the
   message so users who prefer a second terminal can copy-paste it.

**Full spec with canonical code snippets and rationale:
`references/live-logging.md`.**

Also — per §Core Loop Contract — `approach.py` must write
`training_progress.json` in its directory for any iterative training
(neural nets, boosting). This is the structured counterpart to
`live.log` and is what the agent reads during background monitoring.

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

**Everything after `/autoresearch` is natural language.** No flags,
no modes, no slash-syntax. The agent classifies intent into three
categories:

| User says... | Intent | Agent action |
|---|---|---|
| *(nothing)*, *"list"*, *"what's running?"* | Browse | Run §List Sessions |
| *"predict X from Y"*, any task description | New session | Run §Setup: New Session |
| *"resume"* / *"continue"* / *"pick up <tag>"* | Resume | Run §Execution: Resume |

If the intent is ambiguous, ask **one** clarifying question and
proceed. Every parameter that used to be a flag (budget, tag,
metrics, research, hold-out, paradigms) is asked during the
planning dialog or the pre-flight walkthrough — never on invocation.

---

## Stopping the loop

The loop stops when `.loop-active` is removed from the session
directory. No slash command, no auto-stop.

**When the user says *"stop"* / *"pause"* / *"that's enough"* / any
equivalent**, you MUST, in this exact order in a single turn:

1. **Rewrite Zone B of `report.md`** — Synthesis, What works, What
   doesn't work, Next Steps — so the final report the user actually
   reads is current. Use full `<NNN>_<slug>` trial names with
   clickable links. This is non-negotiable even if the last Zone B
   update was recent; the final pass is what the user keeps.
2. **Delete `.narrative-dirty`** if it exists.
3. **Delete `.loop-active`** via Bash.
4. **Write `.loop-stopped`** via Bash — a sentinel file that prevents
   any pending ScheduleWakeup from restarting the loop.
5. **Do NOT call ScheduleWakeup.** Any previously-scheduled wakeup
   cannot be cancelled, but you control whether the loop resumes
   when that wakeup fires (see below).
6. Acknowledge briefly and end the turn.

The Stop hook releases the moment `.loop-active` is gone. Until you
delete it, the hook keeps forcing you to continue — *that is the
hook doing its job*. You are the bridge between the user's intent
(language) and the hook's mechanism (file presence). The hook cannot
read messages; you read them and translate.

Users can also `rm` the file directly in any terminal as an escape
hatch. Session state is preserved in both cases — restart with
*"resume `<tag>`"* or any equivalent natural-language phrasing.

### ScheduleWakeup and pending wakeups

When the loop uses `/loop` dynamic pacing with `ScheduleWakeup`,
a scheduled wakeup may fire AFTER the user has asked to stop. The
`ScheduleWakeup` API has no cancellation mechanism — once scheduled,
it will fire. This creates a race condition: the user says "stop",
you acknowledge and delete `.loop-active`, but 60-270 seconds later
the wakeup fires and the prompt says "resume the loop."

**Defense: the `.loop-stopped` sentinel.**

On every wakeup that triggers a loop resume, the agent MUST check
for `.loop-stopped` in the session directory BEFORE doing anything
else. If the file exists, the user explicitly stopped the loop and
the wakeup is stale:

1. Acknowledge: "Loop was stopped by user. Ignoring scheduled wakeup."
2. Do NOT call ScheduleWakeup again.
3. Do NOT write any approach files.
4. End the turn.

On resume (when user explicitly says "resume"): delete `.loop-stopped`
as part of the resume validation gate, then proceed normally.

**The `.loop-stopped` file contains a timestamp and reason:**

```bash
echo "$(date -Iseconds) stopped by user request" > "$SESSION_DIR/.loop-stopped"
```

## List Sessions (no args)

Scan `$PLUGIN_DATA/autoresearch/*/results.json`. For each: tag, task,
approaches tried, best score. Suggest resuming one in natural
language or starting a new task.

---

---

# ── SETUP REFERENCE ──

*Everything about the guided planning conversation: experiment design,
bibliography research, pre-flight walkthrough, and the smoke-test
proposal. This is what the agent does BEFORE the loop starts.*

---

## Setup: New Session — Guided Planning Discussion

**Call `EnterPlanMode` immediately.** No files written until the plan
is confirmed by both clarifying questions AND the pre-flight
walkthrough.

The planning discussion has two phases, run back-to-back in one
continuous conversation:

1. **Clarifying questions** — eleven topics defining the experiment
   (task, data, metrics, evaluation harness, scope, bibliography
   research, user ideas, session tag, storage location). Delegates to
   `superpowers:brainstorming` when available; falls back to a
   built-in Q&A procedure otherwise. **Full checklist and delegation
   guardrails: `references/clarifying-questions.md`.**

2. **Pre-flight walkthrough** — the agent explains *what will happen*
   in the loop (budget, plateau, paradigm rotation, sidecars, stopping)
   and the user tweaks any loop-tuning knob in natural language. **Full
   template and `loop-settings.json` schema: `references/loop-entry.md`
   Stage 2.**

Write `experiment-plan.md` and `loop-settings.json` only after BOTH
phases are confirmed. The walkthrough can surface tweaks that
retro-affect the plan (e.g. a bigger budget changes what's
computationally feasible, which might retro-change the data split
strategy).

### Bibliography research (Phase 0) — delegate to co-intelligence:bibliography

When the user opts in at clarifying question 8, **delegate to
`co-intelligence:bibliography`** in short-form mode (target 15-25
papers, 1-2 waves). Copy output to `$SESSION_DIR/bibliography.md`
and `bibliography.bib`. Acceptance gate: `bibliography.md` needs
≥10 entries (or explicit opt-out with justification in
`loop-settings.json`). During the loop, plateau triggers delegate
to the same skill in micro-mode and append to `bibliography.md`.
See `references/planning-protocol.md` Topic 8 for details.

### Setup outputs — canonical files

Setup writes these to `$SESSION_DIR`, never to alternative locations:
`experiment-plan.md` (immutable), `loop-settings.json` (mutable),
`bibliography.md` + `.bib` (appendable), `fixed/evaluate.py` +
`data_prep.py` + `visualize.py` (immutable), `eval_and_record.py`
(immutable), `results.json` (mutable), `report.md` (mutable),
survival files (`.claude/CLAUDE.md`, `.autoresearch-directives`,
`.loop-active`). Full schema, write timing, and templates:
`references/session-init.md`.

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

## Execution: Loop entry (start and resume)

Every loop entry — new or resumed — runs in three stages:

1. **Validation gate** — twelve-check that every canonical setup
   output exists and is well-defined: `experiment-plan.md`,
   `loop-settings.json`, all three `fixed/*.py`, `eval_and_record.py`,
   `results.json`, `report.md`, survival files, `.loop-active`,
   bibliography (if opted in), Stop hook, clean git. If any check
   fails: list the gap concretely, offer the user targeted repair
   questions or a full setup re-run, and block the loop until all
   checks pass.

2. **Pre-flight walkthrough** — a short narrative (not a dry
   checklist) covering the session tag + task, per-approach budget,
   paradigm categories, artifact review + checkpointing, plateau
   behavior (delegates to `co-intelligence:bibliography`), user ideas
   queue, fail-fast rules, and how to stop. The user tweaks any
   loop-tuning knob in natural language; the agent updates
   `loop-settings.json` and re-prints the affected lines until
   explicit approval.

3. **Enter the loop** — only after the walkthrough is approved with
   no pending tweaks.

**Full validation checklist, walkthrough template, accepted tweaks,
experiment-definition change warning on resume, and the
`loop-settings.json` schema + field reference:
`references/loop-entry.md`.**

---

## Execution: Session Initialization

After the pre-flight walkthrough is approved, create the session
directory at the physical path from `loop-settings.json` (with
discovery symlink if non-default), initialize the git repo, scaffold
`fixed/` with the immutable harness, generate `eval_and_record.py`
from template, initialize `results.json` / `report.md` / `README.md`,
write `loop-settings.json` and `experiment-plan.md`, create survival
files (deriving `.loop-active` session ID from the transcript filename),
and git-commit.

**Full step-by-step sequence with `.gitignore`, README template,
survival file derivation, and `eval_and_record.py` template:
`references/session-init.md`.**

## Execution: Smoke-test approach (approach 000)

If the user accepted the smoke-test proposal at end of setup, write
and run ONE trivial approach (`approaches/000_smoke_test/`) before
the real loop. Purpose: exercise the full pipeline end-to-end (data
loading, scoring, visualization, logging, git, report) to catch
broken plumbing. This is NOT a baseline — it's a plumbing check.
Approach 001 is the first real trial (prior work reproduction,
creative hypothesis, or whatever the user's strategy calls for).

Sequence: write `rationale.md`, write `approach.py` (constant mean,
majority class, or equivalent — see `references/session-init.md`
Step 11 for templates), run `eval_and_record.py`, inspect artifacts,
write `commentary.md`, then transition into the loop. If ANY artifact
is missing or malformed, STOP and diagnose with the user — do not
enter the loop on a broken pipeline.

**Full templates and sequence: `references/session-init.md` Step 11.**

---

## Execution: The Experiment Loop

Read `references/experiment-loop.md` for the full protocol.

```
LOOP FOREVER:
  THINK: Review results.json, hypothesize (no tool call)
  WRITE: approaches/<NNN>_<slug>/approach.py
  BASH:  cd <session_dir> && python3 eval_and_record.py approaches/<NNN>_<slug>
  GOTO THINK
```

Write, Bash, Write, Bash, Write, Bash - forever.

### Approach Completion Gate

If eval_and_record.py output contains `!! INCOMPLETE`, fix the issue before
writing the next approach.

### User Ideas Tracking

Periodically check user ideas queue in results.json. Mark ideas as "explored"
when tested. Append new user ideas mid-experiment.

### Bibliography Tracking and Plateau Search

`bibliography.md` grows in three ways: Phase 0 seed (session init),
per-approach citations (when rationale.md cites a paper, its BibTeX
key is appended), and **mandatory plateau appends** — on every
`!! SEARCH_NEEDED` trigger, the agent delegates to
`co-intelligence:bibliography` in micro-mode, appends discovered
papers to `bibliography.md`, and generates new approach ideas
grounded in them (tagged `source: "plateau-search"` in the user
ideas queue).

Never substitute generic web search for the bibliography delegation
— the skill produces structured, deduplicated, quality-gated entries;
web search produces noise.

`!! SEARCH_SUGGESTED` (per-trial search, off by default) is lighter:
1-3 paper ideas, no full wave.

**Full plateau-search protocol, per-trial variant, and the exact
sequence of BibTeX append → idea generation → loop continuation:
`references/experiment-loop.md` §Search callbacks.**

---

## Execution: Resume

Triggered when the user's natural-language input matches *"resume"*,
*"continue"*, *"pick up"*, *"keep going"*, etc. (see §How arguments
are interpreted). The agent identifies the target session by tag,
recency, or content match — asking one clarifying question if
ambiguous.

On resume, the flow is always:

1. **Run §Execution: Loop entry validation** — the twelve-check gate
   that auto-migrates legacy `results.json` settings into
   `loop-settings.json`, recreates missing survival files, rederives
   `.loop-active` with the current session ID, and verifies the Stop
   hook.
2. **Print a short status** — N approaches, best score(s), last 5
   entries, most recent paradigm category, any stale state flagged.
3. **Read the last 2-3 `commentary.md` files** from the most recent
   approaches — this is how the agent rehydrates its thinking about
   what worked and what didn't.
4. **Run the loop entry sequence** (§Execution: Loop entry) — the
   twelve-check validation followed by the pre-flight walkthrough so
   the user can tweak loop settings before the loop restarts.
5. **Continue the loop** from the next approach number.

Full details of each step (legacy migration, Stop hook verification,
survival-file recreation): `references/loop-entry.md` and
`references/loop-enforcement.md`.

---

## Report and Git

- **Report update contract (Zone A script + Zone B narrative):**
  See `references/report-updates.md`
- **Approach folder schema (6 mandatory + 2 optional files,
  forbidden extensions auto-moved to `artifacts/`):** See
  `references/evaluation-contract.md` §Approach folder schema
- **Two-tree split (`approaches/` vs `artifacts/`,
  `fixed.paths.artifacts_dir_for`):** See
  `references/evaluation-contract.md` §Two-tree split
- **Monitoring contract (≥2 lines, ≥3 for long trials,
  `monitoring_violation` status):** See
  `references/evaluation-contract.md` §Monitoring contract
- **Git rules:** See `references/git-management.md` (one .gitignore
  rule: `artifacts/`; never revert; full reproducibility kit in
  `approaches/`)
- **Sources:** See `references/session-init.md` header for upstream repos

## Self-Refinement

This skill participates in the co-intelligence feedback loop. After completing
a task, if friction was observed, suggest: "Want me to `/skillsmith autoresearch`
to refine this?" and log to `$PLUGIN_DATA/friction.md`.
