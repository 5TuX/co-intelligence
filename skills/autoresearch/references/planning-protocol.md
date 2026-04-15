# Planning Protocol — Deep Content per Topic

This file is the **why and how** reference for each of the eleven
clarifying-questions topics. It complements
`references/clarifying-questions.md`, which is the operational
checklist ("which question to ask next").

Agent workflow:

- Use `clarifying-questions.md` to decide which topic to ask next and
  what wording to use.
- Use this file (`planning-protocol.md`) when the user pushes back, or
  when the agent needs to explain WHY a default matters, or when
  drafting the concrete `fixed/evaluate.py` / visualization / plan
  template content.

The loop cannot start until all eleven topics are confirmed AND the
pre-flight walkthrough is approved. See
`references/loop-entry.md` for the post-clarifying step.

---

## Pre-planning checklist

Before asking any clarifying questions, verify:

- [ ] The chosen session storage location (from topic 11) has enough
      disk space for approaches × checkpoints × visualizations
- [ ] Python / `uv` available if the task involves compute experiments
- [ ] The session directory can be created at the chosen location
      (permissions, parent dir exists)

---

## Topic 1 — Task framing (deep content)

Reformulate the task as a clean input/output contract:

> "Each approach receives **X** and returns **Y**."

The agent should present this back in its own words and get explicit
confirmation before proceeding. If the user struggles to commit to a
single-sentence contract, that's a signal the task is under-specified
and should be decomposed into sub-tasks (each with its own session)
rather than papered over.

Classification helps downstream:

- **Prediction** — output a value (regression, classification,
  forecasting, ranking). Primary metric is usually an error/score on
  predicted vs. actual.
- **Generation** — produce an artifact (text, image, code, music).
  Primary metric is usually a learned or rule-based quality score.
- **Optimization** — find best parameters for a closed-form or
  simulated objective. Primary metric is the objective value itself.

Hard constraints belong in topic 1 if they shape the fundamental
contract (must be interpretable, must run in <N seconds per sample,
only pre-installed packages, memory ceiling). Runtime budget per
approach is NOT a topic-1 constraint — it's loop tuning, asked in the
pre-flight walkthrough.

---

## Topic 2 — Data (deep content)

Walk through these sub-questions in order:

1. **Source** — local path, URL, API, synthetic
2. **Format** — CSV, parquet, images, JSON, numpy, text
3. **Size** — approximate sample count, file size on disk
4. **Features** — key columns/fields and their types (numeric,
   categorical, text, temporal, image)
5. **Split strategy** — options and risks:
   - Random train/val/test — simple but risks temporal leakage
   - Time-based expanding window — best for time series, **strongly
     recommended** for anything temporal
   - Stratified — if class imbalance
   - Pre-existing split — if the dataset comes with one
6. **Known gotchas** — class imbalance, missing values, duplicate
   rows, encoding issues, label noise, leakage patterns

Propose a `fixed/data_prep.py` contract: `get_data()` returning what
shape, with what example. Get confirmation before topic 3.

---

## Topic 3 — Hold-out test set (deep content)

**Hold-out test set is strongly recommended by default.**

### Why this exists

Agents running hundreds of experiments against a fixed validation set
WILL overfit to quirks of that specific data. This is Goodhart's Law
at machine speed. The hold-out test set is the only defense that
actually works against this pattern at scale: the agent literally
cannot see those samples, so it cannot overfit to them.

### Required setup when enabled

- `get_data()` in `fixed/data_prep.py` takes an
  `include_test_months=False` (or equivalent name) flag. The
  loop-time loader calls it with `False`, which strips the last N
  samples (time series) or the designated test split (non-temporal).
- `final_eval.py` is scaffolded at session init. It is the ONLY file
  allowed to call `get_data(include_test_months=True)`. The loop
  never runs it.
- `eval_and_record.py` enforces the invariant via
  `test_set_reserved: true` in `loop-settings.json`.
- The final report (end of loop) compares loop-best validation score
  to `final_eval` test score. A large gap is the signature of
  validation overfitting.

For time series: also use expanding windows (train on past, predict
future) and log validation AND test scores separately throughout the
loop.

### Valid opt-out reasons

- Pure toy / demo with no generalization claim
- The evaluation itself is the ground truth (e.g., running
  user-provided unit tests as the metric — there is no
  "held-out unit test")
- Theoretical optimization on a closed-form objective

### NOT valid opt-out reasons

- *"I don't have enough data."* — the right answer is a smaller
  hold-out or cross-validation with a final unseen fold, not skipping
  the gate.
- *"It makes the loop slower."* — the loop does not use the hold-out;
  it's stripped at load time, so the loop is unaffected.

Record the justification in `loop-settings.json` as
`test_set_skip_reason` when the user opts out.

---

## Topic 4 — Metrics (deep content)

### Goodhart warning — read before picking the primary metric

**Every metric you expose will be gamed.** The agent is not being
malicious; gradient descent on a proxy is what optimization *is*. The
planner's job is to pick a primary metric where gaming it and
improving the underlying task are hard to distinguish, and to add
guard metrics that catch gaming when they diverge.

Two useful classifications:

- **Phenomenon-improving change** — makes the model actually better
  at the underlying task. Exposes hidden structure, uses a more
  expressive family, fixes a data bug, adds a signal the model was
  blind to.
- **Metric-gaming change** — improves the scalar score without
  improving the underlying task. Examples: tuning a damping
  coefficient to squeeze 0.2% out of a weighted-accuracy metric;
  exploiting how rounding in predictions interacts with rounding in
  the scorer; overfitting to the validation window's quirks.

**Heuristic, reused at hypothesis selection:** if you can't explain
in one sentence how the change would improve behavior on new, unseen
data from the same distribution, it's probably metric-gaming.

### Defense in depth

- Pick a metric that rewards generalization, not memorization
- Add guard metrics (per-slice scores, worst-case error) that must
  not degrade
- Enforce `min_improvement` (see below) to kill noise
- Enforce the hold-out test set (topic 3) so metric-gaming on
  validation shows up as test-set regression

### Questions to ask

1. **All success metrics** — accuracy, F1, RMSE, latency, quality
   score, etc.
2. **Direction** — higher is better or lower is better (per metric)
3. **Primary metric** — which one governs keep/discard decisions
4. **Multi-objective** — if multiple primaries, how to combine:
   weighted sum (specify weights), Pareto front (keep if improves any
   without degrading others), simple average of normalized scores
5. **Target** — known baseline to beat, published benchmark, prior
   art
6. **Anti-gaming** — obvious gameable shortcuts (always predict
   majority class for accuracy, always predict previous value for
   time series)? Add guard metrics.
7. **Significance threshold `min_improvement`** — what is the smallest
   absolute delta on the primary metric that counts as a real
   improvement? Defaults to `0.0` (any strict improvement counts),
   but for most problems something like `0.001` (accuracy) or `0.01`
   (RMSE/MASE) is saner. Stored in `loop-settings.json` and enforced
   by `eval_and_record.py`. Prevents 800-approach drift logs where
   every third trial claims a 1e-6 "win".

---

## Topic 5 — Visualization (deep content)

Ask: *"What visualization would help you judge each approach at a
glance?"*

The per-approach plot is the single most important artifact the agent
reads between trials. A vague or uninformative plot hobbles the
loop's ability to learn from failures. Push for specificity.

### Examples by task type

- **Forecasting** — train/test split with predictions overlaid per
  series, residuals below
- **Classification** — confusion matrix, ROC curves, precision-recall
  curves, per-class F1 bars
- **Regression** — actual vs predicted scatter, residual distribution
  histogram, residuals vs. feature
- **Generation** — grid of sample outputs with metric annotations
- **Optimization** — convergence plot, parameter landscape, Pareto
  front
- **NLP** — attention heatmaps, token-level scores, sample
  predictions with highlighting
- **Time series anomaly** — full series with anomaly markers, ROC vs
  confidence threshold

### `visualize()` contract

Ask: *"Does the visualization need access to the approach's `run`
function to generate predictions, or can it work from the evaluation
result dict alone?"*

This determines the signature of `fixed/visualize.py`:

- `visualize(result_dict, approach_dir)` — if the result dict already
  contains predictions
- `visualize(run_fn, data, result_dict, approach_dir)` — if the
  visualization needs to call `run_fn` on specific samples for
  detailed plots

Pick one and commit to it. This contract becomes IMMUTABLE alongside
`fixed/evaluate.py`.

---

## Topic 6 — Evaluation harness (deep content)

Draft `fixed/evaluate.py` as pseudo-code. Example:

```python
def evaluate(approach_module, data_prep) -> dict:
    """Called by eval_and_record.py for every approach.

    Returns a dict that eval_and_record.py writes to scores.json.
    Must contain the primary metric under the 'primary' key.
    """
    train, val = data_prep.get_data(include_test_months=False)
    result = approach_module.run(train)
    preds = result.predict(val.X)
    primary = custom_metric(val.y, preds)
    return {
        "primary": primary,
        "secondary": {
            "rmse": rmse(val.y, preds),
            "mae": mae(val.y, preds),
        },
        "predictions": preds.tolist(),  # optional, for visualize()
    }
```

Edge cases to discuss with the user:

- Empty output from `run()` — should it score at the worst value or
  raise?
- Wrong output shape — fail-fast (raise) is always correct, never
  silently coerce
- NaN in predictions — treat as crash at the worst metric value
- Runtime exceeds the per-approach budget — handled by soft-kill, not
  by evaluate.py
- Guard command — is there a check that MUST pass (existing unit
  tests, sanity constraints)? If so, it goes inside evaluate.py
  before metric computation.

**Once the user confirms, `fixed/evaluate.py` becomes IMMUTABLE.** The
agent cannot edit it during the loop. Get it right here.

For the full four-file contract spec (`approach.py` + the three
`fixed/*.py`), sandbox rules, scores vs metrics, and budget enforcement:
**`references/evaluation-contract.md`**.

---

## Topic 7 — Scope and constraints (deep content)

| Allowed | Forbidden |
|---|---|
| Create/edit `approaches/*/approach.py` | Modify `fixed/evaluate.py`, `fixed/data_prep.py`, `fixed/visualize.py` |
| Create/edit `approaches/*/rationale.md` and `commentary.md` | Modify `eval_and_record.py` |
| Use any pre-installed Python library | Modify `experiment-plan.md` after init |
| `uv add <package>` for new dependencies | Install system packages |
| Read any file in the session dir | Import between approach directories |
| Create helper modules inside an approach dir | Call out to external APIs without mentioning it |

### Complexity limits (prevent throughput collapse)

- Max lines per `approach.py`: 500 (soft cap; reach for helper
  modules inside the approach dir if you need more)
- Max new features engineered per approach: 50 (if applicable)
- Max training time: 2× the per-approach budget from
  `loop-settings.json` — `eval_and_record.py` enforces via `timeout`
- One trial at a time (background launches are OK; concurrent
  approaches are not)

Do NOT discuss runtime budget in topic 7. Budget is loop tuning; it
goes in the pre-flight walkthrough where the user can adjust it at
every loop entry.

---

## Topic 8 — Bibliography research / Phase 0 (deep content)

### Why this exists

HN/SkyPilot evidence and our own v2 postmortem both show the same
failure mode: agents skip the library and spend hundreds of trials
reinventing known-bad ideas. A 30-minute research phase saves days
of loop time.

### What the agent does when opted in

1. Ask the user: *"Point me at any papers, blog posts, benchmarks,
   prior code, or forks you already know about for this task. I'll
   read them and summarize."*
2. **Delegate to `co-intelligence:bibliography`** in short-form mode
   (target 15-25 papers, 1-2 waves). Feed it the task framing from
   topic 1 and any user-provided seed papers. It writes its results
   to `$PLUGIN_DATA/bibliography/<slug>/`.
3. Copy the bibliography results into the session directory as
   `$SESSION_DIR/bibliography.md` and `$SESSION_DIR/bibliography.bib`.
   Also write a short `$SESSION_DIR/references/INDEX.md` summarizing
   the key insight per paper (one paragraph each). Target: at least
   10 entries in `bibliography.md`.
4. Summarize findings to the user and ask:
   *"Anything missing? Anything wrong?"* Revise.

### Enforcement

- Session init writes `research_phase_required: true` into
  `loop-settings.json` when the user opts in, `false` when they opt
  out.
- `eval_and_record.py` refuses to run the first approach if
  `research_phase_required: true` AND `$SESSION_DIR/bibliography.md`
  has fewer than 10 entries. It prints:
  `!! RESEARCH_INCOMPLETE: <n>/10 entries, run bibliography search before continuing`.
- When the user opts out, the agent records the justification as
  `research_phase_skip_reason` in `loop-settings.json`
  (e.g., "pure toy demo, no prior art applies"). One line. Stored
  for reproducibility.

### What does NOT count as research

- Reading `results.json` from a prior unrelated session
- *"I already know X"* without a citation
- An empty stub file that just names papers without key-insight
  summaries

Research is about importing specific, cited knowledge into the
session, not about satisfying a checkbox. The bibliography delegation
enforces this: `co-intelligence:bibliography` rejects non-peer-reviewed
sources and returns structured entries with abstracts and citation
metrics.

---

## Topic 9 — Baseline and user ideas (deep content)

### Goodhart filter for the initial queue

Reject metric-gaming hypotheses from the initial queue. If the user
can't explain in one sentence how a proposed change would improve
behavior on new, unseen data from the same distribution, it's
probably metric-gaming. Phenomenon-improving hypotheses go into the
queue; metric-gaming ones do not.

### Questions to ask

1. **Simplest baseline** — random predictor, mean, majority class,
   off-the-shelf model. This is what the smoke test will run as
   approach 000.
2. **Known good starting point** — if the user has prior work to
   build on
3. **Top 3-5 hypotheses to try first**, ordered by expected impact.
   Each should come with a one-sentence rationale.
4. **Open-ended prompt:**

   > *"Any other thoughts, ideas, hunches, papers, resources, or
   > directions you'd like explored? These go into the User Ideas
   > Queue and will be tracked throughout the experiment. Nothing is
   > too speculative — weird ideas are data points."*

Record all ideas in `results.json` under `user_ideas_queue` with:

```json
{
  "id": "u003",
  "text": "Try an attention-free transformer variant (linear attention)",
  "status": "pending",
  "source": "user",
  "created_at": "<ISO timestamp>"
}
```

The loop tracks these and marks `status: "explored"` with an
`approach_ref` when an approach is based on the idea.

---

## Topic 10 — Session tag

Simple. Default: `YYYY-MM-DD-<slug-of-task>`. Becomes the session
directory name and the `report.md` title. Users can pick anything
that's a valid directory name.

---

## Topic 11 — Session storage location (deep content)

Default: `$PLUGIN_DATA/autoresearch/<tag>/` — i.e.
`~/.claude/plugins/data/co-intelligence-co-intelligence/autoresearch/<tag>/`.

Users can pick any directory they have write access to:

- Larger disk (experiments with heavy checkpoints)
- Project subdirectory (convenience, co-located with source)
- Dedicated research folder on a non-home SSD
- Networked storage for team visibility

### Symlink requirement for non-default locations

If the user picks a non-default location, session init MUST create a
discovery symlink at `$PLUGIN_DATA/autoresearch/<tag>/` pointing to
the physical directory. Rationale: the Stop hook in
`~/.claude/settings.json` globs
`$PLUGIN_DATA/autoresearch/*/.loop-active` and cannot be reconfigured
per session. The symlink is what keeps instance isolation working.

Record both paths in `loop-settings.json`:

```json
{
  "physical_path": "/data/research/autoresearch/2026-04-15-forecast/",
  "discovery_symlink": "/home/user/.claude/plugins/data/co-intelligence-co-intelligence/autoresearch/2026-04-15-forecast"
}
```

Session init creates the symlink via:

```bash
ln -s "$PHYSICAL_PATH" "$DISCOVERY_SYMLINK"
```

Validate that the symlink resolves and that `.loop-active` in the
physical dir is visible through the symlink.

---

## After all eleven topics

Transition to the pre-flight walkthrough (see
`references/loop-entry.md`). Do NOT write
`experiment-plan.md` yet — the walkthrough can surface tweaks that
retro-affect the plan.

Once the walkthrough is approved, write the plan using the template
below.

---

## Experiment plan template

Write to `$SESSION_DIR/experiment-plan.md`:

```markdown
# Experiment Plan: <task>

> To continue after stopping: type `/autoresearch resume <tag>` or
> `/autoresearch continue that session` or any equivalent natural-language
> phrasing. The loop runs until you interrupt it.

**Goal:** <one sentence>
**Task type:** prediction | generation | optimization
**Tag:** <tag>
**Physical path:** <from topic 11>
**Discovery symlink:** <from topic 11, or "none" if default location>

## Input/Output Contract

- **Input:** <type, shape, example — from topic 1>
- **Output:** <type, shape, example — from topic 1>
- **Hard constraints:** <list — from topic 1>

## Data

- **Source:** <path or URL — from topic 2>
- **Format:** <format>
- **Size:** <N samples>
- **Split:** <strategy + rationale — from topic 2>
- **Gotchas:** <known issues>
- **Hold-out test set:** <yes/no + size, from topic 3>

## Metrics

| Metric | Direction | Primary? | Weight | Anti-gaming note |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

- **`min_improvement`:** <threshold from topic 4>

## Per-approach visualization

- **What to show:** <from topic 5>
- **Needs `run_fn`?** <yes/no, from topic 5>
- **Format:** <one subplot per series / confusion matrix grid / etc.>

## Evaluation harness (pseudo-code)

<pseudo-code from topic 6, with commitment that this becomes IMMUTABLE
at session init>

## Scope

- **Editable:** `approaches/*/approach.py`, `rationale.md`, `commentary.md`
- **Read-only:** `fixed/*`, `experiment-plan.md`, `eval_and_record.py`
- **Complexity limits:** <from topic 7>

## Bibliography research (Phase 0)

- **Enabled:** yes / no
- **If no — justification:** <reason>
- **If yes — current entry count:** <N in bibliography.md>

## Initial hypotheses queue

1. [ ] `001_baseline` — <hypothesis>
2. [ ] `002_<name>` — <hypothesis>
3. [ ] ...

## User ideas queue

(synced to `results.json` under `user_ideas_queue`)

- [ ] `u001` — <idea>
- [ ] `u002` — <idea>
- (explored ideas get checked off with `status: "explored"` and an `approach_ref`)
```

Then show the plan to the user and ask:

> *"Does this experiment plan look right? Confirm to start, or tell
> me what to adjust."*

**Wait for explicit confirmation.** Revise if needed. Do NOT proceed
to session init or the smoke-test proposal until the plan is
confirmed.
