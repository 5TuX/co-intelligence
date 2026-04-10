# Planning Protocol

Detailed protocol for designing a rigorous experiment before the loop begins.
This phase runs entirely in Plan Mode. No files are written until confirmed.

## Pre-Planning Checklist

Before asking questions, verify:
- [ ] Working directory has enough disk space
- [ ] Python/uv available (if compute experiments)
- [ ] `autoresearch/` dir exists or can be created in CWD

## Phase 0 - Research (ENFORCED BY DEFAULT)

Before any approach can run, seed the session with prior art. This defaults to
ON. Opt out only with `--no-research` + a one-line justification.

**Why this exists:** HN/SkyPilot evidence and our own v2 postmortem both show
the same failure mode: agents skip the library and spend hundreds of trials
reinventing known-bad ideas. A 30-minute research phase saves days of loop time.

**What the agent does (with user-in-the-loop):**

1. Ask the user: "Point me at any papers, blog posts, benchmarks, prior code,
   or forks you already know about for this task. I'll read them and summarize."
2. Do independent research: web search for state-of-the-art, GitHub code
   search for existing implementations, library docs via Context7.
3. Write `references/INDEX.md` in the session dir with at least N entries
   (N = `research_min_entries`, default 3, configurable at init). Each entry:

   ```markdown
   ## R<NNN> - <short title>

   - **Source:** <URL or citation>
   - **Type:** paper | blog | repo | docs | book | personal_note
   - **Key insight:** <one to three sentences, what the source actually says>
   - **Applicable to:** <which initial hypothesis or approach category this informs>
   - **Read on:** <YYYY-MM-DD>
   ```
4. Summarize findings to the user and ask: "Anything missing? Anything wrong?"
   Revise. This is the only place agent-only research enters the loop; from
   here on the agent reads its own INDEX.md before writing new approaches.

**Enforcement:**

- Session init writes `research_phase_required: true` into `results.json` by
  default, `false` when `--no-research` is passed.
- `eval_and_record.py` refuses to run the first approach if
  `research_phase_required: true` AND `references/INDEX.md` has fewer than
  `research_min_entries` entries. It prints:
  `!! RESEARCH_INCOMPLETE: <n>/<N> references, read sources before continuing`.
- `--no-research` opt-out requires a justification string recorded in
  `results.json` as `research_phase_skip_reason` (e.g., "pure toy
  demo, no prior art applies").

**What does NOT count as research:**

- Reading results.json from a prior unrelated session.
- "I already know X" without a citation.
- An empty stub file that just names papers without key-insight summaries.

Research is about importing specific, cited knowledge into the session, not
about satisfying a checkbox.

## Step 1 - Task Framing

Present the task back in your own words. Then ask:

1. **Task type**: prediction (output a value), generation (produce an artifact),
   or optimization (find best parameters)?
2. **Input**: What does each approach receive? (raw data, feature matrix, text,
   images, time series, configuration...)
3. **Output**: What must each approach return? (label, score, mask, forecast,
   embedding, generated artifact...)
4. **Hard constraints**: Must be interpretable? Must run in <Ns per sample?
   Only pre-installed packages? Memory limit?

Reformulate as: "Each approach receives **X** and returns **Y**."
Confirm before moving on.

## Step 2 - Data

Ask:

1. **Source**: Local path, URL, API, generated synthetically?
2. **Format**: CSV, images, JSON, numpy, parquet, text files?
3. **Size**: Approximate sample count, file size
4. **Features**: Key columns/fields, types (numeric, categorical, text, temporal)
5. **Split strategy**: Options and risks:
   - Random train/val/test: simple but risks temporal leakage
   - Time-based expanding window: best for time series (RECOMMENDED for temporal data)
   - Stratified: if class imbalance
   - Pre-existing split: if dataset comes with one
6. **Known gotchas**: Class imbalance? Missing values? Leakage risks?
   Duplicate rows? Encoding issues?

**Hold-out test set is ENFORCED BY DEFAULT.**

Agents running hundreds of experiments against a fixed validation set will
overfit to quirks of that specific data. This is Goodhart's Law at machine
speed. The hold-out test set is the only defense that actually works against
this pattern at scale: the agent literally cannot see those samples, so it
cannot overfit to them.

Required setup (default):

- `get_data()` in `fixed/data_prep.py` takes an `include_test_months` (or
  equivalent name) flag. The loop-time loader calls it with `False`, which
  strips the last N samples (time series) or the designated test split
  (non-temporal).
- `final_eval.py` is scaffolded at session init. It is the only file allowed
  to call `get_data(include_test_months=True)`. The loop never runs it.
- `eval_and_record.py` enforces the invariant via `test_set_reserved: true`
  in results.json.
- The final report (end of loop) compares loop-best validation score to
  final_eval test score. A large gap is the signature of validation
  overfitting.

For time series: also use expanding windows (train on past, predict future)
and log validation AND test scores separately.

Ask:
- "Confirm default: reserve a hold-out test set? [Y/n]"
- If yes: "What size? (For time series: how many trailing months/days. For
  non-temporal: what fraction or absolute count.)"
- If no: "`--no-holdout` requires a one-line justification. Why is a hold-out
  test set not applicable here?" Record as `test_set_skip_reason` in
  results.json.

Valid opt-out reasons:
- Pure toy/demo with no generalization claim.
- The evaluation itself is the ground truth (e.g., running user-provided
  unit tests as the metric; there is no "held-out unit test").
- Theoretical optimization on a closed-form objective.

Not valid opt-out reasons:
- "I don't have enough data." (The right answer is a smaller hold-out or
  cross-validation with a final unseen fold, not skipping the gate.)
- "It makes the loop slower." (The loop does not use the hold-out; it's
  stripped at load time.)

Propose the `get_data()` contract: return type, shape, example.
Confirm before moving on.

## Step 3 - Metrics and Visualization

### Goodhart warning (read before picking the primary metric)

Every metric you expose will be gamed. The agent is not being malicious;
gradient descent on a proxy is what optimization *is*. Your job during
planning is to pick a primary metric where gaming it and improving the
underlying task are hard to distinguish, and to add guard metrics that
catch gaming when they diverge.

Two useful classifications:

- **Phenomenon-improving change:** makes the model actually better at the
  underlying task (exposes hidden structure, uses a more expressive family,
  fixes a data bug, adds a signal the model was blind to).
- **Metric-gaming change:** improves the scalar score without improving the
  underlying task. Example: tuning a damping coefficient to squeeze 0.2% out
  of a weighted-accuracy metric; exploiting how rounding in predictions
  interacts with rounding in the scorer; overfitting to the validation
  window's quirks.

The heuristic, reused at hypothesis selection (Step 6): if you can't explain
in one sentence how the change would improve behavior on new, unseen data
from the same distribution, it's probably metric-gaming.

Defense in depth:
- Pick a metric that rewards generalization, not memorization.
- Add guard metrics (e.g., per-slice scores, worst-case error) that must
  not degrade.
- Enforce `min_improvement` (Step 3 Q6b) to kill noise.
- Enforce the hold-out test set (Step 2) so metric-gaming on validation
  shows up as test-set regression.

Ask:

1. **Success metrics**: List all (accuracy, F1, RMSE, latency, code quality score...)
2. **Direction**: Higher is better or lower is better? (per metric)
3. **Primary metric**: Which one governs keep/discard decisions?
4. **Multi-objective**: If multiple metrics, how to combine?
   - Weighted sum (specify weights)
   - Pareto front (keep if improves any without degrading others)
   - Simple average of normalized scores
5. **Target**: Known baseline to beat? Published benchmark? Prior art?
6. **Anti-gaming**: Are there ways the metric could be gamed?
   (e.g., always predict majority class for accuracy)
   If so, add guard metrics.
6b. **Significance threshold (`min_improvement`)**: What is the smallest
    absolute delta on the primary metric that counts as a real improvement?
    Ask: "Below what delta should we treat a 'win' as noise and discard it?"
    Defaults to 0.0 (any strict improvement counts), but for most problems
    you want something like 0.001 (accuracy) or 0.01 (MASE/RMSE). This goes
    into `results.json` as `min_improvement` and is enforced in
    `eval_and_record.py`. Prevents 800-approach drift logs where every
    third trial claims a 1e-6 "win".
7. **Per-approach visualization**: What should each approach's plot show?
   Ask: "What visualization would help you judge each approach at a glance?"
   Examples by task type:
   - **Forecasting**: train/test split with predictions overlaid per series
   - **Classification**: confusion matrix, ROC curves, precision-recall curves
   - **Regression**: actual vs predicted scatter, residual distribution
   - **Generation**: grid of sample outputs
   - **Optimization**: convergence plot, parameter landscape, Pareto front
   - **NLP**: attention heatmaps, token-level scores, sample predictions

   Also ask: "Does the visualization need access to the approach's `run`
   function to generate predictions, or can it work from the evaluation
   result dict alone?" This determines whether `visualize()` receives
   `run_fn` (the approach's factory/model function) for detailed plots,
   or just the result dict for summary plots.

Confirm the final metrics dict and visualization design before moving on.

## Step 4 - Evaluation Contract

Draft the evaluation harness in pseudo-code:

```python
def run_approach(approach_module) -> dict[str, float]:
    data = get_data()
    output = approach_module.run(data)
    scores = {
        "metric1": compute_metric1(output, data.ground_truth),
        "metric2": compute_metric2(output, data.ground_truth),
    }
    return scores
```

Ask:
- "Does this contract correctly capture what you want to measure?"
- "Are there edge cases the harness should handle?" (empty output, wrong shape, NaN)
- "Should there be a guard command? (a check that must ALWAYS pass, like existing tests)"

The harness becomes IMMUTABLE once the session starts. Get it right here.

## Step 5 - Scope and Constraints

Define what the agent CAN and CANNOT do:

| Allowed | Forbidden |
|---------|-----------|
| Create/edit `approaches/*/approach.py` | Modify `fixed/evaluate.py` |
| Use any installed library | Modify `fixed/data_prep.py` |
| Use `uv add <package>` for new deps | Install system packages |
| Read any file in the session dir | Modify evaluation metrics |
| Create helper modules inside approach dir | Import between approaches |

**Complexity limits** (prevent throughput collapse):
- Max lines per approach.py: 500
- Max new features engineered: 50 (if applicable)
- Max training time: 2x budget (kill after)
- One experiment at a time (no background processes)

## Step 6 - Baseline, Hypotheses, and User Ideas

### Goodhart filter (reject metric-gaming hypotheses)

See Step 3's Goodhart block. Reject metric-gaming hypotheses from the initial
queue: if you can't explain in one sentence how the change would improve
behavior on new, unseen data from the same distribution, it's probably
metric-gaming. Phenomenon-improving hypotheses go into the queue;
metric-gaming ones do not.

Ask:

1. **Simplest baseline?** (random predictor, mean, majority class, off-the-shelf model)
2. **Known good starting point?** (if user has prior work)
3. **Top 3-5 hypotheses** to try first, ordered by expected impact
4. **Open-ended prompt:**
   > "Any other thoughts, ideas, hunches, papers, resources, or directions
   > you'd like explored? These go into the User Ideas Queue and will be
   > tracked throughout the experiment. Nothing is too speculative."

Record all ideas. They will be explored during the loop but don't limit
the agent's own ideation.

## Step 7 - Produce Experiment Plan

Write `$PLUGIN_DATA/autoresearch/<tag>/experiment-plan.md` with all collected info.
Template:

```markdown
# Experiment Plan: <task>

> Run `/autoresearch --resume=<tag>` to continue.
> The loop runs until you interrupt it.

**Goal:** <one sentence>
**Task type:** prediction | generation | optimization
**Tag:** <tag>
**Budget per approach:** <duration>
**Total budget:** <duration or "forever">

## Input/Output Contract
- **Input:** <type, shape, example>
- **Output:** <type, shape, example>
- **Constraints:** <list>

## Data
- **Source:** <path or URL>
- **Format:** <format>
- **Size:** <N samples>
- **Split:** <strategy + rationale>
- **Gotchas:** <known issues>
- **Hold-out test set:** <yes/no, size, never used during loop>

## Metrics
| Metric | Direction | Primary? | Weight | Anti-gaming note |
|--------|-----------|----------|--------|-----------------|

## Per-Approach Visualization
- **What to show:** <description of what each approach plot displays>
- **Needs run_fn:** <yes/no - whether visualize() needs the approach's run function>
- **Format:** <e.g., one subplot per series, confusion matrix grid, etc.>

## Evaluation Harness (pseudo-code)
<from Step 4>

## Scope
- Editable: approaches/*/approach.py
- Read-only: fixed/*, experiment-plan.md
- Complexity limits: <from Step 5>

## Initial Hypotheses Queue
1. [ ] 001: baseline
2. [ ] 002: <hypothesis>
3. [ ] ...

## User Ideas Queue
- [ ] <idea 1>
- [ ] <idea 2>
- (explored ideas get checked off with approach # reference)

## Settings
- Budget per approach: <duration>
- Total budget: <duration or "forever">
- Guard command: <if any>
```

Show the plan. Ask:
> "Does this experiment plan look right? Confirm to start, or tell me what to adjust."

**Wait for explicit confirmation.** Revise if needed. Do not proceed until confirmed.
