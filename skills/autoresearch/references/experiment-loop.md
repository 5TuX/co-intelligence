# Experiment Loop Protocol

Full protocol for the autonomous experiment loop.

## The Loop

LOOP FOREVER (or until --total budget expires):

### 1. REVIEW (thinking only, no tool call needed)
Read results.json. Identify:
- What has been tried (all statuses, including crashes)
- What has NOT been tried (paradigm gaps)
- Which approaches came closest (even if discarded)
- Patterns: what seems to help? what seems to hurt?
- User ideas queue: any unexplored suggestions?

### 2. HYPOTHESIZE (thinking only, no tool call needed)
Form a specific hypothesis:
> "I believe <approach> will improve <metric> because <reason>.
> This has not been tried because <gap>."

Strategy:
- Prefer breadth early (explore different paradigms)
- Depth later (refine what works)
- When stuck: combine near-misses, try opposites, revisit user ideas,
  try radically different paradigms, look at bibliography for inspiration

### 3-4. NAME + CODE (tool call 1: Write)
Write `approaches/<NNN>_<hypothesis>/approach.py`:
- Implement `run(data)` cleanly
- Self-contained, no hardcoded paths
- Put your hypothesis and analysis in the **docstring**, not in message text
- If based on a paper/resource, create `references.md` in the same dir

### 5-9. RUN + RECORD + GIT + LOG + VISUALIZE (tool call 2: Bash)

**CRITICAL: Steps 5 through 9 MUST execute as a SINGLE Bash tool call.**
This is what prevents the loop from stopping. If you break these into
separate tool calls, you create exit points where your message can end
in text. One Bash call. One tool use. Non-negotiable.

The compound command:
1. Evaluates the approach
2. Writes `scores.json` (objectives) and `metrics.json` (additional measurements)
3. Calls `fixed/visualize.py` to generate `visualization.png`
4. Determines keep/discard based on primary score
5. Git commits the approach (NEVER reverts - all approaches stay in working tree)
6. Prints a one-line result

Adapt this template for your experiment:

```bash
cd "$SESSION_DIR" && python3 << 'EVALSCRIPT'
import sys, importlib.util, json, time, subprocess, os, traceback

APPROACH_DIR = "approaches/<NNN>_<name>"
APPROACH_FILE = f"{APPROACH_DIR}/approach.py"
PRIMARY_METRIC = "<metric_name>"

# --- EVALUATE ---
spec = importlib.util.spec_from_file_location("approach", APPROACH_FILE)
mod = importlib.util.module_from_spec(spec)
start = time.time()
try:
    spec.loader.exec_module(mod)
    sys.path.insert(0, ".")
    from fixed.evaluate import evaluate
    result = evaluate(mod.run)
    elapsed = round(time.time() - start, 1)
    crashed = False
except Exception as e:
    result = {}
    elapsed = round(time.time() - start, 1)
    crashed = True
    print(f"CRASH: {e}")

# --- SCORES (objectives - used for keep/discard) ---
objectives = json.load(open("results.json"))["objectives"]
scores = {obj: result.get(obj, 0) for obj in objectives} if not crashed else None
primary_score = scores[PRIMARY_METRIC] if scores else 0

# --- METRICS (additional measurements - not used for keep/discard) ---
metrics = {k: v for k, v in result.items() if k not in objectives} if not crashed else None

# --- KEEP/DISCARD ---
best_file = "best_score.txt"
best = float(open(best_file).read().strip()) if os.path.exists(best_file) else 0
kept = not crashed and primary_score > best
status = "keep" if kept else ("crash" if crashed else "discard")

# --- WRITE SCORES + METRICS ---
with open(f"{APPROACH_DIR}/scores.json", "w") as f:
    json.dump({"scores": scores, "status": status, "runtime_seconds": elapsed}, f, indent=2)
if metrics:
    with open(f"{APPROACH_DIR}/metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

# --- VISUALIZE (non-fatal) ---
try:
    from fixed.visualize import visualize
    visualize(result, APPROACH_DIR)
except Exception as ve:
    print(f"VIZ WARNING: {ve}")

# --- GIT (commit only, NEVER revert) ---
subprocess.run(["git", "add", APPROACH_DIR], check=True, capture_output=True)
subprocess.run(["git", "commit", "-m",
    f"{status}: {APPROACH_DIR} ({PRIMARY_METRIC}={primary_score:.3f})"],
    check=True, capture_output=True)

# --- UPDATE BEST ---
if kept:
    open(best_file, "w").write(str(primary_score))

# --- ONE LINE OUTPUT ---
print(f"{'++' if kept else '--'} {APPROACH_DIR}: {primary_score:.3f} ({status}, {elapsed}s)")
EVALSCRIPT
```

**Key differences from Karpathy's original:**
- **No git revert.** All approaches (keep, discard, crash) stay in the working
  tree. The user can browse `approaches/` to see every attempt with its code,
  scores, metrics, and visualization. `scores.json` has the `status` field to
  distinguish keep from discard.
- **Separate scores and metrics.** `scores.json` contains objectives (used for
  keep/discard). `metrics.json` contains additional measurements (runtime,
  per-component breakdowns, complexity indicators) for analysis.
- **Visualization.** `fixed/visualize.py` generates a `visualization.png` per
  approach. Experiment-specific (defined at session setup). Non-fatal if it fails.

### 10. GOTO 1

Read the one-line output from step 5-9. Then IMMEDIATELY write the next
approach file (step 3-4). Do not write analysis. Do not summarize.

**The iteration is exactly 2 tool calls:**
1. **Write** the approach file (step 3-4)
2. **Bash** the compound eval+record+git command (steps 5-9)

Repeat forever. Write, Bash, Write, Bash, Write, Bash.

If your message has a text block after the last Bash output, you are about to
stop. Delete it. Emit the next Write tool call instead.

Put analysis in the approach.py docstring (step 3-4) or in report.md (updated
inside the compound Bash script). Never in message text.

## Approach Naming After Scoring

| Situation | Folder name |
|-----------|-------------|
| Single metric, keep | `003_relu_instead_of_gelu_0.892` |
| Multi-metric, keep | `012_ensemble_top3_avg0.834` |
| Discard | `005_deep_mlp_0.712` (same format, status in scores.json) |
| Crash | `005_deep_mlp_crash` |
| Baseline | `001_baseline_0.723` |

Rename the folder immediately after scoring, before the git step.
The compound script handles this.
