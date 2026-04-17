# Experiment Loop Protocol

The full protocol for the autonomous experiment loop. This reference
expands on §Core Loop Contract in SKILL.md with operational detail:
artifact review, hypothesis formation, runtime estimation, soft-kill
recovery, plateau search, and the exact per-iteration sequence.

---

## The 4-tool-call iteration

Each iteration writes three markdown files and runs one Bash command,
in this exact order:

```
Tool 1 (Write, SKIP on iteration 1):  approaches/<PREV>_<slug>/commentary.md
Tool 2 (Write):                       approaches/<NNN>_<slug>/rationale.md
Tool 3 (Write):                       approaches/<NNN>_<slug>/approach.py
Tool 4 (Bash):                        cd <session_dir> && python3 eval_and_record.py approaches/<NNN>_<slug>
                                      (use run_in_background: true if estimated >background_threshold_seconds)
```

**On iteration 1** (first real approach after the smoke test): skip
Tool 1 — there is no previous approach in the loop to comment on
(the smoke test's commentary was written during the smoke-test
sequence at end of setup).

**On every subsequent iteration**: all 4 tool calls fire, in order.
Commentary.md is written BEFORE rationale.md because the lessons
from the previous trial shape the hypothesis for the next one.

**Full sidecar spec** — required fields, examples, crash handling:
`references/sidecars.md`.

---

## Step 1 — REVIEW (no tool call, thinking only)

Before writing commentary.md, read the previous trial's artifacts
with the Read tool. You are multimodal — read images directly:

- `approaches/<PREV>/visualization.png` — see prediction patterns,
  error distribution, where the model fails. Often the most
  informative.
- `approaches/<PREV>/scores.json` and `metrics.json` — detailed
  metrics
- `approaches/<PREV>/training_progress.json` — convergence behavior
- `approaches/<PREV>/live.log` — full stdout/stderr including any
  crash traces
- Any checkpoints saved by the approach

Then review `results.json` for the broader picture:

- What has been tried (all statuses, including crashes)
- What has NOT been tried (paradigm gaps against
  `loop_settings.paradigm_categories`)
- Which approaches came closest (even if discarded)
- Patterns: what seems to help? what seems to hurt?
- User ideas queue: any unexplored suggestions from the user?
- Visual patterns across recent approaches — which segments does
  the model consistently struggle with? Systematic or random errors?

Also check `bibliography.md` periodically — especially before
hypothesizing. Grep for `[BibKey]` citations across previous
`rationale.md` and `commentary.md` files to find papers you've
already engaged with.

## Step 2 — COMMENTARY (Tool 1: Write)

Write `approaches/<PREV>_<slug>/commentary.md` with the five required
fields: Result, Vs. hypothesis, Vs. bibliography, Visualization,
Lessons. 5-15 lines. See `references/sidecars.md` for field definitions
and examples.

This captures what you just learned from the previous trial. The
`Lessons` field should directly feed the next rationale's `Builds on`
and `Hypothesis`.

On iteration 1 skip this step — there is no previous trial in the loop.

## Step 3 — HYPOTHESIZE + RATIONALE (Tool 2: Write)

Form a specific hypothesis:

> "I believe `<approach>` will improve `<metric>` because `<reason>`.
> This has not been tried because `<gap>`."

Strategy:

- Prefer breadth early (explore different paradigms)
- Depth later (refine what works)
- When stuck: combine near-misses, try opposites, revisit user ideas,
  rotate paradigms, delegate to `co-intelligence:bibliography` on
  plateau
- Do NOT self-censor ideas that "probably won't beat the best." Try
  them. Data points matter.

Then write `approaches/<NNN>_<slug>/rationale.md` with the four
required fields: Idea, Hypothesis, Builds on (including any BibTeX
citations from `bibliography.md`), What we'll learn. See
`references/sidecars.md`.

### Runtime estimation (use thinking mode)

Before writing the approach code, estimate total runtime (data loading
+ feature extraction + training + prediction) based on:

- Method type: tree models (10-60s/model), neural nets (2-20min),
  baselines (<10s)
- Prior trials of similar type (check `results.json` for
  `runtime_seconds` on past approaches)
- Fixed costs: feature extraction, data loading, visualization (often
  30-300s)
- Number of models: e.g. K-fold × seeds, ensemble members, Optuna
  trials

Use this estimate to decide launch strategy via
`loop_settings.background_threshold_seconds`:

- Estimate < threshold → foreground Bash call
- Estimate ≥ threshold → `run_in_background: true`, monitor
  `training_progress.json` every 30-60s

## Step 4 — APPROACH.PY (Tool 3: Write)

Write `approaches/<NNN>_<slug>/approach.py`. The `run(data)` contract
and sandbox rules (no imports from `fixed/`, relative paths only, no
secrets, etc.) are defined in **`references/evaluation-contract.md`** —
consult it if unsure what the approach is and isn't allowed to do.

- Implement `run(data)` cleanly. Self-contained, no hardcoded paths.
- Implementation analysis goes in the **docstring** (different from
  rationale.md — docstring is for code-level API notes, rationale.md
  is for the high-level narrative).
- Follow the live-logging CONTRACT (see `references/live-logging.md`):
  define `_log()` helper, call it at least at training start and end.
  For any trial running longer than ~10s, also call `_log()` during
  training (per epoch or periodic). Silent trials are marked
  `monitoring_violation` by `eval_and_record.py` and cannot be kept.
- For iterative training, write `training_progress.json` per epoch so
  background monitoring can see progress.
- **Checkpoint saving (MANDATORY):** save model checkpoints to
  `artifacts_dir_for(__file__)` — never to the approach folder. The
  harness enforces this by auto-moving any forbidden file type or
  oversized file out of `approaches/<NNN>_<slug>/` into
  `artifacts/<NNN>_<slug>/`, but write to the right place from the
  start to keep logs clean.

  ```python
  import pickle, os
  from fixed.paths import artifacts_dir_for

  adir = artifacts_dir_for(__file__)
  for epoch in range(n_epochs):
      train_one_epoch(model, ...)
      with open(os.path.join(adir, f"ckpt_epoch_{epoch:03d}.pkl"), "wb") as f:
          pickle.dump(model, f)
  ```

- **Checkpoint loading (when reusing architecture):** before training,
  look for prior approaches with compatible architectures and load
  their latest checkpoint as a warm start. Prior checkpoints live in
  `artifacts/<NNN>_<slug>/`, accessed via the parent artifacts dir
  derived from the current one.

  ```python
  import glob, pickle, os
  from fixed.paths import artifacts_dir_for

  my_adir = artifacts_dir_for(__file__)
  session_artifacts = os.path.dirname(my_adir)  # artifacts/ at session root
  ckpts = sorted(
      glob.glob(os.path.join(session_artifacts, "*/ckpt_epoch_*.pkl")),
      key=os.path.getmtime,
  )
  if ckpts:
      prior = pickle.load(open(ckpts[-1], "rb"))
      # Use as initialization if architecture matches
  ```

- **Optuna for hyperparameter tuning:** when the approach has tunable
  knobs, use Optuna inside `approach.py` instead of guessing. Keep
  studies small (10-30 trials within the per-approach budget).

  ```python
  import optuna
  optuna.logging.set_verbosity(optuna.logging.WARNING)

  def objective(trial):
      lr = trial.suggest_float("lr", 1e-4, 0.1, log=True)
      reg = trial.suggest_float("reg", 1e-5, 1.0, log=True)
      return validation_score(train(lr=lr, reg=reg))

  study = optuna.create_study(direction="minimize")
  study.optimize(objective, n_trials=20,
                 timeout=estimated_budget * 0.8)
  ```

## Step 5 — EVALUATE (Tool 4: Bash)

**This is ONE Bash call. Nothing else.**

Canonical launch (per `references/live-logging.md` Rule 4) — **uses
`tee` so output streams to BOTH `live.log` AND Claude Code's
background-shell indicator simultaneously:**

```bash
timeout <N> stdbuf -oL -eL uv run python -u eval_and_record.py approaches/<NNN>_<slug> 2>&1 \
  | stdbuf -oL tee approaches/<NNN>_<slug>/live.log
```

- `python -u` + `stdbuf -oL -eL` force line-buffered output
- `2>&1` merges stderr into stdout before `tee` so stack traces land
  in both streams
- `tee` forwards each line to BOTH `live.log` (persistent, grep-able,
  committed to git, readable by the agent next iteration) AND stdout
  (captured by Claude Code's "N shell" background indicator so the
  user can watch progress live without a second terminal)
- `timeout <N>` bounds execution and enables soft-kill recovery
- On macOS install `stdbuf` via `brew install coreutils`; without it,
  drop the `stdbuf` wrappers and rely on `python -u` alone

For trials estimated ≥ `background_threshold_seconds`: use
`run_in_background: true` on the Bash call. Include the exact
`tail -f` command in the message so the user can copy-paste it.
Monitor `training_progress.json` every 30-60s while waiting.

### Soft-kill protocol

If monitoring reveals the trial is doomed — projected time far
exceeds budget, loss diverging, training stalled — kill the process:

```bash
# Unix
pkill -f 'eval_and_record.*approaches/<NNN>' 2>/dev/null
# Windows Git Bash
wmic process where "commandline like '%approaches/<NNN>%'" call terminate 2>/dev/null
```

Then check what checkpoints were saved and adjust the next approach.
Do NOT pass `--timeout` to `eval_and_record.py` — soft-kill is the
mechanism for aborting, and it's managed by the agent's monitoring
loop, not by `eval_and_record.py`.

### What `eval_and_record.py` does

It reads `loop-settings.json` on startup, loads and runs the approach,
computes scores and metrics, writes `scores.json` and `metrics.json`,
generates `visualization.png` via `fixed/visualize.py`, decides
keep/discard, git-commits the approach, regenerates `progress.png`,
updates `report.md` and the session `README.md`, updates `.loop-state`,
and prints one of:

- `NNN: KEEP (score). <brief>`
- `NNN: DISCARD (score). <brief>`
- `!! INCOMPLETE (reason)` — halt loop, fix before continuing
- `!! MISSING_RATIONALE` — rationale.md was absent, refuse to run
- `!! SEARCH_NEEDED (N consecutive discards, find M ideas)` — plateau
  trigger
- `!! SEARCH_SUGGESTED` — per-trial search (if
  `search_every_trial: true`)
- `!! RESEARCH_INCOMPLETE (n/10 entries)` — bibliography not seeded,
  refuse to run the first approach

**NEVER do any of these as separate tool calls:**

- Generate or save plots
- Git add/commit
- Update `report.md`, `README.md`, or `progress.png`
- Run matplotlib or any visualization code

If you find yourself writing code for any of the above outside
`eval_and_record.py`, STOP. You are creating an exit point.

## Step 6 — GOTO step 1

When the Bash call completes, the next iteration begins immediately
with Step 1 (review artifacts of what just finished). The message
format for the turn between Bash completion and the next write is:

```
**NNN: KEEP/DISCARD** (score). [One sentence about what to try next.]
<next tool call>
```

Two lines of text max. No analysis paragraph. No "key learnings" list.
No summary table. Those go in `commentary.md`.

Write, Bash, Write, Write, Write, Bash — forever, until the user says
stop.

---

## Anti-patterns (FORBIDDEN)

### Separate plot generation

```
# WRONG — creates exit point
Write: approach.py
Bash: python3 eval_and_record.py approaches/005_foo
Bash: python3 -c "import matplotlib; ..."   # ← EXIT POINT
Write: next approach
```

```
# CORRECT — eval_and_record.py handles everything
Write: commentary.md (for 004)
Write: rationale.md (for 005)
Write: approach.py   (005)
Bash:  eval_and_record.py approaches/005_foo
```

### Separate git commits

```
# WRONG
Bash: python3 eval_and_record.py approaches/005_foo
Bash: git add . && git commit -m "..."   # ← EXIT POINT
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
<Write commentary.md for 005>
```

### Skipping sidecars

```
# WRONG
Write: approach.py                       # ← missing rationale.md
Bash:  eval_and_record.py → !! MISSING_RATIONALE

# CORRECT
Write: commentary.md (previous)
Write: rationale.md  (current)
Write: approach.py   (current)
Bash:  eval_and_record.py
```

---

## Self-check before sending (BLOCKING)

This is a secondary defense. The primary defense is the Stop hook in
`~/.claude/settings.json` which physically prevents stopping. But if
the Stop hook is missing or misfiring, this self-check is your last
line of defense.

Before sending your message, verify ALL of these. If ANY fails, fix
it before sending:

1. Last content block is a `tool_use` (Write or Bash), NOT text
2. Message text is at most 2 lines
3. No analysis, summaries, or findings in message text
4. Implementation analysis is in `approach.py` docstring; narrative
   analysis is in `rationale.md`/`commentary.md`
5. You are NOT about to stop — check: is there a next Write or Bash
   call?
6. If this is iteration N≥2: did you write `commentary.md` for the
   previous approach this turn or last turn?
7. Did you write `rationale.md` for the current approach?
8. You have NOT used any forbidden words: *converging*, *plateau*,
   *exhaustive*, *well-optimized*, *structural bottleneck*,
   *key findings*, *key learnings*, *confirmed optimal*

**If you catch yourself writing a summary, STOP. Delete the summary.
Write the next iteration's sidecars and approach.py instead. The
summary instinct is the #1 way loops die.**

---

## Approach naming

| Situation | Folder name |
|---|---|
| Normal | `003_relu_instead_of_gelu` |
| Crash | `005_deep_mlp` (status in `commentary.md` and `scores.json`) |
| Smoke test | `000_smoke_test` (plumbing check; 001+ are real approaches) |

Use `NNN_descriptive_slug`. Zero-padded NNN. No tag prefix (the
session tag is NOT part of the folder name — it lives once at the
session level in `results.json["tag"]`). Score is in `scores.json`,
not the folder name.

---

## Paradigm rotation (enforced)

From `loop_settings.paradigm_categories`. The rotation rules:

| Discards | Action |
|---|---|
| 5 in one category | Switch to a different paradigm category |
| 10 across all tried categories | Invent a NEW category (not in the starting list) |
| 20+ | Re-read `results.json` end-to-end, combine near-misses, try radical ideas |
| 50+ approaches total | Mine the log for second-order insights (combinations of prior partial wins) |
| 100+ | You are doing exactly what the user asked. Keep going. |

---

## Approach completion gate

Before moving to the next approach, `eval_and_record.py` output must
NOT contain `!! INCOMPLETE`. If it does, diagnose and fix the missing
artifact before writing the next rationale. Common fixes:

- **Plots missing:** if `visualization.png` is absent on a non-crash
  trial, `fixed/visualize.py` crashed. Check the traceback in
  `live.log`. If trial genuinely crashed, absence is expected — the
  harness does NOT generate stub plots (see
  `references/evaluation-contract.md` §Approach folder schema).
- **Scores missing:** check if `fixed/evaluate.py` threw an exception
- **MISSING_RATIONALE:** you forgot Tool 2 — write rationale.md and
  re-run eval
- **MONITORING VIOLATION:** `approach.py` produced too few lines in
  `live.log`. The trial is marked `monitoring_violation` and cannot
  be kept even if the score is good. Rewrite the SAME `approach.py`
  with `_log()` calls at start/middle/end (do not advance the trial
  number — the fix is to the contract, not to the idea). See
  `references/live-logging.md`.
- **MOVED TO ARTIFACTS:** you wrote a checkpoint or heavy file
  directly to the approach folder; the harness moved it to
  `artifacts/<NNN>_<slug>/`. Use `fixed.paths.artifacts_dir_for(__file__)`
  in `approach.py` next time so it lands in the right place from
  the start.
- **Training progress missing:** if the trial was iterative,
  `approach.py` didn't write `training_progress.json` — fix the
  approach. If the trial was one-shot, absence is expected.

Never skip a broken approach. Fix it first.

---

## Search callbacks — plateau and per-trial

`eval_and_record.py` emits markers that trigger mid-loop research.
Thresholds are in `loop-settings.json`.

### Plateau search (`!! SEARCH_NEEDED`)

Triggers when consecutive discards ≥
`search_on_plateau_threshold` (default: 10).

When you see this marker:

1. **Stop and search.** Do NOT write the next rationale yet.
2. **Delegate to `co-intelligence:bibliography`** in micro-mode —
   target `bibliography_target_per_plateau` papers (default: 10),
   1 wave. Feed it:
   - The task framing from `experiment-plan.md`
   - A summary of the last 10 discards (paradigms tried, error
     patterns from commentary.md files)
   - Any BibTeX keys already cited, so the skill can skip known
     papers
3. **Copy new entries into the session's `bibliography.md` and
   `bibliography.bib`** — append, never overwrite. Also update
   `references/INDEX.md` with key-insight summaries for the new
   papers.
4. **Generate `search_on_plateau_ideas_count` new approach ideas**
   grounded in the just-discovered papers. Append them to
   `user_ideas_queue` in `results.json` with
   `source: "plateau-search"` and the BibTeX keys that inspired them.
5. **Continue the loop**, drawing the next approach from these fresh
   ideas first. The rationale MUST cite the new papers.

**Never do a generic web search in place of the bibliography
delegation.** The bibliography skill produces structured, deduplicated,
quality-gated entries. Generic web search produces noise.

### Per-trial search (`!! SEARCH_SUGGESTED`)

Triggers after every trial when `search_every_trial: true`. Much
lighter:

1. Search for ONE new idea relevant to the task that you haven't
   tried. Can be generic web search or a single targeted bibliography
   query.
2. Add to `user_ideas_queue` with `source: "per-trial-search"`.
3. Consider using it for the next approach (not mandatory).
4. Continue the loop.

Off by default.

### Narrative update (`!! NARRATIVE_DUE`)

Triggers every N trials (`narrative_update_every_n` in
`loop-settings.json`, default 10) and on the first real trial (001)
to seed Zone B of `report.md` from the start.

When you see this marker:

1. **Read the last N `commentary.md` files** to reconstruct the
   pattern. What lineages are alive? What's the gap to the current
   best? Which paradigms have been exhausted?
2. **Read the current Zone B prose** in `report.md` (between
   `<!-- auto:end -->` and end of file) to see what the previous
   update said.
3. **Edit Zone B** — rewrite the four narrative sections
   (`## Synthesis`, `## What works`, `## What doesn't work`,
   `## Next Steps`) to reflect the new state. Always use the full
   `<NNN>_<slug>` form (ideally as clickable links) when mentioning
   specific trials — short `NNN` form is OK in subsequent references
   within the same paragraph.
4. **Delete `.narrative-dirty`** from the session root after writing.
5. **Continue the loop.**

Do NOT touch Zone A (everything between the auto-markers) — that's
`update_report.py`'s territory and any hand edits are overwritten
next trial.

Full spec: `references/report-updates.md`.

---

## Soft-kill recovery

When you kill a background trial early (via pkill/wmic/taskkill):

1. The process terminates. `eval_and_record.py` will NOT have
   recorded the result.
2. Check the approach folder for partial artifacts:
   - `training_progress.json` — how far did it get?
   - `ckpt_epoch_*.pkl` — any saved checkpoints?
   - `scores.json` — did evaluation complete before the kill?
3. Decide the next action using thinking mode:
   - **Same idea, faster method:** reduce iterations, simplify model,
     subsample data
   - **Resume from checkpoint:** if checkpoints exist, write a new
     approach that loads them and continues training from where it
     stopped
   - **Different idea:** switch to a fundamentally different, faster
     paradigm
4. Write the replacement approach (reuse the same NNN number or
   increment). Commentary.md for the killed trial should record the
   kill reason explicitly.

---

## Progress monitoring for background trials

For trials with iterative training, the approach writes progress to
`training_progress.json` in its directory. When running eval in
background:

1. Read `training_progress.json` every 30-60s
2. Look for: loss convergence, validation metric trends, training
   speed
3. If loss is clearly diverging or NaN: consider killing the
   background task early (this is a judgment call, not automatic)
4. Use observations to inform the next trial's design
5. When notified of completion, process the eval output normally
   and start the next iteration

---

## Autocompact recovery

If you notice context was compressed (you don't remember recent
approaches):

1. Read `.autoresearch-directives` — core rules
2. Read `.loop-state` — where you left off
3. Read `results.json` — full approach history (focus on last 10)
4. Read `loop-settings.json` — current loop tuning
5. Read `experiment-plan.md` — task definition
6. Read the last 2-3 `approaches/<NNN>/commentary.md` files for
   recent thinking
7. Resume the loop from the next approach number
