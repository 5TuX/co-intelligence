# Planning Protocol

Detailed protocol for designing a rigorous experiment before the loop begins.
This phase runs entirely in Plan Mode. No files are written until confirmed.

## Pre-Planning Checklist

Before asking questions, verify:
- [ ] Working directory has enough disk space
- [ ] Python/uv available (if compute experiments)
- [ ] `autoresearch/` dir exists or can be created in CWD

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

**CRITICAL WARNING about validation:**
> Agents running hundreds of experiments against a fixed validation set will
> overfit to quirks of that specific data. This is Goodhart's Law at machine speed.
> Mitigations:
> - Hold out a FINAL test set that is NEVER used during the loop (only for final report)
> - For time series: use expanding windows (train on past, predict future)
> - Periodically rotate validation folds
> - Log validation AND test scores separately

Propose the `get_data()` contract: return type, shape, example.
Confirm before moving on.

## Step 3 - Metrics and Visualization

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
