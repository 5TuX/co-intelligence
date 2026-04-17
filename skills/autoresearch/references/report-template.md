# Report Template

The living report (`report.md`) is updated after every approach.

## Template

```markdown
# Autoresearch: <task>
**Tag:** <tag> | **Started:** <date> | **Approaches tried:** N | **Last updated:** <ISO>

## Task Definition
<What we are optimizing. Input format. Output format. Constraints.>

## Data and Metrics

| Metric | Direction | Weight | Best Score | Best Approach |
|--------|-----------|--------|------------|---------------|
| metric1 | higher | 1.0 | 0.891 | 007_attention_pooling |

## Progress
![Progress](progress.png)

## Approach Tree

Approaches are organized hierarchically. Tweaks and variants are nested
under their parent approach.

### 1. ridge_tuned (keep, 0.723)
Ridge regression on raw features — first real hypothesis.

### 2. feature_scaling (discard, 0.718)
Standard scaling on all features. Slightly worse.

### 3. attention_pooling (keep, 0.891)
Replaced mean pooling with attention mechanism.
- **References:** [Vaswani et al. 2017](https://arxiv.org/abs/1706.03762)

#### 3a. attention_pooling_v2 (keep, 0.903)
Added layer normalization before attention weights.
Parent: approach 3.

#### 3b. attention_pooling_dropout (discard, 0.887)
Added dropout=0.3 to attention. Hurt performance.
Parent: approach 3.

### 4. gradient_boosting (keep, 0.845)
XGBoost with tuned hyperparameters. Strong but below attention approach.

## Experiment Log

| # | Name | Status | Score(s) | Delta | Notes |
|---|------|--------|----------|-------|-------|
| 001 | ridge_tuned | keep | 0.723 | -- | first hypothesis |
| 002 | feature_scaling | discard | 0.718 | -0.005 | standard scaling hurt |
| 003 | attention_pooling | keep | 0.891 | +0.168 | breakthrough |
| 003a | attention_pooling_v2 | keep | 0.903 | +0.012 | layer norm helps |
| 003b | attention_pooling_dropout | discard | 0.887 | -0.016 | dropout hurts here |
| 004 | gradient_boosting | keep | 0.845 | -- | different paradigm |

## Synthesis
<Patterns observed. What helps. What hurts. Why. Updated as patterns emerge.>

### What works
- Attention mechanisms on this data type
- Layer normalization before learned weights

### What doesn't work
- Simple feature scaling (data already well-distributed)
- Dropout in attention (too few attention heads)

### Open questions
- Would multi-head attention help?
- Can we combine attention with gradient boosting features?

## User Ideas Status
| Idea | Status | Approach(es) |
|------|--------|-------------|
| "try attention mechanisms" | explored | 003, 003a, 003b |
| "ensemble top approaches" | pending | -- |

## Bibliography

| Ref | Source | Used in |
|-----|--------|---------|
| [1] | Vaswani et al. "Attention Is All You Need" (2017) | 003, 003a |
| [2] | Chen & Guestrin "XGBoost" (2016) | 004 |

## Next Steps
<Specific hypotheses to try, ranked by expected impact.>
```

## Nesting Rules

- A tweak/variant of approach N gets ID "Na", "Nb", etc.
- In results.json, set `parent_approach` to the parent's ID
- In the report, indent under the parent approach
- A "family" of approaches (same paradigm, multiple tweaks) stays grouped
- The tree grows naturally; don't force nesting where approaches are independent
