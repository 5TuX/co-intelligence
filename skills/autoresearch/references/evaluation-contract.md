# Evaluation Contract

## The Sandbox Boundary

Every approach is isolated in its own directory with a single entry point.

### approach.py contract

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
    # - any library already installed
    # - any transformation, preprocessing, feature engineering
    # The only rule: receive data, return output, same types always.
    ...
```

### fixed/evaluate.py contract (IMMUTABLE)

```python
def evaluate(run_fn) -> dict:
    """Load data, run approach, compute and return all scores and metrics.

    Args:
        run_fn: the approach's run() function

    Returns:
        dict with at minimum the objective keys defined in results.json.
        May also include additional metrics (runtime, per-component scores).
        Objectives determine keep/discard. Additional metrics are logged
        but do not affect the ratchet.
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

### fixed/data_prep.py contract (IMMUTABLE)

```python
def get_data():
    """Load and preprocess data. Return canonical dataset object."""
    ...
```

### fixed/visualize.py contract (IMMUTABLE)

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
    ...
```

The visualization design is defined during planning (Step 3). Visualization
failure is non-fatal for scoring - the approach still records scores and
metrics even if visualize() crashes, but eval_and_record.py will print a
warning.

## Scores vs Metrics

- **Scores** (`scores.json`): the objectives defined in `results.json["objectives"]`.
  These determine keep/discard.
- **Metrics** (`metrics.json`): additional measurements NOT used for keep/discard.

Example scores.json: `{"scores": {"weighted_accuracy": 0.491}, "status": "keep", "runtime_seconds": 45.2}`
Example metrics.json: `{"per_product_accuracy": {"A": 0.65, "B": 0.33}, "model_complexity": 12}`

## Rules

- The agent may NOT import from or modify `fixed/`. It may read it.
- If a new package is genuinely needed, use `uv add <package>`.
- Each approach must be self-contained (no imports between approaches).
- Approach code must use relative paths only.
- No hardcoded absolute paths, credentials, or personal information.

## Budget Enforcement

For time-budgeted experiments, evaluate.py should enforce the budget:

```python
import signal

def timeout_handler(signum, frame):
    raise TimeoutError("Budget exceeded")

def evaluate(run_fn, budget_seconds=300):
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(budget_seconds)
    try:
        data = get_data()
        output = run_fn(data)
        return compute_metrics(output, data)
    finally:
        signal.alarm(0)
```

For `--budget=none`, skip timeout enforcement.
