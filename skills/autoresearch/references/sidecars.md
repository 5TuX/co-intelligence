# Sidecars: `rationale.md` and `commentary.md`

Every approach has two short markdown sidecars written by the agent.
Together they form a reproducibility narrative: anyone reading the
session months later should be able to understand both the *idea*
behind each trial AND the *outcome* without reverse-engineering the
code or re-running it.

| File | When written | Who writes it | Purpose |
|---|---|---|---|
| `rationale.md` | BEFORE eval, in the same iteration as `approach.py` | Agent | The pre-trial hypothesis — why this trial, what we expect, what we'll learn |
| `commentary.md` | AFTER eval, at the start of the NEXT iteration | Agent | The post-trial postmortem — what happened, vs. hypothesis, lessons |

Both live in `approaches/<NNN>_<name>/` alongside `approach.py`.

---

## `rationale.md` — required fields

Written as part of Tool 2 in the Core Loop Contract's 4-tool-call
sequence (between writing `commentary.md` for the previous trial and
writing the new `approach.py`).

5-15 lines, markdown, with these four required fields:

### Idea

One sentence. What is the trial *actually trying*? No jargon, no
hedging.

> Example: "Replace the single-layer MLP with a 3-layer residual
> network and train for twice as many epochs."

### Hypothesis

What we think will happen and why. Make a specific prediction the
next iteration's `commentary.md` can verify or falsify.

> Example: "I expect validation loss to drop below 0.15 because the
> previous approach (007) was underfitting — training loss plateaued
> at 0.22 while val loss was 0.31, which means there's capacity
> headroom. Residual connections will help gradients reach the deeper
> layers."

### Builds on

Prior approach (by NNN) or paper citation. **If this trial is based
on specific entries from `bibliography.md`, they MUST be cited here
by their BibTeX key** (one per line), each with a one-line note
explaining how the paper informs the trial.

When the trial is pure exploration with no bibliography basis, write
`none — exploratory`.

> Example:
> ```
> - approach 007 (MLP baseline) — doubling depth, keeping everything else
> - [HeEtAl16] — residual connections solve vanishing gradients in deeper networks
> - [LinEtAl19] — suggests 3 layers is the sweet spot for this dataset size
> ```

> Exploratory example:
> ```
> none — exploratory
> ```

### What we'll learn

What does this trial resolve, regardless of whether the score
improves? The value is in the information, not the leaderboard.

> Example: "Whether depth helps at all on this task, or whether the
> bottleneck is elsewhere (feature quality, data size, loss function).
> A discard here means depth isn't the answer and I should look at
> preprocessing next."

---

## `commentary.md` — required fields

Written as Tool 1 of the NEXT iteration (after the agent has inspected
`visualization.png`, `scores.json`, `metrics.json`,
`training_progress.json`, and `live.log` from the just-finished trial).

5-15 lines, markdown, with these five required fields:

### Result

Keep/discard + the score. One line.

> Example: "**DISCARD** — val loss 0.28 (worse than 007's 0.31 by much,
> and much worse than expected 0.15)."

### Vs. hypothesis

Did reality match the rationale's prediction? Be honest — this is
where the loop learns.

> Example: "Hypothesis rejected. I expected depth to help because 007
> was underfitting; in fact the deeper network trained unstably (loss
> spiked at epoch 12 and never recovered) and the final val loss was
> worse than the shallow baseline."

### Visualization

One paragraph describing what the plot actually shows. You are
multimodal — read `visualization.png` directly. Describe the patterns,
the errors, the failure modes. This is often the most informative
thing about a trial.

> Example: "The scatter of predictions vs. actual shows a bimodal
> residual distribution: most points cluster tightly around the line
> but a cloud of ~50 outliers sits at predicted ≈ 0 regardless of
> actual. The training curve shows loss spiking around epoch 12 and
> the gradient histogram (saved separately) shows one layer going
> numerically unstable. Classic dying-ReLU pattern."

### Vs. bibliography

If `rationale.md` cited papers, do the results confirm, contradict, or
extend what those papers claimed? Cite them again by the same BibTeX
keys. If the rationale had no citations, write `n/a`.

> Example:
> ```
> - [HeEtAl16] — residual connections did NOT solve the instability
>   here. Paper assumes well-initialized weights; my weights came from
>   approach 007 via warm-start and the init distribution is wrong for
>   a 3-layer net. Contradicted in this specific transfer setting.
> - [LinEtAl19] — their "3 layers is sweet spot" claim was on a 10x
>   larger dataset. Not directly applicable at my scale. Neither
>   confirmed nor contradicted — out of scope.
> ```

### Lessons

What to try next, what to avoid, what's now unclear. This feeds
directly into the next rationale's Builds on and Hypothesis.

> Example: "Lessons: (1) warm-starting a deeper net from a shallower
> checkpoint is broken — reinitialize instead. (2) dying-ReLU is
> actually the bottleneck, not depth per se. (3) next trial: stay at
> the shallower depth but swap activation (GELU or Swish) and add
> BatchNorm."

---

## Why both sidecars

- **Separation of concerns.** `approach.py` is the code. Its docstring
  is fine for API notes but fills up fast with implementation detail.
  `rationale.md` and `commentary.md` are human-level narrative that
  stays short.
- **Temporal separation.** Rationale is written *before* you know the
  result, so it's not biased by outcome. Commentary is written *after*,
  so it can honestly say "hypothesis rejected". A single post-hoc
  writeup would blur these.
- **Searchable narrative.** Cross-linking via BibTeX keys means
  `grep '\[HeEtAl16\]' approaches/*/rationale.md approaches/*/commentary.md`
  finds every trial that touched that paper. The session becomes a
  navigable research log.
- **Resumable session.** If you resume a session three weeks later,
  the last few `commentary.md` files tell you exactly where the loop's
  thinking was without having to re-read code.
- **Feeds the report.** `report.md` is auto-regenerated from
  `results.json`, but the agent can also mine rationale/commentary
  text when composing the session-level narrative.

---

## When sidecars cannot be written

On a **crashed** trial:

- Rationale.md is still written (the agent had a hypothesis even if
  the code failed). Required fields unchanged.
- Commentary.md is still written, but `Result` says
  `CRASH — <one-line error>`, `Vs. hypothesis` says
  `n/a — trial crashed before evaluation`, `Visualization` describes
  what the `visualization.png` shows (which may be the crash-honest
  render per the fail-fast contract), `Vs. bibliography` follows the
  normal rules, and `Lessons` is often the most useful field — what
  the crash reveals about the approach.

On the **smoke test** (approach 000):

- Rationale.md says *"Idea: naive baseline; Hypothesis: score will be
  at the worst possible value for the metric direction; Builds on:
  none — exploratory; What we'll learn: whether the pipeline works
  end-to-end."*
- Commentary.md is the first artifact review the user sees at the
  end-of-setup smoke-test confirmation. Its `Visualization` field is
  the one the agent reads aloud to prove the plot rendered correctly.

---

## Location and git

Both files live at `approaches/<NNN>_<name>/rationale.md` and
`approaches/<NNN>_<name>/commentary.md`. They are committed to git as
part of the approach's commit (alongside `approach.py`, `scores.json`,
`metrics.json`, `visualization.png`, `live.log`, `training_progress.json`).

`eval_and_record.py` expects `rationale.md` to exist BEFORE it runs —
if missing, it prints `!! MISSING_RATIONALE` and refuses to evaluate.
`commentary.md` is written by the agent on the NEXT iteration, so
it's not present when the current approach is committed; it's
committed as part of the next approach's commit (alongside that
approach's files) or as a standalone "chore: commentary for NNN"
commit, depending on how `eval_and_record.py` is configured.
