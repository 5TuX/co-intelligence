# Git Repository Management

Each experiment session (`$PLUGIN_DATA/autoresearch/<tag>/`) is its own git repository,
managed by the skill throughout the session.

## Initialization

```bash
cd "$PLUGIN_DATA/autoresearch/<tag>"
git init

cat > .gitignore << 'EOF'
# Heavy session-local artifacts — the entire artifacts/ tree is
# managed by the approach folder schema (see evaluation-contract.md).
# eval_and_record.py auto-moves forbidden file types out of
# approaches/ and into this directory, so we never need
# per-approach .gitignore files.
artifacts/

# Raw input data
data/

# Report script rollback file
report.md.bak

# Python
__pycache__/
*.pyc
*.pyo
.venv/
*.egg-info/
uv.lock

# Secrets
.env
*.key
credentials.*

# Loop state (ephemeral, not published)
.loop-active
.loop-state
.narrative-dirty

# OS
.DS_Store
Thumbs.db
EOF

git add -A
git commit -m "init: experiment plan and evaluation harness"
```

## During the Loop

### Every approach (keep, discard, crash, or monitoring_violation)
```bash
git add approaches/<NNN>_<slug>/
git commit -m "<status>: <NNN> <hypothesis> (<primary_metric>=<score>)"
```

**No git revert.** All approaches stay in the working tree with their
full reproducibility package (6 mandatory + up to 2 optional files).
The `status` field in `commentary.md` front-matter and `scores.json`
distinguishes keep from discard from crash from monitoring_violation.

This means `approaches/` is a complete, browsable history of every
experiment attempted. The user can compare code, view visualizations,
and analyze metrics across all attempts without needing `git show` or
`git log`.

**Heavy files are NEVER committed.** The parallel `artifacts/` tree
(`artifacts/<NNN>_<slug>/` for checkpoints, caches, weights) is
gitignored at the session root. `eval_and_record.py` auto-moves any
forbidden file type or oversized file out of `approaches/` and into
`artifacts/`, so the agent never needs to track the rule by hand.

### Approach folder contents (fixed schema)
```
approaches/081_smooth_nophase/
  rationale.md             # Pre-trial hypothesis (YAML front-matter: parent, source)
  approach.py              # The code
  commentary.md            # Post-trial postmortem (YAML front-matter: status, summary)
  scores.json              # Objectives + status (keep/discard/crash/monitoring_violation)
  metrics.json              # Additional measurements
  live.log                 # Full stdout+stderr stream via tee
  visualization.png         # (optional — absence = crash before plotting)
  training_progress.json   # (optional — absence = non-iterative or early crash)
```

See `references/evaluation-contract.md` §Approach folder schema for
the enforcement rules.

### Progress updates
After each approach:
```bash
git add progress.png README.md results.json report.md bibliography.md
git commit -m "progress: <N> approaches, best <metric>=<score>"
```

`report.md` updates happen inside `eval_and_record.py` via
`update_report.py` (Zone A only — the agent rewrites Zone B on the
`!! NARRATIVE_DUE` cadence). Both zones are tracked in git in the
same commit as the approach that caused the update.

## README.md Template

The experiment README is auto-generated and always current:

```markdown
# <Task Title>

> Autonomous experiment session using the autoresearch pattern.
> Based on [Karpathy's autoresearch](https://github.com/karpathy/autoresearch).

## Progress

![Progress](progress.png)

**Approaches tried:** N | **Best score:** X.XXX | **Status:** running/complete

## Quick Summary

| Metric | Best Score | Best Approach | Baseline |
|--------|-----------|---------------|----------|
| metric1 | 0.903 | 003a_attention_v2 | 0.723 |

## How to Read This Repo

- `experiment-plan.md` - what we set out to do
- `report.md` - full analysis with approach tree and synthesis
- `bibliography.md` - papers and resources referenced
- `results.json` - machine-readable experiment log
- `fixed/` - immutable evaluation harness (do not modify)
- `approaches/` - ALL attempts (keep + discard + crash) with code, scores, metrics, and plots
- `progress.png` - visualization of experiment progress

## Reproduce

```bash
uv sync  # or pip install -r requirements.txt
python -c "from fixed.evaluate import evaluate; ..."
```

## License

MIT
```

## Pre-Publish Safety Check

Before the user publishes, scan ALL committed files:

1. `git log --all --diff-filter=A --name-only` - list all files ever committed
2. Grep for: absolute paths (`C:\`, `/home/`, `/Users/`), API keys (`sk-`, `AKIA`),
   emails, passwords, tokens
3. Check .gitignore covers all data patterns
4. Verify no data files slipped through
5. Report findings; fix before pushing

## Progress Plot Generation

```python
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import json

with open('results.json') as f:
    data = json.load(f)

approaches = data['approaches']
objectives = data['objectives']
higher = data['higher_is_better']

fig, ax = plt.subplots(figsize=(10, 6))

for obj in objectives:
    ids, scores, colors, markers = [], [], [], []
    for a in approaches:
        if a['scores'] is None:
            continue
        ids.append(a['id'])
        scores.append(a['scores'].get(obj, 0))
        if a['status'] == 'keep':
            colors.append('green'); markers.append('o')
        elif a['status'] == 'discard':
            colors.append('red'); markers.append('x')
        else:
            colors.append('gray'); markers.append('^')
    ax.plot(ids, scores, '-', alpha=0.3, label=obj)
    for i, (x, y, c, m) in enumerate(zip(ids, scores, colors, markers)):
        ax.scatter(x, y, c=c, marker=m, s=60, zorder=5)

ax.set_xlabel('Approach #')
ax.set_ylabel('Score')
ax.set_title(f"Autoresearch: {data['task']}")
ax.legend()
ax.grid(True, alpha=0.3)
fig.tight_layout()
fig.savefig('progress.png', dpi=150)
plt.close()
```
