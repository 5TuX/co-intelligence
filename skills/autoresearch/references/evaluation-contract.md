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
def run_approach(approach_module) -> dict[str, float]:
    """Load data, run approach, compute and return all metrics."""
    from fixed.data_prep import get_data
    data = get_data()
    output = approach_module.run(data)
    return {"metric1": compute_metric1(output, data.labels)}
```

### fixed/data_prep.py contract (IMMUTABLE)

```python
def get_data():
    """Load and preprocess data. Return canonical dataset object."""
    ...
```

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

def run_approach(approach_module, budget_seconds=300):
    signal.signal(signal.SIGALRM, timeout_handler)
    signal.alarm(budget_seconds)
    try:
        data = get_data()
        output = approach_module.run(data)
        return compute_metrics(output, data)
    finally:
        signal.alarm(0)
```

For `--budget=none`, skip timeout enforcement.
