# Evaluation Contract

The four-file contract set that defines the sandbox boundary between
the agent's creative work (`approach.py`) and the immutable evaluation
harness (`fixed/evaluate.py`, `fixed/data_prep.py`, `fixed/visualize.py`).

This is the single source of truth for what each file must look like,
what the agent may and may not touch, and how scores differ from
metrics. Other files point here rather than duplicating the contract.

---

## The files

| File | Writable | When written | Role |
|---|---|---|---|
| `approaches/<NNN>_<slug>/approach.py` | Agent writes one per trial | Tool 3 of the Core Loop Contract | The creative work: any algorithm, model, heuristic — exports `run(data)` |
| `fixed/evaluate.py` | **IMMUTABLE** | Session init, from topic 6 pseudo-code | Loads data, runs approach, computes all scores and metrics |
| `fixed/data_prep.py` | **IMMUTABLE** | Session init | Loads and preprocesses data; honors `include_test_months=False` during loop |
| `fixed/visualize.py` | **IMMUTABLE** | Session init | Generates `visualization.png` per approach |
| `fixed/paths.py` | **IMMUTABLE** | Session init | Helper exposing `artifacts_dir_for(__file__)` so `approach.py` knows where to put heavy files |
| `eval_and_record.py` | **IMMUTABLE** | Session init | Tool 4 of the Core Loop Contract: runs evaluate, writes scores/metrics, calls visualize, calls update_report, enforces approach folder schema and monitoring contract |
| `update_report.py` | **IMMUTABLE** | Session init | Regenerates Zone A of `report.md` from `results.json` + sidecars on every trial. See `references/report-updates.md` |

The IMMUTABLE label is enforced by the Rules section in SKILL.md and
by the §Scope and constraints clarifying question (topic 7). The
agent may READ any of these files but never modify or import from
`fixed/` outside the standard entry points listed below.

---

## `approach.py` contract (agent-writable, one per trial)

```python
def run(data):
    """
    Args:
        data: the exact object returned by fixed.data_prep.get_data()
    Returns:
        output in the exact format fixed.evaluate expects
    """
    # Anything goes here:
    # - any algorithm, model, heuristic
    # - any library already installed (uv add <pkg> for new deps)
    # - any preprocessing, feature engineering, transformation
    # Two non-negotiable rules:
    # 1. Receive data, return output, same types every trial.
    # 2. Heavy files (checkpoints, weight dumps, caches) MUST go to
    #    artifacts_dir_for(__file__), never to the approach folder.
    #    See §Approach folder schema and §Two-tree split below.
    ...
```

The `run()` signature is the only fixed part. Inside, the agent has
full freedom: models, libraries, feature engineering, hyperparameter
tuning (Optuna), checkpoint loading from prior approaches.

See `references/live-logging.md` for the `_log()` helper every
`approach.py` must define, and `references/experiment-loop.md` §Step 4
for the full operational protocol (runtime estimation, background
launches, checkpoint save/load, Optuna integration).

---

## `fixed/evaluate.py` contract (IMMUTABLE)

```python
def evaluate(run_fn) -> dict:
    """Load data, run approach, compute and return all scores and metrics.

    Args:
        run_fn: the approach's run() function

    Returns:
        dict with at minimum the objective keys defined in results.json.
        May also include additional metrics (runtime, per-component scores).
        Objectives drive keep/discard via eval_and_record.py; additional
        metrics are logged to metrics.json but do not affect the ratchet.
    """
    from fixed.data_prep import get_data
    data = get_data()
    output = run_fn(data)
    return {
        "metric1": compute_metric1(output, data.labels),
        # Additional metrics (not used for keep/discard):
        "runtime_seconds": elapsed,
    }
```

Drafted as pseudo-code during clarifying question 6
(`references/planning-protocol.md` Topic 6), materialized at session
init, and never edited afterward. If the experiment design later
requires a change to this file, the user must start a new session —
changing the evaluator invalidates comparisons with every prior
approach.

---

## `fixed/data_prep.py` contract (IMMUTABLE)

```python
def get_data(include_test_months=False):
    """Load and preprocess data. Return canonical dataset object.

    Args:
        include_test_months: when True, exposes the hold-out test
            window. ONLY final_eval.py is allowed to call this with
            True. The loop-time evaluator always calls with False
            (the default), which strips the hold-out samples.
    """
    ...
```

The exact parameter name may vary (`include_test_months`,
`include_holdout`, `full_dataset`) depending on the task's data
structure — the key property is that there's a single flag that
distinguishes loop-time loading from final-eval loading, and the
loop-time path never sees the hold-out.

When `test_set_reserved: false` in `results.json` (the user opted
out of a hold-out during clarifying question 3), the flag is
irrelevant and `get_data()` returns the full dataset every time.

---

## `fixed/paths.py` contract (IMMUTABLE)

A tiny helper that gives `approach.py` a stable way to locate its
paired heavy-artifacts directory without hardcoding paths.

```python
# fixed/paths.py — IMMUTABLE
import os

def artifacts_dir_for(approach_file):
    """Return the paired artifacts dir for this approach, creating it if needed.

    Args:
        approach_file: pass __file__ from inside approach.py
    Returns:
        Absolute path to artifacts/<approach_name>/, with the directory
        created if it didn't exist.
    """
    approach_dir = os.path.dirname(os.path.abspath(approach_file))
    approach_name = os.path.basename(approach_dir)
    session_root = os.path.dirname(os.path.dirname(approach_dir))
    adir = os.path.join(session_root, "artifacts", approach_name)
    os.makedirs(adir, exist_ok=True)
    return adir
```

`fixed.paths` is a **whitelisted standard entry point** — the agent
MAY `from fixed.paths import artifacts_dir_for` inside `approach.py`.
Everything else in `fixed/` remains off-limits.

Usage in `approach.py`:

```python
from fixed.paths import artifacts_dir_for

def run(data):
    adir = artifacts_dir_for(__file__)
    # adir = ".../sessions/v4_six_month_baseline/artifacts/081_smooth_nophase/"
    for epoch in range(n_epochs):
        train_one_epoch(model, ...)
        with open(os.path.join(adir, f"ckpt_{epoch:03d}.pkl"), "wb") as f:
            pickle.dump(model, f)
    return predict_fn
```

---

## `fixed/visualize.py` contract (IMMUTABLE)

The user defined what the visualization should show during clarifying
question 5 (`references/planning-protocol.md` Topic 5).

```python
def visualize(result: dict, approach_dir: str, run_fn=None) -> None:
    """Generate per-approach visualization and save to approach_dir.

    Args:
        result: dict returned by evaluate() with scores and additional data
        approach_dir: path to approach folder (save visualization.png here)
        run_fn: (optional) the approach's run() function, for generating
                predictions to overlay on test data. When None, produce
                summary-only plots from the result dict.
    """
    # Implementation generated from the plan.
```

Choose one of two contract forms at session init:

- `visualize(result, approach_dir)` — if the result dict contains all
  predictions already
- `visualize(result, approach_dir, run_fn=...)` — if the visualization
  needs to call `run_fn` on specific samples for detailed plots

The choice is made during Topic 5 of planning; `fixed/visualize.py`
honors it.

**Visualization failure is non-fatal for scoring.** If `visualize()`
crashes, the approach still records scores and metrics;
`eval_and_record.py` prints `VIZ WARN: <error>` and moves on.
**No stub `visualization.png` is generated.** Absence of
`visualization.png` is itself the signal — `update_report.py` prepends
a `⚠` to the Status column in the Experiment Log, and the user
flipping through plots sees the gap.

**Crashes within partial output must be rendered honestly.** If the
model runs but fails on some subset of inputs (e.g. crashed on
constant-input cutoffs, produced NaN for some samples), the
visualization must SHOW the crash — empty spans, red markers,
explicit annotations. **Never fabricate data for failed timesteps.**
Never fall back to `np.median(series.tail(9))` or any similar
imputation. Silently imputed values invalidate every keep/discard
decision downstream.

---

## Scores vs. metrics

Two separate JSON files, two separate purposes:

- **`scores.json`** — the objectives defined in
  `results.json["objectives"]`. These drive keep/discard. Example:
  ```json
  {
    "scores": {"weighted_accuracy": 0.491},
    "status": "keep",
    "runtime_seconds": 45.2
  }
  ```
- **`metrics.json`** — additional measurements NOT used for
  keep/discard, but logged for analysis. Example:
  ```json
  {
    "per_product_accuracy": {"A": 0.65, "B": 0.33},
    "model_complexity": 12,
    "memory_peak_mb": 1843
  }
  ```

`eval_and_record.py` writes both files. Only `scores.json` affects
the keep/discard ratchet. The `min_improvement` gate (Topic 4 of
planning) applies to the primary score; metrics are informational.

---

## Two-tree split: `approaches/` and `artifacts/`

Each trial's outputs are split across two parallel top-level trees
inside the session directory:

```
$SESSION_DIR/
├── approaches/                       ← REPRODUCIBILITY (committed to git)
│   └── 081_smooth_nophase/
│       ├── rationale.md
│       ├── approach.py
│       ├── commentary.md
│       ├── scores.json
│       ├── metrics.json
│       ├── visualization.png         (optional — absence = crash signal)
│       ├── training_progress.json    (optional — absence = non-iterative or early crash)
│       └── live.log
└── artifacts/                        ← HEAVY (gitignored, session-local)
    └── 081_smooth_nophase/
        ├── ckpt_epoch_000.pkl
        ├── ckpt_epoch_001.pkl
        └── preprocessed_cache.npz
```

**Rule of thumb:**

- **`approaches/<NNN>_<slug>/`** — if losing this file means
  *"lose the record of the trial,"* it's reproducibility. Goes here.
- **`artifacts/<NNN>_<slug>/`** — if losing this file means
  *"re-run the trial,"* it's a heavy artifact. Goes here. Resolved
  via `fixed.paths.artifacts_dir_for(__file__)`.

The session root `.gitignore` has a single line: `artifacts/`. No
per-approach gitignore files are needed.

**Archival:**

```bash
# Archive the paper — full reproducibility kit
tar czf session.tar.gz approaches/ results.json report.md \
    fixed/ bibliography.md experiment-plan.md loop-settings.json \
    eval_and_record.py update_report.py

# Reclaim disk after the session is done
rm -rf artifacts/
```

---

## Approach folder schema (enforced)

The contents of `approaches/<NNN>_<slug>/` follow a fixed schema.
`eval_and_record.py` enforces it after every trial.

### Mandatory files (always present)

| File | Written by | When |
|---|---|---|
| `rationale.md` | agent | before the trial (Tool 2) |
| `approach.py` | agent | before the trial (Tool 3) |
| `commentary.md` | agent | after the trial, in the next iteration's Tool 1 |
| `scores.json` | `eval_and_record.py` | after the trial |
| `metrics.json` | `eval_and_record.py` | after the trial |
| `live.log` | tee launcher | continuously during the trial |

On a crashed trial, the agent still writes `rationale.md` and
`commentary.md`; `eval_and_record.py` still writes `scores.json`
(sentinel worst values, `status: "crash"`) and `metrics.json`
(usually `{}`); `live.log` captures the traceback. The mandatory set
is unconditional.

### Optional files (presence is itself a signal)

| File | Absent means |
|---|---|
| `visualization.png` | The trial crashed before plotting, OR `fixed/visualize.py` itself crashed. Downstream tools mark such trials with a `⚠` glyph. |
| `training_progress.json` | The trial was non-iterative (e.g., a one-shot baseline), OR it crashed before the first epoch. |

The harness does NOT generate stub files for these. Absence is more
honest than a placeholder, and it lets downstream tools tell crashed
and non-iterative trials apart at a glance.

### Forbidden in the approach folder (auto-moved to artifacts)

After every trial, `eval_and_record.py` scans the approach folder for:

- Files matching `*.pkl`, `*.pt`, `*.h5`, `*.npz`, `*.bin`,
  `*.safetensors`, `*.sqlite`, `*.ckpt`
- Files larger than `approach_file_size_limit_mb` (default 1 MB,
  configurable in `loop-settings.json`)
- Subdirectories of any kind

Any match is **moved** (not deleted) to `artifacts/<NNN>_<slug>/`
and `eval_and_record.py` prints:

```
MOVED TO ARTIFACTS: <relative-path>
```

This means the agent does NOT need to remember the rule when writing
`approach.py`. The harness keeps the approach folder clean
automatically.

---

## Monitoring contract

`approach.py` MUST emit progress output. Silence is a contract
violation — without progress lines, background-launched trials cannot
be observed and the user has no signal that anything is happening.

### Minimum requirements

| Trial runtime | Minimum log lines in `live.log` |
|---|---|
| Any duration | At least 1 start line + 1 end line (= 2 lines) |
| Longer than `monitoring_required_after_seconds` (default 10s) | At least 1 additional progress line in the middle (= 3 lines minimum) |

The threshold is configurable in `loop-settings.json` as
`monitoring_required_after_seconds`. Short one-shot baselines (median
of last 4, persistence forecast) easily clear the 2-line minimum
with a `_log("starting <method>")` and `_log("done, score=<value>")`.

The `_log()` helper convention is defined in
`references/live-logging.md`.

### Enforcement

After scoring completes, `eval_and_record.py` counts non-empty lines
in `live.log` and applies the threshold check. On violation:

1. Scores are still recorded (don't waste compute).
2. `scores.json` gets `status: "monitoring_violation"` instead of
   `keep`/`discard`.
3. `eval_and_record.py` exits non-zero with:

   ```
   MONITORING VIOLATION: approach.py produced <N> lines in live.log
   (required: ≥<M>). Background trials cannot be observed without
   progress output. Fix approach.py to call _log() at start / during /
   end before continuing. See references/live-logging.md.
   ```

4. The loop ratchet treats `monitoring_violation` the same as
   `discard` — the trial cannot be kept even if its score would
   otherwise win. A silent winner is still a broken winner.

5. The agent's next action is to **rewrite the same `approach.py`**
   with logging added, not to write a new approach. The trial number
   stays the same; the fix is to the contract, not to the idea.

This makes monitoring a first-class contract alongside "exports
`run(data)`" and "no imports from `fixed/`".

---

## Sandbox rules

These apply during the entire loop. They are a subset of the scope
constraints set during clarifying question 7
(`references/planning-protocol.md` Topic 7):

1. **The agent MAY NOT import from or modify `fixed/`** outside the
   standard entry points. It may READ any file there for reference,
   but `import` from `fixed.*` is restricted to the whitelist:
   - `from fixed.data_prep import get_data` (called via the harness,
     not directly from `approach.py`)
   - `from fixed.paths import artifacts_dir_for` (allowed inside
     `approach.py` for resolving the heavy-artifacts directory)
   - All other names in `fixed.*` are forbidden.
2. **New package needed?** Use `uv add <package>`. Do not edit
   `fixed/*.py` to add imports — that violates immutability.
3. **Each approach is self-contained.** No imports between approach
   directories (no `from approaches.v4_001_foo import ...`). If you
   need to reuse code, it belongs in `fixed/` and was decided at
   planning time.
4. **Approach code uses relative paths only.** No hardcoded absolute
   paths. Use `os.path.dirname(__file__)` to locate the approach
   directory.
5. **No credentials or personal information in `approach.py`.** These
   files are committed to the session git repo and end up in
   `bibliography.md` citations, rationale/commentary sidecars, and
   external reports. Secrets belong in `.env` or environment variables,
   not in approach code.
6. **Visualization failure is non-fatal but must be honest** (see
   `fixed/visualize.py` contract above).

Violations of rules 1, 2, or 5 are severe — they break the
immutability contract or leak secrets, and the agent should stop and
ask the user before proceeding.

---

## Budget enforcement (important: advisory, not hard-enforced)

`loop_settings.budget_per_approach` is the per-approach wall-clock
budget the user set in the pre-flight walkthrough. **It is advisory,
not hard-enforced.** There is no timer or signal-based timeout inside
`eval_and_record.py` — enforcement is the agent's job via the
soft-kill protocol:

1. The agent reads `budget_per_approach` during runtime estimation
   (`references/experiment-loop.md` §Step 3).
2. For trials estimated above `background_threshold_seconds`, the
   agent launches with `run_in_background: true` and monitors
   `training_progress.json` every 30-60s.
3. If the trial exceeds budget or the loss is clearly diverging, the
   agent **soft-kills** via `pkill` / `wmic` / `taskkill`
   (`references/experiment-loop.md` §Step 5 soft-kill protocol).
4. The killed trial's partial artifacts (checkpoints, `live.log`) are
   preserved on disk and the commentary for that approach records the
   kill reason.

The lack of hard enforcement is deliberate: wall-clock timers
interact badly with background launches, garbage-collection stalls,
and legitimate long-running inner operations (Optuna studies,
cross-validation folds). The agent has enough context from
`training_progress.json` to make smart kill decisions; a hard timer
doesn't.

---

## Why evaluation is a first-class reference

This file is separate from `session-init.md` (which scaffolds the
session) and `experiment-loop.md` (which runs it) because the
evaluation contract is the single most important design decision in
an autoresearch session. Get it right and the loop optimizes the
thing the user actually cares about; get it wrong and you're
producing a rich log of metric-gaming drift.

Three references point here:

- **`references/planning-protocol.md` Topic 6** — drafts the
  evaluate.py pseudo-code during clarifying questions and hands it
  off to this file for the full contract.
- **`references/session-init.md` Step 5** — materializes the four
  files at session init, following the templates here.
- **`references/experiment-loop.md` Step 4** — the agent writes
  `approach.py` per the `run(data)` contract specified here.

When in doubt about what a file should look like, consult this
reference.
