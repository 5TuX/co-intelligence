# Experiment Loop Protocol

Full protocol for the autonomous experiment loop.

## The Loop

LOOP FOREVER (or until user interrupts):

### 1. REVIEW (read artifacts, then think)

**Artifact review (MANDATORY before every trial):** Read the previous
trial's artifacts using the Read tool. You are multimodal - read images
directly:
- `approaches/<prev>/visualization.png` - see prediction patterns, error
  distribution, where the model fails. This is often the most informative.
- `approaches/<prev>/scores.json` and `metrics.json` - detailed metrics
- `approaches/<prev>/training_progress.json` - convergence behavior
- Any loss curve PNGs or other saved artifacts

Then review results.json. Identify:
- What has been tried (all statuses, including crashes)
- What has NOT been tried (paradigm gaps)
- Which approaches came closest (even if discarded)
- Patterns: what seems to help? what seems to hurt?
- User ideas queue: any unexplored suggestions?
- **Visual patterns:** What did the visualization reveal? Which segments
  does the model struggle with? Are errors systematic or random?

### 2. HYPOTHESIZE (thinking only, no tool call needed)
Form a specific hypothesis:
> "I believe <approach> will improve <metric> because <reason>.
> This has not been tried because <gap>."

Strategy:
- Prefer breadth early (explore different paradigms)
- Depth later (refine what works)
- When stuck: combine near-misses, try opposites, revisit user ideas,
  try radically different paradigms, look at bibliography for inspiration
- Do NOT self-censor ideas that "probably won't beat the best." Try them.

**Runtime estimation (use thinking mode):** Before writing the approach,
estimate total runtime (data loading + feature extraction + training + prediction) based on:
- Method type: tree models (10-60s/model), neural nets (2-20min), baselines (<10s)
- Prior trials of similar type (check results.json for runtime_seconds)
- Fixed costs: feature extraction, data loading, visualization (often 30-300s)
- Number of models: key days x seeds, ensemble members, Optuna trials

Use this estimate to decide launch strategy:
- If <60s: standard Bash call (foreground)
- If 60s-5min: `run_in_background: true`, monitor every 30-60s
- If >5min or uncertain: `run_in_background: true`, aggressive monitoring every 20-30s

**Soft-kill protocol:** If monitoring reveals the trial is doomed (projected
time far exceeds budget, loss diverging, training stalled), kill the process:
```bash
# Cross-platform kill
pkill -f 'eval_and_record.*approaches/<NNN>' 2>/dev/null  # Unix
wmic process where "commandline like '%approaches/<NNN>%'" call terminate 2>/dev/null  # Windows
```
Then check what checkpoints were saved and adjust the next approach.

Do NOT pass `--timeout` to eval_and_record.py (no longer supported).

**Artifact reuse:** Check if prior trials saved reusable artifacts (weights,
embeddings, preprocessed features). If the new approach uses the same or
similar architecture, load prior weights as initialization. Reference:
`approaches/<prior_NNN>/model_weights.pt` (or similar). This enables
iterative refinement across trials rather than training from scratch.

**Optuna for hyperparameter tuning:** When an approach has tunable
hyperparameters (learning rate, regularization, tree depth, layer sizes),
use Optuna inside approach.py to search efficiently rather than guessing.
The agent picks the method and features (creative); Optuna picks the knobs
(mechanical). Keep the Optuna study small (10-30 trials) and count it toward
your estimated runtime budget. Not every approach needs it - skip for simple baselines,
rule-based methods, or when testing a structural change where hyperparams
are secondary.

```python
import optuna
optuna.logging.set_verbosity(optuna.logging.WARNING)

def objective(trial):
    lr = trial.suggest_float("lr", 1e-4, 0.1, log=True)
    reg = trial.suggest_float("reg", 1e-5, 1.0, log=True)
    # ... train and return validation score
    return score

study = optuna.create_study(direction="minimize")
study.optimize(objective, n_trials=20, timeout=estimated_budget * 0.8)
best_params = study.best_params
```

### 3. WRITE (tool call 1: Write)
Write `approaches/<NNN>_<name>/approach.py`:
- Implement `run(data)` cleanly
- Self-contained, no hardcoded paths
- Put your hypothesis and analysis in the **docstring**, not in message text
- If based on a paper/resource, create `references.md` in the same dir
- **Progress logging (BINDING RULE):** See "BINDING RULES: Live Progress Logging Convention"
  in SKILL.md. Every approach MUST:
  1. Define `_log(msg)` helper that appends timestamped lines to `live.log` AND prints to stdout
  2. Call `_log()` at meaningful intervals during training (start, every epoch, completion with elapsed time)
  3. Call `_log()` periodically during prediction (every 50 samples, report count/rate/ETA)
  
  For iterative training (neural nets, boosting with many rounds), ALSO write progress 
  to `training_progress.json` in the approach dir:
  ```python
  progress_file = os.path.join(os.path.dirname(__file__), "training_progress.json")
  # During training loop:
  with open(progress_file, "w") as f:
      json.dump({"epoch": epoch, "loss": loss, "elapsed": elapsed,
                 "best_val": best_val}, f)
  ```
  Both streams (live.log and training_progress.json) enable real-time monitoring.
- **Checkpoint loading (when reusing architecture):** Before training, check
  if prior approaches saved checkpoints for the same or similar model. Load
  them as initialization:
  ```python
  import glob, pickle
  approach_dir = os.path.dirname(__file__)
  parent = os.path.dirname(approach_dir)
  ckpts = sorted(glob.glob(os.path.join(parent, "*_*/model_*.pkl")),
                 key=os.path.getmtime)
  if ckpts:
      prior_model = pickle.load(open(ckpts[-1], "rb"))
      # Use as initialization or warm start
  ```
  Skip for fundamentally different architectures.
- **Artifact saving (MANDATORY):** Save model checkpoints to disk during
  training, not just at the end. This enables trial recovery and iterative
  refinement when a trial is killed or adjusted.
  ```python
  import pickle
  approach_dir = os.path.dirname(__file__)
  # During training - save after each model/epoch:
  with open(os.path.join(approach_dir, f"model_day{d}.pkl"), "wb") as f:
      pickle.dump(model, f)
  ```
  `.gitignore` is auto-created by eval_and_record.py - do not create it yourself.

### 4. EVALUATE (tool call 2: Bash)

**CRITICAL: This is ONE Bash call. Nothing else.**

**BINDING RULE: Eval launches MUST redirect stdout+stderr to live.log** (see SKILL.md 
"BINDING RULES" section). Canonical launch:

```bash
timeout <N> uv run python -u eval_and_record.py approaches/<NNN>_<name> > approaches/<NNN>_<name>/live.log 2>&1
```

Key points:
- Use `python -u` (unbuffered) to flush output immediately
- Redirect BOTH stdout AND stderr (`2>&1`) to the approach's `live.log` file
- Use `timeout <N>` to bound execution
- When background launch, include the exact `tail -f approaches/<NNN>_<name>/live.log` 
  command in your message so the user can copy-paste it

**For trials estimated <60s:** Run normally (foreground). Full output appears in live.log.

**For trials estimated >60s:** Use `run_in_background: true` on the Bash call.
Monitor `approaches/<NNN>/live.log` and `approaches/<NNN>/training_progress.json` every 30-60s:
- Check: elapsed time, current phase, loss trend, models completed
- If training is stalled, diverging, or projected time far exceeds budget:
  soft-kill the process (see soft-kill protocol above)
- If progress looks healthy: let it run to completion
When the background task completes, process the result and continue the loop.

`eval_and_record.py` handles everything:
1. Loads and runs the approach
2. Computes scores and metrics
3. Writes scores.json and metrics.json
4. Generates visualization via fixed/visualize.py
5. Determines keep/discard
6. Git commits the approach
7. Regenerates progress.png
8. Appends to report.md experiment log
9. Updates README.md stats
10. Updates .loop-state
11. Git commits progress files
12. Prints one-line result

**NEVER do any of these as separate tool calls.** If you find yourself writing
matplotlib code, running git commands, or updating report.md outside of
eval_and_record.py, STOP. You are creating exit points that break the loop.

### 5. GOTO 1 (THIS IS MANDATORY)

When Bash output appears, your response MUST follow this EXACT structure:

```
**NNN: KEEP/DISCARD** (score). [One sentence about what to try next.]
<Write tool call for NEXT approach>
```

That is it. Nothing else. No analysis paragraph. No "key learnings" list.
No summary table. Those go in the approach.py docstring.

**The iteration is exactly 2 tool calls:**
1. **Write** the approach file (step 3)
2. **Bash** eval_and_record.py (step 4)

Repeat forever. Write, Bash, Write, Bash, Write, Bash.

## Anti-Patterns (FORBIDDEN)

### Separate plot generation
```
# WRONG - creates exit point
Write: approach.py
Bash: python3 eval_and_record.py approaches/005_foo
Bash: python3 -c "import matplotlib; ..."  # <-- EXIT POINT
Write: next approach
```

```
# CORRECT - eval_and_record.py handles everything
Write: approach.py
Bash: python3 eval_and_record.py approaches/005_foo
Write: next approach  # immediately
```

### Separate git commits
```
# WRONG
Bash: python3 eval_and_record.py approaches/005_foo
Bash: git add . && git commit -m "..."  # <-- EXIT POINT
```

### Progress summaries in message text
```
# WRONG
**005: KEEP** (0.891). Here's a summary of what we've learned so far:
- Attention mechanisms work well on this data type
- Feature scaling doesn't help because...
[agent stops here because message ends in text]

# CORRECT
**005: KEEP** (0.891). Try multi-head attention next.
<Write tool call>
```

## Self-Check Before Sending (BLOCKING)

This is a secondary defense. The primary defense is the Stop hook in
settings.json which physically prevents stopping. But if the Stop hook
is missing or broken, this self-check is your last line of defense.

Before sending your message, verify ALL of these. If ANY fails, fix it
before sending:

1. Last content block is a tool_use (Write or Bash), NOT text
2. Message text is at most 2 lines
3. No analysis, summaries, or findings in message text
4. All analysis is in the approach.py docstring
5. You are NOT about to stop - check: is there a Write tool call?
6. The Write tool call contains approach N+1 (not a report or summary)
7. You have NOT used any forbidden words: "converging", "plateau",
   "exhaustive", "well-optimized", "structural bottleneck",
   "key findings", "key learnings", "confirmed optimal"

**If you catch yourself writing a summary, STOP. Delete the summary.
Write the next approach instead. The summary instinct is the #1 way
loops die.**

## Approach Naming

| Situation | Folder name |
|-----------|-------------|
| Normal | `003_relu_instead_of_gelu` |
| Crash | `005_deep_mlp` (status in scores.json) |
| Baseline | `001_baseline` |

Use `NNN_descriptive_name`. Score is in scores.json, not the folder name.

## Consecutive Discard Escalation

| Discards | Action |
|----------|--------|
| 5 in one category | Switch to a different paradigm category |
| 10 across all categories | Invent a NEW category |
| 20+ | Re-read entire results.json, combine near-misses, try radical ideas |

**After 50+ approaches:** Mine the log for second-order insights (combinations).
**After 100+ approaches:** You are doing exactly what the user asked. Keep going.

## Approach Completion Gate

Before moving to the next approach, eval_and_record.py output must NOT
contain `!! INCOMPLETE`. If it does, diagnose and fix the missing artifact
before writing the next approach. Common fixes:
- Plots missing: check if fixed/visualize.py has a bug, re-run
- Scores missing: check if evaluate() threw an exception
- Never skip a broken approach to move on. Fix it first.

## Search Callbacks

eval_and_record.py outputs markers that trigger web research. These are
configured in results.json during planning.

### Plateau Search (`!! SEARCH_NEEDED`)

Triggers when consecutive discards >= `search_on_plateau_threshold` (default: 10).

When you see this marker:
1. **Stop and search.** Do NOT write the next approach yet.
2. Use web search to find `search_on_plateau_ideas_count` (default: 10) new
   ideas you have NOT tried yet. Search for: the specific problem domain,
   novel ML techniques, recent papers, alternative feature engineering.
3. Log each idea to `future_ideas` array in results.json.
4. Pick the most promising idea and use it for the next approach.
5. Continue the loop.

### Per-Trial Search (`!! SEARCH_SUGGESTED`)

Triggers after every trial when `search_every_trial: true` in results.json.

When you see this marker:
1. Search for ONE new idea relevant to the task that you haven't tried.
2. Add it to `future_ideas` in results.json.
3. Consider using it for the next approach (not mandatory).
4. Continue the loop.

## Soft-Kill Recovery

When you kill a background trial early (via pkill/wmic/taskkill):

1. The process terminates. eval_and_record.py will NOT have recorded results.
2. Check the approach folder for partial artifacts:
   - `training_progress.json` - how far did it get?
   - `model_*.pkl` or similar checkpoints - any saved models?
   - `scores.json` - did evaluation complete before the kill?
3. Decide next action using thinking mode:
   - **Same idea, faster method:** Reduce iterations, simplify model, subsample data
   - **Resume from checkpoint:** If checkpoints exist, write a new approach that
     loads them and continues from where training stopped
   - **Different idea:** Switch to a fundamentally different, faster paradigm
4. Write the replacement approach (reuse the same NNN number or increment).

## Progress Monitoring

For trials with iterative training, the approach writes progress to
`training_progress.json` in its directory. When running eval in background:

1. Read `training_progress.json` every 30-60s
2. Look for: loss convergence, validation metric trends, training speed
3. If loss is clearly diverging or NaN: consider killing the background task
   early (note: this is a judgment call, not automatic)
4. Use observations to inform the next trial's design
5. When notified of completion, process the eval output normally

## Autocompact Recovery

If you notice context was compressed (you don't remember recent approaches):
1. Read `.autoresearch-directives` - core rules
2. Read `.loop-state` - where you left off
3. Read `results.json` - full approach history (focus on last 10)
4. Read `experiment-plan.md` - task definition
5. Resume the loop from the next approach number
