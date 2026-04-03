# Experiment Loop Protocol

Full 10-step protocol for the autonomous experiment loop.

## The Loop

LOOP FOREVER (or until --total budget expires):

### 1. REVIEW
Read results.json. Identify:
- What has been tried (all statuses, including crashes)
- What has NOT been tried (paradigm gaps)
- Which approaches came closest (even if discarded)
- Patterns: what seems to help? what seems to hurt?
- User ideas queue: any unexplored suggestions?

### 2. HYPOTHESIZE
Form a specific hypothesis:
> "I believe <approach> will improve <metric> because <reason>.
> This has not been tried because <gap>."

Strategy:
- Prefer breadth early (explore different paradigms)
- Depth later (refine what works)
- When stuck: combine near-misses, try opposites, revisit user ideas,
  try radically different paradigms, look at bibliography for inspiration

### 3. NAME
Create approach folder: `approaches/<NNN>_<hypothesis>/`
- NNN: zero-padded, incrementing from 001
- hypothesis: snake_case, max 40 chars, describes the core idea
- Example: `007_attention_pooling_instead_of_mean`

### 4. CODE
Write `approaches/<NNN>_<hypothesis>/approach.py`:
- Implement `run(data)` cleanly
- Self-contained, no hardcoded paths
- Add a brief docstring explaining the idea
- If based on a paper/resource, create `references.md` in the same dir

### 5. RUN
Execute the evaluation:
```bash
cd "$PLUGIN_DATA/autoresearch/<tag>"
python -c "
import sys, importlib.util, json, time
sys.path.insert(0, '.')
spec = importlib.util.spec_from_file_location('approach', 'approaches/<name>/approach.py')
mod = importlib.util.module_from_spec(spec)
start = time.time()
spec.loader.exec_module(mod)
from fixed.evaluate import run_approach
scores = run_approach(mod)
scores['_runtime_seconds'] = round(time.time() - start, 1)
print(json.dumps(scores))
" > approaches/<name>/run.log 2>&1
```

Respect --budget: if time-limited, enforce via timeout or budget check in evaluate.py.
For `none` budget, run to completion.

**Timeout**: If a run exceeds 2x the budget, kill it and treat as crash.

### 6. RECORD SCORES
Read run.log:
- **Crashed**: scores = null, status = "crash"
  - Quick-fix if obvious (typo, import), rerun once
  - If fundamental: log crash and move on
- **Success**: parse JSON from last line of stdout in run.log
  - Compare primary metric vs current best
  - status = "keep" if improves (or ties with simpler code)
  - status = "discard" if worse or equal with more complexity

Write `approaches/<name>/scores.json`:
```json
{
  "scores": {"metric1": 0.89},
  "status": "keep",
  "vs_best": {"metric1": 0.03},
  "runtime_seconds": 287
}
```

### 7. GIT (Karpathy's core mechanic)
- **keep**: `git add approaches/<name>/ && git commit -m "keep: <NNN> <hypothesis> (<primary_metric>=<score>)"`
- **discard**: `git add approaches/<name>/ && git commit -m "discard: <NNN> <hypothesis> (<primary_metric>=<score>)"` then `git revert HEAD --no-edit` (preserves the attempt in history)
- **crash**: `git add approaches/<name>/ && git commit -m "crash: <NNN> <hypothesis>"` then `git revert HEAD --no-edit`

This means `git log` shows the full experiment history, but only successful
approaches remain in the working tree.

### 8. LOG
Append to results.json:
```json
{
  "id": 7,
  "name": "007_attention_pooling_0.891",
  "hypothesis": "Attention pooling instead of mean pooling",
  "status": "keep",
  "scores": {"metric1": 0.891},
  "vs_best": {"metric1": 0.03},
  "timestamp": "2026-04-02T14:30:00Z",
  "notes": "Significant improvement, attention weights focus on key tokens",
  "references": ["https://arxiv.org/abs/xxxx"],
  "user_idea": false,
  "parent_approach": null
}
```

Fields:
- `references`: list of URLs/DOIs if approach is based on literature
- `user_idea`: true if this was from the user ideas queue
- `parent_approach`: ID of parent if this is a tweak/variant (enables nesting)

Update bibliography.md if references present.

### 9. VISUALIZE
Regenerate progress.png using matplotlib:
```python
import matplotlib.pyplot as plt
# Load results.json
# X: approach id, Y: score per objective
# Multi-objective: plot each + mean, with legend
# Markers: green circle (keep), red x (discard), gray triangle (crash)
# Save as progress.png
```

Update README.md with current stats and embedded graph.
Commit visualization: `git add progress.png README.md results.json report.md bibliography.md && git commit -m "update: progress after approach <NNN>"`

### 10. GOTO 1

## Approach Naming After Scoring

| Situation | Folder name |
|-----------|-------------|
| Single metric, keep | `003_relu_instead_of_gelu_0.892` |
| Multi-metric, keep | `012_ensemble_top3_avg0.834` |
| Crash | `005_deep_mlp_crash` |
| Baseline | `001_baseline_0.723` |

Rename the folder immediately after scoring, before the git step.
