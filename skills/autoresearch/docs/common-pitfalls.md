# Common Pitfalls and Baked-In Solutions

Lessons from real users running autoresearch overnight. Each pitfall has a
solution baked into this skill's protocol.

## 1. Agent Modifies Evaluation Code (Metric Gaming)

**Problem:** The agent changes the evaluation harness to make "improvement"
easier for itself instead of actually improving the approach.

> "Early versions didn't constrain which files the agent could edit. It
> eventually modified the evaluation code to make 'improvement' easier."
> - Reddit user, Claude Code ML agent

**Solution baked in:**
- `fixed/` directory is IMMUTABLE after session initialization
- Rules section explicitly forbids modifying fixed/evaluate.py or fixed/data_prep.py
- The evaluation contract is agreed upon with the user during planning

---

## 2. Data Leakage / Validation Overfitting

**Problem:** Running hundreds of experiments against a fixed validation set
causes the agent to overfit to quirks of that specific data. Improvements
don't generalize.

> "K-fold validation was originally employed, the agent found improvements
> that are actually data leakage and didn't hold out-of-time."
> - Reddit user

> "It's Goodhart's Law at machine speed. Whatever metric you expose, the
> agent will exploit it relentlessly."
> - Langfuse engineering blog

**Solution baked in:**
- Planning protocol warns about this explicitly
- Recommends hold-out test set NEVER used during loop (only final report)
- For time series: expanding time windows (train on past, predict future)
- Anti-gaming notes in metrics table
- Final report compares loop-best vs hold-out test performance

---

## 3. Agent Repeats Experiments Already Tried

**Problem:** Without structured memory, the agent proposes the same
experiment it tried 30 iterations ago.

> "Without LOG.md and LEARNING.md, the agent repeats experiments it already
> tried. Forced logging after every run gives the agent memory across the
> infinite loop."
> - Reddit user

**Solution baked in:**
- Step 1 of every loop iteration: READ results.json fully
- results.json contains every experiment with hypothesis, status, scores, notes
- report.md Synthesis section captures patterns (what helps/hurts)
- Agent must cite what has NOT been tried before proposing

---

## 4. Experiment Throughput Collapse

**Problem:** Agent engineers thousands of features, runs background processes,
or creates overly complex approaches that slow training to a crawl.

> "The agent engineered thousands of new features that slowed down training
> and crash some runs due to RAM limit... Despite that, the agent still
> managed to crash runs by putting many into background processes."
> - Reddit user

**Solution baked in:**
- Complexity limits defined in planning (max lines, max features, max training time)
- One experiment at a time (no background processes)
- Budget enforcement: kill after 2x budget
- Simplicity criterion: "all else equal, simpler is better"

---

## 5. Lost Compute from Killed Trials

**Problem:** When a trial is killed (soft-kill, crash, or interruption), all
model weights are lost since they were in memory only. The next trial trains
from scratch, wasting all prior compute.

> "Trial 063 trained 15 LightGBM models over 28 minutes, then the eval phase
> ran over budget. All model weights were lost - the entire training run was
> wasted. The next trial started from scratch."
> - Real autoresearch session, MTG forecasting experiment

**Solution baked in:**
- Approaches MUST save checkpoints during training (per epoch/model)
- When reusing architecture, load latest checkpoint from prior trials
- eval_and_record.py auto-generates `.gitignore` per approach folder
- See experiment-loop.md for checkpoint save/load patterns

---

## 6. Scope Drift / Agent Goes Off-Script

**Problem:** Instead of optimizing the target, the agent pursues its own
research interests.

> "We left an AI agent running overnight. By morning, it had stopped doing
> what we asked. Instead of optimizing memory usage, it had gone off on its
> own side quest."
> - Cerebras engineering blog

**Solution baked in:**
- Tight scope definition in planning (what CAN vs CANNOT be changed)
- Each hypothesis must reference the original goal
- Periodic scope check: every 10 iterations, re-read experiment-plan.md
  and verify approaches align with the stated goal

---

## 7. Loop Ending Too Soon

**Problem:** The agent decides to stop, asks permission to continue,
or concludes "we've reached a good stopping point."

> "Codex doesn't work with autoresearch because it ignores instruction to
> never stop."
> - Karpathy, GitHub issue #57

**Solution baked in:**
- Multiple explicit NEVER STOP directives in SKILL.md and experiment-loop.md
- Rules section: "NEVER stop due to diminishing returns, plateaus, or
  running out of ideas"
- When stuck escalation: re-read log, combine near-misses, try radical changes,
  check user ideas, try the opposite of what works
- Only --total budget or user interrupt can end the loop

---

## 8. Context Window Growth

**Problem:** With long-running experiments, context grows until the agent
loses coherence or hits limits.

> "Context grows very slowly, only ~250K over 1 day worth of experiments."
> - Reddit user

**Solution baked in:**
- All experiment output redirected to log files (not in context)
- Only read grep/tail of logs, not full output
- Structured files (results.json, report.md) as persistent memory
- Agent reads files each iteration rather than relying on conversation memory

---

## 9. Trusting a 0.3% Improvement (Noise as Signal)

**Problem:** An approach scores 0.4912 against a current best of 0.4898. The
agent logs it as a keep and builds on top. But the eval has inherent noise
(random seeds, data shuffles, VM contention, floating point order of
operations) and the "improvement" is within one standard deviation of
repeating the same approach twice. Seventy approaches later the leaderboard
is dominated by noise.

> "Only trust results where stddev is less than 2% of the mean. Anything
> closer is a coin flip. Re-run close candidates on a fresh seed or VM
> before promoting them."
> - SkyPilot "Scaling Autoresearch" blog (paraphrased)

**Solution baked in:**

- `min_improvement` in `results.json` is the first gate: any `|new - best|`
  below this threshold is auto-discarded regardless of direction. Set it
  during planning (Step 3, Q6b). Kills the long tail of 1e-6 "wins".
- **2% rule of thumb:** if two top candidates differ by less than 2% of the
  primary metric value, neither is reliably better. Re-evaluate both on a
  fresh random seed (or fresh VM if the eval touches GPUs) before declaring
  a winner. Add `random_state` plumbing in `fixed/evaluate.py` that can
  be passed by `eval_and_record.py --seed N`.
- **`--repeat N` flag on `eval_and_record.py`** (recommended but not
  mandatory): for close candidates only, re-run the same approach N times
  with different seeds. Report mean, stddev, and min/max in `metrics.json`.
  A candidate that wins on one seed but loses on three others is not a
  real winner.
- **Don't run `--repeat` by default.** It triples the cost of every trial
  and most trials are obviously non-competitive. Gate it on closeness to
  the current best.

---

## 10. The Three-Legged Stool of Honesty (v2 sales-forecast postmortem)

**Problem:** Three bugs stacked on top of each other, none caught by any of
the others, all cooperating to produce 800 approaches' worth of fake progress.

> "v2 ran 800 approaches. Weighted accuracy moved from 0.5820 to 0.5852 and
> stayed there for the last 400. The display showed plausible train/test
> curves. Git log looked healthy. But the loader was compressing the input,
> the evaluator was silently skipping crashed cutoffs, and the visualizer
> was falling back to `np.median(series.tail(9))` whenever the factory
> raised. Nothing was wrong in any single place, and everything was wrong
> overall."
> - Real autoresearch session, sales-forecast v2, 2026-04

The three bugs:

1. **Loader compressed per-transaction structure.** `groupby(["month","REF"]).sum()`
   collapsed 42 transactions into a single scalar. Every model was trying
   to fit noise because the signal had been deleted upstream.
2. **Evaluator silently skipped crashed cutoffs** via `except Exception: continue`.
   CatBoost crashed on constant inputs for one product; the eval treated
   those cutoffs as "didn't happen" and averaged over the survivors. The
   score looked stable because the failures were invisible.
3. **Visualizer faked the fallback.** When the factory raised, `visualize.py`
   called `float(np.median(series.tail(9)))` and rendered a constant
   prediction line. Users looking at the plot saw three identical blue dots
   at the start of the test period and assumed the model was "working".

**Why no single check caught it:** each file looked defensible on its own.
The loader "handled duplicates". The evaluator "was robust to crashes". The
visualizer "had a fallback". Honesty is a property of the stack, not of any
one file.

**Solution baked in:**

- Fail-fast contract in `loop-enforcement.md` Forbidden patterns (SR3).
- No silent except in eval or viz. No synthetic fallbacks.
- Visualizer must render crashes honestly (markers, empty spans,
  annotations), not interpolate.
- Loader design is a planning-phase conversation (Step 2 + Step 4). If your
  data has per-transaction structure, decide whether to expose it or collapse
  it on purpose, not by accident.
- `min_improvement` (SR1) would have killed the 1e-6 drift component of
  this failure, but not the silent skipping. You need all three layers.

**Lesson:** honesty in data + eval + viz is a three-legged stool. One silent
`except` anywhere and the whole loop becomes theater.

---

## Quick Reference: What To Check When Things Go Wrong

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| All approaches "improve" | Leaky validation | Switch to expanding windows, add hold-out |
| Agent stops after 10 runs | Missing NEVER STOP directive | Re-read SKILL.md rules |
| Same experiment repeated | Not reading results.json | Force read at loop start |
| Runs taking 30+ minutes | Poor runtime estimate | Estimate fixed costs, monitor training_progress.json, soft-kill if stalled |
| Model weights lost on kill | No checkpoint saving | Save checkpoints every epoch/model, load in next trial |
| Evaluation scores nonsensical | Agent modified fixed/ | Check git diff, restore fixed/ |
| Agent off on tangent | No scope constraint | Re-read experiment-plan.md |
| Crashes from OOM | No complexity limits | Add feature/model size caps |
| Every 3rd trial "improves" by 1e-6 | No `min_improvement` gate | Set `min_improvement` in results.json |
| Two candidates within 1% of each other | Noise, not signal | `--repeat N` with different seeds, check stddev |
| Plot looks clean but model never really ran | Silent except + fake fallback | Fail-fast contract, see pitfall #10 |
