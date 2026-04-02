# Git Repository Management

Each experiment session (`autoresearch/<tag>/`) is its own git repository,
managed by the skill throughout the session.

## Initialization

```bash
cd autoresearch/<tag>
git init

cat > .gitignore << 'EOF'
# Data files (never commit)
data/
*.csv
*.tsv
*.npy
*.npz
*.pkl
*.pickle
*.h5
*.hdf5
*.pt
*.pth
*.bin
*.parquet
*.arrow
*.feather
*.sqlite
*.db

# Large artifacts
artifacts/
*.png
!progress.png

# Logs (summary in results.json is enough)
run.log
*.log

# Python
__pycache__/
*.pyc
*.pyo
.venv/
*.egg-info/

# Secrets
.env
*.key
credentials.*

# OS
.DS_Store
Thumbs.db
EOF

git add -A
git commit -m "init: experiment plan and evaluation harness"
```

## During the Loop

### On keep
```bash
git add approaches/<NNN>_<name>/ results.json report.md bibliography.md
git commit -m "keep: <NNN> <hypothesis> (<metric>=<score>)"
```

### On discard or crash
```bash
# First commit the attempt (preserves it in history)
git add approaches/<NNN>_<name>/ results.json report.md
git commit -m "discard: <NNN> <hypothesis> (<metric>=<score>)"
# Then revert (removes from working tree but keeps in git log)
git revert HEAD --no-edit
```

This way `git log` shows every experiment ever tried, but only successful
approaches remain in the working tree. The user can always inspect discarded
approaches via `git log` and `git show`.

### Progress updates
After each approach (keep or revert):
```bash
git add progress.png README.md results.json report.md bibliography.md
git commit -m "progress: <N> approaches, best <metric>=<score>"
```

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
- `approaches/` - each approach's code and scores
- `progress.png` - visualization of experiment progress

## Reproduce

```bash
uv sync  # or pip install -r requirements.txt
python -c "from fixed.evaluate import run_approach; ..."
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

# If multi-objective, add mean line
if len(objectives) > 1:
    mean_scores = []
    mean_ids = []
    for a in approaches:
        if a['scores'] is None:
            continue
        mean_ids.append(a['id'])
        vals = [a['scores'].get(o, 0) for o in objectives]
        mean_scores.append(sum(vals) / len(vals))
    ax.plot(mean_ids, mean_scores, 'k--', linewidth=2, label='mean', alpha=0.7)

ax.set_xlabel('Approach #')
ax.set_ylabel('Score')
ax.set_title(f"Autoresearch: {data['task']}")
ax.legend()
ax.grid(True, alpha=0.3)
fig.tight_layout()
fig.savefig('progress.png', dpi=150)
plt.close()
```
